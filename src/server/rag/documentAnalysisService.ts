import { AIProviderFactory, UniversalKeyConfig } from '../ai/provider.js';
import { MaterialResources } from '../../types/index.js';

export interface DocumentAnalysisInput {
  title: string;
  originalName: string;
  extractedText: string;
  fileType: string;
  subjectName?: string;
  classId?: string;
  userAiConfig?: UniversalKeyConfig;
}

/**
 * Intelligent Document Analysis Service
 * Synthesizes high-yield academic summaries, Hinglish intuition models, key definitions,
 * 10-marker university exam questions with model answers, scoring points, and quizzes
 * directly from uploaded documents.
 */
export class DocumentAnalysisService {
  /**
   * Analyzes document text with AI, with an intelligent heuristic fallback.
   */
  public async analyzeDocument(input: DocumentAnalysisInput): Promise<MaterialResources> {
    const {
      title,
      originalName,
      extractedText,
      fileType,
      subjectName = 'Core Academic Curriculum',
      userAiConfig,
    } = input;

    const cleanTitle = (title || originalName.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ')).trim();
    const textSnippet = (extractedText || '').slice(0, 4500);

    // If text is extremely short or empty, provide standard fallback
    if (!textSnippet || textSnippet.trim().length < 50) {
      return this.generateHeuristicResources(cleanTitle, textSnippet, subjectName);
    }

    try {
      const ai = AIProviderFactory.getProvider(userAiConfig);
      if (ai.isAvailable()) {
        const prompt = `You are the Lead University Professor and Curriculum Intelligence Engine.
Analyze the following student/faculty uploaded academic document. Synthesize a comprehensive university examination study package directly from the text.

Document Title: "${cleanTitle}"
Subject / Module: "${subjectName}"
File Type: "${fileType}"

=== EXTRACTED DOCUMENT TEXT CONTENT ===
${textSnippet}
=======================================

Return ONLY a valid, parseable JSON object matching this exact structure:
{
  "summary": "3-4 concise, high-yield academic sentences summarizing the core theoretical mechanisms and applications for semester exams.",
  "hinglishSummary": "2-3 conversational, friendly Indian college student Hinglish sentences (e.g. 'Dekho bhai, seedhi baat...') explaining the intuition.",
  "keyConcepts": [
    { "concept": "Core Concept Name", "explanation": "Crystal-clear 1-2 sentence academic explanation from the text." },
    { "concept": "Core Mechanism / Principle", "explanation": "Detailed explanation of working or rule." }
  ],
  "importantDefinitions": [
    { "term": "Key Term 1", "definition": "Textbook-precise definition based on the document." },
    { "term": "Key Term 2", "definition": "Textbook-precise definition based on the document." }
  ],
  "examPoints": [
    "Scoring keyword or mandatory equation to write in university exams",
    "Common trap or edge case to avoid for full marks",
    "Key comparison or distinction examiners test"
  ],
  "exam10Marker": {
    "question": "Standard 10-mark university Section C exam question directly testing this document's core topic.",
    "answerStructure": "1. Standard Textbook Definition\\n2. Working Architecture & Block Schematic\\n3. Step-by-Step Mathematical/Algorithmic Trace\\n4. Gotchas & Real-World Trade-Offs",
    "modelAnswerMarkdown": "### 1. Definition & Core Theory\\nComprehensive explanation based on the document.\\n\\n### 2. Architecture & Step-by-Step Implementation\\nDetailed steps.\\n\\n### 3. University Examiner Scoring Tips\\nKey terms to underline.",
    "keyDiagramText": "Detailed architecture schematic description"
  },
  "quiz": [
    {
      "id": "q1",
      "question": "Precise conceptual MCQ based on this document?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 0,
      "explanation": "Why this option is correct based on the text."
    },
    {
      "id": "q2",
      "question": "Another key conceptual MCQ?",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "correctIndex": 1,
      "explanation": "Why option B is correct."
    }
  ],
  "mindmapMermaid": "graph TD\\n  A[${cleanTitle.slice(0, 25)}] --> B[Key Concept]\\n  A --> C[Implementation]\\n  A --> D[Exam Questions]"
}`;

        const responseText = await ai.generateText(prompt);
        const jsonMatch = responseText.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          return this.sanitizeResources(parsed, cleanTitle, textSnippet, subjectName);
        }
      }
    } catch (err: any) {
      console.warn('[DocumentAnalysisService] AI analysis notice, employing heuristic synthesizer:', err?.message || err);
    }

    return this.generateHeuristicResources(cleanTitle, textSnippet, subjectName);
  }

  /**
   * Sanitizes and validates the AI response structure, injecting defaults for any missing properties.
   */
  private sanitizeResources(
    parsed: any,
    title: string,
    rawText: string,
    subjectName: string
  ): MaterialResources {
    const fallback = this.generateHeuristicResources(title, rawText, subjectName);

    return {
      summary: typeof parsed?.summary === 'string' && parsed.summary.trim() ? parsed.summary.trim() : fallback.summary,
      hinglishSummary: typeof parsed?.hinglishSummary === 'string' && parsed.hinglishSummary.trim()
        ? parsed.hinglishSummary.trim()
        : fallback.hinglishSummary,
      keyConcepts: Array.isArray(parsed?.keyConcepts) && parsed.keyConcepts.length > 0
        ? parsed.keyConcepts.map((k: any) => ({
            concept: String(k.concept || 'Core Concept').trim(),
            explanation: String(k.explanation || '').trim(),
          }))
        : fallback.keyConcepts,
      importantDefinitions: Array.isArray(parsed?.importantDefinitions) && parsed.importantDefinitions.length > 0
        ? parsed.importantDefinitions.map((d: any) => ({
            term: String(d.term || 'Term').trim(),
            definition: String(d.definition || '').trim(),
          }))
        : fallback.importantDefinitions,
      examPoints: Array.isArray(parsed?.examPoints) && parsed.examPoints.length > 0
        ? parsed.examPoints.map((p: any) => String(p).trim())
        : fallback.examPoints,
      exam10Marker: parsed?.exam10Marker && typeof parsed.exam10Marker.question === 'string'
        ? {
            question: parsed.exam10Marker.question.trim(),
            answerStructure: parsed.exam10Marker.answerStructure || fallback.exam10Marker!.answerStructure,
            modelAnswerMarkdown: parsed.exam10Marker.modelAnswerMarkdown || fallback.exam10Marker!.modelAnswerMarkdown,
            keyDiagramText: parsed.exam10Marker.keyDiagramText || fallback.exam10Marker!.keyDiagramText,
          }
        : fallback.exam10Marker,
      quiz: Array.isArray(parsed?.quiz) && parsed.quiz.length > 0
        ? parsed.quiz.map((q: any, idx: number) => ({
            id: q.id || `q-${idx + 1}`,
            question: String(q.question || 'Concept Question'),
            options: Array.isArray(q.options) && q.options.length >= 2 ? q.options : ['True', 'False'],
            correctIndex: typeof q.correctIndex === 'number' ? q.correctIndex : 0,
            explanation: String(q.explanation || 'Based on uploaded curriculum notes.'),
          }))
        : fallback.quiz,
      mindmapMermaid: typeof parsed?.mindmapMermaid === 'string' && parsed.mindmapMermaid.includes('graph')
        ? parsed.mindmapMermaid.trim()
        : fallback.mindmapMermaid,
      flashcards: fallback.flashcards,
      examples: fallback.examples,
      possibleQuestions: fallback.possibleQuestions,
      relatedPYQs: fallback.relatedPYQs || [],
    };
  }

  /**
   * Deterministic heuristic analysis when AI is offline or rate-limited.
   * Extracts real sentences and headings from the text rather than static dummy templates.
   */
  public generateHeuristicResources(
    title: string,
    rawText: string,
    subjectName: string
  ): MaterialResources {
    const lines = (rawText || '')
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 15 && !l.startsWith('http'));

    const sentences = (rawText || '')
      .split(/(?<=[.?!])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 25 && s.length < 250);

    const firstSentences = sentences.slice(0, 3).join(' ');
    const summary = firstSentences || `Comprehensive university study notes on ${title} (${subjectName}). Pre-indexed for semantic RAG search and AI Tutor step-by-step guidance.`;

    const keyConcepts = lines.slice(0, 4).map((line, idx) => {
      const parts = line.split(/[:–—\-]/);
      if (parts.length >= 2 && parts[0].length < 50) {
        return { concept: parts[0].trim(), explanation: parts.slice(1).join('-').trim() };
      }
      return { concept: `Concept ${idx + 1}: ${title}`, explanation: line };
    });

    const definitions = lines.slice(4, 7).map((line) => {
      const parts = line.split(/[:–—\-]/);
      return {
        term: parts[0].slice(0, 40).trim(),
        definition: parts.length > 1 ? parts.slice(1).join('-').trim() : line,
      };
    });

    return {
      summary,
      hinglishSummary: `Ye notes ${title} ke core syllabus topics aur university exam questions ko cover karte hain. Aap direct AI Tutor se iske baare mein puch sakte ho.`,
      keyConcepts: keyConcepts.length > 0 ? keyConcepts : [{ concept: title, explanation: `Core syllabus module in ${subjectName}` }],
      importantDefinitions: definitions.length > 0 ? definitions : [{ term: title, definition: `Curriculum topic in ${subjectName}` }],
      examPoints: [
        `Master the formal textbook definition of ${title} for 2 marks in Section A`,
        'Draw clear block diagrams and step-by-step flowcharts in Section C',
        'Direct citation retrieval is active in AI Tutor for this document',
      ],
      exam10Marker: {
        question: `Explain ${title} in detail with suitable architectural diagrams, operational principles, and university examination model answers.`,
        answerStructure: '1. Standard Textbook Definition (2 Marks)\n2. Working Architecture & Block Diagram (3 Marks)\n3. Core Algorithm / Proof / Trace (3 Marks)\n4. Limitations & Real-World Gotchas (2 Marks)',
        modelAnswerMarkdown: `### 1. Introduction & Formal Definition\n**${title}** is a foundational topic in **${subjectName}**.\n\n### 2. Architectural Framework & Mechanism\nReview the uploaded document diagrams and step-by-step protocols.\n\n### 3. University Examiner Scoring Tip\nUnderline primary keywords and state boundary conditions clearly for full 10/10 marks.`,
        keyDiagramText: `Schematic diagram for ${title}`,
      },
      quiz: [
        {
          id: 'q-1',
          question: `What is the primary topic covered in this document?`,
          options: [title, 'Unrelated Topic', 'General Programming', 'None of the above'],
          correctIndex: 0,
          explanation: `The uploaded document focuses on ${title}.`,
        },
      ],
      mindmapMermaid: `graph TD\n  A[${title.slice(0, 20)}] --> B[Core Theory]\n  A --> C[Architecture]\n  A --> D[Exam Questions]`,
      flashcards: [
        {
          id: 'fc-1',
          question: `What is ${title}?`,
          answer: summary.slice(0, 180),
        },
      ],
      examples: [],
      possibleQuestions: [
        {
          marks: 10,
          question: `Explain ${title} with architectural diagrams and model solutions.`,
          answerOutline: 'Definition, working model, algorithmic flow, and exam tips.',
        },
      ],
      relatedPYQs: [],
    };
  }
}

export const documentAnalysisService = new DocumentAnalysisService();
