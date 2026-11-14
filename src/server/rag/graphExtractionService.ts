import {
  GraphNode,
  GraphEdge,
  GraphNodeType,
  GraphRelationshipType,
  GraphExtractionMethod,
  GraphVerificationStatus,
} from './graphTypes.js';
import { queryNeon, isNeonConfigured } from '../db/neonClient.js';
import { knowledgeGraphEngine } from './graphRagEngine.js';
import { UniversalKeyConfig } from '../ai/provider.js';
import { GoogleGenAI } from '@google/genai';

// Common Computer Science acronym and synonym dictionary for accurate canonical deduplication
const SYNONYM_DICTIONARY: Record<string, string> = {
  '2pc': 'two-phase commit protocol',
  'two phase commit': 'two-phase commit protocol',
  'two-phase commit': 'two-phase commit protocol',
  '3pc': 'three-phase commit protocol',
  'three phase commit': 'three-phase commit protocol',
  'pcb': 'process control block',
  'process control block (pcb)': 'process control block',
  'tlb': 'translation lookaside buffer',
  'vm': 'virtual memory',
  'virtual memory & paging': 'virtual memory',
  'fcfs': 'first come first serve',
  'sjf': 'shortest job first',
  'srtf': 'shortest remaining time first',
  'rr': 'round robin',
  'pbft': 'practical byzantine fault tolerance',
  'bft': 'byzantine fault tolerance',
  'cpu scheduling': 'cpu scheduling algorithms',
  '4 coffman conditions': 'coffman conditions',
  'coffman conditions for deadlock': 'coffman conditions',
};

export class GraphExtractionService {
  /**
   * Normalizes concept names to a canonical slug/string to prevent duplicate nodes
   */
  public normalizeCanonicalName(rawName: string): string {
    const cleaned = rawName
      .trim()
      .toLowerCase()
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, ' ');

    if (SYNONYM_DICTIONARY[cleaned]) {
      return SYNONYM_DICTIONARY[cleaned];
    }

    return cleaned;
  }

  /**
   * Generates a stable deterministic node ID
   */
  public generateNodeId(classId: string, nodeType: GraphNodeType, canonicalName: string): string {
    const slug = canonicalName.replace(/\s+/g, '-').slice(0, 40);
    return `node-${classId.slice(0, 8)}-${nodeType.slice(0, 4)}-${slug}`;
  }

  /**
   * Generates a stable deterministic edge ID
   */
  public generateEdgeId(
    classId: string,
    sourceId: string,
    targetId: string,
    relType: GraphRelationshipType
  ): string {
    return `edge-${sourceId.slice(-12)}-${relType.slice(0, 4)}-${targetId.slice(-12)}`;
  }

  /**
   * Extracts academic concepts and relationships from text chunks using rule-based pattern matching
   */
  public extractFromText(params: {
    text: string;
    classId: string;
    subjectId?: string;
    subjectName: string;
    unitNumber?: number;
    sourceDocId?: string;
    sourceAssetHash?: string;
    docVersion?: number;
    pageNumber?: number;
    sectionTitle?: string;
    uploaderRole?: string;
  }): { nodes: GraphNode[]; edges: GraphEdge[] } {
    const {
      text,
      classId,
      subjectId,
      subjectName,
      unitNumber,
      sourceDocId,
      sourceAssetHash,
      docVersion = 1,
      pageNumber = 1,
      sectionTitle = 'Core Notes',
      uploaderRole = 'student',
    } = params;

    const nodes: GraphNode[] = [];
    const edges: GraphEdge[] = [];
    const isTeacher = uploaderRole === 'teacher';
    const status: GraphVerificationStatus = isTeacher ? 'verified' : 'unverified';
    const baseConfidence = isTeacher ? 1.0 : 0.85;

    // Pattern 1: Definitions: "X is defined as ...", "X is a ...", "An X is ..."
    const defRegex = /\b([A-Z][A-Za-z0-9\s-]{2,45})\s+(?:is\s+defined\s+as|is\s+an?|refers\s+to|represents)\s+([^.\n]{15,250})\./g;
    let defMatch: RegExpExecArray | null;

    while ((defMatch = defRegex.exec(text)) !== null) {
      const rawConcept = defMatch[1].trim();
      const definition = defMatch[2].trim();
      const canonical = this.normalizeCanonicalName(rawConcept);

      if (canonical.length > 2 && !['this', 'there', 'it', 'these', 'those'].includes(canonical)) {
        const nodeId = this.generateNodeId(classId, 'definition', canonical);
        nodes.push({
          id: nodeId,
          classId,
          subjectId,
          subjectName,
          name: rawConcept,
          canonicalName: canonical,
          nodeType: 'definition',
          summary: `${rawConcept} is ${definition}.`,
          unitNumber,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
          keywords: [canonical, ...canonical.split(' ')],
          properties: { definitionText: definition },
        });
      }
    }

    // Pattern 2: Prerequisites & Dependencies: "requires ...", "prerequisite for ...", "before learning X, you must know Y"
    const reqRegex = /\b([A-Za-z0-9\s-]{3,40})\s+(?:requires|depends\s+on|needs|is\s+based\s+on)\s+([A-Za-z0-9\s-]{3,40})/gi;
    let reqMatch: RegExpExecArray | null;

    while ((reqMatch = reqRegex.exec(text)) !== null) {
      const rawTarget = reqMatch[1].trim();
      const rawPrereq = reqMatch[2].trim();
      const targetCanon = this.normalizeCanonicalName(rawTarget);
      const prereqCanon = this.normalizeCanonicalName(rawPrereq);

      if (targetCanon.length > 2 && prereqCanon.length > 2 && targetCanon !== prereqCanon) {
        const targetNodeId = this.generateNodeId(classId, 'concept', targetCanon);
        const prereqNodeId = this.generateNodeId(classId, 'concept', prereqCanon);

        // Ensure prerequisite node exists
        nodes.push({
          id: prereqNodeId,
          classId,
          subjectId,
          subjectName,
          name: rawPrereq,
          canonicalName: prereqCanon,
          nodeType: 'concept',
          summary: `Foundational concept required for understanding ${rawTarget}.`,
          unitNumber,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
          keywords: [prereqCanon],
        });

        // Ensure target node exists
        nodes.push({
          id: targetNodeId,
          classId,
          subjectId,
          subjectName,
          name: rawTarget,
          canonicalName: targetCanon,
          nodeType: 'concept',
          summary: `Academic concept depending on ${rawPrereq}.`,
          unitNumber,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
          keywords: [targetCanon],
        });

        // Add edge: target REQUIRES prereq
        const edgeId = this.generateEdgeId(classId, targetNodeId, prereqNodeId, 'REQUIRES');
        edges.push({
          id: edgeId,
          classId,
          subjectId,
          sourceNodeId: targetNodeId,
          targetNodeId: prereqNodeId,
          relationshipType: 'REQUIRES',
          label: 'requires foundational knowledge of',
          description: `${rawTarget} requires prior understanding of ${rawPrereq}.`,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
        });

        // Add complementary forward edge: prereq PREREQUISITE_OF target
        const fwdEdgeId = this.generateEdgeId(classId, prereqNodeId, targetNodeId, 'PREREQUISITE_OF');
        edges.push({
          id: fwdEdgeId,
          classId,
          subjectId,
          sourceNodeId: prereqNodeId,
          targetNodeId: targetNodeId,
          relationshipType: 'PREREQUISITE_OF',
          label: 'is prerequisite of',
          description: `${rawPrereq} serves as a prerequisite foundation for ${rawTarget}.`,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
        });
      }
    }

    // Pattern 3: Contrasting concepts: "Unlike X, Y ...", "Difference between X and Y"
    const contrastRegex = /(?:difference\s+between|unlike|in\s+contrast\s+to)\s+([A-Za-z0-9\s-]{3,35})\s+(?:and|,)\s+([A-Za-z0-9\s-]{3,35})/gi;
    let conMatch: RegExpExecArray | null;

    while ((conMatch = contrastRegex.exec(text)) !== null) {
      const rawA = conMatch[1].trim();
      const rawB = conMatch[2].trim();
      const canonA = this.normalizeCanonicalName(rawA);
      const canonB = this.normalizeCanonicalName(rawB);

      if (canonA.length > 2 && canonB.length > 2 && canonA !== canonB) {
        const nodeAId = this.generateNodeId(classId, 'concept', canonA);
        const nodeBId = this.generateNodeId(classId, 'concept', canonB);

        edges.push({
          id: this.generateEdgeId(classId, nodeAId, nodeBId, 'CONTRASTS_WITH'),
          classId,
          subjectId,
          sourceNodeId: nodeAId,
          targetNodeId: nodeBId,
          relationshipType: 'CONTRASTS_WITH',
          label: 'contrasts with / compared against',
          description: `${rawA} is compared and contrasted with ${rawB}.`,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
        });
      }
    }

    // Pattern 4: Examples: "Example: ...", "For example, ..."
    const exRegex = /(?:for\s+example|example\s*:|real[- ]world\s+example\s*:)\s*([^.\n]{15,200})/gi;
    let exMatch: RegExpExecArray | null;

    while ((exMatch = exRegex.exec(text)) !== null) {
      const exampleText = exMatch[1].trim();
      if (exampleText.length > 15) {
        const exCanon = `example-${sectionTitle.slice(0, 20)}-${pageNumber}`.toLowerCase().replace(/\s+/g, '-');
        const exNodeId = this.generateNodeId(classId, 'example', exCanon);

        nodes.push({
          id: exNodeId,
          classId,
          subjectId,
          subjectName,
          name: `Example: ${sectionTitle}`,
          canonicalName: exCanon,
          nodeType: 'example',
          summary: exampleText,
          unitNumber,
          sourceDocId,
          sourceAssetHash,
          docVersion,
          pageNumber,
          sectionTitle,
          extractionMethod: 'document_ingestion',
          confidenceScore: baseConfidence,
          verificationStatus: status,
          keywords: ['example', sectionTitle.toLowerCase()],
        });
      }
    }

    return { nodes, edges };
  }

  /**
   * Persists extracted nodes and edges to Neon PostgreSQL, preserving verified relationships
   */
  public async persistGraphElements(params: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    classId: string;
  }): Promise<{ insertedNodes: number; insertedEdges: number }> {
    // Always update in-memory cache
    for (const node of params.nodes) {
      knowledgeGraphEngine.addNodeToMemory(node);
    }
    for (const edge of params.edges) {
      knowledgeGraphEngine.addEdgeToMemory(edge);
    }

    if (!isNeonConfigured()) return { insertedNodes: params.nodes.length, insertedEdges: params.edges.length };

    let insertedNodes = 0;
    let insertedEdges = 0;

    // 1. Persist Nodes with Verification Guard
    for (const node of params.nodes) {
      try {
        await queryNeon(
          `INSERT INTO graph_nodes (
            id, class_id, subject_id, subject_name, name, canonical_name,
            node_type, summary, unit_number, source_doc_id, source_asset_hash,
            doc_version, page_number, section_title, extraction_method,
            confidence_score, verification_status, keywords, properties, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, NOW())
          ON CONFLICT (class_id, node_type, canonical_name) DO UPDATE SET
            summary = CASE 
              WHEN graph_nodes.verification_status = 'verified' AND EXCLUDED.verification_status != 'verified' 
              THEN graph_nodes.summary 
              ELSE EXCLUDED.summary 
            END,
            confidence_score = GREATEST(graph_nodes.confidence_score, EXCLUDED.confidence_score),
            verification_status = CASE 
              WHEN graph_nodes.verification_status = 'verified' THEN 'verified'
              ELSE EXCLUDED.verification_status 
            END,
            doc_version = GREATEST(graph_nodes.doc_version, EXCLUDED.doc_version),
            page_number = COALESCE(EXCLUDED.page_number, graph_nodes.page_number),
            section_title = COALESCE(EXCLUDED.section_title, graph_nodes.section_title),
            updated_at = NOW()`,
          [
            node.id,
            node.classId,
            node.subjectId || null,
            node.subjectName,
            node.name,
            node.canonicalName,
            node.nodeType,
            node.summary,
            node.unitNumber || null,
            node.sourceDocId || null,
            node.sourceAssetHash || null,
            node.docVersion || 1,
            node.pageNumber || null,
            node.sectionTitle || null,
            node.extractionMethod,
            node.confidenceScore,
            node.verificationStatus,
            JSON.stringify(node.keywords || []),
            JSON.stringify(node.properties || {}),
          ]
        );
        insertedNodes++;
      } catch (err: any) {
        console.warn('[Graph Extraction] Node insert warning:', err?.message || err);
      }
    }

    // 2. Persist Edges with Verification Guard
    for (const edge of params.edges) {
      try {
        await queryNeon(
          `INSERT INTO graph_edges (
            id, class_id, subject_id, source_node_id, target_node_id,
            relationship_type, label, description, source_doc_id, source_asset_hash,
            doc_version, page_number, section_title, extraction_method,
            confidence_score, verification_status, weight, properties, updated_at
          ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, NOW())
          ON CONFLICT (class_id, source_node_id, target_node_id, relationship_type) DO UPDATE SET
            description = CASE 
              WHEN graph_edges.verification_status = 'verified' AND EXCLUDED.verification_status != 'verified' 
              THEN graph_edges.description 
              ELSE EXCLUDED.description 
            END,
            confidence_score = GREATEST(graph_edges.confidence_score, EXCLUDED.confidence_score),
            verification_status = CASE 
              WHEN graph_edges.verification_status = 'verified' THEN 'verified'
              ELSE EXCLUDED.verification_status 
            END,
            updated_at = NOW()`,
          [
            edge.id,
            edge.classId,
            edge.subjectId || null,
            edge.sourceNodeId,
            edge.targetNodeId,
            edge.relationshipType,
            edge.label,
            edge.description || '',
            edge.sourceDocId || null,
            edge.sourceAssetHash || null,
            edge.docVersion || 1,
            edge.pageNumber || null,
            edge.sectionTitle || null,
            edge.extractionMethod,
            edge.confidenceScore,
            edge.verificationStatus,
            edge.weight || 1.0,
            JSON.stringify(edge.properties || {}),
          ]
        );
        insertedEdges++;
      } catch (err: any) {
        console.warn('[Graph Extraction] Edge insert warning:', err?.message || err);
      }
    }

    return { insertedNodes, insertedEdges };
  }
}

export const graphExtractionService = new GraphExtractionService();
