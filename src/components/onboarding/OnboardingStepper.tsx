import { Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

export interface StepDefinition {
  id: number;
  title: string;
  description: string;
  icon: LucideIcon;
}

interface OnboardingStepperProps {
  steps: StepDefinition[];
  currentStep: number;
  completedSteps: Set<number>;
  onStepClick?: (stepIndex: number) => void;
  isStepAccessible?: (stepIndex: number) => boolean;
}

export const OnboardingStepper = ({
  steps,
  currentStep,
  completedSteps,
  onStepClick,
  isStepAccessible,
}: OnboardingStepperProps) => {
  const progressPercentage = completedSteps.size > 0
    ? ((Math.max(...Array.from(completedSteps)) + 1) / steps.length) * 100
    : 0;

  const getStepStatus = (index: number): "completed" | "current" | "upcoming" => {
    if (completedSteps.has(index)) return "completed";
    if (index === currentStep) return "current";
    return "upcoming";
  };

  const handleStepClick = (index: number) => {
    if (onStepClick && (!isStepAccessible || isStepAccessible(index))) {
      onStepClick(index);
    }
  };

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-6">Setup Progress</h3>
      <div className="relative">
        {/* Progress Line Background */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />
        {/* Progress Line Fill */}
        <div
          className="absolute top-5 left-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `${progressPercentage}%`, maxWidth: "calc(100% - 40px)" }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => {
            const status = getStepStatus(index);
            const isClickable = onStepClick && (!isStepAccessible || isStepAccessible(index));
            const StepIcon = step.icon;

            return (
              <div
                key={step.id}
                className={cn(
                  "flex flex-col items-center text-center",
                  index < steps.length - 1 && "flex-1"
                )}
              >
                <button
                  type="button"
                  onClick={() => handleStepClick(index)}
                  disabled={!isClickable}
                  className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                    status === "completed" &&
                      "bg-accent border-accent text-accent-foreground",
                    status === "current" &&
                      "bg-background border-accent text-accent animate-pulse-amber",
                    status === "upcoming" &&
                      "bg-background border-border text-muted-foreground",
                    isClickable && "cursor-pointer hover:scale-110",
                    !isClickable && "cursor-default"
                  )}
                >
                  {status === "completed" ? (
                    <Check className="w-5 h-5" />
                  ) : (
                    <StepIcon className="w-4 h-4" />
                  )}
                </button>
                <div className="mt-3 max-w-24">
                  <p
                    className={cn(
                      "text-xs font-semibold",
                      status === "current" ? "text-accent" : "text-foreground"
                    )}
                  >
                    {step.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
