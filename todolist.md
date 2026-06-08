# TODO — Integrasi FE rapidsk-web-app ↔ GX-Space (SKK Migas ⇄ KKKS)

> Dataspace data-exchange untuk migas. FE = pertukaran data murni (tanpa peta; OGC
> dikonsumsi app pihak ke-3). **Prinsip: jangan improvisasi — selalu pakai field/endpoint BE nyata.**

## Akun uji (fabric lokal, sudah ter-seed)
- **SKK Migas** (consumer/regulator): `skkmigas` / `SkkMigas123!` → SUPER_ADMIN (participant_id = null)
- **KKKS PHE** (provider): `phe` / `Phe12345!` → PROVIDER (participant = PHE)

## ID kunci (fabric lokal — re-derivable via API)
- Domain `MIGAS-GEO`: `abc99300-93c0-49cd-b37e-4aeebc7316b1`
- Participant **PHE** (provider): `87eb189b-3f96-4d44-818f-a2966e908324`
- Participant **SKK Migas** (consumer): `da9dad83-897b-4e57-800c-7dc174034fca`
- Governance org SKK Migas: `e87717c1-3024-47ae-8e83-12f407ab9461`

## Layanan
- Fabric GX-Space: `http://localhost:8184/api/v1` (container `dataspace-api-feature-conn`)
- Node geospasial (OGC): `http://localhost:8000`
- FE dev: `npm run dev` (Vite) · build cek: `npm run build`

---

## ✅ SELESAI

### Phase 1 — Read-only (semua data BE per role)
- [x] Auth login username/password (Keycloak OFF, LOCAL JWT) + role dari JWT
- [x] DomainContext auto-resolve domain pertama
- [x] Service domain-scoped + hooks TanStack (datasets, policies, contracts, vocab, schema, participants, audit)
- [x] Halaman faithful & konsisten: Dashboard, Datasets, Contracts, Policies, Participants, Schemas, Vocabularies, Organizations
- [x] Klasifikasi L0–L4 (dari description dataset / nama policy), join nama participant/vocab
- [x] RBAC nav (SKK Migas: SUPER_ADMIN/ADMIN/CONSUMER/AUDITOR · KKKS: PROVIDER); hapus ArcGIS/Mapping

### Phase 2a — Provider fulfillment (KKKS menyetujui permintaan)
- [x] **BE**: `participant_id` masuk klaim JWT (`local_jwt_provider.py`) → rebuild `dataspace` (DB aman)
- [x] **BE seed**: `provision_skkmigas.py` tambah 1 kontrak DEMO status REQUESTED
- [x] FE: `AuthContext.participantId`; `contractsApi.updateStatus` (PATCH) + `useUpdateContractStatus`
- [x] Halaman **ProviderInbox** `/inbox` (menu "Permintaan Masuk"): Setujui → Aktifkan / Tolak + timeline + konfirmasi
- [x] Tervalidasi: token PHE boleh PATCH APPROVED→ACTIVE (200)

### Phase 2b — Consumer request (SKK Migas mengajukan)
- [x] FE: `contractsApi.create` (POST → REQUESTED) + `useCreateContract`
- [x] Komponen `RequestContractDialog` + tombol "Ajukan Permintaan Data" di Contracts (CONSUMER/SUPER_ADMIN/ADMIN)

### Phase 3 — Agreement (perjanjian formal) — lihat detail di ROADMAP
- [x] agreementsApi + hooks + CreateAgreementDialog; tombol di ProviderInbox (ACTIVE) + daftar di Contracts detail

### Dashboard matrix per-peran (2026-06-02) ✅
- [x] `lib/fulfillment.ts` (5 domain; stage Terkirim>Aktif>Tersedia>Belum, faithful dari BE)
- [x] Consumer SKK Migas: `FulfillmentMatrix` (KKKS × 5 domain, cakupan %, terkirim, total/baris, cakupan/kolom)
- [x] Provider KKKS: `ProviderFulfillment` (5 kartu domain, progress Terdaftar→Kontrak→Aktif→Terkirim, x/5)
- [x] KPI Dashboard per peran (cakupan, KKKS lengkap, domain terpenuhi, terkirim, permintaan menunggu)
- [x] **BE: endpoint list transfer** `GET /connector/{domain_id}/transfers` (read-only) + `transfersApi`/`useTransfers` → sel "Terkirim" = ada transfer COMPLETED
- [x] Demo: 1 transfer COMPLETED untuk wilayah_kerja (sel Terkirim tampil di matrix)

### Onboarding KKKS self-service + auto-mandate (2026-06-02) ✅
Model: KKKS daftar mandiri (publik) → SKK Migas approve → otomatis participant + akun operator (email aktivasi) + 5 kontrak kewajiban. SKK Migas tinggal monitor matrix tumbuh.
- [x] **BE modul baru "Registration"** (aditif): tabel `mp_participant_registrations`; `POST /onboarding/registrations` (PUBLIK), `GET /onboarding/registrations?status=` (SuperAdmin), `PATCH /onboarding/registrations/{id}` (SuperAdmin). Repo commit-sendiri, controller inject repo, terdaftar di mp router + ioc. Tervalidasi (201/401/200).
- [x] FE service `onboarding.ts` (registrationsApi+participantsApi) & `identity.ts` (usersApi/categories/groups/confirm-email)
- [x] Halaman publik **`/register-kkks`** (form self-service) + **`/confirm-email`** (operator set password → aktif)
- [x] Halaman SKK Migas **`/onboarding`** (menu "Pendaftaran KKKS", SUPER_ADMIN/ADMIN): antrian + tombol "Setujui & Terbitkan" → orkestrasi (participant ENTERPRISE → user PROVIDER+participant_id [BE email aktivasi] → 5 kontrak REQUESTED → tandai APPROVED). Semua endpoint BE eksisting. Tervalidasi end-to-end.
- ⚠️ Gotcha: path BE pakai trailing slash (`/users/`, `/user/categories/`, `/user/groups/`); email operator harus domain valid (TLD `.test`/`.example` ditolak validator BE); URL tautan email aktivasi BE masih hardcoded host lama (`email_utils.py`) → jadikan config ke FE saat deploy.
- [x] **Penyempurnaan onboarding (2026-06-03)**: kolom "Akun Operator" (Aktif/Belum aktivasi) di antrian — cocokkan user via email (UserResponse tak ekspos participant_id); tombol **"Kirim Ulang Undangan"** (`usersApi.resendConfirmation` → BE `resend-email-confirmation`). Menutup titik buta antara "Approved" dan "operator benar-benar aktif".
- **Rencana EMAIL (penting utk aktivasi nyata):** 1 SMTP sender platform (di `.env` BE: SMTP__*), penerima = email operator masing-masing KKKS (dari registrasi) → tiap KKKS terima di mailbox sendiri; tak perlu mailbox per-KKKS di sisi kita. Agar REAL: (1) isi SMTP kerja (rekomendasi transactional: SES/SendGrid/Mailgun); (2) ✅ URL confirm-email kini configurable; (3) email penerima valid/deliverable; (4) SPF/DKIM/DMARC domain pengirim. Dev: MailHog/Mailpit.
- [x] **BE: URL confirm-email configurable** — `email_utils.py` baca env `FRONTEND_BASE_URL` (default `http://localhost:8282`) → tautan aktivasi mengarah ke FE; bukan lagi host hardcoded. `.env` + (perlu) `.env.example` deploy + docker-compose set `FRONTEND_BASE_URL`. Terverifikasi.

## 🎯 PLAN — Dashboard SKK Migas skala 50 KKKS (proporsional & mudah dibaca)
Tujuan: pastikan dashboard tetap **proporsional, tidak padat, mudah dilihat** saat 50 KKKS
benar-benar terhubung datanya. (Diminta 2026-06-03.)

**Langkah 0 — Preview data 50 KKKS (untuk menilai visual lebih dulu):**
- Buat **preview-seed** (script): 50 KKKS dari `list-kkks.md` sebagai participant ENTERPRISE +
  data tersimulasi **bervariasi** lintas 5 domain: sebagian patuh penuh (Terkirim/Aktif),
  sebagian sebagian (Tersedia), sebagian belum (Belum). Catatan teknis: sel berwarna butuh
  **dataset (published) + kontrak/transfer** per KKKS → preview-seed membuat dataset+kontrak
  (+sebagian transfer) per KKKS agar sebaran warna realistis. Reversible (bisa dibersihkan).
- Tujuan: lihat kepadatan & proporsi visual sebelum finalisasi desain.

**Langkah 1 — Matrix proporsional siap-50 (kriteria desain):**
- [ ] Baris ringkas (tinggi sel kecil, padding pas) + **header kolom domain sticky** + **kolom KKKS sticky** saat scroll
- [ ] **Pencarian KKKS** + **filter status** (mis. "hanya belum patuh") + **sortir** (mis. by skor kepatuhan)
- [ ] **Pagination / virtual scroll** (jangan render 50+ baris sekaligus tanpa batas)
- [ ] **Ringkasan di atas matrix**: donut/*stacked bar* sebaran status agregat + cakupan per domain (5 angka besar) — supaya "lihat sekilas" tanpa memindai 50 baris
- [ ] **Panel "KKKS belum patuh"** (laggards) terpisah untuk tindak lanjut
- [x] **Drill-down**: klik nama KKKS di matrix → dialog detail 5 domain (status + dataset/kontrak/transfer per domain) — untuk diagnosis & tindak lanjut
- [x] **Ekspor laporan kepatuhan (CSV)**: tombol di matrix → unduh 50 KKKS × 5 domain + status + total + Jml/Domain Overdue (BOM UTF-8, Excel-ready) — pelaporan & akuntabilitas Juknis
- [x] **Tenggat/Overdue Juknis (2026-06-03)** — pilihan: kolom `due_date` eksplisit + SLA 90 hari.
  - **BE**: kolom `due_date` di `pc_contracts` (+ infra/domain/response/create-request/command); default `created_at + JUKNIS_SLA_DAYS` (env, default **90**) saat create; migrasi `ALTER TABLE pc_contracts ADD COLUMN due_date` (existing) + create_all (fresh). Bonus: `description` kini ikut dipersist di create command.
  - **FE**: `ContractItem.due_date`; `cellInfo` hitung `overdue/dueDate/daysLeft` (overdue = ada kewajiban belum terpenuhi & lewat tenggat); matrix: cincin merah + ikon di sel overdue, KPI "Terlambat", filter "Hanya overdue", drill-down tampil tenggat + sisa/terlambat hari, CSV kolom overdue.
  - Demo: 15 kontrak preview di-set REQUESTED + lewat tenggat → sel overdue terlihat.
- [ ] Mode tampilan: **ringkas (heatmap dot)** vs **detail** toggle
- [ ] Responsif: di layar kecil jadi kartu per-KKKS, bukan tabel lebar

**Acceptance:** dengan 50 KKKS, dashboard memuat cepat, terbaca dalam <5 detik pandangan,
tidak perlu scroll horizontal berlebih, dan SKK Migas bisa langsung tahu siapa yang belum patuh.

**Langkah 2 — Pagination + Cluster Domain di halaman list (diminta 2026-06-03):**
- [x] Service datasets/contracts ambil semua halaman (BE max limit 100) → agregasi lengkap
- [x] Komponen reusable `Pager` + `DomainClusterTabs` (chip Semua + 5 domain + hitungan)
- [x] **Datasets**: tab Cluster Domain + pagination (12/hal) + search/level/status
- [x] **Contracts**: tab Cluster Domain + pagination (12/hal)
- [x] **Matrix dashboard**: search KKKS + filter "Hanya belum patuh" + pagination baris (12/hal)
- [x] **Participants** (51 baris): pagination 12/hal + search (sudah ada)
- [ ] (opsional) Onboarding queue: pagination bila pengajuan banyak

## 🧭 PLAN — Setup A–Z SKK Migas di instance FRESH (diminta 2026-06-03)
Masalah: fresh install (bootstrap) hanya punya kategori/grup + participant+user SKK Migas.
Belum ada governance org/domain/policy/vocab/schema → UI domain-scoped kosong. UI sekarang
mayoritas GET; **fondasi governance belum bisa via UI** (selama ini lewat provision_skkmigas.py + bootstrap).
Semua endpoint write SUDAH ADA di BE (faithful) — tinggal diekspos di UI.

Urutan A–Z (faithful):
- Fase 0 Infra: `compose up` + `init-fabric` (✅ paket deploy)
- Fase 1: (1) `POST /governance/organizations/` ✅UI · (2) `POST /governance/organizations/{org}/domains` ❌belum UI
- Fase 2: (3) vocabulary+terms `POST /data-catalog/{d}/vocabularies(/terms)` ❌ · (4) schema/metadata-schema ❌
- Fase 3 (Juknis): (5) dataset-policy ACCESS/USAGE/RETENTION/SECURITY + L0–L4 ×5 domain ❌ · (6) contract-policy ❌
- Fase 4 onboarding KKKS ✅ · Fase 5 fulfillment+matrix ✅

Gap UI = Fase 1b + 2 + 3. Definisi paket Juknis sudah ada di `spektrum-geospatial-layer/governance/profiles.py`.

**Usulan: Setup Wizard SKK Migas** (wujud konkret wizard yang diparkir) — superadmin orkestrasi POST eksisting:
buat Org → buat Domain → **"Terapkan Paket Juknis"** (loop vocab/schema/dataset-policy/contract-policy 5 domain) → siap.
Plus tombol create standalone di Organizations/Schemas/Vocabularies/Policies.
- [x] Keputusan: **(b) endpoint BE `apply-juknis-package`** dipilih.
- [x] **BE: `POST /policy-contract/{domain_id}/apply-juknis`** (SuperAdmin) — paket di-embed di fabric (`application/commands/policy_contract/juknis/apply.py`), pakai ulang Create Dataset/Contract Policy + **Vocabulary + Schema** handler, idempoten.
  - Body: `{overrides:{<domainKey>:{classification, retention_years}}, include_dictionary:bool}` → user bisa **ubah klasifikasi & retensi** per domain.
  - **Termasuk kamus data**: vocabulary(+terms atribut SIGI) + schema per domain.
  - Tervalidasi penuh: 17 dataset-policy + 5 contract-policy + 5 vocabulary + 5 schema (no error); override sumur→L4 jalan.
  - **Bug BE diperbaiki**: `sqla_vocabulary.create` dulu `VocabularyTermModel(id=uuid4())` mengabaikan id term yang dikirim → response≠DB → schema FK gagal. Diubah `id=t.id`.
- [x] **FE Setup Wizard** (`/setup-juknis`, menu "Setup Juknis", SUPER_ADMIN/ADMIN) — 4 langkah: Organisasi (pilih/buat) → Governance Domain (pilih/buat, `createDomain` baru) → Paket Juknis (review + ubah klasifikasi & retensi 5 domain + toggle kamus data) → Terapkan (POST apply-juknis + ringkasan hasil). Service `juknis.ts`. Build hijau.
  → Alur A–Z SKK Migas dari instance fresh kini bisa via UI penuh.
- ⚠️ Konsekuensi sekarang: di fabric BENAR-BENAR fresh, FE perlu langkah ini dulu agar domain-scoped pages hidup.
- [x] **Panduan first-run + urutan sidebar (2026-06-05)** ✅ — menutup gap "user tak tahu mulai dari mana":
  - **A. Banner first-run di Dashboard**: bila admin & domain siap tapi Juknis belum diterapkan (`policies.length===0`), tampil kartu "Langkah 1 — Setup Juknis: daftarkan 5 domain data" + tombol ke `/setup-juknis`. Otomatis hilang setelah Juknis diterapkan.
  - **B. Sidebar dikelompokkan & diurutkan** (`rbac.ts` `MenuSection`=persiapan/pemantauan/lain + `SECTION_LABELS`/`SECTION_ORDER`; `Sidebar.tsx` render header grup, grup kosong tersembunyi): **Persiapan** (Setup Juknis → Pendaftaran KKKS → Organizations) → **Pemantauan & Operasional** (Dashboard → Katalog → Contracts → Permintaan Masuk → Transfer → Participants → Schemas → Vocabularies → Policies → Audit) → **Lainnya** (API Docs). Setup Juknis kini paling atas (dulu #10). tsc hijau.

## 🛢️ PLAN — Sisi KKKS (provider) (2026-06-03)
Cermin SKK Migas: KKKS fokus **memenuhi** (bukan setup). Status:
- [x] Daftar mandiri (publik) + aktivasi email + login PROVIDER
- [x] Lihat kewajiban masuk (kontrak REQUESTED) → Setujui/Tolak/Aktifkan (ProviderInbox)
- [x] Buat Agreement
- [x] Dashboard provider (ProviderFulfillment 5 kartu domain)
- [x] **Publish Dataset (2026-06-03)** — `datasetsApi.publish` + `usePublishDataset` + `PublishDatasetDialog`; tombol "Publish Dataset" di Datasets (role PROVIDER/SUPER_ADMIN/ADMIN). Pilih Domain+Schema+Klasifikasi+URL+protokol → POST datasets (status PUBLISHED, tags[0]=domain, "Klasifikasi Lx" di description agar dikenali matrix). Tervalidasi: PHE publish 201 PUBLISHED.
- [x] **Tenggat/overdue sisi KKKS (2026-06-03)** — ProviderInbox: kolom **Tenggat** (tanggal + sisa/terlambat hari), KPI **"Terlambat"**, baris overdue ter-highlight merah; ProviderFulfillment (dashboard KKKS): tiap kartu domain tampil tenggat + cincin merah bila overdue. overdue = kewajiban belum tuntas & lewat tenggat. Demo: kontrak REQUESTED PHE di-set lewat tenggat.
- [x] **Transfer Center (2026-06-03)** — halaman `/transfers` (menu "Transfer Data", PROVIDER/SUPER_ADMIN/ADMIN). Tabel kewajiban 5 domain (dataset published + kontrak ACTIVE = "Siap dikirim") + tombol **"Kirim Data"** = orkestrasi FE (taut dataset→kontrak via `contractsApi.linkDataset` + agreement ACTIVE via `agreementsApi.updateStatus`/create + `transfersApi.initiate→start→status` poll) → COMPLETED → "Terkirim". + Riwayat transfer (status/ukuran/error). Tanpa BE baru. Tervalidasi PHE: COMPLETED 118 byte.
  - → Sekaligus menyelesaikan **penautan dataset↔kontrak** lewat orkestrasi FE (PATCH contract datasets[] dgn dataset_policy_id dari Juknis) — tak perlu BE Phase 5 terpisah.
- [x] Service: connector `initiate/start/status`; `contractsApi.linkDataset`; `agreementsApi.updateStatus`.
- [x] **Banner pemandu first-run KKKS (2026-06-05)** ✅ — di Dashboard provider, `providerGuide` (tampil bila punya kontrak kewajiban): **Langkah 1** "Tindak {N} kewajiban" → `/inbox` (saat ada REQUESTED/APPROVED), **Langkah 2** "Kirim data — {mySent}/5 terkirim" → `/transfers` (biru), atau kartu sukses hijau "Semua kewajiban terpenuhi (5/5)". Paralel dgn banner SKK Migas. tsc hijau.
- [ ] (opsional) profil KKKS, notifikasi

## 📦 DEPLOY-PREP (2026-06-05) — sebelum regen ZIP berikutnya
Disiapkan agar ZIP iterasi ini deploy-ready (isolasi data · masking per-tier · routing connection-pool · field transfer · klasifikasi 4-kelas · ISO 19115):
- [x] `gxspace/.env.example` + `GEO_NODE_INTERNAL_API_KEY`/`GEO_NODE_RESTRICTED_API_KEY` (+ FRONTEND_BASE_URL, JUKNIS_SLA_DAYS) — **harus cocok** dgn node `INTERNAL/RESTRICTED_API_KEY`.
- [x] `spektrum-geospatial-layer/.env.example` — `INTERNAL/RESTRICTED_API_KEY` diisi contoh + catatan cocok dgn fabric.
- [x] **`DEPLOY-BE.md`** dibuat (env, build 2 subsistem, seed bootstrap/create_all, **migrasi ALTER conn_transfer_processes** utk DB existing, verifikasi, akun uji).
- [x] Verifikasi tak ada artefak uji/temp/.env rahasia di folder yang di-zip; tes node sah tetap ada.
- ⚠️ ZIP BE harus mencakup **gxspace + spektrum-geospatial-layer + docker-compose.yml** (node berubah: 4-kelas, ISO 19115, masking). FE: rebuild (`npm run build`).
- Catatan: **#3 atribut SIGI TIDAK di ZIP** (audit-only, menunggu keputusan SKK Migas).
- [x] **ZIP digenerate (2026-06-05, versi `v2026.06.05`)** ✅ — Linux-safe (`tar.exe` System32, forward-slash), terverifikasi 0 bocoran (`.env`/`.venv`/`.git`/`node_modules`):
  - **BE**: `D:\Project\gx-space\gxspace-BE_v2026.06.05.zip` (0.69 MB, 1122 entri) = `gxspace/` + `spektrum-geospatial-layer/` + `docker-compose.yml` + `DEPLOY-BE.md`. Berkas kunci terverifikasi (metadata.py/iso19115.py, access_tier.py, kedua `.env.example`).
  - **FE**: `D:\Project\gx-space\rapidsk-FE_v2026.06.05.zip` (0.43 MB, 201 entri) = source `rapidsk-web-app/` (tanpa node_modules/dist) + `DEPLOY-FE.md`.
  - Siap dibagikan ke tim BE & FE.

## 📦 DEPLOY ZIP — REGENERATED (2026-06-03)
`D:\Project\gx-space\gxspace-feature-connector.zip` (0.78 MB) di-regenerate dengan SEMUA perubahan BE:
OGC adapter · bootstrap connector models · list-transfer · registration module · apply-juknis ·
vocab term-id fix · email URL configurable · contract `due_date`. `.env.example` diperbarui
(+`FRONTEND_BASE_URL`, `JUKNIS_SLA_DAYS`, SMTP). DEPLOY.md + init-fabric.sh/.ps1 diperbarui.
Separator `/` (Linux-safe), tanpa rahasia/.venv/.git. Fresh install: create_all buat semua tabel
(termasuk due_date) — tanpa migrasi manual.
- Catatan akomodasi heterogenitas G&G: lapisan exchange tool-agnostic (endpoint+Juknis) — siap.
  Lapisan ingest/konformansi KKKS (upload→validate→OGC di node Spektrum) = fase lanjut (belum).

## 🧹 FE deploy-prep (2026-06-03)
- [x] Hapus 6 berkas mati: barrel `api/{services,hooks,types}/index.ts` (tak diimport) + `useSystemHealth.ts` + `services/system.ts` + `types/system.ts`. Build tetap hijau (tree-shaken).
- [x] `.env.example` FE diperbarui (dulu usang rapiDSK port 8000+Keycloak) → GX-Space `VITE_API_BASE_URL=:8184/api/v1`, catatan VITE_* di-bake saat build.
- [x] Fix fallback URL usang `localhost:8000` → `:8184` di `use-openapi-spec.ts` & `ApiDocs.tsx`.
- [x] Hapus dokumen era rapiDSK lama di `docs/` (plan/spec/report/QA/screenshot/todolist lama) — simpan `openapi.json`, `openapi-latest.json`, `fastapi.yaml`, `IAM_ROLE_MAPPING_MATRIX.md`, `SPEKTRUM_Migration_Plan.md`. Hapus `TEST_LOGIN.md`.
- [x] `DEPLOY-FE.md` dibuat (env→build→serve dist + SPA fallback + CORS + akun uji).
- ⚠️ DEPLOY: `VITE_API_BASE_URL` WAJIB diarahkan ke BE dev-server SEBELUM `npm run build` (env di-bake). Host harus SPA-fallback ke index.html. BE: set `FRONTEND_BASE_URL` ke domain FE + `CORS__ALLOWED_ORIGINS` memuat origin FE.

## 🔒 Isolasi data antar-KKKS (2026-06-05) ✅
Bug ditemukan: login PROVIDER (`phe`) bisa melihat dataset/kontrak **KKKS lain** — endpoint list pakai
`AuthenticatedUserGuard` saja & handler mengabaikan pemanggil (kembalikan semua data domain). **Dilarang.**
- [x] **BE**: `SecurityContext.participant_id` (property baru). List **datasets** & **contracts**: bila pemanggil
  kategori `PROVIDER` & non-superadmin → filter `provider_id == participant_id`
  (datasets → repo `list_by_provider`; contracts → `ContractFilter.provider_id`). Superadmin/regulator (SKK Migas) tetap lihat semua.
  Berkas: `security_guard.py`, `queries+controllers` dataset/contract list, `ContractFilter`, `sqla_contract.listing`.
- [x] **FE**: Datasets/Contracts filter `provider_id===participantId` (lapis kedua); menu **Participants** disembunyikan utk PROVIDER (`rbac.ts`).
- [x] **Tervalidasi E2E** (`version_feature_connector/test_isolation.py`): buat KKKS kedua (Medco)+dataset+kontrak → `phe` **0** data Medco; `skkmigas` lihat semua. Semua assert LULUS.
- ⚠️ Perlu **rebuild `dataspace`** agar handler baru aktif (sudah di-rebuild di lokal). Lihat memori `kkks-data-isolation`.

## 🔌 PLAN — Heterogenitas G&G KKKS + Adopsi masukan tim (Sequence Diagram OpenAPI-Aligned) (2026-06-05)
Konteks: tim mengajukan revisi sequence diagram → tanggapan di `version_feature_connector/TANGGAPAN_Sequence_Diagram_OpenAPI_Aligned.md`.
Analisis: lapisan tata-kelola dokumen **benar**; bagian runtime berbasis OpenAPI **lama** (modul **Connector** kita SUDAH ada: `initiate→start→status→download→transfers`; path relay nyata = `/consumer|provider/{domain}/agreement/{agr}/dataset/{ds}`, bukan `/consume|provide/{agr}`).
**Keputusan adopsi:** ambil bagian transport/routing sebagai **pelengkap (strategi B)**; default sumber tetap **OGC via node Spektrum (strategi A)**. Penegakan Juknis = gap terpisah, **prioritas lebih tinggi** (menentukan audit).

### A. Adopsi masukan tim (transport/routing) — BE
- [ ] **Adapter multi-backend di connector**: GeoServer WFS/WMS, ArcGIS REST (FeatureServer/MapServer), DB/File (JDBC/object storage) — selain `OGC_API_FEATURES`/`REST_API` yang sudah ada. Pemilihan via `backend_type`.
- [x] **connection-pool sbg sumber routing (2026-06-05)** ✅ — `start_transfer` lookup **provider connection-pool** untuk agreement (`get_provider_connection_pool(agreement, domain)`); bila ada & `metadata.url_provider` valid → **override host/base** sumber (scheme+netloc dari pool, **path dataset dipertahankan** via `_route_via_connection_pool`), else fallback `dataset.endpoint`. Repo `IConnectionPoolRepository` di-inject (dishka auto-wire, tanpa ubah IoC). Plus **fix robustness**: `get_total_size` dipindah ke dalam `try` → endpoint buruk = transfer **FAILED**, bukan stuck INITIATED.
  - **Tervalidasi E2E (sumur, via API, tanpa merusak dataset)**: pool `url_provider=geo-api:9999` (port salah) → **FAILED**; `geo-api:8000` (benar) → **COMPLETED + 4 fitur** → host **pool** yang dipakai. Tanpa pool → fallback (perilaku lama).
  - Catatan: operator perlu seed connection-pool PROVIDER per-KKKS agar aktif (participant pool = `contract.provider_id`). Sinergi dgn masking X-API-Key tetap jalan.
- [ ] **`backend_type`** di dataset/connection-pool (kolom/metadata) untuk memilih adapter.
- [x] **Field transfer kaya** di status/transfer (2026-06-05) ✅ — BE: kolom `checksum_sha256`+`record_count` di `conn_transfer_processes` (model+domain+repo); `start_transfer` hitung SHA-256 streaming + `record_count` best-effort (parse GeoJSON FeatureCollection → len(features), non-fatal); response `GET /connector/{id}/status` + `list_transfers` ekspos `bytes_transferred`(=transferred_size)/`checksum_sha256`/`record_count`/`started_at`/`completed_at`/`error_message`. Migrasi `ALTER TABLE public.conn_transfer_processes ADD COLUMN IF NOT EXISTS checksum_sha256, record_count` (existing) + create_all (fresh). **Tervalidasi E2E**: transfer COMPLETED → bytes=118, checksum terhitung, record_count=0 (FeatureCollection kosong, parser benar). `result_url` = N/A (pakai endpoint `download`, bukan URL).
- [ ] **Jaga validate-at-source**: bila adapter menarik LANGSUNG dari GeoServer/ArcGIS (bypass node Spektrum), pasang validasi setara agar gerbang konformansi tak terlewat.
- [ ] (opsional, prioritas rendah) **transfer-process API persistent** terpisah — fungsi dasar SUDAH ditutup Connector; hanya bila butuh staging produksi.

### B. Adopsi — FE (dampak kecil; FE tetap data-exchange, tanpa peta)
- [ ] Publish/registrasi dataset: pilih **sumber/backend** (OGC vs GeoServer vs ArcGIS vs DB/File) + tautan ke **connection-pool**.
- [x] Transfer Center: tampilkan field transfer kaya (2026-06-05) ✅ — `connector.ts` `TransferItem` + mapping list tambah `checksum_sha256`/`record_count`; tabel Riwayat Transfer tambah kolom **Record** + **Checksum (SHA-256)** (truncated, full di tooltip). Ukuran sudah ada. tsc hijau. (durasi started→completed = opsional, field sudah tersedia di BE).
- [ ] Peta tetap di app pihak ke-3 (ghanem-one) — **BUKAN** rapidsk.

### C. Gap Juknis (TIDAK dicakup dokumen tim — prioritas lebih tinggi utk audit) — BE
- [x] **Masking per-tier konsumen di fabric** (L3/L4) saat relay/connector (2026-06-05) ✅
  - **Model (by-peran, disetujui):** regulator (superadmin/kategori INTERNAL)=RESTRICTED (L0–L4 utuh); konsumen ber-agreement non-regulator=INTERNAL (L0–L2 utuh, L3/L4 DIMASKING); tanpa=PUBLIC (L0–L1).
  - **Pendekatan:** node tetap satu-satunya otoritas masking; fabric menentukan tier konsumen lalu mengirim `X-API-Key` yang sesuai. Helper baru `connector/application/services/access_tier.py` (`resolve_consumer_tier`/`node_api_key_for_tier`/`tier_api_headers`), key dari env `GEO_NODE_INTERNAL_API_KEY`/`GEO_NODE_RESTRICTED_API_KEY` (cocokkan dgn `INTERNAL/RESTRICTED_API_KEY` di geo-api).
  - **Connector:** `initiate` (kini ber-`AuthenticatedUserGuard`) resolve tier → simpan kolom baru `consumer_tier` di `conn_transfer_processes`; `start` kirim `X-API-Key` via adapter (`pull_data`/`get_total_size` + interface + REST/OGC/graphql/grpc/odata terima `extra_headers`). **Relay** provider `_generate_stream` ikut kirim key sesuai tier.
  - **Compose:** `dataspace.environment` set `GEO_NODE_*` cocok dgn `geo-api` (deploy: tambahkan ke `.env.example` saat regen ZIP). Migrasi `ALTER TABLE public.conn_transfer_processes ADD COLUMN IF NOT EXISTS consumer_tier`.
  - **Tervalidasi E2E (sumur L3):** node — PUBLIC=0 fitur (tersembunyi), INTERNAL=4 `_masked` tanpa total_depth, RESTRICTED=4 utuh. Fabric — transfer skkmigas=RESTRICTED (utuh, ada total_depth), phe=INTERNAL (masked, _masked=true, tanpa total_depth). record_count benar (4).
- [ ] **Usage policy dari `_activity_end_date`** (retensi) + **provenance `_prov.*`** → feed audit/Clearing House.
- [ ] **ISO 19115** (uuid/CRS/footprint) di metadata broker (katalog). → detail di PLAN Penyelarasan Juknis #2 (terkonfirmasi WAJIB Juknis).
- [x] **Kesepakatan kosakata SIGI ↔ PPDM** — **SELESAI by-doc (2026-06-05)**: Dokumen SIGI di Juknis sudah memetakan PPDM (Referensi Field/Table PPDM) per field di semua domain → adopsi nama SIGI otomatis membawa padanan PPDM. Lihat audit `AUDIT_Atribut_SIGI_vs_Schema.md` + PLAN Penyelarasan Juknis #3.

### Prinsip keputusan
- Default sumber data = **OGC via node Spektrum (A)**; adapter GeoServer/ArcGIS = **opsi (B)** untuk KKKS yang tak bisa OGC.
- Penegakan Juknis (C) ≥ prioritas transport (A/B).
- Jaga **isolasi data antar-KKKS** (sudah diterapkan) di setiap jalur baru.

## 📐 PLAN — Penyelarasan Juknis SPEKTRUM IOG 4.0 (resmi) (2026-06-05)
Sumber: Juknis resmi `version_feature_connector/Petunjuk Teknis SPEKTRUM IOG 4.0.pdf`.
Pemetaan lengkap: `version_feature_connector/PEMETAAN_Juknis_SPEKTRUM_vs_Implementasi.md` + memori `juknis-spektrum-iog4`.
Item #1–3 = dalam kendali kita (fabric/FE), dikerjakan. Item #4 = **menunggu konfirmasi user SKK Migas**.

- [x] **#1 Selaraskan penamaan klasifikasi (2026-06-05)** ✅ — 4 kelas Juknis **PUBLIK/INTERNAL/TERBATAS/RAHASIA** + aturan **"RAHASIA tidak dipublikasikan"**.
  - **Node BE**: `classification/levels.py` tambah `JuknisClass` + `to_juknis_class` (L0/L1→PUBLIK, L2→INTERNAL, L3→TERBATAS, L4→RAHASIA) + `is_publishable_to_spektrum` (L4=False); `api/v1/publish.py` **tolak L4** (HTTP 422, sebelum sentuh GX-Space); fitur OGC kini bawa `_classification_class` (`repository.to_geojson_feature` + `masking.mask_feature`). **Tes node: 32 passed, 10 skipped** (+ unit baru mapping & L4-not-publishable, + test penolakan publish L4). Enum L0–L4 internal dipertahankan (kompat).
  - **FE**: label klasifikasi → 4-kelas Juknis di `useDatasetLevels.ts` (+`JUKNIS_CLASS`), `Dashboard` LEVEL_META, `SetupJuknis` (L4 = "RAHASIA (tidak dipublikasikan)"). tsc hijau.
  - **Tervalidasi E2E**: OGC sumur → `_classification_class=TERBATAS` (L3); `POST /v1/publish` level L4 → 422 "RAHASIA tidak boleh dipublikasikan". geo-api di-rebuild.
  - Catatan: fabric dataset-policy tetap encode L0–L4 internal (label kelas = lapisan presentasi/penyajian); tier akses node (PUBLIC/INTERNAL/RESTRICTED) tak berubah.
- [x] **#2 Metadata ISO 19115 (2026-06-05)** ✅ — node menyajikan rekaman ISO 19115-1:2014 (SNI 8843-1:2019) per domain.
  - **Node BE**: modul `metadata/iso19115.py` (`build_iso19115`, pure) menyusun elemen inti wajib: **fileIdentifier (UUID stabil, uuid5)**, metadataStandardName/Version, **language (ind)**, **characterSet (utf8)**, dateStamp, contact, **referenceSystem (EPSG:4326)**, identification{**title**, **date**, abstract, **topicCategory**, spatialRepresentationType=vector, geometryType, **extent.geographicBoundingBox**, featureCount}, distribution{format, onlineResource}. Repo `bbox_of` (ST_Extent) + `count_by_domain`. Endpoint **`GET /v1/metadata/{domain}`** + **`GET /v1/metadata`** (5 domain), daftar di `main.py`.
  - **Tes node: 34 passed, 10 skipped** (+ `test_metadata.py`: field wajib + bbox + UUID stabil per domain). geo-api di-rebuild.
  - **Tervalidasi E2E**: `/v1/metadata/sumur` → bbox terhitung dari PostGIS (106.5–113.5, -6.0– -4.8; 4 fitur), seluruh field wajib terisi; `/v1/metadata` → 5 records.
  - **Sisa (follow-up, sinkron item C/CSW):** push metadata ke fabric catalog / **CSW + harvesting otomatis** (Level 3), lineage/`_prov.*`, viewer metadata di FE. Fabric belum diubah (node = sumber metadata; harvest = fase lanjut).
- [~] **#3 Cross-check atribut 5 domain vs Dokumen SIGI + PPDM** — **AUDIT SELESAI (2026-06-05)**; penyelarasan = bertahap, menunggu keputusan. Hasil: `version_feature_connector/AUDIT_Atribut_SIGI_vs_Schema.md`.
  - Temuan: Juknis memuat **tabel SIGI field-level lengkap** (§3.1–3.5, Tabel 2–16) dgn **referensi PPDM + Kamus ESDM + flag Mandatory**. Schema kita = **subset disederhanakan, nama lowercase**; SIGI = **UPPERCASE selaras PPDM**, jauh lebih banyak field. `OPERATOR`(WK:`HOLDING`) hilang di semua domain. Fasilitas SIGI = **8 sub-tipe**; Seismik = Area+Line (`SEIS_ACQTN_*`); Sumur = Tabel 16 (Well, UWI ✓).
  - ✅ **SIGI↔PPDM (item C) SELESAI by-doc**: PPDM dipetakan per field di Dokumen SIGI → adopsi nama SIGI otomatis bawa padanan PPDM (tak perlu tabel terpisah).
  - **Keputusan menunggu SKK Migas**: (1) konvensi nama (UPPERCASE SIGI vs lowercase+alias), (2) subset Mandatory utk publish, (3) model Fasilitas (1 generik vs 8 sub-tipe), (4) penamaan PPDM Seismik.
  - **Fase 3a (siap dieksekusi bila disetujui):** tambah `operator`/HOLDING (semua), WK `effective_date`/`expire_date`, Seismik `sumber_navigasi`, Fasilitas `kapasitas`. **Fase 3b:** penyelarasan penuh (node schema/validasi/masking/seed + fabric vocab/schema + FE).
- [ ] **#4 Penamaan GWS (Lampiran A)** — `<OrgID>_<Domain>_<DataType>_<Name>_<SRK>_<Optional>` (WK/FLD/SEI/WLL/FP; AR/LN/PT/RS), tanpa spasi, versi naik tiap perubahan, status Deprecated. ⏸️ **MENUNGGU KONFIRMASI user SKK Migas** sebelum dikerjakan.

> Catatan: butir Juknis berat lain (PKI/mTLS Trust Framework, SPARK Connector KKKS, CSW/harvesting, OSDU, multi-protokol, audit PKCS#7) = mayoritas **infra sisi KKKS / keamanan federasi**, di luar lingkup fabric/FE kita — lihat dokumen pemetaan bagian 12–13.

### Assessment "Rancangan DS Adapter" (Ghanem [DSN], DRAFT) — 2026-06-05
Dokumen `version_feature_connector/Rancangan_DS-Adapter.docx` → pemetaan `version_feature_connector/PEMETAAN_DS-Adapter_vs_Implementasi.md`.
- **Node Spektrum kita = realisasi parsial Adapter L1** (file→validate-at-source→OGC API Features EPSG:4326→register fabric + klasifikasi + ISO 19115). **Mayoritas blueprint belum/berbeda stack** (Supabase control-plane, mapping PPDM 3.9 zero-tabel, reader L2/L3/L4 vendor, SIGMA AI, connector-iface EDC/IDS) = build baru sisi Node, bukan dipenuhi fabric/FE kita. **FE: tidak relevan**.
- ⚠️ **Perlu SATU-PETA klasifikasi terpadu** (keputusan SKK Migas): L0–L4 (kita) ↔ PUBLIK/INTERNAL/TERBATAS/RAHASIA (Juknis) ↔ UMUM/DASAR/OLAHAN/INTERPRETASI + RAHASIA/TERBUKA (Permen/blueprint).
- Memperkuat item roadmap yg sudah ada: **`activity_end_date` (masa rahasia dinamis 4/6/8 thn, Pasal 5(9))**, provenance `_prov.*`/QC_STATUS, **WFS klasik**, Trust Framework (TLS/mTLS).

## 💡 IDE (diskusi nanti — belum dibangun)
- **Onboarding wizard saat install pertama (sebelum login):** halaman wizard kelas dunia untuk menetapkan instansi ini sebagai **Provider / Consumer**. Setelah wizard selesai, platform "aktif & siap terhubung": bila Consumer = SKK Migas, ia sudah menyiapkan aturan sesuai **JUKNIS** (5 domain + kebijakan), lalu KKKS (provider) menyambung & patuh. Tujuan: deployment baru langsung terarah perannya. (Diajukan 2026-06-02 — perlu didiskusikan kecocokannya dgn model self-service + governance domain yang sudah ada.)

---

## 🔜 BESOK (cek cepat — ~15 menit)
- [ ] Login `skkmigas` → **Contracts → Ajukan Permintaan Data** → pilih dataset/penyedia → Kirim → muncul kontrak REQUESTED baru
- [ ] Login `phe` (⚠️ login ulang agar token punya `participant_id`) → **Permintaan Masuk** → Setujui → Aktifkan
- [ ] Pastikan status berubah nyata & ringkas alur consumer→provider benar
- [ ] (opsional) reset kontrak demo ke REQUESTED untuk demo berikutnya:
      `PATCH /policy-contract/{domain}/contracts/{id}` body `{consumer_id,provider_id,name,status:"REQUESTED"}`

---

## 📋 ROADMAP SAMPAI SELESAI

### Phase 3 — Agreement (perjanjian formal) ✅ SELESAI (2026-06-02)
- [x] Service `agreementsApi.create/list` → `POST/GET /policy-contract/{domain}/agreements` `{contract_id, effective_from, effective_to}`
- [x] Hooks `useAgreements` + `useCreateAgreement`
- [x] Komponen `CreateAgreementDialog` (set masa berlaku, default +5 thn)
- [x] ProviderInbox: kontrak ACTIVE → tombol "Buat Perjanjian" / badge "Perjanjian s/d <tgl>"
- [x] Contracts detail: daftar agreement + masa berlaku + status
- [x] Tervalidasi: token `phe` (provider) bisa POST agreement (201); status auto APPROVED
- Catatan BE: list agreement filter hanya by `status` → filter per-contract di FE; agreement auto-APPROVED (belum ada workflow approve terpisah)

### Phase 4 — Transfer Center (pertukaran data nyata via connector)
**TERVERIFIKASI (2026-06-02): connector mengembalikan DATA ASLI** (uji: download 793 byte
GeoJSON `wilayah_kerja` dari node geo via `geo-api:8000`). Bukan placeholder. Sudah dibereskan di BE:
- [x] **BE**: tambah `OgcApiFeaturesAdapter` + daftarkan di `protocol_adapter_factory.py` (protokol OGC_API_FEATURES kini didukung; sebelumnya `ValueError`)
- [x] **BE**: `bootstrap_local.py` kini import model `connector` → tabel `conn_transfer_processes`/`conn_data_transfers` ikut dibuat (sebelumnya tidak ada → initiate 500)
- [x] **Data**: endpoint 5 dataset dinormalkan `localhost:8000` → `geo-api:8000` (di DB) agar terjangkau dari container `dataspace`

PRASYARAT transfer berhasil (penting untuk FE Phase 4):
  1. Dataset **tertaut** ke kontrak (`datasets:[{dataset_id, dataset_policy_id}]`) — bukan `[]`
  2. Agreement **status ACTIVE** (bukan APPROVED) — join `get_by_agreement_and_dataset_id` syaratkan ACTIVE → perlu PATCH `/agreements/{id}` `{contract_id, status:"ACTIVE"}`
  3. `dataset.endpoint.url` terjangkau dari container + protokol punya adapter (REST/OGC)

FE yang harus dibangun:
- [x] **BE list transfer** `GET /connector/{domain_id}/transfers` ditambahkan (read-only) — dipakai matrix dashboard
- [ ] Service connector: `POST /connector/initiate {domain_id, agreement_id, dataset_id}` → `POST /connector/{id}/start` → `GET /connector/{id}/status` (poll) → `GET /connector/{id}/download`
- [ ] Service+UI: **aktivasi agreement** (PATCH status ACTIVE) sebelum transfer; dan **penautan dataset** saat buat kontrak (Phase 5)
- [ ] Halaman/panel **Transfer**: pilih agreement ACTIVE + dataset → initiate → start → progress bar (poll status; opsi WS `/connector/{id}/monitor`) → unduh saat COMPLETED
- [ ] Status: INITIATED/TRANSFERRING/COMPLETED/FAILED/PAUSED

⚠️ KEPUTUSAN TERBUKA:
- **URL dataset internal vs publik**: connector butuh `geo-api:8000` (internal), tapi konsumen OGC eksternal/FE butuh URL publik (`localhost:8000`/domain). Sekarang di-set ke `geo-api:8000`. Solusi proper: pisahkan url internal vs publik, atau connector menulis-ulang host.
- **Deploy ZIP perlu di-regenerate**: paket `gxspace-feature-connector.zip` belum memuat 2 perbaikan BE di atas (OGC adapter + bootstrap connector models). Regenerate sebelum kirim ke tim.
- Endpoint provider/consumer "dummy" sebenarnya stream HTTP nyata (fallback URL GeoServer hardcoded bila endpoint kosong).
- Bug BE: `PATCH /data-catalog/{domain}/datasets/{id}` → 500 (ValidationError tak ter-handle di error-map) — normalisasi URL terpaksa via DB.

### Phase 5 — Penautan dataset nyata di kontrak (perlu dukungan BE)
- [ ] **BE**: ekspos relasi dataset ↔ dataset-policy (list dataset-policy sertakan `dataset_id`) agar FE bisa kirim `datasets:[{dataset_id, dataset_policy_id}]`
- [ ] FE: ubah RequestContractDialog → pilih dataset + policy aksesnya → kirim di `datasets[]` (bukan hanya di deskripsi)
- [ ] Tampilkan dataset tertaut nyata di detail kontrak & inbox

### Phase 6 — Penyempurnaan & produksi
- [ ] Enforcement role di BE (pastikan hanya provider kontrak yang boleh approve; consumer yang boleh request) — saat ini hanya AuthenticatedUserGuard
- [ ] KKKS Upload→Publish dataset dari node geospasial (:8000) → register ke fabric
- [ ] Audit trail: tampilkan jejak perubahan status kontrak/transfer (entry_hash/prev_hash)
- [ ] Notifikasi (permintaan baru masuk / disetujui) + badge count di nav
- [ ] Re-theme Login ke design tokens; global search; states empty/error menyeluruh
- [ ] Re-enable Keycloak SSO (saat ini OFF) bila dibutuhkan produksi
- [ ] Pisah role asli: buat user CONSUMER khusus SKK Migas dengan participant_id (sekarang skkmigas = superadmin tanpa participant)

---

## ⚠️ Catatan penting (jangan lupa)
- **"provider" itu kontекстual** = `contract.provider_id` (participant id), bukan label tetap di org. Governance org ≠ participant.
- Siklus kontrak: `REQUESTED → APPROVED → ACTIVE` (atau `REJECTED`). Tidak ada state-machine enforcement (boleh PATCH mundur).
- PATCH kontrak **wajib** sertakan `consumer_id, provider_id, name` (+`status`), bukan status-saja.
- POST kontrak **wajib** `description` (≥3) & list `contract_policies`/`datasets` (boleh `[]`).
- DELETE kontrak ada (204).
- Ubah source BE (`gxspace/`) → `docker compose up -d --build dataspace` (DB di volume terpisah, tidak hilang); user perlu login ulang bila klaim JWT berubah.
- BE limit listing minimal 5 (limit<5 → 422).
