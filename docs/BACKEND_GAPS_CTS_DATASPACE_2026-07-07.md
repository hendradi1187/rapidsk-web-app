# Backend Gaps — CTS Dataspace (perspektif Frontend)

**Tanggal:** 2026-07-07
**Sumber verifikasi:** OpenAPI live `http://100.66.10.14:8181/openapi.json` (control plane / identity / catalog / policy / connector) dan `http://100.66.10.14:8182/openapi.json` (adapter). Semua klaim di bawah dicek langsung ke spec live + probe endpoint, bukan asumsi.
**Konteks:** Daftar hal yang **backend belum sediakan / belum konsisten**, sehingga FE tidak bisa menyelesaikan fitur tertentu sampai BE menambah/mengubah kontrak. Setiap gap punya: endpoint, perilaku sekarang (bukti), dampak, dan usulan perbaikan BE.

**Legenda severity:**
`P1` = memblok fungsi/menyesatkan user · `P2` = bikin fitur setengah jadi / workaround jelek · `P3` = kosmetik/kerapian kontrak.

**Legenda jenis:** `BE-BUG` = server error/behavior salah · `BE-GAP` = kapabilitas belum ada · `DATA` = data tidak konsisten · `KONTRAK` = penamaan/skema.
**Legenda status:** 🔴 `OPEN` butuh BE · 🟡 `FE-MITIGATED` FE sudah akali tapi akar di BE · 🟢 `FE-DONE` selesai penuh di FE.

---

## 🚨 BLOCKER (P1 — menghambat alur inti, wajib BE)

Ini yang **memblok fitur bekerja** dan tidak bisa dituntaskan FE:

| ID | Blocker | Yang terhambat | request_id contoh |
|----|---------|----------------|-------------------|
| **B5** | Grant permission ke group `e949d143` **selalu 500 DATABASE_ERROR** | **Matrix akses group ADMIN tak bisa diubah sama sekali** — RBAC tak bisa dikelola | `1aac9418…`, `5f4b530b…` |
| **C2** | `DELETE participants/{id}/domains/{id}` → **500 UNEXPECTED_ERROR** | **Lepas domain dari participant gagal** | `8398ae75…` |
| **B3** | `GET /iam/users/{id}/effective-permissions` → **404** (ada di spec, tak diimplementasi) | Audit izin efektif per-user (fitur FE terpaksa dihapus) | — |
| **A2** | Tak ada `is_active` di PATCH user & tak ada endpoint activate/deactivate | **Tak bisa aktif/nonaktifkan user** (mis. karyawan keluar) | — |
| **A5** | Org binding user tak eksplisit (`organization_id` tak ada di token/participant) + `GET /users` tanpa participant | Validasi org saat login untuk akun terbatas; sempat bikin **bypass login lintas org** | — |
| **A1** | `GET /users` tak mengembalikan `participant_id` | Tampilan tautan participant di Directory User | — |

> **Catatan gabungan A1+A5+B4:** RBAC & scoping FE rapuh karena BE **tidak menyediakan identitas/otorisasi yang bisa dipercaya ke token user** (org, participant, permission granular). Ini akar dari beberapa gejala berbeda.

---

## Ringkasan (semua temuan)

| ID | Area | Judul | Sev | Jenis | Status |
|----|------|-------|-----|-------|--------|
| A1 | Identity/User | `GET /users` tak mengembalikan `participant_id` | P1 | BE-GAP | 🔴 OPEN |
| A2 | Identity/User | Tak ada aktif/nonaktifkan user | P1 | BE-GAP | 🔴 OPEN |
| A3 | Identity/User | `PATCH /users/{id}` tak menerima `participant_id` (tak bisa re-bind) | P2 | BE-GAP | 🔴 OPEN |
| A4 | Identity/User | Category & Group **read-only** | P2 | BE-GAP | 🔴 OPEN |
| A5 | Identity/Auth | Org binding user tak eksplisit → FE menebak org (pernah bikin bypass) | P1 | BE-GAP + DATA | 🟡 FE-MITIGATED |
| B1 | IAM | `me/effective-permissions` wajib `?application` (tak ada mode "semua") | P2 | BE-GAP | 🟡 FE-MITIGATED |
| B2 | IAM | `policy-bundle` wajib `?application` | P3 | BE-GAP | 🟢 FE-DONE |
| B3 | IAM | `GET /iam/users/{id}/effective-permissions` → 404 (tak diimplementasi) | P1 | BE-BUG | 🔴 OPEN (fitur FE dihapus) |
| B4 | IAM | Kode permission tak selaras dgn slug menu FE | P2 | KONTRAK | 🔴 OPEN |
| B5 | IAM | Grant ke group `e949d143` selalu **500 DATABASE_ERROR** | P1 | BE-BUG | 🔴 OPEN |
| C1 | Connector | JWKS pool tak divalidasi ulang saat runtime transfer | P2 | BE-GAP | 🔴 OPEN |
| C2 | Onboarding | `DELETE participant domain` → **500 UNEXPECTED_ERROR** | P1 | BE-BUG | 🔴 OPEN |
| D1 | Policy | Typo field `data_clasification` | P3 | KONTRAK | 🔴 OPEN |
| D2 | Onboarding | `MonitoringCompliance` schema kosong (free-form) | P3 | KONTRAK | 🔴 OPEN |

**Rekap:** 6 blocker P1 · 5 P2 · 3 P3. Jenis: 3 BE-BUG (B3, B5, C2) · 7 BE-GAP · 3 KONTRAK · 1 DATA (menyertai A5).

---

## A. Identity / Manajemen User

### A1 — `GET /users` (dan `GET /users/{id}`) tidak mengembalikan `participant_id` — **P1**

- **Endpoint:** `GET /api/v1/identity-provider/users/`, `GET /api/v1/identity-provider/users/{id}`
- **Schema respons (`UserResponse`) — field aktual:**
  `id, username, email, full_name, category, group, is_active, is_verified, created_at, updated_at`
- **Bukti:** field `participant_id` **tidak ada** di `UserResponse` (dicek di spec + GET live user nyata → `participant_id` undefined).
- **Ironi kontrak:** `UserCreateRequest` **punya** `participant_id` (bisa di-set saat create), tapi tidak pernah bisa dibaca kembali.
- **Dampak FE:** Directory User tidak bisa menampilkan user tertaut participant mana. Kolom "Participant" terpaksa disembunyikan; sebelumnya menampilkan "Tidak tertaut participant" yang **menyesatkan** (seolah tahu user tak tertaut, padahal API-nya yang tak mengembalikan).
- **Usulan BE:** Tambahkan `participant_id` (dan idealnya `participant_name`) ke `UserResponse` pada list & detail.

### A2 — Tidak ada mekanisme aktif/nonaktifkan user — **P1**

- **Endpoint terkait:** `PATCH /api/v1/identity-provider/users/{id}`
- **Schema body (`UserUpdateRequest`) — field aktual:**
  `username, email, full_name, password, category_id, group_id`
- **Bukti:** field `is_active` **tidak ada** di `UserUpdateRequest`. Scan seluruh path: **tidak ada** endpoint `activate` / `deactivate` / `enable` / `disable` untuk user.
- **Perilaku sekarang:** status "aktif" **hanya** berubah lewat siklus konfirmasi email:
  `POST /users` → INVITED → user klik email `confirm-email` (set password) → ACTIVE.
- **Dampak FE:** Admin **tidak bisa** menonaktifkan user (mis. karyawan keluar) atau memaksa aktif. Satu-satunya lever: `resend-email-confirmation` atau `DELETE`. Banyak akun tersangkut di status INVITED tanpa cara admin menuntaskan selain hapus.
- **Usulan BE (pilih salah satu):**
  1. Tambahkan `is_active` ke `UserUpdateRequest` (PATCH bisa set aktif/nonaktif), **atau**
  2. Sediakan endpoint eksplisit `POST /users/{id}/activate` & `POST /users/{id}/deactivate`.

### A3 — `PATCH /users/{id}` tidak menerima `participant_id` — **P2**

- **Endpoint:** `PATCH /api/v1/identity-provider/users/{id}` (`UserUpdateRequest`)
- **Bukti:** `participant_id` **tidak ada** di `UserUpdateRequest` (ada di `UserCreateRequest` saja).
- **Dampak FE:** Ikatan user↔participant **hanya bisa ditetapkan saat pembuatan**. Kalau salah pilih participant atau perlu pindah, tidak bisa diperbaiki lewat edit — harus hapus & buat ulang user.
- **Usulan BE:** Tambahkan `participant_id` (nullable) ke `UserUpdateRequest`.

### A4 — Category & Group user bersifat read-only — **P2**

- **Endpoint & method aktual:**
  - `GET /api/v1/identity-provider/user/categories/` — **GET saja**
  - `GET /api/v1/identity-provider/user/categories/{id}` — **GET saja**
  - `GET /api/v1/identity-provider/user/groups/` — **GET saja**
  - `GET /api/v1/identity-provider/user/groups/{id}` — **GET saja**
- **Bukti:** tidak ada `POST/PATCH/DELETE` untuk categories maupun groups.
- **Dampak FE:** Admin tak bisa membuat/mengubah/menghapus kategori & group dari UI — hanya bisa melihat. Master data ini di-seed di luar (kemungkinan Keycloak / migrasi).
- **Usulan BE:** Kalau memang perlu dikelola dari aplikasi, ekspos `POST/PATCH/DELETE /user/categories` & `/user/groups`. Kalau memang sengaja fixed, cukup dikonfirmasi supaya FE tidak dianggap kurang.

### A5 — Ikatan user↔organisasi tidak eksplisit → FE menebak org (pernah bikin bypass login) — **P1**

- **Konteks:** Token login (`POST /auth/login`) memuat `category`, `group`, `participant_id`, `is_superadmin` — **tapi tidak ada `organization_id`/`organization_name`**. Endpoint participant juga tidak memetakan participant→organization secara langsung, dan `GET /users` tak mengembalikan participant (lihat A1).
- **Dampak:** Untuk memvalidasi "akun ini boleh login sebagai org mana", FE terpaksa **menebak** lewat pencocokan nama (participant name ≈ organization name) dan overlap domain. Ini rapuh:
  - Contoh nyata: akun `tebire5508@fixscal.com` (role ADMIN, participant `cd06c4e6…`, **tanpa domain**) **bisa login memilih org lain** (mis. PHR) padahal seharusnya terbatas ke PHE. Penyebab: saat participant tak punya domain, resolver governance FE jatuh ke fallback yang mengembalikan **org pilihan user sendiri** sebagai "organisasi terikat" → validasi jadi sirkular. **Sudah diperbaiki di FE** (org hasil fallback pilihan sendiri tidak lagi dipercaya; trust hanya dari overlap domain / nama participant).
  - Tapi selama binding tidak eksplisit dari BE, pencocokan-by-nama tetap fragile (mis. "Pertamina Hulu Energi (PHE)" ≠ "PHE").
- **Usulan BE:**
  1. Sertakan `organization_id` (dan `organization_name`) **di token login** untuk akun non-super-admin, **atau**
  2. Sediakan endpoint tegas `GET /participants/{id}` / `GET /users/{id}` yang mengembalikan `organization_id` sehingga FE tak perlu menebak.
- **Catatan:** Pengamatan tambahan — `GET /governance/organizations/{orgId}/domains` mengembalikan **kumpulan domain yang sama untuk semua org** saat diakses token super-admin (domain seolah tidak ter-scope per-org). Ini memperparah ambiguitas binding berbasis domain dan perlu dipastikan benar di BE.

---

## B. IAM / Otorisasi

### B1 — `me/effective-permissions` wajib `?application`; tak ada mode "semua aplikasi" — **P2**

- **Endpoint & parameter aktual:** `GET /api/v1/identity-provider/iam/me/effective-permissions` → `application*(query)` **wajib**.
- **Bukti:** tanpa `application` → **HTTP 422** `"Field required: application"`. Dengan `?application=CONNECTOR` → **200** berisi `{permissions:[{code,...}]}` (diprobe live).
- **Dampak FE:** Sebelumnya `getMyEffectivePermissions()` dipanggil tanpa `application` → selalu 422 → `[]` → gating berbasis izin tak pernah dapat data (jatuh ke role). **Sudah diakali FE:** sekarang FE fan-out memanggil per aplikasi platform (`CONNECTOR`, `CTS`, `OGC_ADAPTER`) lalu digabung. Rapuh kalau BE menambah aplikasi baru (harus update daftar di FE).
- **Usulan BE:** Sediakan mode agregat — `application` opsional (kalau kosong = semua), **atau** endpoint `.../effective-permissions/all` → `{application: string[]}`.

### B3 — `GET /iam/users/{id}/effective-permissions` ada di spec tapi 404 di runtime — **P1**

- **Endpoint:** `GET /api/v1/identity-provider/iam/users/{user_id}/effective-permissions`
- **Bukti:** terdaftar di OpenAPI (dengan param `user_id*`, `application*`), tetapi probe live mengembalikan **HTTP 404** `"ResourceNotFound: The requested URL ... does not exist"`. Jadi endpoint ini **belum diimplementasi** meski ada di kontrak.
- **Dampak FE:** Fitur "Lihat Permission per user" mustahil dibuat → sudah **dihapus** dari FE karena selalu error. Admin tidak bisa mengaudit izin efektif user lain.
- **Usulan BE:** Implementasikan endpoint sesuai kontrak, atau hapus dari OpenAPI agar tidak menyesatkan.

### B5 — Grant permission ke group tertentu selalu 500 DATABASE_ERROR — **P1**

- **Endpoint:** `POST /api/v1/identity-provider/iam/groups/{group_id}/permissions`
- **Bukti (diprobe live, terkontrol + cleanup):** untuk group `e949d143-4265-4177-be28-2a77a80242cb` (group `ADMIN`), **setiap** grant permission gagal:
  ```
  code: DATABASE_ERROR | detail: DatabaseError
  message: A database error occurred while processing the request.
  method: POST | path: .../groups/e949d143-4265-4177-be28-2a77a80242cb/permissions
  ```
  Dicoba **4 permission berbeda**, **dengan** constraints `{domains:["*"],classifications:["*"],participant_scope:"ALL"}` maupun **tanpa** field constraints → semuanya **500**. Bandingkan: group lain (`2e656d84…`) grant-nya berjalan normal sampai level cek unik (409). Jadi masalahnya **spesifik pada group ini di level database**, bukan payload FE.
- **Dampak:** Matrix akses untuk group tsb tidak bisa diubah sama sekali — user melapor "matrix nggak update".
- **Dugaan:** Integritas data group `e949d143` bermasalah (mis. FK/trigger/kolom generated/versi permission), atau baris group korup. Perlu ditelusuri BE dengan `request_id`.
- **Usulan BE:** Investigasi row group `e949d143` + tabel group-permissions; kembalikan error yang benar (bukan 500 generic) bila memang ada constraint bisnis; perbaiki data yang korup.

### B4 — Kode permission efektif tidak selaras dengan slug izin yang dicek FE — **P2**

- **Bukti:** Respons `me/effective-permissions` berisi kode auto-generate seperti `connector.get.connector.consumer.persistent.transfer_process...` (mengikuti method+path endpoint). Sementara gating FE (sidebar & route) memeriksa slug bisnis seperti `connector.monitoring.read`, `data-catalog.manage`, `audit.read`.
- **Dampak FE:** Klausa gating berbasis permission (`hasPermission(...)`) praktis **tak pernah match**, sehingga penyembunyian modul efektif hanya berjalan lewat **role**, bukan izin granular.
- **Usulan BE:** Sepakati skema penamaan permission bisnis yang stabil (mis. `<app>.<resource>.<action>`) dan konsisten dengan yang dipakai FE, atau sediakan mapping resmi permission→fitur.

### B2 — `policy-bundle` wajib `?application` — **P3**

- **Endpoint:** `GET /api/v1/identity-provider/iam/policy-bundle` → `application*(query)` **wajib** (422 tanpa itu).
- **Dampak FE:** Viewer bundle harus per-aplikasi (sudah diakomodasi: tombol per aplikasi). Bukan blocker, tapi tak ada mode "semua bundle".
- **Usulan BE:** Opsional — sediakan listing bundle lintas aplikasi bila diperlukan halaman ringkasan.

---

## C. Connector / Transfer

### C1 — JWKS connection pool tidak divalidasi ulang saat runtime transfer — **P2**

- **Konteks:** Kesiapan transfer di FE (`isPoolReady` di `src/lib/connection-pool.ts`) **hanya** mengecek keberadaan dua field metadata: `endpoint` dan `well_known_jwt_url`. Tidak ada fetch/validasi bahwa JWKS-nya benar-benar bisa dijangkau & valid saat transfer dimulai.
- **Yang sudah ada:** validasi JWKS **server-side** saat simpan pool via `POST /admin/connection-pool/inspect` (save diblok kalau gagal). Jadi validasi terjadi **saat registrasi**, bukan **saat transfer**.
- **Dampak:** Pool bisa tampak "ready" di TransferCenter padahal JWKS remote sudah berubah/invalid sejak terakhir di-inspect → transfer bisa gagal di tengah dengan error auth yang kurang jelas.
- **Usulan BE:** Sediakan endpoint ringan untuk **re-validate kesiapan pool saat runtime** (mis. `GET /connector/connection-pool/{id}/readiness` yang benar-benar fetch JWKS + cek endpoint), supaya FE bisa cek sesaat sebelum transfer tanpa harus lewat jalur admin-inspect. (Fetch JWKS URL arbitrer langsung dari browser tidak reliabel karena CORS.)

### C2 — `DELETE participant domain` → 500 UNEXPECTED_ERROR — **P1**

- **Endpoint:** `DELETE /api/v1/onboarding/participants/{participant_id}/domains/{id}`
- **Bukti (dari user, request nyata):**
  ```
  code: UNEXPECTED_ERROR | detail: UnexpectedError
  message: The request could not be completed. Please contact the administrator with the request_id.
  request_id: 8398ae75-53fa-4681-8d21-bd5103d1930f
  method: DELETE
  path: /api/v1/onboarding/participants/10c6f4e7-ba98-43cd-91c1-ef2d249e6047/domains/8ea1636b-e107-434a-b0e1-3851d363868d
  ```
- **Analisis:** Ini **500 di sisi backend** (bukan validasi/izin) — kemungkinan besar domain masih direferensikan objek lain (dataset/kontrak/adapter) sehingga penghapusan gagal di level DB dan tidak ditangani rapi. FE tidak bisa memperbaiki 500.
- **Dampak FE:** Admin tak bisa melepas domain dari participant; error yang muncul tidak informatif ("contact administrator").
- **Usulan BE:** Tangani kasus ini dengan benar — kalau ada dependency, kembalikan **409 Conflict** dengan pesan jelas (objek apa yang menghalangi); kalau memang boleh dihapus, pastikan cascade/urutan delete benar. Sertakan `request_id` di log agar bisa ditelusuri.

> Catatan: sebagian besar temuan transfer lain dari audit awal (URL download persistent, mode "Unknown" setelah refresh, PAUSED terblok, resume tanpa `resume_from_byte`, polling 30 dtk false-alarm, KPI hardcode `/5`, adapter heuristik URL) **sudah diperbaiki di sisi FE** dan **bukan** gap backend.

---

## D. Kerapian Kontrak (kosmetik tapi nyata)

### D1 — Typo nama field: `data_clasification` — **P3**

- **Schema:** `ContractPolicyCreateRequest` (dan `Update`) — field bernama **`data_clasification`** (kurang huruf `s`, seharusnya `data_classification`).
- **Endpoint:** `POST/PATCH /api/v1/policy-contract/{domain_id}/contract-policies`
- **Dampak:** FE terpaksa mengikuti ejaan salah supaya request diterima; berisiko membingungkan integrasi lain & rawan salah ketik.
- **Usulan BE:** Rename ke `data_classification` (dengan masa transisi menerima dua-duanya kalau perlu backward-compat).

### D2 — `MonitoringCompliance` schema kosong / free-form — **P3**

- **Schema:** `MonitoringCompliance` = objek **tanpa properti** (free-form). Dipakai sebagai item array `compliance` pada `MonitoringCreateRequest` (`POST /onboarding/{domain_id}/monitorings`).
- **Dampak:** FE tak tahu bentuk data kepatuhan yang diharapkan; sekarang dikirim array kosong `[]` sebagai default aman. Tidak ada validasi kontrak.
- **Usulan BE:** Definisikan struktur `MonitoringCompliance` (mis. `control_id`, `threshold`, `action`) agar FE bisa membuat form yang benar.

---

## Urutan perbaikan yang disarankan (BE)

1. **B5** — grant permission group `e949d143` 500 (RBAC group ADMIN mati total). Paling menghambat.
2. **C2** — DELETE domain participant 500. Kelola domain mati.
3. **A5 + A1** — taruh `organization_id` & `participant_id` di token/response user. Ini akar RBAC & scoping login yang rapuh.
4. **B3** — implementasi (atau hapus dari spec) `GET /iam/users/{id}/effective-permissions`.
5. **A2** — endpoint/flag aktif-nonaktif user.
6. **B4** — sepakati skema penamaan permission yang selaras dgn fitur (biar sidebar bisa 100% permission-driven).
7. **A3, A4, B1, C1** — kelengkapan kapabilitas.
8. **B2, D1, D2** — kerapian kontrak.

## Sudah diselesaikan / dimitigasi di FE (konteks buat BE)

- **Matrix akses**: bug pagination diperbaiki (ambil semua halaman, bukan 100) → toggle akurat. Sisa 500 di group `e949d143` = **B5 (BE)**.
- **B1**: `getMyEffectivePermissions` sekarang fan-out per aplikasi (`CONNECTOR`/`CTS`/`OGC_ADAPTER`) lalu digabung.
- **B3**: fitur "Lihat Permission per user" dihapus (endpoint 404).
- **A5**: gerbang login diperbaiki — org dari fallback pilihan user sendiri tidak lagi dipercaya (tutup bypass); kalau FE tak bisa verifikasi org (token terbatas) → tidak hard-block, ikat `participant_id`, backend yang menegakkan.
- **A1**: baris "participant" disembunyikan bila tak ada datanya (bukan menampilkan "Tidak tertaut" yang menyesatkan).
- **Sidebar per role**: menu kelola-platform dibatasi `SUPER_ADMIN` (org-admin tak lagi lihat menu platform).
- Fitur FE lain yang sudah jalan: endpoint picker definitif, accordion Endpoint/Permission, filter + hapus massal user, halaman Monitoring/Compliance/Metadata Katalog/Kebijakan Kontrak, provider tools.

---

## Lampiran — cara verifikasi ulang

```bash
# ambil spec live
curl -s http://100.66.10.14:8181/openapi.json -o spec.json

# contoh cek: field UserResponse & UserUpdateRequest
node -e 'const j=require("./spec.json");const c=j.components.schemas;
console.log("UserResponse:", Object.keys(c.UserResponse.properties));
console.log("UserUpdateRequest:", Object.keys(c.UserUpdateRequest.properties));'

# contoh probe: effective-permissions tanpa application -> harus 422
curl -s -X GET "http://100.66.10.14:8181/api/v1/identity-provider/iam/me/effective-permissions" \
  -H "Authorization: Bearer <token>" -w "\nHTTP %{http_code}\n"
```

---

*Dokumen ini adalah tracker gap/bug **backend** (+ blocker) dari sudut pandang FE. Perbaikan sisi FE dirangkum di bagian "Sudah diselesaikan / dimitigasi di FE" di atas. Semua temuan diverifikasi langsung ke API live pada 2026-07-07.*
