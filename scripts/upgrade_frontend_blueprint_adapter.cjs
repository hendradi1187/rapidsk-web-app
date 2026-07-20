const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "docs",
  "FRONTEND_PORTAL_BLUEPRINT_2026-07-08.md",
);

const source = fs.readFileSync(filePath, "utf8");

const adapterInsert = `
Adapter perlu diperlakukan berbeda dari CTS karena pola API, state kerja, dan UX-nya juga berbeda:

- CTS berorientasi master data, approval, IAM, governance, contract, agreement, dan transfer readiness.
- Adapter berorientasi workflow teknis bertahap:
  - daftar koneksi sumber
  - eksplorasi layer
  - validasi / ingestion task
  - monitoring task background
  - ambil hasil validasi
  - publish hasil

Artinya pemisahan portal tidak cukup hanya memindahkan menu. Harus ada pemisahan **service model** dan **task model**.
`;

const adapterSection = `
## 10. Adaptasi Khusus Adapter

### 10.1 Kenapa Adapter Harus Diperlakukan Berbeda

Berdasarkan API live yang sudah ditangkap di codebase dan dokumen audit internal, adapter memiliki karakter yang berbeda dari CTS:

- Adapter memiliki **long-running background task**.
- Adapter memiliki **state teknis per sumber data**, bukan per contract governance.
- Adapter memiliki **preview/explore flow** sebelum publish.
- Adapter memiliki **remote source abstraction** yang tidak dimiliki CTS.
- Adapter berpotensi berubah endpoint atau deployment lebih sering dibanding CTS.

Karena itu, dari sisi FE adapter tidak cocok bila hanya dipandang sebagai subform biasa di bawah dataset.

### 10.2 Logical Capability Adapter dari API Live

Kemampuan logical yang sudah tercermin dari mapping API adapter live saat ini:

- health adapter service
- register remote source connection
- list remote source connection
- update remote source connection
- browse layer GeoServer
- browse layer ArcGIS
- describe layer
- preview item / feature
- ingestion GeoJSON
- ingestion Shapefile
- ingestion GeoServer
- ingestion ArcGIS
- list ingestion tasks
- detail ingestion task
- list OGC collections / items hasil validasi

Contoh endpoint family yang sudah tercermin di project:

- \`/remote-sources/connections/\`
- \`/remote-sources/geoserver/{connection_id}/layers\`
- \`/remote-sources/geoserver/{connection_id}/describe\`
- \`/remote-sources/geoserver/{connection_id}/preview\`
- \`/remote-sources/arcgis/{connection_id}/layers\`
- \`/remote-sources/arcgis/{connection_id}/describe\`
- \`/remote-sources/arcgis/{connection_id}/preview\`
- \`/remote-sources/arcgis/{connection_id}/preview-geojson\`
- \`/data-ingestion/geojson\`
- \`/data-ingestion/shapefile\`
- \`/data-ingestion/geoserver\`
- \`/data-ingestion/arcgis\`
- \`/data-ingestion/\`
- \`/data-ingestion/{id}\`

### 10.3 Konsekuensi ke Blueprint FE

Kalau CTS dan adapter dicampur tanpa boundary service yang jelas, akan muncul masalah:

- wizard provider jadi terlihat kosong hanya karena context domain belum resolve
- provider tidak tahu apakah error berasal dari domain binding, adapter endpoint, atau koneksi remote source
- perubahan adapter deployment ikut merusak shell operasional lain
- validasi teknis data tercampur dengan governance workflow

Karena itu adapter sebaiknya diposisikan sebagai:

- modul milik \`Connector Portal\`
- tetapi dengan **service layer terpisah**
- dan dengan **task state terpisah** dari dataset/contract/transfer state

### 10.4 Posisi Adapter yang Direkomendasikan

Struktur yang paling aman:

\`\`\`text
Connector Portal
├── Dashboard
├── Dataset Catalog
├── Contracts
├── Transfer Center
└── Adapter Workspace
    ├── Connection Setup
    ├── Source Explorer
    ├── Validation Tasks
    ├── Validated Results
    └── Publish Queue
\`\`\`

Jadi adapter bukan sekadar satu tab “Proses Data”, tetapi workspace operasional kecil dengan state sendiri.

## 11. Split Service Blueprint

### 11.1 Split yang Direkomendasikan

Untuk frontend, split service yang paling sehat adalah:

- \`Auth / Identity Service\`
- \`CTS Governance Service\`
- \`Connector Runtime Service\`
- \`Adapter Workspace Service\`
- \`Monitoring Service\`

### 11.2 Mapping Service ke Kebutuhan Bisnis

\`Auth / Identity Service\`

- login
- validate session
- refresh token
- user IAM basic profile

\`CTS Governance Service\`

- organizations
- domains
- participants
- onboarding
- connection pool
- policy / contract / agreement
- RBAC governance

\`Connector Runtime Service\`

- dataset operational
- transfer initiate / status / history
- provider-side transfer tools
- readiness projection

\`Adapter Workspace Service\`

- remote source connection
- source preview
- validation tasks
- validation result collections
- publish handoff

\`Monitoring Service\`

- heartbeats
- transfer events
- projections
- technical activity logs

### 11.3 Mapping Portal ke Service

\`CTS Portal\`

- Auth / Identity Service
- CTS Governance Service
- Monitoring Service

\`Connector Portal\`

- Auth / Identity Service
- CTS Governance Service
- Connector Runtime Service
- Adapter Workspace Service
- Monitoring Service

Catatan penting:

- Connector Portal tetap membaca sebagian data dari CTS Governance Service untuk context resmi.
- Adapter Workspace Service tidak boleh menentukan organization atau participant sendiri.
- Adapter hanya bekerja setelah context participant dan domain sudah resolve dari CTS.

## 12. Possibility Matrix

### 12.1 Opsi A - Tetap 1 Repo, 2 Shell, Adapter sebagai Workspace

Ini opsi paling direkomendasikan.

Nilai:

- kompleksitas migrasi: rendah ke sedang
- risiko sinkronisasi: paling rendah
- kecepatan delivery: paling tinggi
- reuse code: paling tinggi

### 12.2 Opsi B - 1 Repo, 3 Shell

Shell:

- CTS Portal
- Connector Portal
- Adapter Console

Ini possible, tapi belum ideal sekarang.

Nilai:

- kompleksitas migrasi: sedang
- risiko UX terfragmentasi: sedang
- reuse code: tetap tinggi
- kebutuhan boundary auth: lebih besar

### 12.3 Opsi C - 2 Repo FE

Repo:

- \`cts-portal-fe\`
- \`connector-portal-fe\`

Adapter tetap menempel ke connector.

Nilai:

- kompleksitas migrasi: tinggi
- risiko drift: tinggi
- effort shared library: tinggi
- cocok hanya bila tim dan deployment benar-benar dipisah

## 13. Task Breakdown

### 13.1 Task Fondasi

1. Pisahkan routing \`cts/*\` dan \`connector/*\`
2. Pusatkan runtime config service logical
3. Pusatkan session resolver
4. Bekukan source of truth context dari CTS

### 13.2 Task Adapter-Specific

1. Bentuk \`Adapter Workspace\` sebagai modul eksplisit
2. Pisahkan state:
   - active domain
   - active source connection
   - active task
   - latest validated result
3. Tambahkan health and connectivity status adapter
4. Tambahkan source explorer:
   - list layer
   - describe
   - preview
5. Tambahkan task monitor:
   - queued
   - running
   - success
   - failed
6. Tambahkan publish handoff ke dataset flow

### 13.3 Task Integrasi

1. Hubungkan domain binding provider ke adapter workspace
2. Kunci adapter supaya hanya bisa berjalan bila participant context valid
3. Hubungkan hasil validasi ke dataset catalog
4. Tampilkan error state yang membedakan:
   - domain belum bind
   - endpoint adapter belum ada
   - remote source gagal
   - task validation gagal
   - publish handoff gagal

## 14. Risk Matrix

### 14.1 Risiko Arsitektur

- **Risk A1**: Adapter tetap dianggap bagian kecil dari dataset form
  - dampak: flow validasi tetap membingungkan
  - severity: tinggi

- **Risk A2**: Connector Portal membuat fallback context sendiri
  - dampak: domain dan participant bisa tidak sinkron
  - severity: kritikal

- **Risk A3**: Endpoint adapter tetap di-hardcode ke angka port atau nama environment kasar
  - dampak: deployment dan switch environment rawan salah
  - severity: tinggi

### 14.2 Risiko Operasional

- **Risk O1**: Domain binding belum resmi di backend
  - dampak: adapter wizard kosong walau domain governance ada
  - severity: kritikal

- **Risk O2**: Remote source connection tidak diuji sebelum task dibuat
  - dampak: task gagal terlambat diketahui
  - severity: tinggi

- **Risk O3**: Publish hasil validasi tidak sinkron ke dataset domain yang benar
  - dampak: dataset salah domain atau tidak terbaca kontrak
  - severity: tinggi

- **Risk O4**: Connection pool connector siap, tetapi adapter endpoint belum siap
  - dampak: transfer dan ingestion readiness kelihatan campur
  - severity: sedang

## 15. Credit Ratio dan Prioritas

### 15.1 Ratio Nilai Perubahan

Estimasi nilai perubahan terhadap hasil akhir FE:

- context binding stabilization: **30%**
- CTS vs Connector shell separation: **20%**
- adapter workspace formalization: **25%**
- transfer and monitoring consolidation: **15%**
- cosmetics / layout cleanup: **10%**

Maknanya:

- kalau adapter tidak dibenahi, meskipun portal dipisah rapi, value keseluruhan tetap timpang
- tetapi kalau binding context belum beres, adapter sebagus apa pun tetap mudah kosong atau salah domain

### 15.2 Ratio Effort

Perkiraan effort frontend relatif:

- shell split: **20**
- session and context stabilization: **30**
- adapter workspace restructuring: **30**
- service config and runtime cleanup: **10**
- QA and regression hardening: **10**

Total asumsi effort: **100 poin**

### 15.3 Prioritas Implementasi

Urutan paling sehat:

1. stabilkan context binding
2. pisahkan shell CTS vs Connector
3. bentuk adapter workspace
4. rapikan service config logical
5. baru poles UX dan visual

## 16. Rekomendasi Final dengan Fokus Adapter

Dengan kebutuhan utama sekarang, blueprint FE yang paling masuk akal adalah:

- **1 repo frontend**
- **2 shell portal**
- **1 adapter workspace di Connector Portal**
- **1 session resolver tunggal dari CTS**
- **1 runtime config logical service**

Jangan langsung buat adapter jadi portal ketiga penuh dulu. Yang perlu dipisah dulu adalah:

- shell governance vs shell operasional
- service layer CTS vs adapter
- state domain/participant vs state task validation adapter

Kalau ini dijalankan, hasilnya:

- governance tetap bersih
- provider flow jadi lebih jelas
- adapter tidak lagi terasa nempel
- split service future-proof kalau nanti benar-benar mau jadi beberapa FE terpisah
`;

let next = source;

next = next.replace(
  "Adapter bukan portal governance. Adapter adalah service pendukung ingest, validate, preview, dan publish data. Dari sisi frontend, adapter lebih aman diposisikan sebagai modul di Connector Portal.",
  "Adapter bukan portal governance. Adapter adalah service pendukung ingest, validate, preview, dan publish data. Dari sisi frontend, adapter lebih aman diposisikan sebagai modul di Connector Portal.\n" +
    adapterInsert,
);

next = next.replace(
  "## 10. Batas UI dan Ownership",
  `${adapterSection}\n\n## 17. Batas UI dan Ownership`,
);

next = next.replace("## 11. Flow Session Frontend", "## 18. Flow Session Frontend");
next = next.replace("## 12. Migrasi dari FE Existing", "## 19. Migrasi dari FE Existing");
next = next.replace("## 13. Risiko Jika Tetap Satu Shell Campur", "## 20. Risiko Jika Tetap Satu Shell Campur");
next = next.replace("## 14. Rekomendasi Final", "## 21. Rekomendasi Final");
next = next.replace("## 15. Lampiran Mermaid", "## 22. Lampiran Mermaid");
next = next.replace("### 15.3 Portal Ownership", "### 22.3 Portal Ownership");

const mermaidAppend = `

### 22.4 Split Service dan Adapter Workspace

\`\`\`mermaid
flowchart LR
    A[Frontend Repo] --> B[CTS Portal Shell]
    A --> C[Connector Portal Shell]

    B --> S1[Auth Identity Service]
    B --> S2[CTS Governance Service]
    B --> S5[Monitoring Service]

    C --> S1
    C --> S2
    C --> S3[Connector Runtime Service]
    C --> S4[Adapter Workspace Service]
    C --> S5

    S2 --> X1[Organization and Participant Context]
    S4 --> X2[Remote Source]
    S4 --> X3[Validation Task]
    S4 --> X4[Validated Result]
    S3 --> X5[Transfer Runtime]
\`\`\`
`;

next += mermaidAppend;

fs.writeFileSync(filePath, next, "utf8");
console.log("Blueprint upgraded with adapter focus.");
