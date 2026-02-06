import { Header } from "@/components/layout/Header";
import { OnboardingProvider } from "@/components/onboarding/OnboardingContext";
import { OnboardingWizard } from "@/components/onboarding/OnboardingWizard";

const Onboarding = () => {
  return (
    <div className="min-h-screen">
      <Header
        title="Onboarding Wizard"
        subtitle="Configure your Dataspace Connector step by step"
      />
      <div className="p-6">
        <OnboardingProvider>
          <OnboardingWizard />
        </OnboardingProvider>
      </div>
    </div>
  );
};

export default Onboarding;
