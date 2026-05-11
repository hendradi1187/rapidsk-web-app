import { Users2, Layers, ShieldCheck, KeyRound, BookOpen } from "lucide-react";
import { V2PageShell, MetricCard } from "../V2PageShell";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useParticipants } from "@/api/hooks/useParticipants";
import { useUsers } from "@/api/hooks/useUsers";
import { useAllDomains } from "@/api/hooks/useDomains";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";
import { SeedDemoData } from "@/components/dev/SeedDemoData";

const LINK_CLS = "block cursor-pointer text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg rounded-xl";

const AuthorityDashboard = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { data: participantsData, isLoading: loadingP } = useParticipants({ limit: 100 });
  const { data: usersData, isLoading: loadingU } = useUsers({ limit: 100 });
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 1000 });

  const participants = participantsData?.data ?? [];
  const users = usersData?.data ?? [];
  const domains = domainsData?.data ?? [];

  return (
    <V2PageShell title="Dashboard Authority" subtitle={`${V2_ROLE_LABELS[role]} - ${user?.email || "Authenticated"}`} status="Live API">
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/v2/authority/participant-registration" className={LINK_CLS}>
          <MetricCard title="Total Participants" value={loadingP ? "..." : participants.length} subtitle="Click to manage onboarding flow" icon={Users2} trend="up" />
        </Link>
        <Link to="/v2/authority/register-admin-consumer" className={LINK_CLS}>
          <MetricCard title="Registered Users" value={loadingU ? "..." : users.length} subtitle="Click to manage login accounts" icon={ShieldCheck} trend="up" />
        </Link>
        <Link to="/v2/admin-consumer/master-data" className={LINK_CLS}>
          <MetricCard title="Active Domains" value={loadingD ? "..." : domains.length} subtitle="Click to manage domain catalogs" icon={Layers} trend="neutral" />
        </Link>
        <Link to="/v2/authority/role-setup" className={LINK_CLS}>
          <MetricCard title="Role Setup" value="Configured" subtitle="Click to manage roles and permissions" icon={KeyRound} trend="neutral" />
        </Link>
      </div>

      <Card className="border-primary/20 bg-primary/5 shadow-xl shadow-primary/5 mb-6">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Authority Quick Start Guide</CardTitle>
          <CardDescription>Clear sequence to go from registration to activation</CardDescription>
        </CardHeader>
        <CardContent>
          {(() => {
            const consumerOrgExists = participants.some((p: any) => p.organization_type !== "ENTERPRISE");
            const providerOrgExists = participants.some((p: any) => p.organization_type === "ENTERPRISE");
            const consumerLoginExists = users.some((u: any) => u.category?.code === "CONSUMER");
            const providerLoginExists = users.some((u: any) => u.category?.code === "PROVIDER");
            const verifiedUserExists = users.some((u: any) => u.is_verified || u.is_email_confirmed);

            const currentStepId = !consumerOrgExists
              ? "register-org"
              : !consumerLoginExists
                ? "register-login"
                : !verifiedUserExists
                  ? "verify-email"
                  : "complete";

            return (
              <WizardStepper
                currentStepId={currentStepId}
                onStepClick={(id) => {
                  if (id === "register-org") navigate("/v2/authority/participant-registration");
                  if (id === "register-login") navigate("/v2/authority/register-admin-consumer");
                  if (id === "verify-email") navigate("/v2/authority/register-admin-consumer");
                  if (id === "complete") navigate("/v2/authority/dashboard");
                }}
                onComplete={() => navigate("/v2/admin-consumer/dashboard")}
                steps={[
                  {
                    id: "register-org",
                    title: "Register Participant",
                    description: `Consumer ${consumerOrgExists ? "done" : "pending"} | Provider ${providerOrgExists ? "done" : "pending"}`,
                    isCompleted: consumerOrgExists && providerOrgExists,
                  },
                  {
                    id: "register-login",
                    title: "Register Login Account",
                    description: `Consumer ${consumerLoginExists ? "done" : "pending"} | Provider ${providerLoginExists ? "done" : "pending"}`,
                    isCompleted: consumerLoginExists && providerLoginExists,
                  },
                  {
                    id: "verify-email",
                    title: "Verify Email",
                    description: verifiedUserExists ? "At least one user verified" : "No verified user yet",
                    isCompleted: verifiedUserExists,
                  },
                ]}
              />
            );
          })()}
        </CardContent>
      </Card>

      <Card className="border-violet-500/30 bg-gradient-to-r from-violet-500/5 to-purple-500/5">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Users2 className="h-5 w-5 text-violet-500" />
              Smoke Test - Demo Data
            </CardTitle>
            <CardDescription>One click seeds end-to-end demo chain for quick testing.</CardDescription>
          </div>
          <SeedDemoData />
        </CardHeader>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <BookOpen className="h-5 w-5 text-primary" />
            Recent Participants
          </CardTitle>
          <CardDescription>Live data from onboarding API. Main participant registration is in Onboarding Registration.</CardDescription>
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
                        <Badge variant="outline" className="text-xs">{p.organization_type}</Badge>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">{p.contact_person?.email || "-"}</td>
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
