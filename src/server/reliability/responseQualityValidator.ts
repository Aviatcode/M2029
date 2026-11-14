import { redactSecrets } from './safetySanitizer.js';
import { CitationRef } from './citationValidator.js';

export interface QualityValidationResult {
  isValid: boolean;
  sanitizedText: string;
  issues: string[];
  isTruncated: boolean;
  hasPoisonedText: boolean;
  leakagePrevented: boolean;
  citationIntegrity: boolean;
}

const POISONED_SNIPPETS = [
  'deterministic execution rules',
  'DuckDuckGo',
  'GeeksforGeeks',
  'formal state invariants, and predictable resource allocation',
];

export class ResponseQualityValidator {
  /**
   * Validates and sanitizes AI Tutor response before client delivery
   */
  public validateResponse(params: {
    responseText: string;
    query: string;
    validCitations: CitationRef[];
    isGroundedClaimed?: boolean;
    requiredSections?: string[];
  }): QualityValidationResult {
    const { responseText, query, validCitations, isGroundedClaimed, requiredSections } = params;
    const issues: string[] = [];

    if (!responseText || typeof responseText !== 'string' || responseText.trim().length < 25) {
      return {
        isValid: false,
        sanitizedText: '',
        issues: ['Response is empty or below minimum character threshold (< 25 characters).'],
        isTruncated: false,
        hasPoisonedText: false,
        leakagePrevented: false,
        citationIntegrity: true,
      };
    }

    let text = responseText.trim();

    // 1. Secret & System Prompt Leakage Protection
    const redacted = redactSecrets(text);
    const leakagePrevented = redacted !== text;
    text = redacted;

    // 2. Poisoned Cache / Generic Text Detection
    let hasPoisonedText = false;
    for (const poison of POISONED_SNIPPETS) {
      if (text.includes(poison)) {
        hasPoisonedText = true;
        issues.push(`Detected poisoned generic snippet: "${poison}"`);
      }
    }

    // 3. Truncation Detection
    let isTruncated = false;
    // Check unclosed code fences
    const fenceMatches = text.match(/```/g) || [];
    if (fenceMatches.length % 2 !== 0) {
      // Auto-repair unclosed code block
      text += '\n```\n';
      isTruncated = true;
      issues.push('Auto-repaired unclosed markdown code fence.');
    }

    // Check sentence cutoff at end
    const last10 = text.slice(-10).trim();
    if (
      last10.endsWith('...') ||
      last10.endsWith('and') ||
      last10.endsWith('the') ||
      last10.endsWith('with') ||
      last10.endsWith('is') ||
      last10.endsWith('of')
    ) {
      isTruncated = true;
      issues.push('Response appears truncated at end of generation.');
    }

    // 4. Citation Integrity Check
    let citationIntegrity = true;
    if (isGroundedClaimed && validCitations.length === 0) {
      // Text claimed grounded from classroom notes, but no verified citation exists
      issues.push('Response claimed direct classroom grounding without verified document citations.');
      citationIntegrity = false;
    }

    // 5. Structure Completeness (if 6 sections requested)
    if (requiredSections && requiredSections.length > 0) {
      for (const sec of requiredSections) {
        if (!text.toLowerCase().includes(sec.toLowerCase())) {
          issues.push(`Missing expected pedagogical section: "${sec}"`);
        }
      }
    }

    // 6. False PYQ Claims Guard
    if (/\b(?:201\d|202[0-5])\s+PYQ\b/i.test(text) && !text.includes('Historical Question')) {
      // Strip unverified past-year exam claims
      text = text.replace(/\b(?:201\d|202[0-5])\s+PYQ\b/gi, 'University Exam Practice Question');
      issues.push('Sanitized unverified past-year university examination label.');
    }

    return {
      isValid: !hasPoisonedText && text.length >= 25,
      sanitizedText: text,
      issues,
      isTruncated,
      hasPoisonedText,
      leakagePrevented,
      citationIntegrity,
    };
  }
}

export const responseQualityValidator = new ResponseQualityValidator();
