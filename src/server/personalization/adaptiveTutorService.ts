import { learningProfileService } from './learningProfileService.js';
import { knowledgeGraphEngine } from '../rag/graphRagEngine.js';
import { AdaptiveExplanationContext, MasteryState } from './learningProfileTypes.js';

export class AdaptiveTutorService {
  /**
   * Constructs pedagogical adaptation context based on student learning evidence & Graph RAG
   */
  public async buildAdaptiveContext(params: {
    studentId: string;
    classId: string;
    topicTitle: string;
    rawQuery?: string;
    action?: string;
  }): Promise<AdaptiveExplanationContext> {
    const { studentId, classId, topicTitle, rawQuery = '', action = '' } = params;
    const query = rawQuery.toLowerCase();

    // 1. Fetch student's profile and concept mastery
    const profile = await learningProfileService.getOrCreateProfile(studentId, classId);
    const masteryRecord = await learningProfileService.getMasteryRecord(studentId, classId, topicTitle);
    const masteryState: MasteryState = masteryRecord ? masteryRecord.masteryState : 'NOT_STARTED';

    // 2. Check for Explicit Student Format / Language Overrides
    const isExplicitExam = /\b(?:10\s*[- ]?marker|5\s*[- ]?marker|exam\s+format|marking\s+scheme)\b/i.test(query);
    const isExplicitHinglish =
      action === 'hinglish' ||
      profile.preferredLanguage === 'hinglish' ||
      /\b(?:in\s+hinglish|hindi\s+mein|samjhao|bhai)\b/i.test(query);
    const isExplicitEli9 =
      action === 'did_not_understand' ||
      action === 'eli9' ||
      /\b(?:did\s+not\s+understand|confused|eli9|simple\s+words|analogy)\b/i.test(query);

    let styleRecommendation: 'eli9_analogy' | 'advanced_deep_dive' | 'standard_academic' = 'standard_academic';
    let isExplicitOverride = false;
    let reasoning = 'Standard academic explanation based on course syllabus.';

    if (isExplicitEli9 || action === 'did_not_understand') {
      styleRecommendation = 'eli9_analogy';
      isExplicitOverride = true;
      reasoning = 'Student requested simplified ELI9 breakdown with everyday analogies and contrast table.';
    } else if (isExplicitExam) {
      styleRecommendation = 'standard_academic';
      isExplicitOverride = true;
      reasoning = 'Student requested university exam Section C format.';
    } else if (masteryState === 'NEEDS_PRACTICE') {
      styleRecommendation = 'eli9_analogy';
      reasoning = 'Student learning profile indicates prior difficulty with this concept. Applying intuitive real-world analogies first.';
    } else if (masteryState === 'DEMONSTRATED') {
      styleRecommendation = 'advanced_deep_dive';
      reasoning = 'Student has demonstrated core mastery. Adapting to advanced invariants, boundary conditions, and architectural trade-offs.';
    }

    if (action === 'hinglish' || /\b(?:in\s+hinglish|hindi\s+mein|samjhao|bhai)\b/i.test(query)) {
      isExplicitOverride = true;
    }

    // 3. Inspect Graph RAG for Prerequisite Understanding
    let needsPrerequisiteHelp = false;
    let prerequisiteConcept: string | undefined;
    let prerequisitePath: string | undefined;

    try {
      const graphRes = await knowledgeGraphEngine.queryGraph(topicTitle, {
        classId,
        maxHops: 2,
      });

      if (graphRes.hasPrerequisites && graphRes.prerequisiteChain) {
        const prereqs = graphRes.prerequisiteChain.prerequisites;
        prerequisitePath = graphRes.prerequisiteChain.pathString;

        // Check if student struggles with any foundational prerequisite
        for (const p of prereqs) {
          const pMastery = await learningProfileService.getMasteryRecord(studentId, classId, p.name);
          if (pMastery && pMastery.masteryState === 'NEEDS_PRACTICE') {
            needsPrerequisiteHelp = true;
            prerequisiteConcept = p.name;
            reasoning = `Student struggles with prerequisite "${p.name}". Recommending foundational anchor before diving deep into "${topicTitle}".`;
            break;
          }
        }
      }
    } catch (err: any) {
      console.warn('[Adaptive Tutor] Graph prerequisite lookup notice:', err?.message || err);
    }

    return {
      studentId,
      topicTitle,
      masteryState,
      needsPrerequisiteHelp,
      prerequisiteConcept,
      prerequisitePath,
      styleRecommendation,
      preferredLanguage: isExplicitHinglish ? 'hinglish' : 'english',
      isExplicitOverride,
      reasoning,
    };
  }
}

export const adaptiveTutorService = new AdaptiveTutorService();
