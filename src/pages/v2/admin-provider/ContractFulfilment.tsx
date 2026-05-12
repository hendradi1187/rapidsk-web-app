// src/pages/v2/admin-provider/ContractFulfilment.tsx
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FileText, Database, Handshake, Layers, Plus, Trash2, Pencil, ChevronDown, ChevronUp, AlertTriangle } from "lucide-react";
import { V2PageShell, MetricCard, DataTable } from "../V2PageShell";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Input } from "@/components/ui/input";
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
  useCreateDatasetPolicy,
  useContractPolicies,
  useDatasetPolicies,
  hydrateContractSnapshot,
} from "@/api/hooks/useContracts";
import { useDatasets, useCreateDataset } from "@/api/hooks/useDatasets";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useCurrentSessionParticipant, useParticipantDomains } from "@/api/hooks/useParticipants";
import { schemasApi } from "@/api/services/data-catalog";
import { providerApi } from "@/api/services/connector";
import { normalizeContractDatasets, normalizeContractPolicyIds } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { countAgreementIssues, countContractIssues, countDatasetIssues, getApiErrorSummary } from "@/lib/provider-flow-diagnostics";
import { TransferPreviewDialog } from "@/components/transfer/TransferPreviewDialog";

const emptyRegisterForm = {
  name: "",
  endpoint_url: "",
  schema_id: "",
  protocol: "REST_API",
  data_format: "JSON",
  access_type: "PRIVATE",
  version: "1.0.0",
};

const emptyPolicyForm = {
  name: "",
  type: "ACCESS",
  version: "1.0.0",
  description: "",
};

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-slate-400/30 text-slate-400",
  APPROVED: "border-emerald-500/30 text-emerald-500",
  ACTIVE: "border-blue-500/30 text-blue-500",
  REQUESTED: "border-amber-500/30 text-amber-500",
};

const ContractFulfilment = () => {
  const { hasPermission, user } = useAuth();
  const queryClient = useQueryClient();
  const isProvider = user?.role === "PROVIDER";

  // Resolve provider's assigned domains — PROVIDER sees only their own, SUPER_ADMIN/CONSUMER see all
  const { participant: providerParticipant } = useCurrentSessionParticipant({ limit: 50 }, "forceProvider");
  const { data: assignedMappingsData } = useParticipantDomains(
    isProvider ? (providerParticipant?.id ?? "") : "",
    { limit: 100 }
  );
  const assignedDomainIds = useMemo(
    () => new Set((assignedMappingsData?.data ?? []).map((m) => m.domain_id)),
    [assignedMappingsData]
  );

  const { data: domainsData, isLoading: loadingD, error: domainsError } = useAllDomains({ limit: 1000 });
  const allDomains = domainsData?.data ?? [];
  const domains = isProvider && assignedDomainIds.size > 0
    ? allDomains.filter((d) => assignedDomainIds.has(d.id))
    : allDomains;

  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  const { data: contractsData, isLoading: loadingC, error: contractsError } = useContracts(domainId, { limit: 50 });
  const { data: datasetsData, isLoading: loadingDS, error: datasetsError } = useDatasets(domainId, { limit: 50 });
  const { data: agreementsData, isLoading: loadingAgreements, error: agreementsError } = useAgreements(domainId, { limit: 50 });
  const { data: contractPoliciesData, error: contractPoliciesError } = useContractPolicies(domainId, { limit: 50 });
  const { data: datasetPoliciesData, error: datasetPoliciesError } = useDatasetPolicies(domainId, { limit: 50 });

  const contracts = contractsData?.data ?? [];
  const datasets = datasetsData?.data ?? [];
  const agreements = agreementsData?.data ?? [];
  const contractPolicies = contractPoliciesData?.data ?? [];
  const datasetPolicies = datasetPoliciesData?.data ?? [];

  const updateContract = useUpdateContract();
  const createDataset = useCreateDataset();
  const createDatasetPolicy = useCreateDatasetPolicy();

  // Schemas for inline dataset registration (schema_ref in seq diagram)
  const { data: schemasData, error: schemasError } = useQuery({
    queryKey: ["fulfilment-schemas", domainId],
    queryFn: () => schemasApi.list(domainId, { limit: 50 }),
    enabled: !!domainId,
  });
  const schemas = schemasData?.data ?? [];
  const contractIssues = countContractIssues(contracts);
  const datasetIssues = countDatasetIssues(datasets);
  const agreementIssues = countAgreementIssues(agreements);
  const diagnosticsTotal =
    Object.values(contractIssues).reduce((sum, count) => sum + count, 0) +
    Object.values(datasetIssues).reduce((sum, count) => sum + count, 0) +
    Object.values(agreementIssues).reduce((sum, count) => sum + count, 0);
  const activeError = domainsError || contractsError || datasetsError || agreementsError || contractPoliciesError || datasetPoliciesError || schemasError;
  const errorSummary = activeError ? getApiErrorSummary(activeError, "Contract fulfilment backend error") : null;

  const [provideResult, setProvideResult] = useState<unknown>(null);
  const [providePreviewOpen, setProvidePreviewOpen] = useState(false);
  const [provideEndpoint, setProvideEndpoint] = useState("");
  const [provideDuration, setProvideDuration] = useState(0);
  const provideMutation = useMutation({
    mutationFn: (agreementId: string) => providerApi.provide(domainId, agreementId),
  });

  // ── Fulfilment dialog state ─────────────────────────────────────────────
  const [fulfilDialog, setFulfilDialog] = useState(false);
  const [showRegisterForm, setShowRegisterForm] = useState(false);
  const [registerForm, setRegisterForm] = useState(emptyRegisterForm);
  const [showPolicyForm, setShowPolicyForm] = useState(false);
  const [policyForm, setPolicyForm] = useState(emptyPolicyForm);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [activeContract, setActiveContract] = useState<any | null>(null);
  const [draftDatasets, setDraftDatasets] = useState<{ dataset_id: string; dataset_policy_id: string }[]>([]);
  const [draftCPolicies, setDraftCPolicies] = useState<string[]>([]);
  const [pickDatasetId, setPickDatasetId] = useState("");
  const [pickPolicyId, setPickPolicyId] = useState("");
  const [pickContractPolicyId, setPickContractPolicyId] = useState("");
  const [saveError, setSaveError] = useState<string | null>(null);

  // ── Confirm Action State ───────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: React.ReactNode; onConfirm: () => void; destructive?: boolean } | null>(null);

  useEffect(() => {
    if (!domainId || contracts.length === 0) return;

    const needsHydration = contracts.filter(
      (contract: any) =>
        !Array.isArray(contract.datasets) ||
        !Array.isArray(contract.contract_policies) ||
        !contract.consumer_id ||
        contract.datasets.length === 0
    );

    if (needsHydration.length === 0) return;

    let cancelled = false;

    (async () => {
      const tasks = needsHydration.map(async (contract: any) => {
        try {
          await hydrateContractSnapshot(queryClient, domainId, contract, true);
        } catch {
          // keep summary row as-is if detail hydration fails
        }
      });
      await Promise.allSettled(tasks);
      if (cancelled) return;
    })();

    return () => {
      cancelled = true;
    };
  }, [contracts, domainId, queryClient]);

  const canManage = hasPermission("contracts.manage") || hasPermission("fulfilment.manage");

  const openFulfilDialog = async (contract: any) => {
    setPickDatasetId("");
    setPickPolicyId("");
    setPickContractPolicyId("");
    setShowRegisterForm(false);
    setShowPolicyForm(false);
    setRegisterForm(emptyRegisterForm);
    setPolicyForm(emptyPolicyForm);
    setSaveError(null);
    setFulfilDialog(true);

    // Build the most complete view of the contract using a cache-first strategy.
    // Priority: detail cache (set after any PATCH) > list cache > GET detail API > original list item.
    // The list API and GET detail API both return summary-only data (no datasets/contract_policies arrays),
    // so we must prefer any cached PATCH response data over a fresh API fetch.

    // 1. Check detail cache — populated by useUpdateContract after every PATCH
    let full: any = contract;
    setLoadingDetail(true);
    try {
      full = await hydrateContractSnapshot(queryClient, domainId, contract, true);
    } catch {
      full = contract;
    } finally {
      setLoadingDetail(false);
    }
    if (!full) full = contract;

    // 2. If detail cache is absent or lacks arrays, check the list cache
    if (false) {
      const listCaches: any[] = [];
      for (const [, cacheData] of listCaches) {
        const found = cacheData?.data?.find((c: any) => c.id === contract.id);
        if (found) {
          full = {
            ...full,
            ...found,
            datasets: Array.isArray(found.datasets) && found.datasets.length > 0
              ? found.datasets : full.datasets,
            contract_policies: Array.isArray(found.contract_policies) && found.contract_policies.length > 0
              ? found.contract_policies : full.contract_policies,
          };
          break;
        }
      }
    }

    // 3. Fetch GET detail as last resort to pick up consumer_id / provider_id
    //    Only if those required PATCH fields are still missing.
    if (false) {
      setLoadingDetail(true);
      try {
        const detail = full;
        full = {
          ...full,
          ...detail,
          // Prefer cached arrays — GET detail may return empty arrays for existing datasets
          datasets: Array.isArray(detail.datasets) && detail.datasets.length > 0
            ? detail.datasets : full.datasets,
          contract_policies: Array.isArray(detail.contract_policies) && detail.contract_policies.length > 0
            ? detail.contract_policies : full.contract_policies,
        };
      } catch {
        // keep full as-is
      } finally {
        setLoadingDetail(false);
      }
    }

    setActiveContract(full);
    setDraftDatasets(normalizeContractDatasets(full.datasets).filter((d) => d.dataset_id));
    setDraftCPolicies(normalizeContractPolicyIds(full.contract_policies));
  };

  const handleRegisterDataset = async () => {
    if (!domainId) { toast.error("Pilih domain dulu"); return; }
    if (!registerForm.name || registerForm.name.length < 3) { toast.error("Nama dataset min 3 karakter"); return; }
    if (!registerForm.endpoint_url) { toast.error("Storage path / endpoint URL wajib diisi (seq diagram: storage_path)"); return; }
    try {
      const newDataset = await createDataset.mutateAsync({
        domainId,
        data: {
          name: registerForm.name,
          version: registerForm.version,
          access_type: registerForm.access_type as any,
          schema_id: registerForm.schema_id || undefined,
          endpoint: {
            url: registerForm.endpoint_url,
            protocol: registerForm.protocol as any,
            documentation_url: "",
          },
          metadata: { data_format: registerForm.data_format, tags: ["contract-fulfilment"], sla: "Best effort", rate_limit: { requests_per_minute: 60 } },
        },
      });
      // Auto-add to draft — user still picks dataset policy below
      setDraftDatasets((prev) => {
        if (prev.some((e) => e.dataset_id === newDataset.id)) return prev;
        return [...prev, { dataset_id: newDataset.id, dataset_policy_id: "" }];
      });
      toast.success(`Dataset "${newDataset.name}" terdaftar — sekarang pilih dataset policy-nya di bawah`);
      setShowRegisterForm(false);
      setRegisterForm(emptyRegisterForm);
    } catch (error: any) {
      toast.error("Gagal register dataset", { description: error?.response?.data?.detail || error?.message });
    }
  };

  const handleCreateDatasetPolicy = async () => {
    if (!domainId) { toast.error("Pilih domain dulu"); return; }
    if (!policyForm.name || policyForm.name.length < 3) { toast.error("Nama policy min 3 karakter"); return; }
    try {
      await createDatasetPolicy.mutateAsync({
        domainId,
        data: {
          name: policyForm.name,
          type: policyForm.type,
          version: policyForm.version,
          description: policyForm.description || null,
          rules: [],
        },
      });
      toast.success(`Dataset policy "${policyForm.name}" berhasil dibuat — sekarang pilih di dropdown di bawah`);
      setShowPolicyForm(false);
      setPolicyForm(emptyPolicyForm);
    } catch (error: any) {
      toast.error("Gagal buat dataset policy", { description: error?.response?.data?.detail || error?.message });
    }
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
    setSaveError(null);

    const missingPolicy = draftDatasets.find((d) => !d.dataset_policy_id);
    if (missingPolicy) {
      setSaveError("Semua dataset harus punya dataset policy.");
      return;
    }

    const payload = {
      consumer_id: activeContract.consumer_id,
      provider_id: activeContract.provider_id,
      name: activeContract.name,
      description: activeContract.description ?? null,
      datasets: draftDatasets,
      contract_policies: draftCPolicies,
    };

    // Guard: consumer_id / provider_id harus UUID valid
    if (!payload.consumer_id || !payload.provider_id) {
      setSaveError(`consumer_id atau provider_id kosong pada contract ini (consumer_id="${payload.consumer_id}", provider_id="${payload.provider_id}"). Backend akan reject 422. Pastikan contract dibuat dengan consumer + provider yang benar.`);
      return;
    }

    try {
      const result = await updateContract.mutateAsync({ domainId, id: activeContract.id, data: payload });
      const mergedDatasets = normalizeContractDatasets((result as any)?.datasets);
      const mergedPolicies = normalizeContractPolicyIds((result as any)?.contract_policies);
      toast.success(`Fulfilment disimpan untuk "${activeContract.name}"`);
      setActiveContract(result);
      setDraftDatasets(mergedDatasets.filter((d) => d.dataset_id));
      setDraftCPolicies(mergedPolicies);
      toast.message("Snapshot fulfilment setelah save", {
        description: `${mergedDatasets.length} datasets, ${mergedPolicies.length} contract policies`,
      });
      setFulfilDialog(false);
      setActiveContract(null);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `${d.loc?.join(".")} — ${d.msg}`).join(" | ")
        : detail || error?.message || "Unexpected error";
      setSaveError(`PATCH gagal: ${msg}`);
      toast.error("Gagal simpan fulfilment", { description: msg });
    }
  };

  const handleProvide = async (agreementId: string) => {
    const endpoint = `GET /api/v1/provider/${domainId}/provide/${agreementId}`;
    setProvideEndpoint(endpoint);
    const t0 = performance.now();
    try {
      const response = await provideMutation.mutateAsync(agreementId);
      setProvideDuration(Math.round(performance.now() - t0));
      setProvideResult(response);
      setProvidePreviewOpen(true);
      toast.success("Provider fulfilment endpoint executed — lihat preview data");
    } catch (error: any) {
      setProvideDuration(Math.round(performance.now() - t0));
      toast.error("Provider fulfilment failed", {
        description: error?.response?.data?.error || error?.response?.data?.detail || "Unexpected error",
      });
    }
  };

  return (
    <V2PageShell title="Contract Fulfilment" subtitle="Attach datasets and contract policies to active contracts before triggering provider transfer." status="Live API">
      <div className="rounded-xl border border-amber-500/30 bg-amber-500/5 p-4 text-sm text-amber-700">
        Flow PROSES 3 saat ini memakai endpoint yang benar-benar tersedia:
        <code className="mx-1 rounded bg-amber-500/10 px-1">/policy-contract/{"{domain_id}"}/contracts</code>,
        <code className="mx-1 rounded bg-amber-500/10 px-1">/policy-contract/{"{domain_id}"}/agreements</code>,
        dan
        <code className="mx-1 rounded bg-amber-500/10 px-1">/provider/{"{domain_id}"}/provide/{"{agreement_id}"}</code>.
        Gap yang masih ada bukan di CRUD contract-nya, tapi di shape read backend yang kadang summary-only sehingga frontend masih perlu hydrate detail contract.
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
          <AlertTitle>Contract fulfilment data partially invalid</AlertTitle>
          <AlertDescription>
            {diagnosticsTotal} issue(s) detected. Contract missing datasets field: {contractIssues.missingDatasets}, contract missing policies field: {contractIssues.missingPolicies}, contract missing consumer_id: {contractIssues.missingConsumerId}, contract missing provider_id: {contractIssues.missingProviderId}, dataset missing endpoint URL: {datasetIssues.missingEndpointUrl}, agreement missing contract_id: {agreementIssues.missingContractId}.
          </AlertDescription>
        </Alert>
      )}
      <div className="rounded-xl border border-border/40 bg-muted/20 p-4 text-sm">
        <p className="font-semibold mb-2">Alur Contract Fulfilment (seq diagram PROSES 3)</p>
        <ol className="list-decimal space-y-1 pl-5 text-xs text-muted-foreground">
          <li>Pilih domain → lihat contract yang sudah dibuat consumer</li>
          <li>Klik <strong>Manage Fulfilment</strong> → attach dataset + dataset policy + contract policy ke contract (PATCH <code className="rounded bg-muted px-1">/policy-contract/{"{domain_id}"}/contracts/{"{id}"}</code>)</li>
          <li>Consumer buat agreement, ubah status ke <strong>ACTIVE</strong></li>
          <li>Klik <strong>Trigger Provide</strong> di tabel Agreement Execution → memanggil <code className="rounded bg-muted px-1">GET /provider/{"{domain_id}"}/provide/{"{agreement_id}"}</code> — ini yang menginstruksikan EDC connector provider untuk push data ke consumer connector</li>
          <li>Consumer klik <strong>Trigger Consume</strong> di Policy & Contract untuk menarik data dari sisi consumer</li>
        </ol>
        <p className="mt-2 text-xs text-muted-foreground">
          Belum punya dataset? <Link to="/v2/admin-provider/dataset-registration" className="text-primary underline underline-offset-2">Register dulu di Dataset Registration →</Link>
        </p>
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
          <CardDescription>
            Approval contract (REQUESTED → APPROVED → ACTIVE) dilakukan oleh <strong>Admin Consumer</strong> di halaman Policy &amp; Contract. Provider hanya attach dataset lalu trigger provide setelah agreement ACTIVE.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Name", "Status", "Datasets", "Policies", "Created", "Actions"]} isLoading={!domainId || loadingC}>
            {contracts.length > 0 ? contracts.map((c: any) => (
              <tr key={c.id} className="transition-colors hover:bg-muted/20">
                <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                <td className="px-4 py-3 text-sm" title="Open Manage Fulfilment to see live count">{Array.isArray(c.datasets) ? c.datasets.length : "—"}</td>
                <td className="px-4 py-3 text-sm" title="Open Manage Fulfilment to see live count">{Array.isArray(c.contract_policies) ? c.contract_policies.length : "—"}</td>
                <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                <td className="px-4 py-3">
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2"
                    disabled={!canManage || c.status === "ACTIVE" || c.status === "REJECTED"}
                    title={!canManage ? "Missing permission contracts.manage / fulfilment.manage" : (c.status === "ACTIVE" || c.status === "REJECTED") ? `Contract is ${c.status}. Cannot manage fulfilment.` : "Attach datasets and policies to this contract"}
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
          <CardDescription>
            Panggil EDC connector provider untuk push data ke consumer. Endpoint: <code className="rounded bg-muted px-1.5 py-0.5 text-xs">GET /api/v1/provider/{"{domain_id}"}/provide/{"{agreement_id}"}</code>.
            Tombol aktif hanya jika agreement berstatus <strong>ACTIVE</strong>.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <DataTable headers={["Contract", "Agreement ID", "Status", "Effective Period", "Action"]} isLoading={!domainId || loadingAgreements}>
            {agreements.length > 0 ? agreements.map((agreement: any) => {
              const relatedContract = contracts.find((c: any) => c.id === agreement.contract_id);
              return (
                <tr key={agreement.id} className="transition-colors hover:bg-muted/20">
                  <td className="px-4 py-3 text-sm font-medium">{relatedContract?.name ?? <span className="font-mono text-xs text-muted-foreground">{agreement.contract_id?.slice(0, 8)}...</span>}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">{agreement.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[agreement.status] || ""}`}>{agreement.status}</Badge></td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {new Date(agreement.effective_from).toLocaleDateString()} — {new Date(agreement.effective_to).toLocaleDateString()}
                  </td>
                  <td className="px-4 py-3">
                    <Button
                      size="sm"
                      variant="outline"
                      className={agreement.status === "ACTIVE" ? "border-blue-500/40 text-blue-500" : ""}
                      onClick={() => setConfirmAction({
                        title: "Trigger Provide",
                        description: "Push data ke consumer connector. Pastikan semua dataset sudah di-setup dengan benar di sisi Anda.",
                        onConfirm: () => handleProvide(agreement.id)
                      })}
                      disabled={provideMutation.isPending || !hasPermission("transfer.manage") || agreement.status !== "ACTIVE"}
                      title={agreement.status !== "ACTIVE" ? `Status ${agreement.status} — harus ACTIVE dulu` : "Push data ke consumer connector"}
                    >
                      Trigger Provide
                    </Button>
                  </td>
                </tr>
              );
            }) : (
              <tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No agreements — agreement dibuat oleh consumer di Policy & Contract" : "Select a domain"}</td></tr>
            )}
          </DataTable>
        </CardContent>
      </Card>

      <TransferPreviewDialog
        open={providePreviewOpen}
        onOpenChange={setProvidePreviewOpen}
        title="Provider Transfer Result"
        description="Data yang di-push ke consumer connector setelah trigger provide."
        endpoint={provideEndpoint}
        duration={provideDuration}
        data={provideResult}
      />

      {/* ── Fulfilment Dialog ────────────────────────────────────────────── */}
      <Dialog open={fulfilDialog} onOpenChange={(o) => { setFulfilDialog(o); if (!o) { setActiveContract(null); setLoadingDetail(false); } }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Manage Contract Fulfilment</DialogTitle>
            <DialogDescription>
              {loadingDetail ? "Memuat detail contract..." : activeContract ? `Attach datasets dan contract policies ke "${activeContract.name}".` : ""}
            </DialogDescription>
          </DialogHeader>

          {loadingDetail ? (
            <div className="py-12 text-center text-sm text-muted-foreground">Memuat detail contract...</div>
          ) : (
          <div className="space-y-6 py-2">
            {/* ── Contract meta debug strip ─ */}
            {activeContract && (!activeContract.consumer_id || !activeContract.provider_id) && (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 p-3 text-xs text-amber-600">
                Peringatan: contract tidak memiliki consumer_id / provider_id — PATCH mungkin ditolak backend. Pastikan contract dibuat dengan benar oleh consumer.
              </div>
            )}

            {/* Datasets section */}
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Datasets</p>
                  <p className="text-xs text-muted-foreground">Setiap dataset harus dipasangkan dengan satu dataset policy.</p>
                </div>
                <Badge variant="outline">{draftDatasets.length} attached</Badge>
              </div>
              {draftDatasets.some((entry) => !entry.dataset_policy_id) && (
                <div className="rounded-lg border border-amber-500/30 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
                  Beberapa dataset dari contract detail tidak membawa <code>dataset_policy_id</code> dari backend. Dataset tetap ditampilkan, tapi pilih policy lagi sebelum save.
                </div>
              )}

              {/* Inline Register Dataset */}
              <div className="rounded-lg border border-border/60 bg-muted/10">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-primary hover:bg-muted/20 rounded-lg"
                  onClick={() => { setShowRegisterForm((v) => !v); setShowPolicyForm(false); }}
                >
                  <span>+ Register Dataset Baru (seq diagram step 22-23)</span>
                  {showRegisterForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showRegisterForm && (
                  <div className="border-t border-border/40 p-3 space-y-3">
                    <p className="text-[10px] text-muted-foreground">POST <code>/data-catalog/{"{domain}"}/datasets</code> — <code>storage_path=endpoint_url</code>, <code>schema_ref=schema_id</code></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Nama Dataset *</Label>
                        <Input placeholder="e.g. Produksi Minyak Q1 2025" value={registerForm.name} onChange={(e) => setRegisterForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Storage Path / Endpoint URL * (storage_path)</Label>
                        <Input placeholder="https://storage.example.com/dataset" value={registerForm.endpoint_url} onChange={(e) => setRegisterForm((p) => ({ ...p, endpoint_url: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Schema (schema_ref, opsional)</Label>
                        <Select value={registerForm.schema_id} onValueChange={(v) => setRegisterForm((p) => ({ ...p, schema_id: v }))}>
                          <SelectTrigger><SelectValue placeholder={schemas.length ? "Pilih schema" : "Belum ada schema"} /></SelectTrigger>
                          <SelectContent>
                            {schemas.map((s) => (<SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Protocol</Label>
                        <Select value={registerForm.protocol} onValueChange={(v) => setRegisterForm((p) => ({ ...p, protocol: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["REST_API", "S3", "SFTP", "JDBC", "KAFKA"].map((p) => (<SelectItem key={p} value={p}>{p}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <Button size="sm" onClick={handleRegisterDataset} disabled={createDataset.isPending || !registerForm.name || !registerForm.endpoint_url} className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      {createDataset.isPending ? "Mendaftarkan..." : "Daftarkan Dataset"}
                    </Button>
                  </div>
                )}
              </div>

              {/* Inline Create Dataset Policy */}
              <div className="rounded-lg border border-border/60 bg-muted/10">
                <button
                  type="button"
                  className="flex w-full items-center justify-between px-3 py-2 text-xs font-semibold text-primary hover:bg-muted/20 rounded-lg"
                  onClick={() => { setShowPolicyForm((v) => !v); setShowRegisterForm(false); }}
                >
                  <span>+ Buat Dataset Policy Baru</span>
                  {showPolicyForm ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                </button>
                {showPolicyForm && (
                  <div className="border-t border-border/40 p-3 space-y-3">
                    <p className="text-[10px] text-muted-foreground">POST <code>/policy-contract/{"{domain}"}/dataset-policies</code></p>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="grid gap-1">
                        <Label className="text-xs">Nama Policy *</Label>
                        <Input placeholder="e.g. Policy Akses Data Produksi" value={policyForm.name} onChange={(e) => setPolicyForm((p) => ({ ...p, name: e.target.value }))} />
                      </div>
                      <div className="grid gap-1">
                        <Label className="text-xs">Tipe</Label>
                        <Select value={policyForm.type} onValueChange={(v) => setPolicyForm((p) => ({ ...p, type: v }))}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {["ACCESS", "USAGE", "RETENTION", "SECURITY"].map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="grid gap-1 sm:col-span-2">
                        <Label className="text-xs">Deskripsi (opsional)</Label>
                        <Input placeholder="Deskripsi singkat policy ini" value={policyForm.description} onChange={(e) => setPolicyForm((p) => ({ ...p, description: e.target.value }))} />
                      </div>
                    </div>
                    <Button size="sm" onClick={handleCreateDatasetPolicy} disabled={createDatasetPolicy.isPending || !policyForm.name} className="gap-1">
                      <Plus className="h-3.5 w-3.5" />
                      {createDatasetPolicy.isPending ? "Membuat..." : "Buat Dataset Policy"}
                    </Button>
                  </div>
                )}
              </div>

              {datasets.length === 0 && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
                  Belum ada dataset di domain ini. Gunakan form "Register Dataset Baru" di atas, atau pergi ke{" "}
                  <Link to="/v2/admin-provider/dataset-registration" className="underline" onClick={() => setFulfilDialog(false)}>Dataset Registration →</Link>
                </p>
              )}
              {datasetPolicies.length === 0 && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
                  Belum ada dataset policy di domain ini. Gunakan form "Buat Dataset Policy Baru" di atas.
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
                <div className="grid gap-1">
                  <Label className="text-xs">Dataset {datasets.length === 0 && <span className="text-amber-500">(kosong)</span>}</Label>
                  <Select value={pickDatasetId} onValueChange={setPickDatasetId}>
                    <SelectTrigger><SelectValue placeholder={availableDatasetPicks.length ? "Pilih dataset" : datasets.length === 0 ? "Belum ada dataset" : "Semua sudah attached"} /></SelectTrigger>
                    <SelectContent>
                      {availableDatasetPicks.map((d) => (<SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid gap-1">
                  <Label className="text-xs">Dataset Policy {datasetPolicies.length === 0 && <span className="text-amber-500">(kosong)</span>}</Label>
                  <Select value={pickPolicyId} onValueChange={setPickPolicyId}>
                    <SelectTrigger><SelectValue placeholder={datasetPolicies.length ? "Pilih policy" : "Belum ada dataset policy"} /></SelectTrigger>
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
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Aksi</th>
                      </tr>
                    </thead>
                    <tbody>
                      {draftDatasets.map((entry) => {
                        const dsInfo = datasetById.get(entry.dataset_id);
                        return (
                        <tr key={entry.dataset_id} className="border-b border-border/20 last:border-0">
                          <td className="px-3 py-2 text-xs">
                            <div className="font-semibold">{dsInfo?.name || entry.dataset_id.slice(0, 8)} <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{dsInfo?.version || "v1.0"}</Badge></div>
                            <div className="text-[10px] text-muted-foreground mt-1">Endpoint: <span className="font-mono text-blue-500 break-all">{dsInfo?.endpoint?.url || "-"}</span></div>
                            <div className="text-[10px] text-muted-foreground">Protocol: {dsInfo?.endpoint?.protocol || dsInfo?.endpoint?.access_type || "-"}</div>
                          </td>
                          <td className="px-3 py-2 text-xs align-top">{datasetPolicyById.get(entry.dataset_policy_id)?.name || entry.dataset_policy_id.slice(0, 8)}</td>
                          <td className="px-3 py-2 text-right align-top">
                            <Button size="sm" variant="ghost" className="h-7 gap-1 text-destructive" onClick={() => handleRemoveDataset(entry.dataset_id)}>
                              <Trash2 className="h-3 w-3" />Hapus
                            </Button>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">Belum ada dataset attached — tambahkan di atas lalu klik Add.</p>
                )}
              </div>
            </div>

            {/* Contract Policies section */}
            <div className="space-y-3 rounded-lg border border-border/50 p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold">Contract Policies</p>
                  <p className="text-xs text-muted-foreground">Aturan klasifikasi data di tingkat contract.</p>
                </div>
                <Badge variant="outline">{draftCPolicies.length} attached</Badge>
              </div>

              {contractPolicies.length === 0 && (
                <p className="rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 text-xs text-amber-600">
                  Belum ada contract policy di domain ini. Buat dulu di{" "}
                  <Link to="/v2/admin-consumer/policy-contract" className="underline" onClick={() => setFulfilDialog(false)}>Policy & Contract → Contract Policies →</Link>
                </p>
              )}

              <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
                <div className="grid gap-1">
                  <Label className="text-xs">Contract Policy</Label>
                  <Select value={pickContractPolicyId} onValueChange={setPickContractPolicyId}>
                    <SelectTrigger><SelectValue placeholder={availableContractPolicyPicks.length ? "Pilih contract policy" : contractPolicies.length === 0 ? "Belum ada contract policy" : "Semua sudah attached"} /></SelectTrigger>
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
                        <th className="px-3 py-2 text-right text-xs font-medium text-muted-foreground">Aksi</th>
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
                                <Trash2 className="h-3 w-3" />Hapus
                              </Button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                ) : (
                  <p className="px-3 py-6 text-center text-xs text-muted-foreground">Belum ada contract policy attached.</p>
                )}
              </div>
            </div>
          </div>
          )}

          {activeContract && (
            <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground space-y-0.5">
              <p><span className="font-semibold">Payload preview:</span> consumer_id=<code>{activeContract.consumer_id?.slice(0,8) || <span className="text-red-500">KOSONG!</span>}…</code> provider_id=<code>{activeContract.provider_id?.slice(0,8) || <span className="text-red-500">KOSONG!</span>}…</code> datasets=<code>{draftDatasets.length}</code> contract_policies=<code>{draftCPolicies.length}</code></p>
              <p>Domain: <code>{domainId?.slice(0,8)}…</code> | Datasets tersedia: <code>{datasets.length}</code> | Policies tersedia: <code>{datasetPolicies.length}</code></p>
            </div>
          )}
          {saveError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-500 break-all">
              <span className="font-semibold">Error: </span>{saveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setFulfilDialog(false)}>Cancel</Button>
            <Button onClick={() => setConfirmAction({
              title: "Save Fulfilment",
              description: "Attach datasets and policies to this contract? Ensure endpoints are correct.",
              onConfirm: handleSaveFulfilment
            })} disabled={updateContract.isPending || !canManage || loadingDetail}>
              {updateContract.isPending ? "Menyimpan..." : "Save Fulfilment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── General Confirmation Dialog ─────────────────────────────────── */}
      <AlertDialog open={!!confirmAction} onOpenChange={(o) => !o && setConfirmAction(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{confirmAction?.title}</AlertDialogTitle>
            <AlertDialogDescription>{confirmAction?.description}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className={confirmAction?.destructive ? "bg-destructive text-destructive-foreground hover:bg-destructive/90" : ""}
              onClick={() => {
                if (confirmAction?.onConfirm) confirmAction.onConfirm();
                setConfirmAction(null);
              }}
            >
              Confirm
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </V2PageShell>
  );
};

export default ContractFulfilment;
