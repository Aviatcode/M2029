export type GraphNodeType =
  | 'subject'
  | 'course'
  | 'unit'
  | 'topic'
  | 'subtopic'
  | 'concept'
  | 'definition'
  | 'formula'
  | 'example'
  | 'learning_objective'
  | 'document'
  | 'document_section'
  | 'question'
  | 'prerequisite';

export type GraphRelationshipType =
  | 'BELONGS_TO'
  | 'CONTAINS'
  | 'HAS_SUBTOPIC'
  | 'EXPLAINS'
  | 'DEFINED_IN'
  | 'EXAMPLE_OF'
  | 'REQUIRES'
  | 'PREREQUISITE_OF'
  | 'RELATED_TO'
  | 'CONTRASTS_WITH'
  | 'APPLIED_IN'
  | 'FOLLOWS';

export type GraphExtractionMethod =
  | 'syllabus_structure'
  | 'document_ingestion'
  | 'curriculum_curated'
  | 'student_correction'
  | 'ai_extracted';

export type GraphVerificationStatus = 'verified' | 'unverified' | 'proposed';

export interface GraphNode {
  id: string;
  classId: string;
  subjectId?: string;
  subjectName: string;
  name: string;
  canonicalName: string;
  nodeType: GraphNodeType;
  summary: string;
  unitNumber?: number;
  sourceDocId?: string;
  sourceAssetHash?: string;
  docVersion?: number;
  pageNumber?: number;
  sectionTitle?: string;
  extractionMethod: GraphExtractionMethod;
  confidenceScore: number;
  verificationStatus: GraphVerificationStatus;
  keywords: string[];
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface GraphEdge {
  id: string;
  classId: string;
  subjectId?: string;
  sourceNodeId: string;
  targetNodeId: string;
  relationshipType: GraphRelationshipType;
  label: string;
  description?: string;
  sourceDocId?: string;
  sourceAssetHash?: string;
  docVersion?: number;
  pageNumber?: number;
  sectionTitle?: string;
  extractionMethod: GraphExtractionMethod;
  confidenceScore: number;
  verificationStatus: GraphVerificationStatus;
  weight?: number;
  properties?: Record<string, any>;
  createdAt?: string;
  updatedAt?: string;
}

export interface PrerequisiteStep {
  nodeId: string;
  name: string;
  nodeType: GraphNodeType;
  unitNumber?: number;
  subjectName: string;
  summary: string;
  verificationStatus: GraphVerificationStatus;
  confidenceScore: number;
  sourceDocTitle?: string;
  pageNumber?: number;
  sectionTitle?: string;
  rationale?: string;
}

export interface PrerequisiteChainResult {
  targetNode: GraphNode | null;
  prerequisites: PrerequisiteStep[];
  hasCycle: boolean;
  cycleNodes?: string[];
  missingPrerequisites: string[];
  pathString: string;
  isFullyVerified: boolean;
}

export interface GraphQueryResult {
  matchedNodes: GraphNode[];
  connectedNodes: GraphNode[];
  connectingEdges: GraphEdge[];
  graphContextText: string;
  retrievalSummary: string;
  hasPrerequisites: boolean;
  prerequisiteChain?: PrerequisiteChainResult;
}

export interface GraphProposedChange {
  id: string;
  classId: string;
  proposedBy: string;
  changeType: 'add_node' | 'update_node' | 'add_edge' | 'update_edge' | 'remove_edge';
  targetId?: string;
  proposedData: any;
  reason: string;
  status: 'pending' | 'approved' | 'rejected';
  reviewedBy?: string;
  reviewNotes?: string;
  createdAt: string;
  resolvedAt?: string;
}

export const CS_SYNONYM_DICTIONARY: Record<string, string> = {
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

export function normalizeConceptCanonicalName(rawName: string = ''): string {
  if (!rawName) return '';
  const cleaned = rawName
    .trim()
    .toLowerCase()
    .replace(/[^\w\s-]/g, '')
    .replace(/\s+/g, ' ');

  return CS_SYNONYM_DICTIONARY[cleaned] || cleaned;
}
