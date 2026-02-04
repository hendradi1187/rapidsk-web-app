import { createContext, useContext, useState, useEffect, ReactNode } from "react";

export interface OrganizationStepData {
  orgName: string;
  orgType: string;
  description: string;
  participantName: string;
  participantEmail: string;
  participantRole: string;
}

export interface VocabularyStepData {
  vocabularyName: string;
  namespace: string;
  terms: Array<{
    name: string;
    definition: string;
    dataType: string;
  }>;
}

export interface DatasetStepData {
  name: string;
  description: string;
  provider: string;
  domain: string;
  endpointType: string;
  endpointUrl: string;
  format: string;
  accessLevel: string;
}

export interface ContractStepData {
  contractName: string;
  provider: string;
  consumer: string;
  startDate: string;
  endDate: string;
  policies: Array<{
    type: string;
    rule: string;
    value: string;
  }>;
}

export interface TransferStepData {
  transferName: string;
  sourceDataset: string;
  targetEndpoint: string;
  protocol: string;
  scheduleType: string;
  cronExpression: string;
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

// Simulated API endpoints
const API_BASE_URL = "/api/v1";

// Simulated API call function
const simulateApiCall = async <T,>(
  endpoint: string,
  data: T,
  delay: number = 1000
): Promise<{ success: boolean; id?: string; error?: string }> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, delay));

  // Log the API call for debugging
  console.log(`[API] POST ${API_BASE_URL}${endpoint}`, data);

  // Simulate random success/failure (95% success rate)
  const isSuccess = Math.random() > 0.05;

  if (isSuccess) {
    return {
      success: true,
      id: `${endpoint.split("/").pop()}_${Date.now()}`,
    };
  } else {
    return {
      success: false,
      error: "Simulated server error. Please try again.",
    };
  }
};

export const OnboardingProvider = ({ children }: { children: ReactNode }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [formData, setFormData] = useState<OnboardingFormData>(initialFormData);

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
    }
  }, []);

  // Save state on changes
  useEffect(() => {
    const state: StoredState = {
      currentStep,
      completedSteps: Array.from(completedSteps),
      formData,
    };
    saveToStorage(state);
  }, [currentStep, completedSteps, formData]);

  const isStepAccessible = (step: number): boolean => {
    if (step === 0) return true;
    if (completedSteps.has(step)) return true;
    // Can access next step if previous step is completed
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
    setIsOnboardingComplete(false);
    setSubmissionResult(null);
    setSubmissionError(null);
    localStorage.removeItem(STORAGE_KEY);
  };

  // Save individual step to backend
  const saveStepToBackend = async (step: keyof OnboardingFormData): Promise<boolean> => {
    const stepData = formData[step];
    if (!stepData) return false;

    const endpoints: Record<keyof OnboardingFormData, string> = {
      organization: "/organizations",
      vocabulary: "/vocabularies",
      dataset: "/datasets",
      contract: "/contracts",
      transfer: "/transfers",
      monitoring: "/monitoring/config",
    };

    try {
      const result = await simulateApiCall(endpoints[step], stepData, 800);
      if (result.success) {
        console.log(`[Onboarding] Step "${step}" saved successfully with ID: ${result.id}`);
        return true;
      } else {
        console.error(`[Onboarding] Failed to save step "${step}": ${result.error}`);
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
    let organizationId: string | undefined;
    let datasetId: string | undefined;
    let contractId: string | undefined;
    let transferId: string | undefined;

    try {
      // Step 1: Create Organization
      if (formData.organization) {
        console.log("[Onboarding] Submitting organization...");
        const orgResult = await simulateApiCall("/organizations", formData.organization, 1000);
        if (orgResult.success) {
          organizationId = orgResult.id;
        } else {
          errors.push(`Organization: ${orgResult.error}`);
        }
      }

      // Step 2: Create Vocabulary
      if (formData.vocabulary) {
        console.log("[Onboarding] Submitting vocabulary...");
        await simulateApiCall("/vocabularies", formData.vocabulary, 800);
      }

      // Step 3: Register Dataset
      if (formData.dataset) {
        console.log("[Onboarding] Submitting dataset...");
        const datasetResult = await simulateApiCall("/datasets", {
          ...formData.dataset,
          organizationId,
        }, 1200);
        if (datasetResult.success) {
          datasetId = datasetResult.id;
        } else {
          errors.push(`Dataset: ${datasetResult.error}`);
        }
      }

      // Step 4: Create Contract
      if (formData.contract) {
        console.log("[Onboarding] Submitting contract...");
        const contractResult = await simulateApiCall("/contracts", {
          ...formData.contract,
          datasetId,
        }, 1000);
        if (contractResult.success) {
          contractId = contractResult.id;
        } else {
          errors.push(`Contract: ${contractResult.error}`);
        }
      }

      // Step 5: Setup Transfer
      if (formData.transfer) {
        console.log("[Onboarding] Submitting transfer configuration...");
        const transferResult = await simulateApiCall("/transfers", {
          ...formData.transfer,
          contractId,
        }, 1000);
        if (transferResult.success) {
          transferId = transferResult.id;
        } else {
          errors.push(`Transfer: ${transferResult.error}`);
        }
      }

      // Step 6: Configure Monitoring
      if (formData.monitoring) {
        console.log("[Onboarding] Submitting monitoring configuration...");
        await simulateApiCall("/monitoring/config", {
          ...formData.monitoring,
          organizationId,
        }, 800);
      }

      // All done
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
