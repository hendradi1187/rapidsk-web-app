import { useMemo, useState } from "react";
import { Header } from "@/components/layout/Header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Inbox,
  CheckCircle2,
  XCircle,
  Zap,
  Clock,
  AlertCircle,
  Loader2,
  Check,
  X,
  ArrowRight,
  FileCheck2,
  CalendarCheck,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { useContracts, useUpdateContractStatus } from "@/api/hooks/useContracts";
import { useAgreements } from "@/api/hooks/useAgreements";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuth } from "@/context/AuthContext";
import { CreateAgreementDialog } from "@/components/contracts/CreateAgreementDialog";
import type { ContractItem } from "@/api/services/policy-contract";

const fmtDate = (iso?: string) =>
  iso
    ? new Date(iso).toLocaleDateString("id-ID", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      })
    : "—";

const STATUS_STYLE: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 border-emerald-200",
  APPROVED: "bg-blue-50 text-blue-700 border-blue-200",
  REQUESTED: "bg-amber-50 text-amber-700 border-amber-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

// Info tenggat untuk satu kewajiban (overdue hanya bila belum tuntas & lewat tenggat).
const dueInfo = (c: ContractItem) => {
  if (!c.due_date) return null;
  const daysLeft = Math.ceil((new Date(c.due_date).getTime() - Date.now()) / 86400000);
  const settled = c.status === "ACTIVE" || c.status === "REJECTED";
  return { overdue: !settled && daysLeft < 0, daysLeft, label: fmtDate(c.due_date), settled };
};
const STATUS_LABEL: Record<string, string> = {
  REQUESTED: "Menunggu",
  APPROVED: "Disetujui",
  ACTIVE: "Aktif",
  REJECTED: "Ditolak",
};

const LIFECYCLE = ["REQUESTED", "APPROVED", "ACTIVE"];

type PendingAction = {
  contract: ContractItem;
  status: "APPROVED" | "REJECTED" | "ACTIVE";
} | null;

const ACTION_COPY: Record<
  "APPROVED" | "REJECTED" | "ACTIVE",
  { title: string; verb: string; desc: string; cls: string }
> = {
  APPROVED: {
    title: "Setujui Permintaan",
    verb: "Setujui",
    desc: "Kontrak akan berstatus APPROVED. SKK Migas dapat melanjutkan ke tahap aktivasi & perjanjian.",
    cls: "bg-blue-600 hover:bg-blue-700",
  },
  ACTIVE: {
    title: "Aktifkan Kontrak",
    verb: "Aktifkan",
    desc: "Kontrak akan berstatus ACTIVE — pertukaran data dapat berjalan sesuai kebijakan.",
    cls: "bg-emerald-600 hover:bg-emerald-700",
  },
  REJECTED: {
    title: "Tolak Permintaan",
    verb: "Tolak",
    desc: "Kontrak akan berstatus REJECTED. SKK Migas perlu mengajukan permintaan baru bila masih dibutuhkan.",
    cls: "bg-rose-600 hover:bg-rose-700",
  },
};

const StatusTimeline = ({ status }: { status: string }) => {
  if (status === "REJECTED") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-rose-600">
        <XCircle className="w-3.5 h-3.5" /> Ditolak
      </span>
    );
  }
  const idx = LIFECYCLE.indexOf(status);
  return (
    <span className="inline-flex items-center gap-1">
      {LIFECYCLE.map((s, i) => (
        <span key={s} className="inline-flex items-center gap-1">
          <span
            className={`w-2 h-2 rounded-full ${
              i <= idx ? "bg-accent" : "bg-muted-foreground/25"
            }`}
            title={STATUS_LABEL[s]}
          />
          {i < LIFECYCLE.length - 1 && (
            <span
              className={`w-4 h-px ${
                i < idx ? "bg-accent" : "bg-muted-foreground/25"
              }`}
            />
          )}
        </span>
      ))}
    </span>
  );
};

const ProviderInbox = () => {
  const { participantId, role } = useAuth();
  const { data, isLoading, isError } = useContracts();
  const { data: providers } = useProviders();
  const { data: agreements } = useAgreements();
  const mutation = useUpdateContractStatus();

  // Perjanjian per-contract (ambil yang pertama bila ada).
  const agreementOf = useMemo(() => {
    const m: Record<string, { effective_from: string; effective_to: string; status: string }> = {};
    for (const a of agreements ?? []) if (!m[a.contract_id]) m[a.contract_id] = a;
    return m;
  }, [agreements]);

  const [agrFor, setAgrFor] = useState<ContractItem | null>(null);

  const partName = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of (providers ?? []) as Array<{
      provider_id: string;
      provider_name: string;
    }>)
      m[p.provider_id] = p.provider_name;
    return m;
  }, [providers]);
  const nameOf = (id?: string) =>
    (id && partName[id]) || (id ? `${id.slice(0, 8)}…` : "—");

  // Kontrak yang ditujukan ke SAYA sebagai provider. Superadmin (participantId null)
  // melihat semua (oversight) — bukan improvisasi data, hanya tanpa filter pemilik.
  const contracts = (data ?? []) as ContractItem[];
  const mine = useMemo(
    () =>
      contracts.filter((c) => !participantId || c.provider_id === participantId),
    [contracts, participantId],
  );

  const count = (s: string) => mine.filter((c) => c.status === s).length;
  const overdueCount = mine.filter((c) => dueInfo(c)?.overdue).length;

  // Urut: REQUESTED dulu (perlu tindakan), lalu APPROVED, ACTIVE, REJECTED.
  const ORDER = ["REQUESTED", "APPROVED", "ACTIVE", "REJECTED"];
  const sorted = useMemo(
    () =>
      [...mine].sort(
        (a, b) => ORDER.indexOf(a.status) - ORDER.indexOf(b.status),
      ),
    [mine],
  );

  const [pending, setPending] = useState<PendingAction>(null);

  const confirmAction = async () => {
    if (!pending) return;
    const { contract, status } = pending;
    try {
      await mutation.mutateAsync({
        contract: {
          id: contract.id,
          consumer_id: contract.consumer_id,
          provider_id: contract.provider_id,
          name: contract.name,
        },
        status,
      });
      toast.success(
        status === "APPROVED"
          ? "Permintaan disetujui"
          : status === "ACTIVE"
            ? "Kontrak diaktifkan"
            : "Permintaan ditolak",
      );
      setPending(null);
    } catch (err: unknown) {
      toast.error(getApiErrorMessage(err, "Gagal memperbarui status kontrak"));
    }
  };

  const subtitle =
    role === "PROVIDER"
      ? "Permintaan kontrak data dari SKK Migas yang menunggu tindakan Anda (KKKS)"
      : "Pemantauan permintaan kontrak lintas provider (oversight)";

  // ── Loading ──
  if (isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Permintaan Masuk" subtitle={subtitle} />
        <div className="p-6 space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[0, 1, 2, 3].map((i) => (
              <div key={i} className="stat-card">
                <div className="skeleton h-14" />
              </div>
            ))}
          </div>
          <div className="panel p-4 space-y-3">
            {[0, 1, 2].map((i) => (
              <div key={i} className="skeleton h-14" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Error ──
  if (isError) {
    return (
      <div className="min-h-screen">
        <Header title="Permintaan Masuk" subtitle={subtitle} />
        <div className="flex items-center justify-center h-[60vh]">
          <div className="text-center">
            <AlertCircle className="w-12 h-12 mx-auto text-destructive" />
            <p className="mt-2 text-lg font-medium">Gagal memuat permintaan</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Permintaan Masuk" subtitle={subtitle} />
      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
          {[
            { s: "REQUESTED", label: "Menunggu Persetujuan", icon: Clock, tone: "bg-amber-100 text-amber-700" },
            { s: "APPROVED", label: "Disetujui", icon: CheckCircle2, tone: "bg-blue-100 text-blue-700" },
            { s: "ACTIVE", label: "Aktif", icon: Zap, tone: "bg-emerald-100 text-emerald-700" },
            { s: "REJECTED", label: "Ditolak", icon: XCircle, tone: "bg-rose-100 text-rose-700" },
          ].map(({ s, label, icon: Icon, tone }) => (
            <div key={s} className="stat-card">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${tone}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{count(s)}</p>
                  <p className="text-sm text-muted-foreground">{label}</p>
                </div>
              </div>
            </div>
          ))}
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-rose-100 text-rose-700"><Clock className="w-6 h-6" /></div>
              <div>
                <p className={`text-2xl font-bold ${overdueCount > 0 ? "text-rose-600" : ""}`}>{overdueCount}</p>
                <p className="text-sm text-muted-foreground">Terlambat</p>
              </div>
            </div>
          </div>
        </div>

        {/* Tabel permintaan */}
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>Kontrak</TableHead>
                <TableHead>Pemohon (Consumer)</TableHead>
                <TableHead>Alur</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Tenggat</TableHead>
                <TableHead className="text-right">Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sorted.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={6}
                    className="text-center py-12 text-muted-foreground"
                  >
                    <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Tidak ada permintaan</p>
                    <p className="text-sm">
                      Belum ada kontrak yang ditujukan ke Anda.
                    </p>
                  </TableCell>
                </TableRow>
              ) : (
                sorted.map((c) => {
                  const busy =
                    mutation.isPending && mutation.variables?.contract.id === c.id;
                  const d = dueInfo(c);
                  return (
                    <TableRow key={c.id} className={d?.overdue ? "bg-rose-50/60 hover:bg-rose-50" : "hover:bg-muted/50"}>
                      <TableCell>
                        <div className="min-w-0">
                          <p className="font-medium">{c.name}</p>
                          {c.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1 max-w-md">
                              {c.description}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{nameOf(c.consumer_id)}</span>
                      </TableCell>
                      <TableCell>
                        <StatusTimeline status={c.status} />
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={STATUS_STYLE[c.status] ?? ""}
                        >
                          {STATUS_LABEL[c.status] ?? c.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {!d ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : (
                          <div className="text-xs">
                            <div className={d.overdue ? "text-rose-600 font-medium" : "text-muted-foreground"}>{d.label}</div>
                            {!d.settled && (
                              <div className={d.overdue ? "text-rose-600" : d.daysLeft <= 14 ? "text-amber-600" : "text-muted-foreground"}>
                                {d.overdue ? `terlambat ${Math.abs(d.daysLeft)} hari` : `sisa ${d.daysLeft} hari`}
                              </div>
                            )}
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {busy ? (
                          <Loader2 className="w-4 h-4 animate-spin inline" />
                        ) : c.status === "REQUESTED" ? (
                          <div className="flex gap-2 justify-end">
                            <Button
                              size="sm"
                              className="bg-blue-600 hover:bg-blue-700"
                              onClick={() =>
                                setPending({ contract: c, status: "APPROVED" })
                              }
                            >
                              <Check className="w-4 h-4 mr-1" /> Setujui
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() =>
                                setPending({ contract: c, status: "REJECTED" })
                              }
                            >
                              <X className="w-4 h-4 mr-1" /> Tolak
                            </Button>
                          </div>
                        ) : c.status === "APPROVED" ? (
                          <Button
                            size="sm"
                            className="bg-emerald-600 hover:bg-emerald-700"
                            onClick={() =>
                              setPending({ contract: c, status: "ACTIVE" })
                            }
                          >
                            <Zap className="w-4 h-4 mr-1" /> Aktifkan
                          </Button>
                        ) : c.status === "ACTIVE" ? (
                          agreementOf[c.id] ? (
                            <span className="inline-flex items-center gap-1.5 text-xs text-emerald-700">
                              <CalendarCheck className="w-3.5 h-3.5" />
                              Perjanjian s/d {fmtDate(agreementOf[c.id].effective_to)}
                            </span>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              className="border-accent/40 text-accent hover:bg-accent/10"
                              onClick={() => setAgrFor(c)}
                            >
                              <FileCheck2 className="w-4 h-4 mr-1" /> Buat Perjanjian
                            </Button>
                          )
                        ) : (
                          <span className="text-xs text-muted-foreground italic">
                            selesai
                          </span>
                        )}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </div>
      </div>

      {/* Konfirmasi tindakan */}
      <Dialog open={!!pending} onOpenChange={(o) => !o && setPending(null)}>
        <DialogContent className="sm:max-w-[460px]">
          {pending && (
            <>
              <DialogHeader>
                <DialogTitle>{ACTION_COPY[pending.status].title}</DialogTitle>
                <DialogDescription>
                  {ACTION_COPY[pending.status].desc}
                </DialogDescription>
              </DialogHeader>
              <div className="rounded-lg border border-border bg-muted/30 p-3 text-sm">
                <p className="font-medium">{pending.contract.name}</p>
                <p className="text-muted-foreground mt-1 flex items-center gap-1.5">
                  {nameOf(pending.contract.consumer_id)}
                  <ArrowRight className="w-3.5 h-3.5" />
                  {nameOf(pending.contract.provider_id)}
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPending(null)}>
                  Batal
                </Button>
                <Button
                  className={ACTION_COPY[pending.status].cls}
                  onClick={confirmAction}
                  disabled={mutation.isPending}
                >
                  {mutation.isPending && (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  )}
                  {ACTION_COPY[pending.status].verb}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <CreateAgreementDialog
        open={!!agrFor}
        onOpenChange={(o) => !o && setAgrFor(null)}
        contract={agrFor}
      />
    </div>
  );
};

export default ProviderInbox;
