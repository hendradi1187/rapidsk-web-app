import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { organizationsApi, domainsApi } from "@/api/services/governance";
import { participantsApi } from "@/api/services/onboarding";
import { vocabulariesApi, datasetsApi } from "@/api/services/data-catalog";
import { contractsApi, contractPoliciesApi } from "@/api/services/policy-contract";
import { dataTransfersApi } from "@/api/services/data-transfer";
import type { ParticipantOrganizationType } from "@/api/types/onboarding";

export interface OrganizationStepData {
  orgName: string;
  orgCode: string;
  orgType: string;
  description: string;
  participantName: string;
  participantEmail: string;
  participantPhone: string;
  participantAddress: string;
  participantRole: string;
  domainName: string;
  domainCode: string;
  domainDescription: string;
}

export interface VocabularyStepData {
  vocabularyName: string;
  version: string;
  vocabularyDescription?: string;
  terms: Array<{
    term: string;
    datatype: string;
    unit?: string;
    description?: string;
  }>;
}

export interface DatasetStepData {
  name: string;
  description?: string;
  provider: string;
  format: "WMS" | "WFS" | "WCS";
  endpoint: string;
  period: string;
  wells?: number;
  accessLevel: "public" | "restricted" | "confidential";
}

export interface ContractStepData {
  title: string;
  provider: string;
  consumer: string;
  startDate: string;
  endDate?: string;
  description?: string;
  policies: Array<{
    name: string;
    dataClassification: string;
    description?: string;
  }>;
}

export interface TransferStepData {
  name: string;
  from: string;
  to: string;
  type: "streaming" | "batch";
  targetEndpoint: string;
  protocol: "HTTP" | "HTTPS" | "S3" | "FTP" | "SFTP";
  scheduleType: "realtime" | "scheduled" | "manual";
  cronExpression?: string;
  encrypted: boolean;
}

export interface MonitoringStepData {
  enableAuditLog: boolean;
  retentionPeriod: number;
  alertEmail: string;
  complianceFrameworks: string[];
  enableRealTimeAlerts: boolean;
}

export interface OnboardingFormData {
  organization: OrganizationStepData | null;
  vocabulary: VocabularyStepData | null;
  dataset: DatasetStepData | null;
  contract: ContractStepData | null;
  transfer: TransferStepData | null;
  monitoring: MonitoringStepData | null;
}

// IDs created during onboarding flow, used to chain steps
interface CreatedIds {
  organizationId?: string;
  participantId?: string;
  domainId?: string;
  vocabularyId?: string;
  datasetId?: string;
  contractId?: string;
  transferId?: string;
  contractPolicyIds?: string[];
}

interface SubmissionResult {
  success: boolean;
  organizationId?: string;
  datasetId?: string;
  contractId?: string;
  transferId?: string;
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

const STORAGE_KEY = "rapidsk-onboarding-state";
const TOTAL_STEPS = 6;

const initialFormData: OnboardingFormData = {
  organization: null,
  vocabulary: null,
  dataset: null,
  contract: null,
  transfer: null,
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

  // Save individual step to backend
  const saveStepToBackend = async (step: keyof OnboardingFormData): Promise<boolean> => {
    const stepData = formData[step];
    if (!stepData) return false;

    try {
      switch (step) {
        case "organization": {
          const orgData = stepData as OrganizationStepData;

          // 1. Create Organization
          const org = await organizationsApi.create({
            name: orgData.orgName,
            code: orgData.orgCode,
            description: orgData.description,
          });
          console.log("[Onboarding] Organization created:", org.id);

          // 2. Create Participant
          const participant = await participantsApi.create({
            organization_name: orgData.orgName,
            organization_type: mapOrgType(orgData.orgType),
            address: orgData.participantAddress,
            contact_person: {
              name: orgData.participantName,
              email: orgData.participantEmail,
              phone: orgData.participantPhone,
            },
          });
          console.log("[Onboarding] Participant created:", participant.id);

          // 3. Create Domain under organization
          const domain = await domainsApi.create(org.id, {
            name: orgData.domainName,
            code: orgData.domainCode,
            description: orgData.domainDescription,
            status: "ACTIVE",
          });
          console.log("[Onboarding] Domain created:", domain.id);

          setCreatedIds((prev) => ({
            ...prev,
            organizationId: org.id,
            participantId: participant.id,
            domainId: domain.id,
          }));

          return true;
        }

        case "vocabulary": {
          const vocabData = stepData as VocabularyStepData;
          const domainId = createdIds.domainId;
          if (!domainId) {
            console.error("[Onboarding] No domainId available for vocabulary creation");
            return false;
          }

          const vocab = await vocabulariesApi.create(domainId, {
            name: vocabData.vocabularyName,
            version: vocabData.version || "1.0.0",
            description: vocabData.vocabularyDescription || null,
            terms: vocabData.terms.map((t) => ({
              term: t.term,
              datatype: t.datatype,
              unit: t.unit || null,
              description: t.description || null,
            })),
          });
          console.log("[Onboarding] Vocabulary created:", vocab.id);

          setCreatedIds((prev) => ({
            ...prev,
            vocabularyId: vocab.id,
          }));

          return true;
        }

        case "dataset": {
          const dsData = stepData as DatasetStepData;
          const domainId = createdIds.domainId;
          if (!domainId) {
            console.error("[Onboarding] No domainId available for dataset creation");
            return false;
          }

          const dataset = await datasetsApi.create(domainId, {
            name: dsData.name,
            description: dsData.description || null,
            provider: dsData.provider,
            domain: formData.organization?.domainName || "",
            format: dsData.format,
            endpoint: dsData.endpoint,
            period: dsData.period,
            wells: dsData.wells,
            accessLevel: dsData.accessLevel,
          });
          console.log("[Onboarding] Dataset created:", dataset.id);

          setCreatedIds((prev) => ({
            ...prev,
            datasetId: String(dataset.id),
          }));

          return true;
        }

        case "contract": {
          const contractData = stepData as ContractStepData;
          const domainId = createdIds.domainId;
          if (!domainId) {
            console.error("[Onboarding] No domainId available for contract creation");
            return false;
          }

          // 1. Create contract policies first
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
            console.log("[Onboarding] Contract policy created:", cp.id);
          }

          // 2. Create contract with policy references
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
          console.log("[Onboarding] Contract created:", contract.id);

          setCreatedIds((prev) => ({
            ...prev,
            contractId: String(contract.id),
            contractPolicyIds: policyIds,
          }));

          return true;
        }

        case "transfer": {
          const transferData = stepData as TransferStepData;
          const domainId = createdIds.domainId;
          if (!domainId) {
            console.error("[Onboarding] No domainId available for transfer creation");
            return false;
          }

          const transfer = await dataTransfersApi.create(domainId, {
            name: transferData.name,
            from: transferData.from,
            to: transferData.to,
            type: transferData.type,
            targetEndpoint: transferData.targetEndpoint,
            protocol: transferData.protocol,
            scheduleType: transferData.scheduleType,
            cronExpression: transferData.cronExpression,
            encrypted: transferData.encrypted,
          });
          console.log("[Onboarding] Data transfer created:", transfer.id);

          setCreatedIds((prev) => ({
            ...prev,
            transferId: String(transfer.id),
          }));

          return true;
        }

        case "monitoring": {
          // Monitoring config - no direct backend API endpoint yet.
          // Store locally and log for future integration.
          console.log("[Onboarding] Monitoring config saved (local only):", stepData);
          return true;
        }

        default:
          return false;
      }
    } catch (error) {
      console.error(`[Onboarding] Error saving step "${step}":`, error);
      return false;
    }
  };

  // Submit all onboarding data to backend
  const submitOnboarding = async (): Promise<SubmissionResult> => {
    setIsSubmitting(true);
    setSubmissionError(null);

    const errors: string[] = [];
    let organizationId: string | undefined = createdIds.organizationId;
    let domainId: string | undefined = createdIds.domainId;
    let datasetId: string | undefined = createdIds.datasetId;
    let contractId: string | undefined = createdIds.contractId;
    let transferId: string | undefined = createdIds.transferId;

    try {
      // Step 1: Create Organization + Participant + Domain (if not already created)
      if (formData.organization && !organizationId) {
        const orgData = formData.organization;
        try {
          const org = await organizationsApi.create({
            name: orgData.orgName,
            code: orgData.orgCode,
            description: orgData.description,
          });
          organizationId = org.id;

          await participantsApi.create({
            organization_name: orgData.orgName,
            organization_type: mapOrgType(orgData.orgType),
            address: orgData.participantAddress,
            contact_person: {
              name: orgData.participantName,
              email: orgData.participantEmail,
              phone: orgData.participantPhone,
            },
          });

          const domain = await domainsApi.create(org.id, {
            name: orgData.domainName,
            code: orgData.domainCode,
            description: orgData.domainDescription,
            status: "ACTIVE",
          });
          domainId = domain.id;

          setCreatedIds((prev) => ({
            ...prev,
            organizationId: org.id,
            domainId: domain.id,
          }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create organization";
          errors.push(`Organization: ${msg}`);
        }
      }

      // Step 2: Create Vocabulary
      if (formData.vocabulary && domainId && !createdIds.vocabularyId) {
        try {
          const vocabData = formData.vocabulary;
          await vocabulariesApi.create(domainId, {
            name: vocabData.vocabularyName,
            version: vocabData.version || "1.0.0",
            description: vocabData.vocabularyDescription || null,
            terms: vocabData.terms.map((t) => ({
              term: t.term,
              datatype: t.datatype,
              unit: t.unit || null,
              description: t.description || null,
            })),
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create vocabulary";
          errors.push(`Vocabulary: ${msg}`);
        }
      }

      // Step 3: Create Dataset
      if (formData.dataset && domainId && !datasetId) {
        try {
          const dsData = formData.dataset;
          const ds = await datasetsApi.create(domainId, {
            name: dsData.name,
            description: dsData.description || null,
            provider: dsData.provider,
            domain: formData.organization?.domainName || "",
            format: dsData.format,
            endpoint: dsData.endpoint,
            period: dsData.period,
            wells: dsData.wells,
            accessLevel: dsData.accessLevel,
          });
          datasetId = String(ds.id);
          setCreatedIds((prev) => ({ ...prev, datasetId: String(ds.id) }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create dataset";
          errors.push(`Dataset: ${msg}`);
        }
      }

      // Step 4: Create Contract (with contract policies)
      if (formData.contract && domainId && !contractId) {
        try {
          const contractData = formData.contract;

          // Create contract policies first
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
          setCreatedIds((prev) => ({
            ...prev,
            contractId: String(contract.id),
            contractPolicyIds: policyIds,
          }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create contract";
          errors.push(`Contract: ${msg}`);
        }
      }

      // Step 5: Create Data Transfer
      if (formData.transfer && domainId && !transferId) {
        try {
          const transferData = formData.transfer;
          const transfer = await dataTransfersApi.create(domainId, {
            name: transferData.name,
            from: transferData.from,
            to: transferData.to,
            type: transferData.type,
            targetEndpoint: transferData.targetEndpoint,
            protocol: transferData.protocol,
            scheduleType: transferData.scheduleType,
            cronExpression: transferData.cronExpression,
            encrypted: transferData.encrypted,
          });
          transferId = String(transfer.id);
          setCreatedIds((prev) => ({ ...prev, transferId: String(transfer.id) }));
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Failed to create data transfer";
          errors.push(`Transfer: ${msg}`);
        }
      }

      // Step 6: Monitoring (no backend API yet)
      if (formData.monitoring) {
        console.log("[Onboarding] Monitoring config:", formData.monitoring);
      }

      const result: SubmissionResult = {
        success: errors.length === 0,
        organizationId,
        datasetId,
        contractId,
        transferId,
        message: errors.length === 0
          ? "Onboarding completed successfully! Your dataspace connector is now configured."
          : "Onboarding completed with some warnings.",
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
      return {
        success: false,
        message: errorMessage,
        errors: [errorMessage],
      };
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
