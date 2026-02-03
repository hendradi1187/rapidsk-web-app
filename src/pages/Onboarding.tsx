import { useState } from "react";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Check, ChevronLeft, ChevronRight, Building2, BookOpen, Database, FileText, ArrowRightLeft, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import { StepOrganization } from "@/components/onboarding/StepOrganization";
import { StepVocabulary } from "@/components/onboarding/StepVocabulary";
import { StepDataset } from "@/components/onboarding/StepDataset";
import { StepContract } from "@/components/onboarding/StepContract";
import { StepTransfer } from "@/components/onboarding/StepTransfer";
import { StepMonitoring } from "@/components/onboarding/StepMonitoring";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

const steps = [
  { id: 1, title: "Organization", description: "Setup organization & participants", icon: Building2 },
  { id: 2, title: "Vocabulary", description: "Define metadata schema & terms", icon: BookOpen },
  { id: 3, title: "Dataset", description: "Register GeoServer endpoints", icon: Database },
  { id: 4, title: "Contract", description: "Define access policies", icon: FileText },
  { id: 5, title: "Transfer", description: "Configure data channels", icon: ArrowRightLeft },
  { id: 6, title: "Monitoring", description: "Enable audit & compliance", icon: Shield },
];

const Onboarding = () => {
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState<number[]>([]);
  const navigate = useNavigate();

  const progress = ((currentStep - 1) / (steps.length - 1)) * 100;

  const handleNext = () => {
    if (!completedSteps.includes(currentStep)) {
      setCompletedSteps([...completedSteps, currentStep]);
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleStepClick = (stepId: number) => {
    if (stepId <= Math.max(...completedSteps, 1) + 1) {
      setCurrentStep(stepId);
    }
  };

  const handleComplete = () => {
    setCompletedSteps([...completedSteps, currentStep]);
    toast.success("Onboarding completed successfully!", {
      description: "Your dataspace connector is now fully configured.",
    });
    navigate("/");
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return <StepOrganization />;
      case 2:
        return <StepVocabulary />;
      case 3:
        return <StepDataset />;
      case 4:
        return <StepContract />;
      case 5:
        return <StepTransfer />;
      case 6:
        return <StepMonitoring />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen">
      <Header
        title="Onboarding Wizard"
        subtitle="Configure your Dataspace Connector step by step"
      />
      <div className="p-6 space-y-6">
        {/* Progress Bar */}
        <div className="bg-card rounded-xl border border-border p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold">Setup Progress</h3>
            <span className="text-sm text-muted-foreground">
              Step {currentStep} of {steps.length}
            </span>
          </div>
          <Progress value={progress} className="h-2 mb-6" />

          {/* Step Indicators */}
          <div className="flex justify-between">
            {steps.map((step) => {
              const isCompleted = completedSteps.includes(step.id);
              const isCurrent = currentStep === step.id;
              const isAccessible = step.id <= Math.max(...completedSteps, 0) + 1;
              const StepIcon = step.icon;

              return (
                <button
                  key={step.id}
                  onClick={() => handleStepClick(step.id)}
                  disabled={!isAccessible}
                  className={cn(
                    "flex flex-col items-center text-center group transition-all",
                    isAccessible ? "cursor-pointer" : "cursor-not-allowed opacity-50"
                  )}
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300 mb-2",
                      isCompleted && "bg-success border-success text-success-foreground",
                      isCurrent && !isCompleted && "bg-accent border-accent text-accent-foreground",
                      !isCompleted && !isCurrent && "bg-background border-border text-muted-foreground"
                    )}
                  >
                    {isCompleted ? (
                      <Check className="w-5 h-5" />
                    ) : (
                      <StepIcon className="w-5 h-5" />
                    )}
                  </div>
                  <span
                    className={cn(
                      "text-xs font-medium hidden md:block",
                      isCurrent ? "text-accent" : "text-muted-foreground"
                    )}
                  >
                    {step.title}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-card rounded-xl border border-border p-6 min-h-[400px]">
          <div className="flex items-center gap-3 mb-6 pb-4 border-b border-border">
            {(() => {
              const CurrentIcon = steps[currentStep - 1].icon;
              return <CurrentIcon className="w-6 h-6 text-accent" />;
            })()}
            <div>
              <h2 className="text-xl font-semibold">{steps[currentStep - 1].title}</h2>
              <p className="text-sm text-muted-foreground">{steps[currentStep - 1].description}</p>
            </div>
          </div>

          {renderStepContent()}
        </div>

        {/* Navigation Buttons */}
        <div className="flex justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 1}
            className="gap-2"
          >
            <ChevronLeft className="w-4 h-4" />
            Previous
          </Button>

          {currentStep === steps.length ? (
            <Button onClick={handleComplete} className="gap-2 bg-success hover:bg-success/90">
              <Check className="w-4 h-4" />
              Complete Setup
            </Button>
          ) : (
            <Button onClick={handleNext} className="gap-2">
              Next Step
              <ChevronRight className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
};

export default Onboarding;
