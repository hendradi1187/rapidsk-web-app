```
RapiDSK_Onboarding_API_Recording_Guide.md
```

---

## 📄 **RapiDSK_Onboarding_API_Recording_Guide.md**

Silakan copy semua isi di bawah ini 👇

---

````md
# RapiDSK – Onboarding API Recording Guide
## Hulu Migas Data Space (SKK Migas – KKKS)

Version: 1.0  
Owner: Hendra Zero  
Purpose: Backend Data Recording & Audit Compliance

---

## 1. Overview

Dokumen ini menjelaskan seluruh data yang WAJIB direkam oleh backend API
dalam proses onboarding 9 langkah RapiDSK agar:

- Audit-ready
- Compliance-ready
- Traceable end-to-end
- Sesuai standar Hulu Migas

Semua data terikat ke satu entitas utama:
`Onboarding Instance`.

---

## 2. Master Entity – Onboarding

Semua step terhubung ke entity berikut:

```json
{
  "id": "ONB-2026-001",
  "providerOrgId": "ORG001",
  "consumerOrgId": "ORG002",
  "status": "DRAFT | REVIEW | APPROVED | ACTIVE | ARCHIVED",
  "currentStep": 5,
  "createdBy": "user123",
  "createdAt": "2026-02-01T10:00",
  "updatedAt": "2026-02-05T09:00"
}
````

---

## 3. Step 1 – Organization

### Entity: Organization

```json
{
  "orgId": "ORG001",
  "name": "PT Minyak Nusantara",
  "code": "MNI",
  "type": "KKKS",
  "units": ["Produksi","Reservoir"],
  "pic": {
    "name": "Budi",
    "email": "budi@org.com"
  },
  "legalDocs": ["akta.pdf"],
  "status": "ACTIVE"
}
```

### Record Mandatory

* Org owner
* File metadata
* Timestamp

---

## 4. Step 2 – Security & Identity

### Entity: SecurityProfile

```json
{
  "orgId": "ORG001",
  "authType": "OIDC | SAML | LOCAL",
  "idpUrl": "https://idp.org.com",
  "certHash": "abc123",
  "tlsValidUntil": "2027-01-01",
  "mfaEnabled": true,
  "lastTest": "2026-02-01"
}
```

### Record Mandatory

* Cert fingerprint
* Test result
* Expiry date

---

## 5. Step 3 – Vocabulary

### Entity: Vocabulary

```json
{
  "termId": "VOC001",
  "term": "lifting",
  "definition": "Oil lifting volume",
  "domain": "production",
  "version": "1.0",
  "approvedBy": "user123"
}
```

### Record Mandatory

* Version history
* Approval log

---

## 6. Step 4 – Metadata Schema

### Entity: Schema

```json
{
  "schemaId": "SCH01",
  "name": "Well Production",
  "fields": [
    {
      "name": "well",
      "type": "string",
      "required": true
    }
  ],
  "version": "1.0",
  "published": true
}
```

### Record Mandatory

* JSON-LD mapping
* Deprecated flag

---

## 7. Step 5 – Dataset Registration

### Entity: Dataset

```json
{
  "datasetId": "DS01",
  "orgId": "ORG001",
  "name": "Daily Production",
  "endpoint": "https://geo.org/wms",
  "type": "WMS",
  "schemaId": "SCH01",
  "classification": "RESTRICTED",
  "status": "REGISTERED"
}
```

### Record Mandatory

* Health check logs
* Sample hash
* Last sync time

---

## 8. Step 6 – Policy Definition

### Entity: Policy

```json
{
  "policyId": "POL01",
  "datasetId": "DS01",
  "scope": "INTERNAL",
  "retention": "5Y",
  "shareable": false,
  "approvedBy": "legal01"
}
```

### Record Mandatory

* Policy version
* Legal approver

---

## 9. Step 7 – Contract Request

### Entity: Contract

```json
{
  "contractId": "CTR01",
  "datasetId": "DS01",
  "consumerOrgId": "ORG002",
  "purpose": "Monitoring",
  "period": "2026",
  "status": "REQUESTED"
}
```

### Record Mandatory

* Revision history
* Negotiation notes

---

## 10. Step 8 – Agreement & Signature

### Entity: Agreement

```json
{
  "agreementId": "AGR01",
  "contractId": "CTR01",
  "signedBy": [
    {
      "org": "ORG001",
      "user": "legal1"
    },
    {
      "org": "ORG002",
      "user": "legal2"
    }
  ],
  "signedAt": "2026-02-01",
  "ipAddress": "10.1.1.1",
  "pdfUrl": "/docs/agr01.pdf"
}
```

### Record Mandatory

* IP address
* Timestamp
* Signature hash

---

## 11. Step 9 – Monitoring & Transfer

### Entity: TransferLog

```json
{
  "logId": "LOG01",
  "datasetId": "DS01",
  "mode": "BATCH | STREAMING",
  "startedAt": "2026-02-01T10:00",
  "endedAt": "2026-02-01T10:05",
  "status": "SUCCESS"
}
```

### Entity: SLARecord

```json
{
  "datasetId": "DS01",
  "availability": 99.8,
  "lastViolation": null
}
```

### Record Mandatory

* Failure reason
* Retry count

---

## 12. Global Audit Log (Mandatory)

### Entity: AuditLog

Setiap API call harus masuk audit.

```json
{
  "id": "AUD01",
  "actorId": "user123",
  "action": "CREATE_DATASET",
  "entity": "Dataset",
  "entityId": "DS01",
  "oldValue": null,
  "newValue": "{}",
  "timestamp": "2026-02-01T10:00",
  "ip": "10.1.1.1"
}
```

### Mandatory Fields

* Actor
* Action
* Entity
* Before/After
* Timestamp
* IP

---

## 13. Minimum API Endpoint Pattern

```
POST   /onboarding
GET    /onboarding/{id}

POST   /organizations
POST   /security
POST   /vocab
POST   /schemas
POST   /datasets
POST   /policies
POST   /contracts
POST   /agreements
POST   /transfer/log

GET    /monitoring/sla
GET    /audit
```

---

## 14. Compliance Checklist

Backend wajib bisa:

* Trace dataset → contract → agreement → transfer
* Menampilkan siapa approve apa
* Export full history
* Rekonstruksi keputusan

Jika tidak → gagal audit.

---

## 15. Data Retention

| Data Type    | Retention |
| ------------ | --------- |
| Audit Log    | ≥ 5 Tahun |
| Contract     | Permanen  |
| Agreement    | Permanen  |
| Transfer Log | ≥ 3 Tahun |
| Security Log | ≥ 2 Tahun |

---

## 16. Final Note

Dokumen ini adalah baseline teknis.

Setiap implementasi harus:

* Immutable logs
* Versioned entities
* Role-validated API
* Secure storage

Disetujui oleh:
Product Owner & Governance Team

```

---


```
