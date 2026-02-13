# rapiDSK Web App - Backend & UI Sync Todolist

> Terakhir diperbarui: 8 February 2026

---

## Sudah Terhubung & Sesuai

### 1. Organizations Page

| Fitur | API Endpoint | Status |
|-------|-------------|--------|
| List | `GET /api/v1/governance/organizations/` | OK |
| Create | `POST /api/v1/governance/organizations/` | OK |
| Detail | `GET /api/v1/governance/organizations/{id}` | OK |
| Update | `PATCH /api/v1/governance/organizations/{id}` | OK |
| Delete | `DELETE /api/v1/governance/organizations/{id}` | **Mismatch** - backend pakai double path `/organizations/organizations/{id}` |

### 2. Domains Page

| Fitur | API Endpoint | Status |
|-------|-------------|--------|
| List | `GET /api/v1/governance/domains/` | OK |
| Create | `POST /api/v1/governance/domains/` | OK |
| Detail | `GET /api/v1/governance/domains/{id}` | OK |
| Update | `PATCH /api/v1/governance/domains/{id}` | OK |
| Delete | `DELETE /api/v1/governance/domains/{id}` | OK |

### 3. Dashboard

| Komponen | Data Source | Status |
|----------|-----------|--------|
| Stat Card - Organizations | `useOrganizations` → `total` | OK |
| Stat Card - Domains | `useDomains` → `total` | OK |
| Stat Card - Participants | `useParticipants` → `total` | OK |
| Stat Card - Data Transfers | Hardcoded "—" | Belum ada API |
| ParticipantsList | `useParticipants({limit:5})` | OK |
| OnboardingFlow progress | Real count dari `OnboardingContext` | OK (Updated) |
| RecentActivity | Hardcoded | Belum ada API |
| Compliance Status | Hardcoded | Belum ada API |

### 4. API Docs Page

| Fitur | Source | Status |
|-------|--------|--------|
| OpenAPI spec | `GET {backend}/openapi.json` + local fallback | OK |
| Endpoint listing | Dynamic dari spec | OK |
| Connection check | `HEAD /openapi.json` | OK |

### 5. Onboarding Wizard - Step 1 (Organization, Participant, Domain)

| Form Field | Backend API | Endpoint | Status |
|-----------|------------|----------|--------|
| `orgName`, `orgCode`, `description` | Organization API | `POST /api/v1/governance/organizations/` | OK |
| `participantName`, `participantEmail`, `participantPhone`, `participantAddress`, `orgType` | Participant API | `POST /api/v1/onboarding/participants` | OK |
| `domainName`, `domainCode`, `domainDescription` | Domain API | `POST /api/v1/governance/domains/` | OK |

### 6. Onboarding Wizard - Step 2 (Vocabulary)

| Form Field | Backend API | Endpoint | Status |
|-----------|------------|----------|--------|
| `vocabularyName`, `version`, `vocabularyDescription`, `terms[]` | Vocabulary API | `POST /api/v1/data-catalog/{domain_id}/vocabularies` | OK |

### 7. Onboarding Wizard - Step 3 (Dataset)

| Form Field | Backend API | Endpoint | Status |
|-----------|------------|----------|--------|
| `name`, `description`, `provider`, `format`, `endpoint`, `period`, `wells`, `accessLevel` | Dataset API | `POST /api/v1/data-catalog/{domain_id}/datasets` | OK |

### 8. Onboarding Wizard - Step 4 (Contract Request)

| Form Field | Backend API | Endpoint | Status |
|-----------|------------|----------|--------|
| `policies[]` | Contract Policy API | `POST /api/v1/policy-contract/{domain_id}/contract-policies` | OK |
| `title`, `provider`, `consumer`, `startDate`, `endDate`, `description` | Contract API | `POST /api/v1/policy-contract/{domain_id}/contracts` | OK |

---

## Belum Terhubung / Perlu Sync Nanti

| # | Komponen | Alasan | Status |
|---|----------|--------|--------|
| 1 | Onboarding Step 2 (Security & Identity) | Belum ada backend API atau implementasi frontend | Placeholder |
| 2 | Onboarding Step 4 (Metadata Schema) | Belum ada backend API atau implementasi frontend | Placeholder |
| 3 | Onboarding Step 6 (Policy Definition) | Belum ada backend API atau implementasi frontend | Placeholder |
| 4 | Onboarding Step 8 (Agreement & Approval) | Belum ada backend API atau implementasi frontend | Placeholder |
| 5 | Onboarding Step 9 (Monitoring) | Belum ada backend API | No API Yet |
| 6 | Datasets Page | Sudah ada service tapi data masih mix hardcoded | Needs Review |
| 7 | Contracts Page | Sudah ada service tapi data masih mix hardcoded | Needs Review |
| 8 | Data Transfer Page | Belum ada backend API | |
| 9 | Audit Page | Belum ada backend API | |
| 10 | Compliance Page | Belum ada backend API | |
| 11 | Settings Page | Belum ada backend API | |

---

## Known Bugs untuk Tim Backend

- [ ] **DELETE Organization**: path backend `/organizations/organizations/{id}` (double "organizations")
- [ ] **CREATE Contract Policy**: endpoint typo `/contract-policiess` (double "s")