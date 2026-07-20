# Participant and Transfer Audit

Tanggal: 2026-06-21
Target FE: `dataspace-new`
Target BE: `8185`

## Ringkasan

Audit ini fokus ke 2 hal:

- binding participant yang menentukan provider benar-benar terhubung ke organisasi dan domain yang tepat
- flow transfer supaya operator tidak mentok kalau proses gagal atau macet

## Kondisi Saat Ini

### 1. Binding login provider

FE sekarang memakai urutan berikut saat login:

1. `participant_id` dari token jika ada
2. `participant_id` dari registration yang `APPROVED`
3. `participant_id` dari pilihan organisasi login
4. fallback name matching ke participant/provider list

Artinya:

- kondisi terbaik sudah lebih kuat dari sebelumnya
- tapi kalau data registrasi lama tidak punya `participant_id`, FE tetap harus fallback

## 2. Binding participant ke organization governance

Status binding dibaca di detail participant:

- `VERIFIED`: admin sudah simpan pilihan organisasi governance
- `INFERRED`: masih hasil cocok nama
- `MISSING`: belum ada sumber organisasi governance yang bisa dipastikan

Kalau masih `INFERRED` atau `MISSING`, domain provider bisa tidak terbaca stabil di flow provider.

## 3. Binding participant ke domain

Sumber domain provider saat ini adalah:

- `onboarding/participants/{id}/domains`

Bukan dari matriks dashboard.

Akibatnya:

- dashboard bisa menunjukkan coverage
- tapi wizard/provider settings tetap kosong kalau binding domain di onboarding belum ikut tercatat

## 4. Connection pool control plane

Sekarang dipisah ke modul admin:

- route: `/connection-pools`
- owner: `SUPER_ADMIN` / `ADMIN`

Field minimal yang dipakai transfer:

- `metadata.endpoint`
- `metadata.well_known_jwt_url`

Fallback legacy:

- `url_provider`
- `url_consumer`

## 5. Transfer flow

Transfer di FE saat ini:

1. cek dataset published
2. cek contract aktif
3. cek agreement
4. cek connection pool ready
5. `initiate`
6. `start direct` atau `start persistent`
7. polling status

## Perbaikan yang Sudah Dimasukkan

### Transfer

- retry untuk transfer `FAILED`
- `cek ulang` status untuk `INITIATED`, `PAUSED`, `TRANSFERRING`, `FAILED`
- `jalankan lagi` untuk transfer `INITIATED` dan `PAUSED`
- auto refresh status operasional
- refresh semua status sekali klik

### Participant audit

- detail participant sekarang menampilkan status connection pool control plane
- admin bisa langsung lihat:
  - governance binding
  - registration binding
  - operator user status
  - domain count
  - adapter count
  - connection pool readiness

## Yang Sudah Ada di BE dan Sudah Dipakai FE

- `GET /api/v1/onboarding/participants`
- `GET /api/v1/onboarding/participants/{id}`
- `GET /api/v1/onboarding/participants/{id}/domains`
- `POST /api/v1/onboarding/participants/{id}/domains`
- `GET /api/v1/onboarding/participants/{id}/adapters`
- `POST /api/v1/onboarding/participants/{id}/adapters`
- `GET /api/v1/onboarding/connection-pools`
- `POST /api/v1/onboarding/connection-pools`
- `PATCH /api/v1/onboarding/connection-pools/{id}`
- `DELETE /api/v1/onboarding/connection-pools/{id}`
- `POST /api/v1/connector/initiate`
- `GET /api/v1/connector/{transfer_process_id}/status`
- `GET /api/v1/connector/{domain_id}/transfers`
- `POST /api/v1/connector/transfers/direct/{transfer_process_id}/start`
- `POST /api/v1/connector/transfers/persistent/{transfer_process_id}/start`
- `GET /api/v1/connector/transfers/persistent/{transfer_process_id}/download`

## Gap yang Masih Tersisa

### Data gap

- participant lama belum tentu punya `organization governance` yang tersimpan eksplisit
- participant lama belum tentu punya domain onboarding walau dashboard sudah ada coverage
- participant lama belum tentu punya connection pool

### Backend / infra gap

- login ke API live masih bisa gagal karena CORS jika tidak lewat wrapper/proxy
- response login / user list belum selalu membawa binding participant secara eksplisit

### UX gap yang masih mungkin ditingkatkan

- transfer belum punya indikator timeout/stalled duration
- transfer belum punya bulk retry
- connection pool belum menampilkan health-check aktif ke endpoint/JWKS

## Checklist Audit Manual

### Participant

1. Buka `/participants`
2. Buka detail participant
3. Pastikan `Governance Organization` bukan `Missing`
4. Pastikan `Registration` bukan `Missing`
5. Pastikan `Operator User` aktif
6. Pastikan `Domain Operasional` terpasang
7. Pastikan `Dataplane Adapter` terpasang jika memang participant perlu adapter
8. Pastikan `Connection Pool Control Plane` status `Ready`

### Transfer

1. Buka `/transfers`
2. Pastikan baris domain sudah punya dataset
3. Pastikan contract aktif
4. Pastikan connection pool ready
5. Jalankan `Direct Stream` atau `Persistent Transfer`
6. Jika macet, pakai `Cek Ulang`
7. Jika `INITIATED` atau `PAUSED`, pakai `Jalankan Lagi`
8. Jika `FAILED`, pakai `Kirim Ulang`

## Kesimpulan

Secara FE, flow sekarang sudah lebih siap untuk dipakai operasional karena:

- binding participant lebih kuat
- audit participant lebih kelihatan
- connection pool dipisah sebagai concern admin
- transfer tidak lagi terasa sekali gagal lalu buntu

Titik paling rawan sekarang bukan lagi tombol FE, tapi kualitas data onboarding lama dan CORS/infrastruktur login live.
