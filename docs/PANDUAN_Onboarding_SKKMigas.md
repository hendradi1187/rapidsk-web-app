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
- Akun uji: `skkmigas` / `SkkMigas123!` *(ganti di lingkungan nyata)*.
- Setelah masuk, Anda berada di **Dashboard SKK Migas**.

## Tahap 2 — Setup Juknis (WAJIB di awal, sekali)
Pada instance baru, Dashboard menampilkan banner **"Langkah 1 — Setup Juknis"**. Klik **Mulai Setup Juknis** (atau menu **Setup Juknis**). Wizard 4 langkah:
1. **Organisasi** — pilih/buat organisasi SKK Migas.
2. **Governance Domain** — pilih/buat domain data (mis. "Data Migas Geospasial").
3. **Paket Juknis** — tinjau **5 domain data** beserta klasifikasi & masa retensi. Bisa diubah per domain:
   | Domain | Klasifikasi default | Kelas Juknis |
   |---|---|---|
   | Wilayah Kerja | L1 | PUBLIK |
   | Lapangan | L2 | INTERNAL |
   | Fasilitas | L2 | INTERNAL |
   | Sumur | L3 | TERBATAS |
   | Survei Seismik | L3 | TERBATAS |
   *(L4 = RAHASIA tidak dipublikasikan ke SPEKTRUM.)* Aktifkan juga **kamus data** (vocabulary + schema).
4. **Terapkan** — sistem otomatis membuat seluruh kebijakan + kamus data untuk 5 domain.
> Setelah tahap ini, halaman Katalog/Kontrak/Policies "hidup". Banner Setup Juknis otomatis hilang.

## Tahap 3 — Setujui Pendaftaran KKKS (tiap ada KKKS baru)
- KKKS mendaftar mandiri lewat halaman publik. Pengajuan masuk ke menu **Pendaftaran KKKS**.
- Tinjau antrian → klik **"Setujui & Terbitkan"**. Sistem otomatis:
  - membuat **peserta (participant)** KKKS,
  - membuat **akun operator KKKS** + mengirim **email aktivasi**,
  - menerbitkan **5 kontrak kewajiban** (satu per domain).
- Kolom **Akun Operator** menunjukkan status **Aktif / Belum aktivasi**. Bila email belum sampai, klik **"Kirim Ulang Undangan"**.

## Tahap 4 — Pantau Dashboard (rutin)
Menu **Dashboard** menampilkan **Matriks Kepatuhan**: baris = KKKS, kolom = 5 domain. Tiap sel berstatus:
- **Terkirim** (data sudah diterima) · **Aktif** (kontrak aktif) · **Tersedia** (dataset terdaftar) · **Belum**.
- **Cincin/ikon merah** = **lewat tenggat (overdue)**.
Fitur bantu: **pencarian KKKS**, filter **"hanya belum patuh"**, **drill-down** (klik nama KKKS → detail 5 domain), **Ekspor CSV** (laporan kepatuhan), KPI ringkas (cakupan %, KKKS lengkap, terkirim, terlambat).

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
