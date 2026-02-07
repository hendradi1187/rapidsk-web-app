import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Check, RotateCcw } from "lucide-react";
import { useOnboarding } from "./OnboardingContext";

interface WizardNavigationProps {
  onNext?: () => boolean | Promise<boolean>;
  onComplete?: () => void;
  isSubmitting?: boolean;
  isComplete?: boolean;
}

export const WizardNavigation = ({
  onNext,
  onComplete,
  isSubmitting = false,
}: WizardNavigationProps) => {
  const { currentStep, totalSteps, previousStep, nextStep, resetWizard, completedSteps } = useOnboarding();
  const isFirstStep = currentStep === 0;
  const isLastStep = currentStep === totalSteps - 1;
  const allStepsCompleted = completedSteps.size === totalSteps;
  const canComplete = completedSteps.size >= totalSteps - 1;

  const handleNext = async () => {
    if (onNext) {
      const canProceed = await onNext();
      if (canProceed) {
        nextStep();
      }
    } else {
      nextStep();
    }
  };

  const handleComplete = () => {
    if (onComplete) {
      onComplete();
    }
  };

  return (
    <div className="flex items-center justify-between pt-6 border-t border-border">
      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={previousStep}
          disabled={isFirstStep || isSubmitting}
          className="gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          Sebelumnya
        </Button>

        {allStepsCompleted && (
          <Button
            type="button"
            variant="ghost"
            onClick={resetWizard}
            disabled={isSubmitting}
            className="gap-2 text-muted-foreground"
          >
            <RotateCcw className="w-4 h-4" />
            Reset
          </Button>
        )}
      </div>

      <div className="text-sm text-muted-foreground">
        Langkah {currentStep + 1} dari {totalSteps}
      </div>

      <div>
        {isLastStep ? (
          <Button
            type="button"
            onClick={handleComplete}
            disabled={isSubmitting || !canComplete}
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSubmitting ? (
              <>Memproses...</>
            ) : (
              <>
                <Check className="w-4 h-4" />
                Selesai
              </>
            )}
          </Button>
        ) : (
          <Button
            type="button"
            onClick={handleNext}
            disabled={isSubmitting}
            className="gap-2 bg-accent hover:bg-accent/90 text-accent-foreground"
          >
            {isSubmitting ? (
              <>Menyimpan...</>
            ) : (
              <>
                Selanjutnya
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
};
