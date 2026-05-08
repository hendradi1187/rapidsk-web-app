// Based on rapiDSK Enterprise OpenAPI spec /schemas

export interface SchemaItem {
  schema_id: string;
  schema_name: string;
  version: string;
}

export type SchemaListResponse = SchemaItem[];
