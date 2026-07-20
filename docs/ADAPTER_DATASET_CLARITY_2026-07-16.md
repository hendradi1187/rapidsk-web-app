# Delegasi — Adapter ↔ Dataset: Traceability, Penjelasan Flow, & Discoverability

Tanggal: 2026-07-16 · Untuk: implementor (Opus) · Konteks: user komplain "blindbox" — (1) di adapter tidak kelihatan data ingest mana yang DIPAKAI dataset mana & mana yang nganggur, (2) pengaturan cara adapter narik data tidak dijelaskan di GUI, (3) tombol Tambah Dataset tidak menjelaskan metadata datang dari mana (koleksi adapter yang mana), (4) kategori WK/FLD muncul "ajaib" tanpa penjelasan asal & tanpa CTA setup kalau belum ada, (5) setup adapter ngumpet di Settings, orang tidak tahu tempatnya, (6) tidak ada preview saat memilih koleksi di dialog dataset.

## Peta kondisi sekarang (sudah diverifikasi, jangan ulang dari nol)
- **Sumber kebenaran sambungan dataset↔adapter SUDAH ADA di data**:
  - Dataset hasil "Dari Adapter" menyimpan `endpoint_metadata.runtime` (di FE: `endpoint_runtime`) berisi `domain_code`, `source_type: "OGC_API_FEATURES"`, `collection_path: "/api/v1/ogc/ogc/collections/{domain_code}/items"`, dan `endpoint_url` = base URL adapter.
  - Koleksi adapter: `adapterServiceApi.listCollections()` → `GET /adapter-service/api/v1/ogc/ogc/collections` → `{collections:[{id, domain_code, title, item_type, crs}]}` (live: WK/WLL/FLD/FP/SEI).
  - Task ingest: `adapterServiceApi.listTasks()` → `/data-ingestion/` (punya `domain_code`, `status`, `provider`, `source_type`).
  - Items per koleksi: `adapterServiceApi.listItems(domainCode, {limit,offset})` → `/ogc/ogc/collections/{code}/items`. CATATAN: percobaan `?limit=1` pernah balas 422 REQUEST_VALIDATION_ERROR — cek openapi adapter (`GET /adapter-service/openapi.json` atau `/adapter-service/api/v1/openapi.json` via wrapper) untuk param sah + apakah respons punya `numberMatched`/total. PATOKAN BE, jangan mengarang param.
- **File kunci**:
  - `src/components/settings/AdapterFlowWizard.tsx` — wizard ingest (dipakai di `src/pages/Settings.tsx`, tab default provider = "adapter").
  - `src/components/datasets/PublishDatasetDialog.tsx` — create dataset; tombol "Dari Adapter" (~line 496-533), `DOMAIN_CODE_TO_KEY`, `buildAdapterRuntime`, `applyAdapterCollection`.
  - `src/pages/Datasets.tsx` — tombol "Tambah Dataset" (~line 724), edit dialog juga punya "Dari Adapter" (~line 1118-1142), list dataset TANPA badge sumber.
  - `src/pages/Settings.tsx` — `defaultSettingsTab` (~line 279); BELUM baca query param `?tab=`.
- **Yang hilang total di UI**: mapping dua arah (koleksi→dataset & dataset→koleksi), penjelasan asal kategori, CTA setup saat kosong, preview koleksi, deep-link ke tab adapter.

## Aturan main
- BE = source of truth. Verifikasi live pakai wrapper sendiri: `RAPIDSK_PORT=8299 node server/bootstrap.cjs` (JANGAN 8282 — punya user), login `POST /api/v1/identity-provider/auth/login` `{"username":"skkmigas","password":"Admin@12345"}` → refresh `application_code:"ALL"`. Matikan wrapper setelah selesai.
- Copy UI bahasa Indonesia, gaya ikut sekitar. Toast via sonner.
- Jangan regresi: guard OGC runtime (`ogcRuntimeGuardError`), filter layer ingestible, semua fix TransferCenter/preview/wrapper. Jangan commit git, jangan sentuh `.env`/`config/runtime.json`.
- Gates: `npx tsc -p tsconfig.app.json --noEmit` 0 error file tersentuh (banyak error pre-existing di file lain — filter) · eslint 0 · `npx vitest run` semua pass (85 existing + baru) · `npx vite build` sukses (dist fresh).

## FASE 0 — Verifikasi data (sebelum koding, tulis di LAPORAN)
1. Openapi adapter via wrapper: param sah `/collections/{code}/items` (limit min/max? offset?), field total (`numberMatched`?). Kalau tak ada count murah, hitung dari `features.length` dengan limit kecil yang SAH dan tampilkan "≥N".
2. Ambil contoh dataset live (`GET /api/v1/data-catalog/{domainId}/datasets`, domain `d1e6013c-a2dc-467b-bd35-f5ddc915b422`) → konfirmasi bentuk `endpoint_metadata.runtime.domain_code` & `endpoint.url` untuk dataset hasil adapter vs manual (mis. dataset "Lapangan - Data" = manual REST_API; cari yang OGC buat pembanding).
3. Konfirmasi `listTasks()` respon punya `domain_code` per task.

## FASE 1 — Lib traceability murni + test
Buat `src/lib/adapter-dataset-link.ts` (pure, tanpa React):
- `datasetAdapterLink(dataset)` → `{ viaAdapter: boolean; domainCode: string | null }`: viaAdapter bila `runtime.source_type === "OGC_API_FEATURES"` && `runtime.collection_path` berisi `/ogc/collections/` (JANGAN cuma cocokkan URL host — adapterEndpoint bisa ganti).
- `groupDatasetsByCollection(datasets)` → Map<domain_code, dataset[]>.
- Unit test `src/test/adapter-dataset-link.test.ts`: dataset adapter (runtime lengkap) → viaAdapter true + code benar; dataset manual REST_API → false; runtime null/string rusak → false tanpa throw.

## FASE 2 — Sisi ADAPTER (Settings → tab Adapter): "koleksi ini dipakai siapa"
1. Section baru **"Koleksi Hasil Ingest"** di AdapterFlowWizard (atau komponen sibling di tab yang sama): kartu per koleksi (`listCollections`) berisi: title + `domain_code` + jumlah item (sesuai temuan F0) + **daftar dataset yang memakainya** (nama + status PUBLISHED/DRAFT, dari catalog datasets domain-domain yang tersedia di `domainOptions`) ATAU state "Belum dipakai dataset mana pun" + tombol **"Buat dataset dari koleksi ini"** → navigasi ke halaman Datasets dengan dialog Tambah Dataset terbuka & koleksi ter-preselect (pakai state navigasi/router query, mis. `/datasets?create=1&adapterCollection=WK`; Datasets.tsx membaca param lalu buka PublishDatasetDialog dengan prefill).
2. Panel penjelasan alur (collapsible, sekali baca): "Koneksi sumber → pilih layer → tag kategori (WK/FLD/…) + klasifikasi → ingest → jadi koleksi OGC → dipakai modul Dataset". 3-5 kalimat, bukan esai.
3. Di daftar task ingest: tampilkan chip `domain_code` → jelas task mana menghasilkan koleksi mana.

## FASE 3 — Sisi DATASET (PublishDatasetDialog + edit di Datasets.tsx): "metadata ini dari mana"
1. Bagian endpoint diberi **pilihan sumber eksplisit**: "Dari Adapter (rekomendasi untuk data hasil ingest)" vs "URL manual (WFS/REST langsung)". Bukan redesign besar — cukup label + helper text di atas tombol yang sudah ada.
2. Kartu koleksi di picker ditambah: jumlah item (sesuai F0) + tombol kecil **"Contoh data"** → fetch `listItems(code, {limit: <sah>})` → tampilkan 3 fitur pertama (label + 3-4 atribut utama, pakai pola `FIELD_LABELS`/`labelOf` dari TransferMapPreview — boleh ekstrak util kecil). TANPA peta (ringan saja).
3. Helper text asal kategori: "Kategori (WK, FLD, …) berasal dari tag yang dipilih saat ingest di Pengaturan → Adapter — bukan deteksi otomatis."
4. **Empty state ber-CTA**: kalau `listCollections` kosong / adapterEndpoint belum diset → pesan jelas + tombol "Setup Adapter" → link `/settings?tab=adapter`.
5. Setelah koleksi dipilih: chip ringkasan "Terhubung: koleksi WK — Wilayah Kerja (adapter)" dekat field URL, supaya user tahu apa yang barusan terjadi.
6. Terapkan hal yang sama (minimal helper + chip + CTA) di dialog edit dataset di `Datasets.tsx` (~line 1118) — jangan sampai create dan edit beda perilaku.

## FASE 4 — Discoverability & badge
1. `Settings.tsx`: dukung deep-link `?tab=<nama>` (useSearchParams) → `defaultSettingsTab` dihormati sebagai fallback.
2. Halaman Datasets: di tabel/list dataset, **badge sumber** per baris: "Adapter · WK" (dari lib F1) atau "Manual". Satu badge kecil, bukan kolom lebar.
3. Banner info tipis di atas halaman Datasets (dismissible via localStorage): "Punya data di GeoServer/ArcGIS? Ingest dulu lewat Adapter agar muncul sebagai koleksi siap pakai → [Buka Pengaturan Adapter]".

## FASE 5 — Verifikasi live + gates
1. Wrapper 8299: buktikan `listCollections` + `listItems` (param sah dari F0) + datasets catalog jalan; dump contoh hasil `datasetAdapterLink` untuk ≥2 dataset nyata (1 adapter, 1 manual) ke LAPORAN.
2. Gates lengkap (angka ditulis). Matikan wrapper.

## Checklist
- [x] F0 verifikasi openapi items + bentuk runtime dataset + tasks
- [x] F1 lib traceability + test
- [x] F2 koleksi→dataset di tab Adapter + CTA buat dataset + penjelasan alur + chip task
- [x] F3 dataset→koleksi di dialog create/edit + contoh data + CTA setup + chip ringkasan
- [x] F4 deep-link ?tab= + badge sumber + banner discoverability
- [x] F5 verifikasi live + gates

## LAPORAN (diisi implementor)

### FASE 0 — Temuan verifikasi live (wrapper 8299, token audience ALL)
Verifikasi dilakukan via wrapper sendiri di port 8299 (login skkmigas → refresh `application_code:"ALL"`), BUKAN 8282.

**F0.1 — openapi adapter `/api/v1/ogc/ogc/collections/{domain_code}/items`** (dari `GET /adapter-service/openapi.json`, 200):
- `limit`: integer, **minimum 5, maximum 100, default 5**. `?limit=1` → **422** (terkonfirmasi) karena di bawah minimum. Param sah terkecil = **5**.
- `offset`: integer, minimum 0, default 0.
- Param lain: `bbox`, `access_tier`, `operator`, `include_metadata` (semua opsional).
- **Ada count murah**: respons items punya field `total` (+ `number_returned`, `has_next`, `has_prev`, `limit`, `offset`). Jadi jumlah item pasti bisa ditampilkan dari `total`, tidak perlu "≥N".
- Live counts (limit=5): **WK=5, WLL=0, FLD=0, FP=2, SEI=0**.
- Bentuk respons: `{ type, domain, domain_code, access_tier, number_returned, total, limit, offset, has_next, has_prev, features[], crs }`. Properti WK: `wk_id, lokasi, nama_wk, operator, status_wk, provinsi_1, ...`.

**F0.1b — collections** (`GET /adapter-service/api/v1/ogc/ogc/collections` → `{collections:[…]}`): 5 koleksi WK/WLL/FLD/FP/SEI, tiap item `{id, domain_code, title, item_type:"feature", crs:["EPSG:4326"]}` (id == domain_code).

**F0.2 — bentuk runtime dataset** (domain `d1e6013c-a2dc-467b-bd35-f5ddc915b422`, 4 dataset):
- Dataset **hasil adapter** (OGC): "Wilayah Kerja (PSC Area)" & "Survei Seismik - Data" → `endpoint.protocol="OGC_API_FEATURES"`, `endpoint_metadata.runtime = { source_type:"OGC_API_FEATURES", domain_code:"WK"/"SEI", collection_path:"/api/v1/ogc/ogc/collections/{domain_code}/items" }`.
- Dataset **manual**: "Lapangan - Data" & "Sumur - Data" → `endpoint.protocol="REST_API"`, `endpoint_metadata.runtime = null`.
- Di FE `endpoint_metadata.runtime` dipetakan ke `endpoint_runtime` (lihat data-catalog service `toDataset`). `collection_path` memuat substring `/ogc/collections/` → cocok jadi patokan `viaAdapter` (bukan match host URL).

**F0.3 — tasks ingest** (`GET /adapter-service/api/v1/data-ingestion/`): tiap task punya field `domain_code` (contoh live: WLL, FLD, WK). Field lain: `id, domain_id, domain_name, type, status, classification, error_log, created_at, updated_at`. (`source_type`/`provider` null di data live ini — chip pakai `domain_code`.)

### FASE 1–4 — Yang dibangun (file)
**F1 — Lib traceability murni + test:**
- `src/lib/adapter-dataset-link.ts` (baru): `datasetAdapterLink(dataset)` → `{viaAdapter, domainCode}` (patokan runtime.source_type OGC + collection_path memuat `/ogc/collections/`, bukan match host); `groupDatasetsByCollection(datasets)` → `Map<domain_code, dataset[]>`. Membaca runtime dari `endpoint_runtime` / `endpoint_metadata.runtime` / `runtime`, aman null/string rusak.
- `src/test/adapter-dataset-link.test.ts` (baru): 9 test (adapter valid, endpoint_metadata mentah, manual null, path bukan OGC, source bukan OGC, string rusak/undefined/null, domain_code kosong, grouping, input kosong).
- `src/lib/feature-labels.ts` (baru): ekstrak `FIELD_LABELS`, `labelOf`, `summarizeValue`, `previewKeysFromFeatures` dari TransferMapPreview supaya dipakai ulang peek "Contoh data". `src/components/transfer/TransferMapPreview.tsx` diubah: pakai lib ini (hapus duplikasi), tak ada perubahan perilaku peta/guard.

**F2 — Sisi Adapter (tab Adapter):**
- `src/components/settings/AdapterCollectionsUsage.tsx` (baru): kartu per koleksi (`listCollections`) + jumlah item (`listItems` total, limit=5) + daftar dataset pemakai (dikelompokkan lewat lib F1 dari datasets semua domain di `domainOptions`) atau "Belum dipakai dataset mana pun" + tombol "Buat dataset dari koleksi ini" → `/datasets?create=1&adapterCollection=<code>`. Panel penjelasan alur collapsible.
- `src/pages/Settings.tsx`: render `<AdapterCollectionsUsage>` sibling di bawah `<AdapterFlowWizard>` di tab Adapter.
- `src/components/settings/AdapterFlowWizard.tsx`: chip `domain_code` di tiap baris riwayat task (F2.3).

**F3 — Sisi Dataset (create + edit):**
- `src/components/datasets/AdapterCollectionPicker.tsx` (baru): picker koleksi dipakai di KEDUA dialog — jumlah item per koleksi + tombol "Contoh data" (fetch `listItems(code,{limit:5})`, tampil 3 fitur pertama + 4 atribut via lib feature-labels, tanpa peta).
- `src/components/datasets/PublishDatasetDialog.tsx`: label "Sumber Endpoint" + helper (Dari Adapter vs URL manual), picker baru, empty-state ber-CTA → `/settings?tab=adapter`, chip ringkasan "Terhubung: koleksi WK — … (adapter)", helper asal kategori. Prop baru `presetAdapterCollectionCode` untuk prefill dari CTA F2.
- `src/pages/Datasets.tsx` (dialog edit): helper sumber+asal kategori, picker baru, empty-state CTA, chip ringkasan (di-set dari `datasetAdapterLink` saat buka edit). Create & edit kini sinkron.

**F4 — Discoverability & badge:**
- `src/pages/Settings.tsx`: deep-link `?tab=<nama>` via `useSearchParams`, Tabs dikontrol; `defaultSettingsTab` jadi fallback; perubahan tab menulis balik ke URL (replace).
- `src/pages/Datasets.tsx`: badge sumber per baris (grid + list) "Adapter · WK" / "Manual" (dari lib F1); banner discoverability tipis dismissible (localStorage `datasets_adapter_banner_dismissed`) dengan CTA "Buka Pengaturan Adapter"; membaca `?create=1&adapterCollection=` untuk buka dialog Tambah Dataset ter-prefill.

### FASE 5 — Bukti live + gates
**Bukti live `datasetAdapterLink` (domain `d1e6013c-…`, via wrapper 8299):**
- "Wilayah Kerja (PSC Area)" → `{ viaAdapter: true, domainCode: "WK" }` (adapter)
- "Survei Seismik - Data" → `{ viaAdapter: true, domainCode: "SEI" }` (adapter)
- "Lapangan - Data" → `{ viaAdapter: false, domainCode: null }` (manual REST_API)
- "Sumur - Data" → `{ viaAdapter: false, domainCode: null }` (manual REST_API)
- `listItems` counts (limit=5 sah): WK=5, FP=2, WLL/FLD/SEI=0. Wrapper 8299 sudah dimatikan.

**Gates (angka):**
- `npx tsc -p tsconfig.app.json --noEmit`: **0 error di file tersentuh** (24 error pre-existing di file lain, tak tersentuh).
- `npx eslint <file tersentuh>`: **0 error** (18 warning, semua `any`/exhaustive-deps pre-existing di Settings.tsx; direktif eslint-disable baru yang tak perlu sudah dihapus).
- `npx vitest run`: **94 pass / 94** (85 existing + 9 baru), 11 file test.
- `npx vite build`: **sukses**, dist fresh (built in 54.92s, `dist/index.html` ter-regenerate).
