// Based on rapiDSK Enterprise OpenAPI spec /vocabularies

export interface Vocabulary {
  vocabulary_id: string;
  vocabulary_term: string;
  canonical_name: string;
}

export type VocabularyListResponse = Vocabulary[];
