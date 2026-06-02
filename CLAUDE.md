# Dataspace Web App — Project Context for Claude

> File ini dibaca otomatis oleh Claude setiap sesi. Update bagian "Status Terkini" secara berkala.

## Project Overview

**Nama**: Dataspace Web App (rapiDSK)
**Repo**: https://github.com/hendradi1187/rapidsk-web-app
**Stack**: React 18 + TypeScript + Vite 5 + TailwindCSS + shadcn/ui
**State management**: Zustand + TanStack Query v5
**Package manager**: npm (ada juga bun.lockb tapi CI pakai npm)

## Environment

```bash
# Dev
npm run dev          # port 8282
npm run build        # production build → dist/
npm run type-check   # tsc --noEmit
npm run lint         # eslint .
npm test             # vitest run

# Env vars
VITE_API_BASE_URL=http://<backend-ip>:<port>
# Dev proxy: /api/* → VITE_API_BASE_URL (dikonfigurasi di vite.config.ts)
```

## Branch Strategy

```
main        ← production-ready (protected, butuh PR + review)
develop     ← integration branch
  ├── feature/<scope>/<deskripsi>
  ├── fix/<scope>/<deskripsi>
  └── chore/<scope>/<deskripsi>
```

PR selalu ke `develop` dulu, bukan langsung ke `main`.

## Commit Convention

Format: `type(scope): subject` — enforced by commitlint + husky

```
feat(v2): add policy contract approval modal
fix(auth): resolve token refresh loop on 401
chore(deps): upgrade tanstack-query to 5.83
```

Scopes valid: `auth` `dashboard` `datasets` `contracts` `policy` `transfer` `audit` `v2` `consumer` `provider` `authority` `api` `components` `ui` `ci` `deps` `docs` `release` `test`

## Source Structure

```
src/
├── api/
│   ├── client.ts          ← Axios instance (base URL dari VITE_API_BASE_URL, interceptors)
│   ├── hooks/             ← Custom hooks per domain (useDatasets, useContracts, dll)
│   ├── services/          ← API service functions (governance, policy-contract, dll)
│   └── types/             ← TypeScript types per domain
├── components/
│   ├── ui/                ← shadcn/ui base components (jangan edit langsung)
│   ├── auth/              ← ProtectedRoute, RoleGuard
│   └── <feature>/         ← Feature-specific components
├── pages/
│   ├── v2/
│   │   ├── admin-consumer/   ← Flow: Consumer (beli/request data)
│   │   ├── admin-provider/   ← Flow: Provider (jual/offer data)
│   │   └── authority/        ← Flow: Authority (approve, govern)
│   └── *.tsx              ← Legacy pages (masih aktif dipakai)
├── context/
│   └── AuthContext.tsx    ← Auth state global (user, token, role)
└── App.tsx                ← Router + ProtectedRoute wrapper
```

## Roles & Flow

| Role | Path | Tanggung Jawab |
|------|------|----------------|
| Admin Consumer | `/v2/admin-consumer/*` | Request dataset, policy contract, data transfer |
| Admin Provider | `/v2/admin-provider/*` | Offer dataset, approve contract |
| Authority | `/v2/authority/*` | Govern, approve participants, audit |

## Backend API

Base URL diset via `VITE_API_BASE_URL`. Semua call lewat `/api/` prefix (di-proxy oleh Vite dev server).

Tracking status koneksi FE ↔ BE ada di `docs/todolist.md`.

Known BE bugs (belum fix dari backend):
- DELETE Organization: path `/organizations/organizations/{id}` (double path)
- CREATE Contract Policy: endpoint typo `/contract-policiess`

## CI/CD Setup

- **CI**: GitHub Actions — `.github/workflows/ci.yml` (lint, typecheck, test, build) — jalan di setiap PR
- **Bundle report**: `.github/workflows/fe-report.yml` — comment bundle size di PR, budget 1MB
- **Changelog**: Release Please — `.github/workflows/release.yml` — auto-generate CHANGELOG + GitHub Release
- **Triage**: `.github/workflows/triage.yml` — auto-label issues dan PRs
- **Commit enforcement**: husky + commitlint (lokal)

## Docker Deployment

```bash
docker build --build-arg VITE_API_BASE_URL=http://<server>:<port> -t dataspace-web .
docker compose up -d
# Port: APP_PORT (default 8183) → port 80 nginx
```

Deploy ke server: **manual oleh owner** (bukan otomatis).

## Monitoring

- **Weekly report**: Setiap Senin 09:00 WIB → GitHub Issue otomatis berisi summary PR, issues, releases
- **Status real-time**: Cek GitHub Actions tab di repo untuk CI status terkini

## Status Terkini

> Update bagian ini secara manual setiap sprint/minggu

| Area | Status | Notes |
|------|--------|-------|
| Auth / Login | ✅ Done | Flow lengkap termasuk aktivasi |
| Dashboard | ⚠️ Partial | Beberapa card masih hardcoded |
| Admin Consumer v2 | 🔄 In Progress | Policy contract aktif dikerjakan |
| Admin Provider v2 | 🔄 In Progress | |
| Authority v2 | 🔄 In Progress | |
| Data Transfer | ❌ Blocked | Backend API belum ready |
| Audit/Compliance | ❌ Blocked | Backend API belum ready |
| CI/CD Setup | ✅ Done | Workflows aktif, belum push ke remote |
