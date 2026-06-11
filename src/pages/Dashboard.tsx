import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Database, Users, FileSignature, Shield, Lock, Globe,
  CheckCircle2, Activity, Layers, Inbox, Sparkles, ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell, PieChart, Pie, Legend, CartesianGrid,
} from "recharts";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuditLogs } from "@/api/hooks/useAuditLogs";
import { useContracts } from "@/api/hooks/useContracts";
import { useTransfers } from "@/api/hooks/useTransfers";
import { usePolicies } from "@/api/hooks/usePolicies";
import { useDomain } from "@/context/DomainContext";
import { useAuth } from "@/context/AuthContext";
import { FulfillmentMatrix } from "@/components/dashboard/FulfillmentMatrix";
import { ProviderFulfillment } from "@/components/dashboard/ProviderFulfillment";
import { DOMAINS, cellInfo, type DomainKey } from "@/lib/fulfillment";
import type { ContractItem } from "@/api/services/policy-contract";
import type { Dataset } from "@/api/types/data-catalog";

const DOMAIN_LABELS: Record<string, string> = {
  wilayah_kerja: "Wilayah Kerja", sumur: "Sumur", lapangan: "Lapangan", fasilitas: "Fasilitas", seismik: "Seismik",
};
const DOMAIN_ORDER = Object.keys(DOMAIN_LABELS);

// Klasifikasi L0–L4 (warna + label + apakah publik)
const LEVEL_META: Record<string, { label: string; color: string; public: boolean }> = {
  L0: { label: "L0 · PUBLIK (penuh)", color: "hsl(142 71% 40%)", public: true },
  L1: { label: "L1 · PUBLIK (terbatas)", color: "hsl(160 70% 42%)", public: true },
  L2: { label: "L2 · INTERNAL", color: "hsl(199 89% 48%)", public: false },
  L3: { label: "L3 · TERBATAS", color: "hsl(38 92% 50%)", public: false },
  L4: { label: "L4 · RAHASIA", color: "hsl(350 80% 55%)", public: false },
};
const LEVEL_ORDER = ["L0", "L1", "L2", "L3", "L4"];
const LEVEL_BADGE: Record<string, string> = {
  L0: "bg-emerald-50 text-emerald-700 border-emerald-200",
  L1: "bg-teal-50 text-teal-700 border-teal-200",
  L2: "bg-sky-50 text-sky-700 border-sky-200",
  L3: "bg-amber-50 text-amber-700 border-amber-200",
  L4: "bg-rose-50 text-rose-700 border-rose-200",
};

const CONTRACT_STATUS = ["REQUESTED", "APPROVED", "ACTIVE", "REJECTED"] as const;
const CONTRACT_COLOR: Record<string, string> = {
  REQUESTED: "bg-amber-500", APPROVED: "bg-blue-500", ACTIVE: "bg-emerald-500", REJECTED: "bg-rose-500",
};

const inferDomain = (d: Dataset): string | undefined => {
  if (d.domain) return d.domain;
  const name = (d.dataset_name || "").toLowerCase();
  return DOMAIN_ORDER.find((k) => name.includes(DOMAIN_LABELS[k].toLowerCase()));
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 shadow-md text-xs">
      <p className="font-semibold mb-0.5">{label ?? payload[0].name}</p>
      <p className="text-muted-foreground">{payload[0].name === undefined ? "" : ""}{payload[0].value} dataset</p>
    </div>
  );
};

const EmptyBox = ({ text }: { text: string }) => (
  <div className="h-full min-h-[180px] flex flex-col items-center justify-center text-muted-foreground gap-2">
    <Inbox className="w-8 h-8 opacity-40" />
    <p className="text-sm">{text}</p>
  </div>
);

const Dashboard = () => {
  const { domainName, ready } = useDomain();
  const { role, user, participantId } = useAuth();
  const isProvider = role === "PROVIDER";
  const isAdmin = role === "SUPER_ADMIN" || role === "ADMIN";
  const organizationName = user?.category?.name || "Organisasi belum terhubung";

  const dsQ = useDatasets();
  const { data: providersData } = useProviders();
  const { data: auditData } = useAuditLogs();
  const { data: contractsData } = useContracts();
  const { data: transfersData } = useTransfers();
  const { data: policiesData } = usePolicies();

  const loading = !ready || dsQ.isLoading;
  const datasets = useMemo(() => dsQ.data ?? [], [dsQ.data]);
  const contracts = (contractsData ?? []) as ContractItem[];
  const transfers = transfersData ?? [];
  const policies = policiesData ?? [];
  const participants = providersData ?? [];

  // First-run: admin, domain sudah siap diresolve, tetapi Juknis belum diterapkan
  // (tak ada dataset-policy) → pandu ke Setup Juknis (daftarkan 5 domain).
  const needsSetup = isAdmin && ready && policies.length === 0;

  // KKKS (penyedia) = participant ber-tipe ENTERPRISE
  const kkks = useMemo(
    () =>
      (participants as Array<{ provider_id: string; provider_name: string; organization_type?: string }>)
        .filter((p) => (p.organization_type ?? "").toUpperCase() === "ENTERPRISE")
        .map((p) => ({ provider_id: p.provider_id, provider_name: p.provider_name })),
    [participants],
  );

  const isFulfilled = (s: string) => s === "AKTIF" || s === "TERKIRIM";

  // Cakupan pemenuhan agregat (consumer): sel terpenuhi / total sel
  const { coveragePct, kkksFull, sentTotal } = useMemo(() => {
    let active = 0;
    let full = 0;
    let sent = 0;
    for (const p of kkks) {
      let f = 0;
      for (const d of DOMAINS) {
        const info = cellInfo(p.provider_id, d.key as DomainKey, datasets, contracts, transfers);
        if (isFulfilled(info.stage)) f++;
        if (info.stage === "TERKIRIM") sent++;
      }
      active += f;
      if (f === DOMAINS.length) full++;
    }
    const total = kkks.length * DOMAINS.length;
    return { coveragePct: total ? Math.round((active / total) * 100) : 0, kkksFull: full, sentTotal: sent };
  }, [kkks, datasets, contracts, transfers]);

  // Pemenuhan KKKS yang sedang login (provider)
  const myFulfilled = useMemo(
    () =>
      participantId
        ? DOMAINS.filter((d) =>
            isFulfilled(cellInfo(participantId, d.key as DomainKey, datasets, contracts, transfers).stage),
          ).length
        : 0,
    [participantId, datasets, contracts, transfers],
  );
  const mySent = useMemo(
    () =>
      participantId
        ? DOMAINS.filter(
            (d) => cellInfo(participantId, d.key as DomainKey, datasets, contracts, transfers).stage === "TERKIRIM",
          ).length
        : 0,
    [participantId, datasets, contracts, transfers],
  );
  const pendingRequests = contracts.filter(
    (c) => c.provider_id === participantId && (c.status === "REQUESTED" || c.status === "APPROVED"),
  ).length;

  // Pemandu first-run KKKS: tahap berikutnya yang harus dijalankan provider.
  // Hanya tampil bila punya kontrak kewajiban (KKKS yang baru di-onboard punya 5).
  const providerGuide: null | {
    done?: boolean; step?: string; title: string; desc: string; to?: string; cta?: string;
  } = !isProvider || contracts.length === 0
    ? null
    : pendingRequests > 0
      ? {
          step: "Langkah 1 — Tindak kewajiban",
          title: `Anda punya ${pendingRequests} kewajiban data yang perlu ditindak`,
          desc: "Setujui & aktifkan kontrak kewajiban (lalu buat Perjanjian) di Permintaan Masuk.",
          to: "/inbox",
          cta: "Buka Permintaan Masuk",
        }
      : mySent < 5
        ? {
            step: "Langkah 2 — Kirim data",
            title: `Kirim data Anda — ${mySent}/5 domain terkirim`,
            desc: "Tautkan dataset & kirim ke SKK Migas di Transfer Data agar kewajiban terpenuhi.",
            to: "/transfers",
            cta: "Buka Transfer Data",
          }
        : {
            done: true,
            title: "Semua kewajiban data terpenuhi (5/5)",
            desc: "Seluruh domain telah terkirim. Terima kasih atas kepatuhannya.",
          };

  const byDomain = useMemo(
    () => DOMAIN_ORDER.map((k) => ({ name: DOMAIN_LABELS[k], total: datasets.filter((d) => inferDomain(d) === k).length })),
    [datasets],
  );
  const sparkData = byDomain.map((d) => d.total);

  // ── Klasifikasi L0–L4: dari dataset.level (field description GX-Space) ──
  const levelOf = (d: Dataset): string | undefined => d.level;

  // Distribusi dataset per level L0–L4
  const classMix = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const d of datasets) {
      const lvl = levelOf(d) ?? "?";
      counts[lvl] = (counts[lvl] ?? 0) + 1;
    }
    return LEVEL_ORDER
      .filter((l) => counts[l] > 0)
      .map((l) => ({ name: LEVEL_META[l].label, value: counts[l], color: LEVEL_META[l].color }));
  }, [datasets]);
  const publicShare = datasets.length
    ? Math.round((datasets.filter((d) => { const l = levelOf(d); return l && LEVEL_META[l]?.public; }).length / datasets.length) * 100)
    : 0;

  const domainsCovered = byDomain.filter((d) => d.total > 0).length;
  const publishedCount = datasets.filter((d) => d.status === "published").length;
  const activeContracts = contracts.filter((c) => c.status === "ACTIVE").length;
  const contractCounts = CONTRACT_STATUS.map((s) => ({ status: s, n: contracts.filter((c) => c.status === s).length }));
  const maxContract = Math.max(1, ...contractCounts.map((c) => c.n));
  const recentAudit = (auditData ?? []).slice(0, 6) as Array<{ audit_id?: string; action?: string; session_id?: string; timestamp?: string }>;

  // ── Hero ──
  const heroChips = isProvider
    ? [{ label: "Dataset", v: datasets.length }, { label: "Published", v: publishedCount }, { label: "Contract Aktif", v: activeContracts }]
    : [{ label: "Dataset", v: datasets.length }, { label: "Contract Aktif", v: activeContracts }, { label: "KKKS", v: participants.length }];

  const Hero = (
    <div className="hero-gradient rounded-2xl p-6 text-white shadow-soft">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-white/60 text-sm">Selamat datang,</p>
          <h2 className="text-2xl font-bold">{user?.full_name ?? "Pengguna"}</h2>
          <div className="flex items-center gap-2 mt-2">
            <span className="text-xs px-2 py-0.5 rounded-full bg-amber/20 text-amber-glow border border-amber/30">
              {isProvider ? "KKKS · Provider" : "SKK Migas"}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
              Org: {organizationName}
            </span>
            <span className="text-xs px-2 py-0.5 rounded-full bg-white/10 text-white/80 border border-white/10">
              Domain: {domainName ?? "—"}
            </span>
          </div>
        </div>
        <div className="flex gap-3">
          {heroChips.map((c) => (
            <div key={c.label} className="px-4 py-3 rounded-xl bg-white/8 border border-white/10 text-center min-w-[84px]">
              <div className="text-2xl font-bold">{loading ? "—" : c.v}</div>
              <div className="text-[11px] text-white/60 mt-0.5">{c.label}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title={isProvider ? "Dashboard KKKS" : "Dashboard SKK Migas"} subtitle="Memuat data..." />
        <div className="p-6 space-y-6">
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-32 rounded-xl" />)}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Skeleton className="h-72 rounded-xl lg:col-span-2" />
            <Skeleton className="h-72 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      <Header
        title={isProvider ? "Dashboard KKKS" : "Dashboard SKK Migas"}
        subtitle={`Ringkasan pertukaran data · Domain: ${domainName ?? "—"}`}
      />
      <div className="p-6 space-y-6">
        {/* Panduan first-run: arahkan SKK Migas mendaftarkan 5 domain Juknis */}
        {needsSetup && (
          <div className="rounded-2xl border border-amber-300 bg-gradient-to-r from-amber-50 to-orange-50 p-5 shadow-soft">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-amber-500 text-white">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Langkah 1 — Persiapan</p>
                  <h3 className="text-lg font-bold text-amber-900">Setup Juknis belum dijalankan</h3>
                  <p className="mt-1 text-sm text-amber-800/90">
                    Daftarkan <strong>5 domain data sesuai Juknis</strong> (Wilayah Kerja · Lapangan ·
                    Fasilitas · Sumur · Survei Seismik) beserta klasifikasi L0–L4, kamus data, dan
                    kebijakan. Tanpa langkah ini, halaman Katalog/Kontrak/Transfer masih kosong.
                  </p>
                </div>
              </div>
              <Link
                to="/setup-juknis"
                className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-amber-500 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-amber-600"
              >
                Mulai Setup Juknis <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
          </div>
        )}

        {/* Panduan first-run KKKS: tahap berikutnya (tindak kewajiban → kirim data) */}
        {providerGuide && (
          providerGuide.done ? (
            <div className="rounded-2xl border border-emerald-300 bg-gradient-to-r from-emerald-50 to-teal-50 p-5 shadow-soft">
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-emerald-500 text-white">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-emerald-900">{providerGuide.title}</h3>
                  <p className="mt-1 text-sm text-emerald-800/90">{providerGuide.desc}</p>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-2xl border border-sky-300 bg-gradient-to-r from-sky-50 to-indigo-50 p-5 shadow-soft">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg bg-sky-600 text-white">
                    <Sparkles className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wider text-sky-700">{providerGuide.step}</p>
                    <h3 className="text-lg font-bold text-sky-900">{providerGuide.title}</h3>
                    <p className="mt-1 text-sm text-sky-800/90">{providerGuide.desc}</p>
                  </div>
                </div>
                {providerGuide.to && (
                  <Link
                    to={providerGuide.to}
                    className="inline-flex flex-shrink-0 items-center gap-2 rounded-lg bg-sky-600 px-4 py-2.5 text-sm font-semibold text-white shadow hover:bg-sky-700"
                  >
                    {providerGuide.cta} <ArrowRight className="h-4 w-4" />
                  </Link>
                )}
              </div>
            </div>
          )
        )}

        {Hero}

        {/* KPI */}
        {isProvider ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="Domain Terpenuhi" value={`${myFulfilled}/5`} trend={{ label: `${Math.round((myFulfilled / 5) * 100)}%`, dir: myFulfilled === 5 ? "up" : "flat" }} change={`${mySent}/5 data terkirim`} icon={CheckCircle2} iconColor="bg-success/10 text-success" />
            <StatCard title="Dataset Published" value={publishedCount} change={`${datasets.length} total dataset`} icon={Database} iconColor="bg-accent/10 text-accent" spark={sparkData} />
            <StatCard title="Kontrak Aktif" value={activeContracts} change="status ACTIVE" icon={FileSignature} iconColor="bg-info/10 text-info" />
            <StatCard title="Permintaan Menunggu" value={pendingRequests} change="perlu ditindak (Inbox)" icon={Inbox} iconColor="bg-amber-100 text-amber-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard title="KKKS Terpantau" value={kkks.length} change="penyedia data (provider)" icon={Users} iconColor="bg-accent/10 text-accent" />
            <StatCard title="Cakupan Pemenuhan" value={`${coveragePct}%`} trend={{ label: `${coveragePct}%`, dir: coveragePct >= 80 ? "up" : coveragePct > 0 ? "flat" : "down" }} change={`${sentTotal} sel data terkirim`} icon={CheckCircle2} iconColor="bg-success/10 text-success" />
            <StatCard title="KKKS Lengkap (5/5)" value={kkksFull} change={`dari ${kkks.length} KKKS`} icon={Layers} iconColor="bg-purple-100 text-purple-600" />
            <StatCard title="Kontrak Aktif" value={activeContracts} change={`${contracts.length} total kontrak`} icon={FileSignature} iconColor="bg-info/10 text-info" />
          </div>
        )}

        {/* ★ Matriks pemenuhan — pusat dashboard, beda per peran */}
        {isProvider ? (
          <ProviderFulfillment providerId={participantId} datasets={datasets} contracts={contracts} transfers={transfers} />
        ) : (
          <FulfillmentMatrix providers={kkks} datasets={datasets} contracts={contracts} transfers={transfers} />
        )}

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="lg:col-span-2 panel">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Layers className="w-4 h-4 text-accent" /> Dataset per Domain</CardTitle></CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 240 }}>
                {datasets.length === 0 ? <EmptyBox text="Belum ada dataset di domain ini" /> : (
                  <ResponsiveContainer>
                    <BarChart data={byDomain} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
                      <defs>
                        <linearGradient id="barAmber" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor="hsl(38 92% 55%)" />
                          <stop offset="100%" stopColor="hsl(38 92% 50% / 0.45)" />
                        </linearGradient>
                      </defs>
                      <CartesianGrid vertical={false} stroke="hsl(216 24% 90%)" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} interval={0} angle={-12} textAnchor="end" height={48} axisLine={false} tickLine={false} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} axisLine={false} tickLine={false} width={28} />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: "hsl(38 92% 50% / 0.06)" }} />
                      <Bar dataKey="total" radius={[6, 6, 0, 0]} fill="url(#barAmber)" maxBarSize={48} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="panel">
            <CardHeader className="pb-2">
              <CardTitle className="text-base flex items-center gap-2"><Lock className="w-4 h-4 text-accent" /> Klasifikasi L0–L4</CardTitle>
              <p className="text-xs text-muted-foreground">{publicShare}% dataset publik (L0/L1)</p>
            </CardHeader>
            <CardContent>
              <div style={{ width: "100%", height: 220 }}>
                {classMix.length === 0 ? <EmptyBox text="Belum ada klasifikasi" /> : (
                  <ResponsiveContainer>
                    <PieChart>
                      <Pie data={classMix} dataKey="value" nameKey="name" innerRadius={54} outerRadius={82} paddingAngle={3} stroke="none">
                        {classMix.map((e) => <Cell key={e.name} fill={e.color} />)}
                      </Pie>
                      <Legend verticalAlign="bottom" height={36} iconType="circle" wrapperStyle={{ fontSize: 11 }} />
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Detail */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <Card className="panel">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><FileSignature className="w-4 h-4 text-accent" /> Status Contract</CardTitle></CardHeader>
            <CardContent className="space-y-3 pt-2">
              {contractCounts.map((c) => (
                <div key={c.status} className="space-y-1">
                  <div className="flex justify-between text-xs"><span className="text-muted-foreground">{c.status}</span><span className="font-semibold">{c.n}</span></div>
                  <div className="h-2 rounded-full bg-muted overflow-hidden">
                    <div className={`h-full rounded-full ${CONTRACT_COLOR[c.status]} transition-all`} style={{ width: `${(c.n / maxContract) * 100}%` }} />
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card className="lg:col-span-2 panel">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="w-4 h-4 text-accent" /> Aktivitas Terbaru</CardTitle></CardHeader>
            <CardContent className="pt-2">
              {recentAudit.length === 0 ? <EmptyBox text="Belum ada aktivitas audit" /> : (
                <ul className="divide-y divide-border">
                  {recentAudit.map((a, i) => (
                    <li key={a.audit_id ?? i} className="flex items-start gap-3 py-2.5 first:pt-0">
                      <div className="p-1.5 rounded-md bg-accent/10 text-accent mt-0.5"><Activity className="w-3.5 h-3.5" /></div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{a.action}</p>
                        <p className="text-xs text-muted-foreground">{a.session_id} · {a.timestamp ? new Date(a.timestamp).toLocaleString() : "—"}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Role-specific */}
        {isProvider ? (
          <Card className="panel">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Globe className="w-4 h-4 text-accent" /> Data Saya yang Dapat Dikonsumsi</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {datasets.map((d) => {
                  const lvl = levelOf(d);
                  return (
                  <div key={d.dataset_id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <div className="min-w-0">
                      <p className="text-sm font-medium truncate">{d.dataset_name}</p>
                      <p className="text-xs text-muted-foreground">{d.protocol ?? "—"} · {d.schema_name}</p>
                    </div>
                    <Badge variant="outline" className={lvl ? (LEVEL_BADGE[lvl] ?? "") : ""} title={lvl ? LEVEL_META[lvl]?.label : ""}>
                      {lvl ?? (d.access_type === "PUBLIC" ? "Publik" : "Privat")}
                    </Badge>
                  </div>
                  );
                })}
                {datasets.length === 0 && <EmptyBox text="Belum ada dataset" />}
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="panel">
            <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Users className="w-4 h-4 text-accent" /> Participants</CardTitle></CardHeader>
            <CardContent className="pt-2">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {participants.map((p: { provider_id: string; provider_name: string; organization_type?: string; status?: string }) => (
                  <div key={p.provider_id} className="p-3 rounded-lg border border-border hover:bg-muted/40 transition-colors">
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-semibold truncate">{p.provider_name}</p>
                      <Badge variant="outline" className="text-[10px]">{p.status ?? "—"}</Badge>
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{p.organization_type ?? "—"}</p>
                  </div>
                ))}
                {participants.length === 0 && <EmptyBox text="Belum ada participant" />}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
