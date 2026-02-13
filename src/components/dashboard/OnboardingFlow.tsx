import { Check, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useMemo } from "react";
import { useOnboarding } from "@/components/onboarding/OnboardingContext";

const stepDefinitions = [
  { id: 1, key: "organization", title: "Setup Organization", description: "Create org, participants & domain" },
  { id: 2, key: "security", title: "Setup Security", description: "Configure identity & access" },
  { id: 3, key: "vocabulary", title: "Define Vocabulary", description: "Standardize data terms" },
  { id: 4, key: "metadataSchema", title: "Define Metadata Schema", description: "Structure data descriptions" },
  { id: 5, key: "dataset", title: "Register Dataset", description: "Add GeoServer endpoints" },
  { id: 6, key: "policy", title: "Define Policy", description: "Set data usage rules" },
  { id: 7, key: "contractRequest", title: "Create Contract", description: "Formalize data agreements" },
  { id: 8, key: "agreement", title: "Agreement & Approval", description: "Sign off on terms" },
  { id: 9, key: "monitoring", title: "Enable Monitoring", description: "Audit & compliance setup" },
];

export const OnboardingFlow = () => {
  const { completedSteps, totalSteps } = useOnboarding();

  const { steps, completedCount } = useMemo(() => {
    const currentProgressSteps = stepDefinitions.map((stepDef) => {
      const isCompleted = completedSteps.has(stepDef.id - 1); // Adjust for 0-indexed completedSteps
      return {
        ...stepDef,
        status: isCompleted ? "completed" : "upcoming",
      };
    });

    const actualCompletedCount = completedSteps.size;

    return {
      steps: currentProgressSteps,
      completedCount: actualCompletedCount,
    };
  }, [completedSteps, totalSteps]);

  const progressPercent =
    completedCount === 0
      ? 0
      : Math.round((completedCount / totalSteps) * 100);

  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold">Onboarding Progress</h3>
        <Link to="/onboarding">
          <Button variant="outline" size="sm" className="gap-2">
            <Rocket className="w-4 h-4" />
            Buka Setup Wizard
          </Button>
        </Link>
      </div>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: `${progressPercent}%` }}
        />

        {/* Steps */}
        <div className="relative flex justify-between">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                "flex flex-col items-center text-center",
                index < steps.length - 1 && "flex-1"
              )}
            >
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center border-2 transition-all duration-300",
                  step.status === "completed" &&
                    "bg-accent border-accent text-accent-foreground",
                  step.status === "current" &&
                    "bg-background border-accent text-accent animate-pulse-amber",
                  step.status === "upcoming" &&
                    "bg-background border-border text-muted-foreground"
                )}
              >
                {step.status === "completed" ? (
                  <Check className="w-5 h-5" />
                ) : (
                  <span className="text-sm font-semibold">{step.id}</span>
                )}
              </div>
              <div className="mt-3 max-w-24">
                <p
                  className={cn(
                    "text-xs font-semibold",
                    step.status === "current" ? "text-accent" : "text-foreground"
                  )}
                >
                  {step.title}
                </p>
                <p className="text-xs text-muted-foreground mt-0.5 hidden md:block">
                  {step.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
