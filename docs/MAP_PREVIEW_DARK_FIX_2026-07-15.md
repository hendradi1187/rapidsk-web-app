# Delegasi — Preview Peta Gelap (basemap tidak render) di TransferMapPreview

Tanggal: 2026-07-15 · Untuk: implementor (Opus) · Konteks: preview data SUDAH jalan (5 fitur WK dari adapter, list kiri terisi, kontrol zoom & attribution MapLibre muncul) tapi kanvas peta HITAM — basemap & fitur tidak tergambar.

## Fakta diagnosa awal (sudah diverifikasi, jangan ulang)
- `maplibre-gl.css` ter-import di `src/main.tsx` ✓.
- Tile reachable dari mesin ini: OSM `https://tile.openstreetmap.org/4/13/7.png` → 200 image/png; Esri World_Imagery → 200 image/jpeg ✓. Bukan network.
- Map instance hidup (NavigationControl + attribution render) → yang gagal adalah STYLE/layer.

## Akar yang dicurigai (urut keyakinan)
### R1 — `sources.labels: undefined` bikin style invalid (keyakinan tinggi)
`createRasterStyle` (`src/components/transfer/TransferMapPreview.tsx` ~line 96-147): pada `basemapMode === "map"`, objek style memuat key `labels: undefined` di `sources` (ternary tanpa spread). MapLibre memvalidasi seluruh style; source bernilai undefined → style ditolak → NOL layer → kanvas gelap. Petunjuk konfirmasi: mode "Satelit" kemungkinan justru render (labels terisi).
**Fix:** ekstrak ke pure function `buildRasterStyle(basemapMode)` di `src/lib/map-style.ts` memakai conditional spread (`...(mode==="satellite" ? {labels:{...}} : {})`) sehingga TIDAK ADA key undefined; layers juga conditional spread (sudah benar). Unit test: (a) mode "map" → sources hanya `basemap`, tidak ada key `labels`; (b) mode "satellite" → `basemap`+`labels` dan layer labels ada; (c) `JSON.parse(JSON.stringify(style))` tidak menghilangkan key apa pun (tidak ada undefined).

### R2 — Lifecycle map rapuh (keyakinan menengah, perbaiki sekalian)
Init effect (deps `[applyDataLayers, basemapMode, featureCollection, features, open, syncMapData, viewMode]`):
1. Map DIBONGKAR + dibuat ulang tiap `features`/`viewMode`/`basemapMode` berubah (cleanup `map.remove()`), padahal sudah ada effect terpisah untuk setStyle/easeTo/syncData → flicker/race, buang-buang init.
2. Saat dialog baru buka, kontainer (portal Radix Dialog) bisa belum ter-mount → `mapContainerRef.current` null → init batal, baru kebentuk saat deps lain berubah.
**Fix:**
- Init map HANYA saat `open` berubah true; deps efek init = `[open]` (helper stabil via ref/useCallback tanpa dep data). Kalau kontainer belum ada, retry via `requestAnimationFrame` (loop pendek, stop saat unmount/closed).
- Jangan masukkan `features`/`featureCollection`/`viewMode`/`basemapMode` ke deps init. Perubahan data → effect `syncMapData` yang sudah ada; ganti basemap → effect `setStyle` yang sudah ada (dengan `applyDataLayers` di `style.load`, sudah ada).
- Setelah style pertama load + fitur sudah ada → panggil fit-bounds sekali (data ahocevar = USA; tanpa fit, view default Indonesia menampilkan laut kosong — pastikan fit jalan walau data datang sebelum style siap: simpan flag "pendingFit").

### R3 — Error MapLibre tidak kelihatan (perbaiki surface)
`map.on("error")` sekarang menelan detail (pesan generik, dan di screenshot user TIDAK muncul banner sama sekali). **Fix:** tangkap `event.error?.message` → simpan ke state `mapError` → tampilkan di tab **Diagnostics** (field `map_error`) + banner hanya bila style/tile benar-benar gagal. Jangan menimpa error data yang sudah ada.

## Batasan
- Jangan regresi: fallback data preview (adapter → persistent download → direct fetch), diagnostics JSON, filter baris cermin provider, dan semua fix TransferCenter/wrapper sebelumnya.
- JANGAN sentuh port 8282 (instance user), `.env`, `config/runtime.json`. Jangan commit git.
- Verifikasi browser penuh tidak tersedia (maplibre butuh WebGL, tak bisa jsdom) → kompensasi dengan unit test style builder yang ketat + reasoning lifecycle + gates.

## Gates (wajib, laporkan angka)
- `npx tsc -p tsconfig.app.json --noEmit` → 0 error di file tersentuh (project punya error pre-existing di file lain, filter output).
- `npx eslint <file tersentuh>` → 0 error.
- `npx vitest run` → semua pass (81 existing + test baru `src/test/map-style.test.ts`).
- `npx vite build` → sukses (dist harus fresh supaya user tinggal restart+refresh).

## Checklist
- [x] R1 `buildRasterStyle` pure + tanpa key undefined + unit test
- [x] R2 lifecycle: init sekali per open, rAF retry container, deps bersih, pendingFit
- [x] R3 `mapError` di diagnostics + banner jujur
- [x] Gates + build fresh

## LAPORAN (diisi implementor)

### R1 — style tanpa key undefined
- Ekstrak `buildRasterStyle(basemapMode)` ke `src/lib/map-style.ts` (pure, tanpa dependency React/MapLibre). `sources` pakai conditional spread → mode "map" TIDAK punya key `labels` sama sekali (bukan `labels: undefined`). Layer labels tetap conditional spread.
- Hapus `createRasterStyle` lokal + `type BasemapMode` lokal di komponen; sekarang import dari `map-style`.
- Unit test `src/test/map-style.test.ts` (4 test): mode "map" hanya source `basemap` & tanpa key `labels`; mode "satellite" ada `basemap`+`labels` & layer `labels-layer`; JSON round-trip tidak kehilangan key (bukti tak ada undefined); version 8 + glyphs selalu ada.

### R2 — lifecycle map
- Effect init sekarang deps `[open]` saja. Data/basemap/view dibaca lewat mirror ref (`applyDataLayersRef`, `syncMapDataRef`, `featureCollectionRef`, `viewModeRef`, `basemapModeRef`, `colorRef`) yang selalu sinkron dengan render terbaru — map tidak lagi dibongkar-pasang tiap `features`/`viewMode`/`basemapMode` berubah.
- Kontainer portal Radix: retry `requestAnimationFrame` (loop pendek, di-`cancelAnimationFrame` + flag `cancelled` saat cleanup) sampai `mapContainerRef.current` ada.
- `pendingFitRef`: diset true saat map dibuat & saat `load()` mulai; fit-bounds dijalankan sekali di `syncMapData` begitu style + fitur sama-sama siap (apa pun urutannya), lalu di-reset. Effect `setStyle`/`easeTo`/sync data yang lama tetap menangani perubahan basemap/view/data.

### R3 — error MapLibre kelihatan
- State baru `mapError`; handler `map.on("error")` menangkap `event.error?.message` asli (fallback pesan Indonesia). Tidak lagi memakai `setError` → error data-load tidak ketiban.
- Diagnostics JSON dapat field `map_error`. Banner menampilkan `error` (data) dan `mapError` (style/tile) terpisah, muncul kalau salah satu ada. `mapError` di-reset saat init, ganti basemap, dan close.

### File yang diubah / dibuat
- `src/lib/map-style.ts` (baru — pure style builder)
- `src/test/map-style.test.ts` (baru — 4 unit test)
- `src/components/transfer/TransferMapPreview.tsx` (R1/R2/R3)

### Hasil gates
- `npx tsc -p tsconfig.app.json --noEmit` → 0 error di file tersentuh (error pre-existing di file lain tidak tersentuh).
- `npx eslint <file tersentuh>` → 0 error.
- `npx vitest run` → 85 test pass (81 existing + 4 baru), 10 file test.
- `npx vite build` → sukses (dist fresh, `maps-*.js` ter-bundle ulang).
