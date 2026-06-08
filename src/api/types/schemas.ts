// GX-Space data-catalog schemas

export interface SchemaItem {
  schema_id: string;
  vocabulary_id?: string;
  vocabulary_name?: string | null;
  version: string;
  status?: string;
}

export type SchemaListResponse = SchemaItem[];
