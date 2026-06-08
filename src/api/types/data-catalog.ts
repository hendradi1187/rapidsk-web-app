// ============ DATASET ============
// Based on rapiDSK Enterprise OpenAPI spec /datasets

/**
 * Dataset (catalog entry).
 *
 * Field semuanya free string per spec — backend mungkin standardize:
 *   - `classification`: public | internal | restricted (Q-B)
 *   - `status`: active | draft | archived (Q-C)
 *   - `schema_name`: link ke /schemas (Phase 5)
 *   - `provider_name`: human-readable; provider_id digunakan saat create
 */
export interface Dataset {
  dataset_id: string;
  dataset_name: string;
  schema_name: string;
  provider_name: string;
  classification: string;
  status: string;
  // ── tambahan dari GX-Space (untuk agregasi dashboard) ──
  domain?: string;          // key domain geospasial (dari endpoint_metadata.tags[0])
  access_type?: string;     // PUBLIC | PRIVATE (endpoint.access_type)
  protocol?: string;        // OGC_API_FEATURES | … (endpoint.protocol)
  level?: string;           // L0–L4 (di-parse dari description "klasifikasi Lx")
  provider_id?: string;     // FK participant (untuk resolve nama via /onboarding/participants)
  endpoint_url?: string;
  version?: string;
}

/**
 * `POST /datasets` body. provider_id (UUID) is the canonical reference;
 * `provider_name` kembali di response untuk display.
 */
export interface DatasetCreateRequest {
  dataset_name: string;       // required
  schema_name: string;        // required
  provider_id?: string;       // optional per spec, tapi practical-nya mostly required
}

/**
 * `GET /datasets` returns plain `Dataset[]` (no pagination wrapper).
 */
export type DatasetListResponse = Dataset[];
