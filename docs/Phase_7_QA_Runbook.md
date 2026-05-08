# Phase 7 QA Runbook

> **Tujuan:** Verify frontend rapiDSK Enterprise + Keycloak SSO end-to-end.
> **Mode:** Manual smoke test — checklist actionable.
> **Estimasi:** 30-60 menit untuk full pass.

---

## Pre-flight Checklist

Sebelum mulai test, pastikan:

- [ ] Docker Desktop running di Windows
- [ ] Port `8080` (Keycloak), `8282` (Vite dev — set di vite.config.ts), `8000` (rapiDSK Enterprise backend) tidak conflict dengan aplikasi lain
- [ ] `npm run build` sukses (sudah verified di repo)
- [ ] `.env` punya `VITE_KEYCLOAK_URL`, `VITE_KEYCLOAK_REALM`, `VITE_KEYCLOAK_CLIENT_ID`

### Start services

```powershell
# 1. Start Keycloak Docker (tunggu ~60 detik first boot)
docker compose -f docker/keycloak/docker-compose.yml up -d
docker compose -f docker/keycloak/docker-compose.yml logs -f keycloak
# Tunggu sampai "Keycloak ... started" muncul, lalu Ctrl+C

# 2. Start dev server
npm run dev
# Buka http://localhost:8282 (port set di vite.config.ts)

# 3. (Optional) Start backend rapiDSK Enterprise di localhost:8000
# Tergantung setup backend tim — di luar scope frontend QA.
```

---

## Test Levels

| Level | Backend dependency | Coverage |
|---|---|---|
| **L1** | None (frontend only) | Page render, sidebar, routing, error states |
| **L2** | Keycloak Docker | Login flow, JWT claims, role-based menu |
| **L3** | rapiDSK Enterprise backend | Full data integration, CRUD, real-time |

---

## L1 — Visual Smoke Test (no backend needed)

**Goal:** Setiap page render tanpa crash, error state muncul saat backend unreachable.

| # | Page | URL | Expected (no backend) |
|---|---|---|---|
| 1 | Login | `/login` | Split-panel layout, logo "rapiDSK", "Sign in with Enterprise SSO" amber button, marketing panel kanan, trust badges |
| 2 | Dashboard | `/` (after auth) | 4 stat cards menampilkan "—" + "Backend unreachable" karena tidak ada backend; layout intact |
| 3 | Organizations | `/organizations` | "Failed to load organizations" error state dengan tombol Try Again |
| 4 | Providers | `/providers` | "Failed to load providers" |
| 5 | Datasets | `/datasets` | "Failed to load datasets" |
| 6 | Schemas | `/schemas` | "Failed to load schemas" |
| 7 | Vocabularies | `/vocabularies` | "Failed to load vocabularies" |
| 8 | Auto Mapping | `/mapping` | Empty state: "No mapping yet — Enter source fields → Auto Map". Form input area kiri renders. |
| 9 | ArcGIS Services | `/arcgis` | Connect form kiri renders. Right panel: "Failed to discover layers" |
| 10 | Governance Policies | `/policies` | "Failed to load policies" |
| 11 | Audit Trail | `/audit` | "Failed to load audit logs" |
| 12 | Settings | `/settings` | Form sections render (no API dep) |
| 13 | API Docs | `/api-docs` | Loads dari `public/openapi.json` fallback (rapiDSK Enterprise spec, 12 endpoint, 12 categories) |
| 14 | Logout | (header dropdown) | Tombol "Log out" → trigger Keycloak logout redirect |

### Visual identity check

- [ ] Color scheme: amber accent (#f59e0b) + dark navy panels di Login
- [ ] Sidebar: 11 menu items terlihat, icon match dengan label
- [ ] Header: avatar + nama user + role badge muncul
- [ ] Hover states pada table rows
- [ ] Loading spinner amber saat fetch in flight
- [ ] Empty states proper icon + text (bukan blank screen)

---

## L2 — Auth Flow (Keycloak Docker required)

**Goal:** Login/logout flow + JWT claims working correctly.

### Setup
```powershell
docker compose -f docker/keycloak/docker-compose.yml up -d
# Verify health
curl http://localhost:9000/health/ready
```

### Test scenarios

#### L2.1 — Login redirect
1. Open `http://localhost:8282/login` (incognito untuk fresh session)
2. Click **"Sign in with Enterprise SSO"** amber button
3. Browser **redirect** ke `http://localhost:8080/realms/spektrum/...`
4. ✅ Verify URL berubah ke Keycloak login page (dark theme dengan SPEKTRUM realm name)

#### L2.2 — Successful login (per role)

Test SETIAP sample user di realm. Expected behavior:

| Username | Password | Expected canonical roles | Expected menu visible |
|---|---|---|---|
| `superadmin` | `password` | `["SUPER_ADMIN"]` | Semua 11 menu |
| `admin` | `password` | `["ADMIN"]` | Semua 11 menu |
| `provider` | `password` | `["PROVIDER"]` | 9 menu (no Organizations, no Audit) |
| `consumer` | `password` | `["CONSUMER"]` | 8 menu (no Organizations, no Mapping, no ArcGIS, no Audit) |
| `viewer` | `password` | `["VIEWER"]` | 8 menu (read-only access) |
| `auditor` | `password` | `["AUDITOR"]` | 8 menu (Audit Trail visible, no Mapping/ArcGIS) |
| `gis_analyst` | `password` | `["GIS_ANALYST", "CONSUMER"]` | 9 menu (CONSUMER + GIS_ANALYST union, ArcGIS visible) |

For each user:
1. Login dengan credential di atas
2. Browser redirect kembali ke `http://localhost:8282/`
3. ✅ Header avatar/nama match user
4. ✅ Role badge sesuai (atau "Multi-role" untuk gis_analyst)
5. ✅ Sidebar tampilkan menu sesuai matrix di atas
6. Logout, repeat dengan user berikutnya

#### L2.3 — JWT claims inspection
1. Login as `consumer`
2. Open DevTools → Application → Storage → Local Storage `kc-callback-...`
3. Decode JWT di `https://jwt.io`
4. ✅ Verify claims:
   - `realm_access.roles` contains `"CONSUMER"`
   - `permissions` array: `["access-request.create", "gis.query", "gis.export"]`
   - `participant_id`: `"part-002"`
   - `participant.organization_name`: `"SKK Migas"`
   - `email`: `"consumer@regulator.go.id"`

#### L2.4 — Token refresh
1. Login as any user
2. Wait until token expire approaching (default 1 hour, atau check `exp` claim)
3. Trigger any API call (mis. navigate to /datasets which fetches /datasets)
4. ✅ Network tab: liat `Authorization: Bearer <token>` — token harusnya auto-refreshed (new token, new exp)

#### L2.5 — Logout
1. Click header avatar → "Log out"
2. ✅ Browser redirect ke Keycloak logout endpoint
3. ✅ Lalu redirect kembali ke `/login`
4. ✅ Local storage `kc-callback-*` dibersihkan
5. ✅ Tombol back browser → tidak bisa kembali (session invalid)

#### L2.6 — Direct URL access (route guard)
1. Login as `viewer`
2. Manually navigate ke `/organizations` (yang viewer ga punya akses)
3. ✅ Browser redirect ke `/` (Dashboard) — RoleGuard active

---

## L3 — Backend Integration (rapiDSK Enterprise required)

**Goal:** Full CRUD + read flows dengan backend live.

### Setup
- rapiDSK Enterprise backend running di `localhost:8000`
- Login as `admin` (or `superadmin`)

### Test per page

#### L3.1 — Dashboard
- [ ] 4 stat cards menampilkan **angka real** (bukan "—") untuk Organizations, Datasets, Providers, Audit Events Today
- [ ] System Status:
  - API Gateway: `Operational` (dot hijau) — `useSystemHealth` poll tiap 30s
  - Identity Provider: `Operational`
  - ArcGIS Connector: `Operational`
  - Audit Pipeline: `Operational`
- [ ] Compliance Status (3 cards) — static, tetap menampilkan ISO 27001 / COBIT/ITIL / SKK Migas

#### L3.2 — Organizations (`/organizations`)
- [ ] Stat cards: Total Organizations / Showing Results / Organization Types — angka match
- [ ] Table populated dengan semua organisasi
- [ ] Search input filter client-side works
- [ ] Click "Add Organization" → dialog opens
- [ ] Submit form dengan `organization_name` saja → POST sukses, table refresh, toast "Organization created successfully"
- [ ] Click row dropdown → "View Details" → dialog tampil dengan organization_id mono
- [ ] Edit/Delete actions: ✅ tidak ada (correct — spec ga support)

#### L3.3 — Providers (`/providers`)
- [ ] Read-only table populated
- [ ] Status badges color-coded (active/inactive/suspended/etc.)
- [ ] Search filter works
- [ ] Refresh button refetch

#### L3.4 — Dataset Catalog (`/datasets`)
- [ ] Default view: Grid mode dengan card per dataset
- [ ] Toggle ke List mode (icon top-right toolbar) → Table view
- [ ] Stat cards: Total Datasets / Showing Results / Classifications
- [ ] Search filter (dataset_name, schema_name, provider_name)
- [ ] Filter popover: Classification + Status dropdowns dipopulasi dari distinct values
- [ ] Click "Register Dataset" → dialog opens
- [ ] Submit form (dataset_name, schema_name, provider_id) → POST sukses, list refresh
- [ ] Click card / row → View dialog opens dengan dataset_id mono
- [ ] Classification badge color match (public=emerald, internal=blue, restricted=amber, confidential=rose)

#### L3.5 — Schemas (`/schemas`)
- [ ] Read-only table populated
- [ ] Version badge tampil sebagai `v{X}`
- [ ] Stat: Versions count = distinct version values

#### L3.6 — Vocabularies (`/vocabularies`)
- [ ] Read-only table dengan kolom: Term, →, Canonical Name, ID
- [ ] Search filter both term dan canonical_name
- [ ] Stat: Total Terms / Canonical Names count

#### L3.7 — Auto Mapping (`/mapping`) — **fitur unggulan**
- [ ] Left panel: source fields textarea
- [ ] Input multi-line (one field per line):
  ```
  well_name
  production_volume
  spud_date
  ```
- [ ] Click **"Auto Map"** (amber button)
- [ ] Loading spinner muncul
- [ ] Result panel kanan: 4 stat cards (Total / High ≥80% / Medium 60-79% / Low <60%) update
- [ ] Result table: 3 kolom (Source Field → Canonical Field, Confidence)
- [ ] Confidence visualization: progress bar color-coded:
  - **emerald** ≥80%
  - **amber** 60-79%
  - **orange** 40-59%
  - **rose** <40%
- [ ] Threshold slider (0-100%, step 5) → real-time hide rows below threshold
- [ ] Filter input → search source / canonical
- [ ] **Copy JSON** button → clipboard contains `{ mappings: [...] }`
- [ ] **Download CSV** button → download file `mapping_results_{date}.csv`
- [ ] Clear button (trash icon) → reset semua state

#### L3.8 — ArcGIS Services (`/arcgis`)
- [ ] Left panel: Connect form (service_name, service_url, Connect button)
- [ ] Right panel: 3 stat cards + Layers table
- [ ] Submit Connect form → POST sukses → toast "ArcGIS service connected" → Layers refetched
- [ ] Layers table: layer_name, geometry_type badge, layer_id
- [ ] Geometry type badge color-coded (point=blue, polyline=emerald, polygon=amber, multipoint=violet)
- [ ] Refresh Layers button → manual refetch

#### L3.9 — Governance Policies (`/policies`)
- [ ] Read-only table populated
- [ ] Classification filter dropdown
- [ ] Classification badge color-coded (sama dengan Datasets)

#### L3.10 — Audit Trail (`/audit`)
- [ ] 4 stat cards: Total Events / Today / Action Types / Distinct Performers
- [ ] Table: Timestamp, Action (with icon), Performed By, Audit ID
- [ ] Action icon mapping bekerja (DATA_*=Eye, USER_*=User, DATASET_*=Database, etc.)
- [ ] Search filter
- [ ] Date picker filter (client-side, by ISO date prefix)
- [ ] Filter popover: Action dropdown populated dari distinct values
- [ ] Click row → View dialog dengan audit_id (copyable)
- [ ] Export CSV / JSON works

#### L3.11 — API Docs (`/api-docs`)
- [ ] Header: "rapiDSK Enterprise API v1.0.0"
- [ ] Connection status: Connected (green) saat backend live
- [ ] Source: Live Backend
- [ ] Total endpoints: 12
- [ ] Categories: 12 tags terlihat
- [ ] Search filter berfungsi
- [ ] "Swagger UI" button → buka tab baru ke `localhost:8000/docs` (FastAPI Swagger)

---

## Defect log

| # | Page / flow | Severity | Description | Status |
|---|---|---|---|---|
| | | | | |

> Severity: 🔴 Critical (blocker) / 🟡 Major (broken feature) / 🟠 Minor (visual/edge) / 🔵 Trivial

---

## Cleanup setelah QA

```powershell
# Stop Vite dev server (Ctrl+C di terminal yang running npm run dev)

# Stop Keycloak (data tetap)
docker compose -f docker/keycloak/docker-compose.yml down

# Reset Keycloak total (hapus user state — kalau perlu test ulang fresh)
docker compose -f docker/keycloak/docker-compose.yml down -v
```

---

## Sign-off

- [ ] L1 (Visual smoke) — passed: _______ failed: _______
- [ ] L2 (Auth flow) — passed: _______ failed: _______
- [ ] L3 (Backend integration) — passed: _______ failed: _______ skipped: _______

**Tester:** ____________________
**Date:** ____________________
**Notes:** ____________________

---

*Generated 2026-05-08 — Phase 7 QA Runbook*
