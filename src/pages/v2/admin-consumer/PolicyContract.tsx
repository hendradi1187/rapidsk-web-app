// src/pages/v2/admin-consumer/PolicyContract.tsx
import { useState } from "react";
import { FileText, Shield, Handshake, Layers, Plus, Pencil, Trash2 } from "lucide-react";
import { useMutation } from "@tanstack/react-query";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants } from "@/api/hooks/useParticipants";
import {
  useContracts,
  useCreateContract,
  useUpdateContract,
  useDeleteContract,
  useContractPolicies,
  useCreateContractPolicy,
  useUpdateContractPolicy,
  useDeleteContractPolicy,
  useDatasetPolicies,
  useCreateDatasetPolicy,
  useUpdateDatasetPolicy,
  useDeleteDatasetPolicy,
} from "@/api/hooks/useContracts";
import { useAgreements, useCreateAgreement, useDeleteAgreement, useUpdateAgreement } from "@/api/hooks/useAgreements";
import { consumerApi } from "@/api/services/connector";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-slate-400/30 text-slate-400",
  APPROVED: "border-emerald-500/30 text-emerald-500",
  ACTIVE: "border-blue-500/30 text-blue-500",
  REQUESTED: "border-amber-500/30 text-amber-500",
  REJECTED: "border-red-500/30 text-red-500",
  DEPRECATED: "border-slate-500/30 text-slate-500",
};

const emptyDatasetPolicyForm = {
  name: "",
  type: "ACCESS",
  version: "1.0.0",
  description: "",
};

const emptyContractForm = {
  name: "",
  description: "",
  consumer_id: "",
  provider_id: "",
};

const emptyContractPolicyForm = {
  name: "",
  data_clasification: "INTERNAL",
  effective_from: "",
  effective_to: "",
  description: "",
};

const PolicyContract = () => {
  const { hasPermission } = useAuth();
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 50 });
  const { data: participantsData } = useParticipants({ limit: 100 });
  const domains = domainsData?.data ?? [];
  const participants = participantsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const consumerParticipants = participants.filter((p) => p.organization_type !== "ENTERPRISE");
  const providerParticipants = participants.filter((p) => p.organization_type === "ENTERPRISE");

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: policiesData, isLoading: loadingPol } = useDatasetPolicies(domainId, { limit: 50 });
  const { data: contractsData, isLoading: loadingC } = useContracts(domainId, { limit: 50 });
  const { data: cPoliciesData, isLoading: loadingCP } = useContractPolicies(domainId, { limit: 50 });
  const { data: agreementsData, isLoading: loadingA } = useAgreements(domainId, { limit: 50 });

  const policies = policiesData?.data ?? [];
  const contracts = contractsData?.data ?? [];
  const cPolicies = cPoliciesData?.data ?? [];
  const agreements = agreementsData?.data ?? [];

  // ── Mutations ───────────────────────────────────────────────────────────
  const createDatasetPolicy = useCreateDatasetPolicy();
  const updateDatasetPolicy = useUpdateDatasetPolicy();
  const deleteDatasetPolicy = useDeleteDatasetPolicy();

  const createContract = useCreateContract();
  const updateContract = useUpdateContract();
  const deleteContract = useDeleteContract();

  const createContractPolicy = useCreateContractPolicy();
  const updateContractPolicy = useUpdateContractPolicy();
  const deleteContractPolicy = useDeleteContractPolicy();

  const createAgreement = useCreateAgreement();
  const deleteAgreement = useDeleteAgreement();
  const updateAgreement = useUpdateAgreement();
  const consumeMutation = useMutation({
    mutationFn: (agreementId: string) => consumerApi.consume(domainId, agreementId),
  });

  // ── Dataset Policy state ────────────────────────────────────────────────
  const [datasetPolicyDialog, setDatasetPolicyDialog] = useState(false);
  const [editingDatasetPolicy, setEditingDatasetPolicy] = useState<any | null>(null);
  const [datasetPolicyForm, setDatasetPolicyForm] = useState(emptyDatasetPolicyForm);
  const [datasetPolicyDelete, setDatasetPolicyDelete] = useState<any | null>(null);

  const openDatasetPolicy = (record?: any) => {
    if (record) {
      setEditingDatasetPolicy(record);
      setDatasetPolicyForm({
        name: record.name || "",
        type: record.type || "ACCESS",
        version: record.version || "1.0.0",
        description: record.description || "",
      });
    } else {
      setEditingDatasetPolicy(null);
      setDatasetPolicyForm(emptyDatasetPolicyForm);
    }
    setDatasetPolicyDialog(true);
  };

  const handleSaveDatasetPolicy = async () => {
    if (!domainId || !datasetPolicyForm.name) {
      toast.error("Domain and name are required");
      return;
    }
    try {
      if (editingDatasetPolicy) {
        await updateDatasetPolicy.mutateAsync({
          domainId,
          id: editingDatasetPolicy.id,
          data: {
            name: datasetPolicyForm.name,
            version: datasetPolicyForm.version,
            type: datasetPolicyForm.type as any,
            description: datasetPolicyForm.description || null,
            rules: editingDatasetPolicy.rules?.map((r: any) => ({
              left_operand: r.left_operand,
              right_operand: r.right_operand,
              operator: r.operator,
            })) || [],
          },
        });
        toast.success("Dataset policy updated");
      } else {
        await createDatasetPolicy.mutateAsync({
          domainId,
          data: {
            name: datasetPolicyForm.name,
            description: datasetPolicyForm.description || null,
            version: datasetPolicyForm.version,
            type: datasetPolicyForm.type,
            rules: [],
          },
        });
        toast.success("Dataset policy created");
      }
      setDatasetPolicyDialog(false);
    } catch (error: any) {
      toast.error("Failed to save dataset policy", {
        description: error?.response?.data?.detail || error?.message || "Unexpected error",
      });
    }
  };

  // ── Contract state ──────────────────────────────────────────────────────
  const [contractDialog, setContractDialog] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [contractDelete, setContractDelete] = useState<any | null>(null);

  const openContract = (record?: any) => {
    if (record) {
      setEditingContract(record);
      setContractForm({
        name: record.name || "",
        description: record.description || "",
        consumer_id: record.consumer_id || "",
        provider_id: record.provider_id || "",
      });
    } else {
      setEditingContract(null);
      setContractForm(emptyContractForm);
    }
    setContractDialog(true);
  };

  const handleSaveContract = async () => {
    if (!domainId || !contractForm.name) {
      toast.error("Name is required");
      return;
    }
    try {
      if (editingContract) {
        await updateContract.mutateAsync({
          domainId,
          id: editingContract.id,
          data: {
            name: contractForm.name,
            description: contractForm.description || null,
          },
        });
        toast.success("Contract updated");
      } else {
        if (!contractForm.consumer_id || !contractForm.provider_id) {
          toast.error("Consumer and provider are required");
          return;
        }
        await createContract.mutateAsync({
          domainId,
          data: {
            name: contractForm.name,
            description: contractForm.description,
            consumer_id: contractForm.consumer_id,
            provider_id: contractForm.provider_id,
            contract_policies: [],
            datasets: [],
          },
        });
        toast.success("Contract created");
      }
      setContractDialog(false);
    } catch (error: any) {
      toast.error("Failed to save contract", {
        description: error?.response?.data?.detail || error?.message || "Unexpected error",
      });
    }
  };

  // ── Contract Policy state ───────────────────────────────────────────────
  const [cPolicyDialog, setCPolicyDialog] = useState(false);
  const [editingCPolicy, setEditingCPolicy] = useState<any | null>(null);
  const [cPolicyForm, setCPolicyForm] = useState(emptyContractPolicyForm);
  const [cPolicyDelete, setCPolicyDelete] = useState<any | null>(null);

  const openCPolicy = (record?: any) => {
    if (record) {
      setEditingCPolicy(record);
      setCPolicyForm({
        name: record.name || "",
        data_clasification: record.data_clasification || "INTERNAL",
        effective_from: record.effective_from ? record.effective_from.slice(0, 16) : "",
        effective_to: record.effective_to ? record.effective_to.slice(0, 16) : "",
        description: record.description || "",
      });
    } else {
      setEditingCPolicy(null);
      setCPolicyForm(emptyContractPolicyForm);
    }
    setCPolicyDialog(true);
  };

  const handleSaveCPolicy = async () => {
    if (!domainId || !cPolicyForm.name || !cPolicyForm.effective_from || !cPolicyForm.effective_to) {
      toast.error("Name and effective dates are required");
      return;
    }
    try {
      const payload = {
        name: cPolicyForm.name,
        data_clasification: cPolicyForm.data_clasification,
        effective_from: new Date(cPolicyForm.effective_from).toISOString(),
        effective_to: new Date(cPolicyForm.effective_to).toISOString(),
        description: cPolicyForm.description || null,
      };
      if (editingCPolicy) {
        await updateContractPolicy.mutateAsync({ domainId, id: editingCPolicy.id, data: payload });
        toast.success("Contract policy updated");
      } else {
        await createContractPolicy.mutateAsync({ domainId, data: payload });
        toast.success("Contract policy created");
      }
      setCPolicyDialog(false);
    } catch (error: any) {
      toast.error("Failed to save contract policy", {
        description: error?.response?.data?.detail || error?.message || "Unexpected error",
      });
    }
  };

  // ── Agreement state ─────────────────────────────────────────────────────
  const [agreementDialogOpen, setAgreementDialogOpen] = useState(false);
  const [agreementDeleteTarget, setAgreementDeleteTarget] = useState<any | null>(null);
  const [agreementForm, setAgreementForm] = useState({
    contract_id: "",
    effective_from: "",
    effective_to: "",
  });
  const [transferResult, setTransferResult] = useState<string>("");

  const handleCreateAgreement = async () => {
    if (!domainId || !agreementForm.contract_id || !agreementForm.effective_from || !agreementForm.effective_to) {
      toast.error("Complete contract and effective date range first");
      return;
    }
    try {
      await createAgreement.mutateAsync({
        domainId,
        data: {
          contract_id: agreementForm.contract_id,
          effective_from: new Date(agreementForm.effective_from).toISOString(),
          effective_to: new Date(agreementForm.effective_to).toISOString(),
        },
      });
      setAgreementDialogOpen(false);
      setAgreementForm({ contract_id: "", effective_from: "", effective_to: "" });
    } catch {
      // handled by hook
    }
  };

  const handleStartConsumerTransfer = async (agreementId: string) => {
    try {
      const response = await consumeMutation.mutateAsync(agreementId);
      setTransferResult(JSON.stringify(response, null, 2));
      toast.success("Consumer transfer endpoint executed");
    } catch (error: any) {
      toast.error("Consumer transfer failed", {
        description: error?.response?.data?.error || error?.response?.data?.detail || "Unexpected error",
      });
    }
  };

  const canManageContracts = hasPermission("contracts.manage");
  const canManageAgreements = hasPermission("agreements.manage") || hasPermission("agreements.approve");

  return (
    <V2PageShell title="Policy & Contract" subtitle="Dataset policies, contracts, contract policies, and agreements" status="Live API">
      <div className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-4">
        <Layers className="h-5 w-5 text-primary" />
        <div className="flex-1">
          <p className="text-sm font-medium">Domain Scope</p>
          <p className="text-xs text-muted-foreground">All policy/contract data is scoped to a domain</p>
        </div>
        <Select value={domainId} onValueChange={setSelectedDomain}>
          <SelectTrigger className="w-64"><SelectValue placeholder={loadingD ? "Loading..." : "Select domain"} /></SelectTrigger>
          <SelectContent>
            {domains.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name} ({d.code})</SelectItem>))}
          </SelectContent>
        </Select>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard title="Dataset Policies" value={loadingPol ? "..." : policies.length} subtitle="Access & usage rules" icon={Shield} trend="neutral" />
        <MetricCard title="Contract Policies" value={loadingCP ? "..." : cPolicies.length} subtitle="Contract-level policies" icon={FileText} trend="neutral" />
        <MetricCard title="Contracts" value={loadingC ? "..." : contracts.length} subtitle="Consumer-provider bindings" icon={FileText} trend="up" />
        <MetricCard title="Agreements" value={loadingA ? "..." : agreements.length} subtitle="Active data agreements" icon={Handshake} trend="up" />
      </div>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">Dataset Policies</TabsTrigger>
          <TabsTrigger value="contracts">Contracts</TabsTrigger>
          <TabsTrigger value="cpolicies">Contract Policies</TabsTrigger>
          <TabsTrigger value="agreements">Agreements</TabsTrigger>
        </TabsList>

        {/* ── Dataset Policies ───────────────────────────────────────────── */}
        <TabsContent value="policies">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Dataset Policies</CardTitle>
                <CardDescription>Rules governing dataset access and usage</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManageContracts || !domainId} onClick={() => openDatasetPolicy()}>
                <Plus className="h-4 w-4" />
                New Policy
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Type", "Version", "Status", "Created", "Actions"]} isLoading={!domainId || loadingPol}>
                {policies.length > 0 ? policies.map((p: any) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{p.type || "—"}</Badge></td>
                    <td className="px-4 py-3 text-sm font-mono">{p.version || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" disabled={!canManageContracts} onClick={() => openDatasetPolicy(p)}>
                          <Pencil className="h-4 w-4" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setDatasetPolicyDelete(p)}>
                          <Trash2 className="h-4 w-4" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No dataset policies" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contracts ──────────────────────────────────────────────────── */}
        <TabsContent value="contracts">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Contracts</CardTitle>
                <CardDescription>Consumer-provider data exchange contracts</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManageContracts || !domainId} onClick={() => openContract()}>
                <Plus className="h-4 w-4" />
                New Contract
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Status", "Consumer ID", "Provider ID", "Created", "Actions"]} isLoading={!domainId || loadingC}>
                {contracts.length > 0 ? contracts.map((c: any) => (
                  <tr key={c.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                    <td className="px-4 py-3 font-mono text-xs">{c.consumer_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 font-mono text-xs">{c.provider_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" disabled={!canManageContracts} onClick={() => openContract(c)}>
                          <Pencil className="h-4 w-4" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setContractDelete(c)}>
                          <Trash2 className="h-4 w-4" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No contracts" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Contract Policies ──────────────────────────────────────────── */}
        <TabsContent value="cpolicies">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Contract Policies</CardTitle>
                <CardDescription>Policies attached to contracts</CardDescription>
              </div>
              <Button size="sm" className="gap-2" disabled={!canManageContracts || !domainId} onClick={() => openCPolicy()}>
                <Plus className="h-4 w-4" />
                New Contract Policy
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Name", "Classification", "Effective From", "Effective To", "Created", "Actions"]} isLoading={!domainId || loadingCP}>
                {cPolicies.length > 0 ? cPolicies.map((cp: any) => (
                  <tr key={cp.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{cp.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{cp.data_clasification || "—"}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{cp.effective_from ? new Date(cp.effective_from).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{cp.effective_to ? new Date(cp.effective_to).toLocaleDateString() : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(cp.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-2" disabled={!canManageContracts} onClick={() => openCPolicy(cp)}>
                          <Pencil className="h-4 w-4" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-2 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setCPolicyDelete(cp)}>
                          <Trash2 className="h-4 w-4" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={6} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No contract policies" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
        </TabsContent>

        {/* ── Agreements ─────────────────────────────────────────────────── */}
        <TabsContent value="agreements">
          <Card className="border-border/50">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-base">Agreements</CardTitle>
                <CardDescription>Active data exchange agreements and the consumer-side transfer trigger</CardDescription>
              </div>
              <Button onClick={() => setAgreementDialogOpen(true)} disabled={!canManageAgreements || !domainId || contracts.length === 0}>
                Create Agreement
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Contract ID", "Status", "Effective From", "Effective To", "Actions"]} isLoading={!domainId || loadingA}>
                {agreements.length > 0 ? agreements.map((a: any) => (
                  <tr key={a.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 font-mono text-xs">{a.contract_id?.slice(0, 8)}...</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[a.status] || ""}`}>{a.status}</Badge></td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.effective_from).toLocaleDateString()}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(a.effective_to).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {a.status === "REQUESTED" && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-emerald-500/40 text-emerald-500"
                              disabled={!hasPermission("agreements.approve") || updateAgreement.isPending}
                              onClick={async () => {
                                try {
                                  await updateAgreement.mutateAsync({ domainId, id: a.id, data: { status: "APPROVED" } });
                                } catch { /* hook toasts */ }
                              }}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-500"
                              disabled={!hasPermission("agreements.approve") || updateAgreement.isPending}
                              onClick={async () => {
                                try {
                                  await updateAgreement.mutateAsync({ domainId, id: a.id, data: { status: "REJECTED" } });
                                } catch { /* hook toasts */ }
                              }}
                            >
                              Reject
                            </Button>
                          </>
                        )}
                        {a.status === "APPROVED" && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="border-blue-500/40 text-blue-500"
                            disabled={!canManageAgreements || updateAgreement.isPending}
                            onClick={async () => {
                              try {
                                await updateAgreement.mutateAsync({ domainId, id: a.id, data: { status: "ACTIVE" } });
                              } catch { /* hook toasts */ }
                            }}
                          >
                            Activate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" onClick={() => handleStartConsumerTransfer(a.id)} disabled={consumeMutation.isPending || !hasPermission("transfer.manage") || a.status === "REQUESTED"}>
                          Trigger Consume
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" disabled={!canManageAgreements} onClick={() => setAgreementDeleteTarget(a)}>
                          Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No agreements" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
          <Card className="border-border/50 mt-6">
            <CardHeader>
              <CardTitle className="text-base">Latest Transfer Trigger Result</CardTitle>
              <CardDescription>Response payload from <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GET /api/v1/consumer/{"{domain_id}"}/consume/{"{agreement_id}"}</code></CardDescription>
            </CardHeader>
            <CardContent>
              <pre className="max-h-80 overflow-auto rounded-lg border border-border/50 bg-muted/30 p-4 text-xs text-muted-foreground">
                {transferResult || "No transfer has been triggered from this page yet."}
              </pre>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* ── Dataset Policy Dialog ───────────────────────────────────────── */}
      <Dialog open={datasetPolicyDialog} onOpenChange={setDatasetPolicyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDatasetPolicy ? "Edit Dataset Policy" : "Create Dataset Policy"}</DialogTitle>
            <DialogDescription>Define an access, usage, retention, or security rule scoped to this domain.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={datasetPolicyForm.name} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Type</Label>
                <Select value={datasetPolicyForm.type} onValueChange={(v) => setDatasetPolicyForm((p) => ({ ...p, type: v }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACCESS">ACCESS</SelectItem>
                    <SelectItem value="USAGE">USAGE</SelectItem>
                    <SelectItem value="RETENTION">RETENTION</SelectItem>
                    <SelectItem value="SECURITY">SECURITY</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Version</Label>
                <Input value={datasetPolicyForm.version} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, version: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={3} value={datasetPolicyForm.description} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDatasetPolicyDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveDatasetPolicy} disabled={createDatasetPolicy.isPending || updateDatasetPolicy.isPending}>
              {createDatasetPolicy.isPending || updateDatasetPolicy.isPending ? "Saving..." : editingDatasetPolicy ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Contract Dialog ─────────────────────────────────────────────── */}
      <Dialog open={contractDialog} onOpenChange={setContractDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Contract" : "Create Contract"}</DialogTitle>
            <DialogDescription>{editingContract ? "Update name and description. Reassign parties via dedicated endpoints." : "Bind a consumer to a provider. Add policies and datasets via the contract detail flow."}</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={contractForm.name} onChange={(e) => setContractForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            {!editingContract && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Consumer *</Label>
                  <Select value={contractForm.consumer_id} onValueChange={(v) => setContractForm((p) => ({ ...p, consumer_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select consumer" /></SelectTrigger>
                    <SelectContent>
                      {consumerParticipants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-2">
                  <Label>Provider *</Label>
                  <Select value={contractForm.provider_id} onValueChange={(v) => setContractForm((p) => ({ ...p, provider_id: v }))}>
                    <SelectTrigger><SelectValue placeholder="Select provider" /></SelectTrigger>
                    <SelectContent>
                      {providerParticipants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={3} value={contractForm.description} onChange={(e) => setContractForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveContract} disabled={createContract.isPending || updateContract.isPending}>
              {createContract.isPending || updateContract.isPending ? "Saving..." : editingContract ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Contract Policy Dialog ──────────────────────────────────────── */}
      <Dialog open={cPolicyDialog} onOpenChange={setCPolicyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCPolicy ? "Edit Contract Policy" : "Create Contract Policy"}</DialogTitle>
            <DialogDescription>Govern data classification and effective window for contract-level usage.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name *</Label>
              <Input value={cPolicyForm.name} onChange={(e) => setCPolicyForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            <div className="grid gap-2">
              <Label>Data Classification</Label>
              <Select value={cPolicyForm.data_clasification} onValueChange={(v) => setCPolicyForm((p) => ({ ...p, data_clasification: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="PUBLIC">PUBLIC</SelectItem>
                  <SelectItem value="INTERNAL">INTERNAL</SelectItem>
                  <SelectItem value="CONFIDENTIAL">CONFIDENTIAL</SelectItem>
                  <SelectItem value="RESTRICTED">RESTRICTED</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Effective From *</Label>
                <Input type="datetime-local" value={cPolicyForm.effective_from} onChange={(e) => setCPolicyForm((p) => ({ ...p, effective_from: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Effective To *</Label>
                <Input type="datetime-local" value={cPolicyForm.effective_to} onChange={(e) => setCPolicyForm((p) => ({ ...p, effective_to: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description</Label>
              <Textarea rows={3} value={cPolicyForm.description} onChange={(e) => setCPolicyForm((p) => ({ ...p, description: e.target.value }))} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCPolicyDialog(false)}>Cancel</Button>
            <Button onClick={handleSaveCPolicy} disabled={createContractPolicy.isPending || updateContractPolicy.isPending}>
              {createContractPolicy.isPending || updateContractPolicy.isPending ? "Saving..." : editingCPolicy ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Agreement Dialog ────────────────────────────────────────────── */}
      <Dialog open={agreementDialogOpen} onOpenChange={setAgreementDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create Agreement</DialogTitle>
            <DialogDescription>Create a live agreement from an existing contract before triggering consumer transfer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Contract</Label>
              <Select value={agreementForm.contract_id} onValueChange={(value) => setAgreementForm((prev) => ({ ...prev, contract_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((contract: any) => (
                    <SelectItem key={contract.id} value={contract.id}>
                      {contract.name} ({contract.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Effective From</Label>
                <Input type="datetime-local" value={agreementForm.effective_from} onChange={(event) => setAgreementForm((prev) => ({ ...prev, effective_from: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Effective To</Label>
                <Input type="datetime-local" value={agreementForm.effective_to} onChange={(event) => setAgreementForm((prev) => ({ ...prev, effective_to: event.target.value }))} />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAgreementDialogOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateAgreement} disabled={createAgreement.isPending}>
              {createAgreement.isPending ? "Creating..." : "Create Agreement"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Delete confirmations ────────────────────────────────────────── */}
      <AlertDialog open={!!datasetPolicyDelete} onOpenChange={(o) => !o && setDatasetPolicyDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Dataset Policy?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{datasetPolicyDelete?.name}</strong> and any rules attached.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!domainId || !datasetPolicyDelete) return;
                try {
                  await deleteDatasetPolicy.mutateAsync({ domainId, id: datasetPolicyDelete.id });
                  toast.success("Dataset policy deleted");
                  setDatasetPolicyDelete(null);
                } catch (error: any) {
                  toast.error("Failed to delete", { description: error?.response?.data?.detail || "Unexpected error" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!contractDelete} onOpenChange={(o) => !o && setContractDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{contractDelete?.name}</strong> and any agreements bound to it will fail to consume.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!domainId || !contractDelete) return;
                try {
                  await deleteContract.mutateAsync({ domainId, id: contractDelete.id });
                  toast.success("Contract deleted");
                  setContractDelete(null);
                } catch (error: any) {
                  toast.error("Failed to delete", { description: error?.response?.data?.detail || "Unexpected error" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!cPolicyDelete} onOpenChange={(o) => !o && setCPolicyDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Contract Policy?</AlertDialogTitle>
            <AlertDialogDescription>This removes <strong>{cPolicyDelete?.name}</strong> from this domain.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive"
              onClick={async () => {
                if (!domainId || !cPolicyDelete) return;
                try {
                  await deleteContractPolicy.mutateAsync({ domainId, id: cPolicyDelete.id });
                  toast.success("Contract policy deleted");
                  setCPolicyDelete(null);
                } catch (error: any) {
                  toast.error("Failed to delete", { description: error?.response?.data?.detail || "Unexpected error" });
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <AlertDialog open={!!agreementDeleteTarget} onOpenChange={(open) => !open && setAgreementDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Agreement?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the agreement and will break consumer transfer initiation from this contract scope.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={async () => {
                if (!domainId || !agreementDeleteTarget) return;
                try {
                  await deleteAgreement.mutateAsync({ domainId, id: agreementDeleteTarget.id });
                  setAgreementDeleteTarget(null);
                } catch {
                  // handled by hook
                }
              }}
              className="bg-destructive"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default PolicyContract;
