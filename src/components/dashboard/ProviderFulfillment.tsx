import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Database, FileSignature, CheckCircle2, Target, PackageCheck, Clock3 } from "lucide-react";
import { DOMAINS, cellInfo, STAGE_META, type DomainKey, type CellInfo } from "@/lib/fulfillment";
import type { Dataset } from "@/api/types/data-catalog";
import type { ContractItem } from "@/api/services/policy-contract";
import type { TransferItem } from "@/api/services/connector";

const STEPS = ["Terdaftar", "Kontrak", "Aktif", "Terkirim"] as const;

// CellInfo → jumlah langkah tercapai (0..4)
const stageStep = (info: CellInfo) => {
  let s = 0;
  if (info.published) s = 1;
  if (info.published && (info.contractActive || info.contractPending)) s = 2;
  if (info.published && info.contractActive) s = 3;
  if (info.transferred) s = 4;
  return s;
};

export function ProviderFulfillment({
  providerId,
  datasets,
  contracts,
  transfers = [],
}: {
  providerId: string | null;
  datasets: Dataset[];
  contracts: ContractItem[];
  transfers?: TransferItem[];
}) {
  const cells = useMemo(
    () =>
      DOMAINS.map((d) => ({
        d,
        info: cellInfo(providerId ?? "__none__", d.key as DomainKey, datasets, contracts, transfers),
      })),
    [providerId, datasets, contracts, transfers],
  );

  const fulfilled = cells.filter((c) => c.info.stage === "AKTIF" || c.info.stage === "TERKIRIM").length;
  const pct = Math.round((fulfilled / DOMAINS.length) * 100);

  return (
    <Card className="panel">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Target className="w-4 h-4 text-accent" />
            Pemenuhan 5 Domain Wajib SKK Migas
          </CardTitle>
          <div className="flex items-center gap-3">
            <div className="w-40 h-2 rounded-full bg-muted overflow-hidden">
              <div
                className="h-full rounded-full bg-emerald-500 transition-all"
                style={{ width: `${pct}%` }}
              />
            </div>
            <span className="text-sm font-bold">
              {fulfilled}/{DOMAINS.length}
            </span>
          </div>
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Status pemenuhan data Anda terhadap domain yang ditetapkan SKK Migas.
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {cells.map(({ d, info }) => {
            const m = STAGE_META[info.stage];
            const step = stageStep(info);
            return (
              <div
                key={d.key}
                className={`rounded-xl border p-4 ${m.cell} ${info.overdue ? "ring-2 ring-rose-400" : ""}`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <p className="font-semibold text-sm text-foreground">{d.label}</p>
                    <p className="text-[11px] text-muted-foreground">{d.sub}</p>
                  </div>
                  <Badge variant="outline" className={`${m.text} border-current/30 bg-white/60`}>
                    {m.label}
                  </Badge>
                </div>

                {/* progress 3 langkah */}
                <div className="flex items-center gap-1 mt-3">
                  {STEPS.map((s, i) => (
                    <div key={s} className="flex-1">
                      <div
                        className={`h-1.5 rounded-full ${
                          i < step ? "bg-emerald-500" : "bg-white/70 border border-slate-200"
                        }`}
                      />
                      <p className="text-[9px] text-muted-foreground mt-1 text-center">{s}</p>
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-4 mt-3 text-[11px]">
                  <span className="inline-flex items-center gap-1">
                    <Database className="w-3.5 h-3.5 text-muted-foreground" />
                    {info.published ? (
                      <span className="text-emerald-700 font-medium">Published</span>
                    ) : info.hasDataset ? (
                      <span className="text-amber-700">Draft</span>
                    ) : (
                      <span className="text-slate-400">Belum ada</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <FileSignature className="w-3.5 h-3.5 text-muted-foreground" />
                    {info.contractStatus ? (
                      <span
                        className={
                          info.contractActive
                            ? "text-emerald-700 font-medium"
                            : "text-amber-700"
                        }
                      >
                        {info.contractStatus}
                      </span>
                    ) : (
                      <span className="text-slate-400">Tanpa kontrak</span>
                    )}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <PackageCheck className="w-3.5 h-3.5 text-muted-foreground" />
                    {info.transferred ? (
                      <span className="text-emerald-700 font-medium">
                        {info.transferCount}× terkirim
                      </span>
                    ) : (
                      <span className="text-slate-400">Belum transfer</span>
                    )}
                  </span>
                </div>

                {info.dueDate && (
                  <div className={`mt-2 inline-flex items-center gap-1 text-[11px] ${info.overdue ? "text-rose-600 font-medium" : typeof info.daysLeft === "number" && info.daysLeft <= 14 && !(info.stage === "AKTIF" || info.stage === "TERKIRIM") ? "text-amber-600" : "text-muted-foreground"}`}>
                    <Clock3 className="w-3.5 h-3.5" />
                    Tenggat {new Date(info.dueDate).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" })}
                    {typeof info.daysLeft === "number" && !(info.stage === "AKTIF" || info.stage === "TERKIRIM") && (
                      info.overdue ? ` · terlambat ${Math.abs(info.daysLeft)} hari` : ` · sisa ${info.daysLeft} hari`
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        {fulfilled === DOMAINS.length && (
          <div className="mt-4 flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
            <CheckCircle2 className="w-4 h-4" />
            Seluruh 5 domain wajib telah terpenuhi (data ter-publish &amp; kontrak aktif).
          </div>
        )}
      </CardContent>
    </Card>
  );
}
