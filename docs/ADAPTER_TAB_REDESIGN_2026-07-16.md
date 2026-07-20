# Delegasi — Redesign Tab Adapter (Settings): Stepper 4 Langkah + WAJIB/OTOMATIS/OPSIONAL + Kamus Drawer

Tanggal: 2026-07-16 · Untuk: implementor (Opus) · **MOCKUP FINAL YANG SUDAH DI-APPROVE USER** ada di:
`C:\Users\User\AppData\Local\Temp\claude\d--laragon-www-dataspace-new\87b46b5a-6916-4e4c-8d44-8458db07b33b\scratchpad\adapter-redesign-mockup.html`
BACA file mockup itu dulu (Read) — copy, penanda, hirarki, dan penempatannya adalah spesifikasi. Catatan ungu (`.note`/`.tag`) di mockup = penjelasan review, JANGAN ikut dirender di aplikasi.

## Konteks masalah (keluhan user)
Halaman Settings → tab Adapter = "blindbox": tidak ada urutan kerja, istilah tak dijelaskan (layer/validasi/mapping/jalur data/task), semua isian tampak wajib padahal tidak, kartu status makan tempat, dan kartu legacy "Proses Data" rusak total.

## Fakta kode yang SUDAH diverifikasi (jangan ulang riset)
- `src/pages/Settings.tsx`: tab `adapter` berisi (urut): 2 kartu status "Sumber Domain Aktif"+"Tindak Lanjut" (~line 1252-1302) + banner2 → `AdapterFlowWizard` → `AdapterCollectionsUsage` → blok legacy `showLegacyDataFlow && (...)` (SUDAH false, line ~101 & 1327) → kartu registrasi adapter participant (~line 1691-1920, `useParticipantAdapters`/`saveAdapter`).
- `src/components/settings/AdapterFlowWizard.tsx`: kartu "Wizard Proses Data" — pilih domain (+fallback kategori manual), Tabs Remote/GeoJSON/Shapefile, form koneksi, layer picker (ingestible filter SUDAH ada), params (where/out_fields/cql/srs/field_map), tombol "Jalankan validasi", task list, panel "Catatan lanjutannya".
- `src/api/services/adapter-runtime.ts`: MODUL MATI — memanggil `adapterRuntimeClient` yang tidak pernah ada (8 error tsc pre-existing). Konsumennya hanya blok legacy tersembunyi di Settings. Aman dihapus keduanya.
- Registrasi adapter participant ("jalur data") MASIH DIPAKAI: `adapterForDataset` di `src/pages/TransferCenter.tsx` (~line 808) untuk Preview Data, dan pencocokan dataset↔adapter di Settings. JANGAN dihapus — di-rename + dijelaskan.
- Default klasifikasi per kategori sudah ada polanya: `DEFAULT_CLASS` di `PublishDatasetDialog.tsx` (WK→L1, FLD/FP→L2, WLL/SEI→L3).
- Kategori otomatis dari domain: `AdapterFlowWizard` sudah punya `effectiveDomainCode` (domainCode dari binding; manual hanya bila kosong).
- Auto-pilih layer ingestible pertama: SUDAH diimplement sebelumnya di wizard — pertahankan.

## Spesifikasi (ikuti mockup)
### S1 — Header & strip status (Settings.tsx, tab adapter)
1. Ganti 2 kartu status + banner permanen → **1 strip**: `Domain [select] · Kategori [kode] · Service adapter [pill ✓ terhubung / ✗]` + teks kanan "Langkah berikutnya: ③ Ingest" (dihitung, lihat S5). Banner (amber/rose/sky) hanya dirender bila kondisinya benar-benar terjadi (endpoint kosong / fallback / org tak terbaca) — logika kondisi yang ada dipertahankan, kartu "Tindak Lanjut" paragraf panjang DIHAPUS.
2. Judul tab: "Adapter — Ingest Data" + subjudul 1 kalimat (lihat mockup).
3. Pemilihan domain pindah ke strip ini (single source), wizard membacanya via prop — JANGAN ada dua dropdown domain.

### S2 — Strip "Yang wajib cuma 3"
Tiga kotak dashed (lihat mockup): (1) wajib cuma 3: pilih sumber → pilih layer → klik Ingest; (2) sisanya otomatis; (3) legenda penanda WAJIB/OTOMATIS/OPSIONAL. Komponen kecil, boleh inline di Settings atau di wizard.

### S3 — Stepper 4 langkah (restrukturisasi AdapterFlowWizard)
Bungkus konten wizard jadi 4 seksi bernomor dengan rail kiri + dot status (lihat CSS mockup: done=hijau ✓, next=biru ● + ring, todo=abu ○). Konten & handler YANG SUDAH ADA dipakai ulang — ini restrukturisasi layout + copy, BUKAN tulis ulang logika.
- **① Hubungkan Sumber**: kartu pilihan tipe (GeoServer/ArcGIS/GeoJSON tempel/Shapefile — deskripsi 1 kalimat per kartu, gantikan Tabs) → utk remote: dropdown "Koneksi tersimpan" `WAJIB` + "Tes koneksi" + "+ Koneksi baru" (form koneksi hanya muncul saat bikin baru / belum ada koneksi). Ringkasan koneksi terpilih tampil di header langkah.
- **② Pilih Layer & Atur Ambilan**: penjelasan layer 1 kalimat + `WAJIB` + auto-select layer ingestible pertama (sudah ada) + "Intip isi" (preview yang sudah ada). Panel collapsed `OPSIONAL — aman dilewati: kosong = ambil semua data apa adanya` berisi: Where `OPSIONAL` (placeholder "kosong = semua baris ikut"), Out fields `OTOMATIS: *`, Field map `OPSIONAL` (hint mapping nama kolom + contoh JSON), cql_filter/srs utk GeoServer dgn pola sama. GeoJSON/Shapefile: field masing2 (geojson_body textarea `WAJIB`; file upload `WAJIB`, field_map `OPSIONAL`).
- **③ Beri Label & Ingest**: Kategori `OTOMATIS dari domain` (fallback manual bila domain tanpa kode — perilaku existing), Klasifikasi `DEFAULT per kategori` (terapkan `DEFAULT_CLASS`; ubah state awal dari hardcode "L2" → default mengikuti kategori aktif, user tetap bisa ubah). Tombol **"Ingest sekarang"** (rename dari "Jalankan validasi") + subteks "Data diambil dari sumber → diperiksa (validasi) → disimpan jadi koleksi {kode}". **Riwayat task pindah ke langkah ini**: tabel Waktu · Kategori (chip mono) · Sumber · Status (pill) · Keterangan (error dinormalisasi via getApiErrorMessage) — pakai data `listTasks` yang sudah ada.
- **④ Hasil**: render `AdapterCollectionsUsage` yang sudah ada (jangan diubah isinya, sudah benar) sebagai langkah 4, dengan header "④ Hasil: Koleksi & Pemakaiannya".
- Panel "Catatan lanjutannya" DIHAPUS; poin pentingnya jadi hint 1 kalimat di langkah terkait (mis. "Remote source perlu koneksi dulu" sudah tercover ①).

### S4 — Kamus istilah = DRAWER kanan (bukan blok inline)
Tombol "? Kamus istilah" di kanan judul tab → slide-over panel kanan (lihat mockup: backdrop klik-tutup, tombol ×, list 8 istilah: Layer, Ingest, Validasi, Task, Koleksi, Kategori, Klasifikasi, Alamat adapter — copy persis mockup). Pakai komponen Sheet/Dialog yang ada di ui/ kalau tersedia (cek `src/components/ui/sheet.tsx`), fallback bikin drawer kecil sendiri. Wajib: fokus kembali ke tombol saat tutup, Esc menutup, `prefers-reduced-motion` dihormati.

### S5 — Status langkah otomatis
`✓ Selesai / ● Langkah berikutnya / ○ Belum` dihitung dari state nyata: ① done = koneksi terpilih (atau tipe geojson/shapefile dengan input terisi); ② done = layer terpilih (auto-select memenuhi); ③ done = ada task sukses utk kategori aktif (dari `listTasks`); ④ selalu tampil. "Langkah berikutnya" = langkah pertama yang belum done; tampil juga di strip header. Ekstrak kalkulasi ke helper pure `src/lib/adapter-step-status.ts` + unit test (kombinasi: kosong semua → next ①; koneksi ada → next ②; dst).

### S6 — Bersih-bersih legacy
1. HAPUS blok `showLegacyDataFlow && (...)` di Settings.tsx + konstanta + semua state/handler yang HANYA dipakai blok itu (`adapterBusyAction`, `adapterResult`, `selectedProcessDomain`, `selectedAdapterId`, dst — telusuri pemakaian, jangan hapus yang dipakai bagian lain).
2. HAPUS `src/api/services/adapter-runtime.ts` + import-nya (modul mati; 8 error tsc pre-existing ikut hilang — sebutkan angkanya di laporan).
3. Kartu registrasi adapter participant (~line 1691-1920) DIPERTAHANKAN, di-rename "**Alamat Adapter per Domain**" + intro 1 kalimat (copy mockup: dipakai tombol Preview Data di Transfer; bukan bagian alur ingest; cukup diisi sekali) + ditempatkan SETELAH langkah ④.

## Aturan main
- BE = source of truth; TIDAK ADA perubahan endpoint/payload — murni restrukturisasi UI + copy + penghapusan dead code. Endpoint yang dipanggil wizard harus tetap identik (diff perilaku network = regresi).
- Jangan regresi: filter layer ingestible, auto-select layer, getServiceToken("ALL") di wizard, AdapterCollectionsUsage, deep-link ?tab=adapter, prefill ?create=1&adapterCollection=, semua fix TransferCenter/preview/wrapper.
- Copy Indonesia persis mockup (tanpa catatan ungu). Toast sonner. Jangan commit git; jangan sentuh port 8282/.env/config/runtime.json.
- Kalau perlu cek live: wrapper sendiri `RAPIDSK_PORT=8299 node server/bootstrap.cjs`, login skkmigas/Admin@12345 → refresh ALL; matikan setelah selesai.

## Gates (wajib, laporkan angka)
- `npx tsc -p tsconfig.app.json --noEmit` → 0 error file tersentuh; laporkan juga total error project SEBELUM vs SESUDAH (harus turun ≥8 karena adapter-runtime.ts dihapus).
- `npx eslint <file tersentuh>` → 0 error.
- `npx vitest run` → semua pass (94 existing + test baru adapter-step-status).
- `npx vite build` → sukses, dist fresh.

## Checklist
- [x] S1 strip header + hapus kartu status lama
- [x] S2 strip "wajib cuma 3" + legenda penanda
- [x] S3 stepper 4 langkah (①②③④) + penanda WAJIB/OTOMATIS/OPSIONAL + rename "Ingest sekarang" + task table pindah + DEFAULT_CLASS klasifikasi
- [x] S4 kamus drawer kanan (Sheet)
- [x] S5 helper status langkah + unit test
- [x] S6 hapus legacy (blok + adapter-runtime.ts) + rename "Alamat Adapter per Domain"
- [x] Gates + laporan

## LAPORAN (Opus s.d. limit sesi; diselesaikan Fable)
- **Pembagian kerja**: Opus merampungkan restrukturisasi `AdapterFlowWizard.tsx` (stepper ①–④, badge WAJIB/OTOMATIS/OPSIONAL, "Ingest sekarang", strip status + "wajib cuma 3", riwayat task di ③, `DEFAULT_CLASS_BY_CODE`), `src/lib/adapter-step-status.ts` + test, header tab baru + state kamus di `Settings.tsx` — lalu mati kena limit di tengah edit JSX tab. Fable menyelesaikan: hapus blok legacy `showLegacyDataFlow` (360 baris), import `AdapterCollectionsUsage`, drawer kamus (Sheet, 8 istilah), rename kartu registrasi → "Alamat Adapter per Domain" (+intro fungsi & "Tambah Alamat"), hapus `src/api/services/adapter-runtime.ts` (tanpa importer, dicek).
- **File**: diubah `src/pages/Settings.tsx`, `src/components/settings/AdapterFlowWizard.tsx`, `src/api/services/adapter-service.ts`; baru `src/lib/adapter-step-status.ts`, `src/test/adapter-step-status.test.ts`; dihapus `src/api/services/adapter-runtime.ts`.
- **Error tsc project-wide**: 24 → **16** (−8, sesuai prediksi penghapusan modul mati). File tersentuh: 0 error.
- **Gates**: eslint 0 · vitest **104 pass** (94 lama + 10 baru) · vite build sukses (38s, dist fresh).
- Catatan: string `/adapter-runtime/*` di endpoints.ts/client.ts/runtime-config.ts adalah path proxy wrapper yang masih hidup (dipakai `check-source` wizard) — TIDAK ikut dihapus.
