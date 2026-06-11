// GX-Space data-catalog schemas

export interface SchemaItem {
  schema_id: string;
  vocabulary_id?: string;
  vocabulary_name?: string | null;
  version: string;
  status?: string;
}

export interface SchemaFieldSelection {
  vocabulary_term_id: string;
  required?: boolean;
  cardinality?: "SINGLE" | "MULTIPLE";
}

export interface SchemaCreateRequest {
  vocabulary_id: string;
  version: string;
  status?: "DRAFT" | "PUBLISHED" | "DEPRECATED";
  metadata_schemas: SchemaFieldSelection[];
}

export interface SchemaUpdateRequest {
  version?: string;
  status?: "DRAFT" | "PUBLISHED" | "DEPRECATED";
}

export type SchemaListResponse = SchemaItem[];
