// Based on rapiDSK Enterprise OpenAPI spec /mapping/auto

export interface MappingRequest {
  source_fields: string[];
}

export interface MappingResultEntry {
  source_field: string;
  canonical_field: string;
  /**
   * Confidence score. Spec says `float` — frontend asumsikan range 0.0-1.0.
   * Lihat Q-G di plan doc kalau ternyata 0-100.
   */
  confidence: number;
}

export interface MappingResult {
  mappings: MappingResultEntry[];
}
