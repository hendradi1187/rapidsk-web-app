// src/pages/v2/admin-provider/FulfilmentReports.tsx
import { useMemo, useState } from "react";
import { Activity, Layers, Database, Download, FileText, Handshake, AlertTriangle } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useMonitorings } from "@/api/hooks/useMonitorings";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useDataTransfers } from "@/api/hooks/useDataTransfers";
import { useCurrentSessionParticipant, useParticipantDomains } from "@/api/hooks/useParticipants";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { countAgreementIssues, countContractIssues, countTransferIssues, getApiErrorSummary } from "@/lib/provider-flow-diagnostics";

const toCsv = (rows: Record<string, any>[]): string => {
  if (!rows.length) return "";
  const headers = Array.from(
    rows.reduce((set, row) => {
      Object.keys(row).forEach((key) => set.add(key));
      return set;
    }, new Set<string>())
  );
  const escape = (val: any) => {
    if (val === null || val === undefined) return "";
    const str = typeof val === "object" ? JSON.stringify(val) : String(val);
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };
  const lines = [headers.join(",")];
  rows.forEach((row) => lines.push(headers.map((h) => escape(row[h])).join(",")));
  return lines.join("\n");
};

const downloadFile = (filename: string, content: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

const formatDateTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
};

const FulfilmentReports = () => {
  const { hasPermission, user } = useAuth();
  const isProvider = user?.role === "PROVIDER";
  const { data: domainsData, isLoading: loadingDomains, error: domainsError } = useAllDomains({ limit: 1000 });

  // Resolve provider's assigned domains — PROVIDER sees only their own, SUPER_ADMIN sees all
  const { participant: providerParticipant } = useCurrentSessionParticipant({ limit: 50 }, "forceProvider");
  const { data: assignedMappingsData } = useParticipantDomains(
    isProvider ? (providerParticipant?.id ?? "") : "",
    { limit: 100 }
  );
  const assignedDomainIds = useMemo(
    () => new Set((assignedMappingsData?.data ?? []).map((m) => m.domain_id)),
    [assignedMappingsData]
  );
  const allDomains = domainsData?.data ?? [];
  const domains = isProvider && assignedDomainIds.size > 0
    ? allDomains.filter((d) => assignedDomainIds.has(d.id))
    : allDomains;
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: monitoringsData, isLoading: loadingMonitorings } = useMonitorings(domainId, { limit: 50 });
  const { data: datasetsData, isLoading: loadingDatasets } = useDatasets(domainId, { limit: 50 });
  const { data: contractsData, isLoading: loadingContracts, error: contractsError } = useContracts(domainId, { limit: 50 });
  const { data: agreementsData, isLoading: loadingAgreements, error: agreementsError } = useAgreements(domainId, { limit: 50 });
  const { data: transfersData, isLoading: loadingTransfers, error: transfersError } = useDataTransfers(domainId, { limit: 100 });

  const monitorings = monitoringsData?.data ?? [];
  const datasets = datasetsData?.data ?? [];
  const contracts = contractsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const transfers = transfersData?.data ?? [];
  const contractIssues = countContractIssues(contracts);
  const agreementIssues = countAgreementIssues(agreements);
  const transferIssues = countTransferIssues(transfers);
  const diagnosticsTotal =
    Object.values(contractIssues).reduce((sum, count) => sum + count, 0) +
    Object.values(agreementIssues).reduce((sum, count) => sum + count, 0) +
    Object.values(transferIssues).reduce((sum, count) => sum + count, 0);
  const activeError = domainsError || contractsError || agreementsError || transfersError;
  const errorSummary = activeError ? getApiErrorSummary(activeError, "Fulfilment reports backend error") : null;

  const filteredTransfers = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return transfers;
    return transfers.filter((transfer: any) =>
      [
        transfer.name,
        transfer.from,
        transfer.to,
        transfer.status,
        transfer.type,
        transfer.agreement_id,
        transfer.sourceDataset,
        transfer.targetEndpoint,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q))
    );
  }, [searchQuery, transfers]);

  const activeContracts = contracts.filter((contract: any) => contract.status === "ACTIVE" || contract.status === "APPROVED");
  const activeAgreements = agreements.filter((agreement: any) => agreement.status === "ACTIVE" || agreement.status === "APPROVED");
  const completedTransfers = filteredTransfers.filter((transfer: any) => transfer.status === "completed").length;

  const canExport = hasPermission("reports.generate") || hasPermission("fulfilment.manage");

  const handleExport = (format: "csv" | "json") => {
    if (!domainId) {
      toast.error("Select a domain first");
      return;
    }
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    const domainCode = domains.find((d) => d.id === domainId)?.code || domainId.slice(0, 8);
    const baseName = `fulfilment-report_${domainCode}_${stamp}`;

    if (format === "json") {
      const payload = {
        generated_at: new Date().toISOString(),
        domain_id: domainId,
        contracts,
        agreements,
        data_transfers: filteredTransfers,
        datasets,
        monitorings,
      };
      downloadFile(`${baseName}.json`, JSON.stringify(payload, null, 2), "application/json");
      toast.success("JSON report downloaded");
      return;
    }

    const sections = [
      `# Contracts`,
      toCsv(contracts as any[]),
      ``,
      `# Agreements`,
      toCsv(agreements as any[]),
      ``,
      `# Data Transfers`,
      toCsv(filteredTransfers as any[]),
      ``,
      `# Datasets`,
      toCsv(datasets as any[]),
      ``,
      `# Monitoring`,
      toCsv(monitorings as any[]),
    ];
    downloadFile(`${baseName}.csv`, sections.join("\n"), "text/csv");
    toast.success("CSV report downloaded");
  };

  return (
    <V2PageShell
      title="Fulfilment Reports"
      subtitle="Provider fulfilment report memakai contract, agreement, dan data-transfer domain scope. Tidak lagi bergantung pada endpoint transfer-process history yang rusak."
      status="Live API"
    >
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
        Flow PROSES 4 pada provider sekarang dibaca dari <code>/data-transfers</code> + contract/agreement domain scope.
        Endpoint <code>/transfer-processes/history</code> tidak dipakai di halaman ini karena backend saat ini me-resolve <code>history</code> sebagai <code>transfer_process_id</code> dan melempar 422.
        Endpoint report khusus per-contract juga belum disediakan backend, jadi filter kontrak di halaman ini masih fallback ke scope domain + pencarian UI.
      </div>
      {errorSummary && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>{errorSummary.title}</AlertTitle>
          <AlertDescription>{errorSummary.detail}</AlertDescription>
        </Alert>
      )}
      {!errorSummary && diagnosticsTotal > 0 && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Fulfilment report data partially invalid</AlertTitle>
          <AlertDescription>
            {diagnosticsTotal} issue(s) detected. Transfer missing status: {transferIssues.missingStatus}, missing from: {transferIssues.missingFrom}, missing to: {transferIssues.missingTo}, missing agreement_id: {transferIssues.missingAgreementId}, missing timestamp: {transferIssues.missingTimestamp}, contract missing datasets field: {contractIssues.missingDatasets}, agreement missing contract_id: {agreementIssues.missingContractId}.
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Report scoped by domain, contract, agreement, and transfer logs</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingDomains ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((domain) => (<SelectItem key={domain.id} value={domain.id}>{domain.name} ({domain.code})</SelectItem>))}
          </SelectContent>
        </Select>
        <Input
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          placeholder="Filter transfer/agreement..."
          className="w-64"
        />
        <Button variant="outline" size="sm" disabled title="Backend belum menyediakan endpoint report khusus per-contract">
          Contract Filter API Belum Disediakan
        </Button>
        <Button variant="outline" size="sm" className="gap-2" disabled={!canExport || !domainId} onClick={() => handleExport("csv")}>
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
        <Button size="sm" className="gap-2" disabled={!canExport || !domainId} onClick={() => handleExport("json")}>
          <Download className="h-4 w-4" />
          Export JSON
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <MetricCard title="Active Contracts" value={loadingContracts ? "..." : activeContracts.length} subtitle="Contract scope for fulfilment" icon={FileText} trend="up" />
        <MetricCard title="Active Agreements" value={loadingAgreements ? "..." : activeAgreements.length} subtitle="Agreement scope for provider" icon={Handshake} trend="up" />
        <MetricCard title="Transfer Records" value={loadingTransfers ? "..." : filteredTransfers.length} subtitle={`${completedTransfers} completed`} icon={Activity} trend="up" />
        <MetricCard title="Datasets Provided" value={loadingDatasets ? "..." : datasets.length} subtitle="Registered provider datasets" icon={Database} trend="neutral" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><FileText className="h-5 w-5 text-primary" />Contracts in Scope</CardTitle>
            <CardDescription>Provider can only fulfil contracts visible in this domain scope</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Contract", "Status", "Datasets", "Policies"]} isLoading={!domainId || loadingContracts}>
              {contracts.length > 0 ? contracts.map((contract: any) => (
                <tr key={contract.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{contract.name}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{contract.status}</Badge></td>
                  <td className="px-4 py-3 text-sm">{contract.datasets?.length ?? 0}</td>
                  <td className="px-4 py-3 text-sm">{contract.contract_policies?.length ?? 0}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No contracts" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Handshake className="h-5 w-5 text-primary" />Agreements in Scope</CardTitle>
            <CardDescription>Agreement status remains the gate before provider transfer execution</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Agreement", "Contract", "Status", "Effective"]} isLoading={!domainId || loadingAgreements}>
              {agreements.length > 0 ? agreements.map((agreement: any) => (
                <tr key={agreement.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{agreement.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{agreement.contract_id?.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{agreement.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(agreement.effective_from)} → {formatDateTime(agreement.effective_to)}</td>
                </tr>
              )) : (
                <tr><td colSpan={4} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No agreements" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Activity className="h-5 w-5 text-primary" />Data Transfer Logs</CardTitle>
            <CardDescription>
              Primary fulfilment evidence from <code className="rounded bg-muted px-1">/data-transfers</code>.
              Backend belum menyediakan endpoint dedicated report by contract.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Name", "From", "To", "Status", "Last Sync"]} isLoading={!domainId || loadingTransfers}>
              {filteredTransfers.length > 0 ? filteredTransfers.map((transfer: any) => (
                <tr key={transfer.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{transfer.name || `Transfer ${transfer.id}`}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.from || "—"}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{transfer.to || "—"}</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{transfer.status || "—"}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">{formatDateTime(transfer.lastSync || transfer.updated_at || transfer.created_at)}</td>
                </tr>
              )) : (
                <tr><td colSpan={5} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No data transfers for this domain/filter" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base"><Layers className="h-5 w-5 text-primary" />Monitoring Supplements</CardTitle>
            <CardDescription>Supplemental provider-side monitoring config and dataset inventory</CardDescription>
          </CardHeader>
          <CardContent>
            <DataTable headers={["Participant", "Log", "Realtime"]} isLoading={!domainId || loadingMonitorings}>
              {monitorings.length > 0 ? monitorings.map((monitoring) => (
                <tr key={monitoring.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 font-mono text-xs">{monitoring.participant_id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.log.enabled ? `${monitoring.log.retention}d` : "Off"}</Badge></td>
                  <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{monitoring.notification.realtime ? "Yes" : "No"}</Badge></td>
                </tr>
              )) : (
                <tr><td colSpan={3} className="px-4 py-8 text-center text-sm text-muted-foreground">{domainId ? "No monitoring records" : "Select a domain"}</td></tr>
              )}
            </DataTable>
          </CardContent>
        </Card>
      </div>
    </V2PageShell>
  );
};

export default FulfilmentReports;
