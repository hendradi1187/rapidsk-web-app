import { PaginatedResponse } from "./common";

// ============ DATASET ============

export type DatasetEndpointAccessType = "PUBLIC" | "PRIVATE";
export type DatasetEndpointProtocol = "REST_API" | "GRPC" | "ODATA" | "GRAPHQL";
export type DatasetStatus = "DRAFT" | "PUBLISHED";

export interface DatasetEndpointAuthStrategyConfig {
  [key: string]: unknown;
}

export interface DatasetEndpointAuthStrategy {
  type: string;
  config: DatasetEndpointAuthStrategyConfig;
}

export interface DatasetEndpoint {
  url: string;
  access_type: DatasetEndpointAccessType;
  auth_strategy: DatasetEndpointAuthStrategy | null;
  protocol: DatasetEndpointProtocol;
}

export interface DatasetEndpointMetadata {
  rate_limit: Record<string, unknown>;
  documentation_url: string;
  data_format: string;
  tags: string[];
  sla: string;
}

export interface Dataset {
  id: string;
  name: string;
  endpoint: DatasetEndpoint;
  endpoint_metadata: DatasetEndpointMetadata;
  description: string | null;
  version: string;
  domain_id: string;
  provider_id: string;
  schema_id: string;
  status: DatasetStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  metadata: DatasetMetadata[];
  // Legacy-friendly aliases kept optional for older presentational pages.
  provider?: string;
  format?: string;
}

export interface DatasetCreateRequest {
  name: string;
  provider_id: string;
  schema_id: string;
  endpoint: DatasetEndpoint;
  endpoint_metadata: DatasetEndpointMetadata;
  version: string;
  metadata: DatasetMetadataRequest[];
  description?: string | null;
}

export interface DatasetUpdateRequest {
  name?: string | null;
  description?: string | null;
  endpoint?: DatasetEndpoint | null;
  endpoint_metadata?: DatasetEndpointMetadata | null;
  version?: string | null;
  schema_id?: string | null;
  status?: DatasetStatus | null;
  metadata?: DatasetMetadataRequest[] | null;
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
