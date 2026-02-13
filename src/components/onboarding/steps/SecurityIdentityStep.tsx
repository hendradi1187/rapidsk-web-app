// src/components/onboarding/steps/SecurityIdentityStep.tsx
import { Shield } from "lucide-react";
import { WizardNavigation } from "../WizardNavigation";
import { useOnboarding } from "../OnboardingContext";

export const SecurityIdentityStep = () => {
  const { markStepComplete } = useOnboarding();

  const handleNext = async (): Promise<boolean> => {
    // TODO: Add form validation and data saving logic
    console.log("Security & Identity data saved (mock)");
    markStepComplete(1); // Mark step 2 (index 1) as complete
    return true;
  };

  return (
    <div className="space-y-6">
      <div className="p-6 border rounded-lg">
        <div className="flex items-center gap-4">
          <Shield className="w-8 h-8 text-accent" />
          <div>
            <h3 className="text-lg font-semibold">Security & Identity (SSO, TLS)</h3>
            <p className="text-sm text-muted-foreground">
              Placeholder for SSO/OIDC configuration, TLS settings, and 2FA.
            </p>
          </div>
        </div>
      </div>
      <WizardNavigation onNext={handleNext} />
    </div>
  );
};
