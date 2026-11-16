import assert from 'assert';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { AITutorMarkdown } from '../src/components/tutor/AITutorMarkdown';

console.log('=== TEST SUITE: AI TUTOR MARKDOWN RENDERER ===\n');

// 1. Test Multiple Headings (Levels 1 to 4 and beyond)
{
  const input = `
# Heading 1: Operating Systems
## Heading 2: Process Management
### Heading 3: CPU Scheduling Algorithms
#### Heading 4: Round Robin (RR)
##### Heading 5: Additional Notes
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<h1'), 'Expected <h1> for #');
  assert(html.includes('Heading 1: Operating Systems'), 'Expected H1 text');
  assert(html.includes('<h2'), 'Expected <h2> for ##');
  assert(html.includes('Heading 2: Process Management'), 'Expected H2 text');
  assert(html.includes('<h3'), 'Expected <h3> for ###');
  assert(html.includes('Heading 3: CPU Scheduling Algorithms'), 'Expected H3 text');
  assert(html.includes('<h4'), 'Expected <h4> for ####');
  assert(html.includes('Round Robin (RR)'), 'Expected H4 text');
  assert(html.includes('<h5'), 'Expected <h5> for #####');
  console.log('✓ Heading levels 1-5 verified');
}

// 2. Test Bold, Italic, Bold-Italic, Strikethrough, Math
{
  const input = `
This is **bold text**, this is *italic text*, this is ***bold and italic***, and this is ~~deprecated~~.
Key numerical formula: $TAT = CT - AT$ and complexity $O(n \\log n)$.
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<strong') && html.includes('bold text</strong>'), 'Expected bold text');
  assert(html.includes('<em') && html.includes('italic text</em>'), 'Expected italic text');
  assert(html.includes('<strong') && html.includes('<em') && html.includes('bold and italic'), 'Expected bold italic text');
  assert(html.includes('<del') && html.includes('deprecated</del>'), 'Expected strikethrough text');
  assert(html.includes('TAT = CT - AT'), 'Expected inline math formula');
  assert(html.includes('O(n \\log n)'), 'Expected complexity notation');
  console.log('✓ Bold, italic, bold-italic, strikethrough, and math verified');
}

// 3. Test Numbered and Bulleted Lists
{
  const input = `
Here are the CPU scheduling goals:
- Maximize CPU utilization
- Maximize throughput
- Minimize turnaround time ($TAT$)

Step-by-step algorithm:
1. Initialize the ready queue
2. Allocate CPU to first arrived process
3. Calculate completion time and context switch
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<ul') && html.includes('<li'), 'Expected unordered list <ul><li>');
  assert(html.includes('Maximize CPU utilization'), 'Expected bullet 1');
  assert(html.includes('Minimize turnaround time'), 'Expected bullet 3');
  assert(html.includes('<ol') && html.includes('<li'), 'Expected ordered list <ol><li>');
  assert(html.includes('Initialize the ready queue'), 'Expected step 1');
  assert(html.includes('Calculate completion time'), 'Expected step 3');
  console.log('✓ Numbered and bulleted lists verified');
}

// 4. Test Table with Headers and Alignment
{
  const input = `
| Algorithm | Preemptive | Complexity |
| :--- | :---: | ---: |
| FCFS | No | O(n) |
| SJF | Optional | O(n^2) |
| Round Robin | Yes | O(n) |
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<table') && html.includes('<thead') && html.includes('<tbody'), 'Expected <table> structure');
  assert(html.includes('<th') && html.includes('Algorithm'), 'Expected Algorithm header');
  assert(html.includes('<th') && html.includes('Preemptive'), 'Expected Preemptive header');
  assert(html.includes('Round Robin'), 'Expected table row cell');
  assert(html.includes('Optional'), 'Expected table row cell');
  console.log('✓ Markdown table rendering with alignment verified');
}

// 5. Test Fenced Code Blocks & Inline Code
{
  const input = `
Use the \`fork()\` system call to create a new child process:

\`\`\`c
#include <stdio.h>
#include <unistd.h>

int main() {
    pid_t pid = fork();
    if (pid == 0) {
        printf("Hello from child!\\n");
    }
    return 0;
}
\`\`\`
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<code') && html.includes('fork()</code>'), 'Expected inline code `fork()`');
  assert(html.includes('<pre') && html.includes('printf(&quot;Hello from child!\\n&quot;);'), 'Expected code block content');
  assert(html.includes('C</span>') || html.includes('C</div>'), 'Expected language tag C');
  console.log('✓ Inline code and fenced code blocks verified');
}

// 6. Test Blockquotes and Links with Safe URL Handling
{
  const input = `
> Important note: Context switching incurs operating system overhead.

Refer to [University Curriculum](https://m2029.example.edu/os) or [Unsafe Link](javascript:alert(1)).
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: input }));
  assert(html.includes('<blockquote') && html.includes('Context switching incurs'), 'Expected blockquote');
  assert(html.includes('href="https://m2029.example.edu/os"'), 'Expected safe https link');
  assert(html.includes('target="_blank"') && html.includes('rel="noopener noreferrer"'), 'Expected secure link attributes');
  assert(!html.includes('href="javascript:'), 'Expected javascript: URL to be sanitized/blocked');
  console.log('✓ Blockquotes, links, and URL sanitization verified');
}

// 7. Test Streaming Chunk (Partial and Incomplete Markdown)
{
  // Simulating an active streaming chunk where the code fence is unclosed and bold is incomplete
  const streamingChunk1 = `
### 1. In-Flight Streaming Answer
Here is partial **bold text that is still typing
\`\`\`typescript
const streamBuffer = new Stream();
streamBuffer.write("chunk");
`;
  const html = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: streamingChunk1 }));
  assert(html.includes('<h3'), 'Expected H3 in streaming chunk');
  assert(html.includes('In-Flight Streaming Answer'), 'Expected heading text');
  assert(html.includes('bold text that is still typing'), 'Expected partial bold text rendered safely');
  assert(html.includes('streamBuffer.write'), 'Expected partial unclosed code block rendered safely without error');
  console.log('✓ Partial streaming responses verified');
}

// 8. Test Hinglish Intuition & Exam Blueprint Callouts
{
  const hinglishInput = `
Dekho bhai simple words mein, deadlock ek aisi situation hai jaha do ya zyada processes ek doosre ke resource release karne ka wait karte rehte hain.
`;
  const examInput = `
Exam Answer Sheet Blueprint (Copy Directly)
Exam Point: 1. Formal Definition: Deadlock is a permanent blocking of a set of processes that compete for system resources.
`;
  const htmlHinglish = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: hinglishInput }));
  assert(htmlHinglish.includes('Hinglish Intuition'), 'Expected Hinglish callout banner');
  assert(htmlHinglish.includes('deadlock ek aisi situation hai'), 'Expected Hinglish content');

  const htmlExam = renderToStaticMarkup(React.createElement(AITutorMarkdown, { content: examInput }));
  assert(htmlExam.includes('Exam Answer Sheet Blueprint'), 'Expected Exam blueprint banner');
  assert(htmlExam.includes('Deadlock is a permanent blocking'), 'Expected Exam blueprint content');
  console.log('✓ Hinglish and Exam Blueprint callouts verified');
}

console.log('\nALL 8 TESTS PASSED SUCCESSFULLY! 🚀');
