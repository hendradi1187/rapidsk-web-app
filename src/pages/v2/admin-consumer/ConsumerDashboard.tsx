// src/pages/v2/admin-consumer/ConsumerDashboard.tsx
import { Layers, BookOpen, FileText, Handshake, Network, Activity } from "lucide-react";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";

const ConsumerDashboard = () => {
  const { role, user } = useAuth();
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 50 });
  const { data: participantsData, isLoading: loadingP } = useParticipants({ limit: 50 });

  const domains = domainsData?.data ?? [];
  const participants = participantsData?.data ?? [];

  const steps = [
    { title: "Master Data", desc: "Vocabulary, Schema, Metadata", icon: BookOpen, path: "/v2/admin-consumer/master-data", status: "ready" },
    { title: "Policy & Contract", desc: "Create policies and contracts", icon: FileText, path: "/v2/admin-consumer/policy-contract", status: "ready" },
    { title: "System Setup", desc: "Connection pools & monitoring", icon: Network, path: "/v2/admin-consumer/system-setup", status: "ready" },
    { title: "Admin Provider", desc: "Register KKKS provider", icon: Handshake, path: "/v2/admin-consumer/admin-provider", status: "ready" },
    { title: "Domain Mapping", desc: "Map providers to domains", icon: Layers, path: "/v2/admin-consumer/domain-mapping", status: "ready" },
    { title: "Transfer Monitor", desc: "Monitor data transfers", icon: Activity, path: "/v2/admin-consumer/transfer-monitor", status: "ready" },
  ];

  return (
    <V2PageShell title="Dashboard Consumer" subtitle={`${V2_ROLE_LABELS[role]} — ${user?.email || "Authenticated"}`} status="Live API">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Active Domains" value={loadingD ? "..." : domains.length} subtitle="Governance API" icon={Layers} trend="up" />
        <MetricCard title="Participants" value={loadingP ? "..." : participants.length} subtitle="Onboarding API" icon={Handshake} trend="up" />
        <MetricCard title="Providers" value={loadingP ? "..." : participants.filter(p => p.organization_type === "ENTERPRISE").length} subtitle="Enterprise type" icon={Network} trend="neutral" />
        <MetricCard title="Workflow Steps" value="6" subtitle="All steps available" icon={Activity} trend="neutral" />
      </div>

      {/* Guided Onboarding Wizard */}
      <Card className="border-blue-500/20 bg-blue-500/5 shadow-xl shadow-blue-500/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-blue-500">Consumer Quick Start Guide</CardTitle>
          <CardDescription>Follow these steps to configure the dataspace rules and invite providers</CardDescription>
        </CardHeader>
        <CardContent>
          <WizardStepper
            currentStepId="master-data" // For demo purposes, we can leave it at step 1 or make it dynamic
            onStepClick={(id) => {
              if (id === "master-data") window.location.href = "/v2/admin-consumer/master-data";
              if (id === "policy") window.location.href = "/v2/admin-consumer/policy-contract";
              if (id === "provider") window.location.href = "/v2/admin-consumer/admin-provider";
              if (id === "mapping") window.location.href = "/v2/admin-consumer/domain-mapping";
            }}
            steps={[
              {
                id: "master-data",
                title: "Master Data",
                description: "Define Vocabulary & Schema",
                isCompleted: domains.length > 0 // dummy condition
              },
              {
                id: "policy",
                title: "Policy & Contract",
                description: "Create data rules",
                isCompleted: false
              },
              {
                id: "provider",
                title: "Partner Setup",
                description: "Register KKKS Provider",
                isCompleted: participants.filter(p => p.organization_type === "ENTERPRISE").length > 0
              },
              {
                id: "mapping",
                title: "Domain Mapping",
                description: "Assign Provider to Domain",
                isCompleted: false
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Recent Domains */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-primary" />
            Active Domains
          </CardTitle>
          <CardDescription>Domains available for data operations</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingD ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : domains.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {domains.map((d) => (
                <div key={d.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/20">
                  <div className="rounded bg-primary/10 p-1.5">
                    <Layers className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{d.name}</p>
                    <p className="text-xs text-muted-foreground font-mono">{d.code}</p>
                  </div>
                  <Badge variant="outline" className={d.status === "ACTIVE" ? "border-emerald-500/30 text-emerald-500 text-[10px]" : "text-[10px]"}>{d.status}</Badge>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No domains configured yet</p>
          )}
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default ConsumerDashboard;
