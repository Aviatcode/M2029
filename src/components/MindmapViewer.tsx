import React, { useState } from 'react';
import { MindmapNode } from '../types';
import { Network, Copy, Check, Sparkles, ChevronRight, ChevronDown, Layers } from 'lucide-react';

interface MindmapViewerProps {
  nodes?: MindmapNode[];
  mermaidSyntax?: string;
  topicTitle: string;
}

export const MindmapViewer: React.FC<MindmapViewerProps> = ({ nodes, mermaidSyntax, topicTitle }) => {
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'visual' | 'mermaid'>('visual');
  const [expandedNodes, setExpandedNodes] = useState<Record<string, boolean>>({
    root: true,
    motivation: true,
    pointers: true,
    conditions: true,
    coffman: true,
    bankers: true,
  });

  const toggleNode = (id: string) => {
    setExpandedNodes((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopyMermaid = () => {
    if (mermaidSyntax) {
      navigator.clipboard.writeText(mermaidSyntax);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Render recursive node cards in an organic visual mindmap layout
  const renderNode = (node: MindmapNode, depth = 0) => {
    const isExpanded = expandedNodes[node.id] !== false;
    const hasChildren = node.children && node.children.length > 0;

    const depthColors = [
      'border-slate-700 bg-slate-900 text-slate-100 font-semibold shadow-xs',
      'border-slate-800 bg-slate-950/80 text-slate-200',
      'border-slate-800/80 bg-slate-950/60 text-slate-300',
      'border-slate-800/60 bg-slate-950/40 text-slate-400',
    ];

    const currentStyle = depthColors[Math.min(depth, depthColors.length - 1)];

    return (
      <div key={node.id} className="relative pl-3 md:pl-5 my-2">
        {depth > 0 && (
          <div className="absolute left-0 top-3 w-3 md:w-5 h-px bg-slate-700 -translate-y-1/2" />
        )}
        <div
          onClick={() => hasChildren && toggleNode(node.id)}
          className={`flex items-start gap-2.5 p-3 rounded-xl border transition-all ${currentStyle} ${
            hasChildren ? 'cursor-pointer hover:border-slate-600' : ''
          }`}
        >
          {hasChildren && (
            <button className="mt-0.5 text-slate-400 hover:text-white shrink-0">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
            </button>
          )}

          {!hasChildren && (
            <div className="mt-1.5 w-1.5 h-1.5 rounded-full bg-slate-400 shrink-0" />
          )}

          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className={`font-semibold ${depth === 0 ? 'text-base text-white' : 'text-sm'}`}>
                {node.label}
              </span>
              {node.type && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono uppercase bg-slate-800 text-slate-400 border border-slate-700">
                  {node.type}
                </span>
              )}
            </div>
            {node.description && (
              <p className="text-xs text-slate-400 mt-1 leading-relaxed">{node.description}</p>
            )}
          </div>
        </div>

        {hasChildren && isExpanded && (
          <div className="border-l-2 border-slate-800 ml-2 md:ml-3 pl-1">
            {node.children!.map((child) => renderNode(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  // Derive visual mindmap tree from props, mermaid syntax, or topic breakdown
  const effectiveNodes: MindmapNode[] = React.useMemo(() => {
    if (nodes && nodes.length > 0) return nodes;

    const parsedNodes: MindmapNode[] = [];
    if (mermaidSyntax) {
      const lines = mermaidSyntax.split('\n');
      const labelMap = new Map<string, string>();
      const edgeMap = new Map<string, string[]>();

      lines.forEach((line) => {
        const trimmed = line.trim();
        const defMatches = [...trimmed.matchAll(/([a-zA-Z0-9_-]+)\[([^\]]+)\]/g)];
        defMatches.forEach((m) => labelMap.set(m[1], m[2]));

        const arrowMatch = trimmed.match(/([a-zA-Z0-9_-]+)(?:\[[^\]]+\])?\s*-->\s*([a-zA-Z0-9_-]+)(?:\[([^\]]+)\])?/);
        if (arrowMatch) {
          const from = arrowMatch[1];
          const to = arrowMatch[2];
          if (arrowMatch[3]) labelMap.set(to, arrowMatch[3]);
          if (!edgeMap.has(from)) edgeMap.set(from, []);
          edgeMap.get(from)!.push(to);
        }
      });

      if (labelMap.size > 0) {
        const targets = new Set<string>();
        edgeMap.forEach((children) => children.forEach((c) => targets.add(c)));
        const rootKeys = Array.from(labelMap.keys()).filter((k) => !targets.has(k));
        const primaryRoot = rootKeys[0] || Array.from(labelMap.keys())[0];

        const buildTree = (id: string, depth = 0): MindmapNode => {
          const childrenKeys = edgeMap.get(id) || [];
          return {
            id,
            label: labelMap.get(id) || id,
            type: depth === 0 ? 'root' : depth === 1 ? 'concept' : 'detail',
            children: depth < 4 && childrenKeys.length > 0 ? childrenKeys.map((c) => buildTree(c, depth + 1)) : undefined,
          };
        };

        if (primaryRoot) {
          parsedNodes.push(buildTree(primaryRoot, 0));
          return parsedNodes;
        }
      }
    }

    // Default rich fallback tree for the topic
    return [
      {
        id: 'root',
        label: topicTitle || 'Core Curriculum Concept',
        description: 'Central topic architecture & exam blueprint',
        type: 'root',
        children: [
          {
            id: 'n1',
            label: 'Foundational Theory & Definitions',
            description: 'Prescribed textbook definitions & invariant properties',
            type: 'concept',
            children: [
              { id: 'n1-1', label: 'Primary Invariant', description: 'Deterministic conditions guaranteed by the system', type: 'detail' },
              { id: 'n1-2', label: 'Mathematical / Formal Boundary', description: 'Preconditions and operational limits', type: 'detail' },
            ],
          },
          {
            id: 'n2',
            label: 'Core Working Mechanism & Data Flow',
            description: 'Step-by-step state transitions and architectural blocks',
            type: 'mechanism',
            children: [
              { id: 'n2-1', label: 'Initialization & State Check', description: 'Validating safety and resource allocations', type: 'detail' },
              { id: 'n2-2', label: 'Runtime Execution', description: 'Handling concurrency, locks, and boundary exceptions', type: 'detail' },
            ],
          },
          {
            id: 'n3',
            label: 'University Exam Scoring Focus (10-Marker)',
            description: 'Essential components demanded by university evaluators',
            type: 'exam',
            children: [
              { id: 'n3-1', label: 'Mandatory Architectural Diagram', description: 'Clean block diagram with labeled directional arrows', type: 'detail' },
              { id: 'n3-2', label: 'Gotchas & Edge Cases', description: 'Failure modes, deadlock risks, or scaling trade-offs', type: 'detail' },
            ],
          },
        ],
      },
    ];
  }, [nodes, mermaidSyntax, topicTitle]);

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl">
      {/* Mindmap Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-neutral-800 border border-neutral-700 flex items-center justify-center text-slate-200">
            <Network className="w-5 h-5 text-slate-300" />
          </div>
          <div>
            <h3 className="font-semibold text-slate-100 text-base md:text-lg">Visual Mindmap & Concept Tree</h3>
            <p className="text-xs text-slate-400">Interactive hierarchical memory network for {topicTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                viewMode === 'visual' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Tree
            </button>
            <button
              onClick={() => setViewMode('mermaid')}
              className={`px-3 py-1 rounded-md font-medium transition cursor-pointer ${
                viewMode === 'mermaid' ? 'bg-slate-800 text-slate-100' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mermaid Syntax
            </button>
          </div>

          {mermaidSyntax && (
            <button
              onClick={handleCopyMermaid}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-750 transition cursor-pointer"
              title="Copy Mermaid.js diagram"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5 text-slate-400" />}
              <span>{copied ? 'Copied!' : 'Copy Code'}</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'visual' ? (
        <div className="bg-slate-950/70 rounded-xl p-4 md:p-6 border border-slate-800/80 overflow-x-auto">
          {effectiveNodes.map((node) => renderNode(node, 0))}
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative">
          <div className="text-[11px] font-mono text-slate-400 mb-2 flex items-center gap-1">
            <span>Mermaid.js Flowchart Source:</span>
          </div>
          <pre className="font-mono text-xs text-slate-300 overflow-x-auto p-3 bg-slate-900 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
            {mermaidSyntax || 'graph TD\n  A[Concept] --> B[Detail]'}
          </pre>
        </div>
      )}
    </div>
  );
};
