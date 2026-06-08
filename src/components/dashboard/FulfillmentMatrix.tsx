import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { CheckCircle2, CircleDashed, Circle, Grid3x3, PackageCheck, Search, Download, Database, FileSignature, Clock3 } from "lucide-react";
import { Pager } from "@/components/common/Pager";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  DOMAINS,
  cellInfo,
  STAGE_META,
  type Stage,
  type DomainKey,
  type CellInfo,
} from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";
import type { ContractItem } from "@/api/services/policy-contract";
import type { TransferItem } from "@/api/services/connector";

interface KKKS {
  provider_id: string;
  provider_name: string;
}

const STAGE_ICON = {
  TERKIRIM: PackageCheck,
  AKTIF: CheckCircle2,
  TERSEDIA: CircleDashed,
  BELUM: Circle,
} as const;

const StageDot = ({ stage, overdue }: { stage: Stage; overdue?: boolean }) => {
  const Icon = STAGE_ICON[stage];
  const m = STAGE_META[stage];
  return (
    <span
      className={`relative inline-flex items-center justify-center w-full h-full rounded-md border ${m.cell} ${
        overdue ? "ring-2 ring-rose-500" : ""
      }`}
      title={overdue ? `${m.label} · TERLAMBAT` : m.label}
    >
      <Icon className={`w-4 h-4 ${m.text}`} />
      {overdue && (
        <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-rose-500 border border-white" />
      )}
    </span>
  );
};

const isFulfilled = (stage: Stage) => stage === "AKTIF" || stage === "TERKIRIM";

export function FulfillmentMatrix({
  providers,
  datasets,
  contracts,
  transfers = [],
}: {
  providers: KKKS[];
  datasets: Dataset[];
  contracts: ContractItem[];
  transfers?: TransferItem[];
}) {
  // Matriks status per (KKKS, domain)
  const rows = useMemo(
    () =>
      providers.map((p) => {
        const cells = DOMAINS.map((d) => ({
          domain: d.key as DomainKey,
          info: cellInfo(p.provider_id, d.key as DomainKey, datasets, contracts, transfers),
        }));
        const fulfilled = cells.filter((c) => isFulfilled(c.info.stage)).length;
        const sent = cells.filter((c) => c.info.stage === "TERKIRIM").length;
        const overdue = cells.filter((c) => c.info.overdue).length;
        return { p, cells, fulfilled, sent, overdue };
      }),
    [providers, datasets, contracts, transfers],
  );

  // Cakupan per domain (berapa KKKS yang sudah terpenuhi di domain itu)
  const perDomain = useMemo(
    () =>
      DOMAINS.map((d, i) => ({
        key: d.key,
        active: rows.filter((r) => isFulfilled(r.cells[i].info.stage)).length,
      })),
    [rows],
  );

  const totalCells = providers.length * DOMAINS.length;
  const activeCells = rows.reduce((s, r) => s + r.fulfilled, 0);
  const sentCells = rows.reduce((s, r) => s + r.sent, 0);
  const overdueCells = rows.reduce((s, r) => s + r.overdue, 0);
  const coverage = totalCells ? Math.round((activeCells / totalCells) * 100) : 0;

  // Pencarian + filter "belum patuh"/"overdue" + pagination baris (skala 50 KKKS)
  const [search, setSearch] = useState("");
  const [onlyIncomplete, setOnlyIncomplete] = useState(false);
  const [onlyOverdue, setOnlyOverdue] = useState(false);
  const [page, setPage] = useState(1);
  const PAGE_SIZE = 12;
  const filteredRows = useMemo(() => {
    const q = search.toLowerCase();
    return rows.filter(
      (r) =>
        r.p.provider_name.toLowerCase().includes(q) &&
        (!onlyIncomplete || r.fulfilled < DOMAINS.length) &&
        (!onlyOverdue || r.overdue > 0),
    );
  }, [rows, search, onlyIncomplete, onlyOverdue]);
  const pagedRows = useMemo(
    () => filteredRows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredRows, page],
  );
  useEffect(() => setPage(1), [search, onlyIncomplete, onlyOverdue]);

  // Drill-down per KKKS
  type Row = { p: KKKS; cells: { domain: DomainKey; info: CellInfo }[]; fulfilled: number };
  const [drill, setDrill] = useState<Row | null>(null);

  // Ekspor laporan kepatuhan (CSV) — seluruh KKKS × 5 domain
  const exportCsv = () => {
    const head = ["KKKS", ...DOMAINS.map((d) => d.label), "Terpenuhi", "Jml Overdue", "Domain Overdue"];
    const body = rows.map((r) => [
      r.p.provider_name,
      ...r.cells.map((c) => (c.info.overdue ? `${STAGE_META[c.info.stage].label} (TERLAMBAT)` : STAGE_META[c.info.stage].label)),
      `${r.fulfilled}/${DOMAINS.length}`,
      String(r.overdue),
      r.cells.filter((c) => c.info.overdue).map((c) => DOMAINS.find((x) => x.key === c.domain)?.label).join("; "),
    ]);
    const csv = [head, ...body]
      .map((row) => row.map((f) => `"${String(f).replace(/"/g, '""')}"`).join(","))
      .join("\r\n");
    const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `kepatuhan-kkks-juknis-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card className="panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Grid3x3 className="w-4 h-4 text-accent" />
            Matriks Pemenuhan Data KKKS × Domain
          </CardTitle>
          <div className="flex items-center gap-4 text-xs">
            <span className="text-muted-foreground">
              Cakupan terpenuhi:{" "}
              <span className="font-semibold text-foreground">{coverage}%</span>
            </span>
            <span className="text-muted-foreground">
              Terkirim:{" "}
              <span className="font-semibold text-emerald-700">{sentCells}</span>
            </span>
            <span className="text-muted-foreground">
              Terlambat:{" "}
              <span className="font-semibold text-rose-600">{overdueCells}</span>
            </span>
            <div className="flex items-center gap-3">
              {(["TERKIRIM", "AKTIF", "TERSEDIA", "BELUM"] as Stage[]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1.5">
                  <span className={`w-2.5 h-2.5 rounded-full ${STAGE_META[s].dot}`} />
                  <span className="text-muted-foreground">{STAGE_META[s].label}</span>
                </span>
              ))}
            </div>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Status dari data nyata: <b>Terkirim</b> = transfer COMPLETED ·
          <b> Aktif</b> = dataset ter-publish &amp; kontrak ACTIVE ·
          <b> Tersedia</b> = dataset ada, kontrak belum aktif · <b>Belum</b> = belum ada data.
        </p>
        <div className="flex items-center gap-2 mt-3 flex-wrap">
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Cari KKKS…"
              className="pl-10 h-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Button
            variant={onlyIncomplete ? "default" : "outline"}
            size="sm"
            className={onlyIncomplete ? "bg-amber-500 hover:bg-amber-600 text-white" : ""}
            onClick={() => setOnlyIncomplete((v) => !v)}
          >
            Hanya belum patuh
          </Button>
          <Button
            variant={onlyOverdue ? "default" : "outline"}
            size="sm"
            className={onlyOverdue ? "bg-rose-600 hover:bg-rose-700 text-white" : "text-rose-600 border-rose-200 hover:bg-rose-50"}
            onClick={() => setOnlyOverdue((v) => !v)}
          >
            Hanya overdue
          </Button>
          <Button variant="outline" size="sm" onClick={exportCsv} disabled={rows.length === 0}>
            <Download className="w-4 h-4 mr-1.5" /> Ekspor CSV
          </Button>
          <span className="text-xs text-muted-foreground ml-auto">
            {filteredRows.length} KKKS · klik nama untuk detail
          </span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full border-separate" style={{ borderSpacing: "6px 6px" }}>
            <thead>
              <tr>
                <th className="text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 min-w-[200px]">
                  KKKS
                </th>
                {DOMAINS.map((d) => (
                  <th key={d.key} className="text-center px-1 min-w-[96px]">
                    <div className="text-xs font-semibold">{d.label}</div>
                    <div className="text-[10px] text-muted-foreground font-normal">{d.sub}</div>
                  </th>
                ))}
                <th className="text-center text-xs font-semibold text-muted-foreground uppercase tracking-wider px-2 min-w-[80px]">
                  Total
                </th>
              </tr>
            </thead>
            <tbody>
              {filteredRows.length === 0 ? (
                <tr>
                  <td colSpan={DOMAINS.length + 2} className="text-center py-10 text-muted-foreground text-sm">
                    {rows.length === 0 ? "Belum ada KKKS terdaftar." : "Tidak ada KKKS yang cocok."}
                  </td>
                </tr>
              ) : (
                pagedRows.map((row) => {
                  const { p, cells, fulfilled } = row;
                  return (
                  <tr key={p.provider_id}>
                    <td className="px-2">
                      <button
                        className="flex items-center gap-2.5 text-left hover:text-accent transition-colors group"
                        onClick={() => setDrill(row)}
                        title="Lihat detail pemenuhan"
                      >
                        <span className="w-8 h-8 rounded-lg bg-primary text-primary-foreground text-xs font-semibold flex items-center justify-center shrink-0">
                          {p.provider_name.split(" ").map((w) => w[0]).join("").slice(0, 2).toUpperCase()}
                        </span>
                        <span className="text-sm font-medium truncate group-hover:underline">{p.provider_name}</span>
                      </button>
                    </td>
                    {cells.map((c) => (
                      <td key={c.domain} className="h-11">
                        <StageDot stage={c.info.stage} overdue={c.info.overdue} />
                      </td>
                    ))}
                    <td className="text-center">
                      <span
                        className={`inline-block text-sm font-bold px-2.5 py-1 rounded-md ${
                          fulfilled === DOMAINS.length
                            ? "bg-emerald-50 text-emerald-700"
                            : fulfilled > 0
                              ? "bg-amber-50 text-amber-700"
                              : "bg-slate-50 text-slate-500"
                        }`}
                      >
                        {fulfilled}/{DOMAINS.length}
                      </span>
                    </td>
                  </tr>
                  );
                })
              )}
            </tbody>
            {rows.length > 0 && (
              <tfoot>
                <tr>
                  <td className="px-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Cakupan / domain
                  </td>
                  {perDomain.map((d) => (
                    <td key={d.key} className="text-center">
                      <span className="text-xs font-semibold">
                        {d.active}/{providers.length}
                      </span>
                    </td>
                  ))}
                  <td />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
        <Pager page={page} total={filteredRows.length} pageSize={PAGE_SIZE} onPage={setPage} />
      </CardContent>

      {/* Drill-down per KKKS */}
      <Dialog open={!!drill} onOpenChange={(o) => !o && setDrill(null)}>
        <DialogContent className="sm:max-w-[640px]">
          <DialogHeader>
            <DialogTitle>{drill?.p.provider_name}</DialogTitle>
          </DialogHeader>
          {drill && (
            <div className="space-y-3 py-1">
              <p className="text-sm text-muted-foreground">
                Pemenuhan {drill.fulfilled}/{DOMAINS.length} domain. Tahap per domain:
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {drill.cells.map((c) => {
                  const d = DOMAINS.find((x) => x.key === c.domain)!;
                  const m = STAGE_META[c.info.stage];
                  return (
                    <div key={c.domain} className={`rounded-xl border p-3 ${m.cell}`}>
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-semibold text-sm text-foreground">{d.label}</p>
                          <p className="text-[11px] text-muted-foreground">{d.sub}</p>
                        </div>
                        <Badge variant="outline" className={`${m.text} bg-white/60 border-current/30`}>{m.label}</Badge>
                      </div>
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 mt-2 text-[11px]">
                        <span className="inline-flex items-center gap-1">
                          <Database className="w-3.5 h-3.5 text-muted-foreground" />
                          {c.info.published ? <span className="text-emerald-700 font-medium">Published</span> : c.info.hasDataset ? <span className="text-amber-700">Draft</span> : <span className="text-slate-400">Belum ada dataset</span>}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <FileSignature className="w-3.5 h-3.5 text-muted-foreground" />
                          {c.info.contractStatus ? <span className={c.info.contractActive ? "text-emerald-700 font-medium" : "text-amber-700"}>{c.info.contractStatus}</span> : <span className="text-slate-400">Tanpa kontrak</span>}
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <PackageCheck className="w-3.5 h-3.5 text-muted-foreground" />
                          {c.info.transferred ? <span className="text-emerald-700 font-medium">{c.info.transferCount}× terkirim</span> : <span className="text-slate-400">Belum transfer</span>}
                        </span>
                      </div>
                      {c.info.dueDate && (
                        <div className={`mt-2 text-[11px] inline-flex items-center gap-1 ${c.info.overdue ? "text-rose-600 font-medium" : "text-muted-foreground"}`}>
                          <Clock3 className="w-3.5 h-3.5" />
                          Tenggat {new Date(c.info.dueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                          {typeof c.info.daysLeft === "number" && (
                            c.info.overdue
                              ? ` · terlambat ${Math.abs(c.info.daysLeft)} hari`
                              : isFulfilled(c.info.stage) ? "" : ` · sisa ${c.info.daysLeft} hari`
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
