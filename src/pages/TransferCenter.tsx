import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Send, PackageCheck, Loader2, CheckCircle2, AlertCircle, Database, Clock, UploadCloud, History,
} from "lucide-react";
import { toast } from "sonner";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useContracts } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useTransfers } from "@/api/hooks/useTransfers";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { contractsApi, agreementsApi, type ContractItem } from "@/api/services/policy-contract";
import { transfersApi } from "@/api/services/connector";
import { policiesApi } from "@/api/services/governance";
import { DOMAINS, datasetDomain, contractDomain, type DomainKey } from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));
const STATUS_STYLE: Record<string, string> = {
  COMPLETED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  TRANSFERRING: "bg-blue-50 text-blue-700 border-blue-200",
  INITIATED: "bg-amber-50 text-amber-700 border-amber-200",
  FAILED: "bg-rose-50 text-rose-700 border-rose-200",
  PAUSED: "bg-slate-50 text-slate-700 border-slate-200",
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

  const send = async (row: (typeof rows)[number]) => {
    if (!domainId || !row.ds || !row.contract) return;
    if (!dpId) return toast.error("Tidak ada dataset-policy (jalankan Setup Juknis dulu).");
    const key = row.dom.key;
    const step = (s: string) => setBusy((b) => ({ ...b, [key]: s }));
    try {
      step("menautkan dataset");
      await contractsApi.linkDataset(domainId, {
        id: row.contract.id, consumer_id: row.contract.consumer_id, provider_id: row.contract.provider_id,
        name: row.contract.name, status: row.contract.status,
      }, row.ds.dataset_id, dpId);

      step("menyiapkan perjanjian");
      let ag = agreements.find((a) => a.contract_id === row.contract!.id);
      if (!ag) {
        const created = await agreementsApi.create(domainId, {
          contract_id: row.contract.id,
          effective_from: new Date().toISOString(),
          effective_to: new Date(Date.now() + 5 * 365 * 86400000).toISOString(),
        });
        ag = created;
      }
      if (ag.status !== "ACTIVE") {
        await agreementsApi.updateStatus(domainId, { id: ag.id, contract_id: row.contract.id }, "ACTIVE");
      }

      step("memulai transfer");
      const { transfer_process_id } = await transfersApi.initiate({
        domain_id: domainId, agreement_id: ag.id, dataset_id: row.ds.dataset_id,
      });
      await transfersApi.start(transfer_process_id);

      step("memindahkan data");
      let final = "INITIATED";
      for (let i = 0; i < 15; i++) {
        const st = await transfersApi.status(transfer_process_id);
        final = String(st.status).toUpperCase();
        if (final === "COMPLETED" || final === "FAILED") break;
        await sleep(2000);
      }
      if (final === "COMPLETED") toast.success(`Data ${row.dom.label} terkirim.`);
      else toast.error(`Transfer ${row.dom.label}: ${final}`);
      qc.invalidateQueries({ queryKey: ["transfers"] });
      qc.invalidateQueries({ queryKey: ["contracts"] });
    } catch (e: any) {
      toast.error(`Gagal (${busy[key] ?? "?"}): ${e?.response?.data?.detail || e?.message || "error"}`);
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
                          <Send className="w-4 h-4 mr-1" /> Kirim Data
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
                  <TableHead>Status</TableHead>
                  <TableHead>Ukuran</TableHead>
                  <TableHead>Record</TableHead>
                  <TableHead>Checksum (SHA-256)</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((t) => (
                  <TableRow key={t.id} className="hover:bg-muted/50">
                    <TableCell className="text-sm">{dsName(t.dataset_id)}</TableCell>
                    <TableCell><Badge variant="outline" className={STATUS_STYLE[String(t.status).toUpperCase()] ?? ""}>{t.status}</Badge></TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {t.transferred_size ?? 0}{t.total_size ? ` / ${t.total_size}` : ""} B
                      {t.error_message && <span className="text-rose-600 ml-2 inline-flex items-center gap-1"><AlertCircle className="w-3.5 h-3.5" />{t.error_message}</span>}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{t.record_count ?? "—"}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground" title={t.checksum_sha256 ?? ""}>
                      {t.checksum_sha256 ? `${t.checksum_sha256.slice(0, 12)}…` : "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>
      </div>
    </div>
  );
};

export default TransferCenter;
