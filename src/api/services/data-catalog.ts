import { apiClient } from "../client";
import {
  PaginationParams,
  Vocabulary,
  VocabularyCreateRequest,
  VocabularyUpdateRequest,
  VocabularyListResponse,
  VocabularyTermResponse,
  VocabularyTermCreateRequest,
  VocabularyTermUpdateRequest,
  VocabularyTermListResponse,
  Schema,
  SchemaWithMetadata,
  SchemaCreateRequest,
  SchemaUpdateRequest,
  SchemaListResponse,
  MetadataSchema,
  MetadataSchemaCreateRequest,
  MetadataSchemaUpdateRequest,
  MetadataSchemaListResponse,
  Dataset,
  DatasetCreateRequest,
  DatasetUpdateRequest,
  DatasetListResponse,
  DatasetMetadata,
  DatasetMetadataCreateRequest,
  DatasetMetadataUpdateRequest,
  DatasetMetadataListResponse,
} from "../types";

const BASE_PATH = "/api/v1/data-catalog";

// ============ VOCABULARIES ============

export const vocabulariesApi = {
  /**
   * List vocabularies for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<VocabularyListResponse> => {
    const response = await apiClient.get<VocabularyListResponse>(
      `${BASE_PATH}/${domainId}/vocabularies`,
      { params }
    );
    return response.data;
  },

  /**
   * Get vocabulary by ID
   */
  getById: async (domainId: string, id: string): Promise<Vocabulary> => {
    const response = await apiClient.get<Vocabulary>(
      `${BASE_PATH}/${domainId}/vocabularies/${id}`
    );
    return response.data;
  },

  /**
   * Create a new vocabulary
   */
  create: async (domainId: string, data: VocabularyCreateRequest): Promise<Vocabulary> => {
    const response = await apiClient.post<Vocabulary>(
      `${BASE_PATH}/${domainId}/vocabularies`,
      data
    );
    return response.data;
  },

  /**
   * Update a vocabulary
   */
  update: async (domainId: string, id: string, data: VocabularyUpdateRequest): Promise<Vocabulary> => {
    const response = await apiClient.patch<Vocabulary>(
      `${BASE_PATH}/${domainId}/vocabularies/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a vocabulary
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/vocabularies/${id}`);
  },
};

// ============ VOCABULARY TERMS ============

export const vocabularyTermsApi = {
  /**
   * List vocabulary terms for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<VocabularyTermListResponse> => {
    const response = await apiClient.get<VocabularyTermListResponse>(
      `${BASE_PATH}/${domainId}/vocabulary-terms`,
      { params }
    );
    return response.data;
  },

  /**
   * Get terms by vocabulary ID
   */
  getByVocabularyId: async (
    domainId: string,
    vocabularyId: string
  ): Promise<VocabularyTermResponse[]> => {
    const response = await apiClient.get<VocabularyTermResponse[]>(
      `${BASE_PATH}/${domainId}/vocabularies/${vocabularyId}/terms`
    );
    return response.data;
  },

  /**
   * Get vocabulary term by ID
   */
  getById: async (domainId: string, id: string): Promise<VocabularyTermResponse> => {
    const response = await apiClient.get<VocabularyTermResponse>(
      `${BASE_PATH}/${domainId}/vocabulary-terms/${id}`
    );
    return response.data;
  },

  /**
   * Create a new vocabulary term
   */
  create: async (domainId: string, data: VocabularyTermCreateRequest): Promise<VocabularyTermResponse> => {
    const response = await apiClient.post<VocabularyTermResponse>(
      `${BASE_PATH}/${domainId}/vocabulary-terms`,
      data
    );
    return response.data;
  },

  /**
   * Update a vocabulary term
   */
  update: async (
    domainId: string,
    id: string,
    data: VocabularyTermUpdateRequest
  ): Promise<VocabularyTermResponse> => {
    const response = await apiClient.patch<VocabularyTermResponse>(
      `${BASE_PATH}/${domainId}/vocabulary-terms/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a vocabulary term
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/vocabulary-terms/${id}`);
  },
};

// ============ SCHEMAS ============

export const schemasApi = {
  /**
   * List schemas for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<SchemaListResponse> => {
    const response = await apiClient.get<SchemaListResponse>(
      `${BASE_PATH}/${domainId}/schemas`,
      { params }
    );
    return response.data;
  },

  /**
   * Get schema by ID
   */
  getById: async (domainId: string, id: string): Promise<SchemaWithMetadata> => {
    const response = await apiClient.get<SchemaWithMetadata>(
      `${BASE_PATH}/${domainId}/schemas/${id}`
    );
    return response.data;
  },

  /**
   * Create a new schema
   */
  create: async (domainId: string, data: SchemaCreateRequest): Promise<SchemaWithMetadata> => {
    const response = await apiClient.post<SchemaWithMetadata>(
      `${BASE_PATH}/${domainId}/schemas`,
      data
    );
    return response.data;
  },

  /**
   * Update a schema
   */
  update: async (domainId: string, id: string, data: SchemaUpdateRequest): Promise<Schema> => {
    const response = await apiClient.patch<Schema>(
      `${BASE_PATH}/${domainId}/schemas/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a schema
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/schemas/${id}`);
  },
};

// ============ METADATA SCHEMAS ============

export const metadataSchemasApi = {
  /**
   * List metadata schemas for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<MetadataSchemaListResponse> => {
    const response = await apiClient.get<MetadataSchemaListResponse>(
      `${BASE_PATH}/${domainId}/metadata-schemas`,
      { params }
    );
    return response.data;
  },

  /**
   * Get metadata schema by ID
   */
  getById: async (domainId: string, id: string): Promise<MetadataSchema> => {
    const response = await apiClient.get<MetadataSchema>(
      `${BASE_PATH}/${domainId}/metadata-schemas/${id}`
    );
    return response.data;
  },

  /**
   * Create a new metadata schema
   */
  create: async (domainId: string, data: MetadataSchemaCreateRequest): Promise<MetadataSchema> => {
    const response = await apiClient.post<MetadataSchema>(
      `${BASE_PATH}/${domainId}/metadata-schemas`,
      data
    );
    return response.data;
  },

  /**
   * Update a metadata schema
   */
  update: async (
    domainId: string,
    id: string,
    data: MetadataSchemaUpdateRequest
  ): Promise<MetadataSchema> => {
    const response = await apiClient.patch<MetadataSchema>(
      `${BASE_PATH}/${domainId}/metadata-schemas/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a metadata schema
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/metadata-schemas/${id}`);
  },
};

// ============ DATASETS ============

export const datasetsApi = {
  /**
   * List datasets for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<DatasetListResponse> => {
    const response = await apiClient.get<DatasetListResponse>(
      `${BASE_PATH}/${domainId}/datasets`,
      { params }
    );
    return response.data;
  },

  /**
   * Get dataset by ID
   */
  getById: async (domainId: string, id: string): Promise<Dataset> => {
    const response = await apiClient.get<Dataset>(
      `${BASE_PATH}/${domainId}/datasets/${id}`
    );
    return response.data;
  },

  /**
   * Create a new dataset
   */
  create: async (domainId: string, data: DatasetCreateRequest): Promise<Dataset> => {
    const response = await apiClient.post<Dataset>(
      `${BASE_PATH}/${domainId}/datasets`,
      data
    );
    return response.data;
  },

  /**
   * Update a dataset
   */
  update: async (domainId: string, id: string, data: DatasetUpdateRequest): Promise<Dataset> => {
    const response = await apiClient.patch<Dataset>(
      `${BASE_PATH}/${domainId}/datasets/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a dataset
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/datasets/${id}`);
  },
};

// ============ DATASET METADATA ============

export const datasetMetadataApi = {
  /**
   * List dataset metadata for a domain
   */
  list: async (domainId: string, params?: PaginationParams): Promise<DatasetMetadataListResponse> => {
    const response = await apiClient.get<DatasetMetadataListResponse>(
      `${BASE_PATH}/${domainId}/dataset-metadata`,
      { params }
    );
    return response.data;
  },

  /**
   * Get dataset metadata by ID
   */
  getById: async (domainId: string, id: string): Promise<DatasetMetadata> => {
    const response = await apiClient.get<DatasetMetadata>(
      `${BASE_PATH}/${domainId}/dataset-metadata/${id}`
    );
    return response.data;
  },

  /**
   * Create dataset metadata
   */
  create: async (domainId: string, data: DatasetMetadataCreateRequest): Promise<DatasetMetadata> => {
    const response = await apiClient.post<DatasetMetadata>(
      `${BASE_PATH}/${domainId}/dataset-metadata`,
      data
    );
    return response.data;
  },

  /**
   * Update dataset metadata
   */
  update: async (
    domainId: string,
    id: string,
    data: DatasetMetadataUpdateRequest
  ): Promise<DatasetMetadata> => {
    const response = await apiClient.patch<DatasetMetadata>(
      `${BASE_PATH}/${domainId}/dataset-metadata/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete dataset metadata
   */
  delete: async (domainId: string, id: string): Promise<void> => {
    await apiClient.delete(`${BASE_PATH}/${domainId}/dataset-metadata/${id}`);
  },
};
