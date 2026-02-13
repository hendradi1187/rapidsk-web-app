import {
  Building2,
  BookOpen,
  Database,
  FileText,
  Activity,
  Shield,
  Code2,
  Gavel,
  Handshake,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { OnboardingStepper, StepDefinition } from "./OnboardingStepper";
import { useOnboarding } from "./OnboardingContext";
import {
  SetupOrganizationStep,
  SecurityIdentityStep,
  DefineVocabularyStep,
  MetadataSchemaStep,
  RegisterDatasetStep,
  PolicyDefinitionStep,
  ContractRequestStep,
  AgreementApprovalStep,
  MonitoringGoLiveStep,
} from "./steps";

const stepDefinitions: StepDefinition[] = [
  { id: 1, title: "Organization", description: "Setup organisasi", icon: Building2 },
  { id: 2, title: "Security", description: "Keamanan & SSO", icon: Shield },
  { id: 3, title: "Vocabulary", description: "Definisi metadata", icon: BookOpen },
  { id: 4, title: "Schema", description: "Struktur metadata", icon: Code2 },
  { id: 5, title: "Dataset", description: "Register dataset", icon: Database },
  { id: 6, title: "Policy", description: "Definisi kebijakan", icon: Gavel },
  { id: 7, title: "Contract", description: "Permintaan kontrak", icon: FileText },
  { id: 8, title: "Agreement", description: "Persetujuan", icon: Handshake },
  { id: 9, title: "Go-Live", description: "Monitoring & Live", icon: Activity },
];

const stepComponents = [
  SetupOrganizationStep,
  SecurityIdentityStep,
  DefineVocabularyStep,
  MetadataSchemaStep,
  RegisterDatasetStep,
  PolicyDefinitionStep,
  ContractRequestStep,
  AgreementApprovalStep,
  MonitoringGoLiveStep,
];

const stepTitles = [
  { title: "Setup Organisasi", description: "Buat organisasi dan tambahkan participant utama" },
  { title: "Keamanan & Identitas", description: "Konfigurasi integrasi SSO (OIDC/SAML) dan keamanan" },
  { title: "Definisikan Vocabulary", description: "Tentukan metadata schema dan terms untuk data Anda" },
  { title: "Buat Metadata Schema", description: "Gunakan schema builder untuk mendefinisikan struktur data" },
  { title: "Register Dataset", description: "Tambahkan endpoint GeoServer dan konfigurasi dataset" },
  { title: "Definisi Kebijakan", description: "Gunakan template untuk membuat kebijakan akses data" },
  { title: "Permintaan Kontrak", description: "Ajukan permintaan kontrak berdasarkan data dan kebijakan" },
  { title: "Persetujuan & Tanda Tangan", description: "Proses persetujuan dan simulasi tanda tangan digital" },
  { title: "Monitoring & Go-Live", description: "Aktifkan audit trail, monitoring, dan live" },
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
