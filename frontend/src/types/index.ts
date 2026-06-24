export interface ParsedReport {
  forensicAnalystName: string;
  organizationName: string;
  malwareName: string;
  malwareDescription: string;
  threatClassification: string;
  sampleHash: string;
  pdfContent: string;
  city?: string;
  location?: { lat: number; lon: number };
  objectKey?: string;
}

export interface SearchHit {
  id: string;
  score: number | null;
  source: Omit<ParsedReport, 'objectKey'> & {
    minio_object_key: string;
    indexed_at: string;
  };
  highlights?: Record<string, string[]>;
}

export interface SearchResult {
  total: number;
  hits: SearchHit[];
}

export interface BasicSearchParams {
  analyst?: string;
  hash?: string;
  classification?: string;
  organization?: string;
  malware?: string;
  page?: number;
  size?: number;
}

export interface BooleanSearchParams {
  query: string;
  page?: number;
  size?: number;
}

export interface User {
  id: string;
  email: string;
}
