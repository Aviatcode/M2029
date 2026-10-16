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
      'border-blue-500/50 bg-gradient-to-r from-blue-950/60 to-indigo-950/60 text-blue-200',
      'border-cyan-500/40 bg-slate-900/80 text-cyan-250',
      'border-amber-500/30 bg-slate-900/60 text-slate-200',
      'border-slate-700 bg-slate-950/60 text-slate-300',
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
            hasChildren ? 'cursor-pointer hover:border-cyan-400 hover:shadow-lg hover:shadow-cyan-500/10' : ''
          }`}
        >
          {hasChildren && (
            <button className="mt-0.5 text-slate-400 hover:text-white shrink-0">
              {isExpanded ? <ChevronDown className="w-4 h-4 text-cyan-400" /> : <ChevronRight className="w-4 h-4 text-cyan-400" />}
            </button>
          )}

          {!hasChildren && (
            <div className="mt-1.5 w-2 h-2 rounded-full bg-cyan-400 shrink-0" />
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

  return (
    <div className="bg-slate-900/80 rounded-2xl border border-slate-800 p-5 md:p-6 shadow-xl">
      {/* Mindmap Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-slate-800 mb-5">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-400">
            <Network className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-100 text-base md:text-lg">Visual Mindmap & Concept Tree</h3>
            <p className="text-xs text-slate-400">Interactive hierarchical memory network for {topicTitle}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex rounded-lg bg-slate-950 p-1 border border-slate-800 text-xs">
            <button
              onClick={() => setViewMode('visual')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'visual' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Interactive Tree
            </button>
            <button
              onClick={() => setViewMode('mermaid')}
              className={`px-3 py-1 rounded-md font-medium transition ${
                viewMode === 'mermaid' ? 'bg-cyan-600 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Mermaid Syntax
            </button>
          </div>

          {mermaidSyntax && (
            <button
              onClick={handleCopyMermaid}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 bg-slate-800 text-xs text-slate-200 hover:bg-slate-750 transition"
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
          {nodes && nodes.length > 0 ? (
            nodes.map((node) => renderNode(node, 0))
          ) : (
            <div className="text-center py-8 text-slate-500 text-sm">
              <Layers className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              Mindmap tree structure ready for visual review.
            </div>
          )}
        </div>
      ) : (
        <div className="bg-slate-950 rounded-xl p-4 border border-slate-800 relative">
          <div className="text-[11px] font-mono text-cyan-400 mb-2 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-cyan-400" /> Mermaid.js Flowchart Source:
          </div>
          <pre className="font-mono text-xs text-slate-300 overflow-x-auto p-3 bg-slate-900 rounded-lg border border-slate-800 leading-relaxed whitespace-pre-wrap">
            {mermaidSyntax || 'graph TD\n  A[Concept] --> B[Detail]'}
          </pre>
        </div>
      )}
    </div>
  );
};
