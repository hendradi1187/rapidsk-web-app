# Delegasi — Adapter jadi Modul Sidebar Sendiri + Layout Tab (4 tab)

Tanggal: 2026-07-17 · Untuk: implementor (Opus) · **Keputusan sudah di-APPROVE user** (mockup: `scratchpad/adapter-tabs-mockup.html`, serve di :8296).

## Keputusan final (jangan tawar lagi)
1. **Adapter keluar dari Pengaturan → jadi menu sidebar sendiri**, route `/adapter`, di grup "pemantauan" (grup Data) tepat setelah "Katalog Dataset".
2. **Layout tab horizontal (4 tab)**, bukan stepper vertikal: `Sumber & Layer · Ingest · Koleksi · Alamat Adapter`, tiap tab ada badge status (✓ selesai / ● langkah aktif / angka).
3. **Guide menyamping** (panel sticky kanan), bukan blok panjang ke bawah. Di layar sempit turun ke bawah (grid → 1 kolom).
4. **Aksi Save/Ingest TIDAK memindah tab** — hasil & error muncul di tab yang sama, tab tetap di posisi terakhir user.
5. Kamus istilah tetap = drawer kanan (tombol "?" di header).

## Anchor kode (terverifikasi)
- Route: `src/App.tsx` line ~77 (`/datasets`). Tambah `<Route path="/adapter" element={<AdapterData />} />` di blok Routes yang sama.
- Sidebar item: `src/config/rbac.ts` `MENU_ITEMS` — "Katalog Dataset" (section "pemantauan", path /datasets, ~line 112). Tambah item "Adapter Data" (icon mis. `Layers3`/`Boxes`, path `/adapter`, section "pemantauan", permissions samakan dgn adapter_manage / provider — lihat `canManageAdapters` di `src/lib/feature-access.ts`).
- Konten adapter sekarang: `src/pages/Settings.tsx` TabsContent value="adapter" (~line 997–akhir tab) — ISI-nya: header+tombol kamus, banner kondisional (endpoint kosong/governance fallback/org tak kebaca), `<AdapterFlowWizard>`, drawer `<Sheet>` kamus, kartu "Alamat Adapter per Domain" (registrasi participant adapter: `adaptersData`, `saveAdapter`, `openAddAdapter`, `openEditAdapter`, `removeAdapter`, `testAdapterConn`, dialog `adapterDialog`).
- Wizard: `src/components/settings/AdapterFlowWizard.tsx` — stepper vertikal ①Sumber ②Layer ③Ingest, lalu render `<AdapterCollectionsUsage>` sbg ④. Semua state (koneksi, layer, form, task) di dalam komponen ini.

## Arsitektur WAJIB (biar state tak hilang saat pindah tab)
Buat halaman baru `src/pages/AdapterData.tsx` yang:
1. **Memindahkan** semua context yang sekarang dihitung di Settings untuk tab adapter: `participantId`, `participantDomainOptions`, `domainSource`/banner kondisi, `runtimeConfig.adapterEndpoint`, dan SEMUA state+handler kartu registrasi adapter (`adaptersData`/`useParticipantAdapters`, `saveAdapter`, dialog, dst). Ekstrak yang perlu; jangan tinggalkan referensi mati di Settings.
2. **Tabs terkontrol**: `const [tab, setTab] = useState("source")`. Render KEEMPAT panel SEKALIGUS, sembunyikan yang non-aktif dengan atribut `hidden` (BUKAN conditional-unmount) → komponen tak pernah di-unmount → state (koneksi/layer/form wizard) TETAP walau pindah tab, dan submit handler tidak perlu menyentuh `tab` → poin #4 otomatis terpenuhi.
   ```
   <div hidden={tab!=='source'}> <AdapterFlowWizard activeSection="source-layer" .../> </div>
   <div hidden={tab!=='ingest'}>  <AdapterFlowWizard activeSection="ingest" .../> </div>   // BUKAN dua instance!
   ```
   MASALAH: dua `<AdapterFlowWizard>` = dua state. SOLUSI: render `<AdapterFlowWizard>` **SATU kali** (selalu mounted), beri prop `activeSection: "source-layer" | "ingest"` = `tab==='ingest'?'ingest':'source-layer'`; bungkus dgn `<div hidden={tab!=='source' && tab!=='ingest'}>`. Panel "Koleksi" = `<AdapterCollectionsUsage>` (div hidden), panel "Alamat" = kartu registrasi (div hidden). Wizard selalu mounted → state aman lintas semua tab.
3. **Refactor AdapterFlowWizard**: tambah prop `activeSection?: "source-layer" | "ingest" | "all"` (default "all" utk kompat). SEMUA state/hook/logika TETAP di atas (tak dipindah per-section). Hanya RENDER StepCard yang dibungkus kondisi: ①+② tampil saat `activeSection` ∈ {source-layer, all}; ③+riwayat task tampil saat ∈ {ingest, all}. `<AdapterCollectionsUsage>` internal wizard DIHAPUS dari wizard (pindah jadi panel "Koleksi" di page). Badge status tab dihitung dari `computeAdapterStepStatuses` (helper sudah ada) — ekspor state itu ke page via callback/prop atau hitung ulang di page dari input yang sama.
4. Header page: judul "Adapter Data" + subjudul + tombol "? Kamus istilah" (drawer Sheet, pindahkan dari Settings). Context strip (Domain·Kategori·Status adapter) di atas TabsList.
5. Guide side-panel: di tab "Sumber & Layer" dan "Ingest", tampilkan panduan 3 langkah sticky di kanan (grid 2 kolom: konten | guide 250px). Tab "Koleksi"/"Alamat" full width.

## Settings.tsx
- HAPUS TabsTrigger "adapter" + seluruh TabsContent value="adapter". Hapus state/handler yang jadi yatim SETELAH dipindah (jangan hapus yang masih dipakai tab lain — telusuri). Kalau ada state yang dipakai bareng, biarkan di tempat masing-masing (page baru punya salinannya).
- Tab default Settings jangan lagi "adapter" untuk provider (sesuaikan `defaultSettingsTab`).

## Aturan
- Nol perubahan endpoint/payload; murni pindah tempat + ubah layout. Semua handler ingest/publish/registrasi dipakai ulang apa adanya.
- Jangan regresi: filter layer ingestible, auto-select layer, `computeAdapterStepStatuses` + testnya, provenance (`useCollectionProvenance`), guard OGC, deep-link `?tab=adapter` (kalau ada yang nge-link ke situ, redirect ke `/adapter`), prefill `?create=1&adapterCollection=`, warning geometry, longgar-publish.
- Copy Indonesia. Toast sonner. Jangan commit git; jangan sentuh port 8282/.env/config/runtime.json. Cek live pakai wrapper 8299 sendiri kalau perlu, matikan sesudahnya.
- A11y: TabsList pakai komponen `@/components/ui/tabs` (role/keyboard sudah beres). Drawer Esc-close + focus return.

## Gates (laporkan angka)
- `npx tsc -p tsconfig.app.json --noEmit` → 0 error file tersentuh (+ total project sebelum/sesudah; target ≤ sekarang 16).
- `npx eslint <file tersentuh>` → 0.
- `npx vitest run` → semua pass (104 existing + test baru bila ada).
- `npx vite build` → sukses, dist fresh.

## Checklist
- [x] Route /adapter + sidebar item "Adapter Data" (grup Pemantauan, tepat setelah "Katalog Dataset")
- [x] Page AdapterData.tsx: 4 tab terkontrol, semua panel mounted (hidden toggle), wizard 1 instance
- [x] Refactor AdapterFlowWizard: prop activeSection ("source-layer"|"ingest"|"all"), keluarkan AdapterCollectionsUsage
- [x] Guide side-panel + context strip + kamus drawer di page
- [x] Settings: buang tab adapter + state/handler yatim
- [x] Gates + laporan

## LAPORAN (diisi implementor) — 2026-07-17

### Yang berubah per checklist
1. **Route + sidebar**: `src/config/rbac.ts` → item MENU_ITEMS "Adapter Data" (icon `Boxes`, path `/adapter`, section "pemantauan", roles SUPER_ADMIN/ADMIN/PROVIDER, permissions adapter_manage) tepat setelah "Katalog Dataset". `src/App.tsx` → `import AdapterData` + `<Route path="/adapter" element={<AdapterData />} />` di blok Routes utama.
2. **Page baru `src/pages/AdapterData.tsx`**: 4 tab terkontrol (`source·ingest·koleksi·alamat`) via `<Tabs value onValueChange>` + `TabsList/TabsTrigger`. Panel dirender sebagai `<div hidden>` biasa (BUKAN TabsContent → tidak pernah unmount). `<AdapterFlowWizard>` di-render **SATU kali**, dibungkus `<div hidden={!isWizardTab}>`, `activeSection = tab==='ingest'?'ingest':'source-layer'` → state koneksi/layer/form wizard bertahan lintas semua pindah tab; submit handler tak menyentuh state tab. Konteks yang dipindahkan dari Settings: participantId, participantDomainOptions + resolver domain, banner endpoint kosong/governance fallback/org tak kebaca, registrasi participant adapter (adaptersData, saveAdapter, open/editAdapter, removeAdapter, testAdapterConn, dialog), kamus drawer.
3. **Refactor `AdapterFlowWizard.tsx`**: prop `activeSection?: "source-layer"|"ingest"|"all"` (default "all", kompat). StepCard ①+② dibungkus `showSourceLayer`, StepCard ③ + riwayat task dibungkus `showIngest`. Render `<AdapterCollectionsUsage>` (④) DIHAPUS dari wizard (jadi panel "Koleksi" di page). Semua state/hook/logika tetap di atas, tidak dipindah. Ditambah prop `onStateChange` (callback stabil = setter useState) untuk mengekspor `computeAdapterStepStatuses` + domain/kategori/adapterReady ke page → dipakai badge tab (✓/●/angka) & context strip.
4. **Guide + context strip + kamus**: guide 3-langkah sticky di kolom kanan (grid `xl:grid-cols-[minmax(0,1fr)_260px]`, turun ke 1 kolom di layar sempit) hanya untuk tab Sumber & Ingest. Context strip (Domain·Kategori·Status adapter) di atas TabsList. Kamus = `<Sheet>` drawer kanan (tombol "? Kamus istilah" di header).
5. **Settings.tsx**: dihapus TabsTrigger "adapter" ("Proses Data") + seluruh TabsContent value="adapter" + Dialog adapter. State/handler/hook yatim dibuang (useParticipantAdapters/mutations, useParticipantDomains, useOrganizations/OrganizationDomains, useDomain, useRuntime, useDatasets, canManageAdapters, resolver domain, participantDomainOptions, governance fallback, kamus, dsb) + import terkait. `defaultSettingsTab` provider → "general" (bukan "adapter"). VALID_TABS tanpa "adapter". Deep-link lama `?tab=adapter` di-redirect ke `/adapter`.

### Gates
- `npx tsc -p tsconfig.app.json --noEmit`: **16 error project-wide sebelum = 16 sesudah** (semua pre-existing, tak tersentuh); **0 error di file yang disentuh**.
- `npx eslint <file tersentuh>`: **0 error** (hanya warning pre-existing: `any` di kode yang diport + 1 exhaustive-deps `effectiveParticipantDomainsData` yang identik dgn Settings lama).
- `npx vitest run`: **104/104 pass** (12 file, termasuk adapter-step-status + rbac-access + feature-access).
- `npx vite build`: **sukses**, dist fresh (built in ~32s).
- Glyph → · ① ✓ utuh, tanpa mojibake (dicek `â€`/`ï¿½`).

### Yang user lihat setelah restart + refresh
- Menu sidebar baru **"Adapter Data"** (grup Pemantauan & Operasional, tepat di bawah "Katalog Dataset").
- Halaman `/adapter` dengan **4 tab horizontal** ber-badge status: Sumber & Layer · Ingest · Koleksi · Alamat Adapter.
- **Save/Ingest tidak lagi melempar tab** — hasil & error tetap di tab yang sama; koneksi/layer/form tetap terisi walau pindah-pindah tab.
- Guide 3-langkah menyamping (kanan) di tab Sumber & Ingest; context strip Domain·Kategori·Status adapter di atas tab; kamus istilah tetap drawer kanan.
- Di **Pengaturan**, tab "Proses Data" hilang; provider membuka Pengaturan langsung ke tab Akun. Link lama `/settings?tab=adapter` otomatis diarahkan ke `/adapter`.
