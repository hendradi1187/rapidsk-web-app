# Analisis Backend: Apa yang Belum Siap

> **Dokumen ini dibuat berdasarkan analisis frontend codebase rapiDSK.**
> Digunakan sebagai bahan diskusi dengan tim backend sebelum implementasi RBAC & Admin Console.

---

## Ringkasan Status Service

| Service | Status | Keterangan |
|---|:---:|---|
| Identity Provider (Auth) | ⚠️ Partial | Ada, tapi JWT tidak punya `role` / `org_id` |
| Governance (Orgs + Domains) | ⚠️ Partial | Ada CRUD, tapi tidak ada status org / filter user |
| Onboarding (Participants) | ✅ Cukup | CRUD lengkap |
| Data Catalog | ⚠️ Partial | Ada, tapi tidak ada cross-org visibility |
| Policy & Contract | ⚠️ Partial | Ada CRUD, tapi tidak ada approval workflow |
| Data Transfer | ⚠️ Partial | Ada, path URL perlu dikonfirmasi ulang |
| Consumer / Provider | ⚠️ Partial | Hanya GET, tidak ada initiate transfer |
| Audit Trail | ❌ Tidak ada | Halaman pakai **mock data hardcoded** |
| Compliance | ❌ Tidak ada | Halaman pakai **mock data hardcoded** |
| Monitoring | ❌ Tidak ada | Type ada, service tidak ada |
| Token Refresh | ❌ Tidak ada | Belum ada endpoint |
| MFA | ❌ Tidak ada | Belum ada |

---

## Detail Per Service

---

### 1. Identity Provider — `KRITIS untuk RBAC`

**Base path:** `/api/v1/identity-provider/`

**Yang sudah ada:**
- `POST /auth/login` → return `access_token` + user (`id`, `email`, `full_name`, `category`, `group`)
- `POST /auth/external-login` (SSO placeholder)
- `POST /auth/validate`
- Users CRUD: `list`, `getById`, `create`, `update`, `delete`

**Yang BELUM ada / PERLU DIUBAH:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | `role` + `org_id` + `org_type` di JWT / LoginResponse | Modify response `POST /auth/login` | 🔴 Critical |
| 2 | List users per organisasi | `GET /users/?org_id={id}` | 🔴 Critical |
| 3 | Assign / change role user | `PATCH /users/{id}/role` | 🔴 Critical |
| 4 | Invite user via email | `POST /users/invite` | 🟡 High |
| 5 | Token refresh | `POST /auth/refresh` | 🟡 High |
| 6 | Suspend / activate user | `PATCH /users/{id}/status` | 🟡 High |
| 7 | Force logout user (oleh admin) | `POST /users/{id}/logout` | 🟠 Medium |
| 8 | Reset password | `POST /users/{id}/reset-password` | 🟠 Medium |
| 9 | MFA setup & verify | `POST /auth/mfa/setup` dan `/auth/mfa/verify` | 🔵 Low |

**Modifikasi yang dibutuhkan pada `LoginResponse`:**

```json
// Saat ini:
{
  "access_token": "...",
  "user": {
    "id": "...",
    "email": "...",
    "full_name": "...",
    "category": { "name": "...", "code": "...", "description": "..." },
    "group": { "name": "...", "code": "...", "description": "...", "priority": 1 }
  }
}

// Yang dibutuhkan — field tambahan:
{
  "access_token": "...",
  "user": {
    "id": "...",
    "email": "...",
    "full_name": "...",
    "role": "SYSTEM_ADMIN | ORG_ADMIN | ORG_USER",    // ← BARU
    "org_id": "uuid",                                  // ← BARU
    "org_name": "KKKS XYZ",                            // ← BARU
    "org_type": "ENTERPRISE | GOV_CENTRAL | PLATFORM", // ← BARU
    "category": { ... },
    "group": { ... }
  }
}
```

---

### 2. Governance — `HIGH`

**Base path:** `/api/v1/governance/`

**Yang sudah ada:** Organizations CRUD, Domains CRUD (nested under org)

**Yang BELUM ada:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | Suspend / Activate organisasi | `PATCH /organizations/{id}/status` | 🔴 Critical |
| 2 | List users dalam 1 organisasi | `GET /organizations/{id}/users` | 🔴 Critical |
| 3 | Setup progress per organisasi | `GET /organizations/{id}/setup-status` | 🟡 High |
| 4 | Stats platform-wide (untuk Admin) | `GET /organizations/stats` | 🟡 High |

---

### 3. Data Catalog — `MEDIUM`

**Base path:** `/api/v1/data-catalog/{domain_id}/`

**Yang sudah ada:** Vocabularies, Schemas, Datasets, Dataset Metadata — semua CRUD lengkap

**Yang BELUM ada:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | Dataset lintas domain (untuk SKK Migas & Admin) | `GET /data-catalog/datasets?visibility=public` | 🟡 High |
| 2 | Set access level per dataset | Tambah field `access_level` di Dataset model | 🟡 High |

---

### 4. Policy & Contract — `HIGH`

**Base path:** `/api/v1/policy-contract/{domain_id}/`

**Yang sudah ada:** Dataset Policies, Contracts, Contract Policies, Agreements — CRUD lengkap

**Yang BELUM ada:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | Approve / Reject contract request (oleh provider) | `POST /contracts/{id}/approve` dan `/contracts/{id}/reject` | 🔴 Critical |
| 2 | Regulatory approval oleh SKK Migas (untuk contract KKKS ↔ KKKS) | `POST /contracts/{id}/regulatory-approve` | 🔴 Critical |
| 3 | Contract status transitions | Field `status` harus support: `PENDING → APPROVED → ACTIVE → TERMINATED` | 🟡 High |
| 4 | Lihat semua contract lintas domain (untuk SKK & Admin) | `GET /policy-contract/contracts?scope=all` | 🟡 High |

---

### 5. Data Transfer — `PERLU KONFIRMASI PATH`

**Path saat ini di frontend:** `/api/v1/{domain_id}/data-transfers`

> ⚠️ Path ini **kemungkinan salah** — tidak mengikuti pola service lain.
> Harap dikonfirmasi ke tim backend, apakah:
> - `/api/v1/data-transfer/{domain_id}/transfers` (mengikuti pola naming), atau
> - Memang `/api/v1/{domain_id}/data-transfers`

**Yang BELUM ada:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | Transfer status management (suspend, cancel) | `PATCH /transfers/{id}/status` | 🟡 High |
| 2 | Lihat semua transfer lintas org (untuk Admin / SKK) | `GET /transfers?scope=all` | 🟠 Medium |
| 3 | Initiate consume oleh consumer | `POST /consumer/{domain_id}/initiate` | 🟡 High |

---

### 6. Audit Trail — `TIDAK ADA` ❌

**Status saat ini:** Halaman `Audit.tsx` menggunakan **data hardcoded** di dalam file.
Tidak ada service file, tidak ada koneksi ke backend sama sekali.

**Yang perlu dibuat dari nol:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | List audit logs dengan filter | `GET /api/v1/audit/logs?org_id=&action=&startDate=&endDate=` | 🔴 Critical |
| 2 | Detail satu audit log | `GET /api/v1/audit/logs/{id}` | 🟡 High |
| 3 | Ringkasan statistik audit | `GET /api/v1/audit/stats` | 🟡 High |
| 4 | Export audit logs | `GET /api/v1/audit/logs/export?format=csv` | 🟠 Medium |

---

### 7. Compliance — `TIDAK ADA` ❌

**Status saat ini:** Halaman `Compliance.tsx` menggunakan **data framework hardcoded**
(GAIA-X, ISO 27001, GDPR, dll). Tidak ada service, tidak ada API.

**Yang perlu dibuat dari nol:**

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | List compliance frameworks | `GET /api/v1/compliance/frameworks` | 🟡 High |
| 2 | Status compliance per organisasi | `GET /api/v1/compliance/status?org_id=` | 🟡 High |
| 3 | Generate compliance report | `GET /api/v1/compliance/report` | 🟠 Medium |

---

### 8. Monitoring — `TIDAK ADA` ❌

Type `MonitoringConfig` sudah ada di frontend, tapi tidak ada service dan tidak ada halaman yang benar-benar menggunakannya.

| # | Yang Dibutuhkan | Endpoint | Priority |
|---|---|---|:---:|
| 1 | Platform health check | `GET /api/v1/monitoring/health` | 🟠 Medium |
| 2 | Real-time metrics | `WebSocket /api/v1/monitoring/stream` atau polling | 🔵 Low |

---

## Prioritas untuk Tim Backend

> Urutkan berdasarkan kebutuhan implementasi RBAC & Admin Console di frontend.

### 🔴 Critical — Tanpa ini, frontend RBAC tidak bisa jalan
1. Tambah `role` + `org_id` + `org_type` di `LoginResponse`
2. Endpoint suspend / activate organisasi
3. List users per organisasi
4. Contract approve / reject endpoint

### 🟡 High — Untuk Admin Console berfungsi penuh
5. Audit Trail API (dari nol)
6. Invite user via email
7. Cross-domain dataset visibility
8. Contract regulatory approval oleh SKK Migas

### 🟠 Medium — Nice to have sebelum launch
9. Token refresh endpoint
10. Compliance API (dari nol)
11. Cross-org transfer visibility
12. Setup progress per organisasi

### 🔵 Low — Post-launch
13. MFA (setup & verify)
14. WebSocket monitoring
15. Audit log export (CSV/JSON)

---

*Dokumen dibuat: Februari 2026 — rapiDSK Frontend Team*
