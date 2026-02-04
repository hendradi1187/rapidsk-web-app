import {
  Building2,
  BookOpen,
  Database,
  FileText,
  ArrowRightLeft,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingStepper, StepDefinition } from "./OnboardingStepper";
import { useOnboarding } from "./OnboardingContext";
import {
  SetupOrganizationStep,
  DefineVocabularyStep,
  RegisterDatasetStep,
  CreateContractStep,
  SetupTransferStep,
  EnableMonitoringStep,
} from "./steps";

const stepDefinitions: StepDefinition[] = [
  {
    id: 1,
    title: "Organization",
    description: "Setup organisasi",
    icon: Building2,
  },
  {
    id: 2,
    title: "Vocabulary",
    description: "Definisi metadata",
    icon: BookOpen,
  },
  {
    id: 3,
    title: "Dataset",
    description: "Register dataset",
    icon: Database,
  },
  {
    id: 4,
    title: "Contract",
    description: "Buat kontrak",
    icon: FileText,
  },
  {
    id: 5,
    title: "Transfer",
    description: "Setup transfer",
    icon: ArrowRightLeft,
  },
  {
    id: 6,
    title: "Monitoring",
    description: "Aktifkan monitoring",
    icon: Activity,
  },
];

const stepComponents = [
  SetupOrganizationStep,
  DefineVocabularyStep,
  RegisterDatasetStep,
  CreateContractStep,
  SetupTransferStep,
  EnableMonitoringStep,
];

const stepTitles = [
  { title: "Setup Organisasi", description: "Buat organisasi dan tambahkan participant utama" },
  { title: "Definisikan Vocabulary", description: "Tentukan metadata schema dan terms untuk data Anda" },
  { title: "Register Dataset", description: "Tambahkan endpoint GeoServer dan konfigurasi dataset" },
  { title: "Buat Kontrak", description: "Definisikan kebijakan akses dan perjanjian data sharing" },
  { title: "Setup Transfer", description: "Konfigurasi channel transfer data dan jadwal" },
  { title: "Aktifkan Monitoring", description: "Setup audit trail dan compliance monitoring" },
];

export const OnboardingWizard = () => {
  const { currentStep, completedSteps, goToStep, isStepAccessible } = useOnboarding();

  const CurrentStepComponent = stepComponents[currentStep];

  return (
    <div className="space-y-6">
      {/* Progress Stepper */}
      <OnboardingStepper
        steps={stepDefinitions}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={goToStep}
        isStepAccessible={isStepAccessible}
      />

      {/* Current Step Form */}
      <Card>
        <CardHeader>
          <CardTitle>{stepTitles[currentStep].title}</CardTitle>
          <CardDescription>{stepTitles[currentStep].description}</CardDescription>
        </CardHeader>
        <CardContent>
          <CurrentStepComponent />
        </CardContent>
      </Card>
    </div>
  );
};
