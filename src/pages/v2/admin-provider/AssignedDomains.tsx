// src/pages/v2/admin-provider/AssignedDomains.tsx
import { Layers, Network, RefreshCcw, AlertTriangle } from "lucide-react";
import { Link } from "react-router-dom";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useContracts } from "@/api/hooks/useContracts";
import { useCurrentSessionParticipant, useParticipantDomains, useParticipants } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { useState } from "react";
import { toast } from "sonner";
import { countMappingIssues, getApiErrorSummary } from "@/lib/provider-flow-diagnostics";

const CONTRACT_STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-slate-400/30 text-slate-400",
  APPROVED: "border-emerald-500/30 text-emerald-500",
  ACTIVE: "border-blue-500/30 text-blue-500",
  REQUESTED: "border-amber-500/30 text-amber-500",
  REJECTED: "border-red-500/30 text-red-500",
};

const AssignedDomains = () => {
  const { user } = useAuth();
  const isSuperAdmin = user?.role === "SUPER_ADMIN";
  const { participant: sessionParticipant, isLoading: loadingParticipant, refetch: refetchParticipant } = useCurrentSessionParticipant({ limit: 50 }, "forceProvider");
  const { data: allParticipantsData } = useParticipants({ limit: 100 });
  const enterpriseParticipants = (allParticipantsData?.data ?? []).filter((p) => p.organization_type === "ENTERPRISE");
  const [actAsProviderId, setActAsProviderId] = useState<string>("");
  const myParticipant = isSuperAdmin
    ? enterpriseParticipants.find((p) => p.id === actAsProviderId) || enterpriseParticipants[0]
    : sessionParticipant;

  const { data: mappingsData, isLoading: loadingMappings, refetch: refetchMappings, error: mappingsError } = useParticipantDomains(myParticipant?.id ?? "", { limit: 50 });
  const { data: domainsData, error: domainsError } = useAllDomains({ limit: 1000 });
  const mappings = mappingsData?.data ?? [];
  const allDomains = domainsData?.data ?? [];
  const [selectedDomainId, setSelectedDomainId] = useState<string>("");
  const focusedDomainId = selectedDomainId || mappings[0]?.domain_id || "";

  const { data: datasetsData } = useDatasets(focusedDomainId, { limit: 50 });
  const { data: contractsData } = useContracts(focusedDomainId, { limit: 50 });
  const datasets = datasetsData?.data ?? [];
  const contracts = contractsData?.data ?? [];
  const mappingIssues = countMappingIssues(mappings);
  const mappingIssueTotal = Object.values(mappingIssues).reduce((sum, count) => sum + count, 0);
  const activeError = mappingsError || domainsError;
  const errorSummary = activeError ? getApiErrorSummary(activeError, "Assigned domain backend error") : null;

  const handleRefresh = () => {
    refetchParticipant();
    refetchMappings();
  };

  const domainName = (id: string) => {
    const found = allDomains.find((d) => d.id === id);
    return found ? `${found.name} (${found.code})` : id.slice(0, 12);
  };

  return (
    <V2PageShell title="Assigned Domains" subtitle="Domains assigned to your provider organization, with the datasets and contracts you can fulfil." status="Live API">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/5 p-4 text-sm text-emerald-700">
        Flow PROSES 2 sudah memakai endpoint live yang sesuai: participant provider dibaca dari session, lalu mapping domain dibaca dari
        <code className="mx-1 rounded bg-emerald-500/10 px-1">/onboarding/participants/{"{participant_id}"}/domains</code>.
        Di modul ini belum ada gap endpoint yang blokir view.
      </div>
      {errorSummary && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{errorSummary.title}</AlertTitle>
          <AlertDescription>{errorSummary.detail}</AlertDescription>
        </Alert>
      )}
      {!errorSummary && mappingIssueTotal > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Assigned domain data partially invalid</AlertTitle>
          <AlertDescription>
            {mappingIssueTotal} issue(s) detected. Missing domain_id: {mappingIssues.missingDomainId}, missing status: {mappingIssues.missingStatus}.
          </AlertDescription>
        </Alert>
      )}
      {isSuperAdmin && (
        <div className="flex items-center gap-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4">
          <Network className="h-5 w-5 text-amber-500" />
          <div className="flex-1">
            <p className="text-sm font-medium">Acting As Provider (SUPER_ADMIN view)</p>
            <p className="text-xs text-muted-foreground">Pick which KKKS provider to inspect. PROVIDER users see only their own organization automatically.</p>
          </div>
          <Select value={myParticipant?.id || ""} onValueChange={setActAsProviderId}>
            <SelectTrigger className="w-72"><SelectValue placeholder={enterpriseParticipants.length ? "Select provider" : "No ENTERPRISE participants registered"} /></SelectTrigger>
            <SelectContent>
              {enterpriseParticipants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Your Organization" value={myParticipant?.organization_name || "—"} subtitle="Resolved from authenticated session" icon={Network} trend="neutral" />
        <MetricCard title="Assigned Domains" value={loadingMappings ? "..." : mappings.length} subtitle="Active domain access" icon={Layers} trend="up" />
        <MetricCard title="Access Status" value={mappings.length > 0 ? "Active" : "Pending"} subtitle="Scoped provider access" icon={Layers} trend={mappings.length > 0 ? "up" : "down"} />
      </div>

      <Card className="border-border/50">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Domain Access Map</CardTitle>
            <CardDescription>
              Provider-scoped mappings from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">/participants/{"{id}"}/domains</code>
            </CardDescription>
          </div>
          <Button size="sm" variant="outline" className="gap-2" onClick={handleRefresh}>
            <RefreshCcw className="h-4 w-4" />
            Refresh
          </Button>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Domain", "Assigned", "Mapping Status", "Contracts", "Action"]} isLoading={loadingParticipant || loadingMappings}>
            {mappings.length > 0 ? mappings.map((mapping) => {
              const isFocused = mapping.domain_id === focusedDomainId;
              const domainContracts = isFocused ? contracts : [];
              return (
                <tr key={mapping.id} className={`transition-colors hover:bg-muted/20 ${isFocused ? "bg-muted/30" : ""}`}>
                  <td className="px-4 py-3 text-sm font-medium">{domainName(mapping.domain_id)}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(mapping.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="border-emerald-500/30 text-emerald-500 text-xs">{mapping.status}</Badge>
                  </td>
                  <td className="px-4 py-3">
                    {isFocused ? (
                      domainContracts.length === 0
                        ? <span className="text-xs text-muted-foreground">No contracts</span>
                        : <div className="flex flex-wrap gap-1">
                            {domainContracts.slice(0, 3).map((c: any) => (
                              <Badge key={c.id} variant="outline" className={`text-[10px] ${CONTRACT_STATUS_COLORS[c.status] || ""}`}>
                                {c.name?.slice(0, 14)} · {c.status}
                              </Badge>
                            ))}
                            {domainContracts.length > 3 && (
                              <span className="text-xs text-muted-foreground">+{domainContracts.length - 3} more</span>
                            )}
                          </div>
                    ) : (
                      <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground" onClick={() => setSelectedDomainId(mapping.domain_id)}>
                        Focus to view
                      </Button>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={isFocused ? "default" : "outline"} onClick={() => setSelectedDomainId(mapping.domain_id)}>
                      {isFocused ? "Focused" : "Focus"}
                    </Button>
                  </td>
                </tr>
              );
            }) : (
              <tr>
                <td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">
                  {myParticipant ? "No domains assigned yet. Your Admin Consumer needs to map your organization first." : "No provider participant could be resolved for the current session."}
                </td>
              </tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      {focusedDomainId && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Datasets in {domainName(focusedDomainId)}</CardTitle>
              <CardDescription>Datasets you have registered in this domain</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Protocol", "Status"]}>
                {datasets.length > 0 ? datasets.map((d) => (
                  <tr key={d.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{d.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{d.endpoint?.protocol || "—"}</Badge></td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{d.status}</Badge></td>
                  </tr>
                )) : (<tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">No datasets registered in this domain yet.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>

          <Card className="border-border/50">
            <CardHeader>
              <CardTitle className="text-base">Contracts in {domainName(focusedDomainId)}</CardTitle>
              <CardDescription>Contracts that may require your fulfilment</CardDescription>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Status", "Datasets"]}>
                {contracts.length > 0 ? contracts.map((c: any) => (
                  <tr key={c.id} className="hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{c.status}</Badge></td>
                    <td className="px-4 py-3 text-sm">{c.datasets?.length ?? 0}</td>
                  </tr>
                )) : (<tr><td colSpan={3} className="px-4 py-8 text-center text-xs text-muted-foreground">No contracts in this domain yet.</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </div>
      )}
    </V2PageShell>
  );
};

export default AssignedDomains;
