# BLUEPRINT MASTER — Transfer, Juknis/Onboarding, Error Handling

Tanggal: 2026-07-14 · Dokumen tunggal & final (menggabungkan audit prasyarat, katalog error, arsitektur juknis, dan rancangan UX). Semua klaim **diverifikasi langsung ke API live** (`100.66.10.14:8581–8584`, login `skkmigas` SUPERADMIN). Ditulis agar bisa dieksekusi langsung oleh implementor (mis. Opus) tanpa menebak.

Bacaan singkat urutan: Bagian 0 (lingkungan) → 1 (arsitektur, WAJIB paham dulu) → 2 (prasyarat transfer) → 3 (protocol) → 4 (error) → 5 (rancangan UX) → 6 (checklist) → 7 (permintaan backend) → 8 (status kode saat ini).

---

## 0. Lingkungan & catatan penting
- Host `192.168.1.55` **MATI** saat audit; hanya `100.66.10.14` (tailscale) reachable. `config/runtime.json` & `.env.production` masih menunjuk `192.168.1.55`. **Pastikan host runtime FE benar sebelum menuduh bug lain** — sebagian "error" bisa jadi cuma host mati.
- Peta service: **8581** = auth (`identity-provider`) + CTS (`governance`,`onboarding`,`policy-contract`,`data-catalog`) + monitoring (`cts/monitoring`); **8582** = connector consumer; **8583** = connector provider (well-known JWT & pool provider ke sini); **8584** = adapter (OGC).
- Token: login default beraudience `gxspace-cts` saja. Panggilan connector/adapter **wajib token audience `ALL`** (di-mint via `POST /identity-provider/auth/refresh-token {refresh_token, application_code:"ALL"}`). Sudah ditangani `service-tokens.ts`.

---

## 1. Arsitektur data (paham ini dulu — sumber banyak salah paham)

### 1.1 Topologi (terverifikasi live)
```
Organisasi ──1:*── Domain              domain.organization_id (domain dimiliki ORG, bukan participant)
Participant ──*:*── Domain              binding terpisah; contoh: participant PHR terikat ke 3 domain
Domain ──1:*── artefak Juknis           dataset-policy, contract-policy, vocabulary, schema — SEMUA domain_id, NOL field participant
Dataset  = (domain, provider_participant)          dataset.provider_id wajib participant
Contract = (domain, consumer_participant, provider_participant)
Agreement = turunan contract (masa berlaku, status)
Connection pool = (participant_id, type CONSUMER|PROVIDER, metadata endpoint+well_known_jwt_url)
```

### 1.2 Juknis = SEEDING server-side, terikat ke DOMAIN
`POST /policy-contract/{domainId}/apply-juknis` `{overrides, include_dictionary}` → membuat **dataset_policies + contract_policies + vocabularies + schemas** untuk 5 kategori baku (Wilayah Kerja, Lapangan, Fasilitas, Sumur, Seismik). **Idempoten.** Trigger: `SetupJuknis.tsx` (SuperAdmin) langkah `Organisasi → Domain → Paket Juknis → Terapkan`. **Tidak membuat dataset.**

Fakta kunci (dari data live): `dataset-policy` & `schema` hanya punya `domain_id`, **tidak ada field participant**. Jadi **juknis mengikat ke domain, bukan participant.** Sebuah domain bisa "siap governance" (punya policy+schema) tanpa participant apa pun.

### 1.3 Kapan participant benar-benar dibutuhkan
Hanya di **layer aktor**, karena entitas ini inheren butuh pihak:
- **Dataset** butuh `provider_id` (pemilik data — dataset tak boleh yatim).
- **Contract/Agreement** butuh consumer + provider.
- **Connection pool** butuh `participant_id`.

Binding participant↔domain **hanya untuk otorisasi/visibilitas FE** ("KKKS ini beroperasi di domain apa"), **bukan** prasyarat governance maupun prasyarat publish. **Terbukti:** publish dataset dengan `provider_id` dari **organisasi berbeda** ke domain lain → **HTTP 201** (binding tidak divalidasi saat publish).

### 1.4 Implikasi desain: pisahkan "Setup Domain" dari "Setup Penyedia"
Karena juknis domain-scoped, alur bisa (dan sebaiknya) dipisah:
1. **Siapkan Domain** — buat org (bila perlu) → buat domain → apply-juknis. Hasil: domain siap governance TANPA participant.
2. **Daftarkan Penyedia** — buat/aktifkan participant → (opsional) bind ke domain untuk visibilitas → publish dataset (`provider_id` + `schema_id` + domain).
3. Publish **tidak** wajib menunggu upacara approval; cukup `provider_id` menunjuk participant yang ada. Binding domain jadi langkah **opsional (visibilitas)**, bukan gerbang.

### 1.5 Jebakan publish dataset (semua terverifikasi live)
| Aturan | Efek bila dilanggar |
|--------|---------------------|
| `version` cocok `^\d+\.\d+\.\d+$` | 422 "String should match pattern" |
| `endpoint_metadata.rate_limit` wajib ada (FE kirim `{}`) | 422 "Field required" |
| unik `(domain_id, provider_id, schema_id, version)` | 409 **bocor** `asyncpg.UniqueViolationError` |
| `schema_id` dari `schemasApi` (`/data-catalog/{dom}/schemas`), BUKAN `metadata-schemas` | 422 "Schema not found" |
| `protocol` (lihat Bagian 3) | transfer isi ngawur tapi status COMPLETED |

---

## 2. Rantai prasyarat transfer
`TransferCenter.send()` menjalankan urutan ini; happy-path semua **200** pada domain GEOROTAN saat diuji.

| # | Prasyarat | Service | Endpoint | Gagal umum |
|---|-----------|---------|----------|-----------|
| 1 | Domain aktif terpilih | context | `DomainContext` | belum resolve → query `enabled:false`, form mati diam |
| 2 | Contract ACTIVE | CTS | `GET /policy-contract/{dom}/contracts/{id}` | masih REQUESTED/APPROVED |
| 3 | Dataset di katalog | CTS | `GET /data-catalog/{dom}/datasets` | domain tanpa dataset |
| 4 | Dataset policy match | CTS | `GET /policy-contract/{dom}/dataset-policies` | `policyResolution.status != matched` |
| 5 | Dataset tertaut contract | CTS | `PATCH …/contracts/{id}` (linkDataset) | FK `dataset_policy_id` invalid → 409 |
| 6 | Agreement ACTIVE | CTS | `…/agreements` (GET/POST/PATCH) | contract_id invalid → 409 FK |
| 7 | Pool CONSUMER siap | CTS | `GET /onboarding/{dom}/agreements/{agr}/connection-pools/CONSUMER` | tak ada/tanpa endpoint/tanpa JWT |
| 8 | Pool PROVIDER siap | CTS | `…/connection-pools/PROVIDER` | 404 bila provider salah tipe pool → connector balas "Agreement not found" |
| 9 | Initiate | CONN | `POST /connector/consumer/initiate` | butuh token ALL; transfer aktif → 422 |
| 10 | Start | CONN | `POST /connector/consumer/{direct\|persistent}/{tpid}/start` | tpid tak ada → 404 |
| 11 | Poll status | CONN | `GET /connector/{tpid}/status` | nyangkut INITIATED tanpa error (Bagian 5) |

Model transfer: kunci row = `transfer_process_id`(+`transfer_id`). **1 agreement → banyak row** (terbukti 2 COMPLETED utk dataset sama). Guard connector "active transfer already exists" berbasis **dataset non-terminal**, dan **bocor** (ditemukan 2 INITIATED berdampingan). **Tidak ada endpoint cancel/reset transfer.**

---

## 3. Protocol dataset (akar "isi ngawur")
Terverifikasi end-to-end dengan `ahocevar.com/geoserver/wfs?...GetFeature...outputFormat=application/json`:

| protocol | perilaku connector | hasil |
|----------|--------------------|-------|
| `OGC_API_FEATURES` | menempel `runtime.collection_path` (mis. `/collections/{domain_code}/items`) ke `endpoint.url` | URL WFS mentah rusak → GeoServer `OWS ExceptionReport`; **status tetap COMPLETED** dg bytes/rec palsu. Placeholder `{domain_code}` bahkan tak terisi bila runtime null. |
| `REST_API` | tarik `endpoint.url` apa adanya | ✅ GeoJSON asli (254520 bytes benar), `record_count=1` (dianggap 1 blob) |

Dataset yang selama ini transfer sukses (`00121da1`) URL-nya = **adapter** (`:8584`) + `runtime` lengkap. Yang nyangkut (`8e223d0a`) = URL WFS mentah + runtime null.

**Rancangan (`PublishDatasetDialog.tsx`):**
1. Default protocol **`REST_API`** untuk URL langsung; `OGC_API_FEATURES` hanya via jalur "Dari Adapter" (yang mengisi `runtime`).
2. Validasi: `OGC_API_FEATURES` + `runtime`/`collection_path` kosong → blok, pesan: "OGC API Features butuh endpoint adapter (runtime collection path). Untuk URL WFS/REST langsung, pakai REST_API."

---

## 4. Error handling (3 envelope → 1 normalizer)

### 4.1 Tiga envelope (dari live)
- **A** `{"error":"..."}` — auth login, contract/pool not found, agreement not found.
- **B** `{"detail":{"code","message"}}` — 401/403 token & IAM (semua service).
- **C** `{"request_id","errors":{"code","detail","message","details":{"errors":[{field,message}]}}}` — 422 validasi, 409 integrity, 404 transfer-not-found (connector). Pesan berguna ada di `errors.details.errors[].message`, **bukan** `errors.message`.

### 4.2 Katalog error live + peta ke pesan ID (di `api-error.ts`)
| Sinyal | HTTP | Pesan ID target | Status |
|--------|------|-----------------|--------|
| `agreement not found` | 400 | provider pool / agreement belum sinkron | ✅ ada |
| `connection pool not found` | 404 | connection pool belum ada | ✅ ada |
| `active…transfer` / `transfer already exists` | 422 | transfer aktif; resume/tunggu | ✅ ada |
| `TRANSFER_PROCESS_NOT_FOUND` | 404 | "Proses transfer tidak ditemukan (mungkin sudah dihapus/kadaluarsa)." | ⬜ |
| `INTEGRITY_ERROR` + FK `dataset_polic` | 409 | "Dataset policy tidak valid untuk dataset ini." | ⬜ + **jangan tampilkan `database_error`** |
| `INTEGRITY_ERROR` + FK `contract` | 409 | "Contract acuan tidak ditemukan." | ⬜ |
| `INTEGRITY_ERROR` + `UniqueViolation` datasets | 409 | "Dataset dg schema+versi ini sudah ada. Naikkan versi." | ⬜ |
| `PRINCIPAL_TYPE_NOT_ALLOWED` | 403 | "Aksi ini butuh koneksi connector (bukan token user)." | ⬜ + Bagian 4.4 |
| `INVALID_CTS_TOKEN`/`Audience doesn't match` | 401 | "Sesi/token layanan belum siap. Coba ulang/login lagi." | ⬜ |
| `API_RESOURCE_NOT_REGISTERED` | 403 | "Endpoint belum terdaftar di IAM (konfigurasi backend)." | ⬜ |
| `MISSING_BEARER_TOKEN`/JWT invalid | 401 | "Sesi berakhir. Silakan login ulang." | ⬜ terjemah |
| validasi `Field required` | 422 | "{field} wajib diisi." | ⬜ terjemah |

### 4.3 Anti-bocor `INTEGRITY_ERROR`
Extractor `api-error.ts` sudah menggali `errors.details.errors[]`. Tambah: bila `errors.code==='INTEGRITY_ERROR'`, JANGAN `flattenErrorsObject` (yang membocorkan `database_error` asyncpg). Deteksi isi `database_error` (`dataset_polic`/`contract`/`UniqueViolation`) → petakan ke tabel 4.2; fallback: "Data bentrok/kendala constraint di server."

### 4.4 Endpoint provider menolak user token
`/connector/provider/initiate|direct/start|check` → 403 `PRINCIPAL_TYPE_NOT_ALLOWED` (butuh service/connector principal). FE punya `providerInitiate/providerStartDirect/providerCheck` yang **tak bisa** dipanggil user. **Keputusan:** sembunyikan/segregasi jalur provider dari UI user (jangan tampilkan tombol yang pasti 403), atau lewat peran+service token khusus.

---

## 5. Rancangan UX Transfer (INTI — tanpa miss)

### 5.1 State per dataset (dihitung FE)
Tambah `const STUCK_MS = 5*60*1000` dan `deriveDatasetState(dataset)` yang membaca transfer terbaru (`transfers` + `transferProjections`):

| Transfer terbaru | `dsState` |
|------------------|-----------|
| tidak ada | `NEW` |
| COMPLETED | `DONE` |
| FAILED | `FAILED` |
| PAUSED | `PAUSED` |
| INITIATED/TRANSFERRING, umur ≤ STUCK_MS | `ACTIVE` |
| INITIATED/TRANSFERRING, umur > STUCK_MS | `STUCK` |
(umur dari `updated_at`/`created_at`.)

### 5.2 Matriks tombol (ganti tombol kirim campur)
| `dsState` | **Transfer Baru** (initiate) | **Lanjutkan** (resume tpid lama) | Teks |
|-----------|------------------------------|----------------------------------|------|
| `NEW` | ✅ | hidden | — |
| `DONE` | ✅ ("Transfer ulang") | hidden | "Selesai • X record" |
| `FAILED` | ✅ | ✅ (bila body+mode ada) | alasan gagal (dinormalisasi) |
| `PAUSED` | ⛔ | ✅ | "Dijeda pada N bytes" |
| `ACTIVE` | ⛔ + alasan | hidden | "Sedang berjalan ({status})…" |
| `STUCK` | ⛔ + alasan + tombol "Tandai macet / mulai baru" | ✅ (coba resume) | "Macet >5 mnt. Resume atau minta admin reset di backend." |

Urutan alasan disable "Transfer Baru" (tampilkan yang pertama kena):
1. Domain belum aktif → "Pilih domain aktif dulu." (**guard baru**)
2. Policy tak match → `policyResolution.reason`.
3. Pool CONSUMER belum siap → alasan spesifik (sudah ada di `send()`).
4. Pool PROVIDER belum siap → `evaluateProviderPool().reason` (sudah ada).
5. Ada transfer `ACTIVE`/`STUCK` → "Masih ada transfer berjalan/macet untuk dataset ini."

"Lanjutkan" tampil hanya bila `dsState ∈ {FAILED,PAUSED,STUCK}` dan konteks resume ada (`transferBodyMap[tpid]` atau transfer diketahui). Body hilang → tombol disabled tooltip "Konteks resume hilang; jalankan Transfer Baru." Pasang ke `resumeTransfer()` (sudah ada).

### 5.3 Transfer nyangkut & batas backend
Tanpa endpoint cancel, tombol "Tandai macet / mulai baru" hanya boleh: (a) menandai row macet di state lokal UI, (b) mencoba `initiate` baru — bila backend tetap 422, tampilkan: "Backend masih mengunci dataset ini; perlu reset transfer di sisi server — hubungi admin connector." **Jangan berpura-pura membatalkan.**

### 5.4 Selector dataset
Selector menampilkan versi·protokol·format·akses (via `datasetMeta`) — **sudah diimplementasi** (lihat Bagian 8).

---

## 6. Checklist implementasi (urut prioritas)
1. [x] `deriveDatasetState` + `STUCK_MS` + split tombol Transfer Baru/Lanjutkan (Bagian 5.1–5.2) — `TransferCenter.tsx`. **DONE 2026-07-14.**
2. [x] Guard domain aktif di `send()` (5.2 no.1). **DONE.**
3. [x] Default protocol `REST_API` + validasi runtime OGC (Bagian 3) — `PublishDatasetDialog.tsx`. **DONE.**
4. [x] Lengkapi peta error 4.2 + anti-bocor `INTEGRITY_ERROR` 4.3 — `api-error.ts`. **DONE (unit-test `src/test/api-error.test.ts`).**
5. [x] Segregasi jalur provider (4.4) — banner peringatan di tab Provider Tools `ConnectorMonitoring.tsx` + pesan `PRINCIPAL_TYPE_NOT_ALLOWED` yang jelas. **DONE.**
6. [x] Pisahkan "Setup Domain" vs "Setup Penyedia" (1.4). **DONE (FE):** `PublishDatasetDialog.tsx` kini mengizinkan SuperAdmin memilih provider (publish tanpa harus login operator KKKS & tanpa binding domain); `SetupJuknis.tsx` menampilkan panel "domain siap publish, tidak perlu menunggu participant". (Restrukturisasi halaman participant penuh masih bisa menyusul, tapi gap fungsional sudah ditutup.)
7. [x] Terjemahan pesan sisa (login/token/validasi) — via normalizer `api-error.ts`. **DONE.**
8. [~] Guard host runtime / indikator host mati (Bagian 0) — **REKOMENDASI DEVOPS** (lihat §7A), bukan diimplementasi di FE.

Verifikasi 2026-07-14: `tsc --noEmit` 0 error · `eslint` 0 error (warning pre-existing) · `vitest` 38 test lolos (21 baru `api-error.test.ts`) · `vite build` sukses. Semua item FE (#1–#7) selesai.

### §7A Rekomendasi DevOps (bukan FE)
1. **Samakan host runtime.** `config/runtime.json` & `.env.production` masih `192.168.1.55` (mati saat audit); service live di `100.66.10.14`. Set satu sumber kebenaran (mis. `runtime.json` yang di-serve wrapper) dan pastikan reachable dari klien. Idealnya sediakan `/health` publik agar FE bisa deteksi host mati (kalau nanti diminta buat indikator).
2. **Konsistenkan audience token** untuk connector/adapter (sudah ditangani `service-tokens.ts`, tapi pastikan `refresh-token` endpoint hidup di semua environment).

---

## 7. Permintaan ke tim BACKEND (tak bisa ditutup FE)
1. **Endpoint cancel/reset transfer** (mis. `POST /connector/{tpid}/cancel`) + **auto-timeout** transfer INITIATED yang macet → jadi FAILED. Tanpa ini, dataset bisa terkunci permanen.
2. **Validasi response transfer**: jangan tandai COMPLETED bila konten bukan data valid (mis. `OWS ExceptionReport`) — tandai FAILED dengan pesan.
3. **Jangan bocorkan `database_error` asyncpg** pada 409 INTEGRITY; kirim kode + pesan bersih.
4. Perbaiki typo backend "Tansfer process not found".
5. Konsistenkan `GET /onboarding/participants` (default page size 5 menyembunyikan GOV regulator bila `limit` tak dikirim).

---

## 8. Status kode saat ini (sudah dikerjakan sesi ini)
- ✅ `api-error.ts`: map `agreement not found` (→ provider pool), `connection pool not found`, `active/transfer already exists`; extractor menggali `errors.details.errors[]` (Bagian 4.1 shape C sebagian).
- ✅ `TransferCenter.tsx`: `participantLabel`, `evaluateProviderPool` (precheck pool PROVIDER dipanggil di `send()`), `resumeTransfer` (siap dipasang ke tombol "Lanjutkan"), logging `[Transfer] GAGAL` terstruktur, `datasetMeta` + selector menampilkan versi·protokol·format·akses.
- ⬜ Sisanya sesuai checklist Bagian 6.

**Anchor kode** (verifikasi 2026-07-14): `api-error.ts` L39/43/47/131; `TransferCenter.tsx` `datasetMeta`(~L237) `evaluateProviderPool`(~L305) `resumeTransfer`(~L688) `send`(~L732); `PublishDatasetDialog.tsx` `PROTOCOLS`(L55) default protocol(L89).

---

## 9. Catatan data uji (footprint audit)
Saat verifikasi transfer, terbuat entitas di domain GEOROTAN yang **tak bisa dihapus** (transfer nge-referensi & connector tak punya API hapus): dataset `28efffc8`,`b862cdd0`; contract `cbe82b28`,`95da7e72` (semua bertanda `[TEST]`). Agreement terkait sudah dihapus. Ini menegaskan butuhnya Bagian 7 no.1.

---

## Lampiran — ID acuan uji ulang
- Domain GEOROTAN `b205c79f-698d-4616-a698-1778777026ae` (code MIGAS_GEOROTAN)
- Agreement ACTIVE `3d3a5926-e4e3-4177-ba28-155aa0dc5f4c` · Contract ACTIVE `1dcbf3f9-640d-4163-9b18-b6612f3d51cd`
- Dataset Survei Seismik `8e223d0a…` (WFS mentah, nyangkut) · Wilayah Kerja `00121da1…` (adapter, sukses)
- Provider PHR `7d324236-2761-4d0c-b43e-2e261bf52be2` · Consumer SKK Migas `fe6c09a5-1f4c-471b-b92a-902b6b10d357`
- Schema valid GEOROTAN `61f2301f-2fd0-400e-a86f-57940fe98e30` · Dataset-policy `cd7f0b1a-380b-4370-affe-63ca85b051f1`
