import { Check, Rocket } from "lucide-react";
import { cn } from "@/lib/utils";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useMemo } from "react";

const stepDefinitions = [
  { id: 1, title: "Setup Organization", description: "Create org & participants" },
  { id: 2, title: "Define Domain", description: "Create governance domain" },
  { id: 3, title: "Register Dataset", description: "Add GeoServer endpoints" },
  { id: 4, title: "Create Contract", description: "Define policies" },
  { id: 5, title: "Setup Transfer", description: "Configure data channels" },
  { id: 6, title: "Enable Monitoring", description: "Audit & compliance" },
];

export const OnboardingFlow = () => {
  const { data: orgsData } = useOrganizations({ limit: 1 });
  const { data: domainsData } = useAllDomains({ limit: 1 });
  const { data: participantsData } = useParticipants({ limit: 1 });

  const { steps, completedCount } = useMemo(() => {
    const hasOrgs = (orgsData?.total ?? 0) > 0;
    const hasDomains = (domainsData?.total ?? 0) > 0;
    const hasParticipants = (participantsData?.total ?? 0) > 0;

    // Determine step statuses based on real data
    const statuses: Array<"completed" | "current" | "upcoming"> = [];

    // Step 1: Organization - completed if org + participant exist
    statuses.push(hasOrgs && hasParticipants ? "completed" : hasOrgs ? "completed" : "current");

    // Step 2: Domain - completed if domains exist
    if (statuses[0] === "completed") {
      statuses.push(hasDomains ? "completed" : "current");
    } else {
      statuses.push("upcoming");
    }

    // Steps 3-6: can't be determined without domain-scoped queries
    for (let i = 2; i < 6; i++) {
      if (statuses[i - 1] === "completed") {
        statuses.push("current");
      } else {
        statuses.push("upcoming");
      }
    }

    const completed = statuses.filter((s) => s === "completed").length;
    return {
      steps: stepDefinitions.map((def, i) => ({ ...def, status: statuses[i] })),
      completedCount: completed,
    };
  }, [orgsData, domainsData, participantsData]);

  const progressPercent =
    completedCount === 0
      ? 0
      : Math.round((completedCount / stepDefinitions.length) * 100);

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
