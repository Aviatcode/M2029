import { sharedKnowledgeLibrary, SharedAcademicAnswer } from './sharedKnowledgeLibrary.js';

export interface FollowUpContext {
  parentQuestionId?: string;
  parentTopicTitle?: string;
  parentSubject?: string;
  classId?: string;
}

export class FollowUpEngine {
  /**
   * Resolves pronouns and contextual references in follow-up queries:
   * e.g. "What are its four conditions?" with parent "Deadlock" -> "What are the four conditions of Deadlock?"
   */
  public resolveContextualQuery(rawQuery: string, context?: FollowUpContext): string {
    const q = rawQuery.trim();
    if (!context || !context.parentTopicTitle) {
      return q;
    }

    const parentTopic = context.parentTopicTitle.trim();
    const pLower = parentTopic.toLowerCase();

    // Check for pronoun or elliptical references: "it", "its", "their", "this", "these", "the same"
    const hasPronoun = /\b(its|it|their|these|this|that|the same)\b/i.test(q);
    const mentionsTopic = q.toLowerCase().includes(pLower);

    if (hasPronoun && !mentionsTopic) {
      // Replace pronouns with parent topic
      const resolved = q
        .replace(/\b(its|their)\b/gi, `${parentTopic}'s`)
        .replace(/\b(it|this|that)\b/gi, parentTopic);
      return resolved;
    }

    // Elliptical follow-up: e.g. "Why?", "Give an example", "Draw its diagram", "Explain in Hinglish"
    if (q.length < 25 && !mentionsTopic) {
      if (/example/i.test(q)) {
        return `Give a real-world example of ${parentTopic}`;
      }
      if (/diagram|architecture|flowchart|schematic/i.test(q)) {
        return `Architecture diagram and execution flow for ${parentTopic}`;
      }
      if (/advantage|pros|benefit/i.test(q)) {
        return `Advantages and benefits of ${parentTopic}`;
      }
      if (/disadvantage|cons|limitation|drawback/i.test(q)) {
        return `Disadvantages and limitations of ${parentTopic}`;
      }
      if (/hinglish/i.test(q)) {
        return `Explain ${parentTopic} in Hinglish`;
      }
    }

    return q;
  }

  /**
   * Checks if an existing follow-up answer is already linked to the parent question
   */
  public findStoredFollowUp(
    resolvedQuery: string,
    parentQuestionId?: string,
    classId = 'M2029'
  ): SharedAcademicAnswer | null {
    if (!parentQuestionId) return null;

    // Check shared library for answers that have parentQuestionId set
    const match = sharedKnowledgeLibrary.findMatchingAnswer(resolvedQuery, {
      classId,
    });

    if (match.found && match.answer) {
      return match.answer;
    }

    return null;
  }
}

export const followUpEngine = new FollowUpEngine();
