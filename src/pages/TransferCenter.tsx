import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Send, PackageCheck, Loader2, CheckCircle2, AlertCircle, Database, UploadCloud, History, Download, Map, RefreshCw, ShieldAlert, UserCog,
} from "lucide-react";
import { toast } from "sonner";
import { useDatasets } from "@/api/hooks/useDatasets";
import { TransferMapPreview } from "@/components/transfer/TransferMapPreview";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useTransfers } from "@/api/hooks/useTransfers";
import { useConnectionPools } from "@/api/hooks/useConnectionPools";
import { useProviders } from "@/api/hooks/useProviders";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { contractsApi, agreementsApi, type ContractDetail, type ContractItem } from "@/api/services/policy-contract";
import { transfersApi, type TransferMode } from "@/api/services/connector";
import { policiesApi } from "@/api/services/governance";
import { DOMAINS, datasetDomain, contractDomain, type DomainKey } from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";
import type { ConnectionPoolItem, Policy } from "@/api/types/governance";
import type { Provider } from "@/api/types/providers";
import { findParticipantPool, isPoolReady, resolvePoolMeta } from "@/lib/connection-pool";
import { getApiErrorMessage } from "@/lib/api-error";
import { resolveDatasetPolicyForDataset } from "@/lib/policy-mapping";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRANSFER_MODE_STORAGE_KEY = "transfer_mode_map";
const TRANSFER_BODY_STORAGE_KEY = "transfer_body_map";

type TransferStartBody = { domain_id: string; agreement_id: string; dataset_id: string };

const readTransferBodyMap = (): Record<string, TransferStartBody> => {
  try { return JSON.parse(localStorage.getItem(TRANSFER_BODY_STORAGE_KEY) ?? "{}"); } catch { return {}; }
};
const writeTransferBodyMap = (v: Record<string, TransferStartBody>) => {
  localStorage.setItem(TRANSFER_BODY_STORAGE_KEY, JSON.stringify(v));
};
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRANSFERRING: "bg-blue-50 text-blue-700 border-blue-200",
  INITIATED: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  PAUSED: "bg-slate-50 text-slate-700 border-slate-200",
};

const DATASET_STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRANSFERRING: "bg-blue-50 text-blue-700 border-blue-200",
  INITIATED: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  READY: "bg-slate-50 text-slate-700 border-slate-200",
};

const readTransferModeMap = (): Record<string, TransferMode> => {
  try {
    const raw = localStorage.getItem(TRANSFER_MODE_STORAGE_KEY);
    if (!raw) return {};
    return JSON.parse(raw) as Record<string, TransferMode>;
  } catch {
    return {};
  }
};

const writeTransferModeMap = (value: Record<string, TransferMode>) => {
  localStorage.setItem(TRANSFER_MODE_STORAGE_KEY, JSON.stringify(value));
};

interface TransferPreviewState {
  id: string;
  datasetName: string;
  endpointUrl?: string;
  adapterInfo?: { url: string; type: string } | null;
}

const TransferCenter = () => {
  const { domainId } = useDomain();
  const { participantId, role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN";
  const [overrideParticipantId, setOverrideParticipantId] = useState<string | null>(null);
  const [selectedDatasetByDomain, setSelectedDatasetByDomain] = useState<Record<string, string>>({});
  const [contractDetailsById, setContractDetailsById] = useState<Record<string, ContractDetail>>({});
  const effectiveParticipantId = isSuperAdmin ? overrideParticipantId : participantId;
  const adminContextReady = !isSuperAdmin || !!effectiveParticipantId;
  const datasetsQ = useDatasets();
  const contractsQ = useContracts();
  const agreementsQ = useAgreements();
  const transfersQ = useTransfers();
  const poolsQ = useConnectionPools();
  const providersQ = useProviders();
  const { data: dsData } = datasetsQ;
  const { data: cData } = contractsQ;
  const { data: agData } = agreementsQ;
  const { data: trData } = transfersQ;
  const { data: poolsData } = poolsQ;
  const { data: providersData } = providersQ;
  const polQ = useQuery({
    queryKey: ["dataset-policies", domainId],
    queryFn: () => policiesApi.list(domainId!),
    enabled: !!domainId,
  });

  const providers = useMemo(
    () => ((providersData ?? []) as Provider[]),
    [providersData],
  );
  const providerOptions = useMemo(
    () =>
      providers
        .filter((provider) => provider.organization_type === "ENTERPRISE")
        .sort((left, right) => (left.provider_name ?? "").localeCompare(right.provider_name ?? "")),
    [providers],
  );
  const selectedProvider = useMemo(
    () => providerOptions.find((provider) => provider.provider_id === effectiveParticipantId) ?? null,
    [providerOptions, effectiveParticipantId],
  );

  const datasets = useMemo(
    () =>
      adminContextReady
        ? ((dsData ?? []) as Dataset[]).filter(
            (dataset) =>
              (!effectiveParticipantId || dataset.provider_id === effectiveParticipantId) &&
              String(dataset.status).toLowerCase() === "published",
          )
        : [],
    [adminContextReady, dsData, effectiveParticipantId],
  );
  const contracts = useMemo(
    () =>
      adminContextReady
        ? ((cData ?? []) as ContractItem[]).filter(
            (contract) => !effectiveParticipantId || contract.provider_id === effectiveParticipantId,
          )
        : [],
    [adminContextReady, cData, effectiveParticipantId],
  );
  const agreements = agData ?? [];
  const transfers = useMemo(
    () =>
      adminContextReady
        ? (trData ?? []).filter(
            (transfer) =>
              !effectiveParticipantId ||
              datasets.some((dataset) => dataset.dataset_id === transfer.dataset_id),
          )
        : [],
    [adminContextReady, trData, effectiveParticipantId, datasets],
  );
  const pools = (poolsData ?? []) as ConnectionPoolItem[];
  const datasetPolicies = useMemo(
    () => ((polQ.data ?? []) as Policy[]),
    [polQ.data],
  );
  const dsName = (id: string) => datasets.find((d) => d.dataset_id === id)?.dataset_name ?? `${id.slice(0, 8)}…`;

  // Pool untuk participant aktif — satu pool berlaku untuk semua domain transfer
  const myPool = useMemo(() => findParticipantPool(pools, effectiveParticipantId), [pools, effectiveParticipantId]);
  const poolReady = isPoolReady(myPool);
  const poolMeta = myPool ? resolvePoolMeta(myPool) : null;

  useEffect(() => {
    let cancelled = false;
    if (!domainId || contracts.length === 0) {
      setContractDetailsById({});
      return;
    }

    const activeContracts = contracts.filter((contract) => contract.status === "ACTIVE");
    if (activeContracts.length === 0) {
      setContractDetailsById({});
      return;
    }

    void Promise.allSettled(
      activeContracts.map(async (contract) => {
        const detail = await contractsApi.get(domainId, contract.id);
        return [contract.id, detail] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      const next: Record<string, ContractDetail> = {};
      results.forEach((result) => {
        if (result.status === "fulfilled") {
          const [contractId, detail] = result.value;
          next[contractId] = detail;
        }
      });
      setContractDetailsById(next);
    });

    return () => {
      cancelled = true;
    };
  }, [contracts, domainId]);

  // Kewajiban per domain: satu kontrak bisa punya banyak dataset, transfer tetap dipilih satu per proses.
  const rows = useMemo(
    () =>
      DOMAINS.map((dom) => {
        const contract = contracts.find((c) => contractDomain(c) === (dom.key as DomainKey) && c.status === "ACTIVE");
        const detail = contract ? contractDetailsById[contract.id] : undefined;
        const linkedDatasetIds = (detail?.datasets ?? []).map((dataset) => dataset.dataset_id);
        const linkedDatasets = linkedDatasetIds
          .map((datasetId) => datasets.find((dataset) => dataset.dataset_id === datasetId))
          .filter(Boolean) as Dataset[];
        const fallbackDatasets = datasets.filter((dataset) => datasetDomain(dataset) === (dom.key as DomainKey));
        const availableDatasets = linkedDatasets.length > 0 ? linkedDatasets : fallbackDatasets;
        const completedDatasetIds = availableDatasets
          .filter((dataset) =>
            transfers.some(
              (transfer) =>
                transfer.dataset_id === dataset.dataset_id &&
                String(transfer.status).toUpperCase() === "COMPLETED",
            ),
          )
          .map((dataset) => dataset.dataset_id);
        const pendingDatasets = availableDatasets.filter(
          (dataset) => !completedDatasetIds.includes(dataset.dataset_id),
        );
        const selectedDatasetId =
          selectedDatasetByDomain[dom.key] ??
          pendingDatasets[0]?.dataset_id ??
          availableDatasets[0]?.dataset_id ??
          null;
        const selectedDataset =
          availableDatasets.find((dataset) => dataset.dataset_id === selectedDatasetId) ?? null;
        const policyResolution = resolveDatasetPolicyForDataset(datasetPolicies, selectedDataset);
        const datasetStatuses = availableDatasets.map((dataset) => {
          const history = transfers
            .filter((transfer) => transfer.dataset_id === dataset.dataset_id)
            .sort((left, right) => {
              const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
              const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
              return rightTime - leftTime;
            });
          const latest = history[0];
          const status = latest ? String(latest.status).toUpperCase() : "READY";

          return {
            dataset,
            latest,
            status,
            sent: status === "COMPLETED",
            isSelected: dataset.dataset_id === selectedDatasetId,
          };
        });

        return {
          dom,
          contract,
          availableDatasets,
          pendingDatasets,
          completedDatasetIds,
          datasetStatuses,
          policyResolution,
          selectedDataset,
          allSent: availableDatasets.length > 0 && pendingDatasets.length === 0,
          ready:
            !!contract &&
            !!selectedDataset &&
            poolReady &&
            policyResolution.status === "matched",
        };
      }),
    [contractDetailsById, contracts, datasetPolicies, datasets, poolReady, selectedDatasetByDomain, transfers],
  );

  const readyCount = rows.filter((row) => row.ready && !row.allSent).length;
  const sentCount = rows.filter((row) => row.allSent).length;

  const [busy, setBusy] = useState<Record<string, string>>({});
  const [transferModes, setTransferModes] = useState<Record<string, TransferMode>>({});
  const [transferModeMap, setTransferModeMap] = useState<Record<string, TransferMode>>(() =>
    readTransferModeMap(),
  );
  const [transferBodyMap, setTransferBodyMap] = useState<Record<string, TransferStartBody>>(() =>
    readTransferBodyMap(),
  );
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [previewTransfer, setPreviewTransfer] = useState<TransferPreviewState | null>(null);

  // Adapter lookup: dataset endpoint → match ke adapter url participant
  const adapterForDataset = (ds?: typeof datasets[number]) => {
    if (!ds?.endpoint_url) return null;
    // Kalau endpoint dataset mengandung keyword adapter atau cocok dengan salah satu adapter participant,
    // kita mark sebagai via-adapter. Saat ini FE tidak punya data adapter di sini — info ini ada di
    // ParticipantDetail. Placeholder: cek via keyword "adapter" di URL.
    const url = ds.endpoint_url ?? "";
    if (url.includes("adapter") || url.includes("gis-adapter") || url.includes("ds-adapter")) {
      return { url, type: "GIS_STUDIO" };
    }
    return null;
  };

  useEffect(() => {
    setTransferModes(
      Object.fromEntries(DOMAINS.map((dom) => [dom.key, "direct" as TransferMode])),
    );
  }, []);

  useEffect(() => {
    if (!autoRefresh) return;
    const timer = window.setInterval(() => {
      void Promise.allSettled([
        transfersQ.refetch(),
        contractsQ.refetch(),
        agreementsQ.refetch(),
        poolsQ.refetch(),
      ]);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, transfersQ, contractsQ, agreementsQ, poolsQ]);

  const updateTransferMode = (key: string, mode: TransferMode) => {
    setTransferModes((prev) => ({ ...prev, [key]: mode }));
  };

  const persistTransferMode = (transferProcessId: string, mode: TransferMode) => {
    setTransferModeMap((prev) => {
      const next = { ...prev, [transferProcessId]: mode };
      writeTransferModeMap(next);
      return next;
    });
  };

  const persistTransferBody = (transferProcessId: string, body: TransferStartBody) => {
    setTransferBodyMap((prev) => {
      const next = { ...prev, [transferProcessId]: body };
      writeTransferBodyMap(next);
      return next;
    });
  };

  const downloadPersistentResult = async (transferId: string) => {
    try {
      const { blob, filename } = await transfersApi.downloadPersistent(transferId);
      const url = window.URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File persistent berhasil diunduh.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal mengunduh hasil transfer persistent"));
    }
  };

  const refreshOperationalState = async () => {
    await Promise.allSettled([
      transfersQ.refetch(),
      contractsQ.refetch(),
      agreementsQ.refetch(),
      poolsQ.refetch(),
      polQ.refetch(),
    ]);
  };

  const refreshSingleTransferStatus = async (transferId: string) => {
    try {
      await transfersApi.status(transferId);
      await refreshOperationalState();
      toast.success("Status transfer diperbarui.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal cek ulang status transfer"));
    }
  };

  const resumeTransfer = async (transferId: string) => {
    const mode = transferModeMap[transferId];
    const body = transferBodyMap[transferId];
    if (!mode || !body) {
      toast.warning("Data transfer lama tidak lengkap. Jalankan ulang dari tabel kewajiban.");
      return;
    }

    try {
      if (mode === "persistent") {
        await transfersApi.startPersistent(transferId, body);
      } else {
        await transfersApi.startDirect(transferId, body);
      }
      await sleep(1000);
      await refreshOperationalState();
      toast.success(
        mode === "persistent"
          ? "Transfer persistent dicoba jalankan lagi."
          : "Direct stream dicoba jalankan lagi.",
      );
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal menjalankan ulang transfer"));
    }
  };

  const send = async (row: (typeof rows)[number]) => {
    if (!domainId || !row.selectedDataset || !row.contract) return;
    if (row.policyResolution.status !== "matched" || !row.policyResolution.policy?.policy_id) {
      return toast.error(row.policyResolution.reason, { duration: 8000 });
    }
    if (!poolReady) {
      const missing = !myPool
        ? "Connection pool belum dikonfigurasi untuk participant ini."
        : !poolMeta?.endpoint
          ? "Connection pool tidak memiliki Connector Endpoint."
          : "Connection pool tidak memiliki Well-known JWT URL.";
      return toast.error(`Transfer tidak bisa dimulai: ${missing}`, { duration: 8000 });
    }

    // Cek apakah ada transfer aktif untuk dataset ini
    const activeTransfer = (transfers as typeof transfers).find(
      (t) =>
        t.dataset_id === row.selectedDataset.dataset_id &&
        !["COMPLETED", "FAILED"].includes(String(t.status).toUpperCase()),
    );
    if (activeTransfer) {
      toast.warning(
        `Transfer sedang berjalan untuk dataset ini (status: ${activeTransfer.status}). Tunggu sampai selesai atau gagal dulu.`,
        { duration: 6000 },
      );
      return;
    }
    const key = row.dom.key;
    const mode = transferModes[key] ?? "direct";
    const step = (s: string) => setBusy((b) => ({ ...b, [key]: s }));
    try {
      console.debug("[Transfer] start", {
        domainId,
        contractId: row.contract.id,
        datasetId: row.selectedDataset.dataset_id,
        policyId: row.policyResolution.policy.policy_id,
      });

      step("menautkan dataset");
      try {
        await contractsApi.linkDataset(domainId, {
          id: row.contract.id, consumer_id: row.contract.consumer_id, provider_id: row.contract.provider_id,
          name: row.contract.name, status: row.contract.status,
        }, row.selectedDataset.dataset_id, row.policyResolution.policy.policy_id);
        console.debug("[Transfer] linkDataset OK");
      } catch (e: unknown) {
        console.warn("[Transfer] linkDataset FAILED (non-blocking):", e);
      }

      step("menyiapkan perjanjian");
      let ag = agreements.find((a) => a.contract_id === row.contract!.id);
      console.debug("[Transfer] existing agreement:", ag);
      if (!ag) {
        const created = await agreementsApi.create(domainId, {
          contract_id: row.contract.id,
          effective_from: new Date().toISOString(),
          effective_to: new Date(Date.now() + 5 * 365 * 86400000).toISOString(),
        });
        ag = created;
        console.debug("[Transfer] agreement created:", ag);
      }
      if (ag.status !== "ACTIVE") {
        await agreementsApi.updateStatus(domainId, { id: ag.id, contract_id: row.contract.id }, "ACTIVE");
        console.debug("[Transfer] agreement activated");
      }

      step("memulai transfer");
      console.debug("[Transfer] initiate payload:", { domain_id: domainId, agreement_id: ag.id, dataset_id: row.selectedDataset.dataset_id });
      const { transfer_process_id } = await transfersApi.initiate({
        domain_id: domainId,
        agreement_id: ag.id,
        dataset_id: row.selectedDataset.dataset_id,
      });
      console.debug("[Transfer] initiated, process_id:", transfer_process_id);
      persistTransferMode(transfer_process_id, mode);
      const startBody = { domain_id: domainId, agreement_id: ag.id, dataset_id: row.selectedDataset.dataset_id };
      persistTransferBody(transfer_process_id, startBody);
      if (mode === "persistent") {
        await transfersApi.startPersistent(transfer_process_id, startBody);
      } else {
        await transfersApi.startDirect(transfer_process_id, startBody);
      }

      step("memindahkan data");
      let final = "INITIATED";
      for (let i = 0; i < 15; i++) {
        const st = await transfersApi.status(transfer_process_id);
        final = String(st.status).toUpperCase();
        if (final === "COMPLETED" || final === "FAILED") break;
        await sleep(2000);
      }
      if (final === "COMPLETED") {
        toast.success(
          mode === "persistent"
            ? `Data ${row.selectedDataset.dataset_name} tersimpan via persistent transfer.`
            : `Data ${row.selectedDataset.dataset_name} terkirim via direct stream.`,
        );
      }
      else toast.error(`Transfer ${row.selectedDataset.dataset_name}: ${final}`);
      await refreshOperationalState();
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "error");
      console.error("[Transfer] FAILED at step:", busy[key], e);
      const isActiveTransferError = msg.toLowerCase().includes("active transfer");
      if (isActiveTransferError) {
        toast.warning("Transfer aktif sudah ada untuk dataset ini — tunggu sampai selesai atau gagal.", { duration: 6000 });
      } else {
        toast.error(`Gagal (${busy[key] ?? "?"}): ${msg}`, { duration: 8000 });
      }
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[key]; return n; });
    }
  };

  return (
    <div className="min-h-screen">
      <Header title="Transfer Data" subtitle="Eksekusi data plane untuk kontrak yang sudah siap di control plane" />
      <div className="p-6 space-y-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-r from-slate-50 via-white to-sky-50 p-5 shadow-sm">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_auto]">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-sky-700">Kesiapan Transfer</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Pengiriman baru jalan kalau data sumber, kontrak aktif, persetujuan, dan jalur koneksinya sudah lengkap.</p>
              <p className="mt-2 text-sm text-slate-600">
                Kalau salah satu bagian itu belum lengkap, tombol kirim tetap ditahan supaya operator tahu yang masih perlu dilengkapi dulu.
              </p>
            </div>
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-emerald-700">Mode Pengiriman</p>
              <p className="mt-2 text-sm font-semibold text-slate-900">Setelah siap, operator tinggal memilih cara kirim yang paling cocok untuk kebutuhan datanya.</p>
              <p className="mt-2 text-sm text-slate-600">
                <span className="font-medium text-slate-900">Direct Stream</span> dipakai saat data mau langsung diteruskan, sedangkan <span className="font-medium text-slate-900">Persistent Transfer</span> dipakai saat hasilnya perlu disimpan dan diunduh lagi.
              </p>
            </div>
            <div className="flex flex-col gap-2 lg:min-w-[220px]">
              <Button variant="outline" onClick={() => void refreshOperationalState()}>
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh Semua Status
              </Button>
              <Button
                variant={autoRefresh ? "default" : "outline"}
                className={autoRefresh ? "bg-accent hover:bg-accent/90 text-accent-foreground" : ""}
                onClick={() => setAutoRefresh((value) => !value)}
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                {autoRefresh ? "Auto Refresh Aktif" : "Aktifkan Auto Refresh"}
              </Button>
              <p className="text-xs text-muted-foreground">
                Auto refresh membantu operator melihat status transfer yang masih berjalan tanpa reload manual.
              </p>
            </div>
          </div>
        </div>
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-amber-100 text-amber-700"><UploadCloud className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{readyCount}</p><p className="text-sm text-muted-foreground">Siap Dikirim</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-emerald-100 text-emerald-700"><PackageCheck className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{sentCount}/5</p><p className="text-sm text-muted-foreground">Terkirim</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-info/10 text-info"><History className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{transfers.length}</p><p className="text-sm text-muted-foreground">Total Transfer</p></div></div></div>
        </div>

        {/* SUPER_ADMIN: pool context picker */}
        {isSuperAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <UserCog className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Mode Admin — Pilih Participant</p>
              <p className="text-xs text-amber-700 mt-0.5">
                Sebagai SUPER_ADMIN, kamu tidak punya participant_id. Pilih participant provider untuk mengaktifkan Transfer Center.
              </p>
            </div>
            <div className="sm:w-64">
              <Label className="text-xs text-amber-800 mb-1 block">Participant (Provider)</Label>
              <Select
                value={overrideParticipantId ?? ""}
                onValueChange={(value) => setOverrideParticipantId(value)}
              >
                <SelectTrigger className="bg-white border-amber-300 text-sm h-9">
                  <SelectValue placeholder="Pilih provider..." />
                </SelectTrigger>
                <SelectContent>
                  {providerOptions.map((provider) => (
                    <SelectItem key={provider.provider_id} value={provider.provider_id}>
                      {provider.provider_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        )}

        {isSuperAdmin && !adminContextReady && (
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
            Pilih provider dulu. Selama provider belum dipilih, daftar kewajiban dan riwayat transfer sengaja dikosongkan
            supaya konteks domain tidak nyampur.
          </div>
        )}

        {isSuperAdmin && adminContextReady && (
          <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sm text-sky-900">
            Konteks aktif: <strong>{selectedProvider?.provider_name ?? "Provider terpilih"}</strong>
            {domainId ? <> · domain aktif <strong>{domainId}</strong></> : <> · domain aktif belum terbaca</>}
          </div>
        )}

        {/* Kewajiban siap kirim */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2"><Send className="w-4 h-4 text-accent" /><h3 className="font-semibold text-sm">Kewajiban Pengiriman Data — 5 Domain</h3></div>
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Domain</TableHead>
                <TableHead>Dataset</TableHead>
                <TableHead>Mode</TableHead>
                <TableHead>Kesiapan</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((r) => {
                const b = busy[r.dom.key];
                return (
                  <TableRow key={r.dom.key} className="hover:bg-muted/50">
                    <TableCell>
                      <p className="font-medium text-sm">{r.dom.label}</p>
                      <p className="text-xs text-muted-foreground">{r.dom.sub}</p>
                    </TableCell>
                    <TableCell className="text-sm">
                      {r.availableDatasets.length === 0 ? (
                        <span className="text-slate-400 text-xs">Belum ada dataset pada domain ini</span>
                      ) : (
                        <div className="space-y-2.5">
                          {r.availableDatasets.length > 1 ? (
                            <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                  Dataset terikat
                                </span>
                                <span className="text-[11px] text-slate-500">
                                  {r.availableDatasets.length} item
                                </span>
                              </div>
                              <select
                                value={r.selectedDataset?.dataset_id ?? ""}
                                onChange={(e) =>
                                  setSelectedDatasetByDomain((current) => ({
                                    ...current,
                                    [r.dom.key]: e.target.value,
                                  }))
                                }
                                disabled={!!b}
                                className="flex h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                              >
                                {r.availableDatasets.map((dataset) => (
                                  <option key={dataset.dataset_id} value={dataset.dataset_id}>
                                    {dataset.dataset_name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <span className="inline-flex items-center gap-1">
                              <Database className="w-3.5 h-3.5 text-muted-foreground" />
                              {r.selectedDataset?.dataset_name}
                            </span>
                          )}
                          <div className="space-y-1.5 rounded-xl border border-slate-200 bg-white p-2.5">
                            <div className="flex items-center justify-between gap-2">
                              <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                                Status per dataset
                              </span>
                              <span className="text-[11px] text-slate-500">
                                {r.completedDatasetIds.length}/{r.availableDatasets.length} selesai
                              </span>
                            </div>
                            <div className="max-h-36 space-y-1.5 overflow-y-auto pr-1">
                              {r.datasetStatuses.map((item) => (
                                <button
                                  key={item.dataset.dataset_id}
                                  type="button"
                                  onClick={() =>
                                    setSelectedDatasetByDomain((current) => ({
                                      ...current,
                                      [r.dom.key]: item.dataset.dataset_id,
                                    }))
                                  }
                                  className={`flex w-full items-center justify-between gap-2 rounded-lg border px-2.5 py-2 text-left transition ${
                                    item.isSelected
                                      ? "border-accent bg-accent/5 shadow-sm"
                                      : "border-slate-200 bg-slate-50/60 hover:bg-slate-100"
                                  }`}
                                >
                                  <div className="min-w-0">
                                    <p className="truncate text-xs font-medium text-slate-900">
                                      {item.dataset.dataset_name}
                                    </p>
                                    <p className="text-[11px] text-slate-500">
                                      {item.latest?.record_count != null
                                        ? `${item.latest.record_count} record`
                                        : item.sent
                                          ? "Transfer selesai"
                                          : item.status === "FAILED"
                                            ? "Perlu kirim ulang"
                                            : item.status === "READY"
                                              ? "Siap dikirim"
                                              : "Masih diproses"}
                                    </p>
                                  </div>
                                  <Badge
                                    variant="outline"
                                    className={DATASET_STATUS_STYLE[item.status] ?? DATASET_STATUS_STYLE.READY}
                                  >
                                    {item.status === "READY" ? "SIAP" : item.status}
                                  </Badge>
                                </button>
                              ))}
                            </div>
                          </div>
                          {r.selectedDataset && (
                            <div
                              className={`rounded-xl border px-3 py-2 text-xs ${
                                r.policyResolution.status === "matched"
                                  ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                                  : "border-rose-200 bg-rose-50 text-rose-700"
                              }`}
                            >
                              {r.policyResolution.status === "matched" ? (
                                <div className="space-y-1">
                                  <p className="font-medium">
                                    Policy aktif: {r.policyResolution.policy?.policy_name ?? "Policy cocok"}
                                  </p>
                                  <p className="text-[11px] opacity-80">
                                    Dataset ini akan ditautkan ke policy yang cocok sebelum transfer dimulai.
                                  </p>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <p className="font-medium">Policy dataset belum siap</p>
                                  <p className="text-[11px]">{r.policyResolution.reason}</p>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <select
                        value={transferModes[r.dom.key] ?? "direct"}
                        onChange={(e) => updateTransferMode(r.dom.key, e.target.value as TransferMode)}
                        disabled={!!b || r.allSent || !r.ready}
                        className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="direct">Direct Stream</option>
                        <option value="persistent">Persistent Transfer</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {r.allSent ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Semua dataset terkirim</Badge>
                      ) : r.availableDatasets.length === 0 ? (
                        <span className="text-xs text-amber-700">Publish atau tautkan dataset dulu</span>
                      ) : !r.contract ? (
                        <span className="text-xs text-amber-700">Kontrak belum aktif</span>
                      ) : r.policyResolution.status === "missing" ? (
                        <span className="text-xs text-rose-700">Policy dataset belum cocok</span>
                      ) : r.policyResolution.status === "ambiguous" ? (
                        <span className="text-xs text-rose-700">Policy dataset masih ganda</span>
                      ) : !poolReady ? (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-700">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {!myPool ? "Connection pool belum ada" : !poolMeta?.endpoint ? "Endpoint connector kosong" : "Well-known JWT URL kosong"}
                        </span>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{r.pendingDatasets.length} dataset siap dipilih</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {b}…</span>
                      ) : r.allSent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> selesai semua</span>
                      ) : r.ready ? (
                        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => send(r)}>
                          <Send className="w-4 h-4 mr-1" /> {transferModes[r.dom.key] === "persistent" ? "Start Persistent" : "Start Direct Stream"}
                        </Button>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">belum siap</span>
                      )}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>

        {/* Riwayat transfer */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2"><History className="w-4 h-4 text-accent" /><h3 className="font-semibold text-sm">Riwayat Transfer ({transfers.length})</h3></div>
          {transfers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada transfer.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Dataset</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Checksum (SHA-256)</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">{dsName(t.dataset_id)}</TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {transferModeMap[t.id] === "persistent"
                          ? "Persistent Transfer"
                          : transferModeMap[t.id] === "direct"
                            ? "Direct Stream"
                            : "Unknown"}
                      </Badge>
                    </TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_STYLE[String(t.status).toUpperCase()] ?? ""}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.transferred_size ?? 0}{t.total_size ? ` / ${t.total_size}` : ""} B
                      {t.error_message && <span className="text-rose-600 ml-2 inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{t.error_message}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.record_count ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" title={t.checksum_sha256 ?? ""}>
                      {t.checksum_sha256 ? `${t.checksum_sha256.slice(0, 12)}…` : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Retry untuk FAILED */}
                        {String(t.status).toUpperCase() === "FAILED" && (() => {
                          const row = rows.find((r) =>
                            r.availableDatasets.some((dataset) => dataset.dataset_id === t.dataset_id),
                          );
                          return row?.ready ? (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50"
                              onClick={() => send(row)}
                              disabled={!!busy[row.dom.key]}
                            >
                              <RefreshCw className="w-3 h-3 mr-1" /> Kirim Ulang
                            </Button>
                          ) : null;
                        })()}

                        {["INITIATED", "PAUSED"].includes(String(t.status).toUpperCase()) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"
                            onClick={() => void resumeTransfer(t.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Jalankan Lagi
                          </Button>
                        )}

                        {["INITIATED", "PAUSED", "TRANSFERRING", "FAILED"].includes(String(t.status).toUpperCase()) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs"
                            onClick={() => void refreshSingleTransferStatus(t.id)}
                          >
                            <RefreshCw className="w-3 h-3 mr-1" />
                            Cek Ulang
                          </Button>
                        )}

                        {/* Download untuk persistent COMPLETED */}
                        {transferModeMap[t.id] === "persistent" && String(t.status).toUpperCase() === "COMPLETED" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => downloadPersistentResult(t.id)}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        )}

                        {/* Preview Map untuk COMPLETED */}
                        {String(t.status).toUpperCase() === "COMPLETED" && (() => {
                          const ds = datasets.find((d) => d.dataset_id === t.dataset_id);
                          return (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => setPreviewTransfer({
                                id: t.id,
                                datasetName: dsName(t.dataset_id),
                                endpointUrl: ds?.endpoint_url,
                                adapterInfo: adapterForDataset(ds),
                              })}
                            >
                              <Map className="w-3 h-3 mr-1" /> Preview Map
                            </Button>
                          );
                        })()}

                        {String(t.status).toUpperCase() !== "FAILED"
                          && String(t.status).toUpperCase() !== "COMPLETED"
                          && <span className="text-xs text-muted-foreground italic">—</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>

      {/* Map Preview Modal */}
      {previewTransfer && (
        <TransferMapPreview
          open={!!previewTransfer}
          onOpenChange={(v) => { if (!v) setPreviewTransfer(null); }}
          datasetName={previewTransfer.datasetName}
          endpointUrl={previewTransfer.endpointUrl}
          adapterInfo={previewTransfer.adapterInfo}
          transferId={previewTransfer.id}
        />
      )}
    </div>
  );
};

export default TransferCenter;
