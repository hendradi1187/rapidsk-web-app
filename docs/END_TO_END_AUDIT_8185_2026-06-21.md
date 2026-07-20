# End-to-End Audit 8185

Tanggal audit: 2026-06-21
Target FE: `dataspace-new`
Target BE live: `http://45.158.126.171:8185`

## Ringkasan

- Menu admin dan provider sudah terpisah di sidebar utama.
- `Connection Pool` sekarang diperlakukan sebagai modul admin/control-plane.
- Provider flow tetap fokus ke:
  - login dan pilih organisasi
  - binding participant
  - domain participant
  - adapter/provider process
  - publish dataset
  - transfer data
- Gap utama yang masih harus dijaga:
  - binding `participant -> organization -> domain` belum selalu lengkap di data onboarding
  - login ke `8185` masih bisa kena CORS jika FE tidak lewat wrapper/proxy
  - coverage dashboard bisa ada, tapi provider wizard tetap kosong kalau domain onboarding belum tertaut

## Pemilik Konfigurasi

### Admin

- Setup organisasi governance
- Setup domain governance
- Approve registration KKKS
- Verifikasi participant detail
- Sinkron domain governance ke participant
- Setup `Connection Pool`
- Monitoring transfer readiness lintas participant

### Provider

- Login dengan organisasi yang dipilih
- Kelola adapter participant miliknya
- Jalankan wizard proses data/adaptor
- Publish dataset
- Mulai transfer sesuai kontrak/agreement yang aktif

## Flow End-to-End

### 1. Registrasi dan binding awal

1. KKKS daftar lewat `/register-kkks`
2. Admin approve di `/participants`
3. FE membuat:
   - participant
   - user operator
   - status registration `APPROVED`
4. FE sekarang membaca `participant_id` dari registration yang sudah approved saat login provider, supaya binding tidak hanya mengandalkan nama organisasi

Endpoint:

- `GET /api/v1/onboarding/registrations`
- `PATCH /api/v1/onboarding/registrations/{id}`
- `POST /api/v1/onboarding/participants`
- `POST /api/v1/identity-provider/users`

### 2. Governance organization dan domain

1. Admin buka `/participants/{id}`
2. Pilih governance organization yang benar
3. Sinkronkan domain organisasi ke participant
4. Setelah ini provider baru akan melihat domain aktif dengan stabil

Endpoint:

- `GET /api/v1/governance/organizations/`
- `GET /api/v1/governance/organizations/{orgId}/domains`
- `GET /api/v1/onboarding/participants/{id}/domains`
- `POST /api/v1/onboarding/participants/{id}/domains`
- `PATCH /api/v1/onboarding/participants/{id}/domains/{domainLinkId}`
- `DELETE /api/v1/onboarding/participants/{id}/domains/{domainLinkId}`

### 3. Connection Pool control plane

1. Admin buka `/connection-pools`
2. Pilih participant
3. Isi:
   - `endpoint`
   - `well_known_jwt_url`
   - token
   - type
4. Transfer center membaca registry ini sebagai prasyarat control-plane

Endpoint:

- `GET /api/v1/onboarding/connection-pools`
- `POST /api/v1/onboarding/connection-pools`
- `PATCH /api/v1/onboarding/connection-pools/{id}`
- `DELETE /api/v1/onboarding/connection-pools/{id}`

Catatan:

- Ini bukan area provider biasa.
- Ini admin-owned karena mempengaruhi konektivitas antar participant.

### 4. Adapter / proses data provider

1. Provider login
2. Provider masuk `Settings -> Proses Data`
3. Provider pilih domain participant yang sudah terpasang
4. Provider daftar adapter/jalur data bila perlu
5. Provider jalankan validasi/publish sesuai jalur adapter

Catatan:

- Kalau domain provider kosong di wizard, cek lagi binding domain onboarding di detail participant.
- Dashboard coverage tidak cukup untuk membuat wizard provider otomatis siap.

### 5. Dataset catalog

1. Provider/Admin lihat dataset di `/datasets`
2. FE sekarang mendukung:
   - view
   - edit
   - delete
   - publish

Endpoint:

- `GET /api/v1/data-catalog/{domain_id}/datasets`
- `GET /api/v1/data-catalog/{domain_id}/datasets/{id}`
- `PATCH /api/v1/data-catalog/{domain_id}/datasets/{id}`
- `DELETE /api/v1/data-catalog/{domain_id}/datasets/{id}`

### 6. Transfer data

Prasyarat:

- participant binding valid
- domain participant valid
- agreement/contract aktif
- connection pool valid
- endpoint dataset tersedia

Endpoint:

- `POST /api/v1/connector/initiate`
- `GET /api/v1/connector/{transfer_process_id}/status`
- `GET /api/v1/connector/{domain_id}/transfers`
- `POST /api/v1/connector/transfers/direct/{transfer_process_id}/start`
- `POST /api/v1/connector/transfers/persistent/{transfer_process_id}/start`
- `GET /api/v1/connector/transfers/persistent/{transfer_process_id}/download`

## Temuan Penting

### Sudah inline ke FE

- Resolver login provider ke `participant_id` dari approved registration
- CRUD dataset sesuai endpoint live
- Detail participant untuk domain dan adapter
- Modul admin khusus `Connection Pools`

### Masih perlu intervensi admin/data

- Participant yang sudah ada tetapi belum punya governance organization source
- Participant yang sudah punya coverage dashboard tapi belum punya domain onboarding
- Participant yang belum punya connection pool

### Masih perlu intervensi BE/infrastruktur

- CORS login jika FE tidak lewat wrapper/proxy
- Bila token/login response tidak membawa `participant_id`, FE masih perlu fallback dari registration/provider lookup

## Checklist audit cepat besok

1. Login provider pilih organisasi
2. Cek `participant_id` tersimpan
3. Masuk `Settings -> Proses Data`
4. Pastikan domain muncul
5. Bila kosong, buka admin `/participants/{id}` lalu sinkronkan domain
6. Buka admin `/connection-pools`, pastikan endpoint dan `well_known_jwt_url` ada
7. Cek `/datasets` bisa edit/delete
8. Cek `/transfers` readiness tidak lagi gagal karena metadata pool kosong
