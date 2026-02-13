// src/components/onboarding/steps/PolicyDefinitionStep.tsx
import { Gavel } from "lucide-react";
import { WizardNavigation } from "../WizardNavigation";
import { useOnboarding } from "../OnboardingContext";

export const PolicyDefinitionStep = () => {
  const { markStepComplete } = useOnboarding();

  const handleNext = async (): Promise<boolean> => {
    // TODO: Add form validation and data saving logic
    console.log("Policy Definition data saved (mock)");
    markStepComplete(5); // Mark step 6 (index 5) as complete
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-4">
          <Gavel className="w-8 h-8 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Policy Definition</h3>
            <p className="text-sm text-muted-foreground">
              Placeholder for policy templates and editor.
            </p>
          </div>
        </div>
      </div>
      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
