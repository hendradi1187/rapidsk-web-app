// src/pages/v2/authority/AuthorityDashboard.tsx
import { Users2, Layers, ShieldCheck, KeyRound, BookOpen, Building2, UserPlus } from "lucide-react";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useUsers } from "@/api/hooks/useUsers";
import { useAllDomains } from "@/api/hooks/useDomains";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";

const LINK_CLS = "block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl";

const AuthorityDashboard = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { data: participantsData, isLoading: loadingP } = useParticipants({ limit: 100 });
  const { data: usersData, isLoading: loadingU } = useUsers({ limit: 100 });
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 100 });

  const participants = participantsData?.data ?? [];
  const users = usersData?.data ?? [];
  const domains = domainsData?.data ?? [];

  return (
    <V2PageShell title="Dashboard Authority" subtitle={`${V2_ROLE_LABELS[role]} — ${user?.email || "Authenticated"}`} status="Live API">
      {/* Metrics — clickable cards that navigate to detail pages */}
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/v2/admin-consumer/admin-provider" className={LINK_CLS}>
          <MetricCard title="Total Participants" value={loadingP ? "..." : participants.length} subtitle="Click to manage organizations →" icon={Users2} trend="up" />
        </Link>
        <Link to="/v2/authority/register-admin-consumer" className={LINK_CLS}>
          <MetricCard title="Registered Users" value={loadingU ? "..." : users.length} subtitle="Click to manage login accounts →" icon={ShieldCheck} trend="up" />
        </Link>
        <Link to="/v2/admin-consumer/master-data" className={LINK_CLS}>
          <MetricCard title="Active Domains" value={loadingD ? "..." : domains.length} subtitle="Click to manage in Master Data →" icon={Layers} trend="neutral" />
        </Link>
        <Link to="/v2/authority/role-setup" className={LINK_CLS}>
          <MetricCard title="Role Setup" value="Configured" subtitle="Click to manage Categories & Groups →" icon={KeyRound} trend="neutral" />
        </Link>
      </div>

      {/* Guided Onboarding Wizard */}
      <Card className="border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Authority Quick Start Guide</CardTitle>
          <CardDescription>Follow these steps to initialize your Dataspace environment</CardDescription>
        </CardHeader>
        <CardContent>
          <WizardStepper
            currentStepId={users.length > 0 ? (participants.length > 0 ? "activate" : "register") : "roles"}
            onStepClick={(id) => {
              if (id === "roles") navigate("/v2/authority/role-setup");
              if (id === "register") navigate("/v2/authority/register-admin-consumer");
              if (id === "activate") navigate("/v2/authority/activation");
            }}
            onComplete={() => {
              navigate("/v2/admin-consumer/dashboard");
            }}
            steps={[
              {
                id: "roles",
                title: "Setup Roles",
                description: "Define Categories & Groups",
                isCompleted: users.length > 0
              },
              {
                id: "register",
                title: "Register Consumer",
                description: "Create SKK Migas participant",
                isCompleted: participants.length > 0
              },
              {
                id: "activate",
                title: "Send Activation",
                description: "Email code to Consumer",
                isCompleted: false
              }
            ]}
          />
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <UserPlus className="h-5 w-5 text-primary" />
              User Provisioning
            </CardTitle>
            <CardDescription>Create consumer and provider test accounts directly from V2 authority flow.</CardDescription>
          </div>
          <Button asChild size="sm" className="gap-2">
            <Link to="/v2/authority/user-provisioning">
              <UserPlus className="h-4 w-4" />
              Open Provisioning
            </Link>
          </Button>
        </CardHeader>
      </Card>

      {/* Recent Participants */}
      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" />
            Recent Participants
          </CardTitle>
          <CardDescription>Live data from onboarding API</CardDescription>
        </CardHeader>
        <CardContent>
          {loadingP ? (
            <div className="flex items-center justify-center py-8">
              <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
            </div>
          ) : participants.length > 0 ? (
            <div className="overflow-hidden rounded-lg border border-border/40">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border/40 bg-muted/30">
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Organization</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Type</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contact</th>
                    <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Created</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {participants.slice(0, 5).map((p) => (
                    <tr key={p.id} className="transition-colors hover:bg-muted/20">
                      <td className="px-4 py-3 text-sm font-medium">{p.organization_name}</td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs">
                          {p.organization_type}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.contact_person?.email || "—"}</td>
                      <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="flex flex-col items-center py-12 text-center">
              <Users2 className="mb-3 h-10 w-10 text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">No participants registered yet</p>
            </div>
          )}
        </CardContent>
      </Card>
    </V2PageShell>
  );
};

export default AuthorityDashboard;
