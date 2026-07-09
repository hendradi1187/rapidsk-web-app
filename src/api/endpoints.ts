/**
 * endpoints.ts — Single source of truth untuk semua API endpoint path.
 *
 * CARA PAKAI:
 *   import { ENDPOINTS } from "@/api/endpoints";
 *   apiClient.get(ENDPOINTS.AUTH.IAM_EFFECTIVE_PERMS)
 *
 * CARA UPDATE kalau BE ganti path:
 *   Cukup edit file ini saja. Service files tidak perlu disentuh.
 *
 * STRUKTUR: dikelompokkan per logical service domain.
 * Dynamic segment (id, domainId) pakai arrow function helper.
 */

// ── Auth / Identity Provider ─────────────────────────────────────────────────
export const AUTH = {
  BASE: "/identity-provider",

  // Auth flows
  LOGIN:                    "/identity-provider/auth/login",
  EXTERNAL_LOGIN:           "/identity-provider/auth/external-login",
  VALIDATE:                 "/identity-provider/auth/validate",
  REFRESH_TOKEN:            "/identity-provider/auth/refresh-token",
  REVOKE_TOKEN:             "/identity-provider/auth/revoke-token",
  REVOKE_USER_TOKEN:        "/identity-provider/auth/revoke-user-token",
  SERVICE_TOKEN:            "/identity-provider/auth/service-token",

  // Users
  USERS:                    "/identity-provider/users/",
  USER_BY_ID:               (id: string) => `/identity-provider/users/${id}`,
  USER_CONFIRM_EMAIL:       "/identity-provider/users/confirm-email",
  USER_RESEND_CONFIRM:      "/identity-provider/users/resend-email-confirmation",

  // User meta
  USER_CATEGORIES:          "/identity-provider/user/categories/",
  USER_GROUPS:              "/identity-provider/user/groups/",

  // IAM
  IAM_EFFECTIVE_PERMS:      "/identity-provider/iam/me/effective-permissions",
  IAM_POLICY_BUNDLE:        "/identity-provider/iam/policy-bundle",
  IAM_APPLICATIONS:         "/identity-provider/iam/applications/",
  IAM_APPLICATION_BY_ID:    (id: string) => `/identity-provider/iam/applications/${id}`,
  IAM_API_RESOURCES:        "/identity-provider/iam/api-resources/",
  IAM_API_RESOURCE_BY_ID:   (id: string) => `/identity-provider/iam/api-resources/${id}`,
  IAM_PERMISSIONS:          "/identity-provider/iam/permissions/",
  IAM_PERMISSION_BY_ID:     (id: string) => `/identity-provider/iam/permissions/${id}`,
  IAM_ROLES:                "/identity-provider/iam/roles/",
  IAM_ROLE_BY_ID:           (id: string) => `/identity-provider/iam/roles/${id}`,
} as const;

/**
 * Endpoint yang jika mendapat 401 WAJIB force-logout user.
 * Hanya endpoint auth-infra (validate, refresh, revoke).
 */
export const AUTH_FORCE_LOGOUT_PATHS: readonly string[] = [
  AUTH.VALIDATE,
  AUTH.REFRESH_TOKEN,
  AUTH.REVOKE_TOKEN,
  AUTH.REVOKE_USER_TOKEN,
];

/**
 * Endpoint yang boleh mendapat 401 TANPA memaksa logout.
 * Background/optional calls — error cukup di-swallow atau di-log.
 */
export const AUTH_SILENT_401_PATHS: readonly string[] = [
  AUTH.IAM_EFFECTIVE_PERMS,
  AUTH.IAM_POLICY_BUNDLE,
];

// ── CTS / Governance ─────────────────────────────────────────────────────────
export const CTS = {
  // Organizations
  ORGANIZATIONS:               "/governance/organizations/",
  ORGANIZATION_BY_ID:          (id: string) => `/governance/organizations/${id}`,
  ORG_DOMAINS:                 (orgId: string) => `/governance/organizations/${orgId}/domains`,
  ORG_DOMAIN_BY_ID:            (orgId: string, id: string) => `/governance/organizations/${orgId}/domains/${id}`,
  ORG_POLICIES:                (orgId: string) => `/governance/organizations/${orgId}/policies`,
  ORG_POLICY_BY_ID:            (orgId: string, id: string) => `/governance/organizations/${orgId}/policies/${id}`,

  // Connection Pools
  CONNECTION_POOLS:            "/governance/connection-pools/",
  CONNECTION_POOL_BY_ID:       (id: string) => `/governance/connection-pools/${id}`,

  // Onboarding
  PARTICIPANTS:                "/onboarding/participants",
  PARTICIPANT_BY_ID:           (id: string) => `/onboarding/participants/${id}`,
  PARTICIPANT_DOMAINS:         (id: string) => `/onboarding/participants/${id}/domains`,
  PARTICIPANT_DOMAIN_BY_ID:    (pid: string, id: string) => `/onboarding/participants/${pid}/domains/${id}`,
  PARTICIPANT_ADAPTERS:        (id: string) => `/onboarding/participants/${id}/adapters`,
  PARTICIPANT_ADAPTER_BY_ID:   (pid: string, id: string) => `/onboarding/participants/${pid}/adapters/${id}`,
  REGISTRATIONS:               "/onboarding/registrations",
  REGISTRATION_BY_ID:          (id: string) => `/onboarding/registrations/${id}`,

  // Monitorings (domain-scoped)
  MONITORINGS:                 (domainId: string) => `/onboarding/${domainId}/monitorings`,
  MONITORING_BY_ID:            (domainId: string, id: string) => `/onboarding/${domainId}/monitorings/${id}`,

  // Policy & Contract
  CONTRACTS:                   (domainId: string) => `/policy-contract/${domainId}/contracts`,
  CONTRACT_BY_ID:              (domainId: string, id: string) => `/policy-contract/${domainId}/contracts/${id}`,
  AGREEMENTS:                  (domainId: string) => `/policy-contract/${domainId}/agreements`,
  AGREEMENT_BY_ID:             (domainId: string, id: string) => `/policy-contract/${domainId}/agreements/${id}`,
  CONTRACT_POLICIES:           (domainId: string) => `/policy-contract/${domainId}/contract-policies`,
  CONTRACT_POLICY_BY_ID:       (domainId: string, id: string) => `/policy-contract/${domainId}/contract-policies/${id}`,
  APPLY_JUKNIS:                (domainId: string) => `/policy-contract/${domainId}/apply-juknis`,

  // Data Catalog
  DATASETS:                    (domainId: string) => `/data-catalog/${domainId}/datasets`,
  DATASET_BY_ID:               (domainId: string, id: string) => `/data-catalog/${domainId}/datasets/${id}`,
  VOCABULARIES:                (domainId: string) => `/data-catalog/${domainId}/vocabularies`,
  VOCABULARY_BY_ID:            (domainId: string, id: string) => `/data-catalog/${domainId}/vocabularies/${id}`,
  VOCABULARY_TERMS_BY_VOC:     (domainId: string, vocId: string) => `/data-catalog/${domainId}/vocabularies/${vocId}/terms`,
  VOCABULARY_TERMS:            (domainId: string) => `/data-catalog/${domainId}/vocabulary-terms`,
  VOCABULARY_TERM_BY_ID:       (domainId: string, id: string) => `/data-catalog/${domainId}/vocabulary-terms/${id}`,
  METADATA_SCHEMAS:            (domainId: string) => `/data-catalog/${domainId}/metadata-schemas`,
  METADATA_SCHEMA_BY_ID:       (domainId: string, id: string) => `/data-catalog/${domainId}/metadata-schemas/${id}`,
  DATASET_METADATAS:           (domainId: string) => `/data-catalog/${domainId}/dataset-metadatas`,
  DATASET_METADATA_BY_ID:      (domainId: string, id: string) => `/data-catalog/${domainId}/dataset-metadatas/${id}`,
  SCHEMAS:                     (domainId: string) => `/data-catalog/${domainId}/schemas`,
  SCHEMA_BY_ID:                (domainId: string, id: string) => `/data-catalog/${domainId}/schemas/${id}`,

  // Extended Catalog / Transfer
  DATASET_RUNTIME_PREVIEW:     (domainId: string, id: string) => `/data-catalog/${domainId}/datasets/${id}/runtime-metadata/preview`,
  CONN_POOL_BY_DOMAIN_AGREEMENT: (domainId: string, agreementId: string, type: string) => `/onboarding/${domainId}/agreements/${agreementId}/connection-pools/${type}`,
  REFERENCE_TRANSFER_SNAPSHOT: (domainId: string, agreementId: string, datasetId: string) => `/cts/reference/domains/${domainId}/agreements/${agreementId}/datasets/${datasetId}/transfer-snapshot`,

  // Audit & Compliance
  AUDIT_LOGS:                  "/audit-compliance/audit-logs",
  COMPLIANCE_CONTROLS:         "/audit-compliance/compliance-controls",
  COMPLIANCE_CONTROL_BY_ID:    (id: string) => `/audit-compliance/compliance-controls/${id}`,
  COMPLIANCE_CHECKLISTS:       "/audit-compliance/compliance-checklists",
  COMPLIANCE_CHECKLIST_BY_ID:  (id: string) => `/audit-compliance/compliance-checklists/${id}`,
} as const;

// ── Connector ─────────────────────────────────────────────────────────────────
export const CONNECTOR = {
  TRANSFERS:                   (domainId: string) => `/connector/${domainId}/transfers`,
  TRANSFER_BY_ID:              (domainId: string, id: string) => `/connector/${domainId}/transfers/${id}`,
  TRANSFER_STATUS:             (id: string) => `/connector/${id}/status`,
  HEARTBEAT_SEND:              "/connector/runtime/heartbeat/send",
  TRANSFER_EVENTS_PUBLISH:     "/connector/runtime/transfer-events/publish",
  TRANSFER_EVENT_BY_ID:        (transferId: string) => `/cts/monitoring/transfer-events/${transferId}`,
  HEARTBEATS:                  "/cts/monitoring/connector-heartbeats",
  TRANSFER_PROJECTIONS:        "/cts/monitoring/transfer-projections",
} as const;

// ── Adapter ───────────────────────────────────────────────────────────────────
export const ADAPTER = {
  // Adapter Service (proxy via nginx — ADAPTER_PROXY_BASE prefix handled in adapter-service.ts)
  REMOTE_CONNECTIONS:          "/remote-sources/connections/",
  REMOTE_CONNECTION_BY_ID:     (id: string) => `/remote-sources/connections/${encodeURIComponent(id)}`,
  REMOTE_LAYERS:               (provider: string, connId: string) => `/remote-sources/${provider}/${encodeURIComponent(connId)}/layers`,
  GEOSERVER_DESCRIBE:          (connId: string) => `/remote-sources/geoserver/${encodeURIComponent(connId)}/describe`,
  GEOSERVER_PREVIEW:           (connId: string) => `/remote-sources/geoserver/${encodeURIComponent(connId)}/preview`,
  ARCGIS_DESCRIBE:             (connId: string) => `/remote-sources/arcgis/${encodeURIComponent(connId)}/describe`,
  ARCGIS_PREVIEW:              (connId: string) => `/remote-sources/arcgis/${encodeURIComponent(connId)}/preview`,
  ARCGIS_PREVIEW_GEOJSON:      (connId: string) => `/remote-sources/arcgis/${encodeURIComponent(connId)}/preview-geojson`,
  INGEST_GEOJSON:              "/data-ingestion/geojson",
  INGEST_SHAPEFILE:            "/data-ingestion/shapefile",
  INGEST_GEOSERVER:            "/data-ingestion/geoserver",
  INGEST_ARCGIS:               "/data-ingestion/arcgis",
  INGEST_TASKS:                "/data-ingestion/",
  INGEST_TASK_BY_ID:           (id: string) => `/data-ingestion/${encodeURIComponent(id)}`,
  OGC_COLLECTIONS:             "/ogc/collections",
  OGC_ITEMS:                   (domainCode: string) => `/ogc/collections/${encodeURIComponent(domainCode)}/items`,
  OGC_METADATA:                '/ogc/ogc/metadata',
  OGC_METADATA_BY_DOMAIN:      (domain: string) => `/ogc/ogc/metadata/${encodeURIComponent(domain)}`,
  OGC_PROVIDERS:               '/ogc/ogc/providers',

  // Adapter Runtime (routed via adapterClient)
  RUNTIME_HEALTH:              "/adapter-runtime/health",
  RUNTIME_COLLECTIONS:         "/adapter-runtime/v1/ogc/collections",
  RUNTIME_PROVIDERS:           "/adapter-runtime/v1/ogc/providers",
  RUNTIME_METADATA:            "/adapter-runtime/v1/metadata",
  RUNTIME_METADATA_DOMAIN:     (domain: string) => `/adapter-runtime/v1/metadata/${encodeURIComponent(domain)}`,
  RUNTIME_INGEST:              (domain: string) => `/adapter-runtime/v1/ingest/${encodeURIComponent(domain)}`,
  RUNTIME_INGEST_SHP:          (domain: string) => `/adapter-runtime/v1/ingest/${encodeURIComponent(domain)}/shapefile`,
  RUNTIME_PUBLISH:             (domain: string) => `/adapter-runtime/v1/publish/${encodeURIComponent(domain)}`,
} as const;

// ── Runtime / Setup (BFF — served by Vite proxy / nginx) ────────────────────
export const RUNTIME = {
  SETUP_LICENSE_VALIDATE:      "/setup/license/validate",
  SETUP_VALIDATE:              "/setup/validate",
  SETUP_INIT:                  "/setup/init",
  ADMIN_RUNTIME_CONFIG:        "/admin/runtime-config",
  ADMIN_LICENSE_STATUS:        "/admin/license-status",
  ADMIN_LICENSE_REVALIDATE:    "/admin/license/revalidate",
  ADMIN_PUBLIC_ORGS_REFRESH:   "/admin/public-organizations/refresh",
  ADMIN_PUBLIC_ORGS_CACHE:     "/admin/public-organizations/cache",
} as const;

// ── Convenience re-export ────────────────────────────────────────────────────
export const ENDPOINTS = { AUTH, CTS, CONNECTOR, ADAPTER, RUNTIME } as const;
