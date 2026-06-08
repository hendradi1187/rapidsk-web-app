# Panduan Onboarding — Pengguna SKK Migas (Regulator)

> Aplikasi: **rapidsk / GX-Space** — portal pertukaran data geospasial hulu migas (SPEKTRUM IOG 4.0).
> Peran Anda: **SKK Migas** = koordinator. Anda **menyiapkan aturan (Juknis)**, **menyetujui KKKS**, lalu **memantau kepatuhan** pengiriman data 5 domain dari seluruh KKKS.

## Tujuan panduan
Membantu pengguna SKK Migas memahami **urutan tahapan** memakai aplikasi — dari menyiapkan tata-kelola sampai memantau data masuk dari KKKS — tanpa perlu paham teknis di belakangnya.

---

## Ringkasan alur (5 tahap)
```
1. Login  →  2. Setup Juknis  →  3. Setujui Pendaftaran KKKS  →  4. Pantau Dashboard  →  5. Tindak lanjut
   (sekali)     (sekali, di awal)    (tiap ada KKKS baru)            (rutin)              (kontrak/tenggat)
```
Sidebar dikelompokkan mengikuti alur ini: **Persiapan** (Setup Juknis, Pendaftaran KKKS, Organizations) lalu **Pemantauan & Operasional** (Dashboard, Katalog, Contracts, dll.).

---

## Tahap 1 — Masuk (Login)
- Buka aplikasi → masukkan **username & kata sandi** SKK Migas.
- Akun uji: `skkmigas` / `SkkMigas123!` *(ganti di lingkungan nyata — konfirmasikan kredensial yang disediakan admin server)*.
- Field **"Organization"** di atas username **opsional/kosmetik** — tidak memengaruhi login; cukup biarkan default.
- Tombol **"Sign in with SSO (OIDC)"** saat ini **nonaktif** (SSO belum diaktifkan). Gunakan **username & password**.
- Setelah masuk, Anda berada di **Dashboard SKK Migas**.

## Tahap 2 — Setup Juknis (WAJIB di awal, sekali)
Pada instance baru, Dashboard menampilkan banner **"Langkah 1 — Persiapan · Setup Juknis belum dijalankan"**. Klik **Mulai Setup Juknis** (atau menu sidebar **Persiapan → Setup Juknis**).

Wizard berjalan **4 langkah berurutan** (stepper di atas halaman). Tombol **Lanjut** baru aktif bila langkah saat ini lengkap; tombol **Kembali** untuk merevisi. Tahap ini cukup **dijalankan sekali** per instance dan **aman diulang** (idempoten — tidak membuat duplikat).

```
[1] Organisasi  →  [2] Governance Domain  →  [3] Paket Juknis  →  [4] Terapkan
```

### Langkah 1 — Organisasi
Menentukan organisasi pemilik tata kelola (SKK Migas selaku regulator).
- Jika sudah ada organisasi terdaftar → pilih dari dropdown **"Organisasi terdaftar"** (otomatis terisi yang pertama).
- Jika belum ada → pada kotak **"Atau buat organisasi baru"**, ketik nama (mis. `SKK Migas`) lalu klik **Buat**.
  - Syarat nama: **minimal 3 karakter**.
- Klik **Lanjut** setelah organisasi terpilih.

### Langkah 2 — Governance Domain
Wadah logis untuk seluruh kebijakan & kamus data 5 domain migas.
- Jika sudah ada → pilih dari dropdown **"Domain terdaftar"**.
- Jika belum ada → isi form **"buat governance domain baru"** lalu klik **Buat Domain**. Nilai default sudah disiapkan:
  | Field | Default | Syarat |
  |---|---|---|
  | Nama | `Data Migas Geospasial` | minimal 3 karakter |
  | Code | `MIGAS-GEO` | minimal 2 karakter |
  | Deskripsi | `Domain data geospasial migas SKK Migas (5 domain).` | minimal 10 karakter |
- Klik **Lanjut** setelah domain terpilih.

### Langkah 3 — Paket Juknis (5 domain)
Semua baris **sudah terisi nilai baku Juknis**. Anda cukup **meninjau**, dan boleh menyesuaikan **Klasifikasi** & **masa Kerahasiaan (tahun)** per domain.

**Default baku 5 domain:**
| Domain | Sub (OGC) | Klasifikasi default | Kerahasiaan (thn) |
|---|---|---|---|
| Wilayah Kerja | PSC Area | **L1** | 0 |
| Lapangan | Field | **L2** | 5 |
| Fasilitas | Facility | **L2** | 5 |
| Sumur | Well | **L3** | 5 |
| Survei Seismik | Seismic | **L3** | 5 |

**Legenda klasifikasi (L0–L4):**
| Level | Kelas Juknis | Arti |
|---|---|---|
| **L0** | PUBLIK (penuh) | Terbuka penuh |
| **L1** | PUBLIK (terbatas) | Publik dengan batasan |
| **L2** | INTERNAL | Konsumsi internal |
| **L3** | TERBATAS | Akses terbatas |
| **L4** | RAHASIA | **Tidak dipublikasikan ke SPEKTRUM** |

- **Klasifikasi** — dropdown per domain (L0–L4). Naikkan level untuk data lebih sensitif.
- **Kerahasiaan (thn)** — lama data dijaga sebelum boleh turun klasifikasi (angka, ≥0).
- Centang **"Sertakan kamus data (vocabulary + schema atribut wajib SIGI per domain)"** (default: aktif) agar sistem ikut membuat **vocabulary** & **schema atribut wajib** sesuai SIGI untuk tiap domain. Biarkan tercentang kecuali kamus sudah dibuat manual.
- Klik **Lanjut**.

### Langkah 4 — Terapkan
- Klik **Terapkan Juknis**. Sistem otomatis membuat, untuk **domain terpilih** dan **5 domain data**:
  - **dataset-policy** (kebijakan klasifikasi per domain),
  - **contract-policy** (kebijakan kontrak/kewajiban),
  - bila kamus diaktifkan: **vocabulary** + **schema** atribut wajib SIGI.
- Setelah selesai muncul ringkasan jumlah: **Dataset-policy · Contract-policy · Vocabulary · Schema** yang dibuat.
- Bila ada item dilewati (mis. sudah pernah dibuat), muncul catatan kuning — **wajar** karena proses idempoten.

> Setelah tahap ini, halaman **Katalog Dataset / Contracts / Policies / Schemas / Vocabularies** "hidup", banner Setup Juknis di Dashboard otomatis hilang, dan platform **siap menerima pendaftaran KKKS** (lanjut ke Tahap 3).

## Tahap 3 — Setujui Pendaftaran KKKS (tiap ada KKKS baru)
- KKKS mendaftar mandiri lewat halaman publik **`/register-kkks`** (tanpa perlu login). Pengajuan masuk ke menu **Pendaftaran KKKS**.
  > Prasyarat UAT: pastikan minimal ada 1 pengajuan KKKS (lewat `/register-kkks`) agar antrian tidak kosong.
- Tinjau antrian → klik **"Setujui & Terbitkan"**. Sistem otomatis:
  - membuat **peserta (participant)** KKKS,
  - membuat **akun operator KKKS** + mengirim **email aktivasi**,
  - menerbitkan **5 kontrak kewajiban** (satu per domain).
- Kolom **Akun Operator** menunjukkan status **Aktif / Belum aktivasi**. Bila email belum sampai, klik **"Kirim Ulang Undangan"**.
- Operator KKKS mengaktifkan akun lewat tautan email → halaman **`/confirm-email`** (set kata sandi). Setelah itu operator bisa login & memenuhi kewajiban.

## Tahap 4 — Pantau Dashboard (rutin)
Menu **Dashboard** menampilkan **Matriks Kepatuhan**: baris = KKKS, kolom = 5 domain. Tiap sel berstatus:
- **Terkirim** (transfer data COMPLETED) · **Aktif** (dataset ter-publish **dan** kontrak ACTIVE) · **Tersedia** (dataset sudah ada, kontrak belum aktif) · **Belum** (belum ada data).
- **Cincin/ikon merah** = **lewat tenggat (overdue)**.
Fitur bantu: **pencarian KKKS**, filter **"hanya belum patuh"** & **"hanya overdue"**, **drill-down** (klik nama KKKS → detail 5 domain), **Ekspor CSV** (laporan kepatuhan), KPI ringkas (cakupan %, terkirim, terlambat).

## Tahap 5 — Tindak lanjut
- **Contracts** — lihat seluruh kontrak (status REQUESTED → APPROVED → ACTIVE / REJECTED) + tenggat. Bisa **"Ajukan Permintaan Data"** ke KKKS bila perlu.
- **Katalog Dataset** — dataset yang dipublikasikan KKKS (domain, klasifikasi, status, versi).
- **Participants** — daftar peserta (KKKS + SKK Migas).
- **Schemas / Vocabularies / Policies** — kamus data & kebijakan hasil Setup Juknis.
- **Audit Trail** — jejak aktivitas.

---

## Yang perlu Anda ketahui
- **Klasifikasi 4 kelas (Juknis):** PUBLIK · INTERNAL · TERBATAS · RAHASIA. Data **RAHASIA tidak dipublikasikan** ke SPEKTRUM.
- **Sebagai SKK Migas (regulator)** Anda dapat melihat data **seluruh KKKS**. KKKS hanya melihat datanya sendiri.
- **Tenggat (SLA Juknis)** otomatis dihitung per kontrak; sel/KPI **merah** menandai keterlambatan.
- Aplikasi ini **fokus pertukaran data** (katalog, kontrak, transfer) — **peta** ditampilkan aplikasi pihak ketiga, bukan di sini.

## Bantuan cepat
- Halaman domain-scoped kosong? Pastikan **Setup Juknis** sudah dijalankan (Tahap 2).
- KKKS tidak muncul di matrix? Pastikan pendaftarannya sudah **disetujui** (Tahap 3) & operatornya **aktif**.
