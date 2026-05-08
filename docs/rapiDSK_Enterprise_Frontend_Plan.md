# rapiDSK Enterprise Frontend Plan

> **Mode:** SINGLE-BACKEND — frontend langsung consume rapiDSK Enterprise API
> **Source of truth:** [`docs/rapidsk_full_openapi_enterprise_spec.md`](./rapidsk_full_openapi_enterprise_spec.md)
> **Replaces:** rapiDSK lama di `45.158.126.171:8181` (deprecated) **DAN** SPEKTRUM coexistence plan ([`SPEKTRUM_Migration_Plan.md`](./SPEKTRUM_Migration_Plan.md) — ARCHIVED)
> **Estimasi:** ~7-8 hari kerja
> **Status:** ✅ Arsitektur locked — siap eksekusi
> **Tanggal:** 2026-05-08 (v1)

---

## 0. Architectural Decisions (LOCKED)

### Single backend
| # | Topik | Keputusan |
|---|---|---|
| **B1** | Backend tunggal | rapiDSK Enterprise di `http://localhost:8000/api/v1` (replaces rapiDSK lama + SPEKTRUM) |
| **B2** | API spec | `docs/rapidsk_full_openapi_enterprise_spec.md` v1.0.0 |
| **B3** | UI design | **Tidak boleh diubah** — visual style, layout, color scheme adalah ciri produk |

### Auth & RBAC (carry-over dari Phase 1B)
| # | Topik | Keputusan |
|---|---|---|
| **A1** | Auth mechanism | Keycloak SSO (Single Sign-On) — JWT issued oleh Keycloak, di-trust oleh rapiDSK Enterprise backend |
| **A2** | Role model | Canonical 7-role: `SUPER_ADMIN, ADMIN, PROVIDER, CONSUMER, VIEWER, AUDITOR, GIS_ANALYST` |
| **A3** | Permission gating | Hybrid — navigasi by canonical role, action button by `permissions[]` (granular) |
| **A4** | Login form | **Hidden** — pure SSO, tombol "Sign in with Enterprise SSO" sebagai satu-satunya path |
| **A5** | `/auth/login` endpoint | **Tidak dipakai frontend** — JWT issued oleh Keycloak, bukan rapiDSK backend |

---

## 1. Endpoint Map (rapiDSK Enterprise)

12 endpoint total dari spec:

| # | Method | Path | Tag | Frontend usage |
|---|---|---|---|---|
| 1 | GET | `/system/health` | System | Health monitoring widget di Dashboard |
| 2 | POST | `/auth/login` | Authentication | **Tidak dipakai** (Keycloak SSO) |
| 3 | GET | `/organizations` | Organizations | List page |
| 4 | POST | `/organizations` | Organizations | Create form |
| 5 | GET | `/providers` | Providers | List page (read-only) |
| 6 | GET | `/datasets` | Datasets | List page |
| 7 | POST | `/datasets` | Datasets | Create form |
| 8 | GET | `/datasets/{id}` | Datasets | Detail page |
| 9 | GET | `/schemas` | Schemas | List page |
| 10 | GET | `/vocabularies` | Vocabulary | List page |
| 11 | POST | `/mapping/auto` | Mapping | Auto field mapping UI dengan confidence score |
| 12 | POST | `/arcgis/connect` | ArcGIS | Connect ArcGIS service form |
| 13 | GET | `/arcgis/discover` | ArcGIS | Discover layers list |
| 14 | GET | `/governance/policies` | Governance | Policies list (read-only) |
| 15 | GET | `/audit/logs` | Audit | Audit trail page (replaces mock) |

> **Catatan**: spec tidak include pagination params di setiap endpoint. Spec juga tidak punya nested response wrapper (`{ data, pagination }`). Frontend pakai bentuk flat array untuk semua list endpoint.

---

## 2. Concept yang HILANG dari rapiDSK lama

Pages yang fitur backend-nya hilang → **dihapus total** (per Q2 default):

| Page | Reason |
|---|---|
| `Onboarding.tsx` | Konsep Participant + ConnectionPool + ParticipantDomain hilang |
| `Domains.tsx` | Domain hierarchy hilang |
| `Participants.tsx` | Participant hilang |
| `Contracts.tsx` | Contract + Agreement + ContractPolicy hilang. Diganti `/governance/policies` (read-only sederhana) |
| `DataTransfer.tsx` | DataTransfer endpoint hilang |
| `Compliance.tsx` | Tidak ada compliance endpoint di spec |

Service files yang **dihapus total**:

- `services/onboarding.ts`
- `services/data-transfer.ts`
- `services/connector.ts`
- `services/monitoring.ts` (ada `/system/health` baru, tapi schema beda)
- `services/policy-contract.ts` (diganti dengan `services/governance.ts` baru sederhana)

---

## 3. Concept BARU dari rapiDSK Enterprise

Yang harus ditambah:

| Konsep | Endpoint | UI |
|---|---|---|
| Health monitoring | `GET /system/health` | Widget kecil di Dashboard header / sidebar footer |
| Providers list | `GET /providers` | Page baru `Providers.tsx` (read-only) |
| Schemas catalog | `GET /schemas` | Page baru `Schemas.tsx` |
| Vocabularies catalog | `GET /vocabularies` | Page baru `Vocabularies.tsx` |
| **Auto Field Mapping** | `POST /mapping/auto` | Page baru `Mapping.tsx` — input source fields, output mapping suggestions dengan confidence score (0-1) |
| **ArcGIS Services** | `POST /arcgis/connect`, `GET /arcgis/discover` | Page baru `ArcGISServices.tsx` — form connect + list layers discovered |
| Governance Policies | `GET /governance/policies` | Page baru `Policies.tsx` (read-only) |
| Audit Trail (real) | `GET /audit/logs` | Existing `Audit.tsx` di-rewire (mock data dihapus) |

---

## 4. Sidebar Final (Canonical RBAC)

```
┌──────────────────────────┐
│ rapiDSK Enterprise       │
│ ├ Dashboard              │ ← all roles
│ ├ Organizations          │ ← SUPER_ADMIN, ADMIN
│ ├ Providers              │ ← all roles (read-only)
│ ├ Datasets               │ ← all roles
│ ├ Schemas                │ ← all roles (catalog read)
│ ├ Vocabularies           │ ← all roles
│ ├ Auto Mapping           │ ← PROVIDER, ADMIN, SUPER_ADMIN (data preparation)
│ ├ ArcGIS Services        │ ← PROVIDER, ADMIN, SUPER_ADMIN, GIS_ANALYST
│ ├ Governance Policies    │ ← all roles (read), AUDITOR (focus)
│ ├ Audit Trail            │ ← SUPER_ADMIN, ADMIN, AUDITOR
│ └ API Docs               │ ← all roles
└──────────────────────────┘
```

> Tidak ada section `Legacy` atau `SPEKTRUM` — single section.

---

## 5. Detail Implementasi per Resource

### 5.1 Common types

```ts
// src/api/types/common.ts (rewrite — pakai spec rapiDSK Enterprise shape)

// Spec tidak define pagination → list endpoint return plain array
// Tapi kita siapkan helper opsional untuk future extension:
export interface PaginationParams {
  page?: number;
  page_size?: number;
}

// Standard error shape — perlu confirm sample respons backend
export interface ApiError {
  detail?: string;
  message?: string;
  errors?: Record<string, string[]>;
}
```

### 5.2 System

```ts
// src/api/services/system.ts
export const systemService = {
  health: () => apiClient.get<{ status: string }>("/system/health").then(r => r.data),
};
```

### 5.3 Organizations

```ts
export interface Organization {
  organization_id: string;
  organization_name: string;
  organization_type: string;       // free string per spec
}

export interface OrganizationCreateRequest {
  organization_name: string;
  organization_type?: string;
}

export const organizationsService = {
  list: () => apiClient.get<Organization[]>("/organizations").then(r => r.data),
  create: (data: OrganizationCreateRequest) =>
    apiClient.post<Organization>("/organizations", data).then(r => r.data),
};
```

> **Catatan**: spec tidak punya GET by ID, PATCH, DELETE untuk organizations. Frontend hanya implement list + create. UI existing `Organizations.tsx` perlu disesuaikan.

### 5.4 Providers

```ts
export interface Provider {
  provider_id: string;
  provider_name: string;
  status: string;
}

export const providersService = {
  list: () => apiClient.get<Provider[]>("/providers").then(r => r.data),
};
```

### 5.5 Datasets

```ts
export interface Dataset {
  dataset_id: string;
  dataset_name: string;
  schema_name: string;
  provider_name: string;
  classification: string;
  status: string;
}

export interface DatasetCreateRequest {
  dataset_name: string;
  schema_name: string;
  provider_id?: string;
}

export const datasetsService = {
  list: () => apiClient.get<Dataset[]>("/datasets").then(r => r.data),
  getById: (id: string) =>
    apiClient.get<Dataset>(`/datasets/${id}`).then(r => r.data),
  create: (data: DatasetCreateRequest) =>
    apiClient.post<Dataset>("/datasets", data).then(r => r.data),
};
```

> **Catatan**: tidak ada PATCH/DELETE di spec.

### 5.6 Schemas

```ts
export interface Schema {
  schema_id: string;
  schema_name: string;
  version: string;
}

export const schemasService = {
  list: () => apiClient.get<Schema[]>("/schemas").then(r => r.data),
};
```

### 5.7 Vocabularies

```ts
export interface Vocabulary {
  vocabulary_id: string;
  vocabulary_term: string;
  canonical_name: string;
}

export const vocabulariesService = {
  list: () => apiClient.get<Vocabulary[]>("/vocabularies").then(r => r.data),
};
```

### 5.8 Auto Mapping (BARU)

```ts
export interface MappingRequest {
  source_fields: string[];
}

export interface MappingResultEntry {
  source_field: string;
  canonical_field: string;
  confidence: number;            // 0.0 - 1.0
}

export interface MappingResult {
  mappings: MappingResultEntry[];
}

export const mappingService = {
  auto: (data: MappingRequest) =>
    apiClient.post<MappingResult>("/mapping/auto", data).then(r => r.data),
};
```

**UI pattern (`Mapping.tsx`):**
- Textarea / multi-line input untuk source fields (one per line)
- Tombol "Auto Map" → call `/mapping/auto`
- Result table: source field | suggested canonical field | confidence (progress bar 0-100%)
- Filter result by confidence threshold
- Export result (copy JSON / download CSV)

### 5.9 ArcGIS Services (BARU)

```ts
export interface ArcGISConnection {
  service_name: string;
  service_url: string;
}

export interface ArcGISLayer {
  layer_id: number;
  layer_name: string;
  geometry_type: string;
}

export const arcgisService = {
  connect: (data: ArcGISConnection) =>
    apiClient.post("/arcgis/connect", data),
  discover: () =>
    apiClient.get<ArcGISLayer[]>("/arcgis/discover").then(r => r.data),
};
```

**UI pattern (`ArcGISServices.tsx`):**
- Section atas: form "Connect Service" — input service_name + service_url + tombol Connect
- Section bawah: list layers discovered (table dengan layer_id, layer_name, geometry_type badge)
- Refresh button untuk re-discover

### 5.10 Governance Policies

```ts
export interface Policy {
  policy_id: string;
  policy_name: string;
  classification: string;
}

export const governanceService = {
  policies: () =>
    apiClient.get<Policy[]>("/governance/policies").then(r => r.data),
};
```

### 5.11 Audit

```ts
export interface AuditLog {
  audit_id: string;
  action: string;
  performed_by: string;
  timestamp: string;            // ISO 8601 date-time
}

export const auditService = {
  logs: () => apiClient.get<AuditLog[]>("/audit/logs").then(r => r.data),
};
```

> **Catatan**: spec tidak include filter params. Existing `Audit.tsx` UI punya filter (date range, action, target) — filter di-apply client-side dulu. Kalau backend nanti add filter params, hook & service tinggal extend.

---

## 6. Roadmap (7 Phase)

### Phase 1A + 1B + 1C (✅ DONE)

- ✅ Phase 1A: Canonical RBAC migration di `config/rbac.ts`
- ✅ Phase 1B: Keycloak SSO integration (`src/auth/`, dual interceptor, AuthContext)
- ✅ Phase 1C: Cleanup SPEKTRUM scaffolding, env update ke `localhost:8000/api/v1`, Login form di-hide

### Phase 2 — Service Layer Rewrite (2 hari)

**Delete:**
- [ ] `src/api/services/onboarding.ts`
- [ ] `src/api/services/data-transfer.ts`
- [ ] `src/api/services/connector.ts`
- [ ] `src/api/services/monitoring.ts`
- [ ] `src/api/services/policy-contract.ts`
- [ ] `src/api/hooks/useDomains.ts`, `useContracts.ts`, `useDataTransfers.ts`, `useUsers.ts` (kemungkinan keep `useUsers` minus login)
- [ ] `src/api/hooks/useParticipants.ts` (atau kosongkan)
- [ ] `src/api/types/onboarding.ts`, `data-transfer.ts`, `policy-contract.ts`, `monitoring.ts`, `compliance.ts`

**Rewrite:**
- [ ] `src/api/types/common.ts` — drop SPEKTRUM-specific shapes, simplify
- [ ] `src/api/services/governance.ts` — flatten ke `/organizations` + `/governance/policies`. Drop Domains.
- [ ] `src/api/services/data-catalog.ts` — flatten ke `/datasets`, `/schemas`, `/vocabularies`. Drop nested domain, drop vocabulary terms / metadata schemas / dataset metadata.
- [ ] `src/api/types/governance.ts` — sesuaikan dengan schema baru
- [ ] `src/api/types/data-catalog.ts` — sesuaikan
- [ ] `src/api/hooks/useDatasets.ts` — sesuaikan
- [ ] `src/api/hooks/useOrganizations.ts` — sesuaikan
- [ ] `src/api/services/identity-provider.ts` — minimal keep `usersService` kalau perlu profile, atau hapus
- [ ] `src/api/services/index.ts` — re-export bersih

**Add new services + hooks + types:**
- [ ] `src/api/services/system.ts` + types
- [ ] `src/api/services/providers.ts` + types + `useProviders` hook
- [ ] `src/api/services/schemas.ts` (atau merge ke data-catalog) + `useSchemas`
- [ ] `src/api/services/vocabularies.ts` (atau merge ke data-catalog) + `useVocabularies`
- [ ] `src/api/services/mapping.ts` + types + `useAutoMapping` hook
- [ ] `src/api/services/arcgis.ts` + types + `useArcGISConnect`, `useArcGISDiscover`
- [ ] `src/api/services/audit.ts` + types + `useAuditLogs`

### Phase 3 — Update Existing Pages (1.5 hari)

- [ ] `Dashboard.tsx` — sumber data baru: counts dari `/organizations`, `/datasets`, `/providers` + system health widget
- [ ] `Organizations.tsx` — simplify form (organization_name + organization_type), drop edit/delete (spec hanya GET+POST)
- [ ] `Datasets.tsx` — drop "select domain" dependency, schema baru (dataset_name, schema_name, provider_name, classification, status), drop edit/delete
- [ ] `Audit.tsx` — wire ke `/audit/logs` real, hapus mock data, simplify field (audit_id, action, performed_by, timestamp)
- [ ] `Settings.tsx` — strip user CRUD section
- [ ] `ApiDocs.tsx` — point ke spec rapiDSK Enterprise

### Phase 4 — Delete Obsolete Pages (0.25 hari)

- [ ] Delete `pages/Onboarding.tsx`
- [ ] Delete `pages/Domains.tsx`
- [ ] Delete `pages/Participants.tsx`
- [ ] Delete `pages/Contracts.tsx`
- [ ] Delete `pages/DataTransfer.tsx`
- [ ] Delete `pages/Compliance.tsx`
- [ ] Delete komponen terkait yang tidak terpakai (`components/onboarding/*`, dll)
- [ ] Update `App.tsx` — remove obsolete routes

### Phase 5 — New Pages (2-3 hari)

Semua new pages WAJIB pakai design language existing (referensi `pages/Datasets.tsx`, `pages/Organizations.tsx`):
- Header pattern: `<Header title=".." subtitle=".." />`
- Card layout, shadcn Table, Badge classification, Search input, Filter dropdown
- Color tokens existing (amber accent, dark navy panels)

- [ ] `pages/Providers.tsx` — read-only table list (provider_id, provider_name, status badge)
- [ ] `pages/Schemas.tsx` — read-only table list (schema_id, schema_name, version)
- [ ] `pages/Vocabularies.tsx` — read-only table (vocabulary_id, vocabulary_term, canonical_name)
- [ ] `pages/Mapping.tsx` — split: input section (textarea) + result section (table dengan progress bar confidence)
- [ ] `pages/ArcGISServices.tsx` — split: connect form section + discovered layers section
- [ ] `pages/Policies.tsx` — read-only table (policy_id, policy_name, classification badge)
- [ ] Update `App.tsx` — add routes baru

### Phase 6 — Sidebar + RBAC (0.5 hari)

- [ ] Update `config/rbac.ts` `MENU_ITEMS`:
  - Remove obsolete: Onboarding, Organizations sub-items, Domains, Participants, Contracts, Data Transfer, Compliance
  - Add new: Providers, Schemas, Vocabularies, Auto Mapping, ArcGIS Services, Governance Policies
  - Update existing: Datasets, Audit Trail roles
- [ ] Smoke test sidebar tampil per role

### Phase 7 — QA (1 hari)

- [ ] Login flow via Keycloak SSO end-to-end
- [ ] Setiap canonical role test akses menu
- [ ] CRUD existing pages (Organizations create, Datasets create) jalan
- [ ] New pages tampil dengan data dummy / real backend
- [ ] Audit log filter client-side jalan
- [ ] Auto mapping result render dengan progress bar
- [ ] ArcGIS connect → discover flow
- [ ] System health indicator

**Total: ~7-8 hari kerja**

---

## 7. UI Preservation Rules

> 🛡️ **Guardrail user (CRITICAL):** UI design adalah ciri produk — visual style **TIDAK BOLEH diubah**.

### Yang BOLEH diubah
- ✅ Data fetching layer (services, hooks, types)
- ✅ Wiring komponen ke endpoint baru
- ✅ Sidebar menu items (tambah/kurangi sesuai backend)
- ✅ Page contents (kalau backend feature berubah)

### Yang TIDAK BOLEH diubah
- ❌ Color scheme (amber accent #f59e0b, dark navy #0b0f1a/#0f1624/#16213a panels)
- ❌ Layout pattern (Login split-panel, Sidebar collapsed/expanded, Header sticky top)
- ❌ Component library (shadcn — pakai yang sudah ada di `@/components/ui/*`)
- ❌ Typography hierarchy
- ❌ Spacing dan sizing convention

### Rules untuk Page baru (Phase 5)
1. Sebelum mulai, baca minimal 2 page existing sebagai referensi (`Datasets.tsx`, `Organizations.tsx`).
2. Pakai `<Header />` dari `@/components/layout/Header`.
3. Table → shadcn `<Table>` dengan style yang sama dengan existing.
4. Form → shadcn `<Dialog>` + `<Input>` + `<Label>` + `<Button>` pattern existing.
5. Status badges → `<Badge variant="outline">` dengan color logic per status (lihat `Datasets.tsx` lines untuk reference).
6. Search input → `<Input>` dengan icon `<Search>` di kiri (lihat `Datasets.tsx`).
7. Filter dropdowns → `<Select>` shadcn pattern.
8. Loading state → `<Loader2 className="animate-spin" />` lucide icon.
9. Empty state → centered icon + text dengan style pattern existing.

---

## 8. Risk & Mitigation

| # | Risk | Mitigation |
|---|---|---|
| 1 | Backend `/auth/login` schema incomplete (no roles/permissions) | Frontend tidak pakai endpoint ini — pakai Keycloak JWT untuk roles/permissions |
| 2 | Spec tidak include pagination | Phase 2 implement tanpa pagination dulu, kalau list lebih dari 100 items baru consider client-side pagination atau request backend extend |
| 3 | Spec tidak include filter / search params | Filter client-side dulu, request backend extend kalau performa jadi issue |
| 4 | New pages (Mapping, ArcGIS) belum ada referensi UI | Mock data tampilan kasar, iterate based on user feedback. Wajib ikut design language existing. |
| 5 | Konsep `Schema` & `Vocabulary` ambigu — apakah cuma catalog atau ada CRUD nanti | Phase 5 implement read-only dulu, easy extend kalau backend tambah POST/PATCH |
| 6 | Backend response shape berbeda dari OpenAPI spec | Generate types pakai `openapi-typescript` dari yaml, validate runtime dengan Zod kalau perlu |
| 7 | rapiDSK backend belum ready saat development | Local Keycloak Docker tetap bisa dipakai untuk auth flow test. Backend mock pakai MSW kalau perlu. |
| 8 | Page yang dihapus mungkin masih dipakai user | User confirm sudah default delete (Q2). Git history tetap simpan. |

---

## 9. Open Questions (non-blocker)

| # | Pertanyaan | Owner |
|---|---|---|
| Q-A | `Organization.organization_type` — enum (e.g., KKKS/REGULATOR/PLATFORM) atau free string? | Backend |
| Q-B | `Dataset.classification` — enum (public/internal/restricted) atau free string? | Backend |
| Q-C | `Dataset.status` — enum apa saja (active/draft/archived)? | Backend |
| Q-D | `Provider.status` — enum apa saja? | Backend |
| Q-E | `Audit.action` — enum yang fixed atau free string (mis. `DATASET_ACCESSED`, `LOGIN_SUCCESS`)? | Backend |
| Q-F | `/audit/logs` apakah support filter param di future? Apa requirement? | Backend |
| Q-G | `MappingResult.confidence` — range 0-1 atau 0-100? Spec bilang `float` tapi tidak spesifik. | Backend |
| Q-H | `/arcgis/connect` apakah persistent connection atau ephemeral test? | Backend |
| Q-I | `Policy.classification` — enum apa saja? | Backend |

---

## 10. Folder Structure (Final)

```
src/
├── api/
│   ├── client.ts                 # Axios + Keycloak interceptor
│   ├── services/
│   │   ├── system.ts             # 🆕 health
│   │   ├── governance.ts         # ⚠️ rewrite — orgs + policies
│   │   ├── providers.ts          # 🆕
│   │   ├── data-catalog.ts       # ⚠️ rewrite — datasets + schemas + vocabularies
│   │   ├── mapping.ts            # 🆕
│   │   ├── arcgis.ts             # 🆕
│   │   ├── audit.ts              # 🆕
│   │   ├── identity-provider.ts  # ⚠️ minimal — kemungkinan dihapus
│   │   └── index.ts
│   ├── hooks/
│   │   ├── useOrganizations.ts   # ⚠️ rewrite
│   │   ├── useDatasets.ts        # ⚠️ rewrite
│   │   ├── useProviders.ts       # 🆕
│   │   ├── useSchemas.ts         # 🆕
│   │   ├── useVocabularies.ts    # 🆕
│   │   ├── useAutoMapping.ts     # 🆕
│   │   ├── useArcGIS.ts          # 🆕
│   │   ├── useAuditLogs.ts       # 🆕
│   │   ├── usePolicies.ts        # 🆕
│   │   └── index.ts
│   └── types/
│       ├── common.ts
│       ├── governance.ts         # ⚠️ rewrite
│       ├── data-catalog.ts       # ⚠️ rewrite
│       ├── providers.ts          # 🆕
│       ├── mapping.ts            # 🆕
│       ├── arcgis.ts             # 🆕
│       ├── audit.ts              # 🆕
│       └── index.ts
├── auth/
│   ├── keycloak.ts               # Keycloak singleton + helpers
│   └── KeycloakProvider.tsx      # React provider
├── pages/
│   ├── Dashboard.tsx             # ⚠️ data sources updated
│   ├── Login.tsx                 # ✅ done — pure SSO
│   ├── Organizations.tsx         # ⚠️ simplified
│   ├── Datasets.tsx              # ⚠️ rewritten flat
│   ├── Audit.tsx                 # ⚠️ wired to real /audit/logs
│   ├── Settings.tsx              # ⚠️ stripped users
│   ├── ApiDocs.tsx               # ⚠️ point to new spec
│   ├── Providers.tsx             # 🆕
│   ├── Schemas.tsx               # 🆕
│   ├── Vocabularies.tsx          # 🆕
│   ├── Mapping.tsx               # 🆕 (auto field mapping UI)
│   ├── ArcGISServices.tsx        # 🆕
│   ├── Policies.tsx              # 🆕
│   └── NotFound.tsx
├── config/
│   └── rbac.ts                   # ✅ canonical 7-role
├── context/
│   └── AuthContext.tsx           # ✅ Keycloak-aware
└── components/
    ├── auth/
    ├── layout/
    └── ui/                       # shadcn — TIDAK boleh diubah signature
```

---

## 11. Sign-off

| Role | Nama | Tanggal | Approval |
|---|---|---|---|
| Frontend Lead | Hendra Dinata | 2026-05-08 | ✅ (pivot decision) |
| Backend Lead | _(TBD)_ | | |
| UX/Product | _(TBD)_ | | |

---

## Changelog

- **v1 (2026-05-08)** — Initial plan after pivot dari SPEKTRUM coexistence ke single-backend rapiDSK Enterprise. Phase 1A/1B carry-over dari plan SPEKTRUM (Keycloak + canonical RBAC). Phase 1C cleanup SPEKTRUM scaffolding done. Phase 2-7 ahead.

---

## Reference

- Backend spec: [`rapidsk_full_openapi_enterprise_spec.md`](./rapidsk_full_openapi_enterprise_spec.md)
- Keycloak setup: [`../docker/keycloak/README.md`](../docker/keycloak/README.md)
- IAM role mapping: [`IAM_ROLE_MAPPING_MATRIX.md`](./IAM_ROLE_MAPPING_MATRIX.md) (still valid)
- Archived plan (historical): [`SPEKTRUM_Migration_Plan.md`](./SPEKTRUM_Migration_Plan.md)
