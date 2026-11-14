import fs from 'fs';
import path from 'path';

export interface ConceptNode {
  id: string;
  name: string;
  type: 'concept' | 'topic' | 'subtopic' | 'algorithm' | 'definition' | 'formula' | 'examiner_trap';
  summary: string;
  subjectName?: string;
  unit?: number;
  docId?: string;
  keywords: string[];
}

export interface ConceptEdge {
  id: string;
  source: string;
  target: string;
  relationship: 'prerequisite_of' | 'subtopic_of' | 'implements' | 'contrasts_with' | 'causes' | 'solves' | 'shares_resource';
  label: string;
}

export interface KnowledgeGraph {
  nodes: ConceptNode[];
  edges: ConceptEdge[];
  lastUpdated: string;
}

const GRAPH_FILE = path.resolve(process.cwd(), 'curriculum-repo', 'rag_store', 'knowledge_graph.json');

export class GraphRagEngine {
  private nodes: Map<string, ConceptNode> = new Map();
  private edges: Map<string, ConceptEdge> = new Map();

  constructor() {
    this.ensureStorage();
    this.loadFromDisk();
    if (this.nodes.size === 0) {
      this.seedCoreCurriculumGraph();
    }
  }

  private ensureStorage() {
    const dir = path.dirname(GRAPH_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(GRAPH_FILE)) {
        const raw = fs.readFileSync(GRAPH_FILE, 'utf8');
        const data: KnowledgeGraph = JSON.parse(raw);
        for (const n of data.nodes || []) {
          this.nodes.set(n.id, n);
        }
        for (const e of data.edges || []) {
          this.edges.set(e.id, e);
        }
      }
    } catch (err: any) {
      console.warn('[Graph RAG] Error loading graph:', err.message);
    }
  }

  private saveToDisk() {
    try {
      this.ensureStorage();
      const payload: KnowledgeGraph = {
        nodes: Array.from(this.nodes.values()),
        edges: Array.from(this.edges.values()),
        lastUpdated: new Date().toISOString(),
      };
      fs.writeFileSync(GRAPH_FILE, JSON.stringify(payload, null, 2), 'utf8');
    } catch (err: any) {
      console.error('[Graph RAG] Failed to save graph to disk:', err.message);
    }
  }

  private seedCoreCurriculumGraph() {
    const seedNodes: ConceptNode[] = [
      {
        id: 'node-process',
        name: 'Process',
        type: 'concept',
        summary: 'A program in execution, consisting of program counter, stack, data section, and PCB.',
        subjectName: 'Operating Systems',
        unit: 2,
        keywords: ['process', 'program', 'pcb', 'address space'],
      },
      {
        id: 'node-pcb',
        name: 'Process Control Block (PCB)',
        type: 'definition',
        summary: 'Kernel data structure holding execution context, registers, state, and priority.',
        subjectName: 'Operating Systems',
        unit: 2,
        keywords: ['pcb', 'process control block', 'context', 'registers'],
      },
      {
        id: 'node-cpu-scheduling',
        name: 'CPU Scheduling',
        type: 'topic',
        summary: 'Short-term scheduler dynamic allocation of CPU time to processes in the ready queue.',
        subjectName: 'Operating Systems',
        unit: 2,
        keywords: ['cpu scheduling', 'scheduler', 'ready queue', 'allocation'],
      },
      {
        id: 'node-context-switch',
        name: 'Context Switching',
        type: 'algorithm',
        summary: 'Switching CPU from one process to another, saving old state into PCB and loading new state.',
        subjectName: 'Operating Systems',
        unit: 2,
        keywords: ['context switch', 'dispatcher', 'latency', 'pcb save'],
      },
      {
        id: 'node-deadlock',
        name: 'Deadlock',
        type: 'topic',
        summary: 'A set of processes blocked because each process holds a resource and waits for another resource held by another process.',
        subjectName: 'Operating Systems',
        unit: 3,
        keywords: ['deadlock', 'starvation', 'blocked', 'cycle'],
      },
      {
        id: 'node-coffman-conditions',
        name: '4 Coffman Conditions',
        type: 'formula',
        summary: 'Mutual Exclusion, Hold & Wait, No Preemption, Circular Wait. All 4 must hold simultaneously for deadlock.',
        subjectName: 'Operating Systems',
        unit: 3,
        keywords: ['coffman', 'conditions', 'mutual exclusion', 'hold and wait', 'no preemption', 'circular wait'],
      },
      {
        id: 'node-bankers-algo',
        name: "Banker's Algorithm",
        type: 'algorithm',
        summary: 'Deadlock avoidance algorithm that simulates resource allocation to check for safe states.',
        subjectName: 'Operating Systems',
        unit: 3,
        keywords: ['bankers algorithm', 'avoidance', 'safe state', 'allocation matrix', 'need matrix'],
      },
      {
        id: 'node-virtual-memory',
        name: 'Virtual Memory & Paging',
        type: 'topic',
        summary: 'Decoupling logical memory from physical memory via page tables, TLB, and demand paging.',
        subjectName: 'Operating Systems',
        unit: 4,
        keywords: ['virtual memory', 'paging', 'page table', 'tlb', 'page fault'],
      },
      {
        id: 'node-semaphore',
        name: 'Semaphores & Mutex',
        type: 'concept',
        summary: 'Synchronization primitives (Wait/P and Signal/V) used to eliminate race conditions in critical sections.',
        subjectName: 'Operating Systems',
        unit: 3,
        keywords: ['semaphore', 'mutex', 'critical section', 'race condition', 'wait', 'signal'],
      },
    ];

    const seedEdges: ConceptEdge[] = [
      {
        id: 'edge-1',
        source: 'node-process',
        target: 'node-pcb',
        relationship: 'implements',
        label: 'maintains state inside',
      },
      {
        id: 'edge-2',
        source: 'node-cpu-scheduling',
        target: 'node-context-switch',
        relationship: 'implements',
        label: 'triggers dispatcher for',
      },
      {
        id: 'edge-3',
        source: 'node-context-switch',
        target: 'node-pcb',
        relationship: 'shares_resource',
        label: 'saves and restores',
      },
      {
        id: 'edge-4',
        source: 'node-process',
        target: 'node-cpu-scheduling',
        relationship: 'subtopic_of',
        label: 'is scheduled by',
      },
      {
        id: 'edge-5',
        source: 'node-deadlock',
        target: 'node-coffman-conditions',
        relationship: 'implements',
        label: 'requires all 4',
      },
      {
        id: 'edge-6',
        source: 'node-deadlock',
        target: 'node-bankers-algo',
        relationship: 'solves',
        label: 'avoided dynamically by',
      },
      {
        id: 'edge-7',
        source: 'node-semaphore',
        target: 'node-deadlock',
        relationship: 'causes',
        label: 'can cause deadlock if misordered',
      },
      {
        id: 'edge-8',
        source: 'node-cpu-scheduling',
        target: 'node-virtual-memory',
        relationship: 'shares_resource',
        label: 'coordinates memory with',
      },
    ];

    for (const n of seedNodes) this.nodes.set(n.id, n);
    for (const e of seedEdges) this.edges.set(e.id, e);
    this.saveToDisk();
  }

  /**
   * Adds or updates nodes/edges extracted from an ingested document
   */
  public addConcept(node: ConceptNode) {
    this.nodes.set(node.id, node);
    this.saveToDisk();
  }

  public addRelationship(edge: ConceptEdge) {
    this.edges.set(edge.id, edge);
    this.saveToDisk();
  }

  /**
   * Multi-hop subgraph retrieval for a question
   */
  public queryGraph(
    queryString: string,
    maxHops = 2
  ): {
    matchedNodes: ConceptNode[];
    connectedNodes: ConceptNode[];
    connectingEdges: ConceptEdge[];
    graphContextText: string;
  } {
    const qTokens = queryString.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
    const matchedNodeIds = new Set<string>();

    // 1. Find direct concept hits
    for (const [id, node] of this.nodes.entries()) {
      const nameTokens = node.name.toLowerCase().split(/\s+/);
      const isDirectNameMatch = nameTokens.some((nt) => qTokens.includes(nt));
      const isKeywordMatch = node.keywords.some((kw) => queryString.toLowerCase().includes(kw));

      if (isDirectNameMatch || isKeywordMatch) {
        matchedNodeIds.add(id);
      }
    }

    if (matchedNodeIds.size === 0) {
      return {
        matchedNodes: [],
        connectedNodes: [],
        connectingEdges: [],
        graphContextText: '',
      };
    }

    // 2. Perform BFS traversal up to maxHops
    const visitedNodes = new Set<string>(matchedNodeIds);
    const relevantEdges: ConceptEdge[] = [];
    let currentFrontier = Array.from(matchedNodeIds);

    for (let hop = 0; hop < maxHops; hop++) {
      const nextFrontier: string[] = [];
      for (const nodeId of currentFrontier) {
        for (const edge of this.edges.values()) {
          if (edge.source === nodeId && !visitedNodes.has(edge.target)) {
            visitedNodes.add(edge.target);
            nextFrontier.push(edge.target);
            relevantEdges.push(edge);
          } else if (edge.target === nodeId && !visitedNodes.has(edge.source)) {
            visitedNodes.add(edge.source);
            nextFrontier.push(edge.source);
            relevantEdges.push(edge);
          } else if (
            (edge.source === nodeId && visitedNodes.has(edge.target)) ||
            (edge.target === nodeId && visitedNodes.has(edge.source))
          ) {
            if (!relevantEdges.some((re) => re.id === edge.id)) {
              relevantEdges.push(edge);
            }
          }
        }
      }
      currentFrontier = nextFrontier;
      if (currentFrontier.length === 0) break;
    }

    const matchedNodes = Array.from(matchedNodeIds).map((id) => this.nodes.get(id)!).filter(Boolean);
    const connectedNodes = Array.from(visitedNodes)
      .filter((id) => !matchedNodeIds.has(id))
      .map((id) => this.nodes.get(id)!)
      .filter(Boolean);

    // 3. Format graph context text
    const lines: string[] = ['### 🕸️ Knowledge Graph Context'];
    for (const node of matchedNodes) {
      lines.push(`- **${node.name}** [${node.type}]: ${node.summary}`);
    }
    if (connectedNodes.length > 0) {
      lines.push('\n**Connected Curriculum Concepts:**');
      for (const node of connectedNodes) {
        lines.push(`- **${node.name}** (${node.subjectName || 'Core CS'}): ${node.summary}`);
      }
    }
    if (relevantEdges.length > 0) {
      lines.push('\n**Concept Interdependencies:**');
      for (const edge of relevantEdges) {
        const srcNode = this.nodes.get(edge.source);
        const tgtNode = this.nodes.get(edge.target);
        if (srcNode && tgtNode) {
          lines.push(`- ${srcNode.name} ──[${edge.label}]──► ${tgtNode.name}`);
        }
      }
    }

    return {
      matchedNodes,
      connectedNodes,
      connectingEdges: relevantEdges,
      graphContextText: lines.join('\n'),
    };
  }
}

export const graphRagEngine = new GraphRagEngine();
