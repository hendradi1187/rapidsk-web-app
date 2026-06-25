import { useMemo, useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { Pager } from "@/components/common/Pager";
import { Badge } from "@/components/ui/badge";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Inbox, CheckCircle2, XCircle, Clock, Loader2, AlertCircle, UserPlus, ShieldCheck, Mail, UserCheck, ExternalLink,
} from "lucide-react";
import { toast } from "sonner";
import { registrationsApi, participantsApi, type RegistrationItem } from "@/api/services/onboarding";
import { usersApi, userCategoriesApi, userGroupsApi } from "@/api/services/identity";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import {
  bindParticipantToOrganizationDomains,
  issueAutoObligationContracts,
  selectConsumerParticipant,
  resolveGovernanceOrganization,
  rankConsumerCandidate,
} from "@/lib/onboarding-obligations";
import { getApiErrorMessage } from "@/lib/api-error";

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

type OnboardingUserRow = {
  email?: string;
  is_active?: boolean;
  is_verified?: boolean;
};

type ProviderRow = {
  provider_id: string;
  provider_name: string;
  organization_type?: string;
};

const RegistrationsTab = () => {
  const qc = useQueryClient();
  const { user } = useAuth();
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
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);
  const count = (s: string) => regs.filter((r) => r.status === s).length;
  const pagedRegs = useMemo(
    () => regs.slice((page - 1) * pageSize, page * pageSize),
    [regs, page, pageSize],
  );
  useEffect(() => setPage(1), [regs.length, pageSize]);

  // Status akun operator: cocokkan via email (UserResponse tak mengekspos participant_id).
  const userByEmail = useMemo(() => {
    const m: Record<string, { is_active?: boolean; is_verified?: boolean }> = {};
    for (const u of (usersQ.data ?? []) as OnboardingUserRow[]) {
      if (u.email) m[String(u.email).toLowerCase()] = u;
    }
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
  const preferredConsumerName = user?.category?.name ?? null;
  const consumerParticipants = useMemo(
    () =>
      ((providers ?? []) as ProviderRow[])
        .sort((left, right) => rankConsumerCandidate(right) - rankConsumerCandidate(left)),
    [providers],
  );
  const skkParticipant = useMemo(
    () => selectConsumerParticipant(consumerParticipants, preferredConsumerName),
    [consumerParticipants, preferredConsumerName],
  );

  const [busy, setBusy] = useState<Record<string, string>>({}); // id -> langkah

  const refresh = () => {
    qc.invalidateQueries({ queryKey: ["registrations"] });
    qc.invalidateQueries({ queryKey: ["participants"] });
    qc.invalidateQueries({ queryKey: ["providers"] });
    qc.invalidateQueries({ queryKey: ["contracts"] });
    qc.invalidateQueries({ queryKey: ["users"] });
  };

  const resend = async (reg: RegistrationItem) => {
    setBusy((b) => ({ ...b, [reg.id]: "kirim ulang" }));
    try {
      await usersApi.resendConfirmation(reg.operator_email);
      toast.success(`Undangan dikirim ulang ke ${reg.operator_email}.`);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal kirim ulang undangan"));
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
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal menolak"));
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reg.id]; return n; });
    }
  };

  const approve = async (reg: RegistrationItem) => {
    if (!providerCat || !providerGrp)
      return toast.error("Kategori/grup PROVIDER tidak ditemukan di BE.");
    if (!skkParticipant)
      return toast.error(
        "Participant consumer/regulator belum ada. Buat dulu participant regulator di /participants, misalnya SKK Migas atau GOV_CENTRAL, baru approval registrasi bisa menerbitkan 5 kewajiban.",
        { duration: 9000 },
      );

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

      // 2. sync governance org + domain binding participant
      step("sync governance org");
      const governanceOrg = await resolveGovernanceOrganization(reg);
      const organizationDomainIds = await bindParticipantToOrganizationDomains(
        participant.id,
        governanceOrg.organization_id,
      );

      // 3. user operator (BE kirim email aktivasi otomatis)
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

      // 4. auto-mandate: 5 kontrak per domain Juknis yang terpasang
      step("terbitkan kewajiban");
      const targetDomainIds = organizationDomainIds.length > 0
        ? organizationDomainIds
        : (domainId ? [domainId] : []);
      if (targetDomainIds.length === 0) {
        throw new Error("Domain Juknis belum tersedia untuk organisasi ini. Jalankan setup domain dulu sebelum approval.");
      }
      await issueAutoObligationContracts({
        domainIds: targetDomainIds,
        consumerId: skkParticipant.provider_id,
        providerId: participant.id,
        providerName: reg.organization_name,
      });

      // 5. tandai APPROVED + simpan participant_id
      step("finalisasi");
      await registrationsApi.update(reg.id, { status: "APPROVED", participant_id: participant.id });

      toast.success(
        `${reg.organization_name} disetujui — akun operator diundang dan kewajiban kontrak otomatis diterbitkan.`,
      );
      refresh();
    } catch (e: unknown) {
      toast.error(
        `Gagal pada langkah "${busy[reg.id] ?? "?"}": ${getApiErrorMessage(e, "error")}`,
      );
    } finally {
      setBusy((b) => { const n = { ...b }; delete n[reg.id]; return n; });
    }
  };

  if (regQ.isLoading) {
    return (
      <div className="space-y-4">
        <div className="panel p-4 space-y-3">{[0,1,2].map((i)=><div key={i} className="skeleton h-12" />)}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
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
          <div className="flex w-full flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <span>
              "Setujui" otomatis: buat <b>participant (ENTERPRISE)</b> → buat <b>akun operator (PROVIDER)</b> (BE mengirim email aktivasi) → terbitkan <b>5 kontrak kewajiban</b> (REQUESTED). Operator mengaktifkan akun via tautan email lalu memenuhi kewajiban.
            </span>
            <Link to="/register-kkks" className="shrink-0">
              <Button variant="outline" size="sm">
                <ExternalLink className="mr-2 h-4 w-4" />
                Form Publik KKKS
              </Button>
            </Link>
          </div>
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
                    <Link to="/register-kkks" className="mt-4 inline-flex">
                      <Button variant="outline">
                        <ExternalLink className="mr-2 h-4 w-4" />
                        Buka /register-kkks
                      </Button>
                    </Link>
                  </TableCell>
                </TableRow>
              ) : (
                pagedRegs.map((r) => {
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
          <div className="px-4 pb-4">
            <Pager
              page={page}
              total={regs.length}
              pageSize={pageSize}
              onPage={setPage}
              onPageSize={setPageSize}
            />
          </div>
        </div>
    </div>
  );
};

export default RegistrationsTab;
