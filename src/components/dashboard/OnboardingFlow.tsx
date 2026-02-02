import { Check, Circle, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const steps = [
  { id: 1, title: "Setup Organization", description: "Create org & participants", status: "completed" },
  { id: 2, title: "Define Vocabulary", description: "Metadata schema & terms", status: "completed" },
  { id: 3, title: "Register Dataset", description: "Add GeoServer endpoints", status: "current" },
  { id: 4, title: "Create Contract", description: "Define policies", status: "upcoming" },
  { id: 5, title: "Setup Transfer", description: "Configure data channels", status: "upcoming" },
  { id: 6, title: "Enable Monitoring", description: "Audit & compliance", status: "upcoming" },
];

export const OnboardingFlow = () => {
  return (
    <div className="bg-card rounded-xl border border-border p-6">
      <h3 className="text-lg font-semibold mb-6">Onboarding Progress</h3>
      <div className="relative">
        {/* Progress Line */}
        <div className="absolute top-5 left-5 right-5 h-0.5 bg-border" />
        <div
          className="absolute top-5 left-5 h-0.5 bg-accent transition-all duration-500"
          style={{ width: "33%" }}
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
