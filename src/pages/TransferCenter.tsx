import { useEffect, useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Send, PackageCheck, Loader2, CheckCircle2, AlertCircle, Database, Clock, UploadCloud, History, Download, Map, RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useDatasets } from "@/api/hooks/useDatasets";
import { TransferMapPreview } from "@/components/transfer/TransferMapPreview";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useTransfers } from "@/api/hooks/useTransfers";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { contractsApi, agreementsApi, type ContractItem } from "@/api/services/policy-contract";
import { transfersApi, type TransferMode } from "@/api/services/connector";
import { policiesApi } from "@/api/services/governance";
import { DOMAINS, datasetDomain, contractDomain, type DomainKey } from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";
import { getApiErrorMessage } from "@/lib/api-error";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const TRANSFER_MODE_STORAGE_KEY = "transfer_mode_map";
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRANSFERRING: "bg-blue-50 text-blue-700 border-blue-200",
  INITIATED: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  PAUSED: "bg-slate-50 text-slate-700 border-slate-200",
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

const TransferCenter = () => {
  const { domainId } = useDomain();
  const { participantId } = useAuth();
  const qc = useQueryClient();
  const { data: dsData } = useDatasets();
  const { data: cData } = useContracts();
  const { data: agData } = useAgreements();
  const { data: trData } = useTransfers();
  const polQ = useQuery({
    queryKey: ["dataset-policies", domainId],
    queryFn: () => policiesApi.list(domainId!),
    enabled: !!domainId,
  });

  const datasets = useMemo(
    () => ((dsData ?? []) as Dataset[]).filter(
      (d) => (!participantId || d.provider_id === participantId) && String(d.status).toLowerCase() === "published",
    ),
    [dsData, participantId],
  );
  const contracts = ((cData ?? []) as ContractItem[]).filter((c) => !participantId || c.provider_id === participantId);
  const agreements = agData ?? [];
  const transfers = trData ?? [];
  const dpId = (polQ.data ?? [])[0]?.policy_id as string | undefined;
  const dsName = (id: string) => datasets.find((d) => d.dataset_id === id)?.dataset_name ?? `${id.slice(0, 8)}…`;

  // Kewajiban per domain: dataset published + kontrak ACTIVE = siap dikirim
  const rows = useMemo(
    () =>
      DOMAINS.map((dom) => {
        const ds = datasets.find((d) => datasetDomain(d) === (dom.key as DomainKey));
        const contract = contracts.find((c) => contractDomain(c) === (dom.key as DomainKey) && c.status === "ACTIVE");
        const sent = !!ds && transfers.some((t) => t.dataset_id === ds.dataset_id && String(t.status).toUpperCase() === "COMPLETED");
        return { dom, ds, contract, sent, ready: !!ds && !!contract };
      }),
    [datasets, contracts, transfers],
  );

  const readyCount = rows.filter((r) => r.ready && !r.sent).length;
  const sentCount = rows.filter((r) => r.sent).length;

  const [busy, setBusy] = useState<Record<string, string>>({});
  const [transferModes, setTransferModes] = useState<Record<string, TransferMode>>({});
  const [transferModeMap, setTransferModeMap] = useState<Record<string, TransferMode>>(() =>
    readTransferModeMap(),
  );
  const [previewTransfer, setPreviewTransfer] = useState<{
    id: string; datasetName: string; endpointUrl?: string; adapterInfo?: any;
  } | null>(null);

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

  const send = async (row: (typeof rows)[number]) => {
    if (!domainId || !row.ds || !row.contract) return;
    if (!dpId) return toast.error("Tidak ada dataset-policy (jalankan Setup Juknis dulu).");

    // Cek apakah ada transfer aktif untuk dataset ini
    const activeTransfer = (transfers as typeof transfers).find(
      (t) =>
        t.dataset_id === row.ds!.dataset_id &&
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
      console.debug("[Transfer] start", { domainId, contractId: row.contract.id, datasetId: row.ds.dataset_id, dpId });

      step("menautkan dataset");
      try {
        await contractsApi.linkDataset(domainId, {
          id: row.contract.id, consumer_id: row.contract.consumer_id, provider_id: row.contract.provider_id,
          name: row.contract.name, status: row.contract.status,
        }, row.ds.dataset_id, dpId);
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
      console.debug("[Transfer] initiate payload:", { domain_id: domainId, agreement_id: ag.id, dataset_id: row.ds.dataset_id });
      const { transfer_process_id } = await transfersApi.initiate({
        domain_id: domainId,
        agreement_id: ag.id,
        dataset_id: row.ds.dataset_id,
      });
      console.debug("[Transfer] initiated, process_id:", transfer_process_id);
      persistTransferMode(transfer_process_id, mode);
      if (mode === "persistent") {
        await transfersApi.startPersistent(transfer_process_id);
      } else {
        await transfersApi.startDirect(transfer_process_id);
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
            ? `Data ${row.dom.label} tersimpan via persistent transfer.`
            : `Data ${row.dom.label} terkirim via direct stream.`,
        );
      }
      else toast.error(`Transfer ${row.dom.label}: ${final}`);
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
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
      <Header title="Transfer Data" subtitle="Kirim data Anda ke SKK Migas (menuntaskan kewajiban)" />
      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-amber-100 text-amber-700"><UploadCloud className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{readyCount}</p><p className="text-sm text-muted-foreground">Siap Dikirim</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-emerald-100 text-emerald-700"><PackageCheck className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{sentCount}/5</p><p className="text-sm text-muted-foreground">Terkirim</p></div></div></div>
          <div className="stat-card"><div className="flex items-center gap-4"><div className="p-3 rounded-xl bg-info/10 text-info"><History className="w-6 h-6" /></div><div><p className="text-2xl font-bold">{transfers.length}</p><p className="text-sm text-muted-foreground">Total Transfer</p></div></div></div>
        </div>

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
                      {r.ds ? <span className="inline-flex items-center gap-1"><Database className="w-3.5 h-3.5 text-muted-foreground" />{r.ds.dataset_name}</span> : <span className="text-slate-400 text-xs">Belum publish dataset</span>}
                    </TableCell>
                    <TableCell>
                      <select
                        value={transferModes[r.dom.key] ?? "direct"}
                        onChange={(e) => updateTransferMode(r.dom.key, e.target.value as TransferMode)}
                        disabled={!!b || r.sent || !r.ready}
                        className="flex h-9 rounded-md border border-input bg-background px-2 py-1 text-xs"
                      >
                        <option value="direct">Direct</option>
                        <option value="persistent">Persistent</option>
                      </select>
                    </TableCell>
                    <TableCell>
                      {r.sent ? (
                        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">Terkirim</Badge>
                      ) : !r.ds ? (
                        <span className="text-xs text-amber-700">Publish dataset dulu</span>
                      ) : !r.contract ? (
                        <span className="text-xs text-amber-700">Kontrak belum aktif</span>
                      ) : (
                        <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">Siap dikirim</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      {b ? (
                        <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground"><Loader2 className="w-3.5 h-3.5 animate-spin" /> {b}…</span>
                      ) : r.sent ? (
                        <span className="inline-flex items-center gap-1 text-xs text-emerald-700"><CheckCircle2 className="w-3.5 h-3.5" /> selesai</span>
                      ) : r.ready ? (
                        <Button size="sm" className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => send(r)}>
                          <Send className="w-4 h-4 mr-1" /> {transferModes[r.dom.key] === "persistent" ? "Simpan Transfer" : "Kirim Data"}
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
                          ? "Persistent"
                          : transferModeMap[t.id] === "direct"
                            ? "Direct"
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
                          const row = rows.find((r) => r.ds?.dataset_id === t.dataset_id);
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
