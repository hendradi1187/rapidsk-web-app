import { Layers, Database, FileText, Activity, Handshake, ArrowRight } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { WizardStepper } from "@/components/ui/wizard-stepper";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useParticipants, useParticipantDomains } from "@/api/hooks/useParticipants";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useDataTransfers } from "@/api/hooks/useDataTransfers";
import { useAuth } from "@/context/AuthContext";
import { V2_ROLE_LABELS } from "@/config/rbac";

const LINK_CLS =
  "block cursor-pointer rounded-xl text-inherit no-underline transition-transform hover:-translate-y-0.5 hover:shadow-lg";

const ProviderDashboard = () => {
  const { role, user } = useAuth();
  const navigate = useNavigate();
  const { data: participantsData } = useParticipants({ limit: 50 });
  const participants = participantsData?.data ?? [];
  const myParticipant =
    participants.find((participant) => participant.organization_type === "ENTERPRISE") ?? participants[0];

  const { data: domainsData } = useAllDomains({ limit: 1000 });
  const allDomains = domainsData?.data ?? [];
  const { data: mappingsData, isLoading: loadingMappings } = useParticipantDomains(myParticipant?.id ?? "", { limit: 20 });
  const mappings = mappingsData?.data ?? [];
  const focusedDomainId = mappings[0]?.domain_id || allDomains[0]?.id || "";

  const { data: datasetsData, isLoading: loadingDatasets } = useDatasets(focusedDomainId, { limit: 10 });
  const datasets = datasetsData?.data ?? [];
  const { data: agreementsData, isLoading: loadingAgreements } = useAgreements(focusedDomainId, { limit: 10 });
  const agreements = agreementsData?.data ?? [];
  const { data: transfersData, isLoading: loadingTransfers } = useDataTransfers(focusedDomainId, { limit: 5 });
  const transfers = transfersData?.data ?? [];

  const activeAgreements = agreements.filter((agreement: any) => agreement.status === "ACTIVE" || agreement.status === "APPROVED").length;

  return (
    <V2PageShell
      title="Dashboard Provider"
      subtitle={`${V2_ROLE_LABELS[role]} - ${user?.email || "Authenticated"}`}
      status="Live API"
    >
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Link to="/v2/admin-provider/assigned-domains" className={LINK_CLS}>
          <MetricCard
            title="Organization"
            value={myParticipant?.organization_name?.slice(0, 18) || "-"}
            subtitle="Click to view domains"
            icon={Handshake}
            trend="neutral"
          />
        </Link>
        <Link to="/v2/admin-provider/assigned-domains" className={LINK_CLS}>
          <MetricCard
            title="Assigned Domains"
            value={loadingMappings ? "..." : mappings.length}
            subtitle="Domains you can fulfil"
            icon={Layers}
            trend="up"
          />
        </Link>
        <Link to="/v2/admin-provider/dataset-registration" className={LINK_CLS}>
          <MetricCard
            title="Datasets"
            value={loadingDatasets ? "..." : datasets.length}
            subtitle="In focused domain"
            icon={Database}
            trend="up"
          />
        </Link>
        <Link to="/v2/admin-provider/contract-fulfilment" className={LINK_CLS}>
          <MetricCard
            title="Active Agreements"
            value={loadingAgreements ? "..." : activeAgreements}
            subtitle="Ready for provide"
            icon={Activity}
            trend="up"
          />
        </Link>
      </div>

      <Card className="mb-6 border-violet-500/20 bg-violet-500/5 shadow-xl shadow-violet-500/5">
        <CardHeader>
          <CardTitle className="text-lg text-violet-500">Provider Quick Start Guide</CardTitle>
          <CardDescription>Steps to fulfill data sharing obligations</CardDescription>
        </CardHeader>
        <CardContent>
          <WizardStepper
            currentStepId={mappings.length > 0 ? (datasets.length > 0 ? "contract-fulfilment" : "dataset-registration") : "assigned-domains"}
            onStepClick={(id) => {
              if (id === "assigned-domains") navigate("/v2/admin-provider/assigned-domains");
              if (id === "dataset-registration") navigate("/v2/admin-provider/dataset-registration");
              if (id === "contract-fulfilment") navigate("/v2/admin-provider/contract-fulfilment");
            }}
            onComplete={() => navigate("/v2/admin-provider/fulfilment-reports")}
            steps={[
              { id: "assigned-domains", title: "Acknowledge Domain", description: "Review assigned access", isCompleted: mappings.length > 0 },
              { id: "dataset-registration", title: "Register Datasets", description: "Catalog your data", isCompleted: datasets.length > 0 },
              { id: "contract-fulfilment", title: "Fulfil Contracts", description: "Attach datasets", isCompleted: activeAgreements > 0 },
            ]}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Layers className="h-5 w-5 text-primary" />
                Your Assigned Domains
              </CardTitle>
              <CardDescription>Granted by Admin Consumer</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/v2/admin-provider/assigned-domains">
                View all
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingMappings ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : mappings.length > 0 ? (
              <div className="space-y-2">
                {mappings.slice(0, 5).map((mapping: any) => {
                  const domain = allDomains.find((item) => item.id === mapping.domain_id);
                  return (
                    <div key={mapping.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20">
                      <div className="rounded bg-primary/10 p-1.5">
                        <Layers className="h-3.5 w-3.5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <p className="text-sm font-medium">{domain?.name || mapping.domain_id?.slice(0, 12)}</p>
                        <p className="text-xs text-muted-foreground">
                          {domain?.code || "-"} · Assigned {new Date(mapping.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge variant="outline" className="border-emerald-500/40 text-[10px] text-emerald-500">
                        {mapping.status}
                      </Badge>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No domains assigned. Hubungi Admin Consumer.</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Database className="h-5 w-5 text-primary" />
                Your Datasets
              </CardTitle>
              <CardDescription>Latest in focused domain</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/v2/admin-provider/dataset-registration">
                Manage
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {loadingDatasets ? (
              <div className="flex items-center justify-center py-8">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              </div>
            ) : datasets.length > 0 ? (
              <div className="space-y-2">
                {datasets.slice(0, 5).map((dataset: any) => (
                  <div key={dataset.id} className="flex items-center gap-3 rounded-lg border border-border/40 p-3 hover:bg-muted/20">
                    <div className="rounded bg-violet-500/10 p-1.5">
                      <Database className="h-3.5 w-3.5 text-violet-500" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{dataset.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {dataset.endpoint?.protocol || "-"} · v{dataset.version}
                      </p>
                    </div>
                    <Badge variant="outline" className="text-[10px]">
                      {dataset.status}
                    </Badge>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-muted-foreground">No datasets registered. Klik Manage untuk register.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-5 w-5 text-primary" />
                Active Agreements
              </CardTitle>
              <CardDescription>Yang siap di-trigger Provide</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/v2/admin-provider/contract-fulfilment">
                Open
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Agreement", "Status", "Effective", "Created"]} isLoading={loadingAgreements}>
              {agreements.length > 0 ? (
                agreements.slice(0, 5).map((agreement: any) => (
                  <tr key={agreement.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{agreement.id.slice(0, 8)}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {agreement.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {new Date(agreement.effective_from).toLocaleDateString()} - {new Date(agreement.effective_to).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(agreement.created_at).toLocaleDateString()}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No agreements yet.
                  </td>
                </tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2 text-base">
                <Activity className="h-5 w-5 text-primary" />
                Recent Data Transfers
              </CardTitle>
              <CardDescription>Latest {transfers.length} rows from /data-transfers</CardDescription>
            </div>
            <Button asChild size="sm" variant="outline" className="gap-1">
              <Link to="/v2/admin-provider/fulfilment-reports">
                Reports
                <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-700">
              Endpoint provider <code>/transfer-processes/history</code> belum bisa dipakai. Backend masih me-resolve
              <code className="mx-1 rounded bg-amber-500/10 px-1">history</code> sebagai <code>transfer_process_id</code>, jadi dashboard ini pakai
              <code className="mx-1 rounded bg-amber-500/10 px-1">/data-transfers</code>.
            </div>
            <DataTable headers={["Transfer", "Status", "From", "Last Sync"]} isLoading={loadingTransfers}>
              {transfers.length > 0 ? (
                transfers.map((transfer: any) => (
                  <tr key={transfer.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-xs font-medium">{transfer.name || `Transfer ${transfer.id.slice(0, 8)}`}</td>
                    <td className="px-4 py-3">
                      <Badge variant="outline" className="text-[10px]">
                        {transfer.status || "-"}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.from || "-"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">
                      {transfer.lastSync || transfer.updated_at || transfer.created_at
                        ? new Date(transfer.lastSync || transfer.updated_at || transfer.created_at).toLocaleString()
                        : "-"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={4} className="px-4 py-6 text-center text-xs text-muted-foreground">
                    No transfer rows in this domain yet.
                  </td>
                </tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>
    </V2PageShell>
  );
};

export default ProviderDashboard;
