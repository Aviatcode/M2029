import { learningProfileService } from './learningProfileService.js';
import { knowledgeGraphEngine } from '../rag/graphRagEngine.js';
import { PersonalizedNextTopicResult } from './learningProfileTypes.js';
import { SYLLABUS_TRACKS } from '../ai/academicKnowledgeBank.js';

export class PersonalizedNextTopicService {
  /**
   * Recommends the optimal next topic considering syllabus order, completed topics, and prerequisite mastery
   */
  public async getNextRecommendedTopic(params: {
    studentId: string;
    classId: string;
    trackId?: string;
    currentTopicIndex?: number;
  }): Promise<PersonalizedNextTopicResult> {
    const { studentId, classId, trackId = 'os-unit2-cpu', currentTopicIndex = 0 } = params;

    const profile = await learningProfileService.getOrCreateProfile(studentId, classId);
    const track = SYLLABUS_TRACKS.find((t) => t.id === trackId) || SYLLABUS_TRACKS[0];
    const totalTopics = track.topics.length;

    // 1. Identify syllabus candidate next topic
    let candidateIndex = currentTopicIndex + 1;
    if (candidateIndex >= totalTopics) {
      candidateIndex = totalTopics - 1; // Syllabus complete
    }

    const candidateTopic = track.topics[candidateIndex];

    // 2. Query Graph RAG for candidate topic prerequisites
    try {
      const graphRes = await knowledgeGraphEngine.queryGraph(candidateTopic.title, {
        classId,
        maxHops: 2,
      });

      if (graphRes.hasPrerequisites && graphRes.prerequisiteChain) {
        const prereqs = graphRes.prerequisiteChain.prerequisites;

        // Check if student has unresolved prerequisites in NEEDS_PRACTICE
        for (const p of prereqs) {
          const pMastery = await learningProfileService.getMasteryRecord(studentId, classId, p.name);
          if (pMastery && pMastery.masteryState === 'NEEDS_PRACTICE') {
            return {
              topicId: `remedial-${p.name.toLowerCase().replace(/\s+/g, '-')}`,
              topicTitle: p.name,
              unitNumber: p.unitNumber || 1,
              isPrerequisiteRemediation: true,
              prerequisiteFor: candidateTopic.title,
              reasoning: `Prerequisite "${p.name}" requires practice before advancing to "${candidateTopic.title}".`,
              confidence: 0.92,
            };
          }
        }
      }
    } catch (err: any) {
      console.warn('[Personalized Next Topic] Prerequisite check notice:', err?.message || err);
    }

    // 3. Standard syllabus progression
    return {
      topicId: candidateTopic.id,
      topicTitle: candidateTopic.title,
      unitNumber: 2,
      isPrerequisiteRemediation: false,
      reasoning: `Standard syllabus order progression: "${candidateTopic.title}" (Topic ${candidateIndex + 1} of ${totalTopics}).`,
      confidence: 0.88,
    };
  }
}

export const personalizedNextTopicService = new PersonalizedNextTopicService();
