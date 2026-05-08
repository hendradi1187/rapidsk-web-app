# [ARCHIVED] SPEKTRUM Coexistence Plan

> ## ⚠️ DOCUMENT ARCHIVED — 2026-05-08
>
> Plan ini **SUPERSEDED** oleh [`rapiDSK_Enterprise_Frontend_Plan.md`](./rapiDSK_Enterprise_Frontend_Plan.md).
>
> **Reason:** User decision (2026-05-08) — drop SPEKTRUM coexistence, pivot ke single-backend
> **rapiDSK Enterprise** (`docs/rapidsk_full_openapi_enterprise_spec.md`). User menyatakan
> coexistence analysis awal adalah kesalahan analisa.
>
> Bagian dokumen yang **tetap valid** (di-reuse di plan baru):
> - Section IAM-3 (canonical RBAC owned by SPEKTRUM)
> - IAM-1 sampai IAM-5 (Keycloak setup details)
> - IAM-6 (role mapping matrix — masih dipakai)
> - Phase 1A/1B implementation (Keycloak SSO + canonical 7-role di rbac.ts) — sudah dikerjakan
>
> Bagian yang **OBSOLETE**:
> - Section 1-7 strategi coexistence (dual API client, 2 backend)
> - Phase 2-6 SPEKTRUM-specific resources (access-requests, consents, GIS Federation, dll)
> - SPEKTRUM `fastapi.yaml` v2.1.0 sebagai source of truth
>
> Dokumen ini di-keep untuk **historical context** dan reuse pertimbangan arsitektural
> (mis. canonical RBAC, Keycloak setup). Untuk plan aktif, lihat link di atas.

---

# SPEKTRUM Coexistence Plan (Implementation-Grade)

> **Mode:** COEXISTENCE — SPEKTRUM jalan **paralel** dengan rapiDSK, sharing JWT via federated IAM
> **Sumber spek:** [`docs/fastapi.yaml`](./fastapi.yaml) (v2.1.0 + supplemental endpoints LB3-LB6)
> **Status:** 🔴 **ARCHIVED** (sebelumnya: ✅ All architectural decisions LOCKED — siap eksekusi)
> **Estimasi:** ~12-14 hari kerja (termasuk IAM integration)
> **Tanggal revisi:** 2026-05-07 (v5 — IAM-6 lock + role mapping matrix)
> **Companion doc:** [`docs/IAM_ROLE_MAPPING_MATRIX.md`](./IAM_ROLE_MAPPING_MATRIX.md) (template — perlu diisi backend/DBA team)

---

## 0. Architectural Decisions (LOCKED)

14 keputusan final. Tidak boleh diubah tanpa diskusi ulang.

### Top-level decisions

| # | Topik | Keputusan |
|---|---|---|
| **A1** | Mode integrasi | **COEXISTENCE** — rapiDSK + SPEKTRUM paralel |
| **A2** | Consent workflow | Auto-created backend setelah `approve` |
| **A3** | Pagination naming | `page` + `page_size` (mengikuti SPEKTRUM) |
| **A4** | Multi-role evaluation | Union — privilege gabungan dari `roles[]` |
| **A5** | Permissions usage | Hybrid — navigasi by role, action by `permissions[]` |

### Backend contract decisions

| # | Topik | Keputusan |
|---|---|---|
| **LB1** | Credentials | **SAME** — satu user untuk dua backend |
| **LB2** | Auth strategy | **SSO via Centralized IAM (Keycloak/OIDC)** — single JWT, trusted oleh kedua backend |
| **LB3** | `GET /access-requests` scope | Auto-detect by role + optional `?scope=mine\|organization\|all` |
| **LB4** | `GET /datasets/{id}/permissions` | **Paginated** — pakai standard pagination contract |
| **LB5** | `GET /audit-logs` filters | **Mandatory**: `action`, `participant_id`, `dataset_id`, `start_date`, `end_date`, `page`, `page_size` |
| **LB6** | `POST /consents/{id}/revoke` | **Wajib** — backend juga revoke permissions + write audit log |
| **LB7** | `service_type` | Enum `[arcgis, postgis, geoserver, api, custom_connector]` + optional `custom_service_type` field |
| **LB8** | GIS button gating | **AND**: dataset capability **DAN** user permission |

### IAM / RBAC decisions

| # | Topik | Keputusan |
|---|---|---|
| **IAM-3** | Role schema | **CANONICAL ROLE MODEL owned by SPEKTRUM**. Backend/IAM layer melakukan rapiDSK→canonical mapping **sebelum** JWT di-return. Frontend HANYA mengenal canonical roles, **tidak** branch logic per backend. |

#### Canonical role list (single source of truth untuk frontend)

```
SUPER_ADMIN, ADMIN, VIEWER, AUDITOR, GIS_ANALYST, PROVIDER, CONSUMER
```

**Frontend MUST NOT:**
- ❌ detect legacy role names (`ORG_ADMIN`, `DATA_PROVIDER`, `READONLY`, dll)
- ❌ branch logic per backend
- ❌ punya dual RBAC engine
- ❌ punya `spektrum-rbac.ts` terpisah dari `rbac.ts`

**Frontend MUST:**
- ✅ Pakai SATU `config/rbac.ts` dengan 7 canonical role
- ✅ SATU sidebar generator (legacy + SPEKTRUM menus, gated by canonical role)
- ✅ SATU `RoleGuard` component
- ✅ Trust JWT yang sudah di-normalize oleh IAM layer

---

## 1. Implikasi Coexistence + SSO

### Yang dilakukan

- ✅ Semua legacy modules (Organizations, Domains, Contracts, dll) **TETAP AKTIF**
- ✅ Modul SPEKTRUM ditambah **paralel** di namespace `/spektrum/*`
- ✅ **Satu login** via IAM (Keycloak) → satu JWT untuk dua backend
- ✅ Dua API client (`apiClient` rapiDSK + `spektrumClient` SPEKTRUM) — **share JWT yang sama**
- ✅ Sidebar dipisah jadi 2 section: **Legacy (rapiDSK)** dan **SPEKTRUM**

### Yang TIDAK dilakukan

- ❌ Hapus halaman/service legacy
- ❌ Dual-login (sudah obsolete sejak LB2)
- ❌ Dua token store terpisah (sudah obsolete sejak LB2)
- ❌ Big-bang replacement

### Struktur folder rekomendasi

```
src/
├── api/
│   ├── client.ts                        # rapiDSK (existing) — JWT dari IAM
│   ├── services/                        # rapiDSK services (existing, no change)
│   ├── hooks/                           # rapiDSK hooks (existing, no change)
│   ├── types/                           # rapiDSK types (existing, no change)
│   └── spektrum/                        # 🆕 namespace baru
│       ├── client.ts                    # SPEKTRUM axios — JWT dari IAM (same)
│       ├── services/{auth,participants,datasets,access-requests,consents,gis,audit}.ts
│       ├── hooks/{useSpektrum*,useAccessRequests,useConsents,useGisQuery,useAuditLogs}.ts
│       └── types/{common,auth,participants,datasets,access-requests,consents,gis,audit}.ts
├── auth/                                # 🆕 IAM/Keycloak integration
│   ├── keycloak.ts                      # Keycloak instance + init
│   ├── KeycloakProvider.tsx             # React context wrapper
│   ├── useAuth.ts                       # unified auth hook (replaces dual-context)
│   └── tokenManager.ts                  # token refresh + interceptor injection
├── pages/
│   ├── (existing pages)
│   └── spektrum/
│       ├── SpektrumDashboard.tsx
│       ├── SpektrumParticipants.tsx
│       ├── SpektrumDatasets.tsx
│       ├── DatasetDetail.tsx
│       ├── AccessRequests.tsx           # 3 tabs: Mine / Organization / Global
│       ├── Consents.tsx                 # + Revoke action
│       ├── GISExplorer.tsx              # capability+permission gating
│       └── SpektrumAudit.tsx            # filters: action/participant/dataset/date
├── context/
│   └── AuthContext.tsx                  # rewrite — wrap Keycloak (no more dual)
├── config/
│   └── rbac.ts                          # 🔄 EXTENDED ke 7 canonical role
│                                        #    (legacy + SPEKTRUM menus all gated by canonical roles)
│                                        #    NO spektrum-rbac.ts (IAM-3)
└── components/
    ├── auth/
    │   ├── ProtectedRoute.tsx           # update — pakai Keycloak.authenticated
    │   └── RoleGuard.tsx                # update — multi-role union (canonical only)
    ├── layout/
    │   └── Sidebar.tsx                  # update — section-based (Legacy + SPEKTRUM)
    └── spektrum/
        ├── gis/{MapCanvas,BBoxPicker,GeoJsonLayer}.tsx
        └── access-requests/{RequestRow,ApproveDialog,RejectDialog}.tsx
```

> **Catatan IAM-3**: tidak ada `config/spektrum-rbac.ts`. Single `config/rbac.ts` jadi source of truth untuk SEMUA navigation/feature gating, baik legacy maupun SPEKTRUM.

---

## 2. Endpoint SPEKTRUM (Final Contract)

### Dari `fastapi.yaml` v2.1.0 (16 endpoint)

| # | Method | Path | Tag |
|---|---|---|---|
| 1 | POST | `/auth/login` | Authentication (mungkin tidak dipakai langsung — pakai IAM) |
| 2 | POST | `/auth/refresh` | (handled by Keycloak) |
| 3 | GET | `/participants` | Participants |
| 4 | POST | `/participants` | Participants |
| 5 | GET | `/participants/{id}` | Participants |
| 6 | POST | `/participants/{id}/activate` | Administration |
| 7 | GET | `/datasets` | Datasets |
| 8 | POST | `/datasets` | Datasets |
| 9 | GET | `/datasets/{id}` | Datasets |
| 10 | GET | `/datasets/{id}/permissions` | Permissions |
| 11 | POST | `/access-requests` | Access Requests |
| 12 | POST | `/access-requests/{id}/approve` | Administration |
| 13 | GET | `/consents` | Consents |
| 14 | POST | `/gis/query` | GIS Federation |
| 15 | POST | `/gis/spatial-query` | GIS Federation |
| 16 | GET | `/audit-logs` | Audit |

### Supplemental (sudah dikonfirmasi backend, harus ditambah ke YAML)

| # | Method | Path | Catatan |
|---|---|---|---|
| **17** | **GET** | `/access-requests?scope=mine\|organization\|all&status=&dataset_id=&participant_id=&page=&page_size=` | Auto-detect role + optional scope |
| **18** | **GET** | `/access-requests/{requestId}` | Detail single request |
| **19** | **POST** | `/access-requests/{requestId}/reject` | Counterpart approve |
| **20** | **POST** | `/consents/{consentId}/revoke` | Revoke + auto-revoke permissions + audit |
| **21** | **GET** | `/audit-logs?action=&participant_id=&dataset_id=&start_date=&end_date=&page=&page_size=` | Mandatory filters |

---

## 3. Workflow (Auto-Consent + SSO)

### Login flow

```
1. User → click "Login" → redirected ke Keycloak login page
2. Keycloak → authenticate → return JWT (with claims: roles[], permissions[], participant_id, etc)
3. Frontend → store JWT (managed by keycloak-js lib)
4. apiClient interceptor   → attach `Authorization: Bearer <jwt>` (same JWT)
5. spektrumClient interceptor → attach `Authorization: Bearer <jwt>` (same JWT)
6. Token expires → keycloak-js auto-refresh → update token → both clients pick up new token
7. User → click "Logout" → keycloak.logout() → token invalidated → redirect to login
```

### Access request workflow

```
1. Consumer  → POST /access-requests              { dataset_id, purpose }
2. Backend   → status = "pending"
3. Provider  → GET  /access-requests?scope=organization&status=pending
4. Provider  → POST /access-requests/{id}/approve  (or /reject)
5. Backend   → AUTOMATIC after approve:
                a. status = "approved"
                b. CREATE Consent (status="granted")
                c. CREATE Permission entries (e.g., gis.query for this dataset)
                d. activate dataset access
                e. WRITE audit log entry
6. Consumer  → GET /access-requests/{id} or refetch list  → see "approved"
7. Consumer  → POST /gis/query                    → success (permissions available)
```

### Revoke consent workflow

```
1. Provider/Admin → GET /consents?status=granted (atau filter by dataset)
2. Provider/Admin → click "Revoke" pada consent → confirm modal → POST /consents/{id}/revoke
3. Backend       → AUTOMATIC:
                    a. consent.status = "revoked"
                    b. revoke related permission entries
                    c. deactivate dataset access for that consumer
                    d. WRITE audit log entry
4. UI            → invalidate consent + permission queries → list refresh
```

---

## 4. Centralized IAM / SSO Strategy

### Diagram

```
┌──────────────┐        ┌───────────────────┐
│   Browser    │ ─(1)─→ │  Keycloak / IAM   │
│  (rapiDSK    │        │   (Identity       │
│   web app)   │ ←(2)── │    Provider)      │
└──────┬───────┘        │   + RBAC Mapper   │ ← rapiDSK roles
       │                │   (IAM-3)         │   normalized to
       │                └───────────────────┘   CANONICAL here
       │ (3) Bearer <jwt>  (claims.roles = canonical only)
       ├──────────────────────────────────┐
       ↓                                  ↓
┌──────────────┐                  ┌──────────────┐
│   rapiDSK    │                  │   SPEKTRUM   │
│   Backend    │                  │   Backend    │
│ (validates   │                  │  (validates  │
│   same JWT)  │                  │   same JWT)  │
└──────────────┘                  └──────────────┘
```

> **Penting (IAM-3)**: role normalization terjadi di **IAM/backend layer**, bukan di frontend. JWT yang diterima frontend selalu berisi canonical roles saja (mis. `["ADMIN", "GIS_ANALYST"]`), tidak peduli backend mana yang awalnya punya role tersebut.

(1) Frontend redirect user ke Keycloak login
(2) Keycloak return JWT setelah login sukses
(3) Frontend pakai JWT yang sama untuk panggil dua backend

### Library pilihan

- **`keycloak-js`** — official Keycloak adapter, bundle ~50KB
- Atau **`oidc-client-ts`** kalau IAM bukan Keycloak (tapi OIDC-compliant)

### Konfigurasi

```bash
# .env
VITE_KEYCLOAK_URL=https://iam.spektrum.local/auth
VITE_KEYCLOAK_REALM=spektrum
VITE_KEYCLOAK_CLIENT_ID=rapidsk-web

VITE_API_BASE_URL=http://45.158.126.171:8181              # rapiDSK
VITE_SPEKTRUM_BASE_URL=http://localhost:8000/api/v1       # SPEKTRUM
```

### Snippet integrasi (sketch)

```ts
// src/auth/keycloak.ts
import Keycloak from "keycloak-js";

export const keycloak = new Keycloak({
  url: import.meta.env.VITE_KEYCLOAK_URL,
  realm: import.meta.env.VITE_KEYCLOAK_REALM,
  clientId: import.meta.env.VITE_KEYCLOAK_CLIENT_ID,
});

export async function initKeycloak() {
  const authenticated = await keycloak.init({
    onLoad: "check-sso",
    silentCheckSsoRedirectUri: window.location.origin + "/silent-check-sso.html",
    pkceMethod: "S256",
  });
  return authenticated;
}
```

```ts
// src/api/client.ts (rapiDSK — UPDATE existing)
apiClient.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);   // refresh if <30s remaining
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});
```

```ts
// src/api/spektrum/client.ts (SPEKTRUM — NEW, sama mekanisme)
spektrumClient.interceptors.request.use(async (config) => {
  if (keycloak.authenticated) {
    await keycloak.updateToken(30);
    config.headers.Authorization = `Bearer ${keycloak.token}`;
  }
  return config;
});
```

> **Catatan**: tidak perlu lagi `localStorage.setItem("auth_token", ...)` — Keycloak adapter handle storage internal.

### Pertanyaan tersisa untuk infra/backend (bukan blocker — bisa paralel)

| # | Pertanyaan | Owner |
|---|---|---|
| IAM-1 | Realm name & client ID untuk dev/staging/prod? | Infra |
| IAM-2 | JWT claim format: `roles` di top-level atau di `realm_access.roles`? | Infra/Keycloak admin |
| IAM-3 | rapiDSK existing role schema (`SUPER_ADMIN/PROVIDER/CONSUMER/VIEWER`) di-merge ke SPEKTRUM 7-role schema, atau diparalel? | Backend |
| IAM-4 | `permissions[]` claim apakah masuk JWT atau dipanggil via `GET /userinfo`? | Backend |
| IAM-5 | Logout endpoint: redirect ke `/login` atau ke landing page? | UX |

---

## 5. Sidebar — Coexistence Layout

### Section-based sidebar (final, gated by CANONICAL roles only)

```
┌─────────────────────────┐
│  rapiDSK (LEGACY)       │ ← collapsible header
│  ├ Dashboard            │
│  ├ Onboarding           │
│  ├ Organizations        │
│  ├ Domains              │
│  ├ Participants         │
│  ├ Dataset Catalog      │
│  ├ Contracts            │
│  ├ Data Transfer        │
│  ├ Audit Trail          │
│  ├ Compliance           │
│  └ API Docs             │
├─────────────────────────┤
│  SPEKTRUM (FEDERATED)   │ ← collapsible header
│  ├ Dashboard            │
│  ├ Participants         │
│  ├ Dataset Catalog      │
│  ├ Access Requests      │ 🆕
│  ├ Consents             │ 🆕
│  ├ GIS Explorer         │ 🆕
│  ├ Audit Trail          │
│  └ API Docs (SPEKTRUM)  │
└─────────────────────────┘
```

**Visibility rules (IAM-3):**
- Single source: `config/rbac.ts` — semua menu (legacy + SPEKTRUM) gated oleh CANONICAL roles
- `MENU_ITEMS` punya field `section: "legacy" | "spektrum"` untuk grouping visual
- Section header tampil kalau user punya minimal 1 role yang match menu di section itu
- Per-item gating: any-of canonical role
- Tidak ada `spektrum-rbac.ts` — semua di satu file
- Sidebar generator generic, tidak peduli backend asal

**Contoh entry `MENU_ITEMS` extended:**
```ts
{
  section: "spektrum",
  icon: Globe,
  label: "GIS Explorer",
  path: "/spektrum/gis-explorer",
  roles: ["SUPER_ADMIN", "ADMIN", "GIS_ANALYST", "PROVIDER", "CONSUMER"],
  permissions: ["gis.query"],   // optional — extra fine-grained gate
}
```

---

## 6. Detail Implementasi per Resource

### 6.1 Common types

```ts
// src/api/spektrum/types/common.ts
export interface ApiMetadata { request_id?: string; }

export interface Pagination {
  page: number;
  page_size: number;
  total_items: number;
  total_pages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message: string;
  data: T;
  metadata?: ApiMetadata;
}

export interface ApiListResponse<T> {
  success: boolean;
  message: string;
  data: T[];
  pagination?: Pagination;
  metadata?: ApiMetadata;
}

export interface StandardSuccessResponse {
  success: boolean;
  message: string;
}

export interface SpektrumPaginationParams {
  page?: number;
  page_size?: number;
}
```

### 6.2 Auth (di JWT, parsed dari Keycloak)

```ts
// src/api/spektrum/types/auth.ts
export type SpektrumRole =
  | "SUPER_ADMIN" | "ADMIN" | "VIEWER" | "AUDITOR"
  | "GIS_ANALYST" | "PROVIDER" | "CONSUMER";

export interface SpektrumJWTClaims {
  sub: string;                      // user_id
  preferred_username: string;
  email: string;
  name: string;                     // full_name
  participant_id?: string;
  participant?: {
    participant_id: string;
    organization_name: string;
    role_type: "provider" | "consumer";
  };
  roles: SpektrumRole[];
  permissions: string[];
  exp: number;
  iat: number;
}
```

> **Catatan**: tidak perlu `services/auth.ts` di SPEKTRUM — semua login/refresh handled by Keycloak adapter. `/auth/login` dan `/auth/refresh` di YAML jadi **opsional** kalau backend butuh dual support.

### 6.3 Datasets (LB7 — service_type enum + fallback)

```ts
// src/api/spektrum/types/datasets.ts
export type ServiceType = "arcgis" | "postgis" | "geoserver" | "api" | "custom_connector";
export type Classification = "public" | "internal" | "restricted";

export interface Dataset {
  dataset_id: string;
  dataset_name: string;
  provider_id: string;
  dataset_type: string;
  service_type: ServiceType;
  custom_service_type?: string | null;     // hanya kalau service_type = "custom_connector"
  classification: Classification;
  geometry_type: string;
  spatial_reference: string;
  bbox: number[];
  supported_formats: string[];
  capabilities: string[];                  // ["query", "spatial_filter", "export"]
  max_record_count: number;
}

export interface DatasetCreateRequest {
  dataset_name: string;
  provider_id: string;
  service_url: string;
  service_type?: ServiceType;
  custom_service_type?: string;
}
```

**UI form:**
```
Service Type: [Dropdown: arcgis | postgis | geoserver | api | custom_connector]
              ↓ (kalau custom_connector dipilih)
Custom Service Type: [Text input]
```

### 6.4 Access Requests (LB3 — scope filtering)

```ts
// src/api/spektrum/types/access-requests.ts
export type AccessRequestScope = "mine" | "organization" | "all";
export type AccessRequestStatus = "pending" | "approved" | "rejected";

export interface AccessRequestListParams extends SpektrumPaginationParams {
  scope?: AccessRequestScope;
  status?: AccessRequestStatus;
  dataset_id?: string;
  participant_id?: string;
}

export interface AccessRequestListItem {
  request_id: string;
  dataset: { dataset_id: string; dataset_name: string };
  consumer: { participant_id: string; organization_name: string };
  status: AccessRequestStatus;
  purpose: string;
  created_at: string;
  approved_at: string | null;
  rejected_at?: string | null;
  reject_reason?: string | null;
}
```

```ts
// src/api/spektrum/services/access-requests.ts
export const accessRequestsService = {
  list: (params?: AccessRequestListParams) =>
    spektrumClient.get<ApiListResponse<AccessRequestListItem>>("/access-requests", { params })
      .then(r => r.data),
  getById: (id: string) =>
    spektrumClient.get<ApiResponse<AccessRequestListItem>>(`/access-requests/${id}`).then(r => r.data),
  create: (data: { dataset_id: string; purpose: string }) =>
    spektrumClient.post<ApiResponse<{ request_id: string; status: AccessRequestStatus }>>(
      "/access-requests", data).then(r => r.data),
  approve: (id: string) =>
    spektrumClient.post<StandardSuccessResponse>(`/access-requests/${id}/approve`).then(r => r.data),
  reject: (id: string, reason?: string) =>
    spektrumClient.post<StandardSuccessResponse>(`/access-requests/${id}/reject`, { reason })
      .then(r => r.data),
};
```

### 6.5 Consents (LB6 — revoke + history)

```ts
// src/api/spektrum/types/consents.ts
export type ConsentStatus = "granted" | "revoked";

export interface Consent {
  consent_id: string;
  provider_id: string;
  consumer_id: string;
  dataset_id: string;
  status: ConsentStatus;
  granted_at: string;
  revoked_at?: string | null;
  revoke_reason?: string | null;
}
```

```ts
// src/api/spektrum/services/consents.ts
export const consentsService = {
  list: (params?: SpektrumPaginationParams & { status?: ConsentStatus; dataset_id?: string }) =>
    spektrumClient.get<ApiListResponse<Consent>>("/consents", { params }).then(r => r.data),
  revoke: (id: string, reason?: string) =>
    spektrumClient.post<StandardSuccessResponse>(`/consents/${id}/revoke`, { reason })
      .then(r => r.data),
};
```

### 6.6 Audit Logs (LB5 — mandatory filters)

```ts
// src/api/spektrum/types/audit.ts
export interface AuditLog {
  audit_id: string;
  participant_id: string;
  activity: string;
  created_at: string;
}

export interface AuditLogListParams extends SpektrumPaginationParams {
  action?: string;
  participant_id?: string;
  dataset_id?: string;
  start_date?: string;       // ISO 8601
  end_date?: string;
}
```

```ts
// src/api/spektrum/services/audit.ts
export const auditService = {
  list: (params?: AuditLogListParams) =>
    spektrumClient.get<ApiListResponse<AuditLog>>("/audit-logs", { params }).then(r => r.data),
};
```

### 6.7 GIS (LB8 — capability AND permission gating)

```ts
// src/api/spektrum/types/gis.ts
export type SpatialRelation = "intersects" | "within" | "contains" | "nearest";
export type GisFormat = "geojson" | "json" | "pbf";

export interface GISQueryRequest {
  dataset_id: string;
  where?: string;
  out_fields?: string;
  format?: GisFormat;
}

export interface SpatialQueryRequest {
  dataset_id: string;
  xmin: number; ymin: number; xmax: number; ymax: number;
  spatial_relation?: SpatialRelation;
}

export interface GISFeatureCollection {
  type: "FeatureCollection";
  features: Array<unknown>;       // GeoJSON Feature[]
}

export type GISQueryResponse = ApiResponse<GISFeatureCollection>;
```

**Gating utility:**

```ts
// src/api/spektrum/utils/gating.ts
export function canRunGisQuery(dataset: Dataset, userPermissions: string[]): boolean {
  return dataset.capabilities.includes("query") && userPermissions.includes("gis.query");
}

export function canRunSpatialQuery(dataset: Dataset, userPermissions: string[]): boolean {
  return dataset.capabilities.includes("spatial_filter") && userPermissions.includes("gis.query");
}

export function canExportGis(dataset: Dataset, userPermissions: string[]): boolean {
  return dataset.capabilities.includes("export") && userPermissions.includes("gis.export");
}
```

---

## 7. Pages SPEKTRUM (Layout Final)

### 7.1 `pages/spektrum/SpektrumDashboard.tsx`

Cards (sumber data dari endpoint):
- Active Participants (`GET /participants` filter status=active)
- Available Datasets (`GET /datasets` count)
- Pending Approvals (`GET /access-requests?scope=organization&status=pending`)
- Active Consents (`GET /consents?status=granted`)
- Recent Audit Activity (`GET /audit-logs?page=1&page_size=5`)

### 7.2 `pages/spektrum/SpektrumParticipants.tsx`

- Table: organization_name, organization_type, role_type, status badge
- Filter dropdown: status (pending/active/suspended)
- Action: tombol "Activate" — visible kalau:
  - `status === "pending"` AND
  - `permissions.includes("participant.activate")` (dari LB8 pattern)

### 7.3 `pages/spektrum/SpektrumDatasets.tsx`

- Table: dataset_name, provider (lookup), classification badge, service_type chip
- **No domain dropdown** (flat catalog)
- Tombol "Register Dataset" — visible kalau `permissions.includes("dataset.register")`
- Form fields: dataset_name, provider_id (select dari `/participants?role_type=provider`), service_url, service_type (enum dropdown LB7), custom_service_type (visible kalau service_type=custom_connector)
- Detail link → `/spektrum/datasets/:id`

### 7.4 `pages/spektrum/DatasetDetail.tsx`

Tabs:
- **Overview** — classification, geometry_type, spatial_reference, bbox, supported_formats, capabilities, max_record_count
- **Permissions** — paginated list dari `/datasets/{id}/permissions` (LB4 — pakai `Pagination` standard)
- **GIS Preview** — mini MapLibre dengan bbox highlight + "Open in GIS Explorer" button
- **Request Access** — form tombol "Request Access" (visible kalau `permissions.includes("access-request.create")`)

### 7.5 `pages/spektrum/AccessRequests.tsx` (LB3 — 3 tabs)

```
┌─────────────────────────────────────────┐
│ [My Requests] [Organization] [Global]   │   ← tab nav
├─────────────────────────────────────────┤
│ Filter: [Status ▼] [Dataset] [Date]     │
├─────────────────────────────────────────┤
│ Table: dataset / consumer / status /    │
│        purpose / created_at / actions   │
└─────────────────────────────────────────┘
```

**Tab logic:**
- **My Requests** — `scope=mine`. Visible untuk semua role. Tidak ada action button.
- **Organization Requests** — `scope=organization`. Visible kalau user punya `permissions.includes("access-request.approve")`. Action: Approve / Reject (dengan reason) per row.
- **Global Queue** — `scope=all`. Visible kalau user role = `SUPER_ADMIN` atau `ADMIN`. Same actions sebagai Organization, tapi cross-org.

**Approve dialog** — simple confirm (no input).
**Reject dialog** — reason textarea (required).

### 7.6 `pages/spektrum/Consents.tsx` (LB6 — revoke)

- Read-only table: provider, consumer, dataset, status badge (granted/revoked), granted_at, revoked_at
- Filter: status (granted/revoked/all), dataset
- Action: tombol "Revoke" per row — visible kalau:
  - `status === "granted"` AND
  - `permissions.includes("consent.revoke")`
- Revoke dialog: textarea reason (required)
- Setelah revoke sukses: invalidate consents + permissions queries

### 7.7 `pages/spektrum/GISExplorer.tsx` (LB8 — capability+permission gating)

Layout:
- Left sidebar (320px): dataset selector (search + checkbox list — disabled checkbox kalau bukan eligible dataset), filter form (where, out_fields), BBox draw toggle (disabled kalau `!canRunSpatialQuery(dataset, permissions)`), spatial_relation dropdown
- Main: MapLibre canvas + draw control
- Right panel: query result (feature count, properties of clicked feature, "Download GeoJSON" button — disabled kalau `!canExportGis(...)`)

**Gating logic** (per dataset):
```ts
const queryEnabled = canRunGisQuery(dataset, user.permissions);
const spatialEnabled = canRunSpatialQuery(dataset, user.permissions);
const exportEnabled = canExportGis(dataset, user.permissions);
```

Tooltip muncul di button disabled, jelaskan alasan (capability missing vs permission missing).

**Library:**
- `maplibre-gl` (~200KB gzipped)
- `@maplibre/maplibre-gl-draw` (~50KB)
- `@turf/bbox` (utility, kecil)

### 7.8 `pages/spektrum/SpektrumAudit.tsx` (LB5 — filters)

```
┌──────────────────────────────────────────────────┐
│ Filter:                                          │
│ [Action] [Participant] [Dataset]                 │
│ [Start Date] [End Date]    [Apply] [Reset]       │
├──────────────────────────────────────────────────┤
│ Table: created_at / participant / activity / id  │
│        + pagination footer                       │
└──────────────────────────────────────────────────┘
```

- Filter: action (text), participant_id (autocomplete from /participants), dataset_id (autocomplete from /datasets), start_date (date picker), end_date (date picker)
- URL query params sync dengan filter (shareable link)
- Pagination
- Visible kalau user punya `permissions.includes("audit.read")` atau role `AUDITOR/ADMIN/SUPER_ADMIN`

---

## 8. Roadmap & Urutan Eksekusi

### Phase 0 — Pre-flight (BLOCKING)

- [ ] Backend confirm 5 supplemental endpoints (#17-21) sudah masuk roadmap
- [ ] Infra confirm Keycloak realm + client ID untuk dev environment
- [ ] Backend confirm JWT claim structure (`roles[]`, `permissions[]`, `participant_id`)
- [ ] Provide sample JWT token untuk testing
- [ ] **🆕 (IAM-6) Backend/DBA jalankan role inventory query di prod rapiDSK**
- [ ] **🆕 (IAM-6) Sign-off `docs/IAM_ROLE_MAPPING_MATRIX.md`** — minimal section "Legacy Role Inventory" + "Canonical Mapping" terisi (boleh draft, tapi WAJIB ada sebelum Phase 5)

> ⚠️ Phase 1 tidak boleh mulai sebelum endpoint, Keycloak setup, JWT structure confirm.
> ⚠️ Phase 5 tidak boleh mulai sebelum `IAM_ROLE_MAPPING_MATRIX.md` di-sign-off (HARD BLOCKER).

### Phase 1 — IAM Foundation + Canonical RBAC (2.5 hari)

- [ ] Install `keycloak-js`
- [ ] `src/auth/keycloak.ts` — Keycloak instance + init
- [ ] `src/auth/KeycloakProvider.tsx` — wrap App
- [ ] `src/auth/useAuth.ts` — unified hook (replaces dual-context); expose `roles[]` + `permissions[]` from JWT
- [ ] Update `src/api/client.ts` — interceptor pakai keycloak.token (replaces localStorage auth_token)
- [ ] `src/api/spektrum/client.ts` — baru, interceptor sama
- [ ] Update `src/main.tsx` — bootstrap Keycloak sebelum render App
- [ ] `public/silent-check-sso.html` — silent refresh page
- [ ] Update `src/components/auth/ProtectedRoute.tsx` — pakai keycloak.authenticated
- [ ] Update `src/components/auth/RoleGuard.tsx` — multi-role any-of dari `keycloak.tokenParsed.roles` (canonical only)
- [ ] Update `src/context/AuthContext.tsx` — wrap Keycloak (atau hapus, pakai useAuth langsung)
- [ ] Hapus `src/pages/Login.tsx` form (Keycloak punya login page sendiri) — atau ubah jadi landing dengan tombol "Login with SSO"
- [ ] **🆕 (IAM-3) Migrasi `src/config/rbac.ts` ke canonical 7-role**:
  - [ ] Update `AppRole` type: `"SUPER_ADMIN" | "ADMIN" | "VIEWER" | "AUDITOR" | "GIS_ANALYST" | "PROVIDER" | "CONSUMER"`
  - [ ] Audit semua existing legacy menu — assign canonical roles yang sesuai
  - [ ] Tambah `section: "legacy" | "spektrum"` di `MenuItem` interface
  - [ ] Tambah `permissions?: string[]` (opsional, untuk fine-grained gate)
  - [ ] Tag legacy menu dengan `section: "legacy"`
  - [ ] Tambah `ROLE_LABELS` untuk 3 role baru (ADMIN, AUDITOR, GIS_ANALYST)
- [ ] **Verify**: login flow end-to-end (browser → Keycloak → redirect back → JWT with canonical roles → both backends accept)
- [ ] **Verify**: existing legacy pages masih bisa diakses dengan role canonical (regression test)

### Phase 2 — SPEKTRUM Foundation + Read-only resources (2.5 hari)

- [ ] Buat folder structure `src/api/spektrum/`, `src/pages/spektrum/`, `src/components/spektrum/`
- [ ] `types/common.ts`, `types/auth.ts`
- [ ] `services/participants.ts` + `hooks/useSpektrumParticipants.ts`
- [ ] `pages/spektrum/SpektrumParticipants.tsx`
- [ ] `services/datasets.ts` + `hooks/useSpektrumDatasets.ts`
- [ ] `pages/spektrum/SpektrumDatasets.tsx` + `DatasetDetail.tsx` (tab Overview saja)
- [ ] `services/consents.ts` + `hooks/useConsents.ts`
- [ ] `pages/spektrum/Consents.tsx` (read-only, tanpa revoke dulu)
- [ ] `services/audit.ts` + `hooks/useAuditLogs.ts` (with all LB5 filters)
- [ ] `pages/spektrum/SpektrumAudit.tsx` (with filter UI)
- [ ] `pages/spektrum/SpektrumDashboard.tsx`

### Phase 3 — Workflow + Permissions (2.5 hari)

- [ ] `services/access-requests.ts` (5 method: list, getById, create, approve, reject)
- [ ] `hooks/useAccessRequests.ts` — separate hook per scope
- [ ] `pages/spektrum/AccessRequests.tsx` (3 tabs: Mine / Organization / Global)
- [ ] Tab "Permissions" di `DatasetDetail.tsx` (LB4 paginated)
- [ ] Tab "Request Access" di `DatasetDetail.tsx`
- [ ] Implement `participants.activate` + tombol activate
- [ ] Implement `consents.revoke` + dialog revoke + invalidation logic
- [ ] Test workflow end-to-end:
  - create access request → admin approve → consent muncul (granted) → permission tersedia
  - revoke consent → permissions hilang → audit log entry tertulis

### Phase 4 — GIS (3 hari)

- [ ] Install `maplibre-gl` + `@maplibre/maplibre-gl-draw` + `@turf/bbox`
- [ ] `services/gis.ts` + `hooks/useGisQuery.ts`
- [ ] `utils/gating.ts` — capability+permission helpers
- [ ] `components/spektrum/gis/MapCanvas.tsx`
- [ ] `components/spektrum/gis/BBoxPicker.tsx`
- [ ] `components/spektrum/gis/GeoJsonLayer.tsx` (style by geometry_type)
- [ ] `pages/spektrum/GISExplorer.tsx` (full layout dengan capability+permission gating)
- [ ] Tab "GIS Preview" di `DatasetDetail.tsx`
- [ ] Export GeoJSON button (gated)
- [ ] Test query dengan dataset spatial nyata

### Phase 5 — Sidebar Integration (1 hari) 🔴 BLOCKED until IAM-6 signed off

> **Prerequisite (HARD):** `docs/IAM_ROLE_MAPPING_MATRIX.md` sudah signed-off oleh backend + IAM team.
> Tanpa ini, ada risiko user prod kehilangan akses karena legacy role tidak ke-map.

- [ ] Verify `IAM_ROLE_MAPPING_MATRIX.md` signed off
- [ ] Verify Keycloak/IAM mapper sudah implement mapping (test JWT dengan beberapa user prod)
- [ ] Tambah SPEKTRUM menu items ke `config/rbac.ts` (8 item, semua tag `section: "spektrum"`)
- [ ] Audit ulang legacy menu role assignment di `config/rbac.ts` — sesuaikan dengan canonical mapping yang sudah signed-off
- [ ] Refactor `components/layout/Sidebar.tsx` — group by `section`, render section header
- [ ] Update `App.tsx` — tambah routes `/spektrum/*`, route guards (pakai canonical roles)
- [ ] Section visibility: hide section header kalau tidak ada item yang match user roles
- [ ] Status indicator di header (avatar + nama dari Keycloak `tokenParsed.name`)
- [ ] Test: user dengan role kombinasi (mis. `["CONSUMER", "GIS_ANALYST"]`) lihat menu yang sesuai di kedua section
- [ ] **Smoke test pakai sample user prod**: pastikan setiap legacy role yang ada di matrix bisa login dan menu-nya muncul sesuai harapan

### Phase 6 — QA (1.5 hari)

- [ ] Smoke test rapiDSK menu — pastikan tidak ada regresi (auth diganti dari localStorage ke Keycloak)
- [ ] Smoke test tiap halaman SPEKTRUM dengan tiap role kombinasi
- [ ] Test refresh token — biarkan token expire di tab, action berikutnya harus auto-refresh
- [ ] Test logout — pastikan token invalid, redirect ke login Keycloak
- [ ] Test access request workflow end-to-end (consumer → admin approve → consent → GIS query)
- [ ] Test revoke consent — pastikan permissions hilang
- [ ] Test GIS query dengan dataset capability + user permission kombinasi (matrix test)
- [ ] Test audit filter (date range, action, participant)
- [ ] Cross-browser smoke test (Chrome, Firefox, Edge)

**Total: ~12-14 hari kerja**

---

## 9. Risiko & Mitigasi

| # | Risiko | Mitigasi |
|---|---|---|
| 1 | **Keycloak setup delays** — infra belum siap | Phase 0 BLOCKING; mock Keycloak via `mock-keycloak-server` lokal untuk Phase 1 paralel |
| 2 | **JWT claim format** beda antara dev (mock) dan prod | Generate types dari sample JWT; validate lewat Zod di runtime |
| 3 | **Bundle size** dengan keycloak-js + maplibre + paralel codebase | Code-split per route (`React.lazy`); MapLibre lazy load only di GIS Explorer |
| 4 | **Schema drift** antara YAML v2.1.0 dan implementasi | Generate types dari YAML pakai `openapi-typescript` di CI |
| 5 | **rapiDSK auth regression** saat ganti dari localStorage ke Keycloak | Phase 1 verify all rapiDSK menus first sebelum lanjut |
| 6 | **Naming collision** (Participant rapiDSK vs SPEKTRUM) | Prefix `Spektrum*` untuk semua type SPEKTRUM |
| 7 | **Consent auto-create race** — UI poll terlalu cepat | Delay 500ms setelah approve, atau pakai optimistic update |
| 8 | **GIS dataset format bervariasi** | Phase 4 cuma support `geojson`; tambah converter kalau perlu |
| 9 | **Capability+permission gating logic** salah | Centralize di `utils/gating.ts`; unit test untuk tiap matrix |
| 10 | **Multi-tab refresh race** | Keycloak adapter handle ini built-in lewat `BroadcastChannel` |
| 11 | **Legacy role belum terdaftar di IAM mapping** — user lama login tapi role di JWT kosong | Phase 0 IAM-6 lock daftar legacy role; fallback default ke `VIEWER` kalau unmapped |
| 12 | **Permissions list panjang** (>20) bikin JWT besar | Kalau kena limit, pindah ke `GET /userinfo` endpoint (IAM-4) |

---

## 10. Pertanyaan Tersisa (non-blocker)

| # | Pertanyaan | Owner | Phase | Status |
|---|---|---|---|---|
| IAM-1 | Realm name & client ID per env | Infra | Phase 0 | open |
| IAM-2 | JWT claim structure exact | Infra | Phase 0 | open |
| ~~IAM-3~~ | ~~Role schema rapiDSK ↔ SPEKTRUM mapping~~ | Backend | — | ✅ **CLOSED** — canonical RBAC owned by SPEKTRUM, IAM melakukan mapping |
| IAM-4 | Permissions di JWT atau via /userinfo? | Backend | Phase 1 | open |
| IAM-5 | Logout redirect target | UX | Phase 1 | open |
| **IAM-6** | **Role inventory dari production rapiDSK + canonical mapping matrix** | Backend/DBA + IAM | Phase 0 | open — **🔴 HARD BLOCKER untuk Phase 5** |

### IAM-6 Detail (Locked)

**Required deliverable:** `docs/IAM_ROLE_MAPPING_MATRIX.md` — sign-off oleh backend + IAM team **sebelum Phase 5**.

**Sumber data (DBA query):**

```sql
-- Single role per user
SELECT DISTINCT role
FROM rapidsk_users
ORDER BY role;

-- Atau many-to-many
SELECT DISTINCT r.role_name
FROM user_roles ur
JOIN roles r ON r.id = ur.role_id
ORDER BY r.role_name;
```

**Mapping rule (penting):** Satu legacy role boleh map ke **satu atau lebih** canonical role. Contoh:

```
DOMAIN_ADMIN  →  ["ADMIN", "PROVIDER"]   # business responsibility overlap
ORG_ADMIN     →  ["ADMIN"]                # 1-to-1
GIS_USER      →  ["GIS_ANALYST"]         # 1-to-1
```

**Tanpa role inventory + matrix:**
- ❌ Canonical mapping bisa salah
- ❌ Role orphan (user prod tidak ke-map → JWT roles kosong → user kehilangan akses)
- ❌ Menu hilang tidak sengaja
- ❌ Risiko permission escalation kalau mapping terlalu permisif

> Phase 5 (sidebar + route guards) **tidak boleh** mulai sebelum matrix ini di-sign-off.

---

## Appendix A — Sidebar (Final Coexistence)

```
Legacy section (existing 11 items, semua tetap):
  Dashboard, Onboarding, Organizations, Domains,
  Participants, Dataset Catalog, Contracts,
  Data Transfer, Audit Trail, Compliance, API Docs

SPEKTRUM section (8 items baru, semua di prefix /spektrum):
  Dashboard, Participants, Dataset Catalog,
  Access Requests (3 tabs), Consents (revoke-able),
  GIS Explorer, Audit Trail (filter-able), API Docs
```

**Net:** -0 menu, +8 menu

---

## Appendix B — Routes (Final Coexistence)

```diff
// App.tsx — Legacy routes UNCHANGED
  <Route path="/" element={<Dashboard />} />
  <Route path="/onboarding" element={<Onboarding />} />
  <Route path="/organizations" element={<Organizations />} />
  <Route path="/domains" element={<Domains />} />
  <Route path="/participants" element={<ParticipantsPage />} />
  <Route path="/datasets" element={<Datasets />} />
  <Route path="/contracts" element={<Contracts />} />
  <Route path="/transfer" element={<DataTransfer />} />
  <Route path="/audit" element={<Audit />} />
  <Route path="/compliance" element={<Compliance />} />
  <Route path="/api-docs" element={<ApiDocs />} />
  <Route path="/settings" element={<Settings />} />

+ // SPEKTRUM routes (new)
+ <Route path="/spektrum" element={<SpektrumDashboard />} />
+ <Route path="/spektrum/participants" element={<SpektrumParticipants />} />
+ <Route path="/spektrum/datasets" element={<SpektrumDatasets />} />
+ <Route path="/spektrum/datasets/:id" element={<DatasetDetail />} />
+ <Route path="/spektrum/access-requests" element={<AccessRequests />} />
+ <Route path="/spektrum/consents" element={<Consents />} />
+ <Route path="/spektrum/gis-explorer" element={<GISExplorer />} />
+ <Route path="/spektrum/audit" element={<SpektrumAudit />} />
```

---

## Appendix C-1 — Canonical Role Model (IAM-3, Single Source of Truth)

**Frontend hanya mengenal 7 canonical role berikut:**

| Role | Deskripsi | Typical Access |
|---|---|---|
| `SUPER_ADMIN` | Platform-level admin, full access | Semua menu, semua action |
| `ADMIN` | Organization-level admin | Approve access requests, activate participants, manage datasets dalam org |
| `PROVIDER` | Data provider participant | Register dataset, lihat & approve request, monitor consents |
| `CONSUMER` | Data consumer participant | Browse catalog, request access, run GIS query |
| `VIEWER` | Read-only user | Browse catalog, lihat status, no actions |
| `AUDITOR` | Compliance/audit officer | Read-only audit logs, consent ledger, governance views |
| `GIS_ANALYST` | Spatial data power user | GIS query + spatial query + export, akses GIS Explorer |

### Backend/IAM Mapping Responsibility (sample)

> Frontend tidak melihat tabel ini — ini diimplementasi di IAM/backend layer **sebelum** JWT di-issue.

| Legacy rapiDSK Role | → | Canonical Roles (di JWT) |
|---|---|---|
| `ORG_ADMIN` | → | `["ADMIN"]` |
| `SYSTEM_ADMIN` | → | `["SUPER_ADMIN"]` |
| `DATA_PROVIDER` | → | `["PROVIDER"]` |
| `DATA_CONSUMER` | → | `["CONSUMER"]` |
| `READONLY` / `ORG_USER` | → | `["VIEWER"]` |
| (rapiDSK power user dengan akses GIS) | → | `["PROVIDER", "GIS_ANALYST"]` |

> **Action item (IAM-6):** backend perlu provide daftar lengkap legacy role yang dipakai di prod sekarang untuk lock mapping table di atas.

### Multi-role example

User real-world bisa punya kombinasi canonical role:

```json
// JWT claim
{
  "roles": ["CONSUMER", "GIS_ANALYST"],
  "permissions": ["gis.query", "gis.export", "access-request.create"]
}
```

→ User punya akses: catalog browsing (CONSUMER) + GIS Explorer + export (GIS_ANALYST + permissions).

---

## Appendix C — Permission Matrix (Final, untuk Action Gating)

| Permission key | UI element | Page |
|---|---|---|
| `participant.register` | Tombol "Register Participant" | SpektrumParticipants |
| `participant.activate` | Tombol "Activate" | SpektrumParticipants |
| `dataset.register` | Tombol "Register Dataset" | SpektrumDatasets |
| `dataset.view-permissions` | Tab Permissions | DatasetDetail |
| `access-request.create` | Tombol "Request Access" | DatasetDetail |
| `access-request.approve` | Tab Org/Global + Approve button | AccessRequests |
| `access-request.reject` | Reject button | AccessRequests |
| `consent.read` | Akses page Consents | Consents |
| `consent.revoke` | Tombol "Revoke" | Consents |
| `gis.query` | Tombol "Run Query" + BBox tool *(LB8: AND capability)* | GISExplorer |
| `gis.export` | Tombol "Download GeoJSON" *(LB8: AND capability=export)* | GISExplorer |
| `audit.read` | Akses page Audit + filter UI | SpektrumAudit |

---

## Appendix D — GIS Capability × Permission Matrix (LB8)

| Action | Required Dataset Capability | Required User Permission | Result |
|---|---|---|---|
| Run attribute query | `query` | `gis.query` | Button visible |
| Run attribute query | `query` | (missing) | Button hidden |
| Run attribute query | (missing) | `gis.query` | Button hidden + tooltip "Dataset doesn't support query" |
| Run spatial query | `spatial_filter` | `gis.query` | BBox tool enabled |
| Run spatial query | `spatial_filter` | (missing) | Tool hidden |
| Run spatial query | (missing) | `gis.query` | Tool hidden + tooltip "Dataset doesn't support spatial filter" |
| Export GeoJSON | `export` | `gis.export` | Button visible |
| Export GeoJSON | `export` | (missing) | Button hidden |
| Export GeoJSON | (missing) | `gis.export` | Button hidden + tooltip "Dataset doesn't support export" |

---

## Appendix E — Service Type Form (LB7)

```tsx
<Select value={serviceType} onChange={setServiceType}>
  <Option value="arcgis">ArcGIS</Option>
  <Option value="postgis">PostGIS</Option>
  <Option value="geoserver">GeoServer</Option>
  <Option value="api">Generic API</Option>
  <Option value="custom_connector">Custom Connector</Option>
</Select>

{serviceType === "custom_connector" && (
  <Input
    label="Custom Service Type"
    value={customServiceType}
    onChange={setCustomServiceType}
    required
    placeholder="e.g. mapinfo, oracle_spatial, etc"
  />
)}
```

Backend payload:
```json
{
  "dataset_name": "...",
  "service_type": "custom_connector",
  "custom_service_type": "mapinfo"
}
```

---

*Dokumen direvisi: 2026-05-07 — rapiDSK Frontend Team*
*Mode: COEXISTENCE + SSO via IAM + Canonical RBAC (final & locked)*
*Sumber referensi: `docs/fastapi.yaml` v2.1.0 + supplemental endpoints (LB3-LB6)*
*Status: ✅ Implementation-grade — siap eksekusi setelah Phase 0 backend/infra confirm*

### Changelog

- **v5 (2026-05-07)** — IAM-6 finalized as HARD BLOCKER for Phase 5. Created `docs/IAM_ROLE_MAPPING_MATRIX.md` template for backend/DBA fill-in. Support 1-to-many mapping rule. Phase 0 + Phase 5 prerequisites updated.
- **v4 (2026-05-07)** — IAM-3 finalized. Canonical role model owned by SPEKTRUM. Frontend single RBAC engine. `spektrum-rbac.ts` removed from plan. Phase 1 added canonical migration step. Appendix C-1 added with role mapping responsibility.
- **v3 (2026-05-07)** — LB1-LB8 finalized. SSO via Keycloak/OIDC, single login. Service type enum + fallback. Capability+permission gating.
- **v2 (2026-05-07)** — Coexistence mode locked. Auto-consent workflow. GET access-requests endpoints added.
- **v1 (2026-05-07)** — Initial draft (replace big-bang assumption).
