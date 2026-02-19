import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { organizationsApi, domainsApi } from "@/api/services/governance";
import { participantsApi } from "@/api/services/onboarding";
import {
  vocabulariesApi,
  datasetsApi,
  schemasApi,
  metadataSchemasApi
} from "@/api/services/data-catalog";
import {
  contractsApi,
  contractPoliciesApi,
  datasetPoliciesApi,
  agreementsApi
} from "@/api/services/policy-contract";
import { usersService } from "@/api/services/identity-provider";
import { monitoringApi } from "@/api/services/monitoring";
import type { MonitoringConfigCreateRequest } from "@/api/types/monitoring";

import type { ParticipantOrganizationType } from "@/api/types/onboarding";
import {
  OrganizationFormValues,
  SecurityFormValues,
  VocabularyFormValues,
  MetadataSchemaFormValues,
  DatasetFormValues,
  PolicyDefinitionFormValues,
  ContractRequestFormValues,
  AgreementFormValues,
  MonitoringFormValues,
} from "./schemas/onboarding.schemas";


// Renaming for clarity and consistency
export type OrganizationStepData = OrganizationFormValues;
export type SecurityStepData = SecurityFormValues;
export type VocabularyStepData = VocabularyFormValues;
export type MetadataSchemaStepData = MetadataSchemaFormValues;
export type DatasetStepData = DatasetFormValues;
export type PolicyDefinitionStepData = PolicyDefinitionFormValues;
export type ContractRequestStepData = ContractRequestFormValues;
export type AgreementStepData = AgreementFormValues;
export type MonitoringStepData = MonitoringFormValues;

export interface OnboardingFormData {
  organization: OrganizationStepData | null;
  security: SecurityStepData | null;
  vocabulary: VocabularyStepData | null;
  metadataSchema: MetadataSchemaStepData | null;
  dataset: DatasetStepData | null;
  policy: PolicyDefinitionStepData | null;
  contractRequest: ContractRequestStepData | null;
  agreement: AgreementStepData | null;
  monitoring: MonitoringStepData | null;
}

// IDs created during onboarding flow, used to chain steps
interface CreatedIds {
  organizationId?: string;
  participantId?: string;
  domainId?: string;
  userId?: string; // User created for security/identity
  vocabularyId?: string;
  vocabularyTermIds?: string[]; // IDs of terms created with vocabulary
  schemaId?: string; // Metadata schema
  datasetId?: string;
  datasetPolicyId?: string; // Dataset policy
  contractId?: string;
  agreementId?: string; // Agreement
  contractPolicyIds?: string[];
}

interface SubmissionResult {
  success: boolean;
  organizationId?: string;
  datasetId?: string;
  contractId?: string;
  message?: string;
  errors?: string[];
}

interface OnboardingContextType {
  currentStep: number;
  completedSteps: Set<number>;
  formData: OnboardingFormData;
  createdIds: CreatedIds;
  totalSteps: number;
  goToStep: (step: number) => void;
  nextStep: () => void;
  previousStep: () => void;
  updateStepData: <K extends keyof OnboardingFormData>(
    step: K,
    data: OnboardingFormData[K]
  ) => void;
  markStepComplete: (step: number) => void;
  resetWizard: () => void;
  isStepAccessible: (step: number) => boolean;
  // Backend integration
  isSubmitting: boolean;
  submissionError: string | null;
  submissionResult: SubmissionResult | null;
  isOnboardingComplete: boolean;
  submitOnboarding: () => Promise<SubmissionResult>;
  saveStepToBackend: (step: keyof OnboardingFormData) => Promise<boolean>;
}

const STORAGE_KEY = "rapidsk-onboarding-state-v2"; // Version up
const TOTAL_STEPS = 9;

const initialFormData: OnboardingFormData = {
  organization: null,
  security: null,
  vocabulary: null,
  metadataSchema: null,
  dataset: null,
  policy: null,
  contractRequest: null,
  agreement: null,
  monitoring: null,
};

const OnboardingContext = createContext<OnboardingContextType | null>(null);

interface StoredState {
  currentStep: number;
  completedSteps: number[];
  formData: OnboardingFormData;
  createdIds: CreatedIds;
}

const loadFromStorage = (): StoredState | null => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      return JSON.parse(stored);
    }
  } catch (e) {
    console.error("Failed to load onboarding state:", e);
  }
  return null;
};

const saveToStorage = (state: StoredState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.error("Failed to save onboarding state:", e);
  }
};

// Map form orgType to backend ParticipantOrganizationType
const mapOrgType = (orgType: string): ParticipantOrganizationType => {
  switch (orgType) {
    case "KKKS":
      return "ENTERPRISE";
    case "Regulator":
      return "GOV_CENTRAL";
    case "ServiceProvider":
      return "ENTERPRISE";
    default:
      return "ENTERPRISE";
  }
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);
  const [createdIds, setCreatedIds] = useState<CreatedIds>({});

  // Backend integration states
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState<string | null>(null);
  const [submissionResult, setSubmissionResult] = useState<SubmissionResult | null>(null);
  const [isOnboardingComplete, setIsOnboardingComplete] = useState(false);

  // Load saved state on mount
  useEffect(() => {
    const savedState = loadFromStorage();
    if (savedState) {
      setCurrentStep(savedState.currentStep);
      setCompletedSteps(new Set(savedState.completedSteps));
      setFormData(savedState.formData);
      if (savedState.createdIds) {
        setCreatedIds(savedState.createdIds);
      }
    }
  }, []);

  // Save state on changes
  useEffect(() => {
    const state: StoredState = {
      currentStep,
      completedSteps: Array.from(completedSteps),
      formData,
      createdIds,
    };
    saveToStorage(state);
  }, [currentStep, completedSteps, formData, createdIds]);

  const isStepAccessible = (step: number): boolean => {
    if (step === 0) return true;
    if (completedSteps.has(step)) return true;
    return completedSteps.has(step - 1);
  };

  const goToStep = (step: number) => {
    if (step >= 0 && step < TOTAL_STEPS && isStepAccessible(step)) {
      setCurrentStep(step);
    }
  };

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const previousStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const updateStepData = <K extends keyof OnboardingFormData>(
    step: K,
    data: OnboardingFormData[K]
  ) => {
    setFormData((prev) => ({
      ...prev,
      [step]: data,
    }));
  };

  const markStepComplete = (step: number) => {
    setCompletedSteps((prev) => new Set([...prev, step]));
  };

  const resetWizard = () => {
    setCurrentStep(0);
    setCompletedSteps(new Set());
    setFormData(initialFormData);
    setCreatedIds({});
    setIsOnboardingComplete(false);
    setSubmissionResult(null);
    setSubmissionError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // This function is a placeholder for a potential "save as draft" feature per step
  const saveStepToBackend = async (step: keyof OnboardingFormData): Promise<boolean> => {
    console.log(`Pretending to save step ${step} to backend. Not implemented.`);
    return true;
  };

  // Submit all onboarding data to backend
  const submitOnboarding = async (): Promise<SubmissionResult> => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const errors: string[] = [];
    let { organizationId, domainId, datasetId, contractId } = createdIds;

    try {
      // Step 1: Organization, Participant, Domain
      if (formData.organization && !organizationId) {
        try {
          const org = await organizationsApi.create({
            name: formData.organization.orgName,
            code: formData.organization.orgCode,
            description: formData.organization.description,
          });
          organizationId = org.id;

          await participantsApi.create({
            organization_name: formData.organization.orgName,
            organization_type: mapOrgType(formData.organization.orgType),
            address: formData.organization.participantAddress,
            contact_person: {
              name: formData.organization.participantName,
              email: formData.organization.participantEmail,
              phone: formData.organization.participantPhone,
            },
          });

          const domain = await domainsApi.create(org.id, {
            name: formData.organization.domainName,
            code: formData.organization.domainCode,
            description: formData.organization.domainDescription,
            status: "ACTIVE",
          });
          domainId = domain.id;

          setCreatedIds((prev) => ({ ...prev, organizationId, domainId }));
        } catch (error) {
          errors.push(`Organization: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }

      // Step 2: Security & Identity
      if (formData.security && formData.organization && !createdIds.userId) {
        try {
          // Create a user for the organization with security settings
          // Note: This is a simplified approach. In a real scenario, SSO config
          // would be handled by a dedicated identity provider configuration endpoint
          const mapRole = (role: string): "admin" | "user" | "viewer" => {
            if (role === "Admin") return "admin";
            if (role === "Viewer") return "viewer";
            return "user"; // DataSteward → user
          };

          const user = await usersService.create({
            email: formData.organization.participantEmail,
            name: formData.organization.participantName,
            role: mapRole(formData.organization.participantRole),
            ...(formData.security.password ? { password: formData.security.password } : {}),
            status: "active",
          });
          setCreatedIds((prev) => ({ ...prev, userId: user.id }));
          console.log("Security configured:", {
            userId: user.id,
            ssoType: formData.security.ssoType,
            tlsEnabled: formData.security.tlsEnabled,
            twoFactorAuth: formData.security.twoFactorAuth,
          });
        } catch (error) {
          errors.push(`Security: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }
      
      // Step 3: Vocabulary
      if (formData.vocabulary && domainId && !createdIds.vocabularyId) {
        try {
          const vocabData = formData.vocabulary;
          const vocabulary = await vocabulariesApi.create(domainId, {
            name: vocabData.vocabularyName,
            version: vocabData.version,
            description: vocabData.vocabularyDescription || null,
            terms: vocabData.terms,
          });
          setCreatedIds((prev) => ({
            ...prev,
            vocabularyId: vocabulary.id,
            vocabularyTermIds: vocabulary.terms.map((t) => t.id),
          }));
        } catch (error) {
          errors.push(`Vocabulary: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }
      
      // Step 4: Metadata Schema
      if (formData.metadataSchema && domainId && createdIds.vocabularyId && !createdIds.schemaId) {
        try {
          const termIds = createdIds.vocabularyTermIds || [];
          const metadataSchemas = formData.metadataSchema.fields
            .map((f) => ({
              vocabulary_term_id: termIds[f.termIndex],
              required: f.required,
              cardinality: f.cardinality as "SINGLE" | "MULTIPLE",
            }))
            .filter((f) => !!f.vocabulary_term_id);

          const schema = await schemasApi.create(domainId, {
            vocabulary_id: createdIds.vocabularyId,
            version: formData.metadataSchema.version,
            status: "DRAFT",
            metadata_schemas: metadataSchemas,
          });
          setCreatedIds((prev) => ({ ...prev, schemaId: schema.id }));
        } catch (error) {
          errors.push(`Metadata Schema: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }

      // Step 5: Dataset
      if (formData.dataset && domainId && !datasetId) {
        try {
          const dsData = formData.dataset;
          const ds = await datasetsApi.create(domainId, { ...dsData, domain: formData.organization?.domainName || ""});
          datasetId = String(ds.id);
          setCreatedIds((prev) => ({ ...prev, datasetId }));
        } catch (error) {
          errors.push(`Dataset: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }

      // Step 6: Policy Definition
      if (formData.policy && domainId && !createdIds.datasetPolicyId) {
        try {
          const policy = await datasetPoliciesApi.create(domainId, {
            name: formData.policy.policyName,
            version: formData.policy.version,
            type: formData.policy.type,
            rules: formData.policy.rules,
            description: formData.policy.description || null,
          });
          setCreatedIds((prev) => ({ ...prev, datasetPolicyId: policy.id }));
        } catch (error) {
          errors.push(`Policy Definition: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }

      // Step 7: Contract Request
      if (formData.contractRequest && domainId && !contractId) {
        try {
          const contractData = formData.contractRequest;
          const policyIds: string[] = [];
          for (const policy of contractData.policies) {
            const cp = await contractPoliciesApi.create(domainId, {
              name: policy.name,
              data_clasification: policy.dataClassification,
              effective_from: contractData.startDate,
              effective_to: contractData.endDate || "",
              description: policy.description || null,
            });
            policyIds.push(cp.id);
          }

          const contract = await contractsApi.create(domainId, {
            title: contractData.title,
            provider: contractData.provider,
            consumer: contractData.consumer,
            domain: formData.organization?.domainName || "",
            policy: policyIds[0] || "",
            startDate: contractData.startDate,
            endDate: contractData.endDate,
            description: contractData.description || null,
            contract_policies: policyIds,
          });
          contractId = String(contract.id);
          setCreatedIds((prev) => ({ ...prev, contractId, contractPolicyIds: policyIds }));
        } catch (error) {
          errors.push(`Contract Request: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }

      // Step 8: Agreement & Approval
      if (formData.agreement && domainId && contractId && !createdIds.agreementId) {
        try {
          // Create agreement based on the contract from step 7
          const contractData = formData.contractRequest;
          if (!contractData) {
            throw new Error("Contract data not found");
          }

          const agreement = await agreementsApi.create(domainId, {
            contract_id: contractId,
            effective_from: contractData.startDate,
            effective_to: contractData.endDate || new Date(new Date(contractData.startDate).getTime() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Default 1 year if no end date
          });
          setCreatedIds((prev) => ({ ...prev, agreementId: agreement.id }));
          console.log("Agreement created:", {
            agreementId: agreement.id,
            contractId,
            digitalSignature: formData.agreement.digitalSignature,
            approved: formData.agreement.approved,
          });
        } catch (error) {
          errors.push(`Agreement: ${error instanceof Error ? error.message : "Failed"}`);
        }
      }
      
      // Step 9: Monitoring & Go-Live
      if (formData.monitoring && domainId) {
        try {
          const monitoringConfig: MonitoringConfigCreateRequest = {
            enableAuditLog: formData.monitoring.enableAuditLog,
            retentionPeriod: formData.monitoring.retentionPeriod,
            alertEmail: formData.monitoring.alertEmail || "",
            complianceFrameworks: formData.monitoring.complianceFrameworks,
            enableRealTimeAlerts: formData.monitoring.enableRealTimeAlerts,
          };
          // Tries backend; falls back to localStorage automatically if endpoint unavailable
          await monitoringApi.configure(domainId, monitoringConfig);
        } catch (error) {
          errors.push(`Monitoring: ${error instanceof Error ? error.message : "Failed to save configuration"}`);
        }
      }

      const result: SubmissionResult = {
        success: errors.length === 0,
        organizationId,
        datasetId,
        contractId,
        message: errors.length === 0 ? "Onboarding completed successfully!" : "Onboarding completed with some warnings.",
        errors: errors.length > 0 ? errors : undefined,
      };

      setSubmissionResult(result);
      if (result.success) {
        setIsOnboardingComplete(true);
      }

      return result;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "An unexpected error occurred";
      setSubmissionError(errorMessage);
      return { success: false, message: errorMessage, errors: [errorMessage] };
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <OnboardingContext.Provider
      value={{
        currentStep,
        completedSteps,
        formData,
        createdIds,
        totalSteps: TOTAL_STEPS,
        goToStep,
        nextStep,
        previousStep,
        updateStepData,
        markStepComplete,
        resetWizard,
        isStepAccessible,
        // Backend integration
        isSubmitting,
        submissionError,
        submissionResult,
        isOnboardingComplete,
        submitOnboarding,
        saveStepToBackend,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
};

export const useOnboarding = () => {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
};