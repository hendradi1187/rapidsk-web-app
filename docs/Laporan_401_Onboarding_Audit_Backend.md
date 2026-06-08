# Laporan Teknis — 401 Unauthorized pada Service `onboarding` & `audit-compliance`

**Tanggal:** 2026-06-08
**Pelapor:** Tim Frontend (rapiDSK Web App)
**Tujuan:** Tim Backend / Infra (fabric API gateway `:8185`)
**Prioritas:** 🔴 Tinggi — memblokir alur inti onboarding KKKS oleh SKK Migas

---

## 1. Ringkasan

Dengan **satu token JWT yang sama**, request ke service `governance` **diterima** (lolos sampai validasi bisnis), tetapi request ke service `onboarding` dan `audit-compliance` **ditolak dengan 401 Unauthorized**.

Karena token, HTTP client, dan host:port (`45.158.126.171:8185`) **identik** untuk ketiga request, perbedaan hanya pada **service tujuan**. Ini mengindikasikan **inkonsistensi validasi token antar-service di backend**, bukan bug frontend.

---

## 2. Bukti

Ketiga request dikirim dari browser yang sama, sesi login yang sama, dengan header `Authorization: Bearer <token>` yang identik:

| # | Method | Endpoint | Hasil | Arti |
|---|--------|----------|-------|------|
| 1 | `POST` | `/api/v1/governance/organizations/` | **422** Unprocessable Content | Token **diterima** — request lolos auth, hanya gagal validasi body |
| 2 | `GET`  | `/api/v1/onboarding/participants` | **401** Unauthorized | Token **ditolak** di layer auth |
| 3 | `GET`  | `/api/v1/audit-compliance/audit-logs` | **401** Unauthorized | Token **ditolak** di layer auth |

> **Poin kunci:** Request #1 mencapai 422 — artinya service `governance` **berhasil memvalidasi token** dan baru menolak di validasi field. Jika token-nya yang bermasalah, #1 juga akan 401. Jadi token-nya valid; service #2 dan #3 yang menolaknya.

---

## 3. Konteks Autentikasi Frontend (PENTING)

Konfigurasi produksi saat ini (`.env.production`):

```
VITE_API_BASE_URL=http://45.158.126.171:8185/api/v1
# Keycloak OFF — VITE_KEYCLOAK_URL dikosongkan
```

**Implikasi:**
- Keycloak SSO **TIDAK aktif** di produksi. `isKeycloakConfigured = false`.
- Token yang dikirim FE adalah **JWT lokal rapiDSK** (`localStorage.auth_token`) hasil login form.
- Klaim JWT lokal: `sub`, `username`, `email`, `category.code`, `group.code`, `is_superadmin`, `participant_id`.
- Header dilampirkan seragam oleh axios interceptor untuk **semua** request ke `:8185` (`src/api/client.ts`).

Jadi: **satu JWT lokal rapiDSK** → diterima `governance`, ditolak `onboarding` & `audit-compliance`.

---

## 4. Hipotesis Penyebab (untuk diperiksa Backend)

| # | Hipotesis | Cara verifikasi |
|---|-----------|-----------------|
| A | Service `onboarding` & `audit-compliance` memvalidasi JWT dengan **secret / issuer / audience berbeda** dari `governance` | Bandingkan konfigurasi `JWT_SECRET` / `ISSUER` / `AUDIENCE` ketiga service |
| B | Kedua service mengharuskan **token Keycloak**, sedangkan `governance` masih menerima **JWT lokal rapiDSK** | Cek middleware auth tiap service — apakah ada yang sudah migrasi ke Keycloak, sebagian belum |
| C | RBAC: role SKK Migas (`is_superadmin` / `category.code` / `group.code`) **tidak punya scope** ke endpoint ini, tetapi handler mengembalikan **401, bukan 403** | Cek log auth backend untuk request tsb — apakah token ter-decode tapi ditolak oleh otorisasi |
| D | Token **tidak diteruskan gateway** ke service tertentu (header `Authorization` di-strip pada route `/onboarding` & `/audit-compliance`) | Inspeksi konfigurasi reverse-proxy / gateway untuk kedua route |

> Hipotesis **B** paling konsisten dengan kondisi "Keycloak OFF di FE tetapi sebagian service sudah menuntut Keycloak".

---

## 5. Dampak ke Alur Pengguna

| Alur | Halaman | Endpoint terdampak | Akibat |
|------|---------|--------------------|--------|
| **Setujui pendaftaran KKKS** | Pendaftaran KKKS | `POST /onboarding/participants` + prasyarat list participants | Tombol *"Setujui & Terbitkan"* **gagal total** — `approve()` butuh data participants (401) untuk menemukan participant SKK Migas |
| **Direktori Participants** | Participants | `GET /onboarding/participants` | Halaman gagal memuat |
| **Audit Trail** | Audit Trail | `GET /audit-compliance/audit-logs` | Halaman gagal memuat |

---

## 6. Yang Diminta dari Tim Backend

1. **Selaraskan validasi JWT** ketiga service (`governance`, `onboarding`, `audit-compliance`) agar menerima token yang sama — pakai secret/issuer/audience identik.
2. Jika target arsitektur adalah Keycloak: konfirmasikan apakah produksi seharusnya **mengaktifkan Keycloak di FE**. Jika ya, FE akan set `VITE_KEYCLOAK_URL/REALM/CLIENT_ID` — tetapi `governance` juga harus menerima token Keycloak agar konsisten.
3. Jika 401 sebenarnya karena **otorisasi (bukan autentikasi)**, ubah respons menjadi **403** agar diagnosis tepat, dan sampaikan role/scope apa yang dibutuhkan endpoint ini.
4. Sertakan **log auth backend** untuk request `GET /onboarding/participants` agar terlihat token ter-decode atau tidak.

---

## 7. Catatan Sisi Frontend

- FE **tidak perlu perubahan** untuk isu 401 ini — token sudah dilampirkan dengan benar dan seragam.
- Terpisah: bug **422** pada `POST /governance/organizations/` sudah **diperbaiki di FE** (memastikan `description ≥ 10`, `code` 2–20, `name ≥ 3`). Tidak terkait isu 401 ini.
- Anomali spec: `openapi-latest.json` mendaftarkan path dengan **double prefix** `/api/v1/onboarding/onboarding/participants`, sedangkan route yang aktif (mengembalikan 401, bukan 404) adalah single `/api/v1/onboarding/participants`. Mohon dikonfirmasi agar spec & route selaras.
