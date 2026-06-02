# Dataspace Web App — Development Workflow

Panduan lengkap untuk flow development, monitoring, dan release di repo ini.

---

## 1. Branch Strategy

```
main            ← production-ready (protected)
  └── develop   ← integration branch
        ├── feature/<scope>/<judul>     e.g. feature/v2/policy-contract-view
        ├── fix/<scope>/<judul>         e.g. fix/auth/token-refresh-loop
        ├── chore/<scope>/<judul>       e.g. chore/deps/upgrade-tanstack-query
        └── docs/<judul>               e.g. docs/update-workflow-guide
```

### Rules
- **Jangan push langsung ke `main`** — selalu lewat PR
- `develop` → `main` via PR setelah semua CI hijau
- Branch nama pakai kebab-case, semua lowercase
- Delete branch setelah PR di-merge

---

## 2. Commit Convention

Format: `type(scope): subject`

```
feat(v2): add policy contract approval flow
fix(auth): resolve token refresh loop on 401
chore(deps): upgrade @tanstack/react-query to 5.83
docs(workflow): update branch naming guide
refactor(api): extract error handling to interceptor
```

### Types
| Type | Kapan dipakai |
|------|--------------|
| `feat` | Fitur baru |
| `fix` | Bug fix |
| `refactor` | Refactor (bukan fitur/bug) |
| `perf` | Peningkatan performa |
| `test` | Tambah/update test |
| `docs` | Update dokumentasi |
| `chore` | Config, deps, CI, build tooling |
| `style` | Formatting only (no logic change) |
| `ci` | Perubahan workflow CI/CD |
| `revert` | Revert commit sebelumnya |

### Scopes (area)
`auth` · `login` · `dashboard` · `datasets` · `contracts` · `policy` · `transfer` · `audit` · `compliance` · `users` · `access` · `organizations` · `participants` · `domains` · `onboarding` · `settings` · `v2` · `consumer` · `provider` · `authority` · `api` · `components` · `hooks` · `router` · `ui` · `config` · `deps` · `ci` · `docker` · `docs` · `release` · `test`

**Commit message akan di-reject** oleh husky kalau tidak sesuai format.

---

## 3. Pull Request Flow

1. Buat branch dari `develop`: `git checkout -b feature/scope/description develop`
2. Kerjakan perubahan
3. Commit dengan conventional commit format
4. Push & buka PR ke `develop` (bukan langsung ke `main`)
5. CI akan otomatis jalan: Lint → TypeCheck → Test → Build
6. Bot akan comment status CI + bundle size di PR
7. PR butuh minimal 1 review sebelum merge

### PR ke `main`
Hanya dari `develop` atau `hotfix/*`, setelah:
- Semua CI hijau
- Review approved
- CHANGELOG di-generate otomatis oleh Release Please

---

## 4. Changelog & Release (Otomatis)

Release dikelola oleh **Release Please** yang berjalan otomatis setiap push ke `main`.

### Flow-nya:
```
Push ke main  →  Release Please baca commit history
             →  Generate CHANGELOG.md update
             →  Buka PR "chore: release X.Y.Z"
             →  Lo merge PR itu  →  GitHub Release dibuat otomatis
```

### Versioning (Semantic):
- `feat`: bump **minor** (0.1.0 → 0.2.0)
- `fix`, `perf`: bump **patch** (0.1.0 → 0.1.1)
- `feat!` atau `BREAKING CHANGE` di footer: bump **major** (0.1.0 → 1.0.0)

**Lo tidak perlu edit CHANGELOG.md manual.** Cukup pakai conventional commits.

---

## 5. CI/CD Monitoring

### Workflows yang aktif:

| Workflow | Trigger | Output |
|----------|---------|--------|
| `ci.yml` | PR ke `main`/`develop`, push ke `develop` | Status: Lint, TypeCheck, Test, Build |
| `fe-report.yml` | PR (any) | Bundle size report di PR comment |
| `release.yml` | Push ke `main` | Auto-generate CHANGELOG + GitHub Release |
| `triage.yml` | Issue dibuka, PR dibuka/update | Auto-label berdasarkan konten |

### Yang akan lo lihat di setiap PR:

**CI Report** (dari `ci.yml`):
```
✅ CI Report
| Job       | Status |
|-----------|--------|
| Lint      |   ✅   |
| TypeCheck |   ✅   |
| Tests     |   ✅   |
| Build     |   ✅   |
```

**Bundle Report** (dari `fe-report.yml`):
```
✅ FE Bundle Report
| File          | Type | Size    | Gzipped |
|---------------|------|---------|---------|
| index-xxx.js  | JS   | 420 KB  | 140 KB  |
| index-xxx.css | CSS  | 45 KB   | 12 KB   |
Budget: ████████████░░░░░░░░ 46% of 1024 KB
```

---

## 6. Backlog Management (GitHub Issues)

### Label structure:
- **Type**: `type: bug`, `type: feature`, `type: task`, `type: refactor`
- **Status**: `status: needs-triage` → `status: in-progress` → `status: ready-for-review`
- **Priority**: `priority: critical`, `priority: high`, `priority: medium`, `priority: low`
- **Area**: `area: v2`, `area: auth`, `area: api`, `area: ui`, `area: contracts`, dll.
- **Role**: `role: consumer`, `role: provider`, `role: authority`

### Setup labels di GitHub:
1. Install `github-label-sync`: `npx github-label-sync --access-token <PAT> --labels .github/labels.yml hendradi1187/rapidsk-web-app`
2. Atau import manual via GitHub UI dengan warna dari `.github/labels.yml`

### GitHub Projects (Backlog Board):
Buat GitHub Project dengan views:
- **Backlog** — semua issue status: needs-triage
- **In Progress** — semua issue status: in-progress
- **Review** — semua issue status: ready-for-review
- **Done** — semua closed issues

---

## 7. Setup untuk Developer Baru

```bash
# Clone repo
git clone https://github.com/hendradi1187/rapidsk-web-app.git
cd rapidsk-web-app

# Install deps (husky hooks akan auto-install lewat prepare script)
npm install

# Copy env
cp .env.example .env.local
# Edit VITE_API_BASE_URL sesuai environment lo

# Start dev
npm run dev
```

### Verifikasi husky aktif:
```bash
# Coba commit dengan format yang salah — harus di-reject:
git commit -m "test commit salah format"
# Expected: ⧗ input: test commit salah format
#           ✖ subject may not be empty
```

---

## 8. Branch Protection (Setup Manual di GitHub)

Pergi ke **Settings → Branches → Add branch protection rule**:

### Untuk `main`:
- ✅ Require a pull request before merging
- ✅ Require approvals: **1**
- ✅ Dismiss stale pull request approvals when new commits are pushed
- ✅ Require status checks to pass before merging:
  - `Lint`
  - `TypeCheck`
  - `Tests`
  - `Build`
- ✅ Require branches to be up to date before merging
- ✅ Do not allow bypassing the above settings

### Untuk `develop`:
- ✅ Require a pull request before merging
- ✅ Require status checks: `Lint`, `TypeCheck`, `Build`

---

## 9. Secrets yang Perlu Di-set di GitHub

Pergi ke **Settings → Secrets and variables → Actions**:

| Secret | Nilai | Dipakai oleh |
|--------|-------|--------------|
| `VITE_API_BASE_URL` | URL backend production | `ci.yml` (build step) |

---

## 10. Deployment (Manual)

Deploy tetap di tangan lo. Setelah Release PR di-merge:

```bash
# Pull latest main
git checkout main && git pull

# Build image
docker build --build-arg VITE_API_BASE_URL=http://your-server:8182 -t dataspace-web .

# Push ke registry / upload ke server
docker save dataspace-web | gzip > dataspace-web.tar.gz
scp dataspace-web.tar.gz user@server:/path/

# Di server:
docker load < dataspace-web.tar.gz
docker compose up -d --no-deps frontend
```
