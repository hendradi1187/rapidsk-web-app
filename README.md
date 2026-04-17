DOCKER SETUP GUIDE (SIMPLE + DEV MODE + MULTI ENV)

=====================================
OVERVIEW
=====================================

Panduan ini buat run aplikasi pakai Docker.

Flow:
1. Setup environment (.env)
2. Jalankan docker compose
3. Akses aplikasi
4. Update kalau ada perubahan

Tambahan:
- Mode dev (for development purpose only)
- Multi environment (dev / staging / prod)


=====================================
PRASYARAT
=====================================

Pastikan:
- Docker sudah terinstall
- docker compose bisa dipakai
- Repo project sudah ada


=====================================
SETUP ENVIRONMENT
=====================================

Copy file env:

cp .env.example .env

Contoh isi:

APP_PORT=8183
VITE_API_BASE_URL=http://45.158.126.171:8181


Penjelasan:

APP_PORT
Port akses frontend
Contoh: http://localhost:8183

VITE_API_BASE_URL
Alamat backend API
Frontend akan request ke sini


Catatan:
Kalau beda server / environment → ubah VITE_API_BASE_URL


=====================================
JALANKAN APLIKASI
=====================================

docker compose up -d


Cek container:

docker compose ps


Cek log:

docker compose logs -f frontend


Akses app:

http://localhost:8183


=====================================
UPDATE REPO
=====================================

git pull

docker compose up -d


=====================================
TROUBLESHOOTING
=====================================

PORT BENTROK
Ubah di .env:
APP_PORT=8190


CONTAINER TIDAK JALAN
docker compose ps
docker compose logs -f


FRONTEND OK, API ERROR
Cek:
- VITE_API_BASE_URL
- Backend bisa diakses atau tidak


=====================================
DEV MODE (OPTIONAL)
=====================================

Tujuan:
- Buat development
- Gak perlu build ulang

Cara:

Tambahkan service khusus di docker-compose.dev.yml

Contoh konsep:

- mount volume source code ke container
- jalankan dev server (vite / npm run dev)

Contoh command:

docker compose -f docker-compose.yml -f docker-compose.dev.yml up


Kondisi dev:
- VITE_API_BASE_URL tetap dari env
- frontend jalan mode development


=====================================
MULTI ENVIRONMENT
=====================================

Gunakan file env berbeda:

.env.dev
.env.staging
.env.prod


Contoh:

.env.dev
APP_PORT=8183
VITE_API_BASE_URL=http://localhost:8181


.env.staging
APP_PORT=8283
VITE_API_BASE_URL=http://staging-api


.env.prod
APP_PORT=80
VITE_API_BASE_URL=https://api.production.com


Cara pakai:

docker compose --env-file .env.dev up -d

atau

docker compose --env-file .env.prod up -d


=====================================
DOCKER IMAGE (OPTIONAL)
=====================================

Kalau pakai image .tar:

docker load < image.tar
docker run ...


Catatan:
Image biasanya mengikuti config saat build
Kalau API beda → biasanya perlu build ulang image


=====================================
RINGKASAN
=====================================

- Copy .env
- Set port & API
- docker compose up -d
- Akses di browser

Optional:
- pakai dev mode untuk development
- pakai multi env untuk beda environment

=====================================
END
=====================================