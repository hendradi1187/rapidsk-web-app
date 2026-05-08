# IAM Role Mapping Matrix

> **Single source of truth** untuk role/permission mapping antara legacy rapiDSK dan SPEKTRUM canonical model.
> **Owner:** Backend + IAM team
> **Consumed by:** Frontend (`config/rbac.ts`), IAM mapper (Keycloak attribute mapper), backend authorization middleware
> **Status:** 🟡 DRAFT — perlu role inventory dari production rapiDSK

---

## 1. Tujuan

Menjadi rujukan tunggal untuk:

1. **Daftar legacy rapiDSK role** yang aktif di production
2. **Canonical role mapping** (rapiDSK legacy → SPEKTRUM canonical)
3. **Permission allocation** per canonical role
4. **Sidebar visibility** per canonical role
5. **Route access** per canonical role
6. **Feature gating** per canonical role + permission

Dokumen ini WAJIB di-sign-off sebelum:
- Phase 5 (sidebar generation) di frontend
- IAM mapper deployment di Keycloak
- Backend RBAC middleware finalization

---

## 2. Canonical Role Definitions (FROZEN)

7 canonical role yang dipakai di seluruh ekosistem (rapiDSK + SPEKTRUM). Frontend HANYA mengenal role ini.

| Canonical Role | Deskripsi | Scope |
|---|---|---|
| `SUPER_ADMIN` | Platform-level admin, akses penuh | Cross-org, semua action |
| `ADMIN` | Organization-level admin | Single-org, manage participants/datasets/approve requests |
| `PROVIDER` | Data provider participant | Register & manage own datasets, approve incoming requests |
| `CONSUMER` | Data consumer participant | Browse catalog, request access, gunakan dataset granted |
| `VIEWER` | Read-only user | Browse catalog, lihat status, no actions |
| `AUDITOR` | Compliance/audit officer | Read audit logs, consent ledger, governance views |
| `GIS_ANALYST` | Spatial data power user | GIS query + spatial query + export |

---

## 3. Legacy rapiDSK Role Inventory

> **TO BE FILLED by Backend/DBA team.**
>
> Jalankan query berikut di production rapiDSK database, lalu paste hasilnya di kolom "Legacy Role Name".

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

### Inventory hasil

| # | Legacy Role Name | User Count (prod) | Catatan / Deskripsi |
|---|---|--:|---|
| 1 | _(TBD — DBA fill)_ | _N_ | _(catatan dari backend)_ |
| 2 | | | |
| 3 | | | |
| 4 | | | |
| 5 | | | |
| 6 | | | |
| 7 | | | |
| 8 | | | |

> **Catatan:** Hapus baris yang tidak terpakai. Tambah baris kalau lebih dari 8 role.

---

## 4. Canonical Mapping Table

> **Aturan penting:** Satu legacy role boleh map ke **satu atau lebih** canonical role. Jika business responsibility overlap, pakai array.

### Mapping (TO BE FILLED + SIGNED OFF)

| # | Legacy rapiDSK Role | → | Canonical Role(s) | Justifikasi |
|---|---|---|---|---|
| 1 | _(legacy_1)_ | → | `[?]` | _(kenapa map ke ini)_ |
| 2 | _(legacy_2)_ | → | `[?]` | |
| 3 | | → | | |
| 4 | | → | | |
| 5 | | → | | |
| 6 | | → | | |

### Contoh isian (referensi)

| Legacy rapiDSK Role | → | Canonical Role(s) | Justifikasi |
|---|---|---|---|
| `SUPER_ADMIN` | → | `["SUPER_ADMIN"]` | 1-to-1 platform admin |
| `ORG_ADMIN` | → | `["ADMIN"]` | 1-to-1 org admin |
| `DOMAIN_ADMIN` | → | `["ADMIN", "PROVIDER"]` | Domain admin manages dataset registration + approves requests |
| `DATA_PROVIDER` | → | `["PROVIDER"]` | 1-to-1 |
| `DATA_CONSUMER` | → | `["CONSUMER"]` | 1-to-1 |
| `READONLY` | → | `["VIEWER"]` | Read-only ke catalog |
| `ORG_USER` | → | `["VIEWER"]` | Default user, baseline read |
| `GIS_USER` | → | `["GIS_ANALYST"]` | Power user spatial |
| `AUDITOR_RO` | → | `["AUDITOR"]` | 1-to-1 |
| `AUDITOR_GIS` | → | `["AUDITOR", "GIS_ANALYST"]` | Audit + GIS query |

---

## 5. Permission Allocation per Canonical Role

> **TO BE REFINED bersama backend.**
>
> Tabel ini menentukan permission default yang di-attach saat IAM mapper menghasilkan JWT untuk user dengan role tertentu.

### Permission catalog (final)

| Permission Key | Untuk Action |
|---|---|
| `participant.register` | Register participant baru |
| `participant.activate` | Activate participant pending |
| `dataset.register` | Register dataset baru |
| `dataset.view-permissions` | Lihat tab permissions di dataset detail |
| `access-request.create` | Submit access request |
| `access-request.approve` | Approve incoming request |
| `access-request.reject` | Reject incoming request |
| `consent.read` | Lihat consent ledger |
| `consent.revoke` | Revoke consent yang granted |
| `gis.query` | Run GIS attribute & spatial query |
| `gis.export` | Download GeoJSON |
| `audit.read` | Akses audit logs + filter |

### Default permission per canonical role

| Canonical Role | Default Permissions |
|---|---|
| `SUPER_ADMIN` | **ALL** — semua permission |
| `ADMIN` | `participant.register`, `participant.activate`, `dataset.register`, `dataset.view-permissions`, `access-request.approve`, `access-request.reject`, `consent.read`, `consent.revoke`, `audit.read` |
| `PROVIDER` | `dataset.register`, `dataset.view-permissions`, `access-request.approve`, `access-request.reject`, `consent.read`, `consent.revoke` |
| `CONSUMER` | `access-request.create`, `gis.query`, `gis.export` |
| `VIEWER` | _(empty — hanya navigation, no actions)_ |
| `AUDITOR` | `audit.read`, `consent.read` |
| `GIS_ANALYST` | `gis.query`, `gis.export` |

> Permissions bersifat **additive** — kalau user punya multiple roles (mis. `["CONSUMER", "GIS_ANALYST"]`), permissions adalah union.

---

## 6. Sidebar Visibility Matrix

Setiap menu di sidebar punya `roles[]` (any-of). Tabel di bawah konsolidasi default visibility.

### Legacy section (`section: "legacy"`)

| Menu Item | Visible untuk Canonical Role |
|---|---|
| Dashboard | semua |
| Onboarding | `SUPER_ADMIN` |
| Organizations | `SUPER_ADMIN` |
| Domains | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| Participants | `SUPER_ADMIN`, `ADMIN` |
| Dataset Catalog | semua |
| Contracts | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| Data Transfer | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| Audit Trail | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` |
| Compliance | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` |
| API Docs | semua |

### SPEKTRUM section (`section: "spektrum"`)

| Menu Item | Visible untuk Canonical Role | Permission Gate (opsional) |
|---|---|---|
| Dashboard | semua | — |
| Participants | `SUPER_ADMIN`, `ADMIN` | — |
| Dataset Catalog | semua | — |
| Access Requests | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` | — |
| Consents | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `AUDITOR` | `consent.read` |
| GIS Explorer | `SUPER_ADMIN`, `ADMIN`, `GIS_ANALYST`, `PROVIDER`, `CONSUMER` | `gis.query` |
| Audit Trail | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` | `audit.read` |
| API Docs | semua | — |

---

## 7. Route Access Matrix

Path-level guard yang dipakai `ProtectedRoute` + `RoleGuard`.

### Legacy paths

| Path | Required Roles |
|---|---|
| `/` | semua |
| `/onboarding` | `SUPER_ADMIN` |
| `/organizations` | `SUPER_ADMIN` |
| `/domains` | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| `/participants` | `SUPER_ADMIN`, `ADMIN` |
| `/datasets` | semua |
| `/contracts` | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| `/transfer` | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| `/audit` | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` |
| `/compliance` | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` |
| `/api-docs` | semua |
| `/settings` | semua |

### SPEKTRUM paths

| Path | Required Roles |
|---|---|
| `/spektrum` | semua |
| `/spektrum/participants` | `SUPER_ADMIN`, `ADMIN` |
| `/spektrum/datasets` | semua |
| `/spektrum/datasets/:id` | semua |
| `/spektrum/access-requests` | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `CONSUMER` |
| `/spektrum/consents` | `SUPER_ADMIN`, `ADMIN`, `PROVIDER`, `AUDITOR` |
| `/spektrum/gis-explorer` | `SUPER_ADMIN`, `ADMIN`, `GIS_ANALYST`, `PROVIDER`, `CONSUMER` |
| `/spektrum/audit` | `SUPER_ADMIN`, `ADMIN`, `AUDITOR` |

---

## 8. Feature Gating (UI-level button visibility)

Tombol/section dalam halaman di-gate by **role** + (optional) **permission**. Untuk fitur GIS, kombinasi dengan **dataset capability** (LB8).

### Per-feature gate

| Feature | Page | Required Role(s) | Required Permission | Required Dataset Capability |
|---|---|---|---|---|
| Register Participant | Participants | `SUPER_ADMIN`, `ADMIN` | `participant.register` | — |
| Activate Participant | Participants | `SUPER_ADMIN`, `ADMIN` | `participant.activate` | — |
| Register Dataset | Datasets | `SUPER_ADMIN`, `ADMIN`, `PROVIDER` | `dataset.register` | — |
| Tab Permissions | DatasetDetail | `SUPER_ADMIN`, `ADMIN`, `PROVIDER` | `dataset.view-permissions` | — |
| Request Access | DatasetDetail | `CONSUMER`, `GIS_ANALYST` | `access-request.create` | — |
| Approve Request | AccessRequests | `SUPER_ADMIN`, `ADMIN`, `PROVIDER` | `access-request.approve` | — |
| Reject Request | AccessRequests | `SUPER_ADMIN`, `ADMIN`, `PROVIDER` | `access-request.reject` | — |
| Revoke Consent | Consents | `SUPER_ADMIN`, `ADMIN`, `PROVIDER` | `consent.revoke` | — |
| Run GIS Query | GISExplorer | `GIS_ANALYST`, `CONSUMER`, `PROVIDER`, `ADMIN`, `SUPER_ADMIN` | `gis.query` | `query` |
| Run Spatial Query | GISExplorer | same | `gis.query` | `spatial_filter` |
| Export GeoJSON | GISExplorer | same | `gis.export` | `export` |

---

## 9. JWT Claim Format (sample)

JWT yang di-issue Keycloak/IAM setelah role mapping:

```json
{
  "sub": "user-uuid-1234",
  "preferred_username": "alice@phe.co.id",
  "email": "alice@phe.co.id",
  "name": "Alice Wijaya",
  "participant": {
    "participant_id": "part-001",
    "organization_name": "PHE ONWJ",
    "role_type": "provider"
  },
  "roles": ["PROVIDER", "GIS_ANALYST"],
  "permissions": [
    "dataset.register",
    "dataset.view-permissions",
    "access-request.approve",
    "access-request.reject",
    "consent.read",
    "consent.revoke",
    "gis.query",
    "gis.export"
  ],
  "exp": 1730000000,
  "iat": 1729996400
}
```

> Kalau `permissions[]` terlalu besar dan bikin JWT membengkak, pindahkan ke `GET /userinfo` endpoint (lihat IAM-4 di migration plan).

---

## 10. Edge Cases & Fallback Rules

### Legacy role tidak ada di mapping table

**Skenario:** User prod login dengan role legacy yang tidak terdaftar di Section 4 (mis. role hasil migrasi lama yang terlewat di inventory).

**Behaviour:** IAM mapper return JWT dengan `roles: ["VIEWER"]` (fallback aman). Audit log entry dibuat dengan tag `unmapped-legacy-role`.

**Action:** monitoring dashboard report unmapped role; backend team update mapping table di patch berikutnya.

### User punya banyak legacy role

**Skenario:** User punya `["ORG_ADMIN", "DATA_PROVIDER", "GIS_USER"]` di rapiDSK.

**Behaviour:** Mapper apply semua 3 mapping → union → deduplicate canonical:

```
ORG_ADMIN     → ["ADMIN"]
DATA_PROVIDER → ["PROVIDER"]
GIS_USER      → ["GIS_ANALYST"]
─────────────────────────────────
Final JWT roles: ["ADMIN", "PROVIDER", "GIS_ANALYST"]
```

Permissions = union dari semua canonical role.

### Role di rapiDSK dihapus tapi user masih ada

**Skenario:** Role `DEPRECATED_ROLE` di-soft-delete di rapiDSK tapi user reference masih ada.

**Behaviour:** Treat sebagai unmapped → fallback ke `VIEWER`.

### SPEKTRUM-only user (tidak pernah ada di rapiDSK)

**Skenario:** User baru yang langsung di-create di SPEKTRUM, tidak pernah punya legacy role.

**Behaviour:** Mapper langsung pakai role yang di-set di SPEKTRUM, tidak butuh translation.

---

## 11. Sign-off Checklist

Sebelum dokumen ini dianggap **frozen**:

- [ ] Section 3 — role inventory dari prod sudah diisi
- [ ] Section 4 — canonical mapping table lengkap (tiap legacy role punya target canonical)
- [ ] Section 5 — permission allocation di-review dan disetujui owner business
- [ ] Section 6 — sidebar visibility tidak break existing user (cross-check dengan sample user)
- [ ] Section 7 — route access matrix sesuai security policy
- [ ] Section 8 — feature gating sesuai LB8 (capability AND permission)
- [ ] Section 9 — JWT claim sample sudah di-test dengan IAM mapper di staging
- [ ] Section 10 — fallback rules disepakati (terutama unmapped legacy role behaviour)

### Approvals

| Role | Nama | Tanggal | Tanda tangan / approval link |
|---|---|---|---|
| Backend Lead | | | |
| IAM/Infra Lead | | | |
| Frontend Lead | | | |
| Security Officer | | | |
| Product Owner | | | |

---

## 12. Changelog

| Version | Date | Author | Changes |
|---|---|---|---|
| 0.1 (DRAFT) | 2026-05-07 | rapiDSK Frontend Team | Initial template — menunggu role inventory dari DBA |
| | | | |

---

*Template berdasarkan keputusan IAM-3 + IAM-6 di [`SPEKTRUM_Migration_Plan.md`](./SPEKTRUM_Migration_Plan.md)*
*Status: 🟡 DRAFT — perlu role inventory dari production rapiDSK + sign-off semua stakeholder*
