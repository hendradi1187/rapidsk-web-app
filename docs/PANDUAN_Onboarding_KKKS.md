# Panduan Onboarding — Pengguna KKKS (Penyedia Data / Provider)

> Aplikasi: **rapidsk / GX-Space** — portal pertukaran data geospasial hulu migas (SPEKTRUM IOG 4.0).
> Peran Anda: **KKKS** = penyedia data. Tugas Anda **memenuhi kewajiban** mengirim data **5 domain** (Wilayah Kerja, Lapangan, Fasilitas, Sumur, Survei Seismik) ke SKK Migas.

## Tujuan panduan
Membantu operator KKKS memahami **urutan tahapan** — dari mendaftar, aktivasi akun, sampai mengirim data — agar setiap kewajiban data terpenuhi tepat waktu.

> **Prasyarat (penting):** alur KKKS baru berjalan setelah **SKK Migas menyelesaikan Setup Juknis** (membuat governance domain + kebijakan 5 domain). Tanpa itu, kontrak kewajiban Anda belum bisa diterbitkan. Jadi tahapan di bawah mengasumsikan sisi SKK Migas sudah siap.

---

## Ringkasan alur (5 tahap)
```
1. Daftar mandiri  →  2. Aktivasi akun  →  3. Login  →  4. Tindak kewajiban  →  5. Kirim data
   (publik)            (email)              (operator)    (Permintaan Masuk)      (Transfer Data)
```
Aplikasi akan **memandu otomatis** lewat banner di Dashboard: "Langkah 1 — tindak kewajiban", lalu "Langkah 2 — kirim data".

---

## Tahap 1 — Daftar mandiri (publik, tanpa login)
- Buka halaman **Pendaftaran KKKS** (`/register-kkks`).
- Isi: **Nama KKKS**, **Wilayah Kerja**, **Nama operator**, **Email operator** (telepon opsional) → kirim.
- Pengajuan akan ditinjau & disetujui oleh **SKK Migas**.

## Tahap 2 — Aktivasi akun operator (lewat email)
- Setelah disetujui SKK Migas, operator menerima **email aktivasi**.
- Klik tautan di email → halaman **Aktivasi Akun** (`/confirm-email`) → **buat kata sandi** (minimal 6 karakter, ketik ulang untuk konfirmasi) → akun aktif.
- Bila email belum sampai, minta SKK Migas klik **"Kirim Ulang Undangan"**.
- Saat akun dibuat, SKK Migas sekaligus menerbitkan **5 kontrak kewajiban** (satu per domain) untuk Anda.

## Tahap 3 — Masuk (Login)
- Login dengan **username & kata sandi** operator (yang Anda buat di Tahap 2).
- Field **"Organization"** di form login **opsional/kosmetik** (tidak memengaruhi login); tombol **"Sign in with SSO (OIDC)"** saat ini **nonaktif** — gunakan username & password.
- *(Khusus lingkungan uji: tersedia akun pra-seed `phe` / `Phe12345!` yang sudah aktif — melewati Tahap 1–2. KKKS sungguhan tetap melalui daftar mandiri + aktivasi.)*
- Anda masuk ke **Dashboard KKKS** — menampilkan **5 kartu domain** dengan progres: **Terdaftar → Kontrak → Aktif → Terkirim**, serta KPI (Domain Terpenuhi, Dataset Published, Kontrak Aktif, Permintaan Menunggu).

## Tahap 4 — Tindak kewajiban (menu "Permintaan Masuk")
Banner Dashboard menampilkan **"Langkah 1 — Tindak kewajiban"**. Klik **Buka Permintaan Masuk** (atau menu **Permintaan Masuk**):
- Daftar **kontrak kewajiban** (status REQUESTED) dengan **kolom Tenggat** (sisa/terlambat hari).
- Untuk tiap kewajiban: **Setujui → Aktifkan**, lalu **Buat Perjanjian (Agreement)**.
- Setelah aktif, status kontrak menjadi **ACTIVE** dan siap untuk pengiriman data.

## Tahap 5 — Kirim data (menu "Transfer Data")
Banner berubah menjadi **"Langkah 2 — Kirim data"**. Klik **Buka Transfer Data** (atau menu **Transfer Data**):
- Tabel kewajiban 5 domain. Domain dengan **dataset + kontrak aktif** = **"Siap dikirim"**.
- Klik **"Kirim Data"** → sistem menautkan dataset ke kontrak, mengaktifkan perjanjian, lalu mentransfer data → status **"Terkirim"**.
- **Riwayat Transfer** menampilkan status, ukuran, **checksum**, dan **jumlah record**.

### (Bila perlu) Daftarkan dataset baru — menu "Katalog Dataset"
- Klik **"Publish Dataset"** lalu isi: **Domain** · **Klasifikasi** (L0–L4, terisi default sesuai domain) · **Schema** (kamus data domain) · **Nama Dataset** (≥3 karakter) · **Protokol** (`OGC_API_FEATURES` / `REST_API`) · **Versi** (format `X.Y.Z`, mis. `1.0.0`) · **Endpoint URL** (`http`/`https`) → klik **Publish** → terbit (status PUBLISHED).
- Bila dropdown **Schema** kosong, berarti **Setup Juknis** sisi SKK Migas belum dijalankan (schema belum ada).
- Dataset yang dipublikasikan inilah yang akan dikirim pada Tahap 5.

---

## Yang perlu Anda ketahui
- **Anda hanya melihat data milik KKKS Anda** — data KKKS lain tidak terlihat (isolasi data).
- **Klasifikasi 4 kelas (Juknis):** PUBLIK · INTERNAL · TERBATAS · RAHASIA.
  - Data **TERBATAS (L3)** boleh dibagikan tetapi sebagian atribut/koordinat **dimasking** untuk pihak tertentu.
  - Data **RAHASIA (L4) tidak boleh dipublikasikan** ke SPEKTRUM.
- **CRS wajib EPSG:4326 (WGS84)** & disajikan sebagai **OGC API Features** — node Anda menangani ini saat publikasi.
- **Tenggat (SLA Juknis):** perhatikan kolom Tenggat & cincin merah di Dashboard — itu menandai keterlambatan.

## Tujuan akhir
Semua **5 domain Terkirim (5/5)** → muncul kartu sukses **"Semua kewajiban data terpenuhi"** di Dashboard. SKK Migas melihat sel kepatuhan Anda menjadi **hijau/Terkirim**.

## Bantuan cepat
- Tidak ada kewajiban muncul? Pastikan pendaftaran sudah **disetujui** SKK Migas & Anda **login ulang** setelah aktivasi.
- Tombol "Kirim Data" tidak aktif? Pastikan kontrak domain itu sudah **Aktif** (Tahap 4) & dataset domainnya sudah **dipublikasikan**.
