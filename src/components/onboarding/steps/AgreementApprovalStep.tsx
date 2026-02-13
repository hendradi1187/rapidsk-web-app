// src/components/onboarding/steps/AgreementApprovalStep.tsx
import { Handshake } from "lucide-react";
import { WizardNavigation } from "../WizardNavigation";
import { useOnboarding } from "../OnboardingContext";

export const AgreementApprovalStep = () => {
  const { markStepComplete } = useOnboarding();

  const handleNext = async (): Promise<boolean> => {
    // TODO: Add form validation and data saving logic
    console.log("Agreement & Approval data saved (mock)");
    markStepComplete(7); // Mark step 8 (index 7) as complete
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-4">
          <Handshake className="w-8 h-8 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Agreement & Approval</h3>
            <p className="text-sm text-muted-foreground">
              Placeholder for agreement generation and digital signature simulation.
            </p>
          </div>
        </div>
      </div>
      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
