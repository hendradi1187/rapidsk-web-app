# FE-BE Service Path Matrix

Tanggal audit: 2026-07-10  
Repo FE: `dataspace-new`  
Target BE live utama yang dipakai pembanding: `http://100.66.10.14:8581`  
Sumber live spec: [tmp/openapi-live-8581.pretty.json](/D:/laragon/www/dataspace-new/tmp/openapi-live-8581.pretty.json:1)

## Basis audit

Dokumen ini disusun dari source FE yang berjalan sekarang, bukan asumsi:

- [src/api/clients.ts](/D:/laragon/www/dataspace-new/src/api/clients.ts:1)
- [src/api/endpoints.ts](/D:/laragon/www/dataspace-new/src/api/endpoints.ts:1)
- [src/lib/runtime-config.ts](/D:/laragon/www/dataspace-new/src/lib/runtime-config.ts:1)
- service files di `src/api/services/*`

Yang sudah diverifikasi langsung dari BE live `8581`:

- `POST /api/v1/identity-provider/auth/login` ada di spec live.
- `GET /api/v1/identity-provider/auth/validate` ada di spec live.
- `GET /api/v1/identity-provider/iam/me/effective-permissions` ada di spec live.
- `GET/POST /api/v1/identity-provider/iam/groups/{group_id}/permissions` ada di spec live.
- `GET/POST /api/v1/governance/organizations/{organization_id}/domains` ada di spec live.
- `GET/POST /api/v1/onboarding/participants/{participant_id}/domains` ada di spec live.

Catatan penting:

- `POST /identity-provider/iam/groups/{group_id}/permissions` pada runtime live sudah terbukti masih bisa `500`, walau endpoint-nya ada di OpenAPI.
- Jadi status di dokumen ini dibedakan antara `ada di spec` dan `terbukti jalan`.

## Routing FE sekarang

FE sudah punya layer routing logical client, jadi endpoint tidak lagi wajib nempel ke satu base URL.

Mapping logical client di [src/api/clients.ts](/D:/laragon/www/dataspace-new/src/api/clients.ts:1):

- `authClient` untuk auth, identity-provider, IAM
- `ctsClient` untuk governance, onboarding, policy-contract, data-catalog, compliance
- `connectorClient` untuk connector control plane
- `adapterClient` untuk adapter service/runtime
- `monitoringClient` untuk monitoring transfer/heartbeat

Default routing di [src/lib/runtime-config.ts](/D:/laragon/www/dataspace-new/src/lib/runtime-config.ts:1):

- auth, cts, connector, monitoring default ke `/api/v1`
- adapter service default ke `/adapter-service`
- adapter runtime default ke `/adapter-runtime`

Implikasi:

- Kalau BE nanti dipecah ke `8581-8584`, FE bisa diarahkan lewat runtime config tanpa rebuild.
- Tapi path contract tetap harus sinkron. Runtime split tidak menyelesaikan mismatch path atau bug payload.

## Matrix per domain

### 1. Auth / Identity Provider / IAM

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Login | `/identity-provider/auth/login` | `endpoints.ts`, `identity.ts` | ada di spec live | Match | Flow dasar auth tersedia. |
| Validate token | `/identity-provider/auth/validate` | `endpoints.ts`, `identity.ts` | ada di spec live | Match | Dipakai untuk validasi sesi. |
| Refresh token | `/identity-provider/auth/refresh-token` | `endpoints.ts`, `token-refresh.ts` | belum dicek runtime turn ini | Spec-based | Perlu smoke test kalau mau dipakai penuh. |
| Revoke token | `/identity-provider/auth/revoke-token` | `endpoints.ts` | belum dicek runtime turn ini | Spec-based | FE sudah treat 401 di jalur ini sebagai force logout. |
| Users CRUD | `/identity-provider/users/*` | `identity.ts`, `identity-provider.ts` | ada di live route family | Match with known BE holes | Masih ada blocker data tertentu seperti email `@internal.local` yang bikin `GET /users` gagal serialize. |
| Confirm email | `/identity-provider/users/confirm-email` | `identity.ts` | ada di family live | Match with known BE holes | Historis ada bug activation token dan auth requirement. FE sudah call public. |
| Effective permissions | `/identity-provider/iam/me/effective-permissions` | `iam.ts` | ada di spec live | Match | FE sekarang sudah pakai `authClient`, ini jalur RBAC utama yang benar. |
| Policy bundle | `/identity-provider/iam/policy-bundle` | `iam.ts` | ada di live family | Match | Dipakai untuk fallback policy visibility. |
| IAM applications | `/identity-provider/iam/applications` | `iam-admin.ts` | ada di spec family | Match | FE sudah siap CRUD. |
| IAM api resources | `/identity-provider/iam/api-resources` | `iam-admin.ts` | ada di spec family | Match | FE sudah siap CRUD. |
| IAM permissions | `/identity-provider/iam/permissions` | `iam-admin.ts` | ada di spec family | Match | FE sudah siap CRUD. |
| IAM group permissions list | `/identity-provider/iam/groups/{groupId}/permissions` | `iam-admin.ts` | ada di spec live | Match | Bisa dipakai untuk matrix RBAC. |
| IAM group permissions assign | `POST /identity-provider/iam/groups/{groupId}/permissions` | `iam-admin.ts` | ada di spec live | BE runtime hole | Live `8581` masih bisa `500 Internal Server Error`. FE tidak bisa menutup bug ini selain surfacing error jelas. |
| IAM group permissions update/delete | `/identity-provider/iam/groups/{groupId}/permissions/{groupPermissionId}` | `iam-admin.ts` | ada di spec live | Spec-based | Endpoint ada, tapi tetap perlu smoke test runtime karena create-nya masih jebol. |

Kesimpulan domain ini:

- RBAC sidebar dinamis sudah punya basis FE yang benar: effective permissions dari BE.
- CRUD role-permission level FE sudah ada.
- Gap terbesar bukan di path FE, tapi di runtime BE `group permissions POST` yang masih `500`.

### 2. Governance / Organizations / Domains / Policies

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Organizations list/create/update/delete | `/governance/organizations/` dan `/governance/organizations/{id}` | `governance.ts` | route family hidup | Match | Ini jadi sumber organisasi publik dan referensi login/register. |
| Organization domains list/create/update/delete | `/governance/organizations/{orgId}/domains` | `governance.ts`, `endpoints.ts` | ada di spec live | Match | Ini source domain governance yang paling jelas di sisi FE. |
| Organization policies | `/governance/organizations/{orgId}/policies` | `endpoints.ts` | tidak terbukti ada di live `8581` | FE stale / suspect | Constant masih ada, tapi service FE aktif sekarang tidak bergantung ke path ini. Ini kandidat stale contract. |
| Public organizations cache wrapper | `/admin/public-organizations/cache` | `governance.ts`, `runtime.ts` | wrapper/BFF path | FE internal | Ini bukan CTS live langsung; dipakai supaya daftar org publik bisa di-refresh dari wrapper. |
| Public organizations refresh | `/admin/public-organizations/refresh` | `runtime.ts`, `DeploymentConfig.tsx` | wrapper/BFF path | FE internal | Bukan sumber truth utama domain-binding, hanya cache/bootstrap helper. |

Kesimpulan domain ini:

- Jalur org dan org-domain FE sudah sejalan dengan BE live.
- `organizations/{id}/policies` masih harus dianggap tidak aman dipakai sampai BE benar-benar expose.

### 3. Onboarding / Participants / Registrations / Connection Pools

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Participants create | `/onboarding/participants` | `onboarding.ts` | route family hidup | Match | Dipakai saat approval registration. |
| Participants list/detail | `/onboarding/participants` | `providers.ts`, page hooks | route family hidup | Match | Kena CORS kalau dipanggil cross-origin langsung dari localhost ke `8581`. |
| Participant domains CRUD | `/onboarding/participants/{participantId}/domains` | `providers.ts`, `endpoints.ts` | ada di spec live | Match | Ini harus jadi source of truth domain per participant. |
| Participant adapters CRUD | `/onboarding/participants/{participantId}/adapters` | `providers.ts`, `endpoints.ts` | route family hidup | Match | Dipakai untuk kesiapan adapter/provider. |
| Registrations public create | `/onboarding/registrations` | `onboarding.ts` | route family hidup | Match | FE flow daftar KKKS masuk sini. |
| Registrations admin list/update | `/onboarding/registrations` dan `/{id}` | `onboarding.ts` | route family hidup | Match | Approval status hidup di onboarding. |
| Connection pools CRUD | `/onboarding/connection-pools` | `governance.ts`, `ConnectionPools.tsx` | route family hidup | Match | Sudah tidak pakai path lama `/governance/connection-pools`. |
| Scoped pool by agreement | `/onboarding/{domainId}/agreements/{agreementId}/connection-pools/{type}` | `governance.ts` | live family digunakan FE | Match | Penting untuk transfer readiness check. |

Kesimpulan domain ini:

- Bagian onboarding path FE relatif sudah bersih.
- Hole utama bukan lagi path, tapi otoritas data: beberapa layar masih bisa jatuh ke inferensi/override sesi kalau binding participant ke governance organization belum persist rapi di BE.

### 4. Policy Contract / Dataset Policies / Apply Juknis

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Contracts CRUD | `/policy-contract/{domainId}/contracts` | `policy-contract.ts` | live family ada | Match | Dipakai di transfer flow. |
| Agreements CRUD | `/policy-contract/{domainId}/agreements` | `policy-contract.ts` | live family ada | Match | Dipakai untuk relasi consumer-provider. |
| Contract policies CRUD | `/policy-contract/{domainId}/contract-policies` | `policy-contract.ts` | live family ada | Match | Butuh validasi payload bisnis. |
| Dataset policies CRUD | `/policy-contract/{domainId}/dataset-policies` | `governance.ts` | live family diasumsikan ada dari FE aktif | Match / needs payload validation | FE sudah wired. Error edit biasanya lebih ke validasi BE, bukan missing path. |
| Apply juknis | `/policy-contract/{domainId}/apply-juknis` | `juknis.ts`, `SetupJuknis.tsx` | live family ada | Match with validation risk | Error 400/422 kemungkinan besar berasal dari payload domain code/name yang tidak sesuai aturan BE. |

Catatan validasi yang sekarang kelihatan:

- Domain code BE mewajibkan uppercase alphanumeric plus `_` atau `-`.
- Nama domain panjang seperti `Domain data geospasial migas SKK Migas (5 domain)` tidak aman langsung dijadikan `code`.
- FE sudah butuh sanitasi ketat sebelum submit, bukan sekadar toast generik.

### 5. Data Catalog / Vocabulary / Schema / Metadata

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Datasets CRUD | `/data-catalog/{domainId}/datasets` | `data-catalog.ts` | live family ada | Match | Perlu domain context yang valid; kalau domain selector salah, layar terasa kosong. |
| Dataset runtime metadata preview | `/data-catalog/{domainId}/datasets/{id}/runtime-metadata/preview` | `endpoints.ts` | belum dicek runtime turn ini | Spec-based | Fitur lanjutan. |
| Vocabularies CRUD | `/data-catalog/{domainId}/vocabularies` | `vocabularies.ts` | live family ada | Match with validation risk | Error tambah vocabulary cenderung payload/business validation. |
| Vocabulary terms | `/data-catalog/{domainId}/vocabularies/{vocId}/terms` dan `/vocabulary-terms` | `vocabularies.ts` | live family ada | Match with validation risk | Error tambah istilah kemungkinan payload domain/value belum sesuai kontrak. |
| Schemas CRUD | `/data-catalog/{domainId}/schemas` | `schemas.ts` | live family ada | Match | Butuh domain binding valid. |
| Metadata schemas / dataset metadatas | `/data-catalog/{domainId}/metadata-schemas`, `/dataset-metadatas` | service family | live family ada | Match / partially verified | Perlu smoke test jika jadi fokus SIT tertentu. |

### 6. Connector / Transfer / Monitoring

| FE concern | FE path | FE source | Live BE 8581 | Status | Catatan |
|---|---|---|---|---|---|
| Transfer list | `/connector/{domainId}/transfers` | `connector.ts` | live family ada | Match | Pengganti path by-id yang dulu stale. |
| Consumer initiate | `/connector/consumer/initiate` | `connector.ts` | live family diasumsikan ada dari FE wiring | Match / needs runtime test | Sudah wired di FE. |
| Consumer direct start | `/connector/consumer/direct/{transferProcessId}/start` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Runtime sensitif ke prereq contract/pool/domain. |
| Consumer persistent start | `/connector/consumer/persistent/{transferProcessId}/start` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Sama, bukan path blocker utama. |
| Provider initiate | `/connector/provider/initiate` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Sudah ada di FE. |
| Provider direct start | `/connector/provider/direct/{transferProcessId}/start` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Sudah ada di FE. |
| Provider check | `/connector/provider/{transferProcessId}/check` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Sudah ada di FE. |
| Persistent download | `/connector/consumer/persistent/{transferProcessId}/download/...` | `connector.ts` | live family diasumsikan ada | Match / needs runtime test | Path sudah wired. |
| Transfer status | `/connector/{transferProcessId}/status` | `connector.ts`, `endpoints.ts` | live family ada | Match | Path by-id transfer lama sudah dibersihkan. |
| Heartbeats | `/cts/monitoring/connector-heartbeats` | `connector.ts` | live family ada | Match | Monitoring path terpisah. |
| Transfer projections | `/cts/monitoring/transfer-projections` | `connector.ts` | live family ada | Match | Dipakai untuk panel monitoring. |
| Publish transfer events | `/connector/runtime/transfer-events/publish` | `connector.ts` | live family ada | Match | Lebih ke operator/monitoring. |

Kesimpulan domain ini:

- Connector path FE sekarang relatif sudah sinkron.
- Error user non-superadmin di transfer center lebih sering datang dari context participant/domain/pool yang tidak konsisten, bukan karena endpoint flow belum ada.

### 7. Adapter / OGC / Remote Source

| FE concern | FE path | FE source | Live BE | Status | Catatan |
|---|---|---|---|---|---|
| Remote source connections | `/remote-sources/connections/` | `adapter-service.ts` | adapter service, bukan `8581` | Split-service | Harus dibandingkan ke adapter host aktif, bukan CTS. |
| ArcGIS layers | `/remote-sources/arcgis/{id}/layers` | `adapter-service.ts`, `endpoints.ts` | adapter service | Match by contract | FE sudah split ArcGIS/Geoserver, tidak generic lagi. |
| Geoserver layers | `/remote-sources/geoserver/{id}/layers` | `adapter-service.ts`, `endpoints.ts` | adapter service | Match by contract | Sama. |
| Data ingestion | `/data-ingestion/*` | `adapter-service.ts` | adapter service | Match by contract | Bergantung ke adapter availability. |
| OGC collections | `/ogc/ogc/collections` | `adapter-service.ts`, `endpoints.ts` | adapter service | Match | Path mismatch lama sudah dibereskan. |
| OGC metadata | `/ogc/metadata` | `adapter-service.ts`, `endpoints.ts` | adapter service | Match | Sudah bukan `/ogc/ogc/metadata`. |
| Adapter runtime collections/providers/metadata | `/adapter-runtime/v1/*` | `adapter-runtime.ts`, `endpoints.ts` | adapter runtime | Split-service | Harus diuji ke adapter runtime port aktual, bukan `8581`. |

Catatan:

- Domain ini tidak fair kalau diaudit hanya dari `8581`.
- Kalau target port split sekarang `8584` untuk OGC adapter, FE path contract sudah lebih siap dibanding sebelumnya, tapi runtime check tetap harus diarahkan ke host adapter aktual.

## Gap FE yang masih krusial

### A. Masih ada state penting yang belum murni DB-driven

Yang masih dipakai FE sekarang:

- `auth_token` dan `user_info` di localStorage
- mode/body transfer draft di [src/pages/TransferCenter.tsx](/D:/laragon/www/dataspace-new/src/pages/TransferCenter.tsx:44)
- notifications di [src/lib/app-notifications.ts](/D:/laragon/www/dataspace-new/src/lib/app-notifications.ts:27)
- participant binding override di [src/components/access-control/BindingAuditPanel.tsx](/D:/laragon/www/dataspace-new/src/components/access-control/BindingAuditPanel.tsx:1) masih eksplisit disimpan sebagai override sesi FE

Implikasi:

- Browser A dan Browser B bisa baca konteks yang berbeda walau DB sama.
- Ini menjelaskan kasus user bisa terlihat “sudah approve” atau “bisa login” tapi di browser lain binding/domain terasa hilang.

### B. Source of truth binding user-participant-organization belum tunggal

Fakta sekarang:

- Token login punya `participant_id`, `category`, `group`, `is_superadmin`.
- Token tidak membawa `organization_id` aktif dan tidak membawa daftar domain.
- FE akhirnya masih perlu menyatukan data dari:
  - token
  - registration
  - participant
  - governance organization domains
  - override lokal/sesi

Implikasi:

- Selama BE belum expose relasi final yang eksplisit, FE masih rawan inferensi.
- Masalah navbar domain “belum ada” untuk user tertentu biasanya bukan sekadar UI, tapi hasil dari binding authority yang pecah.

### C. Error handling sudah lebih jelas, tapi belum semua 400/422 diterjemahkan

Yang sudah ada:

- client interceptor membedakan `401`, `403`, `404`, `422`, `500`
- 401 tidak selalu logout; hanya path auth-infra tertentu yang memaksa logout

Yang masih kurang:

- banyak 400/422 bisnis masih tampil sebagai error mentah dari BE
- kasus `apply juknis`, `add domain`, `vocabulary`, `term`, `dataset policy` butuh mapper pesan field-level yang lebih tegas

### D. BE bug yang FE tidak bisa tutup penuh

Yang paling jelas saat ini:

- `POST /identity-provider/iam/groups/{group_id}/permissions` masih `500`
- `GET /identity-provider/users/` bisa gagal kalau ada email reserved seperti `@internal.local`

Untuk dua kasus itu, FE cuma bisa:

- cegah alur yang memicu data invalid
- tampilkan error yang jelas
- hide action tertentu kalau BE memang belum sehat

FE tidak bisa “memperbaiki” runtime bug BE tersebut.

## Rekomendasi operasional

### Yang sudah layak dianggap rapi

- routing logical client FE
- split path `auth / cts / connector / adapter / monitoring`
- endpoint onboarding connection pools
- connector flow utama di FE
- OGC path mismatch lama
- IAM effective permissions untuk basis sidebar dinamis

### Yang masih perlu dibereskan supaya SIT lebih stabil

1. Jadikan `participant domains` endpoint sebagai sumber domain utama di semua layar non-superadmin.
2. Batasi fallback governance domain hanya untuk case yang memang sah, jangan sampai provider/admin baca domain dari inferensi liar.
3. Kurangi override binding berbasis sesi/local storage sampai tinggal fungsi debug/admin saja.
4. Tambahkan mapping error 400/422 per form penting:
   - add domain
   - apply juknis
   - submit request data
   - add vocabulary
   - add term
   - edit dataset policy
5. Tandai fitur IAM assignment sebagai `BE unstable` selama `POST group permissions` masih 500.
6. Bersihkan constant stale `ORG_POLICIES` bila memang live `8581` belum expose route itu.

### Yang perlu dibawa ke BE

1. Endpoint authoritative untuk relasi user -> participant -> governance organization -> domains.
2. Perbaikan `POST /identity-provider/iam/groups/{group_id}/permissions`.
3. Sanitasi/validasi konsisten untuk domain code dan payload policy/catalog.
4. Toleransi atau pembersihan data email reserved pada list users.

## Bottom line

Kalau ditanya “mana yang sudah sinkron dan mana yang masih bohong kalau dibilang aman”, jawabannya:

- Path FE inti untuk `auth`, `governance org/domain`, `onboarding`, `connection-pools`, `connector main flows`, dan `OGC fixed paths` sudah jauh lebih sinkron daripada sebelumnya.
- Gap besar sekarang bukan lagi mayoritas mismatch path.
- Gap besar sekarang ada di tiga hal: bug runtime BE tertentu, authority binding yang belum tunggal, dan beberapa state FE yang masih sesi/local-storage driven.

Jadi untuk SIT:

- flow path dasar sudah cukup siap,
- tapi stability user-context dan IAM assignment masih belum bisa dibilang full clean end-to-end.
