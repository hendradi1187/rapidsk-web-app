# Delegasi Fix — Celah Handling Dataset → Adapter → Transfer

Tanggal: 2026-07-15 · Untuk: implementor (Opus) · Sumber: audit 3 jalur paralel atas kode FE `dataspace-new`.

> **STATUS IMPLEMENTASI (2026-07-15):** Semua P0 & P1 DONE. P2 murah DONE. SKIP: T13, T15, A12, A14 (alasan di tiap item). Gate: tsc bersih di file tersentuh · eslint 0 error (1 warning pre-existing) · 57 test pass (40 existing + 17 baru) · vite build sukses.

**Aturan main (WAJIB):**
1. **Backend = source of truth.** Jangan menebak perilaku BE. Kalau sebuah fix butuh endpoint/field BE yang belum terbukti ada, implementasikan defensif (feature-degrade + pesan jelas), JANGAN mengarang endpoint.
2. Jangan meregresi fix yang baru masuk: fallback preview `TransferMapPreview` (adapter → persistent download → direct fetch), mode-selector transfer (kini selalu aktif selama ada dataset), filter Group Layer ArcGIS, validasi base_url koneksi, hydrate koneksi + persist `remoteQuery`, `extractProviderDetail`/`mapIntegrityError` di `api-error.ts`.
3. `tsc -p tsconfig.json` itu stub (`files:[]`) — typecheck asli: `npx tsc -p tsconfig.app.json --noEmit`. Project punya BANYAK error pre-existing di file lain; gate-nya = **0 error di file yang kamu sentuh** (filter output ke nama file).
4. Gate per selesai kerja: `npx tsc -p tsconfig.app.json --noEmit` (file tersentuh bersih) · `npx eslint <files>` 0 error · `npx vitest run` semua pass (40 test existing) · `npx vite build` sukses.
5. Ikuti idiom kode sekitar (bahasa Indonesia untuk copy UI, toast via `sonner`, error via `getApiErrorMessage`).
6. Tandai checklist di dokumen ini per item: `[x] DONE` / `[~] SKIP + alasan`.

---

## P0 — WAJIB (bug nyata, bikin data/aksi rusak)

### T1. Double-click "Transfer Baru" → double initiate → dataset kekunci
`src/pages/TransferCenter.tsx` — `send()` (~line 814). Guard `busy` baru di-set SETELAH blok guard sinkron; dua klik cepat dua-duanya lolos cek `activeTransfer` (state `transfers` masih stale) → dua proses INITIATED, connector tak punya cancel → dataset kekunci duplikat.
**Fix:** ref sinkron in-flight per `row.dom.key` di baris pertama `send()`; bail kalau sudah jalan. Terapkan juga di `resumeTransfer` (per transfer id).
- [x] DONE — `inFlightSendRef`/`inFlightResumeRef` (Set) guard sinkron di awal `send()` & `resumeTransfer`, dibersihkan di `finally`.

### T2. Retry "agreement not found" numpuk agreement ACTIVE yatim
`TransferCenter.tsx:960-971` + `ensureAgreementReady`. Saat gagal, kode bikin agreement BARU (excludeIds) + force-ACTIVE — padahal akar "Agreement not found" = PROVIDER pool hilang. Tiap attempt ninggalin agreement yatim.
**Fix:** sebelum retry-create, jalankan `evaluateProviderPool(contract.provider_id)`; kalau pool bermasalah → STOP, tampilkan alasan pool, jangan create agreement baru.
- [x] DONE — cek `evaluateProviderPool` sebelum branch retry-create; kalau pool NG, throw dengan alasan pool (tanpa bikin agreement baru).

### T3. `resolveDatasetEndpointUrl` buang base path kalau `collection_path` berawalan `/`
`TransferCenter.tsx:657-658`. `new URL("/collections/WK/items", "https://host/ogc/api/")` → `https://host/collections/WK/items` (path base hilang).
**Fix:** join manual: `base.replace(/\/+$/,"") + "/" + path.replace(/^\/+/,"")`.
- [x] DONE — di-extract ke `src/lib/dataset-endpoint.ts` (`joinEndpointUrl`), dipakai `resolveDatasetEndpointUrl`. Ada test.

### T4. Tombol "Lanjutkan" nyala tapi `resumeTransfer` cuma toast "context belum lengkap"
`canResumeTransfer` (:487-493) tidak mensyaratkan mode, `resumeTransfer` (:779) butuh mode.
**Fix:** masukkan `resolvePersistedTransferMode(transfer) != null` ke `canResumeTransfer`; saat false, tampilkan hint kenapa.
- [x] DONE — `canResumeTransfer` kini mewajibkan mode diketahui; title tombol menjelaskan kasus mode tak diketahui.

### T5. Cross-browser: Download persistent hilang, mode "Belum tercatat"
Gating Download `resolvePersistedTransferMode(t) === "persistent"` (:1518) bergantung localStorage; fallback API `t.mode` bisa null.
**Fix:** lazy-resolve via `transfersApi.status(t.id)`, cache di state; kalau tetap null, tampilkan Download dengan error handling rapi (404 → toast jelas), jangan hard-hide.
- [x] DONE — cache `lazyModeById` + effect resolve lazy via `status()`; Download tampil untuk COMPLETED kecuali mode dipastikan `direct`; 404 → toast "bukan persistent / salinan tak tersedia".

### D1. Edit dataset lolosin OGC_API_FEATURES tanpa `runtime.collection_path`
`src/pages/Datasets.tsx:395-428` (`handleUpdateDataset`) — guard publish (`PublishDatasetDialog.tsx:264-269`) tidak dimirror.
**Fix:** mirror guard yang sama sebelum mutate.
- [x] DONE — guard di-extract ke `ogcRuntimeGuardError` (dataset-endpoint.ts, ada test) dan dipanggil di `handleUpdateDataset`.

### D2. Edit auth non-NONE kirim config kosong → transfer privat gagal diam-diam
`Datasets.tsx:381-389`.
**Fix:** minimal blok submit ketika tipe ≠ NONE tapi kredensial kosong, dengan pesan jelas.
- [x] DONE — blok submit bila endpoint berubah + auth ≠ NONE (form tak punya field kredensial); pesan jelas agar tidak menimpa kredensial dengan config kosong.

### D3. L4 (RAHASIA) bisa dipublish, bahkan PUBLIC
`PublishDatasetDialog.tsx:55` + submit :253-291.
**Fix:** blok publish L4; warning/blok kombinasi L2–L4 dengan PUBLIC.
- [x] DONE — L4 disabled di dropdown + blok submit; L2–L4 auto-turun ke PRIVATE + blok submit bila PUBLIC.

### A1. Ganti koneksi adapter tidak mereset layer terpilih → task pasti FAILED
`AdapterFlowWizard.tsx:229-277,600-638`.
**Fix:** `useEffect` pada `selectedConnectionId` → clear `layerOptions` + `selectedLayerValue`.
- [x] DONE — effect terpisah pada `selectedConnectionId` mengosongkan `layerOptions` & `selectedLayerValue`.

### A4. Label berhias dikirim sebagai `layer_name` ArcGIS
`AdapterFlowWizard.tsx:458-459,632`.
**Fix:** simpan `title` bersih di `LayerOption`; kirim `title` sebagai `layer_name`.
- [x] DONE — `LayerOption.title` bersih; ArcGIS ingest kirim `title`, `label` hanya untuk display.

---

## P1 — PENTING (state salah / UX menyesatkan / paritas)

### T6. `deriveDatasetState` & `datasetStatuses` tercemar row PROVIDER/INBOUND
- [x] DONE — filter hanya baris CONSUMER/OUTBOUND via `transferProjections` (fallback: tanpa projeksi → dipakai). Diterapkan di `datasetStatuses` (memo) & `deriveDatasetState`.

### T7. Resume bisa nge-restart transfer yang masih jalan
- [x] DONE — `resumeTransfer` cek `status()` dulu; COMPLETED → info & stop; INITIATED/TRANSFERRING < 5 mnt → toast "masih jalan" & stop; hanya FAILED/PAUSED/stuck yang lanjut.

### T8. Label "Buat Baru" di row FAILED padahal aksinya resume
- [x] DONE — label diseragamkan jadi "Jalankan Lagi".

### T9. Auto-refresh tidak nge-refetch projections
- [x] DONE — `transferProjectionQ.refetch()` ditambah ke interval auto-refresh & `refreshOperationalState`.

### T10. "Cek Ulang" buang hasil `status()`
- [x] DONE — hasil `status()` di-merge ke cache list via `queryClient.setQueryData(transferKeys.list(domainId))` sebelum refetch.

### T11. COMPLETED + `error_message` tetap toast sukses
- [x] DONE — COMPLETED dengan `error_message` → `toast.warning` ternormalisasi.

### T12. `row.ready` pakai `poolReady` global, tombol pakai scoped pool
- [x] DONE — `ready` dihitung dari `isPoolReady(scopedPoolMap[dom.key] ?? myPool)`; `poolReady` global dihapus.

### D4. Edit protocol menawarkan GRPC/ODATA/GRAPHQL yang tak didukung connector
- [x] DONE — dibatasi ke `OGC_API_FEATURES` + `REST_API`.

### D5. Deteksi duplicate schema di publish = dead code
- [x] DONE — bandingkan `d.schema_id === sel.schema_id` (dengan fallback schema_name lama).

### D6. Edit Tags bisa geser `tags[0]` → dataset pindah domain diam-diam
- [x] DONE — `tags[0]` (domain key) dikunci: badge non-edit di form, field tags kelola tags[1..], build payload selalu prepend domain key lama.

### D7. Runtime JSON invalid → raw "Unexpected token"
- [x] DONE — validasi JSON.parse + harus object sebelum submit; toast "Runtime Context bukan JSON valid".

### A2. Tidak ada delete koneksi adapter (sampah abadi)
- [x] DONE — `deleteConnection(id)` (`DELETE /remote-sources/connections/{id}`) + tombol hapus berkonfirmasi; 404/405 → pesan "endpoint hapus belum tersedia di adapter"; sukses → refetch + clear selection.

### A3. Branch GeoServer tanpa guard ingestible (paritas ArcGIS)
- [x] DONE — GeoServer ditandai ingestible; hanya tak-ingestible bila BE eksplisit kirim `geometry_type` kosong/null (kalau field absen → tetap true, tidak mengarang).

### A5. Panel hasil tidak auto-refresh saat task SUCCESS
- [x] DONE — effect deteksi transisi status task → SUCCESS → `refetchItems()`.

### A6. Double-submit task ingestion
- [x] DONE — submit disabled saat `activeTask` masih non-terminal + hint.

### A7. `request()` adapter tidak baca `payload.message`
- [x] DONE — `extractAdapterErrorMessage` (exported, ada test) baca detail/error/message + nested; dipakai `request()`.

### A8. Tombol "Muat item" disable pakai kondisi salah
- [x] DONE — pakai `!effectiveDomainCode`.

---

## P2 — RAPIHAN

- **T14** epoch-tie sorting → secondary sort by id. [x] DONE — tie-break `id.localeCompare` di kedua comparator.
- **T16** mojibake separator di detail agreement → `·`. [x] DONE.
- **T17** fallback filename download → infer dari content-type. `connector.ts`. [x] DONE — geo+json→.geojson, json→.json, csv/zip/xml, else .bin.
- **T13** `adapterForDataset` dead untuk loading preview. [~] SKIP — dipakai untuk `adapterInfo` diagnostics preview; mengubahnya berisiko meregresi fallback preview. Dibiarkan.
- **T15** window agreement 5 tahun hardcode. [~] SKIP — `contract.effective_to` tidak tersedia di objek contract yang dipegang `ensureAgreementReady`; clamp butuh data BE tambahan → tidak trivial.
- **D8** label `documentation_url` kontradiktif. [x] DONE — copy diperbaiki: dokumentasi/referensi; sumber OGC = endpoint.url + runtime, REST = endpoint.url.
- **D9** PROVIDER tanpa participantId lihat semua dataset. [x] DONE — scopedDatasets kosong + banner peringatan.
- **D10** mutasi dataset saat `domainId` null. [x] DONE — gate + pesan di handleUpdate/handleDelete.
- **D11** minimal nama edit ≥ 3 char. [x] DONE.
- **D12** `data_format`/tags hardcode OGC untuk REST_API. [x] DONE — derive dari protocol; tags[0] tetap domainKey.
- **A9** `checkRemoteSource` pakai `localStorage.auth_token`. [x] DONE — `getServiceToken("ALL")` (fallback localStorage).
- **A11** `manualCatalogCode` nyangkut lintas domain. [x] DONE — reset saat `selectedDomainValue` berubah.
- **A12** guard adapter-self dilewati saat `adapterEndpoint` kosong. [~] SKIP — daftar host:port proxy adapter yang "dikenal" tidak tersedia secara andal di FE; menebaknya berisiko false-positive → butuh sumber BE.
- **A13** polling task 15s tanpa stop. [x] DONE — `refetchInterval` fungsi: 15s hanya bila ada task non-terminal, else stop.
- **A14** hydrate menimpa form kotor. [~] SKIP — hydrate sudah hanya jalan saat id berubah & pakai functional update; deteksi "form dirty" penuh butuh refactor form-state besar, di luar cakupan low-risk.
- **A15** ingest FeatureCollection kosong "sukses hampa". [x] DONE — blok bila `features` kosong.
- **A10** label preview "20 pertama" pada listItems. [x] DONE.

---

## Verifikasi akhir (dijalankan)
```
npx tsc -p tsconfig.app.json --noEmit   # file tersentuh: 0 error
npx eslint <semua file yang diubah>     # 0 error (1 warning pre-existing: 'pools' logical expr di TransferCenter)
npx vitest run                          # 57 pass (40 existing + 17 baru)
npx vite build                          # sukses
```
Test baru: `src/test/dataset-endpoint.test.ts` (T3 join URL + D1 guard OGC), `src/test/adapter-error.test.ts` (A7 ekstraksi message adapter).

## File yang diubah
- `src/lib/dataset-endpoint.ts` (BARU) — joinEndpointUrl, resolveDatasetEndpointUrl, ogcRuntimeGuardError.
- `src/pages/TransferCenter.tsx` — T1–T12, T14, T16.
- `src/pages/Datasets.tsx` — D1, D2, D4, D6, D7, D8, D9, D10, D11.
- `src/components/datasets/PublishDatasetDialog.tsx` — D3, D5.
- `src/api/services/data-catalog.ts` — D12.
- `src/api/services/connector.ts` — T17.
- `src/api/services/adapter-service.ts` — A2 (deleteConnection), A7 (extractAdapterErrorMessage).
- `src/components/settings/AdapterFlowWizard.tsx` — A1, A3, A4, A5, A6, A8, A9, A10, A11, A13, A15 + pembersihan type pre-existing.
- `src/test/dataset-endpoint.test.ts`, `src/test/adapter-error.test.ts` (BARU).
