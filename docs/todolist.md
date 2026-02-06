# rapiDSK Web App - Backend & UI Sync Todolist

> Terakhir diperbarui: 5 Februari 2026

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
| OnboardingFlow progress | Real count dari orgs + domains | OK |
| RecentActivity | Hardcoded | Belum ada API |
| Compliance Status | Hardcoded | Belum ada API |

### 4. API Docs Page

| Fitur | Source | Status |
|-------|--------|--------|
| OpenAPI spec | `GET {backend}/openapi.json` + local fallback | OK |
| Endpoint listing | Dynamic dari spec | OK |
| Connection check | `HEAD /openapi.json` | OK |

### 5. Onboarding Wizard - Step 1 (Organization)

| Form Field | Backend API | Endpoint |
|-----------|------------|----------|
| `orgName` → `name` | Organization API | `POST /api/v1/governance/organizations/` |
| `orgCode` → `code` | Organization API | sama |
| `description` → `description` | Organization API | sama |
| `participantName` → `contact_person.name` | Participant API | `POST /api/v1/onboarding/participants` |
| `participantEmail` → `contact_person.email` | Participant API | sama |
| `participantPhone` → `contact_person.phone` | Participant API | sama |
| `participantAddress` → `address` | Participant API | sama |
| `orgType` → `organization_type` | Participant API | KKKS→ENTERPRISE, Regulator→GOV_CENTRAL |
| `domainName` → `name` | Domain API | `POST /api/v1/governance/domains/` |
| `domainCode` → `code` | Domain API | sama |
| `domainDescription` → `description` | Domain API | sama |

### 6. Onboarding Wizard - Step 2 (Vocabulary)

| Form Field | Backend API | Endpoint |
|-----------|------------|----------|
| `vocabularyName` → `name` | Vocabulary API | `POST /api/v1/data-catalog/{domain_id}/vocabularies` |
| `version` → `version` | Vocabulary API | sama |
| `vocabularyDescription` → `description` | Vocabulary API | sama |
| `terms[].term` → `term` | Vocabulary API (nested) | sama |
| `terms[].datatype` → `datatype` | Vocabulary API (nested) | sama |
| `terms[].unit` → `unit` | Vocabulary API (nested) | sama |
| `terms[].description` → `description` | Vocabulary API (nested) | sama |

---

## Belum Terhubung / Perlu Sync Nanti

| # | Komponen | Alasan |
|---|----------|--------|
| 1 | Onboarding Step 3 (Dataset) | Form fields belum match dengan `POST /data-catalog/{domain_id}/datasets` |
| 2 | Onboarding Step 4 (Contract) | Form fields belum match dengan `POST /{domain_id}/contracts` |
| 3 | Onboarding Step 5 (Transfer) | Belum ada backend API |
| 4 | Onboarding Step 6 (Monitoring) | Belum ada backend API |
| 5 | Datasets Page | Sudah ada service tapi data masih mix hardcoded |
| 6 | Contracts Page | Sudah ada service tapi data masih mix hardcoded |
| 7 | Data Transfer Page | Belum ada backend API |
| 8 | Audit Page | Belum ada backend API |
| 9 | Compliance Page | Belum ada backend API |
| 10 | Settings Page | Belum ada backend API |

---

## Known Bugs untuk Tim Backend

- [ ] **DELETE Organization**: path backend `/organizations/organizations/{id}` (double "organizations")
- [ ] **CREATE Contract Policy**: endpoint typo `/contract-policiess` (double "s")
