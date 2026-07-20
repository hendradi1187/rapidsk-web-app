# Delegasi Fix — Adapter (Jalur Data / Ingestion)

Tanggal: 2026-07-14 · Untuk: implementor (Opus) · Semua diverifikasi live (`100.66.10.14:8584`, token `ALL`).

**Kesimpulan besar: adapter backend SEHAT.** Sample ArcGIS FeatureServer publik jalan sempurna (layers + preview OK). Semua "error" yang dilaporkan berasal dari **data koneksi yang salah** dan **pilihan layer yang tidak bisa di-ingest**, diperparah **pesan error generik** + **pemetaan domain→kategori kosong**. Dokumen ini merinci akar + langkah fix, menandai mana yang SUDAH dikerjakan sesi ini vs TODO.

---

## 0. Bukti cepat (live)

Inventaris koneksi (`GET /remote-sources/connections/`):
| id | provider | base_url | status |
|----|----------|----------|--------|
| 71765ebb… | geoserver | `http://100.66.10.14:8584/` | ❌ nunjuk ke ADAPTER sendiri (bukan geoserver) |
| f393a209… | geoserver | `http://100.66.10.14:8584` | ❌ sama, adapter sendiri |
| 38fcee19… | geoserver | `string` | ❌ literal placeholder swagger |
| b5c40bdd… | arcgis | `https://kspservices.big.go.id/satupeta/rest/services/PUBLIK/PERIZINAN_DAN_PERTANAHAN/MapServer` | ⚠️ valid, tapi task pilih layer salah (lihat §1) |
| ec063629… | arcgis | `https://sampleserver6.arcgisonline.com/arcgis/rest/services/Energy/Infrastructure/FeatureServer` | ✅ valid, preview OK |

Tes layer koneksi BIG (`b5c40bdd`):
- `GET .../arcgis/{id}/layers` → **OK**. Layer 0 = "Peta Izin Pemanfaatan Kawasan Hutan", **type "Group Layer", `geometry_type: null`**. Layer 1 = "IUPHHKHA" (Feature Layer, polygon), Layer 2 = "IUPHHKHTI" (Feature Layer).
- `GET .../arcgis/{id}/preview?layer_id=0` → **400 `Invalid or missing input parameters`**.
- `GET .../arcgis/{id}/describe?layer_id=0` → **500 UNEXPECTED_ERROR**.

Tes sample (`ec063629`), layer 0 = "Wells" (Feature Layer, point):
- `layers` → OK · `preview?layer_id=0` → **200** (fields + geometry_type kembali normal).

→ **Adapter tidak rusak.** Error terjadi karena **layer 0 di BIG adalah Group Layer** (folder, tanpa geometri) — tidak bisa di-query. Harus pakai layer **1/2** (Feature Layer). FE membolehkan memilih Group Layer tanpa peringatan.

---

## 1. MASALAH & LANGKAH FIX

### A. Group Layer bisa dipilih untuk ingest (BUG UTAMA task FAILED) — TODO
**Gejala:** pilih layer ArcGIS type "Group Layer" → ingest/preview 400 "Invalid or missing input parameters" (pesan menyesatkan).
**Akar:** `parseLayerOptions` (`AdapterFlowWizard.tsx`) tidak menyaring layer non-feature; `raw` sebenarnya membawa `type` & `geometry_type`.
**Fix (FE):**
1. Di `parseLayerOptions`/`loadLayers`, untuk ArcGIS **tandai/filter** layer yang `type === "Group Layer"` atau `geometry_type` null/kosong — jadikan **tidak bisa dipilih** (disabled) atau sembunyikan.
2. Tampilkan `geometry_type`/`type` di label opsi layer (mis. "IUPHHKHA — polygon") supaya operator tahu mana yang valid.
3. Guard di `submitTask` (ArcGIS branch): tolak dengan pesan jelas bila layer terpilih Group Layer: "Layer ini grup/folder (tanpa geometri). Pilih sub-layer bertipe Feature Layer."
**Verify:** koneksi `b5c40bdd`, pilih layer 1 (IUPHHKHA) → preview 200 → ingest SUCCESS.

### B. Validasi base_url koneksi lemah (data sampah) — TODO
**Gejala:** ada koneksi geoserver `base_url` = adapter sendiri (`http://…:8584`) atau literal `"string"` → semua operasi gagal.
**Fix (FE, `AdapterFlowWizard.saveConnection` + `Settings.saveAdapter`):**
1. Tolak `base_url` yang tidak lolos `isValidHttpUrl` (sudah ada) DAN tambahan: tolak nilai `"string"`/placeholder, dan **peringatkan bila base_url === adapterEndpoint** (nyaris pasti salah).
2. Untuk GeoServer harapkan pola `.../geoserver` atau `.../wfs`/`.../ows`; ArcGIS harapkan `.../FeatureServer` atau `.../MapServer`. Bukan hard-block, tapi warning bila tidak cocok.
3. Sediakan tombol hapus koneksi sampah (sudah ada delete di service; pastikan terpampang).
**Cleanup data (ops):** hapus koneksi `71765ebb`, `f393a209`, `38fcee19` (sampah).

### C. Pesan error generik "Invalid or missing input parameters" — TODO
**Fix (FE, `api-error.ts`):** tambah map untuk pola ini → jelaskan kemungkinan sebab (layer grup / param query tidak valid / source menolak). Idealnya FE sudah mencegah di titik A sehingga jarang muncul.

### D. `describe` 500 untuk Group Layer — REKOMENDASI BACKEND
Backend `describe` melempar `UNEXPECTED_ERROR` (500) untuk group layer, bukannya 400 yang informatif. Rekomendasi ke tim adapter: validasi layer type sebelum query, balas 400 dengan pesan jelas. (Bukan FE.)

### E. Pemetaan domain→kategori kosong → `//` di URL & "Kode domain belum terbaca" — **SUDAH DIKERJAKAN**
**Akar:** binding participant↔domain tidak membawa `code`; kode domain governance (MIGAS_GEOROTAN) bukan kode kategori (WK/FLD/SEI/WLL/FP). `domain_code` kosong → `OGC_ITEMS` = `/ogc/ogc/collections//items` (double slash), dan ingest kena guard "Kode domain belum terbaca".
**Sudah dikerjakan (`AdapterFlowWizard.tsx`):** selector "Kategori data" manual muncul saat domain tak keresolve kode; query `listItems` hanya jalan bila kode ada (stop request `//`); pesan error diperbaiki jadi akurat.
**Rekomendasi backend:** sertakan `code`/kategori pada binding domain, atau definisikan pemetaan domain→kategori resmi.

### F. Konfig koneksi "hilang" saat reload — **SUDAH DIKERJAKAN**
**Akar:** form tidak di-hydrate dari koneksi tersimpan; `remoteQuery` tak pernah dipersist.
**Sudah dikerjakan:** hydrate `remoteForm` (base_url/provider/auth) dari koneksi terpilih; `remoteQuery` dipersist per-koneksi di localStorage.

---

## 2. Arti untuk data (jawaban kekhawatiran user)
- Task berstatus **FAILED = TIDAK ada data yang dihasilkan.** Bukan "tersimpan tapi rusak" — nol. Tidak bisa dipakai sampai di-run ulang jadi **SUCCESS**.
- Alur wajib: koneksi valid → **preview layer SUKSES** → ingest → task SUCCESS → collection muncul → baru bisa publish dataset (protocol OGC_API_FEATURES + runtime, atau REST_API untuk URL langsung).

---

## 3. Checklist untuk Opus (urut prioritas)
1. [x] **A** — filter/disable Group Layer + tampilkan geometry_type + guard submit (`AdapterFlowWizard.tsx`). **DONE 2026-07-14** — pakai field BE `type`/`geometry_type`; layer non-feature `ingestible=false` (disabled di Select), auto-pilih Feature Layer pertama, guard di `submitTask`. Terverifikasi live: BIG layer 0/5 (Group)=disabled, 1–4 (Feature)=aktif.
2. [x] **B** — validasi base_url koneksi (`AdapterFlowWizard.saveConnection`): tolak `"string"`/adapter-self, warning pola URL ArcGIS `FeatureServer|MapServer` / GeoServer `geoserver|wfs`. **DONE.** *(Settings.saveAdapter opsional menyusul — form itu cuma url.)*
3. [x] **C** — map pesan "Invalid or missing input parameters" (`api-error.ts`) + test. **DONE.**
4. [~] **D** — (backend) describe group layer → 400 informatif. Rekomendasi, bukan FE.
5. [x] **E** — domain→kategori manual + guard `//` (DONE).
6. [x] **F** — hydrate koneksi + persist remoteQuery (DONE).
7. [ ] Cleanup data (ops): hapus koneksi sampah `71765ebb`, `f393a209`, `38fcee19`.

Verifikasi 2026-07-14: `tsc` 0 error · `eslint` 0 error · `vitest` 38 test (22 di `api-error.test.ts`) · `vite build` sukses · logika filter A dicek langsung ke respons BE `/layers`.

**Verifikasi wajib tiap fix:** `npx tsc --noEmit` · `npx eslint <file>` · `npx vitest run` · `npx vite build`. Untuk A/B, uji live: koneksi `b5c40bdd` layer 1 (IUPHHKHA) harus preview 200 & ingest SUCCESS; koneksi `ec063629` layer 0 (Wells) sebagai kontrol yang sudah pasti jalan.

---

## Lampiran — ID acuan
- Adapter: `http://100.66.10.14:8584/api/v1` (proxy FE: `/adapter-service/api/v1`).
- ArcGIS valid (kontrol): `ec063629-b2f0-4b1f-b28c-e0959d8c8e8f` (sampleserver6, FeatureServer, layer 0 "Wells").
- ArcGIS BIG (kasus user): `b5c40bdd-c1e0-4539-bf86-ad79cf510f9f` (MapServer; **pakai layer 1/2, bukan 0**).
- Task FAILED contoh: `b18433e7-732c-4d02-b597-dc0d8e3b17fb` (layer_id 0 = Group Layer, return_geometry false — akarnya layer grup, bukan return_geometry).
