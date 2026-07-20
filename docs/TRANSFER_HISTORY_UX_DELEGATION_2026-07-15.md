# Delegasi — Riwayat Transfer: Diagnosa Urutan + Paginasi + Filter + Kolom Waktu

Tanggal: 2026-07-15 · Untuk: implementor (Opus) · Konteks: user komplain "udah gaada ngaruh apa2, gaada paginasi dll".

## Konteks teknis (WAJIB baca dulu)
- File utama: `src/pages/TransferCenter.tsx`. Riwayat dirender dari `historyTransfers` (filter CONSUMER/OUTBOUND via projections + sort desc pakai `historyTimestamp` yang baru ditambah).
- Data: `transfersApi.list(domainId)` → `GET /connector/{domainId}/transfers` (connector 8582, via wrapper same-origin `/api/v1/...`). Projections: `transfersApi.listTransferProjections(limit)` → `GET /cts/monitoring/transfer-projections` (8581), **di-clamp max 100** (`clampMonitoringLimit`, `src/api/services/connector.ts`).
- BE = source of truth. Verifikasi live WAJIB pakai wrapper lokal: jalankan `RAPIDSK_PORT=8299 node server/bootstrap.cjs` (JANGAN pakai 8282 — itu punya user), login `POST /api/v1/identity-provider/auth/login` `{"username":"skkmigas","password":"Admin@12345"}`, lalu refresh ke audience ALL: `POST /api/v1/identity-provider/auth/refresh-token` `{refresh_token, application_code:"ALL"}`. Domain uji: `d1e6013c-a2dc-467b-bd35-f5ddc915b422`. Matikan proses wrapper 8299 setelah selesai.
- Typecheck asli: `npx tsc -p tsconfig.app.json --noEmit` — project punya banyak error pre-existing di file lain; gate = 0 error di file yang disentuh.
- Jangan regresi: filter baris cermin provider, mode selector selalu aktif, resume bebas klik (1 klik = 1 aksi, tanpa blok status FE), fallback preview TransferMapPreview, wrapper same-origin config (`upstreams`), guard hop-by-hop header di `proxyRequest`.

## FASE 0 — Diagnosa "kenapa nggak kerasa berubah" (WAJIB sebelum koding)
1. **Cek bundle yang tersaji**: `GET http://localhost:8299/` → ambil hash `App-*.js` di index.html, cocokkan dengan file terbaru di `dist/assets/`. Kalau beda → masalahnya build/serve, laporkan.
2. **Cek payload list transfers live** (path `/api/v1/connector/{domainId}/transfers`, token ALL): pastikan field waktu — apakah `created_at`/`updated_at` memang absen/null, atau ada dengan nama lain (mis. `createdAt`). PATOKAN BE: kalau ada nama lain, map di `transfersApi.list`.
3. **Cek kecocokan projections**: untuk tiap transfer `t.id`, hitung berapa yang ketemu projection (`transfer_process_id === t.id`). Kalau banyak yang tidak ketemu (mis. karena limit 100 kepotong), urutan/filternya pincang — catat angka aslinya.
4. Tulis hasil diagnosa di bagian LAPORAN dokumen ini SEBELUM lanjut.

## FASE 1 — Kolom Waktu (tanpa ini urutan tidak terlihat)
1. Tambah kolom **"Waktu"** di tabel riwayat: tampilkan timestamp terbaik (`projection.last_event_at` → fallback `updated_at`/`created_at`) format lokal ringkas `15 Jul 09:32` + baris kedua relatif ("2 jam lalu"). Gunakan util kecil (pure function) di `src/lib/` + unit test format/relative.
2. Ekstrak `historyTimestamp` + comparator ke `src/lib/transfer-history.ts` (pure, terima nilai-nilai timestamp, tanpa dependensi React) + unit test: projections-first, fallback transfer fields, tie → id desc.

## FASE 2 — Paginasi riwayat (client-side)
1. Default 10 baris/halaman; pilihan 10/25/50. Kontrol: prev/next + "x–y dari z". Reset ke halaman 1 saat filter/domain berubah.
2. Jangan pakai library baru — state lokal + slice. Komponen kontrol boleh inline.

## FASE 3 — Filter & pencarian riwayat
1. Filter: **Dataset** (select dari dataset yang ada di riwayat), **Status** (COMPLETED/FAILED/INITIATED/TRANSFERRING/PAUSED/ALL), **Mode** (direct/persistent/ALL — pakai `resolvePersistedTransferMode` + projection mode).
2. Search box: cocokkan substring ke transfer id / agreement id / nama dataset (case-insensitive).
3. Tombol "Reset filter". Counter header mengikuti hasil filter ("Riwayat Transfer (difilter: n dari total)").

## FASE 4 — Projections limit
1. `clampMonitoringLimit` max 100 → kalau riwayat > 100, baris tanpa projection kehilangan role/mode/waktu. Cek openapi BE (`GET /openapi.json` via wrapper, atau docs 8581) apakah endpoint monitoring dukung `offset`/paging. Kalau ya → fetch berhalaman sampai habis (cap wajar, mis. 500). Kalau TIDAK ada di BE → JANGAN mengarang; naikkan permintaan ke 100 tetap, dan pastikan fallback baris tanpa projection tetap tampil benar (waktu dari field transfer, role dianggap consumer).

## FASE 5 — Verifikasi live (WAJIB, tulis hasil)
1. Jalankan wrapper 8299 + login + token ALL.
2. Assert via API: urutan `historyTransfers` yang dirender = urutan `last_event_at` desc (bandingkan 5 teratas dengan data projections asli).
3. Screenshot-less check: dump 5 baris teratas (id + waktu) ke laporan.
4. Gates: `npx tsc -p tsconfig.app.json --noEmit` (0 error file tersentuh) · `npx eslint <files>` 0 error · `npx vitest run` semua pass (57 existing + test baru) · `npx vite build` sukses.
5. Matikan wrapper 8299.

## Checklist
- [x] F0 diagnosa (bundle hash, field waktu list BE, match rate projections) + laporan
- [x] F1 kolom waktu + util + test
- [x] F2 paginasi
- [x] F3 filter + search + reset
- [x] F4 projections limit (sesuai kemampuan BE, tanpa mengarang)
- [x] F5 verifikasi live + gates

## LAPORAN (diisi implementor)

### FASE 0 — Diagnosa (verifikasi live via wrapper 8299, domain d1e6013c-a2dc-467b-bd35-f5ddc915b422)

**1. Bundle TIDAK basi.** `dist/index.html` → `App-33czlHug.js` (build Jul 15 16:35) sudah memuat `historyTimestamp` + string "Terbaru di atas". Jadi kode sort SUDAH ter-deploy. Bukan masalah build/serve.

**2. Akar "nggak kerasa berubah" (2 sebab, saling menguatkan):**
   - **(a) Tidak ada kolom "Waktu" di tabel riwayat.** Kolom yang ada: Dataset, Mode, Status, Ukuran, Record, Checksum, Aksi. Sort mengurutkan baris tapi user tidak punya timestamp untuk melihat efeknya — baris tampak identik (nama dataset/status sama), jadi perubahan urutan tak terasa.
   - **(b) Mapper `transfersApi.list` membuang timestamp.** Connector `GET /connector/{domainId}/transfers` mengembalikan `started_at` + `completed_at` (bukan `created_at`/`updated_at`). Bukti live: `created_at` 0/22, `updated_at` 0/22, `started_at` 22/22, `completed_at` 22/22. Mapper memetakan `created_at`/`updated_at` yang TIDAK ADA → `transfer.updated_at`/`created_at` selalu null. Akibatnya fallback di `historyTimestamp` mati; urutan bergantung SEPENUHNYA pada projeksi. Kalau sebuah projeksi hilang → timestamp = 0 → baris tenggelam tanpa alasan yang terlihat.

**3. Match rate projeksi.** Domain uji: 22 transfer, 22/22 (100%) ketemu projeksi. BE mengembalikan projeksi urut `last_event_at` DESC (proj[0]=09:32 15 Jul, proj[99]=02 Jul, proj[172]=29 Jun). Match rate tetap 22/22 walau di-clamp 100 (semua transfer domain ini masih baru). Urutan render (filter CONSUMER/OUTBOUND → sort desc) = 11 baris, top-5 terbukti urut `last_event_at` desc. Jadi **logika sort benar** — yang hilang cuma kolom waktu + fallback timestamp.

**4. F4 — kemampuan BE (openapi live).** `/api/v1/cts/monitoring/transfer-projections` HANYA punya param `limit` (schema: `minimum:1, maximum:500, default:100`). **Tidak ada `offset`/paging.** FE meng-clamp ke 100 (`clampMonitoringLimit`) — artifisial rendah; BE mendukung sampai **500**. Total projeksi global = 173, jadi domain sibuk (>100 transfer baru) bisa kehilangan role/mode/waktu baris lama. Fix tanpa mengarang: naikkan clamp ke 500 (sesuai maksimum BE) + minta 500, dan pastikan fallback baris tanpa projeksi tetap benar (pakai `completed_at`/`started_at` dari list).

**Top-5 render (bukti F5 awal, id | last_event_at):**
1. `7acd8954` | 2026-07-15T09:32:26Z
2. `3d9f31ae` | 2026-07-15T09:32:00Z
3. `8437bd41` | 2026-07-15T09:31:13Z
4. `b3decf33` | 2026-07-15T09:30:49Z
5. `b30983a3` | 2026-07-15T06:47:18Z

### FASE 1–4 — Implementasi

**Ekstraksi logika murni → `src/lib/transfer-history.ts`** (unit test `src/test/transfer-history.test.ts`, 24 test):
- `resolveHistoryTimestamp` — prioritas: `projection.last_event_at` → `projection.updated_at` → `transfer.completed_at` → `transfer.started_at` → `transfer.updated_at` → `transfer.created_at` → `projection.created_at`; 0 bila kosong/invalid.
- `compareHistoryDesc` — terbaru dulu, tie-break id desc.
- `formatHistoryTime` — "15 Jul 09:32" (lokal, bulan id-ID dipatok manual biar deterministik).
- `formatRelativeTime` — "baru saja / n menit/jam/hari/bulan/tahun lalu" (`now` bisa disuntik).
- `matchesHistoryFilter` + `DEFAULT_HISTORY_FILTER` — filter dataset/status/mode + search substring (transfer id / agreement id / nama dataset).

**F1 Kolom Waktu** — kolom "Waktu" ditambah di tabel riwayat (baris-1 `formatHistoryTime`, baris-2 relatif). `historyTimestamp` di TransferCenter kini delegasi ke `resolveHistoryTimestamp` + sort pakai `compareHistoryDesc`.

**Fix mapper (akar b)** — `transfersApi.list` + `status` kini memetakan `started_at`/`completed_at` (ditambah ke `TransferItem`). Fallback timestamp berfungsi walau projeksi hilang.

**F2 Paginasi** — client-side, default 10 (opsi 10/25/50), tombol Sebelumnya/Berikutnya + "x–y dari z" + "Halaman n / m". Reset ke halaman 1 saat filter/domain/ukuran-halaman berubah (useEffect).

**F3 Filter & pencarian** — bar filter (Dataset/Status/Mode/Cari) + tombol "Reset filter" (muncul saat aktif). Counter header: "Riwayat Transfer (difilter: n dari total)". Empty-state khusus saat filter tak ada hasil.

**F4 Projections limit** — endpoint `/cts/monitoring/transfer-projections` HANYA punya `limit` (maks 500, tanpa offset — openapi live). `clampMonitoringLimit` dinaikkan dari maks 100 → **500** (`MONITORING_LIMIT_MAX`), query minta 500. Tidak ada paging yang dikarang. Baris tanpa projeksi tetap benar (waktu dari `completed_at`/`started_at`, role dianggap consumer).

### FASE 5 — Verifikasi live + gates

- Wrapper 8299 menyajikan bundle FRESH hasil `vite build` (`index-C-hATvi5.js` cocok dengan `dist/index.html`). Wrapper dihentikan setelah selesai.
- Top-5 render (id | Waktu lokal | last_event_at) — monotonic desc TERBUKTI:
  1. `7acd8954` | 15 Jul 16:32 | 2026-07-15T09:32:26Z
  2. `3d9f31ae` | 15 Jul 16:32 | 2026-07-15T09:32:00Z
  3. `8437bd41` | 15 Jul 16:31 | 2026-07-15T09:31:13Z
  4. `b3decf33` | 15 Jul 16:30 | 2026-07-15T09:30:49Z
  5. `b30983a3` | 15 Jul 13:47 | 2026-07-15T06:47:18Z
  (jam lokal UTC+7 = last_event_at + 7 jam; urutan = `last_event_at` desc)

**Gates:**
- `npx tsc -p tsconfig.app.json --noEmit` → 0 error di file tersentuh (project 24 error pre-existing di file lain, turun dari 26 setelah fix `new Map` vs ikon lucide `Map`).
- `npx eslint <4 file tersentuh>` → 0 error (1 warning pre-existing `pools`/useMemo, bukan kode baru).
- `npx vitest run` → 81 pass (57 lama + 24 baru), 9 file.
- `npx vite build` → sukses (18.24s).

**File diubah:** `src/lib/transfer-history.ts` (baru), `src/test/transfer-history.test.ts` (baru), `src/api/services/connector.ts`, `src/pages/TransferCenter.tsx`.
