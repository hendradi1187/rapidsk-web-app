# Onboarding Wizard - Form to API Mapping Review

**Generated:** 2026-02-09
**Project:** rapiDSK Web App
**Purpose:** Comprehensive review of all onboarding wizard forms to ensure field alignment with backend API requirements

---

## Executive Summary

**Total Steps:** 9
**Fully Implemented:** 4 (Steps 1, 3, 5, 9)
**Partially Implemented:** 1 (Step 7 - has code errors)
**Placeholder Only:** 4 (Steps 2, 4, 6, 8)

### Critical Issues Found: 8
- ❌ **4 steps have no UI implementation** (Steps 2, 4, 6, 8)
- ❌ **Step 7 has undefined type references** (build-breaking)
- ❌ **Step 2 missing password field** for user creation
- ❌ **Step 4 sends empty metadata_schemas array** to API
- ❌ **Step 8 fields (digitalSignature, approved) not used**

### High Priority Issues: 3
- ⚠️ **Domain parameter inconsistency** (Steps 1, 5, 7) - sends domainName instead of domain ID
- ⚠️ **SSO/TLS settings** (Step 2) - collected but not sent anywhere
- ⚠️ **Schema metadata** (Step 4) - collected but not used

---

## Detailed Analysis by Step

---

## Step 1: Setup Organization ✅

**Status:** ✅ **FULLY IMPLEMENTED**

### Form Fields
```typescript
- orgName: string (3-255 chars)
- orgCode: string (2-20 chars)
- orgType: "KKKS" | "Regulator" | "ServiceProvider"
- description: string (10-500 chars)
- participantName: string (2+ chars)
- participantEmail: string (email)
- participantPhone: string (5+ chars)
- participantAddress: string (5+ chars)
- participantRole: "Admin" | "DataSteward" | "Viewer"
- domainName: string (3-255 chars)
- domainCode: string (2-20 chars)
- domainDescription: string (10-500 chars)
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| orgName | `/governance/organizations/` | name | ✅ |
| orgCode | `/governance/organizations/` | code | ✅ |
| description | `/governance/organizations/` | description | ✅ |
| participantName | `/onboarding/participants` | contact_person.name | ✅ |
| participantEmail | `/onboarding/participants` | contact_person.email | ✅ |
| participantPhone | `/onboarding/participants` | contact_person.phone | ✅ |
| participantAddress | `/onboarding/participants` | address | ✅ |
| orgType | `/onboarding/participants` | organization_type (mapped) | ✅ |
| participantRole | *(unused in Step 1)* | *(used in Step 2)* | ⚠️ |
| domainName | `/governance/organizations/{id}/domains` | name | ✅ |
| domainCode | `/governance/organizations/{id}/domains` | code | ✅ |
| domainDescription | `/governance/organizations/{id}/domains` | description | ✅ |

### Type Mapping Function
```typescript
const mapOrgType = (orgType: string): ParticipantOrganizationType => {
  switch (orgType) {
    case "KKKS": return "ENTERPRISE";
    case "Regulator": return "GOV_CENTRAL";
    case "ServiceProvider": return "ENTERPRISE";
    default: return "ENTERPRISE";
  }
};
```

### Issues
- ⚠️ **participantRole** collected but not used until Step 2

### Recommendation
✅ No critical changes needed - implementation is correct

---

## Step 2: Security & Identity ❌

**Status:** ❌ **PLACEHOLDER - NO FORM UI**

### Expected Fields (from schema)
```typescript
- ssoType: "OIDC" | "SAML" | "None" (default: "None")
- tlsEnabled: boolean (default: true)
- twoFactorAuth: boolean (default: false)
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| participantEmail (Step 1) | `/identity-provider/users/` | email | ✅ |
| participantName (Step 1) | `/identity-provider/users/` | name | ✅ |
| participantRole (Step 1) | `/identity-provider/users/` | role | ✅ |
| twoFactorAuth | `/identity-provider/users/` | two_factor_enabled | ✅ |
| organizationId (context) | `/identity-provider/users/` | organization_id | ✅ |
| *(missing)* | `/identity-provider/users/` | password | ❌ |
| ssoType | *(no endpoint)* | - | ❌ |
| tlsEnabled | *(no endpoint)* | - | ❌ |

### User API Request
```typescript
POST /api/v1/identity-provider/users/
{
  email: "user@example.com",        // ✅ from Step 1
  name: "User Name",                // ✅ from Step 1
  role: "admin",                    // ✅ from Step 1
  organization_id: "org-123",       // ✅ from context
  is_active: true,                  // ✅ hardcoded
  two_factor_enabled: false,        // ✅ from form
  password: ???                     // ❌ MISSING!
}
```

### Issues
- ❌ **CRITICAL:** No form UI implementation (placeholder component only)
- ❌ **CRITICAL:** Password field not collected but required by API
- ⚠️ ssoType and tlsEnabled collected in schema but not sent anywhere
- ⚠️ No SSO configuration endpoint exists

### Recommendation
```
Priority: 🔴 CRITICAL

1. Implement form UI with:
   - SSO Type selector (OIDC/SAML/None)
   - TLS Enabled toggle
   - Two-Factor Auth toggle

2. Add password field OR:
   - Use auto-generated password + email verification flow
   - Use SSO-only authentication (no local password)

3. Create SSO configuration endpoint in backend for ssoType and tlsEnabled
```

---

## Step 3: Define Vocabulary ✅

**Status:** ✅ **FULLY IMPLEMENTED**

### Form Fields
```typescript
- vocabularyName: string (3+ chars)
- version: string (default: "1.0.0")
- vocabularyDescription: string (optional)
- terms: array (min 1):
  - term: string
  - datatype: string
  - unit: string (optional)
  - description: string (10+ chars, optional)
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| vocabularyName | `/data-catalog/{domain_id}/vocabularies` | name | ✅ |
| version | `/data-catalog/{domain_id}/vocabularies` | version | ✅ |
| vocabularyDescription | `/data-catalog/{domain_id}/vocabularies` | description | ✅ |
| terms[] | `/data-catalog/{domain_id}/vocabularies` | terms[] | ✅ |
| terms[].term | - | terms[].term | ✅ |
| terms[].datatype | - | terms[].datatype | ✅ |
| terms[].unit | - | terms[].unit | ✅ |
| terms[].description | - | terms[].description | ✅ |

### Issues
✅ None - perfect implementation

### Recommendation
✅ No changes needed

---

## Step 4: Metadata Schema ❌

**Status:** ❌ **PLACEHOLDER - NO FORM UI**

### Expected Fields (from schema)
```typescript
- schemaName: string (3+ chars)
- schemaType: "DCAT" | "JSON-LD" | "Custom" (default: "DCAT")
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| vocabularyId (context) | `/data-catalog/{domain_id}/schemas` | vocabulary_id | ✅ |
| *(hardcoded)* "1.0.0" | `/data-catalog/{domain_id}/schemas` | version | ✅ |
| *(hardcoded)* "ACTIVE" | `/data-catalog/{domain_id}/schemas` | status | ✅ |
| schemaName | *(not sent)* | - | ❌ |
| schemaType | *(not sent)* | - | ❌ |
| *(missing)* | `/data-catalog/{domain_id}/schemas` | metadata_schemas[] | ❌ |

### Current API Call
```typescript
POST /api/v1/data-catalog/{domain_id}/schemas
{
  vocabulary_id: "vocab-123",       // ✅ from Step 3
  version: "1.0.0",                 // ✅ hardcoded
  status: "ACTIVE",                 // ✅ hardcoded
  metadata_schemas: []              // ❌ EMPTY ARRAY!
}
```

### Required API Structure
```typescript
{
  vocabulary_id: string,
  version: string,
  status: "ACTIVE" | "INACTIVE",
  metadata_schemas: [              // ❌ Currently empty!
    {
      vocabulary_term_id: string,  // Link to vocabulary terms
      required: boolean,
      cardinality: "ONE" | "MANY"
    }
  ]
}
```

### Issues
- ❌ **CRITICAL:** No form UI implementation
- ❌ **CRITICAL:** metadata_schemas sent as empty array (should map vocabulary terms)
- ❌ schemaName and schemaType defined but not used

### Recommendation
```
Priority: 🔴 CRITICAL

1. Implement form UI with:
   - Schema Name input
   - Schema Type selector (DCAT/JSON-LD/Custom)
   - Vocabulary Term Mapper:
     - Show terms from Step 3
     - For each term, select:
       - Required (checkbox)
       - Cardinality (ONE/MANY)

2. Populate metadata_schemas array with vocabulary term mappings

3. Consider auto-populating all terms from Step 3 with default settings
```

---

## Step 5: Register Dataset ✅

**Status:** ✅ **FULLY IMPLEMENTED**

### Form Fields
```typescript
- name: string (3-100 chars)
- description: string (0-500 chars, optional)
- provider: string
- format: "WMS" | "WFS" | "WCS"
- endpoint: string (URL)
- period: string
- wells: number (optional, min 0)
- accessLevel: "public" | "restricted" | "confidential"
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| name | `/data-catalog/{domain_id}/datasets` | name | ✅ |
| provider | `/data-catalog/{domain_id}/datasets` | provider | ✅ |
| format | `/data-catalog/{domain_id}/datasets` | format | ✅ |
| endpoint | `/data-catalog/{domain_id}/datasets` | endpoint | ✅ |
| period | `/data-catalog/{domain_id}/datasets` | period | ✅ |
| wells | `/data-catalog/{domain_id}/datasets` | wells | ✅ |
| description | `/data-catalog/{domain_id}/datasets` | description | ✅ |
| accessLevel | `/data-catalog/{domain_id}/datasets` | accessLevel | ✅ |
| domainName (context) | `/data-catalog/{domain_id}/datasets` | domain | ⚠️ |

### Issues
- ⚠️ **domain parameter:** Sends `formData.organization?.domainName` but unclear if API expects domain ID or domain name string

### Recommendation
```
Priority: ⚠️ HIGH

Clarify with backend team:
- Should `domain` parameter be domain ID (string) or domain name?
- If domain ID needed, change line 364 in OnboardingContext.tsx:

  FROM:
  domain: formData.organization?.domainName || ""

  TO:
  domain: domainId  // or createdIds.domainId
```

---

## Step 6: Policy Definition ❌

**Status:** ❌ **PLACEHOLDER - NO FORM UI**

### Expected Fields (from schema)
```typescript
- policyName: string (3+ chars)
- policyTemplate: "AllowAll" | "DenyAll" | "Restricted" (default: "Restricted")
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| policyName | `/policy-contract/{domain_id}/dataset-policies` | name | ✅ |
| policyTemplate | `/policy-contract/{domain_id}/dataset-policies` | type | ✅ |
| *(auto-generated)* | `/policy-contract/{domain_id}/dataset-policies` | rules[] | ✅ |
| *(hardcoded)* "1.0.0" | `/policy-contract/{domain_id}/dataset-policies` | version | ✅ |

### Rule Generation Logic
```typescript
const getRules = (template: string) => {
  switch (template) {
    case "AllowAll":
      return [{ action: "READ", effect: "ALLOW", condition: "*" }];

    case "DenyAll":
      return [{ action: "*", effect: "DENY", condition: "*" }];

    case "Restricted":
    default:
      return [
        { action: "READ", effect: "ALLOW", condition: "authenticated" },
        { action: "WRITE", effect: "DENY", condition: "*" }
      ];
  }
};
```

### Issues
- ❌ **CRITICAL:** No form UI implementation
- ⚠️ Rules are template-based only (no custom rule editor)

### Recommendation
```
Priority: 🔴 CRITICAL

1. Implement form UI with:
   - Policy Name input
   - Policy Template selector

2. Optional Enhancement:
   - Add advanced rule editor for custom policies
   - Allow users to add/edit/remove individual rules
```

---

## Step 7: Contract Request ⚠️

**Status:** ⚠️ **IMPLEMENTED BUT HAS CODE ERRORS**

### Form Fields
```typescript
- title: string (3+ chars)
- provider: string
- consumer: string
- startDate: string (date)
- endDate: string (date, optional)
- description: string (0-500 chars, optional)
- policies: array (min 1):
  - name: string
  - dataClassification: string
  - description: string (optional)
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| title | `/policy-contract/{domain_id}/contracts` | title | ✅ |
| provider | `/policy-contract/{domain_id}/contracts` | provider | ✅ |
| consumer | `/policy-contract/{domain_id}/contracts` | consumer | ✅ |
| startDate | `/policy-contract/{domain_id}/contracts` | startDate | ✅ |
| endDate | `/policy-contract/{domain_id}/contracts` | endDate | ✅ |
| description | `/policy-contract/{domain_id}/contracts` | description | ✅ |
| domainName (context) | `/policy-contract/{domain_id}/contracts` | domain | ⚠️ |
| policyIds[] (generated) | `/policy-contract/{domain_id}/contracts` | contract_policies | ✅ |
| policies[].name | `/policy-contract/{domain_id}/contract-policies` | name | ✅ |
| policies[].dataClassification | `/policy-contract/{domain_id}/contract-policies` | data_clasification | ✅ |
| policies[].description | `/policy-contract/{domain_id}/contract-policies` | description | ✅ |

### Code Error
```typescript
// File: ContractRequestStep.tsx (lines 25-26)
const form = useForm<ContractFormValues>({      // ❌ UNDEFINED TYPE
  resolver: zodResolver(contractSchema),         // ❌ UNDEFINED SCHEMA
```

**Should be:**
```typescript
const form = useForm<ContractRequestFormValues>({
  resolver: zodResolver(contractRequestSchema),
```

### Issues
- ❌ **CRITICAL:** Undefined type references will cause build errors
- ⚠️ **domain parameter:** Same issue as Step 5 (sends domainName instead of domain ID)
- ⚠️ **API Typo:** Backend uses "data_clasification" (misspelled) - handled correctly in context

### Recommendation
```
Priority: 🔴 CRITICAL

1. Fix type references in ContractRequestStep.tsx:
   - Change ContractFormValues → ContractRequestFormValues
   - Change contractSchema → contractRequestSchema

2. Same domain parameter issue as Step 5 - clarify with backend

3. Note: API typo "data_clasification" is handled correctly in context
```

---

## Step 8: Agreement & Approval ❌

**Status:** ❌ **PLACEHOLDER - NO FORM UI**

### Expected Fields (from schema)
```typescript
- digitalSignature: string
- approved: boolean (must be true)
```

### API Mapping
| Form Field | API Endpoint | API Field | Status |
|------------|--------------|-----------|--------|
| contractId (context) | `/policy-contract/{domain_id}/agreements` | contract_id | ✅ |
| startDate (Step 7) | `/policy-contract/{domain_id}/agreements` | effective_from | ✅ |
| endDate (Step 7 or +1yr) | `/policy-contract/{domain_id}/agreements` | effective_to | ✅ |
| digitalSignature | *(not sent)* | - | ❌ |
| approved | *(not sent)* | - | ❌ |

### Current Implementation
```typescript
// Agreement created with contract dates
const agreement = await agreementsApi.create(domainId, {
  contract_id: contractId,
  effective_from: contractData.startDate,
  effective_to: contractData.endDate || /* calculated +1 year */
});

// digitalSignature and approved are only logged, not sent
console.log("Agreement created:", {
  agreementId: agreement.id,
  contractId,
  digitalSignature: formData.agreement.digitalSignature,  // ❌ Not sent to API
  approved: formData.agreement.approved,                   // ❌ Not sent to API
});
```

### Issues
- ❌ **CRITICAL:** No form UI implementation
- ❌ digitalSignature and approved fields defined in schema but not captured or sent
- ⚠️ No digital signature validation or storage

### Recommendation
```
Priority: 🔴 CRITICAL

1. Implement form UI with:
   - Digital signature input field
   - Approval checkbox (must be checked to proceed)
   - Display contract summary for review

2. Capture and store signature data:
   - Add signature field to agreement metadata, OR
   - Create separate endpoint for digital signatures

3. Consider implementing:
   - Digital signature verification
   - Signature timestamp
   - Signature certificate/key storage
```

---

## Step 9: Monitoring & Go-Live ✅

**Status:** ✅ **FULLY IMPLEMENTED** (localStorage pending backend)

### Form Fields
```typescript
- enableAuditLog: boolean (default: true)
- retentionPeriod: number (30-365 days)
- alertEmail: string (email, optional)
- complianceFrameworks: string[] (min 1)
  Options: ["ISO27001", "COBIT", "SKKMigas", "ITIL4"]
- enableRealTimeAlerts: boolean (default: false)
```

### API Mapping (localStorage)
| Form Field | Storage Location | Field | Status |
|------------|------------------|-------|--------|
| enableAuditLog | localStorage | enableAuditLog | ✅ |
| retentionPeriod | localStorage | retentionPeriod | ✅ |
| alertEmail | localStorage | alertEmail | ✅ |
| complianceFrameworks | localStorage | complianceFrameworks | ✅ |
| enableRealTimeAlerts | localStorage | enableRealTimeAlerts | ✅ |
| domainId (context) | localStorage | domainId | ✅ |
| *(auto-generated)* | localStorage | configuredAt | ✅ |

### LocalStorage Structure
```typescript
// Key: `rapidsk-monitoring-{domainId}`
{
  domainId: "domain-123",
  enableAuditLog: true,
  retentionPeriod: 90,
  alertEmail: "admin@example.com",
  complianceFrameworks: ["ISO27001", "COBIT"],
  enableRealTimeAlerts: true,
  configuredAt: "2024-01-01T12:00:00Z"
}
```

### Issues
- ⚠️ No backend API endpoint (currently uses localStorage)
- ✅ All fields properly collected and stored
- ✅ Form UI fully functional

### Recommendation
```
Priority: ⚠️ MEDIUM (pending backend)

When backend monitoring API is ready, replace localStorage with:

// New file: src/api/services/monitoring.ts
export const monitoringApi = {
  configure: async (domainId: string, config: MonitoringConfig) => {
    return await apiClient.post(
      `/api/v1/monitoring/${domainId}/config`,
      config
    );
  },

  get: async (domainId: string) => {
    return await apiClient.get(
      `/api/v1/monitoring/${domainId}/config`
    );
  }
};

// Update OnboardingContext.tsx line 485-509
await monitoringApi.configure(domainId, monitoringConfig);
```

---

## Summary Tables

### Form Completion Status

| Step | Component | Form UI | Schema | API | Status |
|------|-----------|---------|--------|-----|--------|
| 1 | SetupOrganizationStep | ✅ | ✅ | ✅ | COMPLETE |
| 2 | SecurityIdentityStep | ❌ | ✅ | ⚠️ | PLACEHOLDER |
| 3 | DefineVocabularyStep | ✅ | ✅ | ✅ | COMPLETE |
| 4 | MetadataSchemaStep | ❌ | ✅ | ❌ | PLACEHOLDER |
| 5 | RegisterDatasetStep | ✅ | ✅ | ✅ | COMPLETE |
| 6 | PolicyDefinitionStep | ❌ | ✅ | ⚠️ | PLACEHOLDER |
| 7 | ContractRequestStep | ✅ | ✅ | ❌ | CODE ERROR |
| 8 | AgreementApprovalStep | ❌ | ✅ | ⚠️ | PLACEHOLDER |
| 9 | MonitoringGoLiveStep | ✅ | ✅ | ⚠️ | COMPLETE |

### Issues by Priority

#### 🔴 CRITICAL (Must Fix)
| # | Step | Issue | Impact |
|---|------|-------|--------|
| 1 | 2 | No form UI implementation | Cannot configure security settings |
| 2 | 2 | Missing password field | User creation will fail |
| 3 | 4 | No form UI implementation | Cannot configure metadata schema |
| 4 | 4 | Empty metadata_schemas array | Schema creation incomplete |
| 5 | 6 | No form UI implementation | Cannot define policies |
| 6 | 7 | Undefined type references | TypeScript/build errors |
| 7 | 8 | No form UI implementation | Cannot approve agreements |
| 8 | 8 | Signature fields not used | Digital signature not captured |

#### ⚠️ HIGH (Should Fix)
| # | Step | Issue | Impact |
|---|------|-------|--------|
| 1 | 1, 5, 7 | domain parameter ambiguity | May send wrong data format |
| 2 | 2 | SSO/TLS settings not sent | Configuration lost |
| 3 | 4 | schemaName/Type not used | User input ignored |

#### ℹ️ LOW (Nice to Have)
| # | Step | Issue | Impact |
|---|------|-------|--------|
| 1 | 6 | Template-only rules | Limited customization |
| 2 | 9 | localStorage instead of API | Config not persisted on server |

---

## Action Items

### Immediate (Before Production)
1. ✅ Implement Step 2 form UI (Security & Identity)
2. ✅ Implement Step 4 form UI (Metadata Schema)
3. ✅ Implement Step 6 form UI (Policy Definition)
4. ✅ Implement Step 8 form UI (Agreement & Approval)
5. ✅ Fix Step 7 type references (ContractFormValues → ContractRequestFormValues)
6. ✅ Add password field to Step 2 or implement passwordless flow
7. ✅ Populate metadata_schemas array in Step 4
8. ✅ Capture and use digitalSignature in Step 8

### High Priority
1. ⚠️ Clarify domain parameter format with backend team
2. ⚠️ Create SSO configuration endpoint for Step 2
3. ⚠️ Use schemaName and schemaType in Step 4 API call

### Nice to Have
1. ℹ️ Add custom rule editor for Step 6
2. ℹ️ Create backend monitoring API for Step 9

---

## Files Reviewed

### Components
- `src/components/onboarding/OnboardingWizard.tsx`
- `src/components/onboarding/OnboardingContext.tsx`
- `src/components/onboarding/steps/SetupOrganizationStep.tsx`
- `src/components/onboarding/steps/SecurityIdentityStep.tsx`
- `src/components/onboarding/steps/DefineVocabularyStep.tsx`
- `src/components/onboarding/steps/MetadataSchemaStep.tsx`
- `src/components/onboarding/steps/RegisterDatasetStep.tsx`
- `src/components/onboarding/steps/PolicyDefinitionStep.tsx`
- `src/components/onboarding/steps/ContractRequestStep.tsx`
- `src/components/onboarding/steps/AgreementApprovalStep.tsx`
- `src/components/onboarding/steps/MonitoringGoLiveStep.tsx`

### Schemas
- `src/components/onboarding/schemas/onboarding.schemas.ts`

### API Types
- `src/api/types/governance.ts`
- `src/api/types/onboarding.ts`
- `src/api/types/data-catalog.ts`
- `src/api/types/policy-contract.ts`
- `src/api/types/identity-provider.ts`

### API Services
- `src/api/services/governance.ts`
- `src/api/services/onboarding.ts`
- `src/api/services/data-catalog.ts`
- `src/api/services/policy-contract.ts`
- `src/api/services/identity-provider.ts`

---

## Conclusion

The onboarding wizard has a solid foundation with **4 out of 9 steps fully implemented** (Steps 1, 3, 5, 9). However, **4 steps are placeholder-only** (Steps 2, 4, 6, 8) and **1 step has code errors** (Step 7).

**To make the onboarding wizard production-ready, all placeholder steps must be implemented with proper form UIs and all critical issues must be resolved.**

Estimated effort to complete all missing implementations: **16-24 hours** of development work.
