// src/pages/v2/admin-provider/ProviderDashboard.tsx
import { Layers, Database, FileText, Activity, Handshake } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useParticipants, useParticipantDomains } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";

const ProviderDashboard = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { data: participantsData, isLoading: loadingP } = useParticipants({ limit: 50 });
  const participants = participantsData?.data ?? [];
  const myParticipant = participants.find(p => p.organization_type === "ENTERPRISE") ?? participants[0];

  const { data: mappingsData, isLoading: loadingM } = useParticipantDomains(myParticipant?.id ?? "", { limit: 20 });
  const mappings = mappingsData?.data ?? [];

  const steps = [
    { title: "Assigned Domains", desc: "View assigned domain access", icon: Layers, path: "/v2/admin-provider/assigned-domains" },
    { title: "Contract Fulfilment", desc: "Fulfil contract requirements", icon: FileText, path: "/v2/admin-provider/contract-fulfilment" },
    { title: "Dataset Registration", desc: "Register & upload datasets", icon: Database, path: "/v2/admin-provider/dataset-registration" },
    { title: "Fulfilment Reports", desc: "Transfer history & status", icon: Activity, path: "/v2/admin-provider/fulfilment-reports" },
  ];

  return (
    <V2PageShell title="Dashboard Provider" subtitle={`${V2_ROLE_LABELS[role]} — ${user?.email || "Authenticated"}`} status="Live API">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/v2/admin-provider/assigned-domains" className="block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl">
          <MetricCard title="Organization" value={myParticipant?.organization_name || "—"} subtitle="View assigned domains →" icon={Handshake} trend="neutral" />
        </Link>
        <Link to="/v2/admin-provider/assigned-domains" className="block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl">
          <MetricCard title="Assigned Domains" value={loadingM ? "..." : mappings.length} subtitle="Open domain map →" icon={Layers} trend="up" />
        </Link>
        <Link to="/v2/admin-provider/dataset-registration" className="block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl">
          <MetricCard title="Provider Status" value="Active" subtitle="Manage datasets →" icon={Activity} trend="up" />
        </Link>
        <Link to="/v2/admin-provider/contract-fulfilment" className="block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl">
          <MetricCard title="Workflow Steps" value="4" subtitle="Open contract fulfilment →" icon={FileText} trend="neutral" />
        </Link>
      </div>

      {/* Guided Onboarding Wizard */}
      <Card className="border-violet-500/20 bg-violet-500/5 shadow-xl shadow-violet-500/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-violet-500">Provider Quick Start Guide</CardTitle>
          <CardDescription>Follow these steps to fulfill your data sharing obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <WizardStepper
            currentStepId="assigned-domains" // For demo purposes
            onStepClick={(id) => {
              if (id === "assigned-domains") navigate("/v2/admin-provider/assigned-domains");
              if (id === "dataset-registration") navigate("/v2/admin-provider/dataset-registration");
              if (id === "contract-fulfilment") navigate("/v2/admin-provider/contract-fulfilment");
            }}
            steps={[
              {
                id: "assigned-domains",
                title: "Acknowledge Domain",
                description: "Review assigned access",
                isCompleted: mappings.length > 0
              },
              {
                id: "dataset-registration",
                title: "Dataset Cataloging",
                description: "Register datasets",
                isCompleted: false
              },
              {
                id: "contract-fulfilment",
                title: "Contract Agreement",
                description: "Review and accept contracts",
                isCompleted: false
              }
            ]}
          />
        </CardContent>
      </Card>

      {/* Assigned Domains Preview */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Layers className="h-5 w-5 text-primary" />
            Your Assigned Domains
          </CardTitle>
          <CardDescription>Domains you have been granted access to by the Admin Consumer</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingM ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : mappings.length > 0 ? (
            <div className="grid gap-3 sm:grid-cols-2">
              {mappings.map((m: any) => (
                <div key={m.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3 transition-colors hover:bg-muted/20">
                  <div className="rounded bg-primary/10 p-1.5"><Layers className="h-3.5 w-3.5 text-primary" /></div>
                  <div>
                    <p className="text-sm font-medium font-mono">{m.domain_id?.slice(0, 12)}...</p>
                    <p className="text-xs text-muted-foreground">Assigned {new Date(m.created_at).toLocaleDateString()}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No domains assigned yet. Contact your Admin Consumer.</p>
          )}
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default ProviderDashboard;
