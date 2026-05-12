// src/pages/v2/admin-consumer/PolicyContract.tsx
import { useEffect, useState } from "react";
import { FileText, Shield, Handshake, Layers, Plus, Pencil, Trash2, Eye, Printer } from "lucide-react";
import { DetailDialog, renderValue } from "@/components/common/DetailDialog";
import { useMutation, useQueryClient } from "@tanstack/react-query";
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
import { Checkbox } from "@/components/ui/checkbox";
import { useAllDomains } from "@/api/hooks/useDomains";
import { useParticipants, useCurrentSessionParticipant } from "@/api/hooks/useParticipants";
import { useDatasets } from "@/api/hooks/useDatasets";
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
  hydrateContractSnapshot,
} from "@/api/hooks/useContracts";
import { useAgreements, useCreateAgreement, useDeleteAgreement, useUpdateAgreement } from "@/api/hooks/useAgreements";
import { DatasetPolicyType, DatasetPolicyStatusEnum, RuleOperator, POLICY_TYPES, RULE_OPERATORS, POLICY_STATUSES, DATA_CLASSIFICATIONS } from "@/api/services/policy";
import { consumerApi } from "@/api/services/connector";
import { addDays } from "date-fns";

import { transferCache } from "@/lib/transferCache";
import { normalizeContractDatasets, normalizeContractPolicyIds } from "@/api/types";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { TransferPreviewDialog } from "@/components/transfer/TransferPreviewDialog";

const STATUS_COLORS: Record<string, string> = {
  DRAFT: "border-slate-400/30 text-slate-400",
  APPROVED: "border-emerald-500/30 text-emerald-500",
  ACTIVE: "border-blue-500/30 text-blue-500",
  REQUESTED: "border-amber-500/30 text-amber-500",
  REJECTED: "border-red-500/30 text-red-500",
  DEPRECATED: "border-slate-500/30 text-slate-500",
};

type RuleOperator = "EQUALS" | "NOT_EQUALS" | "GREATER_THAN" | "LESS_THAN" | "CONTAINS" | "STARTS_WITH" | "ENDS_WITH";
type DatasetPolicyType = "ACCESS" | "USAGE" | "RETENTION" | "SECURITY";
type DatasetPolicyStatusEnum = "DRAFT" | "APPROVED" | "DEPRECATED";
type DataClassification = "PUBLIC" | "INTERNAL" | "CONFIDENTIAL" | "RESTRICTED";

const RULE_OPERATORS: RuleOperator[] = ["EQUALS", "NOT_EQUALS", "GREATER_THAN", "LESS_THAN", "CONTAINS", "STARTS_WITH", "ENDS_WITH"];
const POLICY_TYPES: DatasetPolicyType[] = ["ACCESS", "USAGE", "RETENTION", "SECURITY"];
const POLICY_STATUSES: DatasetPolicyStatusEnum[] = ["DRAFT", "APPROVED", "DEPRECATED"];
const DATA_CLASSIFICATIONS: DataClassification[] = ["PUBLIC", "INTERNAL", "CONFIDENTIAL", "RESTRICTED"];
const SEMVER_RX = /^\d+\.\d+\.\d+$/;

interface RuleRow { left_operand: string; right_operand: string; operator: RuleOperator }

const emptyDatasetPolicyForm = {
  name: "",
  type: "ACCESS" as DatasetPolicyType,
  status: "DRAFT" as DatasetPolicyStatusEnum,
  version: "1.0.0",
  description: "",
  rules: [] as RuleRow[],
};

const emptyContractForm = {
  name: "",
  description: "",
  consumer_id: "",
  provider_id: "",
  contract_policies: [] as string[],
  datasets: [] as { dataset_id: string; dataset_policy_id: string }[],
};
// Auto-generate date defaults: from = today, to = +1 year (date only, time auto-appended on submit)
const todayDate = () => new Date().toISOString().slice(0, 10);
const oneYearLaterDate = () => {
  const d = new Date();
  d.setFullYear(d.getFullYear() + 1);
  return d.toISOString().slice(0, 10);
};
const addDays = (dateStr: string, days: number) => {
  if (!dateStr) return "";
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return "";
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
};

const emptyContractPolicyForm = {
  name: "",
  data_clasification: "INTERNAL",
  effective_from: todayDate(),
  effective_to: oneYearLaterDate(),
  description: "",
};

// ── Print / Export helpers ──────────────────────────────────────────────────

const PRINT_CSS = `
  *{box-sizing:border-box;margin:0;padding:0}
  body{font-family:'Segoe UI',Arial,sans-serif;font-size:12px;color:#111;padding:40px 50px;line-height:1.6}
  .doc-header{text-align:center;border-bottom:2px solid #111;padding-bottom:16px;margin-bottom:24px}
  .doc-header h1{font-size:18px;font-weight:700;letter-spacing:1px;text-transform:uppercase}
  .doc-header p{font-size:11px;color:#555;margin-top:4px}
  .section{margin-bottom:20px}
  .section-title{font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#555;border-bottom:1px solid #ddd;padding-bottom:4px;margin-bottom:10px}
  .grid{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
  .field label{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:#777}
  .field p{font-size:12px;margin-top:2px;word-break:break-all}
  .field.full{grid-column:1/-1}
  .mono{font-family:monospace;font-size:10px;background:#f5f5f5;padding:2px 6px;border-radius:3px}
  table{width:100%;border-collapse:collapse;font-size:11px}
  table th{background:#f0f0f0;text-align:left;padding:5px 8px;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px}
  table td{padding:5px 8px;border-bottom:1px solid #eee}
  .badge{display:inline-block;padding:2px 8px;border-radius:4px;border:1px solid #bbb;font-size:10px;font-weight:600;text-transform:uppercase}
  .sig-block{margin-top:56px;display:grid;grid-template-columns:1fr 1fr;gap:48px}
  .sig-party{text-align:center}
  .sig-party .role{font-size:10px;font-weight:700;letter-spacing:1px;text-transform:uppercase;color:#555;margin-bottom:4px}
  .sig-party .name{font-weight:600;font-size:13px;margin-bottom:56px}
  .sig-party .line{border-top:1px solid #111;padding-top:6px;font-size:10px;color:#555}
  .print-date{font-size:10px;color:#999;text-align:right;margin-top:32px}
  @media print{body{padding:24px 32px}button{display:none!important}}
`;

function openPrint(html: string) {
  const win = window.open("", "_blank");
  if (!win) { alert("Allow popup untuk membuka export dokumen."); return; }
  win.document.open();
  win.document.write(html);
  win.document.close();
  win.focus();
  setTimeout(() => win.print(), 400);
}

function buildContractHtml(
  c: any,
  participants: any[],
  cPolicies: any[],
  datasets: any[],
  policies: any[]
): string {
  const consumer = participants.find((p) => p.id === c.consumer_id);
  const provider = participants.find((p) => p.id === c.provider_id);
  const today = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  const cpRows = (c.contract_policies || []).map((cp: any) => {
    const id = cp.contract_policy_id || cp.id || cp;
    const pol = cPolicies.find((p) => p.id === id);
    return `<tr><td class="mono">${id}</td><td>${pol?.name || "—"}</td><td>${pol?.data_clasification || "—"}</td></tr>`;
  }).join("") || `<tr><td colspan="3" style="color:#999;text-align:center">No contract policies bound</td></tr>`;

  const dsRows = (c.datasets || []).map((ds: any) => {
    const dataset = datasets.find((x: any) => x.id === ds.dataset_id);
    const pol = policies.find((x: any) => x.id === ds.dataset_policy_id);
    return `<tr><td>${dataset?.name || ds.dataset_id}</td><td>${pol?.name || ds.dataset_policy_id}</td><td>${pol?.type || "—"}</td><td>${pol?.version || "—"}</td></tr>`;
  }).join("") || `<tr><td colspan="4" style="color:#999;text-align:center">No datasets bound</td></tr>`;

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Contract — ${c.name}</title><style>${PRINT_CSS}</style></head><body>
<div class="doc-header">
  <h1>Data Space Contract Document</h1>
  <p>GX-Space / rapiDSK Platform &nbsp;|&nbsp; Confidential</p>
</div>

<div class="section">
  <div class="section-title">Contract Information</div>
  <div class="grid">
    <div class="field full"><label>Contract ID</label><p class="mono">${c.id}</p></div>
    <div class="field"><label>Contract Name</label><p>${c.name}</p></div>
    <div class="field"><label>Status</label><p><span class="badge">${c.status || "—"}</span></p></div>
    <div class="field full"><label>Description</label><p>${c.description || "—"}</p></div>
    <div class="field"><label>Created</label><p>${c.created_at ? new Date(c.created_at).toLocaleString("id-ID") : "—"}</p></div>
    <div class="field"><label>Last Updated</label><p>${c.updated_at ? new Date(c.updated_at).toLocaleString("id-ID") : "—"}</p></div>
  </div>
</div>

<div class="section">
  <div class="section-title">Parties</div>
  <div class="grid">
    <div class="field"><label>Consumer</label><p>${consumer?.organization_name || "—"}</p>${consumer?.code ? `<p class="mono" style="color:#777">${consumer.code}</p>` : ""}</div>
    <div class="field"><label>Provider</label><p>${provider?.organization_name || "—"}</p>${provider?.code ? `<p class="mono" style="color:#777">${provider.code}</p>` : ""}</div>
  </div>
</div>

<div class="section">
  <div class="section-title">Contract Policies</div>
  <table>
    <thead><tr><th>Policy ID</th><th>Name</th><th>Classification</th></tr></thead>
    <tbody>${cpRows}</tbody>
  </table>
</div>

<div class="section">
  <div class="section-title">Bound Datasets</div>
  <table>
    <thead><tr><th>Dataset Name</th><th>Dataset Policy</th><th>Type</th><th>Version</th></tr></thead>
    <tbody>${dsRows}</tbody>
  </table>
</div>

<div class="sig-block">
  <div class="sig-party">
    <div class="role">Consumer</div>
    <div class="name">${consumer?.organization_name || "Consumer Party"}</div>
    <div class="line">Signature &amp; Stamp</div>
    <div style="margin-top:6px;font-size:10px;color:#777">Name: ______________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Date: ______________________________</div>
  </div>
  <div class="sig-party">
    <div class="role">Provider</div>
    <div class="name">${provider?.organization_name || "Provider Party"}</div>
    <div class="line">Signature &amp; Stamp</div>
    <div style="margin-top:6px;font-size:10px;color:#777">Name: ______________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Date: ______________________________</div>
  </div>
</div>

<div class="print-date">Dicetak pada: ${today} &nbsp;|&nbsp; GX-Space Platform</div>
</body></html>`;
}

function buildAgreementHtml(
  a: any,
  contracts: any[],
  participants: any[],
  cPolicies: any[],
  datasets: any[],
  policies: any[]
): string {
  const ctr = contracts.find((c: any) => c.id === a.contract_id);
  const consumer = ctr ? participants.find((p) => p.id === ctr.consumer_id) : null;
  const provider = ctr ? participants.find((p) => p.id === ctr.provider_id) : null;
  const today = new Date().toLocaleDateString("id-ID", { year: "numeric", month: "long", day: "numeric" });

  const cpRows = ctr ? (ctr.contract_policies || []).map((cp: any) => {
    const id = cp.contract_policy_id || cp.id || cp;
    const pol = cPolicies.find((p) => p.id === id);
    return `<tr><td>${pol?.name || "—"}</td><td>${pol?.data_clasification || "—"}</td><td>${pol?.effective_from ? new Date(pol.effective_from).toLocaleDateString("id-ID") : "—"}</td><td>${pol?.effective_to ? new Date(pol.effective_to).toLocaleDateString("id-ID") : "—"}</td></tr>`;
  }).join("") : "";

  const dsRows = ctr ? (ctr.datasets || []).map((ds: any) => {
    const dataset = datasets.find((x: any) => x.id === ds.dataset_id);
    const pol = policies.find((x: any) => x.id === ds.dataset_policy_id);
    return `<tr><td>${dataset?.name || ds.dataset_id}</td><td>${pol?.name || ds.dataset_policy_id}</td></tr>`;
  }).join("") : "";

  return `<!DOCTYPE html><html lang="id"><head><meta charset="UTF-8"><title>Agreement — ${a.id?.slice(0, 8)}</title><style>${PRINT_CSS}</style></head><body>
<div class="doc-header">
  <h1>Data Exchange Agreement</h1>
  <p>GX-Space / rapiDSK Platform &nbsp;|&nbsp; Confidential</p>
</div>

<div class="section">
  <div class="section-title">Agreement Information</div>
  <div class="grid">
    <div class="field full"><label>Agreement ID</label><p class="mono">${a.id}</p></div>
    <div class="field"><label>Status</label><p><span class="badge">${a.status || "—"}</span></p></div>
    <div class="field"><label>Contract Reference</label><p>${ctr?.name || a.contract_id}</p></div>
    <div class="field"><label>Effective From</label><p>${a.effective_from ? new Date(a.effective_from).toLocaleString("id-ID") : "—"}</p></div>
    <div class="field"><label>Effective To</label><p>${a.effective_to ? new Date(a.effective_to).toLocaleString("id-ID") : "—"}</p></div>
    <div class="field"><label>Created</label><p>${a.created_at ? new Date(a.created_at).toLocaleString("id-ID") : "—"}</p></div>
    <div class="field"><label>Last Updated</label><p>${a.updated_at ? new Date(a.updated_at).toLocaleString("id-ID") : "—"}</p></div>
  </div>
</div>

${ctr ? `
<div class="section">
  <div class="section-title">Contracting Parties</div>
  <div class="grid">
    <div class="field"><label>Consumer</label><p>${consumer?.organization_name || "—"}</p>${consumer?.code ? `<p class="mono" style="color:#777">${consumer.code}</p>` : ""}</div>
    <div class="field"><label>Provider</label><p>${provider?.organization_name || "—"}</p>${provider?.code ? `<p class="mono" style="color:#777">${provider.code}</p>` : ""}</div>
  </div>
</div>

${cpRows ? `<div class="section">
  <div class="section-title">Applicable Contract Policies</div>
  <table>
    <thead><tr><th>Policy Name</th><th>Classification</th><th>Eff. From</th><th>Eff. To</th></tr></thead>
    <tbody>${cpRows}</tbody>
  </table>
</div>` : ""}

${dsRows ? `<div class="section">
  <div class="section-title">Datasets Covered</div>
  <table>
    <thead><tr><th>Dataset Name</th><th>Dataset Policy</th></tr></thead>
    <tbody>${dsRows}</tbody>
  </table>
</div>` : ""}
` : ""}

<div class="section" style="margin-top:24px;padding:16px;border:1px solid #ddd;border-radius:4px;background:#fafafa">
  <p style="font-size:11px;color:#555;line-height:1.7">
    Dengan ditandatanganinya dokumen ini, para pihak yang tersebut di atas menyatakan telah membaca,
    memahami, dan menyetujui seluruh ketentuan yang tercantum dalam <strong>Data Exchange Agreement</strong> ini,
    sesuai dengan contract yang direferensikan. Perjanjian ini berlaku sejak tanggal efektif yang
    tertera dan tunduk pada hukum dan peraturan yang berlaku.
  </p>
</div>

<div class="sig-block">
  <div class="sig-party">
    <div class="role">Consumer</div>
    <div class="name">${consumer?.organization_name || "Consumer Party"}</div>
    <div class="line">Tanda Tangan &amp; Cap</div>
    <div style="margin-top:6px;font-size:10px;color:#777">Nama: ______________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Jabatan: ___________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Tanggal: ___________________________</div>
  </div>
  <div class="sig-party">
    <div class="role">Provider</div>
    <div class="name">${provider?.organization_name || "Provider Party"}</div>
    <div class="line">Tanda Tangan &amp; Cap</div>
    <div style="margin-top:6px;font-size:10px;color:#777">Nama: ______________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Jabatan: ___________________________</div>
    <div style="margin-top:4px;font-size:10px;color:#777">Tanggal: ___________________________</div>
  </div>
</div>

<div class="print-date">Dicetak pada: ${today} &nbsp;|&nbsp; GX-Space Platform</div>
</body></html>`;
}

const PolicyContract = () => {
  const queryClient = useQueryClient();
  const { hasPermission } = useAuth();
  const { data: domainsData, isLoading: loadingD } = useAllDomains({ limit: 1000 });
  const { data: participantsData } = useParticipants({ limit: 100 });
  const { participant: sessionParticipant } = useCurrentSessionParticipant({ limit: 100 }, "forceConsumer");
  const domains = domainsData?.data ?? [];
  const participants = participantsData?.data ?? [];
  const [selectedDomain, setSelectedDomain] = useState<string>("");
  const domainId = selectedDomain || domains[0]?.id || "";

  // consumer_id selalu dari sesi login — tidak boleh pilih org lain
  const myConsumerId = sessionParticipant?.id ?? "";
  const providerParticipants = participants.filter((p) => p.organization_type === "ENTERPRISE");

  // ── Data ────────────────────────────────────────────────────────────────
  const { data: policiesData, isLoading: loadingPol } = useDatasetPolicies(domainId, { limit: 50 });
  const { data: contractsData, isLoading: loadingC } = useContracts(domainId, { limit: 50 });
  const { data: cPoliciesData, isLoading: loadingCP } = useContractPolicies(domainId, { limit: 50 });
  const { data: agreementsData, isLoading: loadingA } = useAgreements(domainId, { limit: 50 });
  const { data: datasetsData } = useDatasets(domainId, { limit: 100 });
  const datasets = datasetsData?.data ?? [];

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
        type: (record.type as DatasetPolicyType) || "ACCESS",
        status: (record.status as DatasetPolicyStatusEnum) || "DRAFT",
        version: record.version || "1.0.0",
        description: record.description || "",
        rules: (record.rules || []).map((r: any) => ({
          left_operand: r.left_operand || "",
          right_operand: r.right_operand || "",
          operator: (r.operator as RuleOperator) || "EQUALS",
        })),
      });
    } else {
      setEditingDatasetPolicy(null);
      setDatasetPolicyForm(emptyDatasetPolicyForm);
    }
    setDatasetPolicyDialog(true);
  };

  // Backend: name 3-255, description 3-255 OR null, version semver, rules array of {left_operand, right_operand, operator(enum)}
  const validateDatasetPolicy = () => {
    if (!domainId) return "Pilih domain dulu";
    if (!datasetPolicyForm.name || datasetPolicyForm.name.length < 3 || datasetPolicyForm.name.length > 255) return "Name harus 3-255 char";
    if (!SEMVER_RX.test(datasetPolicyForm.version)) return "Version harus format semver (e.g. 1.0.0) — backend regex ^\\d+.\\d+.\\d+$";
    if (datasetPolicyForm.description && (datasetPolicyForm.description.length < 3 || datasetPolicyForm.description.length > 255)) return "Description harus 3-255 char (atau kosong)";
    for (const r of datasetPolicyForm.rules) {
      if (!r.left_operand || !r.right_operand) return "Semua rules harus punya left & right operand";
      if (!RULE_OPERATORS.includes(r.operator)) return `Operator '${r.operator}' bukan enum valid`;
    }
    return null;
  };

  const handleSaveDatasetPolicy = async () => {
    const err = validateDatasetPolicy();
    if (err) { toast.error(err); return; }
    try {
      if (editingDatasetPolicy) {
        await updateDatasetPolicy.mutateAsync({
          domainId,
          id: editingDatasetPolicy.id,
          data: {
            name: datasetPolicyForm.name,
            version: datasetPolicyForm.version,
            type: datasetPolicyForm.type,
            status: datasetPolicyForm.status,
            description: datasetPolicyForm.description || null,
            rules: datasetPolicyForm.rules,
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
            rules: datasetPolicyForm.rules,
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
  const [contractHydrating, setContractHydrating] = useState(false);
  const [editingContract, setEditingContract] = useState<any | null>(null);
  const [contractForm, setContractForm] = useState(emptyContractForm);
  const [contractDelete, setContractDelete] = useState<any | null>(null);
  const [contractSaveError, setContractSaveError] = useState<string | null>(null);

  useEffect(() => {
    if (!domainId || contracts.length === 0) return;

    const needsHydration = contracts.filter(
      (contract: any) =>
        !Array.isArray(contract.datasets) ||
        !Array.isArray(contract.contract_policies) ||
        !contract.consumer_id ||
        !contract.provider_id ||
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

  const openContract = async (record?: any) => {
    setContractSaveError(null);
    if (record) {
      setContractHydrating(true);
      setContractDialog(true);
      let full = record;
      try {
        full = await hydrateContractSnapshot(queryClient, domainId, record, true) ?? record;
      } catch {
        full = record;
      }
      setEditingContract(full);
      setContractForm({
        name: full.name || "",
        description: full.description || "",
        consumer_id: full.consumer_id || myConsumerId,
        provider_id: full.provider_id || "",
        contract_policies: normalizeContractPolicyIds(full.contract_policies),
        datasets: normalizeContractDatasets(full.datasets),
      });
      setContractHydrating(false);
    } else {
      setEditingContract(null);
      setContractForm({ ...emptyContractForm, contract_policies: [], datasets: [], consumer_id: myConsumerId });
      setContractDialog(true);
    }
  };

  const handleSaveContract = async () => {
    setContractSaveError(null);
    if (!domainId) { setContractSaveError("domainId kosong"); return; }
    if (!contractForm.name || contractForm.name.length < 3 || contractForm.name.length > 255) {
      setContractSaveError("Name harus 3-255 char"); return;
    }
    if (contractForm.description && (contractForm.description.length < 3 || contractForm.description.length > 255)) {
      setContractSaveError(`Description harus 3-255 char (sekarang ${contractForm.description.length} char)`); return;
    }

    const partialRows = contractForm.datasets.filter((d) => (!d.dataset_id && d.dataset_policy_id));
    if (partialRows.length > 0) {
      setContractSaveError("Ada row yang pilih policy tapi belum pilih dataset — hapus atau lengkapi dulu"); return;
    }
    const cleanDatasets = contractForm.datasets.filter((d) => d.dataset_id && d.dataset_policy_id);
    const skippedDatasets = contractForm.datasets.filter((d) => d.dataset_id && !d.dataset_policy_id);

    try {
      if (editingContract) {
        if (!editingContract.consumer_id || !editingContract.provider_id) {
          setContractSaveError(`consumer_id="${editingContract.consumer_id}" provider_id="${editingContract.provider_id}" — salah satu kosong, PATCH akan 422`);
          return;
        }
        const patchPayload = {
          consumer_id: editingContract.consumer_id,
          provider_id: editingContract.provider_id,
          name: contractForm.name,
          description: contractForm.description || null,
          contract_policies: contractForm.contract_policies,
          datasets: cleanDatasets,
        };
        const result = await updateContract.mutateAsync({ domainId, id: editingContract.id, data: patchPayload });
        const retDs = normalizeContractDatasets((result as any)?.datasets).length;
        const retCp = normalizeContractPolicyIds((result as any)?.contract_policies).length;
        const skippedMsg = skippedDatasets.length > 0 ? ` (${skippedDatasets.length} dataset tanpa policy di-skip)` : "";
        toast.success(`Contract updated — backend returned: ${retDs} datasets, ${retCp} contract_policies${skippedMsg}`);
      } else {
        if (!contractForm.consumer_id) {
          setContractSaveError("consumer_id kosong — participant akun ini belum terdaftar"); return;
        }
        if (!contractForm.provider_id) {
          setContractSaveError("Pilih provider (KKKS) dulu"); return;
        }
        if (!contractForm.description || contractForm.description.length < 3) {
          setContractSaveError("Description wajib min 3 chars untuk POST"); return;
        }
        const result = await createContract.mutateAsync({
          domainId,
          data: {
            name: contractForm.name,
            description: contractForm.description,
            consumer_id: contractForm.consumer_id,
            provider_id: contractForm.provider_id,
            contract_policies: contractForm.contract_policies,
            datasets: cleanDatasets,
          },
        });
        const retDs = normalizeContractDatasets((result as any)?.datasets).length;
        const retCp = normalizeContractPolicyIds((result as any)?.contract_policies).length;
        toast.success(`Contract dibuat — backend returned: ${retDs} datasets, ${retCp} contract_policies`);
      }
      setContractDialog(false);
    } catch (error: any) {
      const detail = error?.response?.data?.detail;
      const msg = Array.isArray(detail)
        ? detail.map((d: any) => `[${d.loc?.join(".")}] ${d.msg}`).join(" | ")
        : detail || error?.response?.data?.error || error?.message || "Unexpected error";
      setContractSaveError(`HTTP ${error?.response?.status ?? "?"}: ${msg}`);
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
        effective_from: record.effective_from ? record.effective_from.slice(0, 10) : todayDate(),
        effective_to: record.effective_to ? record.effective_to.slice(0, 10) : oneYearLaterDate(),
        description: record.description || "",
      });
    } else {
      setEditingCPolicy(null);
      setCPolicyForm(emptyContractPolicyForm);
    }
    setCPolicyDialog(true);
  };

  const handleSaveCPolicy = async () => {
    if (!domainId) { toast.error("Pilih domain dulu"); return; }
    if (!cPolicyForm.name || cPolicyForm.name.length < 3 || cPolicyForm.name.length > 255) {
      toast.error("Name harus 3-255 char"); return;
    }
    if (!cPolicyForm.effective_from || !cPolicyForm.effective_to) {
      toast.error("Effective from/to required"); return;
    }
    // Time auto-generated: from gets 00:00:00, to gets 23:59:59
    const efFrom = new Date(`${cPolicyForm.effective_from}T00:00:00`);
    const efTo = new Date(`${cPolicyForm.effective_to}T23:59:59`);
    if (Number.isNaN(efFrom.getTime()) || Number.isNaN(efTo.getTime())) {
      toast.error("Tanggal effective tidak valid"); return;
    }
    if (efTo.getTime() <= efFrom.getTime()) {
      toast.error("Effective To harus setelah Effective From"); return;
    }
    if (cPolicyForm.description && (cPolicyForm.description.length < 3 || cPolicyForm.description.length > 255)) {
      toast.error("Description harus 3-255 char"); return;
    }
    if (!DATA_CLASSIFICATIONS.includes(cPolicyForm.data_clasification as DataClassification)) {
      toast.error("Data classification invalid"); return;
    }
    try {
      const payload = {
        name: cPolicyForm.name,
        data_clasification: cPolicyForm.data_clasification,
        effective_from: efFrom.toISOString(),
        effective_to: efTo.toISOString(),
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
  const [editingAgreement, setEditingAgreement] = useState<any | null>(null);
  const [agreementForm, setAgreementForm] = useState({
    contract_id: "",
    effective_from: todayDate(),
    effective_to: oneYearLaterDate(),
    status: "REQUESTED" as "REQUESTED" | "APPROVED" | "REJECTED" | "ACTIVE",
  });
  const [transferResult, setTransferResult] = useState<unknown>(null);
  const [consumePreviewOpen, setConsumePreviewOpen] = useState(false);
  const [consumeEndpoint, setConsumeEndpoint] = useState("");
  const [consumeDuration, setConsumeDuration] = useState(0);

  const openAgreement = (record?: any) => {
    if (record) {
      setEditingAgreement(record);
      setAgreementForm({
        contract_id: record.contract_id || "",
        effective_from: record.effective_from ? record.effective_from.slice(0, 10) : todayDate(),
        effective_to: record.effective_to ? record.effective_to.slice(0, 10) : oneYearLaterDate(),
        status: record.status || "REQUESTED",
      });
    } else {
      setEditingAgreement(null);
      setAgreementForm({ contract_id: "", effective_from: todayDate(), effective_to: oneYearLaterDate(), status: "REQUESTED" });
    }
    setAgreementDialogOpen(true);
  };

  const handleSaveAgreement = async () => {
    if (!domainId) { toast.error("Pilih domain dulu"); return; }
    if (!agreementForm.contract_id) { toast.error("Pilih contract dulu"); return; }
    if (!agreementForm.effective_from || !agreementForm.effective_to) { toast.error("Effective dates required"); return; }
    const selectedContract = contracts.find((c: any) => c.id === agreementForm.contract_id);
    if (!selectedContract || selectedContract.status !== "ACTIVE") { toast.error("Contract harus berstatus ACTIVE untuk membuat Agreement."); return; }
    // Time auto-generated: from gets 00:00:00, to gets 23:59:59
    const ef = new Date(`${agreementForm.effective_from}T00:00:00`);
    const et = new Date(`${agreementForm.effective_to}T23:59:59`);
    if (Number.isNaN(ef.getTime()) || Number.isNaN(et.getTime())) { toast.error("Tanggal tidak valid"); return; }
    if (et.getTime() <= ef.getTime()) { toast.error("Effective To harus setelah Effective From"); return; }
    try {
      if (editingAgreement) {
        // Backend AgreementUpdateRequest: contract_id required + status/dates optional
        await updateAgreement.mutateAsync({
          domainId,
          id: editingAgreement.id,
          data: {
            contract_id: agreementForm.contract_id,
            status: agreementForm.status,
            effective_from: ef.toISOString(),
            effective_to: et.toISOString(),
          },
        });
        toast.success("Agreement updated");
      } else {
        await createAgreement.mutateAsync({
          domainId,
          data: {
            contract_id: agreementForm.contract_id,
            effective_from: ef.toISOString(),
            effective_to: et.toISOString(),
          },
        });
        toast.success("Agreement created");
      }
      setAgreementDialogOpen(false);
      setEditingAgreement(null);
      setAgreementForm({ contract_id: "", effective_from: todayDate(), effective_to: oneYearLaterDate(), status: "REQUESTED" });
    } catch (error: any) {
      toast.error("Failed to save agreement", {
        description: error?.response?.data?.detail || error?.message || "Unexpected error",
      });
    }
  };

  const handleStartConsumerTransfer = async (agreementId: string) => {
    const endpoint = `GET /api/v1/consumer/${domainId}/consume/${agreementId}`;
    setConsumeEndpoint(endpoint);
    const t0 = performance.now();

    const storageKey = `cts_saved_consume_${agreementId}`;
    const savedData = await transferCache.get(storageKey);

    if (savedData) {
      setConsumeDuration(Math.round(performance.now() - t0));
      setTransferResult(savedData);
      setConsumePreviewOpen(true);
      toast.success("Loaded from IndexedDB Cache", {
        description: "Data diload dari cache lokal (tidak hit backend lagi).",
      });
      return;
    }

    try {
      const response = await consumeMutation.mutateAsync(agreementId);
      setConsumeDuration(Math.round(performance.now() - t0));
      setTransferResult(response);
      setConsumePreviewOpen(true);

      await transferCache.set(storageKey, response);
      toast.success("Consumer transfer executed & cached", {
        description: "Data berhasil ditarik dan disave ke IndexedDB (persist antar session).",
      });
    } catch (error: any) {
      setConsumeDuration(Math.round(performance.now() - t0));
      console.error("[consume] error:", error);
      const status = error?.response?.status;
      const data = error?.response?.data;
      const detail = data?.error || data?.detail || data?.message;
      const msg =
        (typeof detail === "string" && detail) ||
        (Array.isArray(detail) ? detail.map((d: any) => d?.msg || JSON.stringify(d)).join(" | ") : "") ||
        error?.message ||
        (data ? JSON.stringify(data).slice(0, 300) : "Network/Unknown error");
      toast.error(`Consumer transfer failed${status ? ` (HTTP ${status})` : ""}`, {
        description: msg,
      });
    }
  };

  const canManageContracts = hasPermission("contracts.manage");
  const canManageAgreements = hasPermission("agreements.manage") || hasPermission("agreements.approve");

  // ── View detail state ──────────────────────────────────────────────────
  const [viewTarget, setViewTarget] = useState<{ kind: "datasetPolicy" | "contract" | "contractPolicy" | "agreement"; data: any } | null>(null);

  // ── Confirm Action State ───────────────────────────────────────────────
  const [confirmAction, setConfirmAction] = useState<{ title: string; description: React.ReactNode; onConfirm: () => void; destructive?: boolean } | null>(null);

  return (
    <V2PageShell title="Policy & Contract" subtitle="Group D — Dataset policies, contract policies, contracts, dan agreements (full CRUD, payload aligned ke OpenAPI)." status="Live API">
      {/* Backend constraint quick reference */}
      <details className="rounded-xl border border-border/50 bg-muted/20 p-3 text-xs">
        <summary className="cursor-pointer font-medium text-foreground">Backend payload constraints (klik untuk expand)</summary>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 text-muted-foreground">
          <div>
            <p className="font-semibold text-foreground">Dataset Policy</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>name: 3-255 char</li>
              <li>description: 3-255 char (or null)</li>
              <li>version: semver <code>^\d+.\d+.\d+$</code></li>
              <li>type: ACCESS / USAGE / RETENTION / SECURITY</li>
              <li>status (PATCH): DRAFT / APPROVED / DEPRECATED</li>
              <li>rules[]: {`{left_operand, right_operand, operator}`}</li>
              <li>operator enum: EQUALS / NOT_EQUALS / GREATER_THAN / LESS_THAN / CONTAINS / STARTS_WITH / ENDS_WITH</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Contract</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>name: 3-255 char</li>
              <li>description: 3-255 char (required pada POST)</li>
              <li>consumer_id, provider_id: UUID participant</li>
              <li>contract_policies: array of contract_policy UUID</li>
              <li>datasets: array of {`{dataset_id, dataset_policy_id}`}</li>
              <li>status (PATCH): REQUESTED / APPROVED / REJECTED / ACTIVE</li>
              <li>PATCH wajib re-send: consumer_id + provider_id + name</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Contract Policy</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>name: 3-255 char</li>
              <li>data_clasification: <span className="text-amber-500">backend pakai typo &quot;clasification&quot;</span></li>
              <li>effective_from / effective_to: ISO date-time</li>
              <li>description: 3-255 (optional)</li>
              <li>PATCH wajib re-send semua 5 field</li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-foreground">Agreement</p>
            <ul className="ml-4 list-disc space-y-0.5">
              <li>contract_id: UUID</li>
              <li>effective_from / effective_to: ISO date-time</li>
              <li>status (PATCH): REQUESTED / APPROVED / REJECTED / ACTIVE</li>
              <li>PATCH wajib re-send: contract_id</li>
            </ul>
          </div>
        </div>
      </details>

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

      {/* Flow / dependency order */}
      <Card className="border-border/50 bg-muted/10">
        <CardContent className="p-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary mb-2">Build order (backend dependency)</p>
          <div className="grid gap-2 sm:grid-cols-4 text-xs">
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <p className="font-semibold">1. Dataset Policy</p>
              <p className="text-muted-foreground mt-1">Standalone. Dipakai di Contract.datasets[].dataset_policy_id.</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{policies.length} ready</Badge>
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <p className="font-semibold">2. Contract Policy</p>
              <p className="text-muted-foreground mt-1">Standalone. Wajib ada minimal 1 sebelum Contract bisa di-bind.</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{cPolicies.length} ready</Badge>
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <p className="font-semibold">3. Contract</p>
              <p className="text-muted-foreground mt-1">Butuh: consumer + provider participant, contract_policies[], datasets[].</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{contracts.length} ready</Badge>
            </div>
            <div className="rounded-lg border border-border/50 bg-card p-3">
              <p className="font-semibold">4. Agreement</p>
              <p className="text-muted-foreground mt-1">Butuh contract. Approve → Activate → Trigger Consume.</p>
              <Badge variant="outline" className="mt-2 text-[10px]">{agreements.length} ready</Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="policies">
        <TabsList>
          <TabsTrigger value="policies">1 · Dataset Policies</TabsTrigger>
          <TabsTrigger value="cpolicies">2 · Contract Policies</TabsTrigger>
          <TabsTrigger value="contracts">3 · Contracts</TabsTrigger>
          <TabsTrigger value="agreements">4 · Agreements</TabsTrigger>
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
              <DataTable headers={["Name", "Type", "Version", "Status", "Rules", "Created", "Actions"]} isLoading={!domainId || loadingPol}>
                {policies.length > 0 ? policies.map((p: any) => (
                  <tr key={p.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{p.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{p.type || "—"}</Badge></td>
                    <td className="px-4 py-3 text-sm font-mono">{p.version || "—"}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[p.status] || ""}`}>{p.status}</Badge></td>
                    <td className="px-4 py-3 text-xs">{(p.rules?.length ?? 0)} rules</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewTarget({ kind: "datasetPolicy", data: p })}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageContracts} onClick={() => openDatasetPolicy(p)}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setDatasetPolicyDelete(p)}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No dataset policies" : "Select a domain"}</td></tr>)}
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
              <DataTable headers={["Name", "Status", "Consumer", "Provider", "Policies / Datasets", "Created", "Actions"]} isLoading={!domainId || loadingC}>
                {contracts.length > 0 ? contracts.map((c: any) => {
                  const consumer = participants.find((p) => p.id === c.consumer_id);
                  const provider = participants.find((p) => p.id === c.provider_id);
                  return (
                  <tr key={c.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm font-medium">{c.name}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className={`text-xs ${STATUS_COLORS[c.status] || ""}`}>{c.status}</Badge></td>
                    <td className="px-4 py-3 text-sm">{consumer?.organization_name || <span className="font-mono text-xs">{c.consumer_id?.slice(0, 8)}...</span>}</td>
                    <td className="px-4 py-3 text-sm">{provider?.organization_name || <span className="font-mono text-xs">{c.provider_id?.slice(0, 8)}...</span>}</td>
                    <td className="px-4 py-3 text-xs">{Array.isArray(c.contract_policies) ? c.contract_policies.length : "—"} / {Array.isArray(c.datasets) ? c.datasets.length : "—"}</td>
                    <td className="px-4 py-3 text-xs text-muted-foreground">{new Date(c.created_at).toLocaleDateString()}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-2">
                        {c.status === "REQUESTED" && (
                          <>
                            <Button size="sm" variant="outline" className="border-emerald-500/40 text-emerald-500"
                              disabled={!canManageContracts || updateContract.isPending}
                              onClick={() => setConfirmAction({
                                title: "Approve Contract",
                                description: `Are you sure you want to approve contract "${c.name}"?`,
                                onConfirm: async () => {
                                  try {
                                    await updateContract.mutateAsync({ domainId, id: c.id, data: { consumer_id: c.consumer_id, provider_id: c.provider_id, name: c.name, status: "APPROVED" } });
                                    toast.success(`Contract "${c.name}" disetujui`);
                                  } catch (e: any) { toast.error("Gagal approve", { description: e?.response?.data?.detail || e?.message }); }
                                }
                              })}>Approve</Button>
                            <Button size="sm" variant="outline" className="border-red-500/40 text-red-500"
                              disabled={!canManageContracts || updateContract.isPending}
                              onClick={() => setConfirmAction({
                                title: "Reject Contract",
                                description: `Are you sure you want to reject contract "${c.name}"?`,
                                destructive: true,
                                onConfirm: async () => {
                                  try {
                                    await updateContract.mutateAsync({ domainId, id: c.id, data: { consumer_id: c.consumer_id, provider_id: c.provider_id, name: c.name, status: "REJECTED" } });
                                    toast.success(`Contract "${c.name}" ditolak`);
                                  } catch (e: any) { toast.error("Gagal reject", { description: e?.response?.data?.detail || e?.message }); }
                                }
                              })}>Reject</Button>
                          </>
                        )}
                        {c.status === "APPROVED" && (
                          <Button size="sm" variant="outline" className="border-blue-500/40 text-blue-500"
                            disabled={!canManageContracts || updateContract.isPending}
                            onClick={() => {
                              if (!c.datasets || c.datasets.length === 0) {
                                toast.error("Contract cannot be activated without datasets. Provider must map datasets first.");
                                return;
                              }
                              setConfirmAction({
                                title: "Activate Contract",
                                description: `Are you sure you want to activate contract "${c.name}"? This allows Agreements to be created.`,
                                onConfirm: async () => {
                                  try {
                                    await updateContract.mutateAsync({ domainId, id: c.id, data: { consumer_id: c.consumer_id, provider_id: c.provider_id, name: c.name, status: "ACTIVE" } });
                                    toast.success(`Contract "${c.name}" diaktifkan`);
                                  } catch (e: any) { toast.error("Gagal activate", { description: e?.response?.data?.detail || e?.message }); }
                                }
                              });
                            }}>Activate</Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1" onClick={async () => {
                          let full: any = c;
                          try { full = await hydrateContractSnapshot(queryClient, domainId, c, true) ?? c; } catch {}
                          setViewTarget({ kind: "contract", data: full });
                        }}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageContracts} onClick={() => openContract(c)}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setContractDelete(c)}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                }) : (<tr><td colSpan={7} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No contracts" : "Select a domain"}</td></tr>)}
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
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewTarget({ kind: "contractPolicy", data: cp })}>
                          <Eye className="h-3.5 w-3.5" />View
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageContracts} onClick={() => openCPolicy(cp)}>
                          <Pencil className="h-3.5 w-3.5" />Edit
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1 border-destructive/40 text-destructive" disabled={!canManageContracts} onClick={() => setCPolicyDelete(cp)}>
                          <Trash2 className="h-3.5 w-3.5" />Delete
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
              <Button onClick={() => openAgreement()} disabled={!canManageAgreements || !domainId || contracts.length === 0}>
                <Plus className="h-4 w-4" /> Create Agreement
              </Button>
            </CardHeader>
            <CardContent>
              <DataTable headers={["Contract", "Status", "Effective From", "Effective To", "Actions"]} isLoading={!domainId || loadingA}>
                {agreements.length > 0 ? agreements.map((a: any) => {
                  const ctr = contracts.find((c: any) => c.id === a.contract_id);
                  return (
                  <tr key={a.id} className="transition-colors hover:bg-muted/20">
                    <td className="px-4 py-3 text-sm">{ctr ? ctr.name : <span className="font-mono text-xs">{a.contract_id?.slice(0, 8)}...</span>}</td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1">
                        <Badge variant="outline" className={`w-fit text-[10px] ${STATUS_COLORS[a.status] || ""}`}>Agr: {a.status}</Badge>
                        {ctr && <Badge variant="secondary" className={`w-fit text-[10px] ${STATUS_COLORS[ctr.status] || ""}`}>Ctr: {ctr.status}</Badge>}
                      </div>
                    </td>
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
                              onClick={() => setConfirmAction({
                                title: "Approve Agreement",
                                description: `Are you sure you want to approve this agreement?`,
                                onConfirm: async () => {
                                  try {
                                    await updateAgreement.mutateAsync({ domainId, id: a.id, data: { contract_id: a.contract_id, status: "APPROVED" } });
                                  } catch { /* hook toasts */ }
                                }
                              })}
                            >
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-red-500/40 text-red-500"
                              disabled={!hasPermission("agreements.approve") || updateAgreement.isPending}
                              onClick={() => setConfirmAction({
                                title: "Reject Agreement",
                                description: `Are you sure you want to reject this agreement?`,
                                destructive: true,
                                onConfirm: async () => {
                                  try {
                                    await updateAgreement.mutateAsync({ domainId, id: a.id, data: { contract_id: a.contract_id, status: "REJECTED" } });
                                  } catch { /* hook toasts */ }
                                }
                              })}
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
                            onClick={() => setConfirmAction({
                                title: "Activate Agreement",
                                description: `Are you sure you want to activate this agreement? This will allow Trigger Consume.`,
                                onConfirm: async () => {
                                  try {
                                    await updateAgreement.mutateAsync({ domainId, id: a.id, data: { contract_id: a.contract_id, status: "ACTIVE" } });
                                  } catch { /* hook toasts */ }
                                }
                              })}
                          >
                            Activate
                          </Button>
                        )}
                        <Button size="sm" variant="outline" className="gap-1" onClick={() => setViewTarget({ kind: "agreement", data: a })}>
                          <Eye className="h-3.5 w-3.5" /> View
                        </Button>
                        <Button size="sm" variant="outline" className="gap-1" disabled={!canManageAgreements} onClick={() => openAgreement(a)}>
                          <Pencil className="h-3.5 w-3.5" /> Edit
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => setConfirmAction({
                          title: "Trigger Consume",
                          description: "Pull data from provider connector. Are you sure?",
                          onConfirm: () => handleStartConsumerTransfer(a.id)
                        })} disabled={consumeMutation.isPending || !hasPermission("transfer.manage") || a.status !== "ACTIVE"} title={a.status !== "ACTIVE" ? "Agreement must be ACTIVE" : "Pull data from provider connector"}>
                          Trigger Consume
                        </Button>
                        <Button size="sm" variant="outline" className="border-destructive/40 text-destructive" disabled={!canManageAgreements} onClick={() => setAgreementDeleteTarget(a)}>
                          <Trash2 className="h-3.5 w-3.5" /> Delete
                        </Button>
                      </div>
                    </td>
                  </tr>
                  );
                }) : (<tr><td colSpan={5} className="px-4 py-12 text-center text-sm text-muted-foreground">{domainId ? "No agreements" : "Select a domain"}</td></tr>)}
              </DataTable>
            </CardContent>
          </Card>
          <TransferPreviewDialog
            open={consumePreviewOpen}
            onOpenChange={setConsumePreviewOpen}
            title="Consumer Transfer Result"
            description="Data yang di-tarik dari provider connector setelah trigger consume."
            endpoint={consumeEndpoint}
            duration={consumeDuration}
            data={transferResult}
          />
        </TabsContent>
      </Tabs>

      {/* ── Dataset Policy Dialog ───────────────────────────────────────── */}
      <Dialog open={datasetPolicyDialog} onOpenChange={setDatasetPolicyDialog}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingDatasetPolicy ? "Edit Dataset Policy" : "Create Dataset Policy"}</DialogTitle>
            <DialogDescription>
              Backend: name 3-255 char · description 3-255 (or empty) · version semver <code className="text-xs">^\d+.\d+.\d+$</code> · type enum {POLICY_TYPES.join("/")} · rules array of {`{left_operand, right_operand, operator}`}.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name * (3-255 chars)</Label>
              <Input value={datasetPolicyForm.name} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, name: e.target.value }))} maxLength={255} />
            </div>
            <div className={`grid gap-4 ${editingDatasetPolicy ? "sm:grid-cols-3" : "sm:grid-cols-2"}`}>
              <div className="grid gap-2">
                <Label>Type *</Label>
                <Select value={datasetPolicyForm.type} onValueChange={(v) => setDatasetPolicyForm((p) => ({ ...p, type: v as DatasetPolicyType }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {POLICY_TYPES.map((t) => (<SelectItem key={t} value={t}>{t}</SelectItem>))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <Label>Version * (semver)</Label>
                <Input value={datasetPolicyForm.version} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, version: e.target.value }))} placeholder="1.0.0" />
                {datasetPolicyForm.version && !SEMVER_RX.test(datasetPolicyForm.version) && (
                  <p className="text-xs text-red-500">Format invalid — harus ^\d+.\d+.\d+$</p>
                )}
              </div>
              {editingDatasetPolicy && (
                <div className="grid gap-2">
                  <Label>Status</Label>
                  <Select value={datasetPolicyForm.status} onValueChange={(v) => setDatasetPolicyForm((p) => ({ ...p, status: v as DatasetPolicyStatusEnum }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {POLICY_STATUSES.map((s) => (<SelectItem key={s} value={s}>{s}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
            <div className="grid gap-2">
              <Label>Description (optional, 3-255 if filled)</Label>
              <Textarea rows={2} value={datasetPolicyForm.description} onChange={(e) => setDatasetPolicyForm((p) => ({ ...p, description: e.target.value }))} maxLength={255} />
            </div>

            {/* Rules editor */}
            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Rules</p>
                  <p className="text-xs text-muted-foreground">Operator enum: {RULE_OPERATORS.join(", ")}</p>
                </div>
                <Button size="sm" variant="outline" className="gap-1" onClick={() => setDatasetPolicyForm((p) => ({ ...p, rules: [...p.rules, { left_operand: "", right_operand: "", operator: "EQUALS" }] }))}>
                  <Plus className="h-3.5 w-3.5" /> Add rule
                </Button>
              </div>
              {datasetPolicyForm.rules.length === 0 ? (
                <p className="text-xs text-muted-foreground">No rules — empty array akan tetep di-accept backend.</p>
              ) : (
                <div className="space-y-2">
                  {datasetPolicyForm.rules.map((r, idx) => (
                    <div key={idx} className="grid grid-cols-[1fr_auto_1fr_auto] items-center gap-2">
                      <Input placeholder="left_operand (e.g. country)" value={r.left_operand} onChange={(e) => setDatasetPolicyForm((p) => {
                        const copy = [...p.rules]; copy[idx] = { ...copy[idx], left_operand: e.target.value }; return { ...p, rules: copy };
                      })} />
                      <Select value={r.operator} onValueChange={(v) => setDatasetPolicyForm((p) => {
                        const copy = [...p.rules]; copy[idx] = { ...copy[idx], operator: v as RuleOperator }; return { ...p, rules: copy };
                      })}>
                        <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          {RULE_OPERATORS.map((op) => (<SelectItem key={op} value={op}>{op}</SelectItem>))}
                        </SelectContent>
                      </Select>
                      <Input placeholder="right_operand (e.g. ID)" value={r.right_operand} onChange={(e) => setDatasetPolicyForm((p) => {
                        const copy = [...p.rules]; copy[idx] = { ...copy[idx], right_operand: e.target.value }; return { ...p, rules: copy };
                      })} />
                      <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setDatasetPolicyForm((p) => ({ ...p, rules: p.rules.filter((_, i) => i !== idx) }))}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
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
      <Dialog open={contractDialog} onOpenChange={(o) => { setContractDialog(o); if (!o) setContractHydrating(false); }}>
        <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingContract ? "Edit Contract" : "Create Contract"}</DialogTitle>
            <DialogDescription>Bind a consumer to a provider, attach contract policies, and (optionally) bind datasets with their dataset policies.</DialogDescription>
          </DialogHeader>
          {contractHydrating && (
            <div className="flex items-center gap-2 rounded-lg border border-border/40 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
              <svg className="h-3.5 w-3.5 animate-spin" viewBox="0 0 24 24" fill="none"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/></svg>
              Loading contract detail…
            </div>
          )}
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name * (3-255 chars)</Label>
              <Input value={contractForm.name} onChange={(e) => setContractForm((p) => ({ ...p, name: e.target.value }))} />
            </div>
            {!editingContract && (
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="grid gap-2">
                  <Label>Consumer (organisasi Anda)</Label>
                  <div className="flex h-9 items-center rounded-md border border-border/50 bg-muted/30 px-3 text-sm">
                    {sessionParticipant
                      ? <><span className="font-medium">{sessionParticipant.organization_name}</span><span className="ml-2 font-mono text-[10px] text-muted-foreground">{sessionParticipant.id?.slice(0,8)}…</span></>
                      : <span className="text-amber-500 text-xs">Participant belum terdaftar untuk akun ini</span>
                    }
                  </div>
                  {!myConsumerId && <p className="text-xs text-red-500">consumer_id kosong — daftarkan participant untuk akun ini terlebih dahulu di Authority → Register Admin Login</p>}
                </div>
                <div className="grid gap-2">
                  <Label>Provider (KKKS) *</Label>
                  <Select value={contractForm.provider_id} onValueChange={(v) => setContractForm((p) => ({ ...p, provider_id: v }))}>
                    <SelectTrigger><SelectValue placeholder={providerParticipants.length ? "Pilih provider KKKS" : "Belum ada ENTERPRISE participant"} /></SelectTrigger>
                    <SelectContent>
                      {providerParticipants.map((p) => (<SelectItem key={p.id} value={p.id}>{p.organization_name}</SelectItem>))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
            <div className="grid gap-2">
              <Label>Description * (3-255 chars, required by backend)</Label>
              <Textarea rows={3} value={contractForm.description} onChange={(e) => setContractForm((p) => ({ ...p, description: e.target.value }))} />
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-sm font-medium">Contract Policies *</p>
                <span className="text-xs text-muted-foreground">{contractForm.contract_policies.length} selected</span>
              </div>
              {cPolicies.length === 0 ? (
                <p className="text-xs text-amber-500">No contract policies in this domain — create one in the Contract Policies tab first.</p>
              ) : (
                <div className="grid gap-2 sm:grid-cols-2 max-h-60 overflow-y-auto">
                  {cPolicies.map((cp: any) => {
                    const checked = contractForm.contract_policies.includes(cp.id);
                    return (
                      <label key={cp.id} className="flex items-start gap-2 rounded-lg border border-border/60 p-2">
                        <Checkbox checked={checked} onCheckedChange={(next) => setContractForm((prev) => ({
                          ...prev,
                          contract_policies: next
                            ? [...prev.contract_policies, cp.id]
                            : prev.contract_policies.filter((id) => id !== cp.id),
                        }))} />
                        <div className="text-xs">
                          <p className="font-medium">{cp.name}</p>
                          <p className="text-muted-foreground">{cp.data_clasification}</p>
                        </div>
                      </label>
                    );
                  })}
                </div>
              )}
            </div>

            <div className="rounded-xl border border-border/70 p-4">
              <div className="mb-3 flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium">Datasets <span className="text-muted-foreground text-xs font-normal">({contractForm.datasets.filter(d => d.dataset_id && d.dataset_policy_id).length} lengkap)</span></p>
                  <p className="text-xs text-muted-foreground">Setiap row harus pilih dataset DAN policy-nya — row kosong dibuang saat save</p>
                </div>
                <Button size="sm" variant="outline" onClick={() => setContractForm((p) => ({ ...p, datasets: [...p.datasets, { dataset_id: "", dataset_policy_id: "" }] }))} disabled={datasets.length === 0 || policies.length === 0}>
                  <Plus className="h-3.5 w-3.5" /> Add row
                </Button>
              </div>
              {datasets.length === 0 || policies.length === 0 ? (
                <p className="text-xs text-amber-500">Perlu minimal 1 dataset + 1 dataset policy di domain ini dulu (tab Dataset Policies).</p>
              ) : contractForm.datasets.length === 0 ? (
                <p className="text-xs text-muted-foreground">Belum ada dataset — klik Add row untuk tambahkan.</p>
              ) : (
                <div className="space-y-2">
                  {contractForm.datasets.map((row, idx) => {
                    const incomplete = (row.dataset_id && !row.dataset_policy_id) || (!row.dataset_id && row.dataset_policy_id);
                    const dsInfo = datasets.find((d: any) => d.id === row.dataset_id);
                    return (
                    <div key={idx} className={`flex flex-col gap-2 rounded-lg p-2 ${incomplete ? "border border-red-500/40 bg-red-500/5" : "border border-border/50 bg-muted/10"}`}>
                      <div className="grid grid-cols-[1fr_1fr_auto] items-center gap-2">
                        <Select value={row.dataset_id} onValueChange={(v) => setContractForm((p) => {
                          const copy = [...p.datasets]; copy[idx] = { ...copy[idx], dataset_id: v }; return { ...p, datasets: copy };
                        })}>
                          <SelectTrigger className={!row.dataset_id ? "border-amber-500/50" : ""}><SelectValue placeholder="Pilih dataset" /></SelectTrigger>
                          <SelectContent>
                            {datasets.map((ds: any) => (<SelectItem key={ds.id} value={ds.id}>{ds.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Select value={row.dataset_policy_id} onValueChange={(v) => setContractForm((p) => {
                          const copy = [...p.datasets]; copy[idx] = { ...copy[idx], dataset_policy_id: v }; return { ...p, datasets: copy };
                        })}>
                          <SelectTrigger className={!row.dataset_policy_id ? "border-amber-500/50" : ""}><SelectValue placeholder="Pilih policy" /></SelectTrigger>
                          <SelectContent>
                            {policies.map((pol: any) => (<SelectItem key={pol.id} value={pol.id}>{pol.name}</SelectItem>))}
                          </SelectContent>
                        </Select>
                        <Button size="sm" variant="ghost" className="text-destructive" onClick={() => setContractForm((p) => ({ ...p, datasets: p.datasets.filter((_, i) => i !== idx) }))}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      {dsInfo && (
                        <div className="rounded-md bg-card border border-border/40 p-2 mt-1 shadow-sm">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs font-semibold">{dsInfo.name}</span>
                            <Badge variant="secondary" className="text-[9px] px-1 py-0 h-4">{dsInfo.version || "v1.0"}</Badge>
                          </div>
                          {dsInfo.description && <p className="text-[10px] text-muted-foreground line-clamp-1 mb-1">{dsInfo.description}</p>}
                          <div className="grid grid-cols-2 gap-2 text-[10px] mt-1 border-t border-border/30 pt-1">
                            <div className="flex flex-col"><span className="text-muted-foreground uppercase font-medium">Endpoint</span><span className="font-mono text-blue-500 break-all">{dsInfo.endpoint?.url || "-"}</span></div>
                            <div className="flex flex-col"><span className="text-muted-foreground uppercase font-medium">Protocol</span><span>{dsInfo.endpoint?.protocol || dsInfo.endpoint?.access_type || "-"}</span></div>
                          </div>
                        </div>
                      )}
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <div className="rounded-lg border border-border/40 bg-muted/10 px-3 py-2 text-[10px] text-muted-foreground space-y-0.5">
            <p>
              <span className="font-semibold">Payload preview: </span>
              consumer=<code>{editingContract?.consumer_id?.slice(0,8) ?? contractForm.consumer_id?.slice(0,8) ?? <span className="text-red-500">KOSONG</span>}…</code>{" "}
              provider=<code>{editingContract?.provider_id?.slice(0,8) ?? contractForm.provider_id?.slice(0,8) ?? <span className="text-red-500">KOSONG</span>}…</code>{" "}
              datasets=<code>{contractForm.datasets.filter(d=>d.dataset_id&&d.dataset_policy_id).length}</code>{" "}
              policies=<code>{contractForm.contract_policies.length}</code>
            </p>
          </div>
          {contractForm.datasets.some(d => d.dataset_id && !d.dataset_policy_id) && !contractHydrating && (
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 px-3 py-2 text-xs text-amber-600 space-y-0.5">
              <p className="font-semibold">Dataset tanpa policy ({contractForm.datasets.filter(d => d.dataset_id && !d.dataset_policy_id).length} row)</p>
              <p>Backend tidak return dataset_policy_id — pilih policy untuk setiap dataset, atau biarkan (row akan di-skip saat save).</p>
            </div>
          )}
          {contractSaveError && (
            <div className="rounded-lg border border-red-500/40 bg-red-500/5 px-3 py-2 text-xs text-red-500 break-all whitespace-pre-wrap">
              <span className="font-semibold">Error: </span>{contractSaveError}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setContractDialog(false)}>Cancel</Button>
            <Button onClick={() => setConfirmAction({
              title: editingContract ? "Update Contract" : "Create Contract",
              description: "Are you sure you want to save this contract? Note that Contract status will be 'REQUESTED'.",
              onConfirm: handleSaveContract
            })} disabled={createContract.isPending || updateContract.isPending || contractHydrating}>
              {contractHydrating ? "Loading…" : createContract.isPending || updateContract.isPending ? "Menyimpan..." : editingContract ? "Save Changes" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* ── Contract Policy Dialog ──────────────────────────────────────── */}
      <Dialog open={cPolicyDialog} onOpenChange={setCPolicyDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingCPolicy ? "Edit Contract Policy" : "Create Contract Policy"}</DialogTitle>
            <DialogDescription>
              Backend: name 3-255 · data_clasification (note typo!) · effective_from/to date-time · description 3-255 (optional).
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Name * (3-255 chars)</Label>
              <Input value={cPolicyForm.name} onChange={(e) => setCPolicyForm((p) => ({ ...p, name: e.target.value }))} maxLength={255} />
            </div>
            <div className="grid gap-2">
              <Label>Data Classification *</Label>
              <Select value={cPolicyForm.data_clasification} onValueChange={(v) => setCPolicyForm((p) => ({ ...p, data_clasification: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {DATA_CLASSIFICATIONS.map((c) => (<SelectItem key={c} value={c}>{c}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Effective From *</Label>
                <Input type="date" value={cPolicyForm.effective_from} max={addDays(cPolicyForm.effective_to, -1) || undefined} onChange={(e) => setCPolicyForm((p) => ({ ...p, effective_from: e.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Effective To *</Label>
                <Input type="date" value={cPolicyForm.effective_to} min={addDays(cPolicyForm.effective_from, 1) || undefined} onChange={(e) => setCPolicyForm((p) => ({ ...p, effective_to: e.target.value }))} />
              </div>
            </div>
            <div className="grid gap-2">
              <Label>Description (3-255 chars if filled)</Label>
              <Textarea rows={3} value={cPolicyForm.description} onChange={(e) => setCPolicyForm((p) => ({ ...p, description: e.target.value }))} maxLength={255} />
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
      <Dialog open={agreementDialogOpen} onOpenChange={(open) => { setAgreementDialogOpen(open); if (!open) setEditingAgreement(null); }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingAgreement ? "Edit Agreement" : "Create Agreement"}</DialogTitle>
            <DialogDescription>
              Backend: <code className="text-xs">contract_id</code> + <code className="text-xs">effective_from</code> + <code className="text-xs">effective_to</code> required (date-time). Status enum: REQUESTED / APPROVED / REJECTED / ACTIVE.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-2">
              <Label>Contract *</Label>
              <Select value={agreementForm.contract_id} onValueChange={(value) => setAgreementForm((prev) => ({ ...prev, contract_id: value }))}>
                <SelectTrigger><SelectValue placeholder="Select contract" /></SelectTrigger>
                <SelectContent>
                  {contracts.map((contract: any) => (
                    <SelectItem key={contract.id} value={contract.id}>{contract.name} ({contract.status})</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label>Effective From *</Label>
                <Input type="date" value={agreementForm.effective_from} max={addDays(agreementForm.effective_to, -1) || undefined} onChange={(event) => setAgreementForm((prev) => ({ ...prev, effective_from: event.target.value }))} />
              </div>
              <div className="grid gap-2">
                <Label>Effective To *</Label>
                <Input type="date" value={agreementForm.effective_to} min={addDays(agreementForm.effective_from, 1) || undefined} onChange={(event) => setAgreementForm((prev) => ({ ...prev, effective_to: event.target.value }))} />
              </div>
            </div>
            {editingAgreement && (
              <div className="grid gap-2">
                <Label>Status</Label>
                <Select value={agreementForm.status} onValueChange={(v) => setAgreementForm((prev) => ({ ...prev, status: v as any }))}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="REQUESTED">REQUESTED</SelectItem>
                    <SelectItem value="APPROVED">APPROVED</SelectItem>
                    <SelectItem value="REJECTED">REJECTED</SelectItem>
                    <SelectItem value="ACTIVE">ACTIVE</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAgreementDialogOpen(false); setEditingAgreement(null); }}>Cancel</Button>
            <Button onClick={() => {
              const selectedContract = contracts.find((c: any) => c.id === agreementForm.contract_id);
              if (!selectedContract || selectedContract.status !== "ACTIVE") { toast.error("Contract harus berstatus ACTIVE untuk membuat Agreement."); return; }
              setConfirmAction({
                title: editingAgreement ? "Update Agreement" : "Create Agreement",
                description: "Are you sure you want to save this agreement? Make sure the effective dates are correct.",
                onConfirm: handleSaveAgreement
              });
            }} disabled={createAgreement.isPending || updateAgreement.isPending}>
              {createAgreement.isPending || updateAgreement.isPending ? "Saving..." : editingAgreement ? "Save Changes" : "Create Agreement"}
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

      {/* ── Detail (View) Dialog ────────────────────────────────────────── */}
      {viewTarget && (() => {
        const d = viewTarget.data;
        if (viewTarget.kind === "datasetPolicy") {
          return (
            <DetailDialog
              open
              onOpenChange={(o) => !o && setViewTarget(null)}
              title={d.name}
              subtitle={`Dataset Policy · v${d.version}`}
              status={d.status}
              statusColor={STATUS_COLORS[d.status]}
              fields={[
                { label: "ID", value: d.id, mono: true, span: 2 },
                { label: "Type", value: d.type },
                { label: "Version", value: d.version },
                { label: "Description", value: d.description || "—", span: 2 },
                { label: "Rules", span: 2, value: (d.rules || []).length === 0 ? <span className="text-muted-foreground italic">No rules</span> : (
                  <table className="w-full text-xs border border-border/50 rounded">
                    <thead className="bg-muted/30"><tr><th className="px-2 py-1 text-left">Left</th><th className="px-2 py-1 text-left">Operator</th><th className="px-2 py-1 text-left">Right</th></tr></thead>
                    <tbody>{d.rules.map((r: any, i: number) => (<tr key={i} className="border-t border-border/40"><td className="px-2 py-1 font-mono">{r.left_operand}</td><td className="px-2 py-1">{r.operator}</td><td className="px-2 py-1 font-mono">{r.right_operand}</td></tr>))}</tbody>
                  </table>
                ) },
                { label: "Created", value: renderValue(d.created_at) },
                { label: "Updated", value: renderValue(d.updated_at) },
              ]}
              raw={d}
              footer={<Button variant="outline" onClick={() => { setViewTarget(null); openDatasetPolicy(d); }}>Edit</Button>}
            />
          );
        }
        if (viewTarget.kind === "contract") {
          const consumer = participants.find((p) => p.id === d.consumer_id);
          const provider = participants.find((p) => p.id === d.provider_id);
          return (
            <DetailDialog
              open
              onOpenChange={(o) => !o && setViewTarget(null)}
              title={d.name}
              subtitle="Contract"
              status={d.status}
              statusColor={STATUS_COLORS[d.status]}
              fields={[
                { label: "ID", value: d.id, mono: true, span: 2 },
                { label: "Consumer", value: consumer?.organization_name || d.consumer_id },
                { label: "Provider", value: provider?.organization_name || d.provider_id },
                { label: "Description", value: d.description || "—", span: 2 },
                { label: "Contract Policies", span: 2, value: (d.contract_policies || []).length === 0 ? <span className="text-muted-foreground italic">none</span> : (
                  <div className="flex flex-wrap gap-1">{(d.contract_policies || []).map((cp: any, i: number) => {
                    const id = cp.contract_policy_id || cp.id || cp;
                    const pol = cPolicies.find((p) => p.id === id);
                    return <Badge key={i} variant="outline" className="text-[10px]">{pol?.name || String(id).slice(0, 8) + "..."}</Badge>;
                  })}</div>
                ) },
                { label: "Datasets bound", span: 2, value: (d.datasets || []).length === 0 ? <span className="text-muted-foreground italic">none</span> : (
                  <table className="w-full text-xs border border-border/50 rounded">
                    <thead className="bg-muted/30"><tr><th className="px-2 py-1 text-left">Dataset</th><th className="px-2 py-1 text-left">Dataset Policy</th><th className="px-2 py-1 text-left">Endpoint URL</th></tr></thead>
                    <tbody>{(d.datasets || []).map((ds: any, i: number) => {
                      const dataset = datasets.find((x: any) => x.id === ds.dataset_id);
                      const pol = policies.find((x: any) => x.id === ds.dataset_policy_id);
                      return (
                        <tr key={i} className="border-t border-border/40">
                          <td className="px-2 py-1">{dataset?.name ?? (ds.dataset_id ? ds.dataset_id.slice(0, 8) + "…" : "—")}</td>
                          <td className="px-2 py-1">{pol?.name ?? (ds.dataset_policy_id ? ds.dataset_policy_id.slice(0, 8) + "…" : <span className="text-amber-500 italic">no policy</span>)}</td>
                          <td className="px-2 py-1 font-mono text-[10px] text-blue-500 break-all">{dataset?.endpoint?.url || "—"}</td>
                        </tr>
                      );
                    })}</tbody>
                  </table>
                ) },
                { label: "Created", value: renderValue(d.created_at) },
                { label: "Updated", value: renderValue(d.updated_at) },
              ]}
              raw={d}
              footer={
                <>
                  <Button variant="outline" className="gap-1" onClick={() => openPrint(buildContractHtml(d, participants, cPolicies, datasets, policies))}>
                    <Printer className="h-3.5 w-3.5" />Export / Print
                  </Button>
                  <Button variant="outline" onClick={() => { setViewTarget(null); openContract(d); }}>Edit</Button>
                </>
              }
            />
          );
        }
        if (viewTarget.kind === "contractPolicy") {
          // derive which contracts use this policy
          const usedIn = contracts.filter((c: any) => (c.contract_policies || []).some((cp: any) => (cp.contract_policy_id || cp.id || cp) === d.id));
          return (
            <DetailDialog
              open
              onOpenChange={(o) => !o && setViewTarget(null)}
              title={d.name}
              subtitle="Contract Policy"
              fields={[
                { label: "ID", value: d.id, mono: true, span: 2 },
                { label: "Data Classification", value: d.data_clasification },
                { label: "Description", value: d.description || "—" },
                { label: "Effective From", value: renderValue(d.effective_from) },
                { label: "Effective To", value: renderValue(d.effective_to) },
                { label: "Used in Contracts", span: 2, value: usedIn.length === 0 ? <span className="text-muted-foreground italic">not bound to any contract yet</span> : (
                  <div className="flex flex-wrap gap-1">{usedIn.map((c: any) => <Badge key={c.id} variant="outline" className="text-[10px]">{c.name} ({c.status})</Badge>)}</div>
                ) },
                { label: "Created", value: renderValue(d.created_at) },
                { label: "Updated", value: renderValue(d.updated_at) },
              ]}
              raw={d}
              footer={<Button variant="outline" onClick={() => { setViewTarget(null); openCPolicy(d); }}>Edit</Button>}
            />
          );
        }
        // agreement
        const ctr = contracts.find((c: any) => c.id === d.contract_id);
        return (
          <DetailDialog
            open
            onOpenChange={(o) => !o && setViewTarget(null)}
            title={ctr?.name ? `Agreement · ${ctr.name}` : "Agreement"}
            subtitle="Agreement"
            status={d.status}
            statusColor={STATUS_COLORS[d.status]}
            fields={[
              { label: "ID", value: d.id, mono: true, span: 2 },
              { label: "Contract", value: ctr?.name || d.contract_id, mono: !ctr },
              { label: "Status", value: <Badge variant="outline" className={`text-xs ${STATUS_COLORS[d.status] || ""}`}>{d.status}</Badge> },
              { label: "Effective From", value: renderValue(d.effective_from) },
              { label: "Effective To", value: renderValue(d.effective_to) },
              { label: "Created", value: renderValue(d.created_at) },
              { label: "Updated", value: renderValue(d.updated_at) },
              { label: "Covered Datasets", span: 2, value: (!ctr || !ctr.datasets || ctr.datasets.length === 0) ? <span className="text-muted-foreground italic">No datasets bound</span> : (
                <div className="flex flex-col gap-2 mt-1">
                  {ctr.datasets.map((ds: any, i: number) => {
                    const datasetInfo = datasets.find((x: any) => x.id === ds.dataset_id);
                    const policyInfo = policies.find((x: any) => x.id === ds.dataset_policy_id);
                    return (
                      <div key={i} className="rounded-md border border-border/50 bg-muted/20 p-2 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-foreground">{datasetInfo?.name || ds.dataset_id}</span>
                          <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0">{datasetInfo?.version || "v1.0"}</Badge>
                        </div>
                        {datasetInfo?.description && <p className="text-muted-foreground">{datasetInfo.description}</p>}
                        <div className="grid grid-cols-2 gap-x-2 gap-y-2 mt-1 border-t border-border/40 pt-1.5">
                          <div className="flex flex-col col-span-2">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Endpoint URL</span>
                            <span className="font-mono text-blue-500 break-all">{datasetInfo?.endpoint?.url || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Protocol</span>
                            <span>{datasetInfo?.endpoint?.protocol || datasetInfo?.endpoint?.access_type || "-"}</span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[10px] text-muted-foreground font-medium uppercase tracking-wider">Applied Policy</span>
                            <span>{policyInfo?.name || ds.dataset_policy_id}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) },
            ]}
            raw={d}
            footer={
              <>
                <Button variant="outline" className="gap-1" onClick={() => openPrint(buildAgreementHtml(d, contracts, participants, cPolicies, datasets, policies))}>
                  <Printer className="h-3.5 w-3.5" />Export / Print
                </Button>
                <Button variant="outline" onClick={() => { setViewTarget(null); openAgreement(d); }}>Edit</Button>
              </>
            }
          />
        );
      })()}
    </V2PageShell>
  );
};

export default PolicyContract;
