# Blueprint Sinkronisasi FE Dataspace

Tanggal: 2026-07-06

## 1. Tujuan

Dokumen ini memetakan flow frontend yang sekarang dipakai di aplikasi dataspace, lalu menandai:

- relasi data yang sudah jelas
- relasi data yang masih berupa inferensi / fallback
- titik rawan data tidak sinkron
- perbaikan frontend yang aman dilakukan tanpa mengubah flow bisnis inti

Fokus utama dokumen ini adalah:

- onboarding KKKS
- setup / apply juknis
- binding organization / participant / domain
- policy / schema / vocabulary / terms
- dataset publishing
- contract / agreement / transfer

## 2. Kesimpulan Singkat

### 2.1 Yang sudah bagus

Mekanisme `apply juknis` secara konsep sudah benar.

Posisi `apply juknis` saat ini:

- dilakukan di level governance domain
- menjadi fondasi 5 domain kewajiban
- menyiapkan artifact awal:
  - dataset policy
  - contract policy
  - vocabulary
  - schema

Artinya, alur besarnya tidak perlu dibongkar.

### 2.2 Yang belum rapi

Masalah utama bukan di konsep `apply juknis`, tetapi di bagian sinkronisasi setelah itu:

- artifact governance sudah terbentuk, tapi belum selalu terbaca konsisten ke participant provider
- binding participant ke organization / domain masih bercampur antara data backend, fallback FE, dan local storage
- dataset, policy, level, domain, serta jalur transfer masih ada yang dibaca dari nama / tag / description, bukan dari relasi yang tegas

### 2.3 Arah pembenahan

Prioritas pembenahan FE:

1. perjelas source of truth per modul
2. hilangkan fallback yang terlalu liar
3. tampilkan status sinkronisasi secara eksplisit
4. jangan ubah urutan flow inti
5. kunci relasi penting di FE berdasarkan entity id, bukan nama

## 3. Peta Flow Besar

### 3.1 Setup Governance / Apply Juknis

Urutan sekarang:

1. pilih / buat governance organization
2. pilih / buat governance domain
3. atur 5 domain juknis
4. panggil apply juknis

Endpoint FE:

- `GET /governance/organizations/`
- `POST /governance/organizations/`
- `GET /governance/organizations/{orgId}/domains`
- `POST /governance/organizations/{orgId}/domains`
- `POST /policy-contract/{domainId}/apply-juknis`

Output bisnis:

- governance domain siap
- policy dasar tersedia
- schema / vocabulary tersedia
- domain punya baseline untuk onboarding provider

### 3.2 Registrasi KKKS

Urutan sekarang:

1. operator/provider isi form publik `/register-kkks`
2. data masuk registration queue
3. admin approve

Endpoint FE:

- `POST /onboarding/registrations`
- `GET /onboarding/registrations`
- `PATCH /onboarding/registrations/{id}`

### 3.3 Approval Registrasi

Urutan sekarang:

1. buat participant provider
2. resolve governance organization
3. bind participant ke domain organisasi
4. buat akun operator
5. terbitkan kewajiban kontrak otomatis
6. tandai registrasi `APPROVED`

Endpoint FE:

- `POST /onboarding/participants`
- `GET /governance/organizations/`
- `POST /governance/organizations/` bila belum ada
- `GET /governance/organizations/{orgId}/domains`
- `GET /onboarding/participants/{participantId}/domains`
- `POST /onboarding/participants/{participantId}/domains`
- `POST /identity-provider/users/`
- `GET /policy-contract/{domainId}/contracts`
- `POST /policy-contract/{domainId}/contracts`
- `PATCH /onboarding/registrations/{id}`

### 3.4 Provider Operasional

Urutan sekarang:

1. login
2. pilih organisasi
3. FE menentukan organization context
4. FE menentukan domain aktif
5. provider publish dataset / kelola adapter / transfer

Endpoint FE:

- `POST /identity-provider/auth/login`
- `POST /identity-provider/auth/validate`
- `GET /governance/organizations/`
- `GET /onboarding/participants/{participantId}/domains`

### 3.5 Publish Dataset

Urutan sekarang:

1. pilih domain
2. pilih schema
3. isi endpoint atau pilih dari adapter
4. publish dataset

Endpoint FE:

- `GET /data-catalog/{domainId}/schemas`
- `GET /data-catalog/{domainId}/vocabularies`
- `GET /data-catalog/{domainId}/datasets`
- `POST /data-catalog/{domainId}/datasets`

### 3.6 Transfer Data

Urutan sekarang:

1. cek kontrak aktif
2. cek agreement aktif
3. tautkan dataset ke kontrak
4. cek connection pool
5. initiate transfer
6. start direct / persistent
7. cek status / download

Endpoint FE:

- `GET /policy-contract/{domainId}/contracts`
- `GET /policy-contract/{domainId}/contracts/{id}`
- `PATCH /policy-contract/{domainId}/contracts/{id}`
- `GET /policy-contract/{domainId}/agreements`
- `POST /policy-contract/{domainId}/agreements`
- `PATCH /policy-contract/{domainId}/agreements/{id}`
- `GET /onboarding/connection-pools`
- `POST /connector/consumer/initiate`
- `POST /connector/consumer/direct/{transferId}/start`
- `POST /connector/consumer/persistent/{transferId}/start`
- `GET /connector/{transferId}/status`
- `GET /connector/{domainId}/transfers`
- `GET /connector/consumer/persistent/{transferId}/download`

## 4. Entity Map

### 4.1 Entity inti

- Governance Organization
- Governance Domain
- Registration
- Participant
- User Operator
- Dataset Policy
- Contract Policy
- Vocabulary
- Schema
- Dataset
- Contract
- Agreement
- Connection Pool
- Adapter
- Transfer

### 4.2 Relasi ideal

Relasi yang seharusnya dianggap source of truth:

- `Organization -> Domain`
- `Participant -> Domain Binding`
- `Participant -> Adapter`
- `Participant -> Connection Pool`
- `Domain -> Dataset Policy`
- `Domain -> Vocabulary`
- `Domain -> Schema`
- `Participant -> Dataset`
- `Contract -> Dataset`
- `Contract -> Agreement`
- `Transfer -> Agreement + Dataset + Domain`

### 4.3 Relasi yang masih semi-inferensi di FE

- `Registration -> Governance Organization`
  - kadang dari `note`
  - kadang dari nama organisasi

- `Policy -> Domain`
  - masih diambil dari `policy_name`

- `Policy -> Level`
  - masih dari `rules` atau regex nama

- `Dataset -> Domain`
  - masih dibaca dari `endpoint_metadata.tags[0]`

- `Dataset -> Level`
  - masih dibaca dari `description`

- `Provider session -> active organization`
  - masih mengandalkan `localStorage` dan preferred organization

## 5. Titik Rawan Sinkronisasi

### 5.1 Setelah apply juknis

Artifact governance sudah ada, tetapi provider belum otomatis punya konteks yang solid sampai:

- participant dibentuk
- participant di-bind ke domain
- domain aktif FE mengarah ke domain yang sama

Risiko:

- schema / vocabulary ada, tapi provider tidak melihatnya
- dashboard menunjukkan domain, tetapi settings / adapter wizard kosong

### 5.2 Approval registrasi

Auto obligation contract sekarang bergantung pada:

- hasil resolve governance organization
- domain organisasi yang tersedia saat approval
- nama kontrak sebagai duplicate guard

Risiko:

- jika org salah resolve, kontrak kewajiban terbit ke domain yang salah
- jika nama kontrak berubah pola, duplicate check gagal

### 5.3 Login dan context organization

Pilihan organisasi di depan login belum sepenuhnya menjadi binding yang keras ke participant context.

Risiko:

- user pilih organisasi A, tapi domain / participant context kebaca B
- superadmin dan provider bisa terlihat seperti “bypass” context bila fallback menang

### 5.4 Dataset publishing

Schema dipilih dari domain aktif, tetapi validasi korelasi schema-domain-dataset belum keras.

Risiko:

- schema domain lain tetap bisa dipakai
- dataset publish sukses, tapi domain logic kacau

### 5.5 Transfer

Transfer center sekarang mengambil dataset policy pertama di domain.

Risiko:

- kontrak bisa tertaut ke policy yang bukan milik dataset yang dipilih
- status readiness terlihat benar, tapi payload bisnis salah

### 5.6 Connection pool

Readiness transfer ditentukan dari metadata pool:

- `endpoint`
- `well_known_jwt_url`

Risiko:

- pool ada tetapi shape metadata belum sesuai
- FE bilang belum siap padahal user merasa sudah isi

## 6. Source of Truth yang Harus Dipasang di FE

### 6.1 Jangan pakai nama sebagai relasi utama

Nama hanya boleh jadi fallback visual, bukan pengikat logika.

Yang harus diutamakan:

- `organization_id`
- `domain_id`
- `participant_id`
- `schema_id`
- `vocabulary_id`
- `policy_id`
- `dataset_id`
- `contract_id`
- `agreement_id`

### 6.2 Domain aktif harus dibaca dari binding participant bila role provider

Aturan FE yang lebih aman:

- untuk `PROVIDER`, domain aktif utama = domain yang memang terikat ke participant
- governance organization hanya pelengkap / parent context
- fallback ke organization domain hanya jika binding participant benar-benar belum tersedia
- fallback harus ditandai jelas di UI

### 6.3 Policy tidak boleh dipilih dari list pertama

Transfer harus punya aturan FE:

- cari dataset policy yang benar-benar cocok untuk dataset / domain / klasifikasi
- jika tidak ada relasi yang tegas dari BE, tampilkan warning “policy belum terpetakan”
- jangan auto-link pakai item pertama

## 7. Perbaikan FE yang Disarankan

### 7.1 Batch 1 — aman, tanpa ubah flow inti

1. Tambahkan panel status sinkronisasi di halaman:
   - Participant Detail
   - Settings Provider
   - Transfer Center

   Isi status:
   - organization governance aktif
   - participant id aktif
   - domain binding aktif
   - schema tersedia
   - vocabulary tersedia
   - policy tersedia
   - connection pool siap / belum

2. Tampilkan source-of-truth badge:
   - `binding participant`
   - `fallback governance`
   - `fallback local session`

3. Saat provider buka halaman dataset / schema / vocabulary:
   - tampilkan domain aktif yang sedang dipakai
   - tampilkan kenapa daftar kosong

4. Di transfer center:
   - hentikan pakai dataset-policy pertama secara diam-diam
   - tampilkan peringatan bila belum ada policy mapping yang jelas

5. Di registration approval:
   - tampilkan org governance hasil resolve sebelum approve final
   - tampilkan domain-domain yang akan dipasang ke participant

### 7.2 Batch 2 — perbaikan korelasi FE

1. Simpan hasil resolve organization binding yang lebih eksplisit di FE session state
2. Buat util tunggal:
   - `resolveActiveOrganizationContext()`
   - `resolveActiveParticipantDomains()`
   - `resolveDatasetPolicyForDataset()`
3. Kurangi regex / inferensi nama di lebih banyak tempat

### 7.3 Batch 3 — butuh dukungan BE agar benar-benar kuat

1. endpoint yang mengembalikan:
   - participant detail + governance organization + domains sekaligus
2. dataset detail yang mengembalikan:
   - `policy_id`
   - `schema_id`
   - `domain_id`
   - `classification_level`
3. policy list yang mengembalikan domain / level eksplisit
4. approval registration endpoint yang mengorkestrasi semua langkah di BE

## 8. Penilaian Flow Apply Juknis

### 8.1 Apakah flow apply juknis sudah benar?

Ya, flow apply juknis sudah benar sebagai fondasi.

Yang sudah tepat:

- diletakkan di awal instance setup
- fokus di governance domain
- menghasilkan baseline artifact untuk 5 domain
- bisa dipakai sebagai syarat onboarding provider setelahnya

### 8.2 Yang perlu disesuaikan

Bukan flow-nya yang diubah, tapi koneksi setelah flow itu:

- hasil juknis harus lebih jelas “turun” ke participant provider
- FE harus menunjukkan bahwa provider sedang memakai domain hasil juknis yang mana
- contract / dataset / policy harus memakai korelasi explicit

### 8.3 Rekomendasi akhir

Pertahankan urutan:

1. setup governance
2. apply juknis
3. registrasi / approve participant
4. bind domain participant
5. publish dataset
6. contract / agreement
7. transfer

Yang dibenahi adalah lapisan sinkronisasi antar langkah.

## 9. Format Dokumentasi yang Disarankan

Supaya enak dipakai untuk FSD / TRD / audit, dokumen dibagi 3 lapis:

### 9.1 Dokumen bisnis

Isi:

- tujuan flow
- aktor
- langkah besar
- output tiap fase
- aturan bisnis per fase

Nama yang cocok:

- `BUSINESS_FLOW_DATASPACE.md`

### 9.2 Dokumen teknis relasi

Isi:

- entity map
- endpoint map
- source of truth
- sync risks
- fallback logic

Nama yang cocok:

- `FE_SYNC_BLUEPRINT_2026-07-06.md`

### 9.3 Dokumen gap / defect

Isi:

- temuan
- dampak
- prioritas
- usulan FE
- butuh BE atau tidak

Nama yang cocok:

- `FE_BE_SYNC_GAP_REGISTER.md`

## 10. Ringkasan Eksekutif

Kalau dibaca cepat:

- `apply juknis` sudah benar dan jangan dibongkar
- masalah utama ada di binding dan sinkronisasi sesudahnya
- FE saat ini masih terlalu sering menebak relasi dari nama / tag / description
- transfer dan dataset-policy mapping adalah titik paling rawan
- pembenahan terbaik adalah mempertegas source of truth di FE sambil menunggu beberapa relasi eksplisit dari BE
