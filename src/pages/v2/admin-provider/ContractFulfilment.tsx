// src/pages/v2/admin-provider/ContractFulfilment.tsx
import { useMemo, useState } from "react";
import { FileText, Database, Handshake, Layers, Plus, Trash2, Pencil } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import {
  useContracts,
  useUpdateContract,
  useContractPolicies,
  useDatasetPolicies,
} from "@/api/hooks/useContracts";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useAgreements } from "@/api/hooks/useAgreements";
import { providerApi } from "@/api/services/connector";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-slate-400/30 text-slate-400",
  APPROVED: "border-emerald-500/30 text-emerald-500",
  ACTIVE: "border-blue-500/30 text-blue-500",
  REQUESTED: "border-amber-500/30 text-amber-500",
};

const ContractFulfilment = () => {
  const { hasPermission } = useAuth();
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 50 });
  const domains = domainsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: contractsData, isLoading: loadingC } = useContracts(domainId, { limit: 50 });
  const { data: datasetsData, isLoading: loadingDS } = useDatasets(domainId, { limit: 50 });
  const { data: agreementsData, isLoading: loadingAgreements } = useAgreements(domainId, { limit: 50 });
  const { data: contractPoliciesData } = useContractPolicies(domainId, { limit: 50 });
  const { data: datasetPoliciesData } = useDatasetPolicies(domainId, { limit: 50 });

  const contracts = contractsData?.data ?? [];
  const datasets = datasetsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const contractPolicies = contractPoliciesData?.data ?? [];
  const datasetPolicies = datasetPoliciesData?.data ?? [];

  const updateContract = useUpdateContract();

  const [provideResult, setProvideResult] = useState("");
  const provideMutation = useMutation({
    mutationFn: (agreementId: string) => providerApi.provide(domainId, agreementId),
  });

  // ── Fulfilment dialog state ─────────────────────────────────────────────
  const [fulfilDialog, setFulfilDialog] = useState(false);
  const [activeContract, setActiveContract] = useState<any | null>(null);
  const [draftDatasets, setDraftDatasets] = useState<{ dataset_id: string; dataset_policy_id: string }[]>([]);
  const [draftCPolicies, setDraftCPolicies] = useState<string[]>([]);
  const [pickDatasetId, setPickDatasetId] = useState("");
  const [pickPolicyId, setPickPolicyId] = useState("");
  const [pickContractPolicyId, setPickContractPolicyId] = useState("");

  const canManage = hasPermission("contracts.manage") || hasPermission("fulfilment.manage");

  const openFulfilDialog = (contract: any) => {
    setActiveContract(contract);
    setDraftDatasets(
      Array.isArray(contract.datasets)
        ? contract.datasets.map((d: any) => ({
            dataset_id: d.dataset_id,
            dataset_policy_id: d.dataset_policy_id,
          }))
        : []
    );
    setDraftCPolicies(
      Array.isArray(contract.contract_policies)
        ? contract.contract_policies.map((p: any) => p.contract_policy_id)
        : []
    );
    setPickDatasetId("");
    setPickPolicyId("");
    setPickContractPolicyId("");
    setFulfilDialog(true);
  };

  const datasetById = useMemo(() => {
    const map = new Map<string, any>();
    datasets.forEach((d) => map.set(d.id, d));
    return map;
  }, [datasets]);

  const datasetPolicyById = useMemo(() => {
    const map = new Map<string, any>();
    datasetPolicies.forEach((p) => map.set(p.id, p));
    return map;
  }, [datasetPolicies]);

  const contractPolicyById = useMemo(() => {
    const map = new Map<string, any>();
    contractPolicies.forEach((p) => map.set(p.id, p));
    return map;
  }, [contractPolicies]);

  const availableDatasetPicks = datasets.filter(
    (d) => !draftDatasets.some((entry) => entry.dataset_id === d.id)
  );
  const availableContractPolicyPicks = contractPolicies.filter(
    (p) => !draftCPolicies.includes(p.id)
  );

  const handleAddDataset = () => {
    if (!pickDatasetId || !pickPolicyId) {
      toast.error("Pick dataset and dataset policy first");
      return;
    }
    setDraftDatasets((prev) => [...prev, { dataset_id: pickDatasetId, dataset_policy_id: pickPolicyId }]);
    setPickDatasetId("");
    setPickPolicyId("");
  };

  const handleRemoveDataset = (datasetId: string) => {
    setDraftDatasets((prev) => prev.filter((entry) => entry.dataset_id !== datasetId));
  };

  const handleAddContractPolicy = () => {
    if (!pickContractPolicyId) {
      toast.error("Pick a contract policy first");
      return;
    }
    setDraftCPolicies((prev) => [...prev, pickContractPolicyId]);
    setPickContractPolicyId("");
  };

  const handleRemoveContractPolicy = (id: string) => {
    setDraftCPolicies((prev) => prev.filter((entry) => entry !== id));
  };

  const handleSaveFulfilment = async () => {
    if (!activeContract || !domainId) return;
    try {
      await updateContract.mutateAsync({
        domainId,
        id: activeContract.id,
        data: {
          datasets: draftDatasets,
          contract_policies: draftCPolicies,
        },
      });
      toast.success("Contract fulfilment updated");
      setFulfilDialog(false);
      setActiveContract(null);
    } catch (error: any) {
      toast.error("Failed to update contract", {
        description: error?.response?.data?.detail || error?.message || "Unexpected error",
      });
    }
  };

  const handleProvide = async (agreementId: string) => {
    try {
      const response = await provideMutation.mutateAsync(agreementId);
      setProvideResult(JSON.stringify(response, null, 2));
      toast.success("Provider fulfilment endpoint executed");
    } catch (error: any) {
      toast.error("Provider fulfilment failed", {
        description: error?.response?.data?.error || error?.response?.data?.detail || "Unexpected error",
      });
    }
  };

  return (
    <V2PageShell title="Contract Fulfilment" subtitle="Attach datasets and contract policies to active contracts before triggering provider transfer." status="Live API">
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
        <p className="font-medium">How this page works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Contracts are <strong>created by the consumer</strong> in <code className="rounded bg-muted px-1">/v2/admin-consumer/policy-contract</code>. They appear here once they exist for the selected domain.</li>
          <li>Click <strong>Manage Fulfilment</strong> to attach existing datasets + policies to a contract.</li>
          <li>Once an agreement is created by the consumer, click <strong>Trigger Provide</strong> to push data through the connector endpoint.</li>
        </ul>
      </div>
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">Contracts, datasets, and policies are scoped per domain</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingD ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <MetricCard title="Active Contracts" value={loadingC ? "..." : contracts.length} subtitle="Requiring fulfilment" icon={FileText} trend="up" />
        <MetricCard title="Registered Datasets" value={loadingDS ? "..." : datasets.length} subtitle="Available for fulfilment" icon={Database} trend="neutral" />
        <MetricCard title="Fulfilment Rate" value={contracts.length > 0 ? `${Math.round((datasets.length / Math.max(contracts.length, 1)) * 100)}%` : "—"} subtitle="Datasets vs contracts" icon={Handshake} trend={datasets.length >= contracts.length ? "up" : "down"} />
      </div>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Contracts Requiring Fulfilment</CardTitle>
          <CardDescription>Click "Manage Fulfilment" to attach datasets + policies to a contract</CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Name", "Status", "Datasets", "Policies", "Created", "Actions"]} isLoading={!domainId || loadingC}>
            {contracts.length > 0 ? contracts.map((c: any) => (
              <tr key={c.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                <td className="px-4 py-3 text-sm">{c.datasets?.length ?? 0}</td>
                <td className="px-4 py-3 text-sm">{c.contract_policies?.length ?? 0}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={!canManage}
                    title={canManage ? "Attach datasets and policies to this contract" : "Missing permission contracts.manage / fulfilment.manage"}
                    onClick={() => openFulfilDialog(c)}
                  >
                    <Pencil className="h-4 w-4" />
                    Manage Fulfilment
                  </Button>
                </td>
              </tr>
            )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No contracts found" : "Select a domain"}</td></tr>)}
          </DataTable>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Agreement Execution</CardTitle>
          <CardDescription>Provider-side transfer trigger from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GET /api/v1/provider/{"{domain_id}"}/provide/{"{agreement_id}"}</code></CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Agreement", "Status", "Effective", "Action"]} isLoading={!domainId || loadingAgreements}>
            {agreements.length > 0 ? agreements.map((agreement: any) => (
              <tr key={agreement.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 font-mono text-xs">{agreement.id.slice(0, 8)}...</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[agreement.status] || ""}`}>{agreement.status}</Badge></td>
                <td className="px-4 py-3 text-xs text-muted-foreground">
                  {new Date(agreement.effective_from).toLocaleDateString()} - {new Date(agreement.effective_to).toLocaleDateString()}
                </td>
                <td className="px-4 py-3">
                  <Button size="sm" variant="outline" onClick={() => handleProvide(agreement.id)} disabled={provideMutation.isPending || !hasPermission("transfer.manage")}>
                    Trigger Provide
                  </Button>
                </td>
              </tr>
            )) : (
              <tr><td colSpan={4} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No agreements available for provider fulfilment" : "Select a domain"}</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <Card className="border-border/50">
        <CardHeader>
          <CardTitle className="text-base">Latest Provider Result</CardTitle>
          <CardDescription>Raw response from the provider fulfilment endpoint</CardDescription>
        </CardHeader>
        <CardContent>
          <pre className="max-h-80 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground">
            {provideResult || "No provider fulfilment has been triggered from this page yet."}
          </pre>
        </CardContent>
      </Card>

      {/* ── Fulfilment Dialog ────────────────────────────────────────────── */}
      <Dialog open={fulfilDialog} onOpenChange={(o) => { setFulfilDialog(o); if (!o) setActiveContract(null); }}>
        <DialogContent className="sm:max-w-3xl">
          <DialogHeader>
            <DialogTitle>Manage Contract Fulfilment</DialogTitle>
            <DialogDescription>
              {activeContract ? `Attach datasets and contract policies to "${activeContract.name}". Pick from existing records.` : ""}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6 py-2">
            {/* Datasets section */}
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Datasets</p>
                  <p className="text-xs text-muted-foreground">Each dataset binds to one dataset policy.</p>
                </div>
                <Badge variant="outline">{draftDatasets.length} attached</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="grid gap-1">
                  <Label className="text-xs">Dataset</Label>
                  <Select value={pickDatasetId} onValueChange={setPickDatasetId}>
                    <SelectTrigger><SelectValue placeholder={availableDatasetPicks.length ? "Pick dataset" : "All datasets attached"} /></SelectTrigger>
                    <SelectContent>
                      {availableDatasetPicks.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Dataset Policy</Label>
                  <Select value={pickPolicyId} onValueChange={setPickPolicyId}>
                    <SelectTrigger><SelectValue placeholder={datasetPolicies.length ? "Pick policy" : "No dataset policies"} /></SelectTrigger>
                    <SelectContent>
                      {datasetPolicies.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.type})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="gap-1 self-end" onClick={handleAddDataset} disabled={!pickDatasetId || !pickPolicyId}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/10">
                {draftDatasets.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Dataset</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Policy</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftDatasets.map((entry) => (
                        <tr key={entry.dataset_id} className="border-b border-border/20 last:border-0">
                          <td className="px-3 py-2 text-xs">{datasetById.get(entry.dataset_id)?.name || entry.dataset_id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-xs">{datasetPolicyById.get(entry.dataset_policy_id)?.name || entry.dataset_policy_id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-right">
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => handleRemoveDataset(entry.dataset_id)}>
                              <Trash2 className="h-3 w-3" />Remove
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">No datasets attached yet.</p>
                )}
              </div>
            </div>

            {/* Contract Policies section */}
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Contract Policies</p>
                  <p className="text-xs text-muted-foreground">Apply contract-level data classification windows.</p>
                </div>
                <Badge variant="outline">{draftCPolicies.length} attached</Badge>
              </div>

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-1">
                  <Label className="text-xs">Contract Policy</Label>
                  <Select value={pickContractPolicyId} onValueChange={setPickContractPolicyId}>
                    <SelectTrigger><SelectValue placeholder={availableContractPolicyPicks.length ? "Pick contract policy" : "All attached"} /></SelectTrigger>
                    <SelectContent>
                      {availableContractPolicyPicks.map((p) => (<SelectItem key={p.id} value={p.id}>{p.name} ({p.data_clasification})</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <Button size="sm" className="gap-1 self-end" onClick={handleAddContractPolicy} disabled={!pickContractPolicyId}>
                  <Plus className="h-4 w-4" />Add
                </Button>
              </div>

              <div className="rounded-lg border border-border/50 bg-muted/10">
                {draftCPolicies.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40">
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Policy</th>
                        <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Classification</th>
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftCPolicies.map((id) => {
                        const policy = contractPolicyById.get(id);
                        return (
                          <tr key={id} className="border-b border-border/20 last:border-0">
                            <td className="px-3 py-2 text-xs">{policy?.name || id.slice(0, 8)}</td>
                            <td className="px-3 py-2 text-xs">{policy?.data_clasification || "—"}</td>
                            <td className="px-3 py-2 text-right">
                              <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => handleRemoveContractPolicy(id)}>
                                <Trash2 className="h-3 w-3" />Remove
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">No contract policies attached yet.</p>
                )}
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfilDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveFulfilment} disabled={updateContract.isPending || !canManage}>
              {updateContract.isPending ? "Saving..." : "Save Fulfilment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </V2PageShell>
  );
};

export default ContractFulfilment;
