# Audit API RBAC & Adapter
Tanggal: 6 Juli 2026  
Target runtime FE: `http://192.168.1.55:8181/api/v1`

## Ringkasan
Audit ini membandingkan kontrak FE existing dengan OpenAPI live yang aktif saat ini, dengan fokus pada:

- IAM / RBAC
- connector / monitoring
- adapter / participant adapter
- dampak terhadap flow login, routing, dan settings provider

## Hasil utama
### 1. IAM / RBAC live lebih maju daripada FE existing
Endpoint IAM live yang sekarang tersedia:

- `GET /api/v1/identity-provider/iam/me/effective-permissions`
- `GET|POST /api/v1/identity-provider/iam/groups/{group_id}/permissions`
- `GET /api/v1/identity-provider/iam/policy-bundle`
- `GET /api/v1/identity-provider/iam/users/{user_id}/effective-permissions`
- CRUD aplikasi, API resources, dan permissions

Kesimpulan:
- backend sudah punya layer permission-driven
- FE sebelumnya masih dominan role-driven dengan turunan `category.code` + `group.code`

### 2. Connector live bertambah
Endpoint live yang menandakan ekspansi control plane dan monitoring:

- `POST /api/v1/connector/provider/initiate`
- `POST /api/v1/connector/provider/direct/{transfer_process_id}/start`
- `GET /api/v1/connector/provider/{transfer_process_id}/check`
- `POST /api/v1/connector/runtime/heartbeat/send`
- `POST /api/v1/connector/runtime/transfer-events/publish`
- `GET /api/v1/cts/monitoring/connector-heartbeat`
- `GET /api/v1/cts/monitoring/connector-heartbeats`

Kesimpulan:
- kontrak connector live tidak lagi hanya consumer-side
- FE transfer center sekarang masih dominan consumer-side

### 3. Participant adapter sekarang resmi ada di main BE
Endpoint live:

- `GET|POST /api/v1/onboarding/participants/{participant_id}/adapters`
- `PATCH|DELETE /api/v1/onboarding/participants/{participant_id}/adapters/{id}`

Kesimpulan:
- relasi adapter ke participant sudah ada di BE utama
- ini cocok untuk flow provider settings dan dataplane readiness

### 4. Adapter service masih transisi
FE sekarang sudah memakai dua pola:

- wrapper runtime: `/adapter-runtime/*`
- service proxy baru: `/adapter-service/api/v1/*`

Kondisi live saat audit:

- `http://192.168.1.55:8282/openapi.json` → `404`
- `http://192.168.1.55:8186/openapi.json` → tidak dapat dijangkau

Kesimpulan:
- FE sudah mengarah ke kontrak adapter baru
- tetapi service adapter live belum bisa divalidasi penuh lewat docs/openapi

## Perubahan yang diterapkan di FE
### Auth & RBAC
- login sekarang mencoba mengambil `effective permissions` dari BE setelah auth sukses
- auth context melakukan hydration permission ringan setelah bootstrap
- user info tersimpan ulang dengan `permissions[]`
- `RoleGuard` sekarang menghormati `roles[]`, bukan cuma primary role
- `Sidebar` sekarang menghormati union `roles[]`, bukan cuma primary role
- halaman sensitif mulai memakai permission-aware gating dengan fallback role lama:
  - deployment config
  - connection pools
  - organizations
  - participant approval
  - adapter actions di settings

### Public organization source
- source utama login tetap direct ke `GET /governance/organizations/`
- wrapper `/public/organizations` hanya fallback

### Deploy / runtime
- ditambahkan jalur deploy Docker yang tetap memakai wrapper runtime
- port, host, nama service, dan license server bisa diganti via env tanpa rebuild FE

## File yang diubah
- [src/api/services/iam.ts](../src/api/services/iam.ts)
- [src/lib/effective-permissions.ts](../src/lib/effective-permissions.ts)
- [src/context/AuthContext.tsx](../src/context/AuthContext.tsx)
- [src/components/login/LoginPage.tsx](../src/components/login/LoginPage.tsx)
- [src/components/auth/RoleGuard.tsx](../src/components/auth/RoleGuard.tsx)
- [src/components/layout/Sidebar.tsx](../src/components/layout/Sidebar.tsx)
- [src/lib/feature-access.ts](../src/lib/feature-access.ts)
- [src/pages/DeploymentConfig.tsx](../src/pages/DeploymentConfig.tsx)
- [src/pages/ConnectionPools.tsx](../src/pages/ConnectionPools.tsx)
- [src/pages/Organizations.tsx](../src/pages/Organizations.tsx)
- [src/pages/Participants.tsx](../src/pages/Participants.tsx)
- [src/pages/participants/RegistrationsTab.tsx](../src/pages/participants/RegistrationsTab.tsx)
- [src/pages/Settings.tsx](../src/pages/Settings.tsx)
- [Dockerfile](../Dockerfile)
- [docker-compose.yml](../docker-compose.yml)
- [DEPLOY-FE.md](../DEPLOY-FE.md)
- [server/bootstrap.cjs](../server/bootstrap.cjs)

## Dampak perubahan
### Kecil
- tidak mengubah payload login inti
- tidak memutus flow auth lama bila endpoint IAM permission gagal
- tidak mengubah route utama aplikasi

### Sedang
- FE sekarang bisa mulai memanfaatkan permission backend yang nyata
- multi-role guard menjadi lebih benar untuk role gabungan
- action-level gating sudah mulai inline ke permission backend tanpa memutus role lama
- deploy bundle server sekarang bisa dibungkus rapi ke Docker

### Belum disentuh penuh
- gating aksi per tombol berbasis `permissions[]`
- migrasi transfer center ke provider-side connector path
- wiring adapter berdasarkan kontrak live final

## Checklist validasi
### Login & org source
- [x] governance organizations live di `8181` publik
- [x] login memprioritaskan governance langsung
- [x] wrapper public org turun jadi fallback

### RBAC
- [x] effective permission endpoint terdeteksi di live OpenAPI
- [x] FE login mencoba membaca effective permissions
- [x] auth bootstrap tidak crash bila endpoint permission gagal
- [x] multi-role route access tidak lagi terpaku pada primary role
- [x] beberapa action sensitif sudah pakai permission-aware gating

### Adapter / connector
- [x] participant adapters ada di main BE live
- [x] provider connector endpoints tambahan terdeteksi
- [ ] openapi adapter live tervalidasi penuh

### Deploy
- [x] wrapper tetap jalan tanpa ubah flow setup
- [x] port dan host runtime bisa diubah dari env
- [x] compose Docker disiapkan
- [x] config dir bisa dipersist sebagai volume

## Test case yang dijalankan
### Static / unit
- parse payload effective permissions dalam beberapa bentuk envelope
- de-duplicate permission list
- compare permission sets tanpa sensitif urutan
- multi-role route access union
- feature access gating untuk role fallback + permission live

### Build
- `npm run build`

### Catatan sisa
- endpoint adapter live perlu dipastikan ulang ketika service docs sudah terbuka
- action-level permission gating lain yang belum disentuh bisa dilanjutkan batch berikutnya bila scope ingin full permission-driven
