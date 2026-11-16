import React, { useState } from 'react';
import { Copy, Check, Sparkles, GraduationCap } from 'lucide-react';

interface AITutorMarkdownProps {
  content: string;
  className?: string;
}

// -------------------------------------------------------------
// INLINE TOKENIZER & RENDERER
// -------------------------------------------------------------

type InlineToken =
  | { type: 'text'; content: string }
  | { type: 'bold_italic'; content: string }
  | { type: 'bold'; content: string }
  | { type: 'italic'; content: string }
  | { type: 'code'; content: string }
  | { type: 'math'; content: string }
  | { type: 'strikethrough'; content: string }
  | { type: 'link'; text: string; url: string };

function parseInlineTokens(text: string): InlineToken[] {
  const tokens: InlineToken[] = [];
  let i = 0;
  const len = text.length;

  while (i < len) {
    // 1. Inline code: `code`
    if (text[i] === '`') {
      const end = text.indexOf('`', i + 1);
      if (end !== -1) {
        tokens.push({ type: 'code', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      } else {
        tokens.push({ type: 'code', content: text.slice(i + 1) });
        break;
      }
    }

    // 2. Math inline: $math$ (e.g. $TAT$ or $O(n)$)
    if (text[i] === '$' && i + 1 < len && text[i + 1] !== ' ') {
      const end = text.indexOf('$', i + 1);
      if (end !== -1 && end > i + 1 && text[end - 1] !== ' ') {
        tokens.push({ type: 'math', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // 3. Links: [text](url)
    if (text[i] === '[') {
      const closeBracket = text.indexOf(']', i + 1);
      if (closeBracket !== -1 && text[closeBracket + 1] === '(') {
        const closeParen = text.indexOf(')', closeBracket + 2);
        if (closeParen !== -1) {
          const linkText = text.slice(i + 1, closeBracket);
          const rawUrl = text.slice(closeBracket + 2, closeParen).trim();
          tokens.push({ type: 'link', text: linkText, url: rawUrl });
          i = closeParen + 1;
          continue;
        }
      }
    }

    // 4. Bold italic: ***text*** or ___text___
    if (text.startsWith('***', i) || text.startsWith('___', i)) {
      const marker = text.slice(i, i + 3);
      const end = text.indexOf(marker, i + 3);
      if (end !== -1) {
        tokens.push({ type: 'bold_italic', content: text.slice(i + 3, end) });
        i = end + 3;
        continue;
      }
    }

    // 5. Bold: **text** or __text__
    if (text.startsWith('**', i) || text.startsWith('__', i)) {
      const marker = text.slice(i, i + 2);
      const end = text.indexOf(marker, i + 2);
      if (end !== -1) {
        tokens.push({ type: 'bold', content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      } else {
        tokens.push({ type: 'bold', content: text.slice(i + 2) });
        break;
      }
    }

    // 6. Italic: *text* or _text_
    if (text[i] === '*' || (text[i] === '_' && (i === 0 || /\s/.test(text[i - 1])))) {
      const marker = text[i];
      const end = text.indexOf(marker, i + 1);
      if (end !== -1 && end > i + 1 && !/\s/.test(text[i + 1])) {
        tokens.push({ type: 'italic', content: text.slice(i + 1, end) });
        i = end + 1;
        continue;
      }
    }

    // 7. Strikethrough: ~~text~~
    if (text.startsWith('~~', i)) {
      const end = text.indexOf('~~', i + 2);
      if (end !== -1) {
        tokens.push({ type: 'strikethrough', content: text.slice(i + 2, end) });
        i = end + 2;
        continue;
      }
    }

    // Plain text character
    const prev = tokens[tokens.length - 1];
    if (prev && prev.type === 'text') {
      prev.content += text[i];
    } else {
      tokens.push({ type: 'text', content: text[i] });
    }
    i++;
  }

  return tokens;
}

function sanitizeUrl(rawUrl: string): string | null {
  const trimmed = rawUrl.trim();
  // Safe protocols only
  if (/^(https?:\/\/|mailto:|#|\/)/i.test(trimmed)) {
    return trimmed;
  }
  return null;
}

const renderInline = (text: string): React.ReactNode => {
  const tokens = parseInlineTokens(text);
  return tokens.map((token, idx) => {
    switch (token.type) {
      case 'bold_italic':
        return (
          <strong key={idx} className="font-semibold text-white">
            <em className="italic text-slate-200">{renderInline(token.content)}</em>
          </strong>
        );
      case 'bold':
        return (
          <strong key={idx} className="font-semibold text-white">
            {renderInline(token.content)}
          </strong>
        );
      case 'italic':
        return (
          <em key={idx} className="italic text-slate-300">
            {renderInline(token.content)}
          </em>
        );
      case 'code':
        return (
          <code
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded-md bg-slate-800/90 text-indigo-300 border border-slate-700/60 font-mono text-[0.88em] font-medium selection:bg-indigo-900"
          >
            {token.content}
          </code>
        );
      case 'math':
        return (
          <span
            key={idx}
            className="px-1.5 py-0.5 mx-0.5 rounded bg-indigo-950/60 text-indigo-200 font-mono text-[0.88em] border border-indigo-500/30 font-medium inline-block"
          >
            {token.content}
          </span>
        );
      case 'strikethrough':
        return (
          <del key={idx} className="line-through text-slate-400">
            {renderInline(token.content)}
          </del>
        );
      case 'link': {
        const safe = sanitizeUrl(token.url);
        if (!safe) {
          return <span key={idx}>{token.text}</span>;
        }
        return (
          <a
            key={idx}
            href={safe}
            target="_blank"
            rel="noopener noreferrer"
            className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2 transition-colors font-medium inline-flex items-center gap-0.5"
          >
            {renderInline(token.text)}
          </a>
        );
      }
      case 'text':
      default:
        return <React.Fragment key={idx}>{token.content}</React.Fragment>;
    }
  });
};

// -------------------------------------------------------------
// CODE BLOCK COMPONENT WITH COPY FEEDBACK
// -------------------------------------------------------------

const CodeBlockItem: React.FC<{ lang: string; code: string }> = ({ lang, code }) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(code);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = code;
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (e) {
      console.warn('Copy failed', e);
    }
  };

  return (
    <div className="my-3 rounded-xl bg-slate-950 border border-slate-800 overflow-hidden font-mono text-xs shadow-md">
      <div className="px-3.5 py-1.5 bg-slate-900/90 border-b border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
        <span className="font-semibold text-indigo-300 tracking-wider">
          {lang ? lang.toUpperCase() : 'CODE'}
        </span>
        <button
          type="button"
          onClick={handleCopy}
          className="flex items-center gap-1.5 text-slate-400 hover:text-white transition-colors cursor-pointer py-0.5 px-2 rounded-md bg-slate-800/60 hover:bg-slate-800 font-sans"
        >
          {copied ? (
            <>
              <Check className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-emerald-400 text-[10px] font-semibold">Copied!</span>
            </>
          ) : (
            <>
              <Copy className="w-3.5 h-3.5" />
              <span className="text-[10px]">Copy</span>
            </>
          )}
        </button>
      </div>
      <pre className="p-4 overflow-x-auto text-emerald-400 text-xs font-mono leading-relaxed selection:bg-indigo-900">
        <code>{code}</code>
      </pre>
    </div>
  );
};

// -------------------------------------------------------------
// BLOCK-LEVEL PARSER
// -------------------------------------------------------------

type MarkdownBlock =
  | { type: 'code'; lang: string; code: string }
  | { type: 'heading'; level: number; text: string }
  | { type: 'hr' }
  | { type: 'blockquote'; text: string }
  | { type: 'table'; headers: string[]; alignments: ('left' | 'center' | 'right')[]; rows: string[][] }
  | { type: 'list'; ordered: boolean; items: string[] }
  | { type: 'hinglish_callout'; text: string }
  | { type: 'exam_callout'; text: string }
  | { type: 'paragraph'; text: string };

function isHinglishText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('simple words mein') ||
    lower.includes('simple hinglish') ||
    lower.includes('dekho bhai') ||
    lower.includes('bilkul line mein') ||
    lower.includes('exam mental model')
  );
}

function isExamBlueprintText(text: string): boolean {
  const lower = text.toLowerCase();
  return (
    lower.includes('exam point:') ||
    lower.includes('exam keyword:') ||
    lower.includes('exam-ready short notes') ||
    lower.includes('exam answer sheet blueprint') ||
    lower.includes('university model answer')
  );
}

function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let i = 0;
  const n = lines.length;

  while (i < n) {
    const rawLine = lines[i];
    const trimmed = rawLine.trim();

    // 1. Skip blank lines
    if (!trimmed) {
      i++;
      continue;
    }

    // 2. Fenced Code Block
    if (trimmed.startsWith('```') || trimmed.startsWith('~~~')) {
      const fence = trimmed.slice(0, 3);
      const lang = trimmed.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < n && !lines[i].trim().startsWith(fence)) {
        codeLines.push(lines[i]);
        i++;
      }
      if (i < n && lines[i].trim().startsWith(fence)) {
        i++; // consume closing fence
      }
      blocks.push({
        type: 'code',
        lang,
        code: codeLines.join('\n'),
      });
      continue;
    }

    // 3. Headings (#, ##, ###, ####, #####, ######)
    const headingMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        text: headingMatch[2].trim(),
      });
      i++;
      continue;
    }

    // 4. Horizontal Rule (---, ***, ___)
    if (/^(\-{3,}|\*{3,}|_{3,})$/.test(trimmed)) {
      blocks.push({ type: 'hr' });
      i++;
      continue;
    }

    // 5. Blockquotes (> text)
    if (trimmed.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < n && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s?/, ''));
        i++;
      }
      const quoteText = quoteLines.join('\n');
      if (isHinglishText(quoteText)) {
        blocks.push({ type: 'hinglish_callout', text: quoteText });
      } else if (isExamBlueprintText(quoteText)) {
        blocks.push({ type: 'exam_callout', text: quoteText });
      } else {
        blocks.push({ type: 'blockquote', text: quoteText });
      }
      continue;
    }

    // 6. Tables (| col | col |)
    if (
      trimmed.includes('|') &&
      i + 1 < n &&
      lines[i + 1].includes('|') &&
      /\|?\s*[-:]+[-| :]*\s*\|?/.test(lines[i + 1])
    ) {
      const tableLines: string[] = [];
      while (i < n && lines[i].trim().includes('|')) {
        tableLines.push(lines[i].trim());
        i++;
      }
      if (tableLines.length >= 2) {
        const splitRow = (row: string) => {
          let parts = row.split('|');
          if (parts[0].trim() === '') parts.shift();
          if (parts.length > 0 && parts[parts.length - 1].trim() === '') parts.pop();
          return parts.map((p) => p.trim());
        };
        const headers = splitRow(tableLines[0]);
        const alignments = splitRow(tableLines[1]).map((cell) => {
          if (cell.startsWith(':') && cell.endsWith(':')) return 'center';
          if (cell.endsWith(':')) return 'right';
          return 'left';
        });
        const rows = tableLines.slice(2).map(splitRow);
        blocks.push({
          type: 'table',
          headers,
          alignments,
          rows,
        });
        continue;
      }
    }

    // 7. Lists (Unordered & Ordered)
    const ulMatch = trimmed.match(/^(?:[-*+]|•)\s+(.*)$/);
    const olMatch = trimmed.match(/^\d+\.\s+(.*)$/);
    if (ulMatch || olMatch) {
      const isOrdered = Boolean(olMatch);
      const items: string[] = [];
      const markerRegex = isOrdered ? /^\d+\.\s+(.*)$/ : /^(?:[-*+]|•)\s+(.*)$/;

      while (i < n) {
        const lineTrim = lines[i].trim();
        const m = lineTrim.match(markerRegex);
        if (m) {
          items.push(m[1].trim());
          i++;
        } else if (
          lineTrim &&
          !lineTrim.startsWith('#') &&
          !lineTrim.startsWith('```') &&
          !lineTrim.startsWith('~~~') &&
          !lineTrim.startsWith('>')
        ) {
          // Multiline continuation of previous list item
          if (items.length > 0) {
            items[items.length - 1] += ' ' + lineTrim;
            i++;
          } else {
            break;
          }
        } else {
          break;
        }
      }

      blocks.push({
        type: 'list',
        ordered: isOrdered,
        items,
      });
      continue;
    }

    // 8. Paragraphs & Callouts
    const pLines: string[] = [];
    while (i < n) {
      const current = lines[i];
      const curTrim = current.trim();
      if (!curTrim) break;
      if (curTrim.startsWith('```') || curTrim.startsWith('~~~')) break;
      if (/^#{1,6}\s+/.test(curTrim)) break;
      if (/^(\-{3,}|\*{3,}|_{3,})$/.test(curTrim)) break;
      if (curTrim.startsWith('>')) break;
      if (curTrim.match(/^([-*+]|•|\d+\.)\s+/)) break;
      if (
        curTrim.includes('|') &&
        i + 1 < n &&
        lines[i + 1].includes('|') &&
        /\|?\s*[-:]+[-| :]*\s*\|?/.test(lines[i + 1])
      ) {
        break;
      }

      pLines.push(curTrim);
      i++;
    }

    if (pLines.length > 0) {
      const pText = pLines.join(' ');
      if (isHinglishText(pText)) {
        blocks.push({ type: 'hinglish_callout', text: pText });
      } else if (isExamBlueprintText(pText)) {
        blocks.push({ type: 'exam_callout', text: pText });
      } else {
        blocks.push({ type: 'paragraph', text: pText });
      }
    }
  }

  return blocks;
}

// -------------------------------------------------------------
// MAIN COMPONENT
// -------------------------------------------------------------

export const AITutorMarkdown: React.FC<AITutorMarkdownProps> = ({ content, className = '' }) => {
  if (!content) return null;

  const blocks = parseMarkdownBlocks(content);

  return (
    <div className={`space-y-3 font-sans-ui text-slate-200 text-xs sm:text-sm leading-relaxed ${className}`}>
      {blocks.map((block, bIdx) => {
        switch (block.type) {
          case 'heading': {
            if (block.level === 1) {
              return (
                <h1
                  key={bIdx}
                  className="text-xl sm:text-2xl font-bold text-white tracking-tight mt-6 mb-3 pb-1.5 border-b border-slate-800/80 font-sans"
                >
                  {renderInline(block.text)}
                </h1>
              );
            }
            if (block.level === 2) {
              return (
                <h2
                  key={bIdx}
                  className="text-lg sm:text-xl font-bold text-slate-100 tracking-tight mt-5 mb-2.5 font-sans"
                >
                  {renderInline(block.text)}
                </h2>
              );
            }
            if (block.level === 3) {
              return (
                <h3
                  key={bIdx}
                  className="text-base sm:text-lg font-semibold text-indigo-300 tracking-tight mt-4 mb-2 font-sans"
                >
                  {renderInline(block.text)}
                </h3>
              );
            }
            if (block.level === 4) {
              return (
                <h4
                  key={bIdx}
                  className="text-sm sm:text-base font-semibold text-slate-200 tracking-tight mt-3 mb-1.5 font-sans"
                >
                  {renderInline(block.text)}
                </h4>
              );
            }
            return (
              <h5
                key={bIdx}
                className="text-xs sm:text-sm font-semibold text-slate-300 uppercase tracking-wider mt-2.5 mb-1 font-sans"
              >
                {renderInline(block.text)}
              </h5>
            );
          }

          case 'paragraph': {
            return (
              <p key={bIdx} className="leading-relaxed my-2 text-slate-200">
                {renderInline(block.text)}
              </p>
            );
          }

          case 'list': {
            if (block.ordered) {
              return (
                <ol
                  key={bIdx}
                  className="my-2.5 space-y-1.5 pl-5 list-decimal text-slate-200 marker:text-indigo-400 marker:font-mono marker:text-xs"
                >
                  {block.items.map((item, iIdx) => (
                    <li key={iIdx} className="leading-relaxed pl-1">
                      {renderInline(item)}
                    </li>
                  ))}
                </ol>
              );
            }
            return (
              <ul
                key={bIdx}
                className="my-2.5 space-y-1.5 pl-5 list-disc text-slate-200 marker:text-indigo-400"
              >
                {block.items.map((item, iIdx) => (
                  <li key={iIdx} className="leading-relaxed pl-1">
                    {renderInline(item)}
                  </li>
                ))}
              </ul>
            );
          }

          case 'table': {
            return (
              <div
                key={bIdx}
                className="my-3 overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/60 shadow-xs"
              >
                <table className="min-w-full text-xs text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-900/90 border-b border-slate-800">
                      {block.headers.map((h, hIdx) => {
                        const align = block.alignments[hIdx] || 'left';
                        return (
                          <th
                            key={hIdx}
                            style={{ textAlign: align }}
                            className="px-3.5 py-2.5 font-semibold text-slate-200 font-mono text-[11px] tracking-wide"
                          >
                            {renderInline(h)}
                          </th>
                        );
                      })}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {block.rows.map((row, rIdx) => (
                      <tr
                        key={rIdx}
                        className="hover:bg-slate-900/40 transition-colors"
                      >
                        {row.map((cell, cIdx) => {
                          const align = block.alignments[cIdx] || 'left';
                          return (
                            <td
                              key={cIdx}
                              style={{ textAlign: align }}
                              className="px-3.5 py-2 text-slate-300 font-sans-ui"
                            >
                              {renderInline(cell)}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
          }

          case 'code': {
            return <CodeBlockItem key={bIdx} lang={block.lang} code={block.code} />;
          }

          case 'blockquote': {
            return (
              <blockquote
                key={bIdx}
                className="my-3 pl-3.5 border-l-3 border-indigo-500/70 bg-indigo-950/20 py-2 pr-3 rounded-r-lg text-slate-300 text-xs sm:text-sm italic space-y-1"
              >
                {renderInline(block.text)}
              </blockquote>
            );
          }

          case 'hinglish_callout': {
            return (
              <div
                key={bIdx}
                className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-amber-200 text-xs sm:text-sm font-sans-ui leading-relaxed my-3 shadow-xs"
              >
                <div className="font-semibold text-amber-300 flex items-center gap-1.5 mb-1.5 font-mono text-[11px]">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Hinglish Intuition (Exam Mental Model)</span>
                </div>
                <div className="italic text-slate-200 space-y-1">
                  {renderInline(block.text)}
                </div>
              </div>
            );
          }

          case 'exam_callout': {
            return (
              <div
                key={bIdx}
                className="p-3.5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 text-emerald-200 text-xs sm:text-sm my-3 shadow-xs font-sans-ui leading-relaxed"
              >
                <div className="font-semibold text-emerald-300 flex items-center gap-1.5 mb-1.5 font-mono text-[11px]">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Exam Answer Sheet Blueprint (Copy Directly)</span>
                </div>
                <div className="text-slate-200 space-y-1">
                  {renderInline(block.text)}
                </div>
              </div>
            );
          }

          case 'hr': {
            return <hr key={bIdx} className="my-4 border-t border-slate-800" />;
          }

          default:
            return null;
        }
      })}
    </div>
  );
};
