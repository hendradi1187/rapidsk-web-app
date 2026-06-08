# Panduan Deploy — Front-End (rapidsk-web-app) GX-Space

FE: Vite + React + TypeScript + shadcn. Output build = berkas statis di `dist/`.

## 1. Prasyarat
- Node.js 18+ & npm.
- Backend GX-Space (fabric) sudah jalan & dapat dijangkau dari browser pengguna.

## 2. Konfigurasi env (WAJIB sebelum build)
> Variabel `VITE_*` **di-bake saat build**. Set dulu, baru build. Mengubah `.env` setelah build TIDAK berpengaruh.
```bash
cp .env.example .env
nano .env
#   VITE_API_BASE_URL = URL fabric BE yang dijangkau BROWSER, mis.
#       http://<HOST-DEV>:8184/api/v1   atau   https://<domain-be>/api/v1
#   (BUKAN localhost kecuali FE & user di mesin yang sama)
#   VITE_NODE_BASE_URL = URL node geospasial (opsional)
```

## 3. Build
```bash
npm ci          # install dependensi bersih (jangan copy node_modules dari lokal)
npm run build   # hasil di ./dist
```

## 4. Sajikan (static hosting) — WAJIB SPA fallback
Semua rute (mis. `/onboarding`, `/transfers`, `/confirm-email`) harus mengembalikan
`index.html` (client-side routing). Contoh Nginx:
```nginx
server {
  listen 80;
  root /var/www/rapidsk/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }   # ← SPA fallback
}
```
Alternatif cepat (uji): `npm run preview` atau `npx serve -s dist`.

## 5. Hal penting saat deploy
- **CORS**: pastikan BE `CORS__ALLOWED_ORIGINS` memuat origin FE.
- **Rute publik** (tanpa login): `/login`, `/register-kkks` (pendaftaran KKKS),
  `/confirm-email` (aktivasi operator). Pastikan dapat diakses.
- **Email aktivasi**: tautan di email memakai `FRONTEND_BASE_URL` di BE — arahkan ke domain FE ini.
- Build ulang setiap ganti `VITE_API_BASE_URL` (env di-bake).

## 6. Akun uji (setelah init-fabric BE)
- SKK Migas: `skkmigas` / `SkkMigas123!` → menu admin (Setup Juknis, Pendaftaran KKKS, Dashboard matrix).
- KKKS PHE : `phe` / `Phe12345!` → menu provider (Permintaan Masuk, Publish Dataset, Transfer Data).
> Ganti password default di lingkungan nyata.

## 7. Alur singkat first-run
1. BE: `docker compose up -d --build` → `bash init-fabric.sh`.
2. FE: set `.env` → `npm ci && npm run build` → sajikan `dist/`.
3. Login `skkmigas` → **Setup Juknis** (Org → Domain → Terapkan Juknis).
4. KKKS daftar di `/register-kkks` → SKK Migas setujui di **Pendaftaran KKKS** → operator aktivasi via email → publish & transfer data.
