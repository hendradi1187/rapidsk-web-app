import axios from "axios";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useTransfers, transferKeys } from "@/api/hooks/useTransfers";
import { useConnectionPools, useConnectionPoolByScope } from "@/api/hooks/useConnectionPools";
import { useParticipantAdapters, useProviders } from "@/api/hooks/useProviders";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { contractsApi, agreementsApi, type AgreementItem, type ContractDetail, type ContractItem } from "@/api/services/policy-contract";
import { transfersApi, type TransferItem, type TransferMode, type TransferProjectionItem } from "@/api/services/connector";
import { policiesApi } from "@/api/services/governance";
import { DOMAINS, datasetDomain, contractDomain, type DomainKey } from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";
import type { ConnectionPoolItem, Policy } from "@/api/types/governance";
import type { Provider } from "@/api/types/providers";
import { findParticipantPool, isPoolReady, resolvePoolMeta } from "@/lib/connection-pool";
import { getApiErrorMessage, normalizeApiErrorMessage } from "@/lib/api-error";
import { resolveDatasetPolicyForDataset } from "@/lib/policy-mapping";
import { joinEndpointUrl } from "@/lib/dataset-endpoint";
import { wrapBlobInZip, zipArchiveName } from "@/lib/zip";
import {
  resolveHistoryTimestamp,
  compareHistoryDesc,
  formatHistoryTime,
  formatRelativeTime,
  matchesHistoryFilter,
  DEFAULT_HISTORY_FILTER,
  type HistoryFilterCriteria,
  type HistoryModeFilter,
} from "@/lib/transfer-history";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
// Transfer INITIATED/TRANSFERRING yang lebih tua dari ambang ini dianggap "macet"
// (connector tak punya endpoint cancel/timeout, jadi deteksi dilakukan di FE).
const STUCK_MS = 5 * 60 * 1000;
type DatasetTransferState = "NEW" | "DONE" | "FAILED" | "PAUSED" | "ACTIVE" | "STUCK";
const TRANSFER_MODE_STORAGE_KEY = "transfer_mode_map";
const TRANSFER_BODY_STORAGE_KEY = "transfer_body_map";
const TRANSFER_ATTEMPT_STORAGE_KEY = "transfer_attempt_map";

type TransferStartBody = { domain_id: string; agreement_id: string; dataset_id: string; mode?: TransferMode; resume_from_byte?: number };
type FailedTransferAttempt = {
  domain_key: string;
  domain_id: string;
  contract_id?: string;
  agreement_id?: string | null;
  dataset_id: string;
  mode: TransferMode;
  step: string;
  message: string;
  code?: string | null;
  request_id?: string | null;
  status?: number | null;
  updated_at: string;
};

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
  transferContext?: {
    domain_id: string;
    agreement_id: string;
    dataset_id: string;
    mode?: string | null;
  } | null;
}

interface AgreementDetailState {
  agreementId: string;
  transferId?: string | null;
}


// ScopedPoolLoader: render-nothing component yang resolve pool per domain+agreement
// Diperlukan karena hooks tidak bisa dipanggil di dalam loop
interface ScopedPoolLoaderProps {
  domainId: string | undefined;
  agreementId: string | undefined;
  domainKey: string;
  onResult: (domainKey: string, pool: import("@/api/types/governance").ConnectionPoolItem | null) => void;
}
function ScopedPoolLoader({ domainId, agreementId, domainKey, onResult }: ScopedPoolLoaderProps) {
  const { data } = useConnectionPoolByScope(domainId, agreementId, "CONSUMER");
  useEffect(() => { onResult(domainKey, data ?? null); }, [data]); // eslint-disable-line react-hooks/exhaustive-deps
  return null;
}

const TransferCenter = () => {
  const { domainId, domainName, availableDomains, ready: domainReady } = useDomain();
  const queryClient = useQueryClient();
  const { participantId, role } = useAuth();
  const isSuperAdmin = role === "SUPER_ADMIN";
  // Guard sinkron anti double-initiate: state `busy`/`transfers` masih stale saat dua klik
  // beruntun, jadi cek berbasis ref supaya klik kedua langsung ditolak sebelum async apa pun.
  const inFlightSendRef = useRef<Set<string>>(new Set());
  const inFlightResumeRef = useRef<Set<string>>(new Set());
  const [overrideParticipantId, setOverrideParticipantId] = useState<string | null>(null);
  const [selectedDatasetByDomain, setSelectedDatasetByDomain] = useState<Record<string, string>>({});
  const [contractDetailsById, setContractDetailsById] = useState<Record<string, ContractDetail>>({});
  const effectiveParticipantId = isSuperAdmin ? overrideParticipantId : participantId;
  const adminContextReady = !isSuperAdmin || !!effectiveParticipantId;
  const hasDomainOptions = availableDomains.length > 0;
  const domainContextReady = Boolean(domainId);
  const [scopedPoolMap, setScopedPoolMap] = useState<Record<string, import("@/api/types/governance").ConnectionPoolItem | null>>({});
  const handleScopedPool = (domainKey: string, pool: import("@/api/types/governance").ConnectionPoolItem | null) => {
    setScopedPoolMap((prev) => ({ ...prev, [domainKey]: pool }));
  };
  const datasetsQ = useDatasets();
  const contractsQ = useContracts();
  const agreementsQ = useAgreements();
  const transfersQ = useTransfers();
  const poolsQ = useConnectionPools();
  const providersQ = useProviders();
  const participantAdaptersQ = useParticipantAdapters(effectiveParticipantId ?? "");
  const transferProjectionQ = useQuery({
    queryKey: ["transfer-projections", effectiveParticipantId ?? "all"],
    // BE endpoint hanya dukung `limit` (maks 500, tanpa offset). Minta maksimum supaya
    // domain sibuk tetap dapat projeksi (role/mode/waktu) untuk baris lama.
    queryFn: () => transfersApi.listTransferProjections(500),
    // JANGAN di-gate adminContextReady: projeksi = data monitoring read-only yang WAJIB ada
    // untuk mengenali sisi CONSUMER vs PROVIDER (mirror). Tanpa ini, baris mirror lolos jadi
    // "Belum tercatat" dan riwayat dobel. Selalu fetch.
    enabled: true,
    staleTime: 15_000,
    // 403 = role tak punya izin monitoring → tetap (bukan transient). Jangan retry &
    // jangan biarkan auto-refresh nembak ulang (lihat guard di interval bawah).
    retry: false,
  });
  // BE menolak monitoring untuk role ini (403). Read-only, bukan urusan sesi — cukup
  // hentikan refetch berkala biar console tidak di-spam. Data lain tetap auto-refresh.
  const projectionsForbidden =
    (transferProjectionQ.error as import("axios").AxiosError | undefined)?.response?.status === 403;
  const { data: dsData } = datasetsQ;
  const { data: cData } = contractsQ;
  const { data: agData } = agreementsQ;
  const { data: trData } = transfersQ;
  const { data: poolsData } = poolsQ;
  const { data: providersData } = providersQ;
  const { data: participantAdaptersData } = participantAdaptersQ;
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
  const participantAdapters = useMemo(
    () =>
      ((participantAdaptersData ?? []) as Array<{
        id: string;
        type?: string;
        endpoint?: { url?: string | null } | null;
      }>),
    [participantAdaptersData],
  );
  const datasetPolicies = useMemo(
    () => ((polQ.data ?? []) as Policy[]),
    [polQ.data],
  );
  const dsName = (id: string) => datasets.find((d) => d.dataset_id === id)?.dataset_name ?? `${id.slice(0, 8)}...`;
  // Ringkas identitas teknis dataset (versi/protokol/format/akses) supaya operator
  // tahu persis varian mana yang dipilih — bukan cuma nama. Protokol penting karena
  // OGC_API_FEATURES butuh endpoint adapter (collection path), sedangkan REST_API
  // menarik URL apa adanya; salah pilih = transfer gagal/isi ngawur.
  const datasetMeta = (d?: Dataset | null): string =>
    d
      ? [d.version ? `v${d.version}` : null, d.protocol, d.endpoint_data_format, d.access_type]
          .filter(Boolean)
          .join(" · ")
      : "";
  const transferProjections = useMemo(
    () => ((transferProjectionQ.data ?? []) as TransferProjectionItem[]),
    [transferProjectionQ.data],
  );
  const [selectedAgreement, setSelectedAgreement] = useState<AgreementDetailState | null>(null);
  const projectionForTransfer = (transfer: { id: string }) =>
    transferProjections.find((item) => item.transfer_process_id === transfer.id || item.transfer_id === transfer.id) ?? null;
  // State dataset (blokir/lolos) & riwayat hanya boleh diturunkan dari baris CONSUMER/OUTBOUND —
  // baris PROVIDER/INBOUND mencerminkan sisi lawan dan bisa lebih baru → state salah / baris dobel.
  // CATATAN: list /connector/{domain}/transfers TIDAK membawa role/direction (terverifikasi live) —
  // satu-satunya sumber role/direction/transfer_id adalah projeksi monitoring. Tanpa projeksi
  // (baris yang projeksinya belum ter-materialisasi) fallback ke perilaku lama (dianggap dipakai).
  const isConsumerOutboundTransfer = (transfer: { id: string }): boolean => {
    const projection = projectionForTransfer(transfer);
    if (!projection) return true;
    const role = String(projection.role ?? "").toUpperCase();
    const direction = String(projection.direction ?? "").toUpperCase();
    return (role === "" || role === "CONSUMER") && (direction === "" || direction === "OUTBOUND");
  };
  const agreementForTransfer = (transfer: { agreement_id?: string | null }) =>
    agreements.find((item) => item.id === transfer.agreement_id) ?? null;
  const contractForAgreement = (agreementId?: string | null) => {
    const agreement = agreements.find((item) => item.id === agreementId);
    return agreement ? contracts.find((item) => item.id === agreement.contract_id) ?? null : null;
  };
  const shortId = (value?: string | null) => (value ? `${value.slice(0, 8)}...` : "-");
  const extractTransferMessage = (value: unknown): string | null => {
    if (typeof value === "string") {
      const text = value.trim();
      return text ? text : null;
    }
    if (Array.isArray(value)) {
      for (const item of value) {
        const found = extractTransferMessage(item);
        if (found) return found;
      }
      return null;
    }
    if (value && typeof value === "object") {
      const record = value as Record<string, unknown>;
      for (const key of ["message", "detail", "error", "error_message", "reason", "provider_detail"]) {
        const found = extractTransferMessage(record[key]);
        if (found) return found;
      }
    }
    return null;
  };
  const transferBlockReason = (transfer: (typeof transfers)[number]) => {
    const rawMessage = transfer.error_message || extractTransferMessage(projectionForTransfer(transfer)?.last_event_payload) || null;
    return rawMessage ? normalizeApiErrorMessage(rawMessage) : null;
  };
  // Riwayat: 1 aksi = 1 baris. BE mencatat tiap transfer dari 2 sisi (proses CONSUMER/OUTBOUND
  // + proses cermin PROVIDER/INBOUND dengan transfer_id sama) — baris cermin disembunyikan
  // supaya tidak terbaca seperti transaksi ganda. Urut terbaru dulu biar hasil aksi barusan
  // langsung kelihatan di paling atas.
  // Timestamp diambil dari projeksi (last_event_at) — list /transfers connector membawa
  // started_at/completed_at (BUKAN created_at/updated_at), jadi fallback pakai itu supaya
  // urutan tetap benar walau projeksi baris tsb hilang. Logika murni di lib (teruji unit).
  const historyTimestamp = (transfer: (typeof transfers)[number]): number => {
    const projection = projectionForTransfer(transfer);
    return resolveHistoryTimestamp({
      projectionLastEventAt: projection?.last_event_at ?? null,
      projectionUpdatedAt: projection?.updated_at ?? null,
      transferCompletedAt: transfer.completed_at ?? null,
      transferStartedAt: transfer.started_at ?? null,
      transferUpdatedAt: transfer.updated_at ?? null,
      transferCreatedAt: transfer.created_at ?? null,
      projectionCreatedAt: projection?.created_at ?? null,
    });
  };
  // Dedup 1 transfer = 1 baris. BE mencatat tiap transfer dari 2 sisi dengan transfer_id
  // SAMA (id/transfer_process_id beda). transfer_id HANYA ada di projeksi (list connector
  // tak membawanya) → kunci grup = projection.transfer_id, fallback id baris bila projeksi
  // belum ter-materialisasi. Dalam grup, simpan sisi CONSUMER/OUTBOUND.
  const dedupeHistoryByTransfer = (rows: typeof transfers): typeof transfers => {
    // NB: `Map` di file ini di-shadow ikon lucide — pakai globalThis.Map.
    const byKey = new globalThis.Map<string, (typeof transfers)[number]>();
    for (const row of rows) {
      const key = String(projectionForTransfer(row)?.transfer_id ?? row.id);
      const existing = byKey.get(key);
      if (!existing) {
        byKey.set(key, row);
        continue;
      }
      // Sudah ada baris untuk transfer ini — utamakan yang benar-benar CONSUMER/OUTBOUND.
      if (isConsumerOutboundTransfer(row) && !isConsumerOutboundTransfer(existing)) byKey.set(key, row);
    }
    return Array.from(byKey.values());
  };
  const historyTransfers = dedupeHistoryByTransfer(
    transfers.filter((transfer) => isConsumerOutboundTransfer(transfer)),
  ).sort((left, right) =>
    compareHistoryDesc(
      { id: left.id, timestamp: historyTimestamp(left) },
      { id: right.id, timestamp: historyTimestamp(right) },
    ),
  );
  const selectedAgreementRecord = selectedAgreement
    ? agreements.find((item) => item.id === selectedAgreement.agreementId) ?? null
    : null;
  const selectedAgreementContract = selectedAgreementRecord
    ? contracts.find((item) => item.id === selectedAgreementRecord.contract_id) ?? null
    : null;
  const selectedAgreementContractDetail = selectedAgreementRecord
    ? contractDetailsById[selectedAgreementRecord.contract_id]
    : undefined;

  // Pool untuk participant aktif - satu pool berlaku untuk semua domain transfer
  const myPool = useMemo(() => findParticipantPool(pools, effectiveParticipantId), [pools, effectiveParticipantId]);

  const participantLabel = (participantId?: string | null): string => {
    if (!participantId) return "provider";
    const provider = providers.find((item) => item.provider_id === participantId);
    return provider?.provider_name ?? `provider ${shortId(participantId)}`;
  };

  // Cek kesiapan connection pool PROVIDER milik provider kontrak. Connector
  // menggunakan pool ini (endpoint connector + well-known JWT) sebagai lawan transfer.
  const evaluateProviderPool = (providerId?: string | null): { ok: boolean; reason: string } => {
    const label = participantLabel(providerId);
    if (!providerId) {
      return { ok: false, reason: "Kontrak belum punya provider_id, jadi lawan transfer tidak bisa ditentukan." };
    }
    const providerPool = pools.find((pool) => pool.participant_id === providerId && pool.type === "PROVIDER");
    if (!providerPool) {
      const mistyped = pools.find((pool) => pool.participant_id === providerId);
      const hint = mistyped
        ? ` Ada connection pool untuk ${label} tapi bertipe ${mistyped.type}, bukan PROVIDER — perbaiki tipenya di menu Participant.`
        : ` Buat connection pool bertipe PROVIDER untuk ${label} di menu Participant.`;
      return { ok: false, reason: `${label} belum punya connection pool PROVIDER.${hint}` };
    }
    const meta = resolvePoolMeta(providerPool);
    if (!meta.endpoint) {
      return { ok: false, reason: `Connection pool PROVIDER milik ${label} belum punya Connector Endpoint.` };
    }
    if (!meta.wellKnownJwtUrl) {
      return { ok: false, reason: `Connection pool PROVIDER milik ${label} belum punya Well-known JWT URL.` };
    }
    return { ok: true, reason: "" };
  };

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
            .filter((transfer) => {
              if (transfer.dataset_id !== dataset.dataset_id) return false;
              // T6: hanya baris CONSUMER/OUTBOUND yang menurunkan state dataset milik kita.
              const projection = transferProjections.find(
                (item) => item.transfer_process_id === transfer.id || item.transfer_id === transfer.id,
              );
              if (!projection) return true;
              const role = String(projection.role ?? "").toUpperCase();
              const direction = String(projection.direction ?? "").toUpperCase();
              return (role === "" || role === "CONSUMER") && (direction === "" || direction === "OUTBOUND");
            })
            .sort((left, right) => {
              const leftTime = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
              const rightTime = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
              if (leftTime !== rightTime) return rightTime - leftTime;
              // T14: tie-break stabil saat timestamp sama → urut turun by id.
              return String(right.id).localeCompare(String(left.id));
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
            // T12: KPI "Siap Dikirim" harus konsisten dengan tombol aksi → pakai pool
            // scoped (per domain+agreement) bila ada, fallback ke pool participant.
            isPoolReady(scopedPoolMap[dom.key] ?? myPool) &&
            policyResolution.status === "matched",
        };
      }),
    [contractDetailsById, contracts, datasetPolicies, datasets, myPool, scopedPoolMap, selectedDatasetByDomain, transfers, transferProjections],
  );

  const failedAttemptForRow = (row: (typeof rows)[number]) =>
    row.selectedDataset ? failedAttemptMap[transferAttemptKeyFor(row.dom.key, row.selectedDataset.dataset_id)] ?? null : null;

  // Umur transfer (ms) dari timestamp paling andal: projeksi > transfer row.
  const transferAgeMs = (transfer: (typeof transfers)[number]): number => {
    const projection = projectionForTransfer(transfer);
    const raw =
      projection?.last_event_at ??
      projection?.updated_at ??
      transfer.updated_at ??
      transfer.created_at ??
      projection?.created_at ??
      null;
    const ms = raw ? new Date(raw).getTime() : 0;
    return ms > 0 ? Date.now() - ms : 0;
  };

  // State transfer terkini untuk sebuah dataset (dasar tombol Transfer Baru/Lanjutkan).
  const deriveDatasetState = (
    datasetId?: string | null,
  ): { state: DatasetTransferState; latest: (typeof transfers)[number] | null } => {
    if (!datasetId) return { state: "NEW", latest: null };
    const history = transfers
      .filter((transfer) => transfer.dataset_id === datasetId && isConsumerOutboundTransfer(transfer))
      .sort((left, right) => {
        const leftTs = new Date(left.updated_at ?? left.created_at ?? 0).getTime();
        const rightTs = new Date(right.updated_at ?? right.created_at ?? 0).getTime();
        if (leftTs !== rightTs) return rightTs - leftTs;
        // T14: tie-break stabil saat timestamp sama.
        return String(right.id).localeCompare(String(left.id));
      });
    const latest = history[0] ?? null;
    if (!latest) return { state: "NEW", latest: null };
    const status = String(latest.status).toUpperCase();
    if (status === "COMPLETED") return { state: "DONE", latest };
    if (status === "FAILED") return { state: "FAILED", latest };
    if (status === "PAUSED") return { state: "PAUSED", latest };
    // INITIATED / TRANSFERRING → macet bila terlalu lama tanpa progres.
    const age = transferAgeMs(latest);
    if (age > STUCK_MS) return { state: "STUCK", latest };
    return { state: "ACTIVE", latest };
  };

  // Apakah konteks resume (body) untuk sebuah transfer tersedia.
  // Cuma syarat teknis pembentukan request (domain/agreement/dataset id) — bukan penilaian FE.
  // Mode TIDAK wajib di sini: resumeTransfer me-resolve mode dari status() saat klik.
  const canResumeTransfer = (transfer: (typeof transfers)[number] | null): boolean => {
    if (!transfer) return false;
    const body = transferBodyMap[transfer.id];
    const hasStored = !!body?.domain_id && !!body?.agreement_id && !!body?.dataset_id;
    const hasInline = !!transfer.domain_id && !!transfer.agreement_id && !!transfer.dataset_id;
    return hasStored || hasInline;
  };

  // Alasan tombol "Transfer Baru" dikunci (urut prioritas). null = boleh jalan.
  const newTransferBlockReason = (row: (typeof rows)[number], dsState: DatasetTransferState): string | null => {
    if (!domainId) return "Pilih domain aktif dulu sebelum transfer.";
    if (!row.contract) return "Kontrak domain ini belum aktif.";
    if (!row.selectedDataset) return "Pilih dataset dulu.";
    if (row.policyResolution.status !== "matched") return row.policyResolution.reason;
    const consumerPool = scopedPoolMap[row.dom.key] ?? myPool ?? null;
    if (!isPoolReady(consumerPool)) {
      return !consumerPool
        ? "Connection pool CONSUMER belum dikonfigurasi."
        : !resolvePoolMeta(consumerPool)?.endpoint
          ? "Connection pool CONSUMER belum punya Connector Endpoint."
          : "Connection pool CONSUMER belum punya Well-known JWT URL.";
    }
    const providerCheck = evaluateProviderPool(row.contract.provider_id);
    if (!providerCheck.ok) return providerCheck.reason;
    if (dsState === "ACTIVE") return "Masih ada transfer berjalan untuk dataset ini.";
    if (dsState === "STUCK") return "Transfer sebelumnya macet (>5 menit). Coba Lanjutkan, atau reset di sisi backend.";
    return null;
  };

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
  const [failedAttemptMap, setFailedAttemptMap] = useState<Record<string, FailedTransferAttempt>>(() =>
    readTransferAttemptMap(),
  );
  // Cache mode yang di-resolve lazy via status() untuk transfer lintas-browser (localStorage
  // kosong & t.mode null). null = sudah dicek tapi mode tetap tak diketahui.
  const [lazyModeById, setLazyModeById] = useState<Record<string, TransferMode | null>>({});
  const normalizeTransferMode = (rawMode?: string | null): TransferMode | null => {
    if (!rawMode) return null;
    const normalized = String(rawMode).trim().toLowerCase();
    if (normalized.includes("persistent")) return "persistent";
    if (normalized.includes("direct")) return "direct";
    return null;
  };
  const resolvePersistedTransferMode = (
    transfer: { id: string; mode?: string | null } | string,
  ): TransferMode | null => {
    const transferId = typeof transfer === "string" ? transfer : transfer.id;
    const rawMode =
      transferModeMap[transferId] ??
      transferBodyMap[transferId]?.mode ??
      (typeof transfer === "string" ? null : transfer.mode ?? null);
    return normalizeTransferMode(rawMode) ?? lazyModeById[transferId] ?? null;
  };
  const persistFailedAttempt = (attemptKey: string, value: FailedTransferAttempt) => {
    setFailedAttemptMap((prev) => {
      const next = { ...prev, [attemptKey]: value };
      writeTransferAttemptMap(next);
      return next;
    });
  };
  const clearFailedAttempt = (attemptKey: string) => {
    setFailedAttemptMap((prev) => {
      if (!(attemptKey in prev)) return prev;
      const next = { ...prev };
      delete next[attemptKey];
      writeTransferAttemptMap(next);
      return next;
    });
  };
  const transferAttemptKeyFor = (domainKey: string, datasetId?: string | null) => (datasetId ? `${domainKey}:${datasetId}` : domainKey);
  const extractApiErrorMeta = (error: unknown): { code?: string | null; request_id?: string | null; status?: number | null } => {
    if (!axios.isAxiosError(error)) return {};
    const payload = (error.response?.data ?? {}) as Record<string, unknown>;
    const errors = (payload.errors ?? {}) as Record<string, unknown>;
    return {
      code: (errors.code ?? payload.code ?? null) as string | null,
      request_id: (payload.request_id ?? errors.request_id ?? null) as string | null,
      status: error.response?.status ?? null,
    };
  };
  const agreementTimestamp = (agreement: { effective_from?: string; created_at?: string; updated_at?: string }) => {
    const value = agreement.updated_at ?? agreement.effective_from ?? agreement.created_at ?? "";
    const time = value ? new Date(value).getTime() : 0;
    return Number.isFinite(time) ? time : 0;
  };
  const agreementScore = (
    agreement: AgreementItem,
    contract: { consumer_id?: string; provider_id?: string },
    datasetId: string,
  ) => {
    const datasetMatch = agreement.dataset_id === datasetId ? 4 : 0;
    const datasetPresent = agreement.dataset_id ? 2 : 0;
    const consumerMatch = agreement.consumer_participant_id && contract.consumer_id
      ? agreement.consumer_participant_id === contract.consumer_id ? 2 : -2
      : 0;
    const providerMatch = agreement.provider_participant_id && contract.provider_id
      ? agreement.provider_participant_id === contract.provider_id ? 2 : -2
      : 0;
    const participantPresent = agreement.consumer_participant_id && agreement.provider_participant_id ? 1 : 0;
    return datasetMatch + datasetPresent + consumerMatch + providerMatch + participantPresent;
  };
  const findAgreementCandidates = (
    contract: { id: string; consumer_id?: string; provider_id?: string },
    datasetId: string,
    source: AgreementItem[],
    excludeIds: string[] = [],
  ) => source
    .filter((agreement) => agreement.contract_id === contract.id && !excludeIds.includes(agreement.id))
    .sort((left, right) => {
      const leftActive = String(left.status).toUpperCase() === "ACTIVE" ? 1 : 0;
      const rightActive = String(right.status).toUpperCase() === "ACTIVE" ? 1 : 0;
      if (leftActive !== rightActive) return rightActive - leftActive;

      const scoreDiff = agreementScore(right, contract, datasetId) - agreementScore(left, contract, datasetId);
      if (scoreDiff !== 0) return scoreDiff;

      return agreementTimestamp(right) - agreementTimestamp(left);
    });
  const ensureAgreementReady = async (
    contract: { id: string; consumer_id?: string; provider_id?: string },
    datasetId: string,
    options?: { forceCreate?: boolean; excludeIds?: string[] },
  ) => {
    if (!domainId) throw new Error("Domain belum aktif.");
    const freshAgreements = await agreementsApi.list(domainId);
    const candidates = options?.forceCreate ? [] : findAgreementCandidates(contract, datasetId, freshAgreements, options?.excludeIds ?? []);
    let agreement = candidates[0] ?? null;
    if (!agreement) {
      agreement = await agreementsApi.create(domainId, {
        contract_id: contract.id,
        effective_from: new Date().toISOString(),
        effective_to: new Date(Date.now() + 5 * 365 * 86400000).toISOString(),
      });
    }
    if (String(agreement.status).toUpperCase() !== "ACTIVE") {
      agreement = await agreementsApi.updateStatus(domainId, { id: agreement.id, contract_id: contract.id }, "ACTIVE");
    }
    return agreement;
  };
  const [autoRefresh, setAutoRefresh] = useState(true);
  const [previewTransfer, setPreviewTransfer] = useState<TransferPreviewState | null>(null);

  // Filter + paginasi riwayat (client-side).
  const [historyFilter, setHistoryFilter] = useState<HistoryFilterCriteria>(DEFAULT_HISTORY_FILTER);
  const [historyPageSize, setHistoryPageSize] = useState(10);
  const [historyPage, setHistoryPage] = useState(1);
  const HISTORY_STATUS_OPTIONS = ["COMPLETED", "FAILED", "INITIATED", "TRANSFERRING", "PAUSED"];
  const isHistoryFiltered =
    historyFilter.datasetId !== "ALL" ||
    historyFilter.status !== "ALL" ||
    historyFilter.mode !== "ALL" ||
    historyFilter.search.trim() !== "";
  const resetHistoryFilter = () => setHistoryFilter(DEFAULT_HISTORY_FILTER);

  // Riwayat setelah filter + pencarian (predikat murni teruji unit).
  const filteredHistory = historyTransfers.filter((t) =>
    matchesHistoryFilter(
      {
        transferId: t.id,
        agreementId: t.agreement_id,
        datasetId: t.dataset_id,
        datasetName: dsName(t.dataset_id),
        status: t.status,
        mode: resolvePersistedTransferMode(t),
      },
      historyFilter,
    ),
  );
  // Opsi dataset untuk filter — hanya dataset yang benar-benar muncul di riwayat.
  // (Pakai reduce, bukan `new Map`, karena `Map` di file ini adalah ikon lucide-react.)
  const historyDatasetOptions = Object.entries(
    historyTransfers.reduce<Record<string, string>>((acc, t) => {
      if (!(t.dataset_id in acc)) acc[t.dataset_id] = dsName(t.dataset_id);
      return acc;
    }, {}),
  ).sort((left, right) => left[1].localeCompare(right[1]));
  const historyTotalPages = Math.max(1, Math.ceil(filteredHistory.length / historyPageSize));
  const historyCurrentPage = Math.min(historyPage, historyTotalPages);
  const historyPageStart = (historyCurrentPage - 1) * historyPageSize;
  const pagedHistory = filteredHistory.slice(historyPageStart, historyPageStart + historyPageSize);
  const historyRangeFrom = filteredHistory.length === 0 ? 0 : historyPageStart + 1;
  const historyRangeTo = Math.min(historyPageStart + historyPageSize, filteredHistory.length);

  // Reset ke halaman 1 saat filter/domain/ukuran halaman berubah supaya operator tidak
  // terdampar di halaman kosong.
  useEffect(() => {
    setHistoryPage(1);
  }, [historyFilter, historyPageSize, domainId, effectiveParticipantId]);

  const normalizeUrlCandidate = (url?: string | null): string | null => {
    if (!url) return null;
    try {
      return new URL(url).href.replace(/\/+$/, "").toLowerCase();
    } catch {
      return url.trim().replace(/\/+$/, "").toLowerCase() || null;
    }
  };

  const resolveDatasetEndpointUrl = (ds?: typeof datasets[number]): string => {
    const baseUrl = String(ds?.endpoint_url ?? "").trim();
    if (!baseUrl) return "";

    const runtime = ds?.endpoint_runtime;
    if (!runtime || typeof runtime !== "object") return baseUrl;

    const collectionPath = typeof runtime.collection_path === "string" ? runtime.collection_path.trim() : "";
    if (!collectionPath) return baseUrl;

    const domainCode = typeof runtime.domain_code === "string" ? runtime.domain_code.trim() : "";
    const resolvedPath = domainCode
      ? collectionPath.replace(/\{domain_code\}/gi, encodeURIComponent(domainCode))
      : collectionPath;

    // Join manual: `new URL("/collections/...", base)` membuang base path. joinEndpointUrl
    // memperlakukan collection_path sebagai relatif terhadap base sehingga path base tetap utuh.
    return joinEndpointUrl(baseUrl, resolvedPath);
  };

  // Adapter lookup: dataset bisa menyimpan base adapter URL + runtime path, atau legacy full URL.
  const adapterForDataset = (ds?: typeof datasets[number]) => {
    const datasetBaseUrl = normalizeUrlCandidate(ds?.endpoint_url);
    const datasetResolvedUrl = normalizeUrlCandidate(resolveDatasetEndpointUrl(ds));
    if (!datasetBaseUrl && !datasetResolvedUrl) return null;

    const matchedAdapter = participantAdapters.find((adapter) => {
      const adapterUrl = normalizeUrlCandidate(adapter.endpoint?.url);
      if (!adapterUrl) return false;
      return [datasetBaseUrl, datasetResolvedUrl].some((candidate) => (
        !!candidate && (candidate === adapterUrl || candidate.startsWith(`${adapterUrl}/`))
      ));
    });

    if (!matchedAdapter) return null;
    return {
      url: String(matchedAdapter.endpoint?.url ?? ds?.endpoint_url ?? ""),
      type: String(matchedAdapter.type ?? "GIS_STUDIO"),
    };
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
        // Skip kalau BE sudah 403 (izin monitoring kurang) → jangan spam tiap 7s.
        ...(projectionsForbidden ? [] : [transferProjectionQ.refetch()]),
      ]);
    }, 7000);
    return () => window.clearInterval(timer);
  }, [autoRefresh, transfersQ, contractsQ, agreementsQ, poolsQ, transferProjectionQ, projectionsForbidden]);

  // Lintas-browser: untuk transfer COMPLETED yang modenya tak diketahui (localStorage kosong
  // & t.mode null), resolve lazy via status() sekali per transfer supaya tombol Download tetap
  // bisa muncul untuk hasil persistent. Hasil (termasuk "tetap tak diketahui") di-cache.
  useEffect(() => {
    const pending = transfers.filter(
      (t) =>
        String(t.status).toUpperCase() === "COMPLETED" &&
        !(t.id in lazyModeById) &&
        normalizeTransferMode(transferModeMap[t.id] ?? transferBodyMap[t.id]?.mode ?? t.mode ?? null) == null,
    );
    if (pending.length === 0) return;
    let cancelled = false;
    void Promise.allSettled(
      pending.map(async (t) => {
        const st = await transfersApi.status(t.id);
        return [t.id, normalizeTransferMode(st.mode)] as const;
      }),
    ).then((results) => {
      if (cancelled) return;
      setLazyModeById((prev) => {
        const next = { ...prev };
        pending.forEach((t) => {
          if (!(t.id in next)) next[t.id] = null;
        });
        results.forEach((res) => {
          if (res.status === "fulfilled") {
            const [id, mode] = res.value;
            next[id] = mode;
          }
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfers]);

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

  const downloadPersistentResult = async (transfer: { id: string; domain_id: string; agreement_id: string; dataset_id: string }) => {
    try {
      const { blob, filename } = await transfersApi.downloadPersistent(transfer.id, {
        domain_id: transfer.domain_id,
        agreement_id: transfer.agreement_id,
        dataset_id: transfer.dataset_id,
      });
      // Selalu bungkus ke ZIP: nama + ekstensi asli terkunci DI DALAM arsip, jadi
      // apa pun ulah download manager (IDM dkk) menamai file luar, isi tetap benar
      // dan user tidak perlu rename ekstensi manual.
      const zipBlob = await wrapBlobInZip(blob, filename);
      const url = window.URL.createObjectURL(zipBlob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = zipArchiveName(filename);
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.URL.revokeObjectURL(url);
      toast.success("File persistent berhasil diunduh.");
    } catch (e: unknown) {
      // 404 = transfer ini bukan persistent / salinan tidak tersedia (umum saat mode tak
      // diketahui lintas-browser). Beri pesan spesifik, bukan error mentah.
      if (axios.isAxiosError(e) && e.response?.status === 404) {
        toast.warning("Transfer ini bukan persistent atau salinan hasilnya tidak tersedia untuk diunduh.");
        return;
      }
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
      transferProjectionQ.refetch(),
    ]);
  };

  const refreshSingleTransferStatus = async (transferId: string) => {
    try {
      const st = await transfersApi.status(transferId);
      // T10: merge hasil status ke cache list agar UI langsung akurat sebelum refetch penuh.
      queryClient.setQueryData<TransferItem[]>(transferKeys.list(domainId), (prev) => {
        if (!Array.isArray(prev)) return prev;
        return prev.map((item) =>
          item.id === transferId
            ? {
                ...item,
                status: st.status ?? item.status,
                mode: st.mode ?? item.mode,
                total_size: st.total_size ?? item.total_size,
                transferred_size: st.transferred_size ?? item.transferred_size,
                bytes_transferred: st.bytes_transferred ?? item.bytes_transferred,
                checksum_sha256: st.checksum_sha256 ?? item.checksum_sha256,
                record_count: st.record_count ?? item.record_count,
                error_message: st.error_message ?? item.error_message,
                updated_at: st.updated_at ?? item.updated_at,
              }
            : item,
        );
      });
      await refreshOperationalState();
      toast.success("Status transfer diperbarui.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal cek ulang status transfer"));
    }
  };

  // Resume boleh diklik kapan pun (berkali-kali). Satu-satunya guard FE = anti double-click
  // (1 klik = 1 aksi). FE tidak menilai status transfer — BE yang mutusin; kalau BE nolak,
  // pesannya ditampilkan apa adanya lewat getApiErrorMessage.
  const resumeTransfer = async (transferId: string) => {
    // Guard sinkron anti double-resume per transfer id.
    if (inFlightResumeRef.current.has(transferId)) return;
    const latestKnownTransfer = transfers.find((item) => item.id === transferId);
    const projection = latestKnownTransfer ? projectionForTransfer(latestKnownTransfer) : null;
    let body = transferBodyMap[transferId] ?? (latestKnownTransfer ? {
      domain_id: latestKnownTransfer.domain_id,
      agreement_id: latestKnownTransfer.agreement_id,
      dataset_id: latestKnownTransfer.dataset_id,
    } : null);

    inFlightResumeRef.current.add(transferId);
    try {
      // status() dipakai murni buat ngambil context (mode + byte progres), bukan buat ngeblokir.
      const latestStatus = await transfersApi.status(transferId).catch(() => null);
      if (!body?.domain_id || !body?.agreement_id || !body?.dataset_id) {
        body = latestStatus?.domain_id && latestStatus?.agreement_id && latestStatus?.dataset_id
          ? { domain_id: latestStatus.domain_id, agreement_id: latestStatus.agreement_id, dataset_id: latestStatus.dataset_id }
          : body;
      }
      if (!body?.domain_id || !body?.agreement_id || !body?.dataset_id) {
        toast.warning("Context transfer ini tidak terbaca dari connector (domain/agreement/dataset kosong). Jalankan proses baru dari tabel kewajiban.");
        return;
      }
      const mode: TransferMode =
        resolvePersistedTransferMode({
          id: transferId,
          mode: latestStatus?.mode ?? latestKnownTransfer?.mode ?? projection?.mode ?? null,
        }) ?? "direct";
      const resumeFromByte = Number(
        latestStatus?.bytes_transferred ?? latestStatus?.transferred_size ?? 0,
      );
      const resumeBody = {
        ...body,
        resume_from_byte: resumeFromByte > 0 ? resumeFromByte : undefined,
      };
      if (mode === "persistent") {
        await transfersApi.startPersistent(transferId, resumeBody);
      } else {
        await transfersApi.startDirect(transferId, resumeBody);
      }
      // Simpan context supaya klik berikutnya (atau browser lain) tidak buta mode/body.
      persistTransferMode(transferId, mode);
      persistTransferBody(transferId, { ...body, mode });
      await sleep(1000);
      await refreshOperationalState();
      toast.success(
        mode === "persistent"
          ? "Transfer persistent dicoba jalankan lagi."
          : "Direct stream dicoba jalankan lagi.",
      );
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal menjalankan ulang transfer"));
    } finally {
      inFlightResumeRef.current.delete(transferId);
    }
  };

  // "Buat Baru" pada transfer FAILED di riwayat: jalankan ulang start pada transfer yang sama
  // (memakai body tersimpan). Sebelumnya fungsi ini dipanggil tapi tak terdefinisi → crash.
  const retryFailedTransfer = (transferId: string) => resumeTransfer(transferId);

  const send = async (row: (typeof rows)[number]) => {
    // Guard sinkron: tolak klik kedua untuk domain yang sama selagi proses pertama jalan.
    if (inFlightSendRef.current.has(row.dom.key)) return;
    if (!domainId) return toast.error("Pilih domain aktif dulu sebelum transfer.", { duration: 6000 });
    if (!row.contract) return toast.error("Kontrak domain ini belum aktif.", { duration: 6000 });
    if (!row.selectedDataset) return toast.error("Pilih dataset dulu.", { duration: 6000 });
    if (row.policyResolution.status !== "matched" || !row.policyResolution.policy?.policy_id) {
      return toast.error(row.policyResolution.reason, { duration: 8000 });
    }
    const scopedPool = scopedPoolMap[row.dom.key] ?? null;
    const effectivePool = scopedPool ?? myPool ?? null;
    const effectivePoolReady = isPoolReady(effectivePool);
    const effectivePoolMeta = effectivePool ? resolvePoolMeta(effectivePool) : null;
    if (!effectivePoolReady) {
      const missing = !effectivePool
        ? "Connection pool belum dikonfigurasi untuk participant ini."
        : !effectivePoolMeta?.endpoint
          ? "Connection pool tidak memiliki Connector Endpoint."
          : "Connection pool tidak memiliki Well-known JWT URL.";
      return toast.error(`Transfer tidak bisa dimulai (consumer): ${missing}`, { duration: 8000 });
    }

    // Precheck sisi PROVIDER: connector butuh connection pool bertipe PROVIDER milik
    // provider kontrak (endpoint + well-known JWT) untuk negosiasi transfer. Tanpa ini
    // connector menolak dengan "Agreement not found" yang menyesatkan — tangkap di sini
    // supaya pesannya jelas dan tidak lolos ke connector.
    const providerCheck = evaluateProviderPool(row.contract.provider_id);
    if (!providerCheck.ok) {
      return toast.error(`Transfer tidak bisa dimulai (provider): ${providerCheck.reason}`, { duration: 9000 });
    }

    const activeTransfer = (transfers as typeof transfers).find(
      (t) =>
        t.dataset_id === row.selectedDataset.dataset_id &&
        !["COMPLETED", "FAILED", "PAUSED"].includes(String(t.status).toUpperCase()),
    );
    if (activeTransfer) {
      toast.warning(
        `Transfer sedang berjalan untuk dataset ini (status: ${activeTransfer.status}). Lanjutkan lewat tombol resume atau tunggu sampai statusnya selesai/gagal dulu.`,
        { duration: 6000 },
      );
      return;
    }

    const key = row.dom.key;
    inFlightSendRef.current.add(key);
    const attemptKey = transferAttemptKeyFor(row.dom.key, row.selectedDataset.dataset_id);
    const mode = transferModes[key] ?? "direct";
    let currentStep = "memulai transfer";
    let transferProcessId: string | null = null;
    let agreementId: string | null = null;
    const step = (value: string) => {
      currentStep = value;
      setBusy((busyState) => ({ ...busyState, [key]: value }));
    };

    clearFailedAttempt(attemptKey);

    try {
      console.debug("[Transfer] start", {
        domainId,
        contractId: row.contract.id,
        datasetId: row.selectedDataset.dataset_id,
        policyId: row.policyResolution.policy.policy_id,
      });

      step("menautkan dataset");
      let verifiedContractDetail: ContractDetail | null = null;
      try {
        await contractsApi.linkDataset(domainId, {
          id: row.contract.id,
          consumer_id: row.contract.consumer_id,
          provider_id: row.contract.provider_id,
          name: row.contract.name,
          status: row.contract.status,
        }, row.selectedDataset.dataset_id, row.policyResolution.policy.policy_id);
        console.debug("[Transfer] linkDataset OK");
      } catch (e: unknown) {
        console.warn("[Transfer] linkDataset request failed, checking actual contract state:", e);
      }

      step("verifikasi dataset kontrak");
      for (let attempt = 0; attempt < 4; attempt += 1) {
        const detail = await contractsApi.get(domainId, row.contract.id);
        const linkedDatasetIds = (detail.datasets ?? []).map((item) => item.dataset_id);
        if (linkedDatasetIds.includes(row.selectedDataset.dataset_id)) {
          verifiedContractDetail = detail;
          break;
        }
        await sleep(1000 * (attempt + 1));
      }

      if (!verifiedContractDetail) {
        throw new Error("Dataset belum benar-benar tertaut ke contract aktif. Transfer dibatalkan agar connector tidak menerima agreement yang belum siap.");
      }

      setContractDetailsById((prev) => ({ ...prev, [row.contract.id]: verifiedContractDetail! }));
      console.debug("[Transfer] contract verified with dataset:", {
        contractId: row.contract.id,
        datasetId: row.selectedDataset.dataset_id,
        linkedDatasets: (verifiedContractDetail.datasets ?? []).map((item) => item.dataset_id),
      });

      step("menyiapkan perjanjian");
      let agreement = await ensureAgreementReady(row.contract, row.selectedDataset.dataset_id);
      agreementId = agreement.id;
      console.debug("[Transfer] agreement ready:", agreement);

      step("memulai transfer");
      console.debug("[Transfer] initiate payload:", {
        domain_id: domainId,
        agreement_id: agreement.id,
        dataset_id: row.selectedDataset.dataset_id,
      });

      try {
        const initiated = await transfersApi.initiate({
          domain_id: domainId,
          agreement_id: agreement.id,
          dataset_id: row.selectedDataset.dataset_id,
        });
        transferProcessId = initiated.transfer_process_id;
      } catch (e: unknown) {
        const msg = getApiErrorMessage(e, "error");
        if (!/agreement not found/i.test(msg)) throw e;

        console.warn("[Transfer] agreement not visible in connector yet, retrying same agreement after sync delay");
        step("menunggu sinkronisasi agreement");

        let initiatedAfterSync: Awaited<ReturnType<typeof transfersApi.initiate>> | null = null;
        for (let attempt = 0; attempt < 3; attempt += 1) {
          await sleep(1500 * (attempt + 1));
          try {
            initiatedAfterSync = await transfersApi.initiate({
              domain_id: domainId,
              agreement_id: agreement.id,
              dataset_id: row.selectedDataset.dataset_id,
            });
            break;
          } catch (retryError: unknown) {
            const retryMsg = getApiErrorMessage(retryError, "error");
            if (!/agreement not found/i.test(retryMsg)) throw retryError;
          }
        }

        if (initiatedAfterSync) {
          step("memulai transfer");
          transferProcessId = initiatedAfterSync.transfer_process_id;
        } else {
          // "Agreement not found" yang persisten biasanya karena pool PROVIDER hilang, BUKAN
          // agreement salah. Membuat agreement baru cuma meninggalkan agreement ACTIVE yatim.
          // Cek pool provider dulu; kalau bermasalah, stop dengan alasan pool yang jelas.
          const retryProviderCheck = evaluateProviderPool(row.contract.provider_id);
          if (!retryProviderCheck.ok) {
            throw new Error(
              `Agreement tetap tidak ditemukan connector dan pool PROVIDER bermasalah: ${retryProviderCheck.reason} Perbaiki pool provider dulu, jangan buat agreement baru.`,
            );
          }
          console.warn("[Transfer] agreement still missing after sync delay, retrying with another agreement candidate");
          step("sinkron ulang perjanjian");
          agreement = await ensureAgreementReady(row.contract, row.selectedDataset.dataset_id, { excludeIds: [agreement.id] });
          agreementId = agreement.id;
          step("memulai transfer");
          const initiated = await transfersApi.initiate({
            domain_id: domainId,
            agreement_id: agreement.id,
            dataset_id: row.selectedDataset.dataset_id,
          });
          transferProcessId = initiated.transfer_process_id;
        }
      }

      console.debug("[Transfer] initiated, process_id:", transferProcessId);
      persistTransferMode(transferProcessId, mode);
      const startBody = {
        domain_id: domainId,
        agreement_id: agreement.id,
        dataset_id: row.selectedDataset.dataset_id,
        mode,
      };
      persistTransferBody(transferProcessId, startBody);
      if (mode === "persistent") {
        await transfersApi.startPersistent(transferProcessId, startBody);
      } else {
        await transfersApi.startDirect(transferProcessId, startBody);
      }

      step("memindahkan data");
      let final = "INITIATED";
      let lastStatus: Awaited<ReturnType<typeof transfersApi.status>> | null = null;
      for (let i = 0; i < 45; i++) {
        const st = await transfersApi.status(transferProcessId);
        lastStatus = st;
        final = String(st.status).toUpperCase();
        if (["COMPLETED", "FAILED", "PAUSED"].includes(final)) break;
        await sleep(2000);
      }
      if (final === "COMPLETED") {
        // T11: COMPLETED tapi membawa error_message → jangan klaim sukses penuh.
        const completedWarning = lastStatus?.error_message ? normalizeApiErrorMessage(lastStatus.error_message) : null;
        if (completedWarning) {
          toast.warning(`Transfer ${row.selectedDataset.dataset_name} selesai dengan catatan: ${completedWarning}`, { duration: 8000 });
        } else {
          toast.success(
            mode === "persistent"
              ? `Data ${row.selectedDataset.dataset_name} tersimpan via persistent transfer.`
              : `Data ${row.selectedDataset.dataset_name} terkirim via direct stream.`,
          );
        }
      } else if (final === "FAILED") {
        const failedReason = lastStatus?.error_message ? normalizeApiErrorMessage(lastStatus.error_message) : null;
        toast.error(`Transfer ${row.selectedDataset.dataset_name} gagal${failedReason ? `: ${failedReason}` : "."}`);
      } else {
        toast.warning(`Transfer ${row.selectedDataset.dataset_name} masih berjalan (${final}). Pantau dari riwayat transfer.`, { duration: 6000 });
      }
      clearFailedAttempt(attemptKey);
      await refreshOperationalState();
    } catch (e: unknown) {
      const msg = getApiErrorMessage(e, "error");
      const meta = extractApiErrorMeta(e);
      console.error("[Transfer] GAGAL", {
        step: currentStep,
        domain_id: domainId,
        contract_id: row.contract.id,
        provider: participantLabel(row.contract.provider_id),
        dataset_id: row.selectedDataset.dataset_id,
        agreement_id: agreementId,
        transfer_process_id: transferProcessId,
        message: msg,
        code: meta.code ?? null,
        request_id: meta.request_id ?? null,
        status: meta.status ?? null,
        raw: e,
      });
      const loweredMsg = msg.toLowerCase();
      const isActiveTransferError = /active\b.*\btransfer/.test(loweredMsg) || loweredMsg.includes("transfer already exists");
      if (!transferProcessId) {
        persistFailedAttempt(attemptKey, {
          domain_key: row.dom.key,
          domain_id: domainId,
          contract_id: row.contract.id,
          agreement_id: agreementId,
          dataset_id: row.selectedDataset.dataset_id,
          mode,
          step: currentStep,
          message: msg,
          code: meta.code ?? null,
          request_id: meta.request_id ?? null,
          status: meta.status ?? null,
          updated_at: new Date().toISOString(),
        });
      }
      if (isActiveTransferError) {
        toast.warning("Transfer aktif sudah ada untuk dataset ini - tunggu sampai selesai atau gagal.", { duration: 6000 });
      } else {
        toast.error(`Gagal (${currentStep ?? "?"}): ${msg}`, { duration: 8000 });
      }
    } finally {
      inFlightSendRef.current.delete(key);
      setBusy((busyState) => {
        const next = { ...busyState };
        delete next[key];
        return next;
      });
    }
  };

  return (
    <Fragment>
      {/* ScopedPoolLoader: resolve connection pool per domain+agreement (render nothing) */}
      {rows.map((r) => {
        const ag = (agData ?? []).find((a: { contract_id: string; id: string }) => a.contract_id === r.contract?.id);
        if (!ag || !domainId) return null;
        return (
          <ScopedPoolLoader
            key={r.dom.key}
            domainId={domainId}
            agreementId={ag.id}
            domainKey={r.dom.key}
            onResult={handleScopedPool}
          />
        );
      })}
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
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-emerald-100 text-emerald-700"><PackageCheck className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{sentCount}/{DOMAINS.length}</p><p className="text-sm text-muted-foreground">Terkirim</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-info/10 text-info"><History className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{transfers.length}</p><p className="text-sm text-muted-foreground">Total Transfer</p></div></div></div>
        </div>

        {/* SUPER_ADMIN: pool context picker */}
        {isSuperAdmin && (
          <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <UserCog className="w-5 h-5 text-amber-700 flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-semibold text-amber-900">Mode Admin - Pilih Participant</p>
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
            {domainId ? <> - domain aktif <strong>{domainId}</strong></> : <> - domain aktif belum terbaca</>}
          </div>
        )}

        {/* Kewajiban siap kirim */}
        <div className="panel overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center gap-2"><Send className="w-4 h-4 text-accent" /><h3 className="font-semibold text-sm">{`Kewajiban Pengiriman Data - ${DOMAINS.length} Domain`}</h3></div>
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
                const { state: dsState, latest: latestTransfer } = deriveDatasetState(r.selectedDataset?.dataset_id);
                const newBlockReason = newTransferBlockReason(r, dsState);
                const showResume = ["FAILED", "PAUSED", "STUCK"].includes(dsState) && !!latestTransfer;
                const resumeReady = showResume && canResumeTransfer(latestTransfer);
                const modeLabel = transferModes[r.dom.key] === "persistent" ? "Persistent" : "Direct";
                const newLabel = dsState === "DONE" ? `Transfer Ulang (${modeLabel})` : `Transfer Baru (${modeLabel})`;
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
                                    {datasetMeta(dataset) ? ` — ${datasetMeta(dataset)}` : ""}
                                  </option>
                                ))}
                              </select>
                              {r.selectedDataset ? (
                                <p className="px-0.5 text-[11px] text-slate-500">
                                  {datasetMeta(r.selectedDataset) || "Metadata endpoint belum lengkap"}
                                </p>
                              ) : null}
                            </div>
                          ) : (
                            <span className="inline-flex flex-col gap-0.5">
                              <span className="inline-flex items-center gap-1">
                                <Database className="w-3.5 h-3.5 text-muted-foreground" />
                                {r.selectedDataset?.dataset_name}
                              </span>
                              {datasetMeta(r.selectedDataset) ? (
                                <span className="text-[11px] text-slate-500">{datasetMeta(r.selectedDataset)}</span>
                              ) : null}
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
                                    {datasetMeta(item.dataset) ? (
                                      <p className="truncate text-[10px] text-slate-400">{datasetMeta(item.dataset)}</p>
                                    ) : null}
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
                      {/* Mode boleh dipilih kapan pun ada dataset — kesiapan kirim dijaga tombol aksi, bukan selector ini. */}
                      <select
                        value={transferModes[r.dom.key] ?? "direct"}
                        onChange={(e) => updateTransferMode(r.dom.key, e.target.value as TransferMode)}
                        disabled={!!b || !r.selectedDataset}
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
                      ) : !isPoolReady(scopedPoolMap[r.dom.key] ?? myPool) ? (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-700">
                          <ShieldAlert className="w-3.5 h-3.5" />
                          {!(scopedPoolMap[r.dom.key] ?? myPool) ? "Connection pool belum ada" : !resolvePoolMeta(scopedPoolMap[r.dom.key] ?? myPool!)?.endpoint ? "Endpoint connector kosong" : "Well-known JWT URL kosong"}
                        </span>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">{r.pendingDatasets.length} dataset siap dipilih</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {b}...</span>
                      ) : !r.selectedDataset ? (
                        <span className="text-xs text-muted-foreground italic">pilih dataset</span>
                      ) : (
                        <div className="flex flex-col items-end gap-1.5">
                          <div className="flex items-center justify-end gap-1.5">
                            {showResume ? (
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!resumeReady}
                                title={
                                  resumeReady
                                    ? "Lanjutkan transfer yang ada (resume) — bisa diklik berkali-kali, tiap klik = 1 aksi."
                                    : "Konteks transfer (domain/agreement/dataset) tidak terbaca; pakai Transfer Baru."
                                }
                                onClick={() => latestTransfer && void resumeTransfer(latestTransfer.id)}
                              >
                                <RefreshCw className="w-4 h-4 mr-1" /> Lanjutkan
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              className="bg-accent hover:bg-accent/90 text-accent-foreground"
                              disabled={!!newBlockReason}
                              title={newBlockReason ?? newLabel}
                              onClick={() => send(r)}
                            >
                              <Send className="w-4 h-4 mr-1" /> {newLabel}
                            </Button>
                          </div>
                          {dsState === "ACTIVE" ? (
                            <span className="text-[11px] text-blue-600">Sedang berjalan ({latestTransfer?.status})…</span>
                          ) : dsState === "STUCK" ? (
                            <span className="text-[11px] text-amber-600">Macet &gt;5 mnt — Lanjutkan atau minta admin reset di backend.</span>
                          ) : newBlockReason ? (
                            <span className="max-w-[240px] text-right text-[11px] text-rose-600">{newBlockReason}</span>
                          ) : dsState === "DONE" ? (
                            <span className="text-[11px] text-emerald-600">Selesai{latestTransfer?.record_count != null ? ` • ${latestTransfer.record_count} record` : ""} — bisa transfer ulang.</span>
                          ) : null}
                        </div>
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
          <div className="px-4 py-3 border-b border-border flex items-center gap-2">
            <History className="w-4 h-4 text-accent" />
            <h3 className="font-semibold text-sm">
              {isHistoryFiltered
                ? `Riwayat Transfer (difilter: ${filteredHistory.length} dari ${historyTransfers.length})`
                : `Riwayat Transfer (${historyTransfers.length})`}
            </h3>
            <span className="ml-auto text-[11px] text-muted-foreground">Terbaru di atas · 1 transfer = 1 baris (catatan sisi provider disembunyikan)</span>
          </div>

          {/* Filter & pencarian riwayat */}
          {historyTransfers.length > 0 && (
            <div className="flex flex-wrap items-end gap-3 border-b border-border bg-slate-50/60 px-4 py-3">
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] uppercase tracking-wide text-slate-500">Dataset</Label>
                <select
                  value={historyFilter.datasetId}
                  onChange={(e) => setHistoryFilter((prev) => ({ ...prev, datasetId: e.target.value }))}
                  className="h-9 min-w-[180px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="ALL">Semua dataset</option>
                  {historyDatasetOptions.map(([id, name]) => (
                    <option key={id} value={id}>{name}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] uppercase tracking-wide text-slate-500">Status</Label>
                <select
                  value={historyFilter.status}
                  onChange={(e) => setHistoryFilter((prev) => ({ ...prev, status: e.target.value }))}
                  className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="ALL">Semua status</option>
                  {HISTORY_STATUS_OPTIONS.map((status) => (
                    <option key={status} value={status}>{status}</option>
                  ))}
                </select>
              </div>
              <div className="flex flex-col gap-1">
                <Label className="text-[11px] uppercase tracking-wide text-slate-500">Mode</Label>
                <select
                  value={historyFilter.mode}
                  onChange={(e) => setHistoryFilter((prev) => ({ ...prev, mode: e.target.value as HistoryModeFilter }))}
                  className="h-9 min-w-[140px] rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value="ALL">Semua mode</option>
                  <option value="direct">Direct Stream</option>
                  <option value="persistent">Persistent Transfer</option>
                </select>
              </div>
              <div className="flex flex-1 flex-col gap-1 min-w-[200px]">
                <Label className="text-[11px] uppercase tracking-wide text-slate-500">Cari</Label>
                <input
                  type="text"
                  value={historyFilter.search}
                  onChange={(e) => setHistoryFilter((prev) => ({ ...prev, search: e.target.value }))}
                  placeholder="Cari transfer id / agreement id / nama dataset"
                  className="h-9 w-full rounded-md border border-input bg-background px-2 py-1 text-xs"
                />
              </div>
              {isHistoryFiltered && (
                <Button variant="outline" size="sm" className="h-9" onClick={resetHistoryFilter}>
                  Reset filter
                </Button>
              )}
            </div>
          )}

          {historyTransfers.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">Belum ada transfer.</div>
          ) : filteredHistory.length === 0 ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              Tidak ada transfer yang cocok dengan filter. <button type="button" className="text-blue-700 underline" onClick={resetHistoryFilter}>Reset filter</button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow className="table-header">
                  <TableHead>Dataset</TableHead>
                  <TableHead>Waktu</TableHead>
                  <TableHead>Mode</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Checksum (SHA-256)</TableHead>
                  <TableHead className="text-right">Aksi</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pagedHistory.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">
                      <div className="space-y-1">
                        <div className="font-medium">{dsName(t.dataset_id)}</div>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <button
                            type="button"
                            className="text-left text-blue-700 underline-offset-2 hover:underline"
                            onClick={() => setSelectedAgreement({ agreementId: t.agreement_id, transferId: t.id })}
                          >
                            Agreement {shortId(t.agreement_id)}
                          </button>
                          {agreementForTransfer(t)?.status ? (
                            <Badge variant="outline" className="h-5 text-[10px]">
                              {agreementForTransfer(t)?.status}
                            </Badge>
                          ) : null}
                          {contractForAgreement(t.agreement_id)?.name ? (
                            <span className="truncate max-w-[260px]" title={contractForAgreement(t.agreement_id)?.name}>
                              {contractForAgreement(t.agreement_id)?.name}
                            </span>
                          ) : null}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          Transfer ID {shortId(t.id)}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-sm">
                      {(() => {
                        const ms = historyTimestamp(t);
                        return (
                          <div className="space-y-0.5">
                            <div className="whitespace-nowrap font-medium text-slate-700">{formatHistoryTime(ms)}</div>
                            {formatRelativeTime(ms) ? (
                              <div className="text-[11px] text-muted-foreground">{formatRelativeTime(ms)}</div>
                            ) : null}
                          </div>
                        );
                      })()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {resolvePersistedTransferMode(t) === "persistent"
                          ? "Persistent Transfer"
                          : resolvePersistedTransferMode(t) === "direct"
                            ? "Direct Stream"
                            : "Belum tercatat"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1 text-left">
                        <Badge variant="outline" className={STATUS_STYLE[String(t.status).toUpperCase()] ?? ""}>{t.status}</Badge>
                        {(() => {
                          const projection = projectionForTransfer(t);
                          const parts = [projection?.role, projection?.direction, projection?.mode, projection?.last_event_type].filter(Boolean);
                          return parts.length ? <div className="text-xs text-muted-foreground">{parts.join(" | ")}</div> : null;
                        })()}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      <div className="space-y-1">
                        <div>
                          {t.transferred_size ?? 0}{t.total_size ? ` / ${t.total_size}` : ""} B
                          {t.error_message && <span className="text-rose-600 ml-2 inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{normalizeApiErrorMessage(t.error_message)}</span>}
                        </div>
                        {String(t.status).toUpperCase() !== "COMPLETED" && transferBlockReason(t) && (
                          <div className="max-w-[320px] text-xs text-amber-700">{transferBlockReason(t)}</div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.record_count ?? "-"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" title={t.checksum_sha256 ?? ""}>
                      {t.checksum_sha256 ? `${t.checksum_sha256.slice(0, 12)}...` : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {["FAILED", "INITIATED", "PAUSED"].includes(String(t.status).toUpperCase()) && (
                          <Button
                            size="sm"
                            variant="outline"
                            className={String(t.status).toUpperCase() === "FAILED" ? "h-7 text-xs text-amber-700 border-amber-200 hover:bg-amber-50" : "h-7 text-xs text-blue-700 border-blue-200 hover:bg-blue-50"}
                            onClick={() => void (String(t.status).toUpperCase() === "FAILED" ? retryFailedTransfer(t.id) : resumeTransfer(t.id))}
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

                        {/* Download untuk COMPLETED: tampil untuk persistent, dan untuk mode yang
                            belum diketahui (lintas-browser) — jangan hard-hide. Disembunyikan hanya
                            bila mode dipastikan direct. Error 404 ditangani rapi di handler. */}
                        {String(t.status).toUpperCase() === "COMPLETED" && resolvePersistedTransferMode(t) !== "direct" && (
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            title={resolvePersistedTransferMode(t) === "persistent" ? "Unduh hasil persistent" : "Coba unduh salinan persistent (bila tersedia)"}
                            onClick={() => downloadPersistentResult(t)}>
                            <Download className="w-3 h-3 mr-1" /> Download
                          </Button>
                        )}

                        {/* Preview Data untuk COMPLETED */}
                        {String(t.status).toUpperCase() === "COMPLETED" && (() => {
                          const ds = datasets.find((d) => d.dataset_id === t.dataset_id);
                          return (
                            <Button size="sm" variant="outline"
                              className="h-7 text-xs text-emerald-700 border-emerald-200 hover:bg-emerald-50"
                              onClick={() => setPreviewTransfer({
                                id: t.id,
                                datasetName: dsName(t.dataset_id),
                                endpointUrl: resolveDatasetEndpointUrl(ds),
                                adapterInfo: adapterForDataset(ds),
                                transferContext: {
                                  domain_id: t.domain_id,
                                  agreement_id: t.agreement_id,
                                  dataset_id: t.dataset_id,
                                  mode: resolvePersistedTransferMode(t),
                                },
                              })}
                            >
                              <Map className="w-3 h-3 mr-1" /> Preview Data
                            </Button>
                          );
                        })()}

                        {String(t.status).toUpperCase() !== "FAILED"
                          && String(t.status).toUpperCase() !== "COMPLETED"
                          && <span className="text-xs text-muted-foreground italic">-</span>}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {/* Paginasi riwayat (client-side) */}
          {filteredHistory.length > 0 && (
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 text-xs text-muted-foreground">
              <div className="flex items-center gap-2">
                <span>Baris per halaman</span>
                <select
                  value={historyPageSize}
                  onChange={(e) => setHistoryPageSize(Number(e.target.value))}
                  className="h-8 rounded-md border border-input bg-background px-2 py-1 text-xs"
                >
                  <option value={10}>10</option>
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                </select>
                <span>
                  {historyRangeFrom}–{historyRangeTo} dari {filteredHistory.length}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={historyCurrentPage <= 1}
                  onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
                >
                  Sebelumnya
                </Button>
                <span>Halaman {historyCurrentPage} / {historyTotalPages}</span>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8"
                  disabled={historyCurrentPage >= historyTotalPages}
                  onClick={() => setHistoryPage((page) => Math.min(historyTotalPages, page + 1))}
                >
                  Berikutnya
                </Button>
              </div>
            </div>
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
          transferContext={previewTransfer.transferContext}
        />
      )}
      <Dialog open={!!selectedAgreement} onOpenChange={(open) => { if (!open) setSelectedAgreement(null); }}>
        <DialogContent className="sm:max-w-[720px]">
          <DialogHeader>
            <DialogTitle>Detail Agreement</DialogTitle>
            <DialogDescription>
              Agreement, kontrak, dan transfer context ditampilkan bareng supaya retry dan audit flow lebih jelas.
            </DialogDescription>
          </DialogHeader>

          {!selectedAgreementRecord ? (
            <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Data agreement belum ketemu di response aktif.
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid gap-3 md:grid-cols-2">
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Agreement</div>
                  <div className="mt-2 font-mono text-sm break-all">{selectedAgreementRecord.id}</div>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge variant="outline">{selectedAgreementRecord.status}</Badge>
                    {selectedAgreement?.transferId ? (
                      <span className="text-xs text-slate-500">Transfer {shortId(selectedAgreement.transferId)}</span>
                    ) : null}
                  </div>
                </div>
                <div className="rounded-xl border bg-slate-50 p-4">
                  <div className="text-xs uppercase tracking-wide text-slate-500">Masa Berlaku</div>
                  <div className="mt-2 text-sm text-slate-800">
                    {selectedAgreementRecord.effective_from || "-"} sampai {selectedAgreementRecord.effective_to || "-"}
                  </div>
                  <div className="mt-2 text-xs text-slate-500">
                    Dibuat {selectedAgreementRecord.created_at || "-"}
                  </div>
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Kontrak</div>
                <div className="mt-2 text-sm font-semibold text-slate-900">
                  {selectedAgreementContract?.name ?? shortId(selectedAgreementRecord.contract_id)}
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                  <span>ID {selectedAgreementRecord.contract_id}</span>
                  {selectedAgreementContract?.status ? <Badge variant="outline">{selectedAgreementContract.status}</Badge> : null}
                  {selectedAgreementContract?.provider_id ? <span>Provider {shortId(selectedAgreementContract.provider_id)}</span> : null}
                  {selectedAgreementContract?.consumer_id ? <span>Consumer {shortId(selectedAgreementContract.consumer_id)}</span> : null}
                </div>
              </div>

              <div className="rounded-xl border p-4">
                <div className="text-xs uppercase tracking-wide text-slate-500">Dataset Terkait Kontrak</div>
                <div className="mt-1 text-sm text-slate-700">
                  {(selectedAgreementContractDetail?.datasets ?? []).length} dataset tertaut
                </div>
                {selectedAgreementContractDetail?.datasets?.length ? (
                  <div className="mt-3 space-y-2">
                    {selectedAgreementContractDetail.datasets.map((item) => (
                      <div key={item.dataset_id + item.dataset_policy_id} className="rounded-lg border bg-slate-50 px-3 py-2 text-sm">
                        <div className="font-medium">{dsName(item.dataset_id)}</div>
                        <div className="text-xs text-slate-500">
                          Dataset {shortId(item.dataset_id)} · Policy {shortId(item.dataset_policy_id)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="mt-3 text-sm text-slate-500">Belum ada detail dataset kontrak yang kebaca dari API.</div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
    </Fragment>
  );
};

export default TransferCenter;



// transfer attempt storage helpers
function readTransferAttemptMap(): Record<string, FailedTransferAttempt> {
  try {
    return JSON.parse(localStorage.getItem(TRANSFER_ATTEMPT_STORAGE_KEY) ?? '{}') as Record<string, FailedTransferAttempt>;
  } catch {
    return {};
  }
}
function writeTransferAttemptMap(value: Record<string, FailedTransferAttempt>) {
  localStorage.setItem(TRANSFER_ATTEMPT_STORAGE_KEY, JSON.stringify(value));
}
