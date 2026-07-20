/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BookOpen,
  CheckCircle2,
  Database,
  Globe,
  Loader2,
  Plus,
  Shield,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AdapterFlowWizard,
  type AdapterWizardState,
} from "@/components/settings/AdapterFlowWizard";
import { AdapterCollectionsUsage } from "@/components/settings/AdapterCollectionsUsage";
import {
  useParticipantAdapters,
  useAddParticipantAdapter,
  useUpdateParticipantAdapter,
  useDeleteParticipantAdapter,
  useParticipantDomains,
} from "@/api/hooks/useProviders";
import { useProviders } from "@/api/hooks/useProviders";
import { useOrganizations, useOrganizationDomains } from "@/api/hooks/useOrganizations";
import { useAuth } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { useRuntime } from "@/context/RuntimeContext";
import { getApiErrorMessage } from "@/lib/api-error";
import { DOMAINS } from "@/lib/fulfillment";
import {
  getPreferredOrganizationId,
  getPreferredOrganizationName,
} from "@/lib/session-binding";
import { canManageAdapters } from "@/lib/feature-access";

const DOMAIN_CODE_BY_KEY = {
  wilayah_kerja: "WK",
  lapangan: "FLD",
  seismik: "SEI",
  sumur: "WLL",
  fasilitas: "FP",
} as const;

const normalizeBindingKey = (value: string | null | undefined) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const isValidHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === "http:" || parsed.protocol === "https:";
  } catch {
    return false;
  }
};

type AdapterTab = "source" | "ingest" | "koleksi" | "alamat";

// Badge status kecil di tiap trigger tab (✓ selesai / ● langkah aktif / angka).
function TabBadge({ state }: { state: "done" | "active" | string }) {
  if (state === "done") {
    return (
      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-emerald-100 px-1 text-[10px] font-bold text-emerald-700">
        ✓
      </span>
    );
  }
  if (state === "active") {
    return (
      <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-sky-100 px-1 text-[10px] font-bold text-sky-700">
        ●
      </span>
    );
  }
  return (
    <span className="ml-1.5 inline-flex h-4 min-w-4 items-center justify-center rounded-full bg-slate-100 px-1 text-[10px] font-bold text-slate-500">
      {state}
    </span>
  );
}

const AdapterData = () => {
  const navigate = useNavigate();
  const { participantId, role, roles, user, hasPermission } = useAuth();
  const { domainId, availableDomains, domainSource } = useDomain();
  const { runtimeConfig } = useRuntime();
  const { data: providersData } = useProviders();
  const { data: organizationsData } = useOrganizations();
  // Registrasi "Alamat Adapter" di-scope per-participant (useParticipantAdapters(participantId)):
  // operator yang TERIKAT participant adalah pemilik sah alamat adapter participant-nya. Ingest/
  // koneksi/preview di halaman ini juga tidak digerbang izin, jadi menahan HANYA registrasi itu
  // inkonsisten. Longgarkan: role/permission ATAU punya participant aktif. BE tetap penentu akhir (403).
  const canManageAdapterActions = canManageAdapters({ role, roles, hasPermission }) || !!participantId;

  const isProvider = role === "PROVIDER";

  // ── Adapter registration (Alamat Adapter per Domain) — hanya PROVIDER/admin ──
  const { data: adaptersData, isLoading: loadingAdapters, refetch: refetchAdapters } =
    useParticipantAdapters(participantId ?? "");
  const {
    data: participantDomainsData,
    isLoading: isLoadingParticipantDomains,
  } = useParticipantDomains(participantId ?? "");
  const addAdapterMutation = useAddParticipantAdapter();
  const updateAdapterMutation = useUpdateParticipantAdapter();
  const deleteAdapterMutation = useDeleteParticipantAdapter();

  const [adapterDialog, setAdapterDialog] = useState(false);
  const [editingAdapter, setEditingAdapter] = useState<any>(null);
  const [adapterForm, setAdapterForm] = useState({
    domain_id: domainId ?? "",
    type: "GIS_STUDIO",
    url: "",
  });
  const [connTestStatus, setConnTestStatus] = useState<Record<string, "idle" | "checking" | "ok" | "error">>({});
  // Kamus istilah = slide-over kanan.
  const [kamusOpen, setKamusOpen] = useState(false);
  // Tab terkontrol — semua panel selalu mounted, non-aktif disembunyikan (hidden).
  const [tab, setTab] = useState<AdapterTab>("source");
  // Status wizard (badge tab + context strip) di-export lewat callback dari wizard.
  const [wizardState, setWizardState] = useState<AdapterWizardState | null>(null);

  const currentParticipant = useMemo(
    () => ((providersData ?? []) as Array<any>).find((item) => item.provider_id === participantId) ?? null,
    [providersData, participantId],
  );

  const preferredOrganizationId = getPreferredOrganizationId();
  const preferredOrganizationName = getPreferredOrganizationName();

  const activeGovernanceOrganization = useMemo(() => {
    const organizations = (organizationsData ?? []) as Array<any>;
    const participantNameKey = normalizeBindingKey(
      currentParticipant?.organization_name ?? currentParticipant?.provider_name,
    );
    const preferredNameKey = normalizeBindingKey(preferredOrganizationName);

    return (
      organizations.find((item) => item.organization_id === preferredOrganizationId) ??
      organizations.find((item) => normalizeBindingKey(item.organization_name) === preferredNameKey) ??
      organizations.find((item) => normalizeBindingKey(item.organization_name) === participantNameKey) ??
      null
    );
  }, [currentParticipant, organizationsData, preferredOrganizationId, preferredOrganizationName]);

  const {
    data: governanceDomainsData,
    isLoading: isLoadingGovernanceDomains,
  } = useOrganizationDomains(activeGovernanceOrganization?.organization_id ?? null);

  const governanceDomainFallbackActive =
    domainSource === "governance_fallback" ||
    (
      !isLoadingParticipantDomains &&
      ((participantDomainsData ?? []) as Array<any>).length === 0 &&
      ((governanceDomainsData ?? []) as Array<any>).length > 0
    );

  const effectiveParticipantDomainsData = governanceDomainFallbackActive
    ? ((governanceDomainsData ?? []) as Array<any>)
    : ((participantDomainsData ?? []) as Array<any>);

  const resolveDomainKey = (item: any) =>
    String(item?.domain_id ?? item?.domain?.key ?? item?.domain?.id ?? "").trim();

  const resolveDomainLabel = (item: any, domainKey: string) => {
    const matched = DOMAINS.find((domain) => domain.key === domainKey);
    if (matched?.label) {
      return matched.sub ? `${matched.label} (${matched.sub})` : matched.label;
    }

    const directLabel = String(
      item?.domain_name ??
        item?.domain?.label ??
        item?.domain?.name ??
        item?.name ??
        domainKey,
    ).trim();

    const directCode = String(item?.code ?? item?.domain?.code ?? "").trim();
    if (!directLabel) {
      return "Domain belum dikenali";
    }

    return directCode && directCode !== directLabel
      ? `${directLabel} (${directCode})`
      : directLabel;
  };

  const resolveDomainCode = (item: any, domainKey: string) => {
    const directCode = String(item?.code ?? item?.domain?.code ?? "").trim().toUpperCase();
    if (["WK", "FLD", "SEI", "WLL", "FP"].includes(directCode)) {
      return directCode as "WK" | "FLD" | "SEI" | "WLL" | "FP";
    }

    if (domainKey in DOMAIN_CODE_BY_KEY) {
      return DOMAIN_CODE_BY_KEY[domainKey as keyof typeof DOMAIN_CODE_BY_KEY];
    }

    const matchedDomain = DOMAINS.find((domain) => domain.key === domainKey);
    if (matchedDomain?.key && matchedDomain.key in DOMAIN_CODE_BY_KEY) {
      return DOMAIN_CODE_BY_KEY[matchedDomain.key as keyof typeof DOMAIN_CODE_BY_KEY];
    }

    return "";
  };

  const participantDomainOptions = useMemo(() => {
    const isUuid = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s);
    const lookupDomainName = (uuid: string) =>
      availableDomains.find((d) => d.domain_id === uuid)?.domain_name ?? null;

    return effectiveParticipantDomainsData
      .map((item) => {
        const value = resolveDomainKey(item);
        if (!value) return null;

        const domainKey = String(item?.domain?.key ?? item?.key ?? "").trim();
        let rawLabel = resolveDomainLabel(item, value);
        let rawName = String(
          item?.domain_name ??
          item?.domain?.label ??
          item?.domain?.name ??
          item?.name ??
          rawLabel,
        ).trim();

        if (isUuid(rawLabel)) {
          rawLabel = lookupDomainName(rawLabel) ?? lookupDomainName(value) ?? rawLabel;
        }
        if (isUuid(rawName)) {
          rawName = lookupDomainName(rawName) ?? lookupDomainName(value) ?? rawName;
        }

        return {
          value,
          label: rawLabel,
          domainCode: resolveDomainCode(item, domainKey || value),
          domainName: rawName || rawLabel,
        };
      })
      .filter(Boolean) as Array<{ value: string; label: string; domainCode: "WK" | "FLD" | "SEI" | "WLL" | "FP" | ""; domainName: string }>;
  }, [effectiveParticipantDomainsData, availableDomains]);

  const canOpenParticipantDomainSetup = Boolean(participantId);

  const testAdapterConn = async (id: string, url: string) => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk mengelola jalur adapter.");
      return;
    }
    setConnTestStatus((p) => ({ ...p, [id]: "checking" }));
    try {
      await fetch(url, { method: "HEAD", mode: "no-cors" });
      setConnTestStatus((p) => ({ ...p, [id]: "ok" }));
    } catch {
      setConnTestStatus((p) => ({ ...p, [id]: "error" }));
    }
  };

  const openAddAdapter = () => {
    if (!canManageAdapterActions) return;
    setEditingAdapter(null);
    const fallbackDomain =
      resolveDomainKey(
        effectiveParticipantDomainsData.find((item) => resolveDomainKey(item) === domainId),
      ) ??
      resolveDomainKey(effectiveParticipantDomainsData[0]) ??
      domainId ??
      "";
    setAdapterForm({ domain_id: fallbackDomain, type: "GIS_STUDIO", url: "" });
    setAdapterDialog(true);
  };
  const openEditAdapter = (a: any) => {
    if (!canManageAdapterActions) return;
    setEditingAdapter(a);
    setAdapterForm({ domain_id: a.domain_id ?? "", type: a.type ?? "GIS_STUDIO", url: a.endpoint?.url ?? "" });
    setAdapterDialog(true);
  };
  const saveAdapter = async () => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk menyimpan jalur adapter.");
      return;
    }
    if (!participantId) return toast.error("Akun tidak terhubung ke participant.");
    if (!adapterForm.domain_id) return toast.error("Pilih domain terlebih dahulu.");
    const trimmedAdapterUrl = adapterForm.url.trim();
    if (!trimmedAdapterUrl) return toast.error("URL endpoint wajib diisi.");
    if (!isValidHttpUrl(trimmedAdapterUrl)) {
      return toast.error("URL endpoint adapter harus berupa http/https yang valid.");
    }
    try {
      const body = {
        domain_id: adapterForm.domain_id,
        type: "GIS_STUDIO",
        endpoint: { url: trimmedAdapterUrl },
      };
      if (editingAdapter) {
        await updateAdapterMutation.mutateAsync({ participantId, id: editingAdapter.id, body });
        toast.success("Adapter diperbarui.");
      } else {
        await addAdapterMutation.mutateAsync({ participantId, body });
        toast.success("Adapter ditambahkan.");
      }
      setAdapterDialog(false);
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal simpan adapter"));
    }
  };
  const removeAdapter = async (id: string) => {
    if (!canManageAdapterActions) {
      toast.error("Akun ini belum punya izin untuk menghapus jalur adapter.");
      return;
    }
    if (!participantId) return;
    try {
      await deleteAdapterMutation.mutateAsync({ participantId, id });
      toast.success("Adapter dihapus.");
      refetchAdapters();
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal hapus adapter"));
    }
  };

  const adapterEndpoint = runtimeConfig?.adapterEndpoint ?? "";
  const adapterReady = Boolean(adapterEndpoint.trim());
  const isWizardTab = tab === "source" || tab === "ingest";

  // Badge status tiap tab dari status wizard.
  const st = wizardState?.statuses;
  const sourceBadge: "done" | "active" | string =
    st && st.step1 === "done" && st.step2 === "done"
      ? "done"
      : st && (st.nextStep === 1 || st.nextStep === 2)
        ? "active"
        : "①②";
  const ingestBadge: "done" | "active" | string =
    st?.step3 === "done" ? "done" : st?.nextStep === 3 ? "active" : "③";
  const koleksiBadge: "done" | "active" | string = st?.step4 === "done" ? "done" : "④";
  const alamatCount = (adaptersData ?? []).length;

  // Context strip
  const stripDomain = wizardState?.selectedDomainLabel ?? "—";
  const stripCode = wizardState?.effectiveDomainCode || "—";

  useEffect(() => {
    // Domain tanpa binding → tab default tetap "source" supaya banner konteks tampil.
    if (!participantId && tab !== "source") setTab("source");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [participantId]);

  return (
    <div className="min-h-screen">
      <Header
        title="Adapter Data"
        subtitle="Ambil data dari sumber, beri kategori, simpan jadi koleksi siap pakai untuk Dataset"
      />
      <div className="space-y-5 p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-[260px] flex-1">
            <h2 className="text-xl font-semibold tracking-tight text-slate-900">Adapter — Ingest Data</h2>
            <p className="mt-1 text-sm text-slate-500">
              Ambil data dari sumber (GeoServer/ArcGIS/file), beri kategori, simpan jadi koleksi siap pakai untuk Dataset.
            </p>
          </div>
          <Button type="button" variant="outline" size="sm" onClick={() => setKamusOpen(true)}>
            <BookOpen className="mr-2 h-4 w-4" /> Kamus istilah
          </Button>
        </div>

        {/* Banner kondisional (dipertahankan dari perilaku existing) */}
        {!adapterReady && (
          <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            Service adapter belum diisi di deployment config. Bagian ini memang dipegang admin, jadi provider baru bisa jalan penuh setelah endpoint service dilengkapi.
          </div>
        )}
        {governanceDomainFallbackActive && (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Domain kerja yang tampil di halaman ini masih berasal dari organisasi governance aktif, belum dari binding participant yang tersimpan. Provider tetap bisa melihat konteks kerjanya, tetapi sinkronisasi domain participant masih perlu dibereskan dari sisi admin.
          </div>
        )}
        {!governanceDomainFallbackActive && !isLoadingParticipantDomains && !isLoadingGovernanceDomains && participantDomainOptions.length === 0 && !activeGovernanceOrganization && (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-900">
            Organisasi aktif untuk participant ini belum kebaca. Login harus memakai organisasi yang benar, atau admin perlu mengikat participant ke organization governance dulu.
          </div>
        )}

        {/* Context strip (Domain · Kategori · Status adapter) */}
        <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 shadow-sm">
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Domain</span>
            <span className="text-[13px] font-semibold text-slate-800">{stripDomain}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Kategori</span>
            <span className="rounded bg-slate-100 px-1.5 py-0.5 font-mono text-[12px] font-semibold text-slate-700">{stripCode}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Service adapter</span>
            {adapterReady ? (
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-700">✓ terhubung</span>
            ) : (
              <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-0.5 text-[11px] font-semibold text-rose-700">✗ belum</span>
            )}
          </div>
          {!!participantId && <Badge variant="outline" className="text-[11px]">Participant aktif</Badge>}
        </div>

        <Tabs value={tab} onValueChange={(v) => setTab(v as AdapterTab)} className="space-y-5">
          <TabsList className="bg-muted">
            <TabsTrigger value="source">Sumber &amp; Layer <TabBadge state={sourceBadge} /></TabsTrigger>
            <TabsTrigger value="ingest">Ingest <TabBadge state={ingestBadge} /></TabsTrigger>
            <TabsTrigger value="koleksi">Koleksi <TabBadge state={koleksiBadge} /></TabsTrigger>
            <TabsTrigger value="alamat">Alamat Adapter <TabBadge state={String(alamatCount)} /></TabsTrigger>
          </TabsList>

          {/* Panel Sumber & Layer + Ingest — SATU instance wizard, selalu mounted, hidden-toggled.
              activeSection dari tab aktif; state (koneksi/layer/form) bertahan lintas semua tab. */}
          <div hidden={!isWizardTab}>
            <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
              <div className="min-w-0">
                <AdapterFlowWizard
                  participantId={participantId}
                  adapterEndpoint={adapterEndpoint}
                  domainOptions={participantDomainOptions}
                  activeSection={tab === "ingest" ? "ingest" : "source-layer"}
                  onStateChange={setWizardState}
                />
              </div>
              <aside className="xl:sticky xl:top-24 xl:self-start">
                <div className="rounded-2xl border border-slate-200 bg-slate-50/70 p-4">
                  <p className="text-[11px] font-bold uppercase tracking-[0.06em] text-slate-500">Panduan singkat</p>
                  <ol className="mt-3 space-y-3 text-[12.5px] leading-relaxed text-slate-600">
                    <li>
                      <b className="text-slate-900">① Hubungkan sumber</b>
                      <br />Pilih GeoServer/ArcGIS/GeoJSON/Shapefile, daftarkan koneksi (cukup sekali per server).
                    </li>
                    <li>
                      <b className="text-slate-900">② Pilih layer</b>
                      <br />Klik "Ambil layer", pilih layer bergeometri. Layer pertama yang bisa di-ingest terpilih otomatis.
                    </li>
                    <li>
                      <b className="text-slate-900">③ Ingest</b>
                      <br />Kategori &amp; klasifikasi terisi otomatis dari domain. Klik "Ingest" — hasil masuk tab <b>Koleksi</b>.
                    </li>
                  </ol>
                  <div className="mt-4 rounded-xl border border-dashed border-sky-200 bg-sky-50/60 px-3 py-2.5 text-[12px] text-slate-600">
                    <b className="text-sky-800">Yang wajib cuma 3:</b> pilih sumber → pilih layer → klik Ingest. Sisanya otomatis.
                  </div>
                  <p className="mt-3 text-[12px] text-slate-500">
                    Tombol Simpan/Ingest tidak memindah tab — hasil &amp; error muncul di tab yang sama.
                  </p>
                </div>
              </aside>
            </div>
          </div>

          {/* Panel Koleksi — hasil ingest yang tersimpan (dipakai modul Dataset). */}
          <div hidden={tab !== "koleksi"}>
            <AdapterCollectionsUsage adapterEndpoint={adapterEndpoint} domainOptions={participantDomainOptions} />
          </div>

          {/* Panel Alamat Adapter per Domain — registrasi participant adapter. */}
          <div hidden={tab !== "alamat"}>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="w-5 h-5" /> Alamat Adapter per Domain
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-semibold text-slate-500">OPSIONAL</span>
                  </CardTitle>
                  <CardDescription>
                    <b>Tidak wajib.</b> Semua domain sudah otomatis dilayani <b>service adapter</b> yang terhubung
                    (yang ✓ di strip atas — URL yang di-set admin di Deployment). Bagian ini <b>cuma</b> untuk kasus langka:
                    satu domain dilayani adapter di <b>host yang berbeda</b>. Kalau semua domain pakai adapter yang sama,
                    biarkan kosong — Preview Data di Transfer tetap jalan.
                  </CardDescription>
                </div>
                <Button onClick={openAddAdapter} disabled={!canManageAdapterActions || !participantId || participantDomainOptions.length === 0}>
                  <Plus className="w-4 h-4 mr-2" /> Tambah Alamat
                </Button>
              </CardHeader>
              {(!canManageAdapterActions || !participantId || participantDomainOptions.length === 0) && (
                <div className="mx-6 mb-1 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
                  Tombol "Tambah Alamat" nonaktif karena:{" "}
                  {!participantId
                    ? "akun ini belum terhubung ke participant — hubungkan dulu lewat onboarding participant."
                    : participantDomainOptions.length === 0
                      ? "participant ini belum punya domain — pasang domain dulu di data participant."
                      : "akun ini belum punya izin mengelola alamat adapter. Minta admin menambahkan role PROVIDER atau permission adapter."}
                </div>
              )}
              <CardContent>
                {!participantId && (
                  <div className="flex items-center gap-2 text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    <Shield className="w-4 h-4" /> Akun ini belum terhubung ke participant, jadi jalur data belum bisa diatur.
                  </div>
                )}

                {!!participantId && participantDomainOptions.length === 0 && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
                    <div className="flex items-start gap-2">
                      <Shield className="mt-0.5 w-4 h-4" />
                      <div className="space-y-3">
                        <div>
                          <p className="font-medium">Domain participant belum ada.</p>
                          <p className="mt-1">
                            {isProvider
                              ? "Jalur data belum bisa dibuat karena participant ini belum dipasangi domain. Lengkapi dulu dari sisi admin."
                              : "Jalur data belum bisa dibuat sebelum domain ditambahkan ke participant ini."}
                          </p>
                          <p className="mt-1">
                            {isProvider
                              ? "Provider cukup menunggu domain participant dipasang, lalu kembali ke sini untuk lanjut isi jalur data."
                              : "Pengaturannya ada di data participant, bagian domain."}
                          </p>
                        </div>
                        {!isProvider && canOpenParticipantDomainSetup ? (
                          <Button
                            type="button"
                            variant="outline"
                            className="border-amber-300 bg-white text-amber-900 hover:bg-amber-100"
                            onClick={() => navigate(`/participants/${participantId}?tab=domains`)}
                          >
                            Buka Pengaturan Domain
                          </Button>
                        ) : (
                          <p className="text-xs">Hubungi admin untuk melengkapi domain participant terlebih dahulu.</p>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {loadingAdapters && (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground py-4">
                    <Loader2 className="w-4 h-4 animate-spin" /> Memuat jalur data...
                  </div>
                )}

                {!loadingAdapters && (adaptersData ?? []).length === 0 && participantId && (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50/60 px-4 py-6 text-center">
                    <CheckCircle2 className="w-8 h-8 mx-auto mb-2 text-emerald-500" />
                    <p className="text-sm font-medium text-emerald-800">Tidak ada yang perlu diisi di sini</p>
                    <p className="text-xs mt-1 text-emerald-700/90">
                      Semua domain sudah dilayani service adapter yang terhubung. Tambahkan alamat khusus <b>hanya</b> kalau
                      ada domain yang adapternya di host berbeda.
                    </p>
                  </div>
                )}

                <div className="space-y-3">
                  {(adaptersData ?? []).map((a: any) => {
                    const domainLabel = DOMAINS.find((d) => d.key === a.domain_id || d.key === a.domain?.key)?.label ?? a.domain_id ?? "—";
                    const connSt = connTestStatus[a.id] ?? "idle";
                    return (
                      <div key={a.id} className="flex items-center gap-3 rounded-lg border border-border bg-muted/30 p-3">
                        <div className="flex-1 min-w-0 space-y-1">
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge variant="outline" className="text-xs">{domainLabel}</Badge>
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700 border-amber-200">{a.type ?? "GIS_STUDIO"}</Badge>
                            {connSt === "ok" && <Badge variant="outline" className="text-xs bg-emerald-50 text-emerald-700 border-emerald-200">Online</Badge>}
                            {connSt === "error" && <Badge variant="outline" className="text-xs bg-rose-50 text-rose-700 border-rose-200">Tidak tersambung</Badge>}
                          </div>
                          <p className="text-xs font-mono text-muted-foreground truncate">{a.endpoint?.url ?? "—"}</p>
                        </div>
                        <div className="flex items-center gap-1.5 shrink-0">
                          <Button size="sm" variant="outline" className="h-7 text-xs"
                            onClick={() => testAdapterConn(a.id, a.endpoint?.url ?? "")}
                            disabled={!canManageAdapterActions || connSt === "checking"}
                          >
                            {connSt === "checking"
                              ? <Loader2 className="w-3 h-3 animate-spin" />
                              : <Globe className="w-3 h-3" />}
                            <span className="ml-1">Test</span>
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs" onClick={() => openEditAdapter(a)} disabled={!canManageAdapterActions}>
                            Edit
                          </Button>
                          <Button size="sm" variant="outline" className="h-7 text-xs text-rose-600 border-rose-200 hover:bg-rose-50"
                            onClick={() => removeAdapter(a.id)} disabled={!canManageAdapterActions}>
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {(adaptersData ?? []).length > 0 && (
                  <div className="mt-4 rounded-lg bg-muted/40 border border-border p-3 text-xs text-muted-foreground space-y-1">
                    <p className="font-medium text-foreground">Catatan:</p>
                    <p>Satu alamat per domain sudah cukup. Ini hanya menimpa tujuan untuk domain tsb; kalau kosong, dipakai service adapter default.</p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </Tabs>

        {/* Kamus istilah: slide-over kanan */}
        <Sheet open={kamusOpen} onOpenChange={setKamusOpen}>
          <SheetContent side="right" className="w-[min(380px,92vw)] overflow-y-auto">
            <SheetHeader>
              <SheetTitle>Kamus istilah</SheetTitle>
            </SheetHeader>
            <div className="mt-2 divide-y divide-border">
              {[
                ["Layer", 'Satu kumpulan data di server sumber (mis. "Peta WK Migas Konvensional"). 1 layer = 1 ingest.'],
                ["Ingest", "Ambil data dari sumber → periksa → simpan ke adapter."],
                ["Validasi", "Tahap pemeriksaan geometri & atribut di dalam proses ingest."],
                ["Task", "Satu pekerjaan ingest yang bisa dipantau statusnya (SUCCESS/FAILED)."],
                ["Koleksi", "Hasil ingest yang sudah tersimpan, dikelompokkan per kategori. Inilah yang dipakai modul Dataset."],
                ["Kategori", "Kotak baku SKK: WK · FLD · SEI · WLL · FP. Kamu yang memilih saat ingest — bukan deteksi otomatis."],
                ["Klasifikasi", "Tingkat kerahasiaan data, L0 (terbuka) – L4 (rahasia)."],
                ["Alamat adapter", "URL adapter yang didaftarkan per domain; dipakai tombol Preview Data di Transfer."],
              ].map(([term, def]) => (
                <div key={term} className="py-3">
                  <p className="text-[13px] font-semibold text-foreground">{term}</p>
                  <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{def}</p>
                </div>
              ))}
            </div>
          </SheetContent>
        </Sheet>

        {/* Dialog registrasi Alamat Adapter */}
        <Dialog open={adapterDialog && canManageAdapterActions} onOpenChange={setAdapterDialog}>
          <DialogContent className="sm:max-w-[460px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editingAdapter ? "Ubah Alamat Adapter" : "Tambah Alamat Adapter"}</DialogTitle>
              <DialogDescription>
                Daftarkan URL adapter untuk domain tertentu — dipakai Preview Data di Transfer.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-2">
              <div className="space-y-2">
                <Label>Domain</Label>
                <Select value={adapterForm.domain_id} onValueChange={(v) => setAdapterForm((f) => ({ ...f, domain_id: v }))}>
                  <SelectTrigger><SelectValue placeholder="Pilih domain" /></SelectTrigger>
                  <SelectContent>
                    {participantDomainOptions.map((domain) => (
                      <SelectItem key={domain.value} value={domain.value}>
                        {domain.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">Hanya domain yang memang sudah terikat ke participant yang bisa dipakai di sini.</p>
              </div>
              <div className="space-y-2">
                <Label>Tipe Adapter</Label>
                <Input value="GIS_STUDIO" disabled className="bg-muted" />
                <p className="text-xs text-muted-foreground">Jenis jalur data dikunci mengikuti flow yang sudah dipakai saat ini.</p>
              </div>
              <div className="space-y-2">
                <Label>Endpoint URL *</Label>
                <Input
                  value={adapterForm.url}
                  onChange={(e) => setAdapterForm((f) => ({ ...f, url: e.target.value }))}
                  placeholder="https://adapter.kkks.co.id/api/v1"
                />
                <p className="text-xs text-muted-foreground">Masukkan alamat layanan yang akan dipakai dataset pada domain ini.</p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setAdapterDialog(false)}>Batal</Button>
              <Button onClick={saveAdapter}
                disabled={
                  !canManageAdapterActions ||
                  addAdapterMutation.isPending ||
                  updateAdapterMutation.isPending ||
                  !adapterForm.url ||
                  !adapterForm.domain_id
                }>
                {(addAdapterMutation.isPending || updateAdapterMutation.isPending) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {editingAdapter ? "Simpan Perubahan" : "Tambah Jalur"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default AdapterData;
