// src/components/onboarding/steps/MetadataSchemaStep.tsx
import { Code2 } from "lucide-react";
import { WizardNavigation } from "../WizardNavigation";
import { useOnboarding } from "../OnboardingContext";

export const MetadataSchemaStep = () => {
  const { markStepComplete } = useOnboarding();

  const handleNext = async (): Promise<boolean> => {
    // TODO: Add form validation and data saving logic
    console.log("Metadata Schema data saved (mock)");
    markStepComplete(3); // Mark step 4 (index 3) as complete
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-4">
          <Code2 className="w-8 h-8 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Metadata Schema</h3>
            <p className="text-sm text-muted-foreground">
              Placeholder for Metadata Schema Builder (DCAT/JSON-LD inspired).
            </p>
          </div>
        </div>
      </div>
      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
