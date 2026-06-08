// GX-Space data-catalog vocabularies

export interface Vocabulary {
  vocabulary_id: string;
  name: string;
  description?: string;
  version?: string;
  status?: string;
}

export interface VocabularyTerm {
  id: string;
  term: string;
  datatype?: string;
  unit?: string | null;
  description?: string | null;
}

export type VocabularyListResponse = Vocabulary[];
