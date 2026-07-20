const fs = require("fs");
const path = require("path");

const filePath = path.join(
  __dirname,
  "..",
  "docs",
  "FRONTEND_SPLIT_SERVICE_BLUEPRINT_DETAILED_2026-07-08.md",
);

const source = fs.readFileSync(filePath, "utf8");

const standaloneSection = `
## 17. Target Standalone Service Bundle

### 17.1 Arah Pengembangan

Target jangka menengah yang inline dengan kebutuhan sekarang adalah menjadikan frontend ini sebagai:

- browser-based portal
- standalone deployment bundle
- runtime-configurable
- license-aware
- service-encapsulated
- siap dipakai sebelum backend benar-benar dipecah

### 17.2 Bentuk Arsitektur Target

Lapisan target yang disarankan:

1. UI App Layer
   - CTS Portal Shell
   - Connector Portal Shell
   - Adapter Workspace
2. Frontend Service Layer
   - auth client
   - cts client
   - connector client
   - adapter client
   - monitoring client
3. Bootstrap Runtime Layer
   - runtime config loader
   - setup status checker
   - service availability checker
   - public runtime config provider
   - proxy logical service
4. License and Protection Layer
   - validate license key
   - validate licensed host
   - feature gating
   - expiry or revalidation
   - lock or unlock module

### 17.3 Prinsip Wajib

- FE tidak boleh tahu angka port deployment sebagai identitas bisnis
- runtime config harus selesai di-load sebelum auth init
- license validation final tidak boleh ditaruh murni di browser
- feature gating harus dibaca dari runtime/license state
- module ownership tidak boleh campur kembali
- adapter tetap tunduk pada context resmi CTS

## 18. Goal Breakdown

### 18.1 Goal Utama

- membuat FE siap tumbuh menjadi service-aware frontend
- membuat deploy FE bisa dipindah endpoint tanpa rebuild
- membuat shell governance dan shell operasional jelas boundary-nya
- membuat adapter punya workspace yang kokoh
- menyiapkan placeholder resmi untuk licensing dan protection

### 18.2 Goal per Fase

Goal A - Foundation Stability
- context binding tunggal
- route ownership jelas
- service ownership jelas
- tidak ada hardcoded host atau port di layer UI

Goal B - Service Encapsulation
- semua API call masuk lewat logical client yang benar
- runtime config menjadi sumber base URL
- auth, CTS, connector, adapter, monitoring punya boundary yang tegas

Goal C - Adapter Formalization
- adapter tidak lagi jadi tab campuran
- provider mendapat alur teknis yang runtut
- status blocked vs empty vs failed bisa dibedakan

Goal D - Bootstrap and License Readiness
- app bisa di-lock sebelum fully initialized
- endpoint service bisa diganti dari runtime config
- lisensi bisa menghidupkan atau mematikan capability tertentu

Goal E - Progressive Future Split
- ketika backend dipecah, FE tidak perlu refactor besar
- ketika modul dijual per paket, feature gating sudah siap
- ketika deployment dipindah, bootstrap tetap jadi gerbang stabil

## 19. Step-by-Step Development Plan

### 19.1 Step 1 - Runtime Config Loader
- loader runtime config sebelum render app
- logical service registry
- fallback handling kalau config belum valid

### 19.2 Step 2 - Logical Client Separation
- authClient
- ctsClient
- connectorClient
- adapterClient
- monitoringClient

### 19.3 Step 3 - API Ownership Audit
- audit semua file src/api/services
- tandai endpoint family per service
- rapikan service yang masih campur

### 19.4 Step 4 - Session and Context Hardening
- session resolver tunggal
- active organization resolver
- participant resolver
- domain binding resolver

### 19.5 Step 5 - Shell Split
- CTS Portal Shell
- Connector Portal Shell
- route group terpisah
- menu group terpisah

### 19.6 Step 6 - Adapter Workspace Formal
- connection registry
- source explorer
- validation task runner
- task monitor
- validated results
- publish handoff

### 19.7 Step 7 - Bootstrap Gate
- setup status check
- app lock saat config belum siap
- health summary awal

### 19.8 Step 8 - License Validation Integration
- license input di first-run atau admin config
- license state storage
- revalidate flow
- feature gating

### 19.9 Step 9 - QA and Regression Hardening
- smoke test bootstrap
- smoke test login context
- smoke test adapter workspace
- smoke test transfer center
- validator untuk config invalid atau expired license

## 20. Timeline dan Estimasi

- runtime config plus logical client skeleton: 3 hari
- audit API ownership plus cleanup service: 3 hari
- session and context hardening: 3 hari
- shell split CTS vs Connector: 4 sampai 5 hari
- adapter workspace formalization: 4 hari
- bootstrap gate plus first-run control: 2 sampai 3 hari
- license integration stub plus gating: 3 hari
- QA, regression, doc hardening: 2 sampai 3 hari

## 21. Risk Ratio dan Exposure

- runtime config tidak siap sebelum auth init: tinggi
- service boundary dilanggar lagi oleh module lain: tinggi
- session resolver tetap ambigu: sangat tinggi
- adapter context masih ambil fallback lokal: sangat tinggi
- shell split memicu redirect loop: tinggi
- license gate salah mengunci app: sedang sampai tinggi

## 22. End-State yang Dituju

- 1 repo yang rapi
- 2 shell yang jelas
- 5 logical clients yang stabil
- adapter workspace yang formal
- bootstrap runtime yang mengunci init
- license-aware deployment bundle
- siap dipindahkan ke banyak environment
- siap berkembang ke standalone services tanpa refactor besar
`;

const extraMermaid = `

### 23.4 Standalone Bundle Target

\`\`\`mermaid
flowchart TD
    A[Browser] --> B[Bootstrap Runtime Layer]
    B --> C[Runtime Config Loader]
    B --> D[Setup Status Check]
    B --> E[License Gate]
    B --> F[Logical Service Proxy]

    F --> G[Auth Service]
    F --> H[CTS Service]
    F --> I[Connector Service]
    F --> J[Adapter Service]
    F --> K[Monitoring Service]

    L[UI App Layer] --> M[CTS Portal Shell]
    L --> N[Connector Portal Shell]
    N --> O[Adapter Workspace]
\`\`\`

### 23.5 Development Roadmap

\`\`\`mermaid
flowchart LR
    A[Runtime Config] --> B[Logical Clients]
    B --> C[API Ownership Audit]
    C --> D[Session Hardening]
    D --> E[Shell Split]
    E --> F[Adapter Workspace]
    F --> G[Bootstrap Gate]
    G --> H[License Integration]
    H --> I[QA Hardening]
\`\`\`
`;

let next = source;

if (!next.includes("## 17. Target Standalone Service Bundle")) {
  if (!next.includes("## 17. Mermaid")) {
    throw new Error("Anchor section '## 17. Mermaid' tidak ditemukan di detailed blueprint.");
  }

  next = next.replace("## 17. Mermaid", `${standaloneSection}\n\n## 23. Mermaid`);
  next = next.replace("### 17.1 Shell dan Service", "### 23.1 Shell dan Service");
  next = next.replace("### 17.2 Context Resolution", "### 23.2 Context Resolution");
  next = next.replace("### 17.3 Adapter Workspace", "### 23.3 Adapter Workspace");
}

if (!next.includes("### 23.4 Standalone Bundle Target")) {
  next += extraMermaid;
}

fs.writeFileSync(filePath, next, "utf8");
console.log("Detailed blueprint standalone section verified or upgraded.");
