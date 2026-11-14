import { sharedKnowledgeLibrary, SharedAcademicAnswer, QualityStatus } from '../ai/sharedKnowledgeLibrary.js';
import { extractQueryIntent } from '../ai/questionMatcher.js';

export interface AnswerReuseCheckResult {
  canReuse: boolean;
  reason: string;
  answer?: SharedAcademicAnswer;
  adaptedContent?: string;
}

export class SharedAnswerController {
  /**
   * Validates whether a cached or shared answer is safe and appropriate to reuse for a query
   */
  public evaluateReuseEligibility(
    answer: SharedAcademicAnswer,
    query: string,
    options: {
      classId: string;
      subjectName?: string;
      mode?: string;
    }
  ): AnswerReuseCheckResult {
    const { classId, subjectName, mode } = options;

    // 1. Quality Status Check: Strictly reject DISPUTED, SUPERSEDED, or stale NEEDS_REVIEW answers
    if (answer.qualityStatus === 'DISPUTED') {
      return {
        canReuse: false,
        reason: 'Answer is currently DISPUTED by peer or faculty review. Live regeneration required.',
      };
    }

    if (answer.qualityStatus === 'SUPERSEDED') {
      return {
        canReuse: false,
        reason: 'Answer has been SUPERSEDED by newer syllabus versions or updated source documents.',
      };
    }

    if (answer.qualityStatus === 'NEEDS_REVIEW') {
      return {
        canReuse: false,
        reason: 'Answer is flagged as NEEDS_REVIEW due to document updates or community feedback. Live regeneration required.',
      };
    }

    // 2. Classroom Authorization Scope Check
    if (answer.classId !== classId && answer.classId !== 'universal') {
      return {
        canReuse: false,
        reason: `Answer belongs to another classroom workspace (${answer.classId}). Cross-classroom reuse forbidden.`,
      };
    }

    // 3. Subject Compatibility Check
    if (subjectName && answer.subjectName) {
      const subA = subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
      const subB = answer.subjectName.toLowerCase().replace(/[^a-z0-9]/g, '');
      if (subA.length > 3 && subB.length > 3 && !subA.includes(subB) && !subB.includes(subA)) {
        return {
          canReuse: false,
          reason: `Subject mismatch: query is for "${subjectName}", but stored answer is for "${answer.subjectName}".`,
        };
      }
    }

    // 4. Intent & Format Compatibility Check
    const queryIntent = extractQueryIntent(query);

    // If student asked for Hinglish, ensure Hinglish content is available
    if (queryIntent.wantsHinglish || mode === 'hinglish') {
      if (!answer.sections.hinglish) {
        return {
          canReuse: false,
          reason: 'Student requested Hinglish, but stored shared answer lacks Hinglish section.',
        };
      }
      return {
        canReuse: true,
        reason: 'Serving Hinglish mental model from verified shared answer.',
        answer,
        adaptedContent: answer.sections.hinglish,
      };
    }

    // If student asked for ELI9 analogies, ensure ELI9 section is available
    if (queryIntent.wantsEli9 || mode === 'eli9') {
      if (!answer.sections.eli9) {
        return {
          canReuse: false,
          reason: 'Student requested ELI9 analogy, but stored shared answer lacks ELI9 section.',
        };
      }
      return {
        canReuse: true,
        reason: 'Serving ELI9 real-world analogy from verified shared answer.',
        answer,
        adaptedContent: answer.sections.eli9,
      };
    }

    // If student asked for Section C 10-marker exam layout
    if (queryIntent.depth === 'exam_10marker' || mode === 'exam_10marker') {
      if (!answer.sections.exam_10marker) {
        return {
          canReuse: false,
          reason: 'Student requested 10-marker Section C layout, but stored answer lacks exam_10marker section.',
        };
      }
      return {
        canReuse: true,
        reason: 'Serving university exam format from verified shared answer.',
        answer,
        adaptedContent: answer.sections.exam_10marker,
      };
    }

    // Default: eligible for reuse
    return {
      canReuse: true,
      reason: `Serving verified shared answer (Version ${answer.version}, Status: ${answer.qualityStatus}).`,
      answer,
      adaptedContent: answer.answer,
    };
  }

  /**
   * Safely marks an answer as DISPUTED when peer negative votes exceed positive votes
   */
  public flagIfDisputed(answerId: string): boolean {
    const answer = sharedKnowledgeLibrary.getAnswerById(answerId);
    if (!answer) return false;

    if (answer.negativeVotes >= 3 && answer.negativeVotes > answer.positiveVotes) {
      return sharedKnowledgeLibrary.flagAnswerDisputed(
        answerId,
        `Answer marked as DISPUTED: downvotes (${answer.negativeVotes}) exceeded upvotes (${answer.positiveVotes}).`
      );
    }
    return false;
  }
}

export const sharedAnswerController = new SharedAnswerController();
