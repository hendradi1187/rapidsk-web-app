# Mapping Fitur FE-BE Dataspace

Tanggal: 2026-07-06

## 1. Tujuan Dokumen

Dokumen ini merangkum kondisi aplikasi dataspace saat ini dari sisi:

- fitur frontend yang sudah tersedia
- endpoint backend yang dipakai
- perubahan frontend yang sudah diterapkan
- gap yang masih terlihat per modul
- dampak praktis ke flow pengguna

Dokumen ini sengaja ditulis untuk kebutuhan yang operasional dan cepat dibaca, supaya bisa dipakai sebagai:

- bahan review internal
- dasar FSD / TRD
- acuan sprint berikutnya
- checkpoint sinkronisasi FE dan BE

## 2. Ringkasan Eksekutif

Secara garis besar, frontend sekarang sudah cukup kuat untuk menjalankan flow inti yang ada saat ini:

1. setup runtime / login
2. governance setup
3. registrasi dan approval participant
4. publish dataset
5. kontrak dan agreement
6. transfer data
7. adapter wizard provider

Yang sudah membaik paling terasa:

- transfer tidak lagi berjalan dengan pemetaan policy yang liar
- publish dataset tidak lagi bebas memilih schema dari domain lain
- login, RBAC, dan gating mulai bergerak ke model yang lebih permission-aware
- lint, test, dan build sudah tidak merah

Yang masih belum bisa dianggap final:

- binding participant -> organization -> domain belum sepenuhnya tegas dari backend
- beberapa relasi penting masih dibaca lewat inferensi nama, tag, atau description
- adapter, connection pool, dan dataplane readiness masih butuh data backend yang lebih konsisten

## 3. Perubahan FE yang Sudah Diterapkan

### 3.1 Transfer center

Perubahan:

- dataset policy sekarang di-resolve per dataset, bukan lagi mengambil item pertama dari daftar policy
- readiness transfer ditahan kalau policy dataset belum cocok atau masih ambigu
- UI menampilkan alasan kenapa transfer belum bisa dijalankan

File utama:

- [src/pages/TransferCenter.tsx](/D:/laragon/www/dataspace-new/src/pages/TransferCenter.tsx:35)
- [src/lib/policy-mapping.ts](/D:/laragon/www/dataspace-new/src/lib/policy-mapping.ts:1)
- [src/test/policy-mapping.test.ts](/D:/laragon/www/dataspace-new/src/test/policy-mapping.test.ts:1)

Dampak:

- operator tidak lagi salah kirim dataset ke policy yang keliru
- kegagalan transfer lebih jujur terlihat di UI

### 3.2 Publish dataset

Perubahan:

- schema dari domain lain tidak lagi bisa dipakai diam-diam
- default schema tidak lagi fallback ke schema pertama lintas domain
- warning muncul saat domain aktif belum punya schema hasil Juknis

File utama:

- [src/components/datasets/PublishDatasetDialog.tsx](/D:/laragon/www/dataspace-new/src/components/datasets/PublishDatasetDialog.tsx:37)

Dampak:

- risiko dataset salah domain turun
- operator lebih cepat paham kenapa publish tertahan

### 3.3 Login, auth, dan RBAC

Perubahan:

- FE mulai membaca effective permissions dari backend IAM
- route guard dan sidebar tidak lagi hanya bertumpu pada satu role utama
- login organization tetap diprioritaskan dari governance organization

File utama:

- [src/components/login/LoginPage.tsx](/D:/laragon/www/dataspace-new/src/components/login/LoginPage.tsx:1)
- [src/context/AuthContext.tsx](/D:/laragon/www/dataspace-new/src/context/AuthContext.tsx:1)
- [src/components/auth/RoleGuard.tsx](/D:/laragon/www/dataspace-new/src/components/auth/RoleGuard.tsx:1)
- [src/components/layout/Sidebar.tsx](/D:/laragon/www/dataspace-new/src/components/layout/Sidebar.tsx:1)
- [src/api/services/iam.ts](/D:/laragon/www/dataspace-new/src/api/services/iam.ts:1)
- [src/api/services/iam-admin.ts](/D:/laragon/www/dataspace-new/src/api/services/iam-admin.ts:1)

Dampak:

- akses halaman sensitif lebih konsisten
- struktur RBAC FE lebih dekat ke kontrak BE live

### 3.4 Adapter wizard provider

Perubahan:

- flow provider untuk remote source, GeoJSON, dan shapefile sudah lebih sistematis
- error handling dan output proses lebih jelas
- typing layer parsing dibersihkan sebagian

File utama:

- [src/components/settings/AdapterFlowWizard.tsx](/D:/laragon/www/dataspace-new/src/components/settings/AdapterFlowWizard.tsx:1)
- [src/api/services/adapter-service.ts](/D:/laragon/www/dataspace-new/src/api/services/adapter-service.ts:1)
- [src/api/services/adapter-runtime.ts](/D:/laragon/www/dataspace-new/src/api/services/adapter-runtime.ts:1)

Dampak:

- provider punya jalur kerja adapter yang lebih nyata dari FE
- tapi tetap belum final kalau endpoint adapter live belum stabil

### 3.5 Tooling dan kualitas teknis

Perubahan:

- lint sudah tidak error
- test unit tetap hijau
- build production tetap lolos
- Docker dan runtime env sudah disiapkan untuk deploy dinamis

File utama:

- [eslint.config.js](/D:/laragon/www/dataspace-new/eslint.config.js:1)
- [Dockerfile](/D:/laragon/www/dataspace-new/Dockerfile:1)
- [docker-compose.yml](/D:/laragon/www/dataspace-new/docker-compose.yml:1)
- [DEPLOY-FE.md](/D:/laragon/www/dataspace-new/DEPLOY-FE.md:1)

## 4. Peta Modul

### 4.1 Runtime setup dan bootstrap

FE:

- `/setup`
- `SetupBoundary`
- `RuntimeProvider`
- deployment config

BE / wrapper:

- `GET /setup/status`
- `POST /setup/license/validate`
- `POST /setup/validate`
- `POST /setup/init`
- `GET /runtime-config.json`
- `POST /admin/runtime-config`
- `GET /admin/license-status`
- `POST /admin/license/revalidate`

Status:

- FE sudah siap untuk first-run setup, runtime config, dan wrapper bundle
- untuk deployment browser-based, ini sudah cukup rapi

Gap:

- license server live dan policy aktivasi masih tergantung implementasi wrapper / infra

Efek:

- konfigurasi API, host, SSO, dan adapter endpoint bisa dipindah dari hardcoded build ke runtime

### 4.2 Login dan sesi

FE:

- `/login`
- pemilihan organisasi governance
- local auth
- SSO button

BE:

- `POST /identity-provider/auth/login`
- `POST /identity-provider/auth/validate`
- `GET /identity-provider/iam/me/effective-permissions`
- `GET /governance/organizations/`
- fallback wrapper `/public/organizations`

Status:

- login sudah bisa membentuk session user, role, dan permissions
- organization picker sudah membaca governance organizations

Gap:

- binding keras antara pilihan organisasi login dan participant context belum 100 persen kuat
- jika BE tidak mengembalikan relasi yang eksplisit, FE masih perlu fallback

Efek:

- user sekarang lebih sering masuk dengan context yang benar
- tetapi untuk kasus data backend yang belum sinkron, context masih bisa bias

### 4.3 Governance organizations dan domains

FE:

- `/organizations`
- `/setup-juknis`

BE:

- `GET /governance/organizations/`
- `POST /governance/organizations/`
- `PATCH /governance/organizations/{id}`
- `DELETE /governance/organizations/{id}`
- `GET /governance/organizations/{orgId}/domains`
- `POST /governance/organizations/{orgId}/domains`
- `PATCH /governance/organizations/{orgId}/domains/{domainId}`
- `DELETE /governance/organizations/{orgId}/domains/{domainId}`

Status:

- governance CRUD dasar sudah ada
- setup domain dan apply Juknis sudah jadi fondasi flow

Gap:

- hasil governance domain belum selalu turun konsisten ke participant provider

Efek:

- governance setup sudah menjadi source paling masuk akal untuk semua flow berikutnya

### 4.4 Apply Juknis

FE:

- `/setup-juknis`

BE:

- `POST /policy-contract/{domainId}/apply-juknis`

Status:

- flow apply Juknis secara konsep sudah benar
- ini menjadi fondasi untuk policy, schema, vocabulary, dan baseline 5 domain

Gap:

- hasil artifact pasca apply belum selalu langsung terbaca rapi di sisi provider
- belum semua artifact punya relasi eksplisit yang mudah dikonsumsi FE

Efek:

- apply Juknis sebaiknya tetap dipertahankan sebagai langkah awal, bukan dibongkar

### 4.5 Registrasi KKKS dan approval

FE:

- `/register-kkks`
- `/participants`
- tab queue registrasi

BE:

- `POST /onboarding/registrations`
- `GET /onboarding/registrations`
- `PATCH /onboarding/registrations/{id}`
- `POST /onboarding/participants`
- `GET /onboarding/participants`
- `GET /onboarding/participants/{id}`
- `PATCH /onboarding/participants/{id}`

Status:

- queue registrasi dan approval sudah ada
- FE sudah mendukung alur pembuatan participant dan operator

Gap:

- approval registrasi masih sensitif terhadap resolve organization / participant / domain
- kontrak kewajiban otomatis masih perlu relasi domain yang konsisten

Efek:

- onboarding bisa jalan
- tapi data pasca approval bisa tidak rapi jika binding dasar dari backend belum lengkap

### 4.6 Participant detail, domain binding, dan adapter binding

FE:

- `/participants/:id`
- admin binding domain
- admin binding adapter participant

BE:

- `GET /onboarding/participants/{participantId}/domains`
- `POST /onboarding/participants/{participantId}/domains`
- `PATCH /onboarding/participants/{participantId}/domains/{id}`
- `DELETE /onboarding/participants/{participantId}/domains/{id}`
- `GET /onboarding/participants/{participantId}/adapters`
- `POST /onboarding/participants/{participantId}/adapters`
- `PATCH /onboarding/participants/{participantId}/adapters/{id}`
- `DELETE /onboarding/participants/{participantId}/adapters/{id}`

Status:

- secara FE jalur CRUD participant domains dan adapters sudah ada

Gap:

- relasi domain participant belum selalu menjadi source utama di semua halaman
- beberapa halaman masih fallback ke governance domain

Efek:

- participant detail sekarang bisa dijadikan titik kontrol admin
- tapi sinkronisasi lintas halaman belum seratus persen selesai

### 4.7 Datasets

FE:

- `/datasets`
- publish dataset
- edit dataset
- preview dan listing

BE:

- `GET /data-catalog/{domainId}/datasets`
- `GET /data-catalog/{domainId}/datasets/{id}`
- `POST /data-catalog/{domainId}/datasets`
- `PATCH /data-catalog/{domainId}/datasets/{id}`
- `DELETE /data-catalog/{domainId}/datasets/{id}`

Status:

- CRUD dataset dasar tersedia
- publish dialog sekarang lebih ketat

Gap:

- korelasi dataset ke domain / level / policy masih belum sepenuhnya tegas dari payload BE
- edit dataset masih bergantung pada struktur endpoint metadata yang cukup longgar

Efek:

- risiko publish dataset salah domain sudah turun
- tapi dataset relation model masih perlu diperkaya dari backend

### 4.8 Schemas

FE:

- `/schemas`

BE:

- `GET /data-catalog/{domainId}/schemas`
- `GET /data-catalog/{domainId}/schemas/{id}`
- `POST /data-catalog/{domainId}/schemas`
- `PATCH /data-catalog/{domainId}/schemas/{id}`
- `DELETE /data-catalog/{domainId}/schemas/{id}`

Status:

- FE dan BE sama-sama sudah punya jalur CRUD

Gap:

- hasil schema masih belum selalu otomatis terasa nyambung ke publish dataset bila binding domain belum rapi

Efek:

- modul schema sudah bisa dikembangkan lebih jauh tanpa ubah arsitektur besar

### 4.9 Vocabularies dan terms

FE:

- `/vocabularies`

BE:

- `GET /data-catalog/{domainId}/vocabularies`
- `GET /data-catalog/{domainId}/vocabularies/{id}`
- `POST /data-catalog/{domainId}/vocabularies`
- `PATCH /data-catalog/{domainId}/vocabularies/{id}`
- `DELETE /data-catalog/{domainId}/vocabularies/{id}`
- `GET /data-catalog/{domainId}/vocabularies/{id}/terms`

Status:

- vocabulary dan terms sudah ada di FE dan BE

Gap:

- belum semua relasi term -> schema -> dataset tampil kuat di FE

Efek:

- ini sudah layak dipakai sebagai modul data governance, tapi belum sepenuhnya terasa satu paket dengan dataset flow

### 4.10 Policies

FE:

- `/policies`

BE:

- `GET /policy-contract/{domainId}/dataset-policies`
- `POST /policy-contract/{domainId}/dataset-policies`
- `PATCH /policy-contract/{domainId}/dataset-policies/{policyId}`
- `DELETE /policy-contract/{domainId}/dataset-policies/{policyId}`

Status:

- dataset policies sudah bisa dikelola

Gap:

- domain dan level policy masih belum selalu dikirim sebagai relasi yang paling tegas
- FE masih perlu helper resolve untuk beberapa flow

Efek:

- policy management sudah hidup
- transfer sekarang sudah lebih aman karena FE tidak lagi asal mengambil policy pertama

### 4.11 Contracts dan agreements

FE:

- `/contracts`
- provider inbox

BE:

- `GET /policy-contract/{domainId}/contracts`
- `GET /policy-contract/{domainId}/contracts/{id}`
- `POST /policy-contract/{domainId}/contracts`
- `PATCH /policy-contract/{domainId}/contracts/{id}`
- `DELETE /policy-contract/{domainId}/contracts/{id}`
- `GET /policy-contract/{domainId}/agreements`
- `POST /policy-contract/{domainId}/agreements`
- `PATCH /policy-contract/{domainId}/agreements/{id}`

Status:

- kontrak dan agreement sudah dipakai aktif oleh FE

Gap:

- otomatisasi kewajiban pasca approval registrasi masih sensitif terhadap data domain yang ditemukan saat itu
- kontrak multi-dataset masih butuh penguatan UX dan relasi

Efek:

- modul control plane sudah usable
- tapi masih ada ruang besar untuk membereskan korelasi otomatisnya

### 4.12 Transfer dan connector

FE:

- `/transfers`

BE:

- `GET /connector/{domainId}/transfers`
- `POST /connector/consumer/initiate`
- `POST /connector/consumer/direct/{transferProcessId}/start`
- `POST /connector/consumer/persistent/{transferProcessId}/start`
- `GET /connector/{transferProcessId}/status`
- `GET /connector/consumer/persistent/{transferProcessId}/download`

Status:

- flow transfer inti sudah ada
- retry dan refresh status sudah ada
- persistent download sudah ada

Gap:

- connector live backend sudah mulai punya sisi provider juga, tapi FE transfer center masih dominan consumer-side
- readiness masih bergantung pada metadata connection pool

Efek:

- transfer FE sudah lebih aman dan jujur
- tapi belum final sampai kontrak endpoint connector live final disatukan

### 4.13 Connection pools

FE:

- `/connection-pools`
- transfer center readiness

BE:

- `GET /onboarding/connection-pools`
- `POST /onboarding/connection-pools`
- `PATCH /onboarding/connection-pools/{id}`
- `DELETE /onboarding/connection-pools/{id}`

Status:

- CRUD connection pool tersedia

Gap:

- flow siapa yang mengisi dan kapan masih belum selalu terasa jelas dari UX
- transfer sangat bergantung pada metadata:
  - `endpoint`
  - `well_known_jwt_url`

Efek:

- jika metadata pool rapi, FE transfer sudah bisa membaca readiness dengan baik
- jika metadata pool setengah lengkap, operator tetap akan merasa flow macet

### 4.14 Adapter service

FE:

- settings provider
- adapter wizard
- dataset publish helper

BE / proxy:

- `/adapter-service/api/v1/*`
- `/adapter-runtime/*`

Status:

- FE sudah punya jalur wizard yang cukup lengkap untuk:
  - register remote source
  - load layer
  - describe / preview
  - submit ingestion task
  - monitor task
  - load validated items

Gap:

- kontrak adapter live masih berubah
- docs OpenAPI adapter live belum selalu bisa diverifikasi saat audit

Efek:

- FE provider sekarang punya mock-operational path yang sudah usable
- tapi masih perlu sinkron final saat service adapter live betul-betul mantap

### 4.15 Audit trail

FE:

- `/audit`

BE:

- endpoint audit service via hook `useAuditLogs`

Status:

- listing, filtering, export, dan detail audit sudah ada di FE

Gap:

- endpoint activity/dashboard audit belum semuanya terpasang ke widget FE lain

Efek:

- halaman audit sendiri sudah lumayan informatif
- tapi dashboard audit summary belum sepenuhnya hidup di semua tempat

### 4.16 Deployment config dan docker

FE:

- `/deployment-config`
- wrapper runtime setup

Infra:

- `Dockerfile`
- `docker-compose.yml`
- env runtime

Status:

- frontend sekarang sudah bisa dipaketkan lebih rapi sebagai bundle browser-based dengan wrapper
- port, host, nama PM2, dan API target bisa dibuat dinamis dari env

Gap:

- implementasi production infra tetap butuh keputusan operasi:
  - PM2
  - reverse proxy
  - volume config
  - license server

Efek:

- deploy jadi lebih realistis untuk server bersama dan lintas OS

## 5. Gap Per Modul yang Paling Jelas

### 5.1 Gap yang bisa ditutup dari FE

- validasi schema-domain saat publish dataset
- validasi policy mapping saat transfer
- tampilan readiness dan pesan error yang lebih jelas
- permission-aware gating
- adapter wizard flow yang lebih sistematis
- runtime config dan deploy wrapper

### 5.2 Gap yang butuh data backend lebih tegas

- binding `user -> participant -> organization -> domain`
- relasi dataset ke policy yang eksplisit
- relasi dataset ke domain dan level yang eksplisit
- hasil apply Juknis yang langsung konsisten turun ke participant
- connection pool metadata yang selalu lengkap

### 5.3 Gap yang butuh keputusan produk / arsitektur

- apakah transfer center akan tetap consumer-driven atau ikut model provider-side connector live
- apakah binding domain dipegang admin penuh atau otomatis penuh saat approval
- apakah RBAC akan sepenuhnya permission-driven atau hybrid role + permission

## 6. Efek Nyata dari Perubahan Saat Ini

### 6.1 Efek positif

- operator lebih cepat tahu penyebab proses tertahan
- risiko dataset salah domain berkurang
- risiko transfer salah policy berkurang
- deploy FE lebih siap untuk lingkungan server
- kualitas pipeline developer membaik karena test/build/lint tidak lagi merah

### 6.2 Efek netral

- beberapa warning lint masih tersisa sebagai technical debt, tetapi tidak memblokir pipeline
- beberapa fallback FE masih dibiarkan hidup untuk menjaga flow lama tetap jalan

### 6.3 Efek yang masih belum selesai

- sinkronisasi end-to-end masih bisa goyang kalau backend mengembalikan data yang belum tegas
- provider context dan domain context belum sepenuhnya steril dari fallback

## 7. Status Tooling

Hasil terakhir saat audit ini ditulis:

- `npm run lint` -> lulus dengan `0 errors`, masih ada warning debt
- `npm test` -> lulus, `5` test files, `15` tests
- `npm run build` -> lulus

Interpretasi:

- codebase sekarang tidak lagi terhambat oleh error tooling dasar
- warning yang tersisa lebih cocok diperlakukan sebagai batch technical debt berikutnya

## 8. Rekomendasi Lanjutan

Urutan kerja paling aman berikutnya:

1. kunci binding participant-domain dari sisi admin sebagai source of truth
2. turunkan binding itu ke semua halaman provider tanpa fallback yang terlalu liar
3. rapikan relasi dataset-policy-domain-level dari backend
4. sinkronkan kontrak connector live final dengan transfer center FE
5. lanjutkan batch pembersihan lint warnings di modul besar:
   - `ParticipantDetail`
   - `Settings`
   - `ProviderInbox`
   - `Dashboard`

## 9. Kesimpulan Akhir

Frontend sekarang sudah berada di posisi yang jauh lebih sehat:

- fitur utama sudah hidup
- guard penting sudah ditambahkan
- alur besar tidak dibongkar
- titik-titik paling rawan sudah dipersempit

Masalah yang tersisa sekarang semakin jelas bentuknya:

- bukan lagi kekacauan umum,
- tetapi relasi backend yang belum cukup eksplisit untuk membuat seluruh flow benar-benar ketat.

Itu kabar baik, karena artinya pekerjaan berikutnya bisa lebih fokus dan tidak lagi menebak-nebak area masalah.
