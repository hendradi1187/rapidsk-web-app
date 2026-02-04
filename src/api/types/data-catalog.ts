import { PaginatedResponse } from "./common";

// ============ DATASET ============
// Based on UI data from Datasets.tsx

export type DatasetFormat = "WMS" | "WFS" | "WCS";
export type DatasetStatus = "published" | "draft";
export type DatasetDomain = "Lifting Data" | "Reservoir Data" | "Well Test" | "Exploration" | "Production Data" | string;
export type AccessLevel = "public" | "restricted" | "confidential";

export interface Dataset {
  id: number;
  name: string;
  provider: string;
  domain: DatasetDomain;
  format: DatasetFormat;
  endpoint: string;
  period: string;
  wells: number;
  status: DatasetStatus;
  lastUpdated: string;
  // Extended fields from API
  description?: string | null;
  version?: string;
  domain_id?: string;
  provider_id?: string;
  schema_id?: string;
  accessLevel?: AccessLevel;
  created_by?: string | null;
  created_at?: string;
  updated_at?: string;
}

export interface DatasetCreateRequest {
  name: string;
  provider: string;
  domain: DatasetDomain;
  format: DatasetFormat;
  endpoint: string;
  period: string;
  wells?: number;
  description?: string | null;
  accessLevel?: AccessLevel;
  // API specific
  provider_id?: string;
  schema_id?: string;
  version?: string;
}

export interface DatasetUpdateRequest {
  name?: string | null;
  description?: string | null;
  provider?: string | null;
  domain?: DatasetDomain | null;
  format?: DatasetFormat | null;
  endpoint?: string | null;
  period?: string | null;
  wells?: number | null;
  status?: DatasetStatus | null;
  accessLevel?: AccessLevel | null;
}

export type DatasetListResponse = PaginatedResponse<Dataset>;
export type DatasetResponse = Dataset;

// ============ VOCABULARY ============

export type VocabularyStatus = "DRAFT" | "PUBLISHED";

export interface VocabularyTerm {
  id: string;
  term: string;
  datatype: string;
  unit: string | null;
  description: string | null;
}

export interface Vocabulary {
  id: string;
  name: string;
  description: string | null;
  version: string;
  domain_id: string;
  status: VocabularyStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  terms: VocabularyTerm[];
}

export interface VocabularyWithoutTerms {
  id: string;
  name: string;
  description: string | null;
  version: string;
  domain_id: string;
  status: VocabularyStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface VocabularyTermRequest {
  term: string;
  datatype: string;
  unit?: string | null;
  description?: string | null;
}

export interface VocabularyCreateRequest {
  name: string;
  version: string;
  description?: string | null;
  terms: VocabularyTermRequest[];
}

export interface VocabularyUpdateRequest {
  name?: string | null;
  description?: string | null;
  version?: string | null;
  status?: VocabularyStatus | null;
}

export type VocabularyListResponse = PaginatedResponse<VocabularyWithoutTerms>;
export type VocabularyResponse = Vocabulary;

// ============ VOCABULARY TERM ============

export interface VocabularyTermCreateRequest {
  term: string;
  datatype: string;
  unit?: string | null;
  description?: string | null;
  vocabulary_id: string;
}

export interface VocabularyTermUpdateRequest {
  term?: string | null;
  datatype?: string | null;
  unit?: string | null;
  description?: string | null;
}

export interface VocabularyTermResponse {
  id: string;
  term: string;
  datatype: string;
  unit: string | null;
  description: string | null;
}

export type VocabularyTermListResponse = PaginatedResponse<VocabularyTermResponse>;

// ============ SCHEMA ============

export type SchemaStatus = "DRAFT" | "PUBLISHED" | "DEPRECATED";
export type MetadataSchemaCardinality = "SINGLE" | "MULTIPLE";

export interface MetadataSchemaRequest {
  vocabulary_term_id: string;
  required?: boolean;
  cardinality?: MetadataSchemaCardinality;
}

export interface MetadataSchema {
  id: string;
  domain_id: string;
  schema_id: string;
  vocabulary_term_id: string;
  required: boolean;
  cardinality: MetadataSchemaCardinality;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Schema {
  id: string;
  domain_id: string;
  vocabulary_id: string;
  vocabulary_name: string | null;
  vocabulary_description: string | null;
  version: string;
  status: SchemaStatus;
  created_at: string;
  updated_at: string;
}

export interface SchemaWithMetadata extends Schema {
  metadata_schemas: MetadataSchema[];
}

export interface SchemaCreateRequest {
  vocabulary_id: string;
  version: string;
  status?: SchemaStatus;
  metadata_schemas: MetadataSchemaRequest[];
}

export interface SchemaUpdateRequest {
  version?: string | null;
  status?: SchemaStatus | null;
}

export type SchemaListResponse = PaginatedResponse<Schema>;
export type SchemaResponse = SchemaWithMetadata;

// ============ METADATA SCHEMA ============

export interface MetadataSchemaCreateRequest {
  schema_id: string;
  vocabulary_term_id: string;
  required?: boolean;
  cardinality?: MetadataSchemaCardinality;
}

export interface MetadataSchemaUpdateRequest {
  schema_id?: string | null;
  vocabulary_term_id?: string | null;
  required?: boolean | null;
  cardinality?: MetadataSchemaCardinality | null;
}

export type MetadataSchemaListResponse = PaginatedResponse<MetadataSchema>;
export type MetadataSchemaResponse = MetadataSchema;

// ============ DATASET METADATA ============

export interface DatasetMetadata {
  id: string;
  domain_id: string;
  dataset_id: string;
  vocabulary_term_id: string;
  source: string;
  source_ref: string;
}

export interface DatasetMetadataRequest {
  vocabulary_term_id: string;
  source: string;
  source_ref: string;
}

export interface DatasetMetadataCreateRequest {
  dataset_id: string;
  vocabulary_term_id: string;
  source: string;
  source_ref: string;
}

export interface DatasetMetadataUpdateRequest {
  dataset_id?: string | null;
  vocabulary_term_id?: string | null;
  source?: string | null;
  source_ref?: string | null;
}

export type DatasetMetadataListResponse = PaginatedResponse<DatasetMetadata>;
export type DatasetMetadataResponse = DatasetMetadata;
