import { Check, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Step {
  id: string;
  title: string;
  description: string;
  isCompleted?: boolean;
}

interface WizardStepperProps {
  steps: Step[];
  currentStepId: string;
  onStepClick: (id: string) => void;
  onComplete?: () => void;
}

export function WizardStepper({ steps, currentStepId, onStepClick, onComplete }: WizardStepperProps) {
  const currentIndex = steps.findIndex((s) => s.id === currentStepId);

  return (
    <div className="flex flex-col space-y-6">
      {/* Progress Bar & Indicators */}
      <div className="relative">
        <div className="absolute left-0 top-1/2 h-0.5 w-full -translate-y-1/2 bg-border/50" />
        <div 
          className="absolute left-0 top-1/2 h-0.5 -translate-y-1/2 bg-primary transition-all duration-300"
          style={{ width: `${(currentIndex / (steps.length - 1)) * 100}%` }}
        />
        
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const isCompleted = step.isCompleted || index < currentIndex;
            const isActive = index === currentIndex;
            
            return (
              <button
                key={step.id}
                onClick={() => onStepClick(step.id)}
                className="group flex flex-col items-center gap-2"
              >
                <div 
                  className={`flex h-8 w-8 items-center justify-center rounded-full border-2 transition-colors ${
                    isActive 
                      ? "border-primary bg-background text-primary ring-4 ring-primary/20"
                      : isCompleted
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-background text-muted-foreground group-hover:border-primary/50"
                  }`}
                >
                  {isCompleted && !isActive ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    <span className="text-sm font-medium">{index + 1}</span>
                  )}
                </div>
                <div className="flex flex-col items-center text-center">
                  <span className={`text-xs font-semibold ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                    {step.title}
                  </span>
                  <span className="text-[10px] text-muted-foreground hidden sm:block max-w-[100px] truncate">
                    {step.description}
                  </span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Navigation Buttons (Optional, can be overridden by parent) */}
      <div className="flex justify-end gap-2 pt-4">
        <Button
          variant="outline"
          disabled={currentIndex === 0}
          onClick={() => onStepClick(steps[currentIndex - 1].id)}
        >
          Back
        </Button>
        {currentIndex === steps.length - 1 ? (
          <Button onClick={onComplete}>Complete Setup</Button>
        ) : (
          <Button onClick={() => onStepClick(steps[currentIndex + 1].id)}>
            Next Step <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
