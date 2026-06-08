import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Inbox, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, UserPlus, ShieldCheck, Mail, UserCheck,
} from "lucide-react";
import { toast } from "sonner";
import { registrationsApi, participantsApi, type RegistrationItem } from "@/api/services/onboarding";
import { usersApi, userCategoriesApi, userGroupsApi } from "@/api/services/identity";
import { contractsApi } from "@/api/services/policy-contract";
import { useProviders } from "@/api/hooks/useProviders";
import { useDomain } from "@/context/DomainContext";
import { DOMAINS } from "@/lib/fulfillment";

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-amber-50 text-amber-700 border-amber-200",
  APPROVED: "bg-emerald-50 text-emerald-700 border-emerald-200",
  REJECTED: "bg-rose-50 text-rose-700 border-rose-200",
};

const slugUser = (email: string, salt: string) => {
  const base = email.split("@")[0].replace(/[^a-zA-Z0-9_.]/g, "").slice(0, 90);
  return (base.length >= 3 ? base : `op_${base}`) + "_" + salt.slice(0, 4);
};
const tempPassword = () =>
  Math.random().toString(36).slice(2, 10) + "Aa1!";

const OnboardingQueue = () => {
  const qc = useQueryClient();
  const { domainId } = useDomain();
  const { data: providers } = useProviders();

  const regQ = useQuery({
    queryKey: ["registrations", "list"],
    queryFn: () => registrationsApi.list(),
  });
  const catQ = useQuery({ queryKey: ["user-categories"], queryFn: () => userCategoriesApi.list() });
  const grpQ = useQuery({ queryKey: ["user-groups"], queryFn: () => userGroupsApi.list() });
  const usersQ = useQuery({ queryKey: ["users", "list"], queryFn: () => usersApi.list() });

  const regs = (regQ.data ?? []) as RegistrationItem[];
  const count = (s: string) => regs.filter((r) => r.status === s).length;

  // Status akun operator: cocokkan via email (UserResponse tak mengekspos participant_id).
  const userByEmail = useMemo(() => {
    const m: Record<string, { is_active?: boolean; is_verified?: boolean }> = {};
    for (const u of (usersQ.data ?? []) as any[]) if (u.email) m[String(u.email).toLowerCase()] = u;
    return m;
  }, [usersQ.data]);
  const operatorStatus = (email: string): "AKTIF" | "BELUM" | "TIDAK_ADA" => {
    const u = userByEmail[email.toLowerCase()];
    if (!u) return "TIDAK_ADA";
    return u.is_active && u.is_verified ? "AKTIF" : "BELUM";
  };

  // referensi untuk orkestrasi
  const providerCat = (catQ.data ?? []).find((c) => c.code === "PROVIDER");
  const providerGrp = (grpQ.data ?? []).find((g) => g.code === "PROVIDER");
  const skkParticipant = useMemo(
    () =>
      (providers ?? []).find(
        (p: any) =>
          (p.organization_type ?? "").toUpperCase().startsWith("GOV") ||
          /skk\s*migas/i.test(p.provider_name ?? ""),
      ),
    [providers],
  );

  const [busy, setBusy] = useState<Record<string, string>>({}); // id -> langkah

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["registrations"] });
    qc.invalidateQueries({ queryKey: ["participants"] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const resend = async (reg: RegistrationItem) => {
    setBusy((b) => ({ ...b, [reg.id]: "kirim ulang" }));
    try {
      await usersApi.resendConfirmation(reg.operator_email);
      toast.success(`Undangan dikirim ulang ke ${reg.operator_email}.`);
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Gagal kirim ulang undangan");
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reg.id]; return n; });
    }
  };

  const reject = async (reg: RegistrationItem) => {
    setBusy((b) => ({ ...b, [reg.id]: "menolak" }));
    try {
      await registrationsApi.update(reg.id, { status: "REJECTED" });
      toast.success("Pendaftaran ditolak.");
      refresh();
    } catch (e: any) {
      toast.error(e?.response?.data?.detail || "Gagal menolak");
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reg.id]; return n; });
    }
  };

  const approve = async (reg: RegistrationItem) => {
    if (!domainId) return toast.error("Domain belum siap.");
    if (!providerCat || !providerGrp)
      return toast.error("Kategori/grup PROVIDER tidak ditemukan di BE.");
    if (!skkParticipant)
      return toast.error("Participant SKK Migas (consumer) tidak ditemukan.");

    const step = (s: string) => setBusy((b) => ({ ...b, [reg.id]: s }));
    try {
      // 1. participant (provider)
      step("buat participant");
      const participant = await participantsApi.create({
        organization_name: reg.organization_name,
        organization_type: "ENTERPRISE",
        address: reg.wilayah_kerja && reg.wilayah_kerja.length >= 3 ? reg.wilayah_kerja : "Indonesia",
        contact_person: {
          name: reg.operator_name,
          email: reg.operator_email,
          phone: reg.operator_phone || "-",
        },
      });

      // 2. user operator (BE kirim email aktivasi otomatis)
      step("buat akun operator");
      await usersApi.create({
        username: slugUser(reg.operator_email, participant.id),
        email: reg.operator_email,
        full_name: reg.operator_name,
        password: tempPassword(),
        category_id: providerCat.id,
        group_id: providerGrp.id,
        participant_id: participant.id,
      });

      // 3. auto-mandate: 5 kontrak REQUESTED (kewajiban 5 domain)
      step("terbitkan 5 kewajiban");
      for (const d of DOMAINS) {
        await contractsApi.create(domainId, {
          consumer_id: skkParticipant.provider_id,
          provider_id: participant.id,
          name: `[${d.label}] Kewajiban Data — ${reg.organization_name}`,
          description: `Kewajiban penyediaan data ${d.label} (${d.sub}) sesuai Juknis SKK Migas.`,
        });
      }

      // 4. tandai APPROVED + simpan participant_id
      step("finalisasi");
      await registrationsApi.update(reg.id, { status: "APPROVED", participant_id: participant.id });

      toast.success(
        `${reg.organization_name} disetujui — akun operator diundang (email), 5 kewajiban diterbitkan.`,
      );
      refresh();
    } catch (e: any) {
      toast.error(
        `Gagal pada langkah "${busy[reg.id] ?? "?"}": ${e?.response?.data?.detail || e?.message || "error"}`,
      );
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reg.id]; return n; });
    }
  };

  if (regQ.isLoading) {
    return (
      <div className="min-h-screen">
        <Header title="Pendaftaran KKKS" subtitle="Verifikasi & onboarding penyedia data" />
        <div className="p-6 space-y-4">
          <div className="panel p-4 space-y-3">{[0,1,2].map((i)=><div key={i} className="skeleton h-12" />)}</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header title="Pendaftaran KKKS" subtitle="Verifikasi pengajuan & terbitkan kewajiban 5 domain (Juknis)" />
      <div className="p-6 space-y-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { s: "PENDING", label: "Menunggu Verifikasi", icon: Clock, tone: "bg-amber-100 text-amber-700" },
            { s: "APPROVED", label: "Disetujui", icon: CheckCircle2, tone: "bg-emerald-100 text-emerald-700" },
            { s: "REJECTED", label: "Ditolak", icon: XCircle, tone: "bg-rose-100 text-rose-700" },
          ].map(({ s, label, icon: Icon, tone }) => (
            <div key={s} className="stat-card">
              <div className="flex items-center gap-4">
                <div className={`p-3 rounded-xl ${tone}`}><Icon className="w-6 h-6" /></div>
                <div><p className="text-2xl font-bold">{count(s)}</p><p className="text-sm text-muted-foreground">{label}</p></div>
              </div>
            </div>
          ))}
          <div className="stat-card">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-xl bg-info/10 text-info"><UserPlus className="w-6 h-6" /></div>
              <div><p className="text-2xl font-bold">{regs.length}</p><p className="text-sm text-muted-foreground">Total Pengajuan</p></div>
            </div>
          </div>
        </div>

        {/* Info alur */}
        <div className="rounded-lg border border-border bg-muted/30 p-3 text-xs text-muted-foreground flex items-start gap-2">
          <ShieldCheck className="w-4 h-4 mt-0.5 text-accent shrink-0" />
          <span>
            "Setujui" otomatis: buat <b>participant (ENTERPRISE)</b> → buat <b>akun operator (PROVIDER)</b> (BE mengirim email aktivasi) → terbitkan <b>5 kontrak kewajiban</b> (REQUESTED). Operator mengaktifkan akun via tautan email lalu memenuhi kewajiban.
          </span>
        </div>

        {/* Tabel */}
        <div className="panel overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="table-header">
                <TableHead>KKKS</TableHead>
                <TableHead>Wilayah Kerja</TableHead>
                <TableHead>Operator</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Akun Operator</TableHead>
                <TableHead className="text-right">Aksi</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {regs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                    <Inbox className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p className="text-lg font-medium">Belum ada pendaftaran</p>
                    <p className="text-sm">KKKS dapat mendaftar mandiri di halaman publik /register-kkks</p>
                  </TableCell>
                </TableRow>
              ) : (
                regs.map((r) => {
                  const b = busy[r.id];
                  return (
                    <TableRow key={r.id} className="hover:bg-muted/50">
                      <TableCell className="font-medium">{r.organization_name}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.wilayah_kerja}</TableCell>
                      <TableCell>
                        <div className="text-sm">{r.operator_name}</div>
                        <div className="text-xs text-muted-foreground">{r.operator_email}</div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className={STATUS_STYLE[r.status] ?? ""}>{r.status}</Badge>
                      </TableCell>
                      <TableCell>
                        {r.status !== "APPROVED" ? (
                          <span className="text-xs text-muted-foreground">—</span>
                        ) : operatorStatus(r.operator_email) === "AKTIF" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-emerald-700 font-medium">
                            <UserCheck className="w-3.5 h-3.5" /> Aktif
                          </span>
                        ) : operatorStatus(r.operator_email) === "BELUM" ? (
                          <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                            <Clock className="w-3.5 h-3.5" /> Belum aktivasi
                          </span>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">akun belum dibuat</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {b ? (
                          <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Loader2 className="w-3.5 h-3.5 animate-spin" /> {b}…
                          </span>
                        ) : r.status === "PENDING" ? (
                          <div className="flex gap-2 justify-end">
                            <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => approve(r)}>
                              <CheckCircle2 className="w-4 h-4 mr-1" /> Setujui &amp; Terbitkan
                            </Button>
                            <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => reject(r)}>
                              <XCircle className="w-4 h-4 mr-1" /> Tolak
                            </Button>
                          </div>
                        ) : r.status === "APPROVED" && operatorStatus(r.operator_email) !== "AKTIF" ? (
                          <Button size="sm" variant="outline" onClick={() => resend(r)}>
                            <Mail className="w-4 h-4 mr-1" /> Kirim Ulang Undangan
                          </Button>
                        ) : (
                          <span className="text-xs text-muted-foreground italic">selesai</span>
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
    </div>
  );
};

export default OnboardingQueue;
