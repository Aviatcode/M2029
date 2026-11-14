import fs from 'fs';
import path from 'path';
import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphRelationshipType,
  GraphQueryResult,
  PrerequisiteChainResult,
  PrerequisiteStep,
  GraphProposedChange,
} from './graphTypes.js';
import { graphExtractionService } from './graphExtractionService.js';

const FALLBACK_GRAPH_FILE = path.resolve(
  process.cwd(),
  'curriculum-repo',
  'rag_store',
  'knowledge_graph.json'
);

export interface GraphTraversalOptions {
  classId: string;
  subjectId?: string;
  maxHops?: number;
  maxNodes?: number;
  maxEdges?: number;
  minConfidence?: number;
  verificationFilter?: 'all' | 'verified_only';
}

export class KnowledgeGraphEngine {
  private inMemoryNodes: Map<string, GraphNode> = new Map();
  private inMemoryEdges: Map<string, GraphEdge> = new Map();
  private maxCacheSize = 500;

  constructor() {
    this.hydrateFromLocalFallback();
    // Non-blocking hydration from Neon
    this.hydrateFromNeon().catch((err) => {
      console.warn('[Knowledge Graph] Initial Neon hydration notice:', err?.message || err);
    });
  }

  /**
   * Loads initial seed nodes from local disk fallback for zero-latency startup
   */
  private hydrateFromLocalFallback() {
    try {
      if (fs.existsSync(FALLBACK_GRAPH_FILE)) {
        const raw = fs.readFileSync(FALLBACK_GRAPH_FILE, 'utf8');
        const data = JSON.parse(raw);
        for (const n of data.nodes || []) {
          const canonical = graphExtractionService.normalizeCanonicalName(n.name);
          const node: GraphNode = {
            id: n.id,
            classId: n.classId || 'class-m2029',
            subjectId: n.subjectId,
            subjectName: n.subjectName || 'Operating Systems',
            name: n.name,
            canonicalName: canonical,
            nodeType: (n.type as GraphNodeType) || 'concept',
            summary: n.summary || '',
            unitNumber: n.unit || 1,
            extractionMethod: 'curriculum_curated',
            confidenceScore: 1.0,
            verificationStatus: 'verified',
            keywords: n.keywords || [canonical],
            properties: {},
          };
          this.inMemoryNodes.set(node.id, node);
        }
        for (const e of data.edges || []) {
          const edge: GraphEdge = {
            id: e.id,
            classId: e.classId || 'class-m2029',
            sourceNodeId: e.source,
            targetNodeId: e.target,
            relationshipType: (e.relationship?.toUpperCase() as GraphRelationshipType) || 'RELATED_TO',
            label: e.label || 'relates to',
            description: e.label,
            extractionMethod: 'curriculum_curated',
            confidenceScore: 1.0,
            verificationStatus: 'verified',
            weight: 1.0,
          };
          this.inMemoryEdges.set(edge.id, edge);
        }
      }
    } catch (err: any) {
      console.warn('[Knowledge Graph] Local fallback read notice:', err?.message || err);
    }
  }

  /**
   * Hydrates graph nodes and edges from Neon PostgreSQL
   */
  public async hydrateFromNeon(classId: string = 'class-m2029'): Promise<{ nodesCount: number; edgesCount: number }> {
    if (!isNeonConfigured()) {
      return { nodesCount: this.inMemoryNodes.size, edgesCount: this.inMemoryEdges.size };
    }

    try {
      const nodeRows = await queryNeon<any>(
        `SELECT * FROM graph_nodes 
         WHERE (class_id = $1 OR class_id = 'class-shared' OR class_id = 'public') 
         ORDER BY updated_at DESC LIMIT 500`,
        [classId]
      );

      for (const r of nodeRows) {
        const node: GraphNode = {
          id: r.id,
          classId: r.class_id,
          subjectId: r.subject_id,
          subjectName: r.subject_name,
          name: r.name,
          canonicalName: r.canonical_name,
          nodeType: r.node_type as GraphNodeType,
          summary: r.summary,
          unitNumber: r.unit_number ? Number(r.unit_number) : undefined,
          sourceDocId: r.source_doc_id,
          sourceAssetHash: r.source_asset_hash,
          docVersion: r.doc_version ? Number(r.doc_version) : 1,
          pageNumber: r.page_number ? Number(r.page_number) : undefined,
          sectionTitle: r.section_title,
          extractionMethod: r.extraction_method,
          confidenceScore: Number(r.confidence_score) || 1.0,
          verificationStatus: r.verification_status,
          keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : (r.keywords || []),
          properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
          createdAt: r.created_at,
          updatedAt: r.updated_at,
        };
        this.inMemoryNodes.set(node.id, node);
      }

      const edgeRows = await queryNeon<any>(
        `SELECT * FROM graph_edges 
         WHERE (class_id = $1 OR class_id = 'class-shared' OR class_id = 'public') 
         ORDER BY updated_at DESC LIMIT 1000`,
        [classId]
      );

      for (const er of edgeRows) {
        const edge: GraphEdge = {
          id: er.id,
          classId: er.class_id,
          subjectId: er.subject_id,
          sourceNodeId: er.source_node_id,
          targetNodeId: er.target_node_id,
          relationshipType: er.relationship_type as GraphRelationshipType,
          label: er.label,
          description: er.description,
          sourceDocId: er.source_doc_id,
          sourceAssetHash: er.source_asset_hash,
          docVersion: er.doc_version ? Number(er.doc_version) : 1,
          pageNumber: er.page_number ? Number(er.page_number) : undefined,
          sectionTitle: er.section_title,
          extractionMethod: er.extraction_method,
          confidenceScore: Number(er.confidence_score) || 1.0,
          verificationStatus: er.verification_status,
          weight: Number(er.weight) || 1.0,
          properties: typeof er.properties === 'string' ? JSON.parse(er.properties) : (er.properties || {}),
          createdAt: er.created_at,
          updatedAt: er.updated_at,
        };
        this.inMemoryEdges.set(edge.id, edge);
      }

      console.log(`[Knowledge Graph] ☁️ Hydrated from Neon: ${this.inMemoryNodes.size} nodes, ${this.inMemoryEdges.size} edges active.`);
      return { nodesCount: this.inMemoryNodes.size, edgesCount: this.inMemoryEdges.size };
    } catch (err: any) {
      console.warn('[Knowledge Graph] Hydration from Neon notice:', err?.message || err);
      return { nodesCount: this.inMemoryNodes.size, edgesCount: this.inMemoryEdges.size };
    }
  }

  /**
   * Selectively decides whether a student question warrants Graph RAG
   */
  public shouldTriggerGraphRag(query: string): {
    trigger: boolean;
    intent: 'prerequisite' | 'comparison' | 'learning_path' | 'relationship' | 'none';
    reason: string;
  } {
    const q = query.trim().toLowerCase();

    // 1. Prerequisite Intent
    if (
      /\b(?:what\s+(?:should|do|must)\s+i\s+learn\s+before|prerequisite|prerequisites|prior\s+knowledge|foundational\s+knowledge|concepts?\s+required\s+before|what\s+do\s+i\s+need\s+to\s+know\s+before)\b/i.test(
        q
      )
    ) {
      return {
        trigger: true,
        intent: 'prerequisite',
        reason: 'Question requires analyzing foundational prerequisite relationships.',
      };
    }

    // 2. Comparison / Contrast Intent
    if (
      /\b(?:how\s+are\s+.*\s+and\s+.*\s+related|difference\s+between|compare\s+and\s+contrast|versus|vs\.?|how\s+do\s+.*\s+differ)\b/i.test(
        q
      )
    ) {
      return {
        trigger: true,
        intent: 'comparison',
        reason: 'Question requires comparing multiple entities across units.',
      };
    }

    // 3. Inter-concept Relationship & Integration
    if (
      /\b(?:how\s+(?:does|do)\s+.*\s+(?:connect|relate|link)\s+to|connection\s+between|how\s+.*\s+work\s+together|how\s+is\s+.*\s+applied\s+in|relationship\s+between)\b/i.test(
        q
      )
    ) {
      return {
        trigger: true,
        intent: 'relationship',
        reason: 'Question requires tracing multi-hop concept relationships.',
      };
    }

    // 4. Learning Path & Topic Sequencing
    if (
      /\b(?:learning\s+path|study\s+roadmap|what\s+order\s+to\s+study|which\s+concepts\s+from\s+unit\s+\d+\s+are\s+required|step\s+by\s+step\s+path)\b/i.test(
        q
      )
    ) {
      return {
        trigger: true,
        intent: 'learning_path',
        reason: 'Question requires constructing an ordered curriculum learning path.',
      };
    }

    // Ordinary direct question -> bypass Graph RAG, use Hybrid RAG only
    return {
      trigger: false,
      intent: 'none',
      reason: 'Direct conceptual or factual query suited for standard Hybrid RAG.',
    };
  }

  /**
   * Multi-hop subgraph query with bounded traversal, cycle detection, and classroom isolation
   */
  public async queryGraph(
    queryText: string,
    options: GraphTraversalOptions
  ): Promise<GraphQueryResult> {
    const {
      classId,
      subjectId,
      maxHops = 2,
      maxNodes = 12,
      maxEdges = 16,
      minConfidence = 0.5,
      verificationFilter = 'all',
    } = options;

    const normalizedQuery = queryText.toLowerCase();
    const queryTokens = normalizedQuery
      .split(/\s+/)
      .map((t) => t.replace(/[^\w-]/g, ''))
      .filter((w) => w.length > 2);

    let candidateNodes: GraphNode[] = [];
    let candidateEdges: GraphEdge[] = [];

    // Branch A: Query Neon PostgreSQL if configured
    if (isNeonConfigured()) {
      try {
        let nodeSql = `SELECT * FROM graph_nodes WHERE (class_id = $1 OR class_id = 'class-shared' OR class_id = 'public')`;
        const nodeParams: any[] = [classId];
        let pIdx = 2;

        if (subjectId) {
          nodeSql += ` AND (subject_id = $${pIdx} OR subject_id IS NULL)`;
          nodeParams.push(subjectId);
          pIdx++;
        }

        if (verificationFilter === 'verified_only') {
          nodeSql += ` AND verification_status = 'verified'`;
        }

        nodeSql += ` AND confidence_score >= $${pIdx} LIMIT 200`;
        nodeParams.push(minConfidence);

        const rows = await queryNeon<any>(nodeSql, nodeParams);

        candidateNodes = rows.map((r) => ({
          id: r.id,
          classId: r.class_id,
          subjectId: r.subject_id,
          subjectName: r.subject_name,
          name: r.name,
          canonicalName: r.canonical_name,
          nodeType: r.node_type as GraphNodeType,
          summary: r.summary,
          unitNumber: r.unit_number ? Number(r.unit_number) : undefined,
          sourceDocId: r.source_doc_id,
          sourceAssetHash: r.source_asset_hash,
          docVersion: r.doc_version ? Number(r.doc_version) : 1,
          pageNumber: r.page_number ? Number(r.page_number) : undefined,
          sectionTitle: r.section_title,
          extractionMethod: r.extraction_method,
          confidenceScore: Number(r.confidence_score) || 1.0,
          verificationStatus: r.verification_status,
          keywords: typeof r.keywords === 'string' ? JSON.parse(r.keywords) : (r.keywords || []),
          properties: typeof r.properties === 'string' ? JSON.parse(r.properties) : (r.properties || {}),
        }));

        let edgeSql = `SELECT * FROM graph_edges WHERE (class_id = $1 OR class_id = 'class-shared' OR class_id = 'public')`;
        const edgeParams: any[] = [classId];
        let epIdx = 2;

        if (subjectId) {
          edgeSql += ` AND (subject_id = $${epIdx} OR subject_id IS NULL)`;
          edgeParams.push(subjectId);
          epIdx++;
        }

        if (verificationFilter === 'verified_only') {
          edgeSql += ` AND verification_status = 'verified'`;
        }

        edgeSql += ` AND confidence_score >= $${epIdx} LIMIT 300`;
        edgeParams.push(minConfidence);

        const edgeRows = await queryNeon<any>(edgeSql, edgeParams);

        candidateEdges = edgeRows.map((er) => ({
          id: er.id,
          classId: er.class_id,
          subjectId: er.subject_id,
          sourceNodeId: er.source_node_id,
          targetNodeId: er.target_node_id,
          relationshipType: er.relationship_type as GraphRelationshipType,
          label: er.label,
          description: er.description,
          sourceDocId: er.source_doc_id,
          sourceAssetHash: er.source_asset_hash,
          docVersion: er.doc_version ? Number(er.doc_version) : 1,
          pageNumber: er.page_number ? Number(er.page_number) : undefined,
          sectionTitle: er.section_title,
          extractionMethod: er.extraction_method,
          confidenceScore: Number(er.confidence_score) || 1.0,
          verificationStatus: er.verification_status,
          weight: Number(er.weight) || 1.0,
        }));
      } catch (err: any) {
        console.warn('[Knowledge Graph] Neon query notice, falling back to in-memory:', err?.message || err);
        candidateNodes = Array.from(this.inMemoryNodes.values()).filter(
          (n) => n.classId === classId || n.classId === 'class-shared' || n.classId === 'public'
        );
        candidateEdges = Array.from(this.inMemoryEdges.values()).filter(
          (e) => e.classId === classId || e.classId === 'class-shared' || e.classId === 'public'
        );
      }
    } else {
      // In-memory fallback
      candidateNodes = Array.from(this.inMemoryNodes.values()).filter(
        (n) => n.classId === classId || n.classId === 'class-shared' || n.classId === 'public'
      );
      candidateEdges = Array.from(this.inMemoryEdges.values()).filter(
        (e) => e.classId === classId || e.classId === 'class-shared' || e.classId === 'public'
      );
    }

    const nodeMap = new Map<string, GraphNode>(candidateNodes.map((n) => [n.id, n]));
    const matchedNodeIds = new Set<string>();

    // Step 1: Match Entry Nodes
    for (const node of candidateNodes) {
      const canon = node.canonicalName;
      const name = node.name.toLowerCase();

      const directCanonMatch = normalizedQuery.includes(canon) || canon.includes(normalizedQuery);
      const tokenMatch = queryTokens.some((t) => name.includes(t) || canon.includes(t));
      const keywordMatch = node.keywords.some((kw) => normalizedQuery.includes(kw.toLowerCase()));

      if (directCanonMatch || tokenMatch || keywordMatch) {
        matchedNodeIds.add(node.id);
      }
    }

    if (matchedNodeIds.size === 0) {
      return {
        matchedNodes: [],
        connectedNodes: [],
        connectingEdges: [],
        graphContextText: '',
        retrievalSummary: 'No matching concept nodes found in authorized classroom graph.',
        hasPrerequisites: false,
      };
    }

    // Step 2: Bounded BFS Multi-hop Traversal
    const visited = new Set<string>(matchedNodeIds);
    const resultEdges: GraphEdge[] = [];
    let currentFrontier = Array.from(matchedNodeIds);

    for (let hop = 0; hop < maxHops; hop++) {
      const nextFrontier: string[] = [];
      for (const nodeId of currentFrontier) {
        for (const edge of candidateEdges) {
          if (resultEdges.length >= maxEdges) break;

          if (edge.sourceNodeId === nodeId && !visited.has(edge.targetNodeId)) {
            visited.add(edge.targetNodeId);
            nextFrontier.push(edge.targetNodeId);
            resultEdges.push(edge);
          } else if (edge.targetNodeId === nodeId && !visited.has(edge.sourceNodeId)) {
            visited.add(edge.sourceNodeId);
            nextFrontier.push(edge.sourceNodeId);
            resultEdges.push(edge);
          } else if (
            (edge.sourceNodeId === nodeId && visited.has(edge.targetNodeId)) ||
            (edge.targetNodeId === nodeId && visited.has(edge.sourceNodeId))
          ) {
            if (!resultEdges.some((re) => re.id === edge.id)) {
              resultEdges.push(edge);
            }
          }
        }
      }
      currentFrontier = nextFrontier;
      if (currentFrontier.length === 0 || visited.size >= maxNodes) break;
    }

    const matchedNodes = Array.from(matchedNodeIds)
      .map((id) => nodeMap.get(id)!)
      .filter(Boolean);

    const connectedNodes = Array.from(visited)
      .filter((id) => !matchedNodeIds.has(id))
      .slice(0, maxNodes - matchedNodes.length)
      .map((id) => nodeMap.get(id)!)
      .filter(Boolean);

    // Step 3: Check for Prerequisite Chains for Primary Matched Node
    let prerequisiteChain: PrerequisiteChainResult | undefined;
    if (matchedNodes.length > 0) {
      prerequisiteChain = this.calculatePrerequisiteChain(matchedNodes[0].id, candidateNodes, candidateEdges);
    }

    // Step 4: Construct Markdown Context
    const lines: string[] = ['### 🕸️ Academic Knowledge Graph & Concept Interdependencies'];

    lines.push('\n**Core Concept Entities:**');
    for (const node of matchedNodes) {
      const statusBadge = node.verificationStatus === 'verified' ? '✅ Verified' : '⚠️ Unverified';
      const sourceRef = node.sectionTitle ? ` (Source: "${node.sectionTitle}", Page ${node.pageNumber || 'N/A'})` : '';
      lines.push(`- **${node.name}** [${node.nodeType.toUpperCase()} | ${statusBadge}]${sourceRef}: ${node.summary}`);
    }

    if (connectedNodes.length > 0) {
      lines.push('\n**Related Curriculum Concepts:**');
      for (const node of connectedNodes) {
        const unitRef = node.unitNumber ? `Unit ${node.unitNumber}` : node.subjectName;
        lines.push(`- **${node.name}** (${unitRef}): ${node.summary}`);
      }
    }

    if (resultEdges.length > 0) {
      lines.push('\n**Verified Concept Relationships:**');
      for (const edge of resultEdges) {
        const src = nodeMap.get(edge.sourceNodeId)?.name || edge.sourceNodeId;
        const tgt = nodeMap.get(edge.targetNodeId)?.name || edge.targetNodeId;
        const statusBadge = edge.verificationStatus === 'verified' ? '✅' : '⚠️';
        lines.push(`- ${src} ──[${edge.relationshipType}: "${edge.label}"]──► ${tgt} ${statusBadge}`);
      }
    }

    if (prerequisiteChain && prerequisiteChain.prerequisites.length > 0) {
      lines.push('\n**Recommended Prerequisite Learning Path:**');
      lines.push(prerequisiteChain.pathString);
      if (prerequisiteChain.missingPrerequisites.length > 0) {
        lines.push(`- ℹ️ *Missing syllabus prerequisites:* ${prerequisiteChain.missingPrerequisites.join(', ')}`);
      }
    }

    const graphContextText = lines.join('\n');
    const retrievalSummary = `Traversed knowledge graph: ${matchedNodes.length} focal nodes, ${connectedNodes.length} connected nodes, ${resultEdges.length} relationship edges.`;

    return {
      matchedNodes,
      connectedNodes,
      connectingEdges: resultEdges,
      graphContextText,
      retrievalSummary,
      hasPrerequisites: Boolean(prerequisiteChain && prerequisiteChain.prerequisites.length > 0),
      prerequisiteChain,
    };
  }

  /**
   * Calculates a topological prerequisite chain for a target concept, detecting cycles
   */
  public calculatePrerequisiteChain(
    targetNodeId: string,
    allNodes: GraphNode[],
    allEdges: GraphEdge[]
  ): PrerequisiteChainResult {
    const nodeMap = new Map<string, GraphNode>(allNodes.map((n) => [n.id, n]));
    const targetNode = nodeMap.get(targetNodeId) || null;

    if (!targetNode) {
      return {
        targetNode: null,
        prerequisites: [],
        hasCycle: false,
        missingPrerequisites: [],
        pathString: 'Target concept not found.',
        isFullyVerified: false,
      };
    }

    const visited = new Set<string>();
    const currentPath = new Set<string>();
    const orderedPrereqs: PrerequisiteStep[] = [];
    const missingPrerequisites: string[] = [];
    let hasCycle = false;
    const cycleNodes: string[] = [];

    // DFS reverse traversal on REQUIRES and forward traversal on PREREQUISITE_OF
    const dfs = (nodeId: string, depth = 0) => {
      if (depth > 10) return; // Guard maximum traversal depth

      if (currentPath.has(nodeId)) {
        hasCycle = true;
        cycleNodes.push(nodeId);
        return;
      }

      if (visited.has(nodeId)) return;

      currentPath.add(nodeId);
      visited.add(nodeId);

      // Find prerequisite edges where target is nodeId and rel is REQUIRES,
      // or source is nodeId and rel is PREREQUISITE_OF
      const prereqEdges = allEdges.filter(
        (e) =>
          (e.sourceNodeId === nodeId && e.relationshipType === 'REQUIRES') ||
          (e.targetNodeId === nodeId && e.relationshipType === 'PREREQUISITE_OF')
      );

      for (const edge of prereqEdges) {
        const prereqNodeId =
          edge.relationshipType === 'REQUIRES' ? edge.targetNodeId : edge.sourceNodeId;

        const prereqNode = nodeMap.get(prereqNodeId);
        if (!prereqNode) {
          missingPrerequisites.push(prereqNodeId);
          continue;
        }

        dfs(prereqNodeId, depth + 1);

        if (prereqNodeId !== targetNodeId && !orderedPrereqs.some((p) => p.nodeId === prereqNodeId)) {
          orderedPrereqs.push({
            nodeId: prereqNode.id,
            name: prereqNode.name,
            nodeType: prereqNode.nodeType,
            unitNumber: prereqNode.unitNumber,
            subjectName: prereqNode.subjectName,
            summary: prereqNode.summary,
            verificationStatus: edge.verificationStatus,
            confidenceScore: edge.confidenceScore,
            sourceDocTitle: edge.sectionTitle,
            pageNumber: edge.pageNumber,
            rationale: edge.description,
          });
        }
      }

      currentPath.delete(nodeId);
    };

    dfs(targetNodeId);

    const isFullyVerified =
      orderedPrereqs.length > 0 &&
      orderedPrereqs.every((p) => p.verificationStatus === 'verified');

    const chainNames = [...orderedPrereqs.map((p) => p.name), targetNode.name];
    const pathString = hasCycle
      ? `⚠️ Circular dependency detected (${cycleNodes.join(' ↔ ')}). Safe fallback path: ${chainNames.join(' → ')}`
      : chainNames.join(' → ');

    return {
      targetNode,
      prerequisites: orderedPrereqs,
      hasCycle,
      cycleNodes: hasCycle ? cycleNodes : undefined,
      missingPrerequisites: Array.from(new Set(missingPrerequisites)),
      pathString,
      isFullyVerified,
    };
  }

  /**
   * Submits a student-proposed graph change without modifying verified graph
   */
  public async proposeChange(change: Omit<GraphProposedChange, 'id' | 'createdAt' | 'status'>): Promise<GraphProposedChange> {
    const id = `prop-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const fullChange: GraphProposedChange = {
      ...change,
      id,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };

    if (isNeonConfigured()) {
      await queryNeon(
        `INSERT INTO graph_proposed_changes (
          id, class_id, proposed_by, change_type, target_id, proposed_data, reason, status, created_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          fullChange.id,
          fullChange.classId,
          fullChange.proposedBy,
          fullChange.changeType,
          fullChange.targetId || null,
          JSON.stringify(fullChange.proposedData),
          fullChange.reason,
          fullChange.status,
        ]
      );
    }

    return fullChange;
  }

  /**
   * Reviews and applies a student-proposed graph change (Teacher / Admin only)
   */
  public async reviewChange(params: {
    changeId: string;
    status: 'approved' | 'rejected';
    reviewerName: string;
    reviewNotes?: string;
  }): Promise<{ success: boolean; message: string }> {
    if (!isNeonConfigured()) {
      return { success: false, message: 'Database not configured.' };
    }

    const rows = await queryNeon<any>(
      `SELECT * FROM graph_proposed_changes WHERE id = $1`,
      [params.changeId]
    );

    if (rows.length === 0) {
      return { success: false, message: 'Proposed change not found.' };
    }

    const item = rows[0];
    const proposedData = typeof item.proposed_data === 'string' ? JSON.parse(item.proposed_data) : item.proposed_data;

    await queryNeon(
      `UPDATE graph_proposed_changes 
       SET status = $1, reviewed_by = $2, review_notes = $3, resolved_at = NOW() 
       WHERE id = $4`,
      [params.status, params.reviewerName, params.reviewNotes || '', params.changeId]
    );

    if (params.status === 'approved') {
      if (item.change_type === 'add_node') {
        await graphExtractionService.persistGraphElements({
          nodes: [{ ...proposedData, verificationStatus: 'verified' }],
          edges: [],
          classId: item.class_id,
        });
      } else if (item.change_type === 'add_edge') {
        await graphExtractionService.persistGraphElements({
          nodes: [],
          edges: [{ ...proposedData, verificationStatus: 'verified' }],
          classId: item.class_id,
        });
      }
      // Rehydrate in-memory graph
      await this.hydrateFromNeon(item.class_id);
    }

    return {
      success: true,
      message: `Change ${params.changeId} successfully ${params.status}.`,
    };
  }

  public addNodeToMemory(node: GraphNode) {
    this.inMemoryNodes.set(node.id, node);
  }

  public addEdgeToMemory(edge: GraphEdge) {
    this.inMemoryEdges.set(edge.id, edge);
  }

  /**
   * In-memory test helper to reset graph
   */
  public clearAll() {
    this.inMemoryNodes.clear();
    this.inMemoryEdges.clear();
  }
}

export const knowledgeGraphEngine = new KnowledgeGraphEngine();
export const graphRagEngine = knowledgeGraphEngine;
