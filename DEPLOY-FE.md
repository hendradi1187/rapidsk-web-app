# Panduan Deploy - Front-End (rapidsk-web-app) GX-Space

FE: Vite + React + TypeScript + shadcn. Output build = berkas statis di `dist/`.

## 1. Prasyarat
- Node.js 18+ dan npm.
- Backend GX-Space sudah berjalan dan bisa dijangkau dari browser pengguna.

## 2. Konfigurasi env sebelum build
Variabel `VITE_*` di-bake saat `npm run build`. Jadi nilainya harus benar sebelum build dijalankan.

```bash
cp .env.example .env
nano .env
```

Yang paling penting:
- `VITE_API_BASE_URL` untuk backend yang dijangkau browser
- `VITE_PROXY_TARGET` untuk mode dev proxy
- `VITE_DEV_PORT` untuk Vite local dev

## 3. Build
```bash
npm ci
npm run build
```

## 4. Jalankan sebagai bundle server
Mode ini paling cocok dengan arsitektur sekarang karena wrapper memegang:

- setup wizard
- runtime config
- proxy `/api/*`
- license state
- fallback public organization cache

Jalankan:

```bash
npm run start:bundle
```

Atau via PM2:

```bash
pm2 start ecosystem.config.cjs
pm2 restart ecosystem.config.cjs --update-env
```

Variabel runtime yang bisa diganti tanpa rebuild FE:

```bash
RAPIDSK_PORT=8282
RAPIDSK_HOST=0.0.0.0
RAPIDSK_LICENSE_SERVER_URL=
PM2_APP_NAME=rapidsk-fe
```

## 5. Jalankan via Docker
Repo ini sekarang bisa dijalankan langsung sebagai container wrapper FE.

```bash
docker compose build
docker compose up -d
```

Catatan:
- port container mengikuti `RAPIDSK_PORT`
- folder `./config` dipasang sebagai volume agar `runtime.json`, `license-state.json`, dan cache wrapper tetap persisten
- runtime config tetap bisa diubah dari wizard first-run atau halaman deployment config

## 6. Static hosting murni
Kalau kamu memang ingin menyajikan `dist/` sebagai static SPA tanpa wrapper, semua route harus fallback ke `index.html`.

Contoh Nginx:

```nginx
server {
  listen 80;
  root /var/www/rapidsk/dist;
  index index.html;
  location / { try_files $uri $uri/ /index.html; }
}
```

Catatan:
- mode ini tidak cocok bila kamu ingin memakai runtime wrapper, setup wizard, atau runtime config server-side
- untuk flow production yang sekarang, bundle server lebih direkomendasikan

## 7. Hal penting saat deploy
- Pastikan CORS backend mengizinkan origin FE.
- Rute publik minimal: `/login`, `/register-kkks`, `/confirm-email`.
- Email aktivasi backend harus mengarah ke domain FE yang benar.
- Untuk ganti nilai `VITE_*`, lakukan build ulang.
- Untuk ganti `RAPIDSK_*`, cukup restart bundle server atau container.

## 8. Alur singkat first-run
1. Jalankan backend utama.
2. Jalankan FE bundle server atau container.
3. Buka aplikasi dan selesaikan setup wizard.
4. Login admin.
5. Setup Juknis, organization, domain, lalu lanjut onboarding participant/provider.
