import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Layers, ShieldCheck, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Sparkles, FileText,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { organizationsApi } from "@/api/services/governance";
import { juknisApi, type JuknisApplyResult } from "@/api/services/juknis";
import { useProviders } from "@/api/hooks/useProviders";
import { issueAutoObligationContracts, selectConsumerParticipant } from "@/lib/onboarding-obligations";
import { isValidGovernanceCode, sanitizeGovernanceCode } from "@/lib/governance-code";
import { setPublicOrganizationsCache } from "@/lib/public-organization-cache";

const STEPS = ["Organisasi", "Governance Domain", "Paket Juknis", "Terapkan"];

const LEVELS = [
  { v: "L0", l: "L0 � PUBLIK (penuh)" },
  { v: "L1", l: "L1 � PUBLIK (terbatas)" },
  { v: "L2", l: "L2 � INTERNAL" },
  { v: "L3", l: "L3 � TERBATAS" },
  { v: "L4", l: "L4 � RAHASIA (tidak dipublikasikan)" },
];

const DEFAULT_ROWS = [
  { key: "wilayah_kerja", label: "Wilayah Kerja", sub: "PSC Area", classification: "L1", retention_years: 0 },
  { key: "lapangan", label: "Lapangan", sub: "Field", classification: "L2", retention_years: 5 },
  { key: "fasilitas", label: "Fasilitas", sub: "Facility", classification: "L2", retention_years: 5 },
  { key: "sumur", label: "Sumur", sub: "Well", classification: "L3", retention_years: 5 },
  { key: "seismik", label: "Survei Seismik", sub: "Seismic", classification: "L3", retention_years: 5 },
];

const setupOrgCode = (name: string) => {
  const words = name.trim().split(/\s+/).filter(Boolean);
  if (words.length >= 3) return words.map((word) => word[0]).join("").toUpperCase().slice(0, 20);
  return words.join("").toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20);
};

const sanitizeDomainCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/-{2,}/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 20);

const isValidDomainCode = (value: string) => /^[A-Z0-9_-]{2,20}$/.test(value);

const Stepper = ({ step }: { step: number }) => (
  <div className="flex items-center gap-2 flex-wrap">
    {STEPS.map((s, i) => (
      <div key={s} className="flex items-center gap-2">
        <div
          className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-semibold ${
            i < step ? "bg-emerald-500 text-white" : i === step ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground"
          }`}
        >
          {i < step ? <CheckCircle2 className="w-4 h-4" /> : i + 1}
        </div>
        <span className={`text-sm ${i === step ? "font-semibold" : "text-muted-foreground"}`}>{s}</span>
        {i < STEPS.length - 1 && <ArrowRight className="w-3.5 h-3.5 text-muted-foreground" />}
      </div>
    ))}
  </div>
);

const SetupJuknis = () => {
  const [step, setStep] = useState(0);

  const orgQ = useQuery({ queryKey: ["setup", "orgs"], queryFn: () => organizationsApi.list() });
  const orgs = (orgQ.data ?? []) as Array<{ organization_id: string; organization_name: string }>;
  const [orgId, setOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length > 0) setOrgId(orgs[0].organization_id);
  }, [orgs, orgId]);

  useEffect(() => {
    if (orgs.length === 0) return;
    setPublicOrganizationsCache(
      orgs.map((org) => ({
        id: org.organization_id,
        name: org.organization_name,
      })),
    );
  }, [orgs]);

  const createOrg = async () => {
    if (newOrgName.trim().length < 3) return toast.error("Nama organisasi minimal 3 karakter.");
    setCreatingOrg(true);
    try {
      const trimmedName = newOrgName.trim();
      const created = await organizationsApi.create({
        organization_name: trimmedName,
        code: setupOrgCode(trimmedName),
        description: `Organisasi ${trimmedName} untuk governance dan penerapan paket Juknis.`,
      });
      await orgQ.refetch();
      setOrgId(created.organization_id);
      setNewOrgName("");
      toast.success("Organisasi dibuat.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal membuat organisasi"));
    } finally {
      setCreatingOrg(false);
    }
  };

  const domQ = useQuery({
    queryKey: ["setup", "domains", orgId],
    queryFn: () => organizationsApi.listDomains(orgId),
    enabled: !!orgId,
  });
  const domains = domQ.data ?? [];
  const [domainId, setDomainId] = useState("");
  const [newDomain, setNewDomain] = useState({
    name: "Data Migas Geospasial",
    code: "MIGAS_GEO",
    description: "Domain data geospasial migas SKK Migas untuk paket 5 domain.",
  });
  const [creatingDomain, setCreatingDomain] = useState(false);

  useEffect(() => {
    if (domains.length > 0 && !domainId) setDomainId(domains[0].domain_id);
  }, [domains, domainId]);

  const createDomain = async () => {
    const trimmedName = newDomain.name.trim();
    const trimmedDescription = newDomain.description.trim();
    const sanitizedCode = sanitizeGovernanceCode(newDomain.code);

    if (trimmedName.length < 3 || trimmedDescription.length < 10) {
      return toast.error("Lengkapi nama (>=3) dan deskripsi (>=10).", { duration: 5000 });
    }

    if (!isValidGovernanceCode(sanitizedCode)) {
      return toast.error("Code domain harus 2-20 karakter dan hanya boleh huruf besar, angka, _ atau -.");
    }

    setCreatingDomain(true);
    try {
      const payload = {
        name: trimmedName,
        code: sanitizedCode,
        description: trimmedDescription,
      };
      const createdDomain = await organizationsApi.createDomain(orgId, payload);
      await domQ.refetch();
      setDomainId(createdDomain.domain_id);
      setNewDomain((prev) => ({ ...prev, code: sanitizedCode }));
      toast.success("Governance domain dibuat.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal membuat domain"));
    } finally {
      setCreatingDomain(false);
    }
  };

  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [includeDict, setIncludeDict] = useState(true);
  const setRow = (key: string, patch: Partial<(typeof DEFAULT_ROWS)[number]>) =>
    setRows((currentRows) => currentRows.map((row) => (row.key === key ? { ...row, ...patch } : row)));

  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<JuknisApplyResult | null>(null);
  const { data: providersData } = useProviders();
  const [selectedProviderId, setSelectedProviderId] = useState("");
  const [issuingContracts, setIssuingContracts] = useState(false);
  const overrides = useMemo(() => {
    const mapped: Record<string, { classification: string; retention_years: number }> = {};
    for (const row of rows) {
      mapped[row.key] = {
        classification: row.classification,
        retention_years: row.retention_years,
      };
    }
    return mapped;
  }, [rows]);

  const apply = async () => {
    if (!domainId) return toast.error("Domain belum dipilih.");
    setApplying(true);
    try {
      const res = await juknisApi.apply(domainId, { overrides, include_dictionary: includeDict });
      setResult(res);
      toast.success("Paket Juknis diterapkan.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal menerapkan Juknis"));
    } finally {
      setApplying(false);
    }
  };

  // Opsional: terbitkan kontrak kewajiban per katalog untuk sebuah provider di domain ini,
  // tanpa harus lewat pendaftaran+approval participant. Butuh provider (penyedia) — kalau
  // belum ada, langkah ini dilewati; apply-juknis tetap bisa jalan tanpa provider.
  const providerCandidates = useMemo(
    () =>
      ((providersData ?? []) as Array<{ provider_id: string; provider_name: string; organization_type?: string }>)
        .filter((p) => (p.organization_type ?? "").toUpperCase() === "ENTERPRISE")
        .sort((a, b) => (a.provider_name ?? "").localeCompare(b.provider_name ?? "")),
    [providersData],
  );
  const consumerParticipant = useMemo(
    () => selectConsumerParticipant((providersData ?? []) as Array<{ provider_id: string; provider_name: string; organization_type?: string }>),
    [providersData],
  );

  const issueContracts = async () => {
    if (!domainId) return toast.error("Domain belum dipilih.");
    const provider = providerCandidates.find((p) => p.provider_id === selectedProviderId);
    if (!provider) return toast.error("Pilih provider (penyedia data) dulu.");
    if (!consumerParticipant) {
      return toast.error("Consumer (regulator/SKK Migas) belum terdaftar sebagai participant. Daftarkan dulu.");
    }
    setIssuingContracts(true);
    try {
      const res = await issueAutoObligationContracts({
        domainIds: [domainId],
        consumerId: consumerParticipant.provider_id,
        providerId: provider.provider_id,
        providerName: provider.provider_name,
      });
      toast.success(`Kontrak kewajiban: ${res.created} dibuat, ${res.skipped} dilewati (sudah ada).`);
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal menerbitkan kontrak kewajiban"));
    } finally {
      setIssuingContracts(false);
    }
  };

  const canNext = step === 0 ? !!orgId : step === 1 ? !!domainId : true;

  return (
    <div className="min-h-screen">
      <Header title="Setup Juknis SKK Migas" subtitle="Siapkan tata kelola data (sekali saat instance baru)" />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="panel p-4"><Stepper step={step} /></div>

        {step === 0 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><Building2 className="w-5 h-5 text-accent" /><h3 className="font-semibold">Pilih / Buat Organisasi</h3></div>
            {orgQ.isLoading ? (
              <div className="skeleton h-12" />
            ) : (
              <div className="space-y-3">
                {orgs.length > 0 && (
                  <div className="space-y-2">
                    <Label>Organisasi terdaftar</Label>
                    <Select value={orgId} onValueChange={setOrgId}>
                      <SelectTrigger><SelectValue placeholder="Pilih organisasi" /></SelectTrigger>
                      <SelectContent>
                        {orgs.map((org) => <SelectItem key={org.organization_id} value={org.organization_id}>{org.organization_name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="rounded-lg border border-dashed border-border p-3 space-y-2">
                  <Label className="text-xs text-muted-foreground">Atau buat organisasi baru (mis. SKK Migas)</Label>
                  <div className="flex gap-2">
                    <Input placeholder="Nama organisasi" value={newOrgName} onChange={(e) => setNewOrgName(e.target.value)} />
                    <Button variant="outline" onClick={createOrg} disabled={creatingOrg}>
                      {creatingOrg && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Buat
                    </Button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {step === 1 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><Layers className="w-5 h-5 text-accent" /><h3 className="font-semibold">Governance Domain</h3></div>
            {domains.length > 0 && (
              <div className="space-y-2">
                <Label>Domain terdaftar</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger><SelectValue placeholder="Pilih domain" /></SelectTrigger>
                  <SelectContent>
                    {domains.map((domain) => <SelectItem key={domain.domain_id} value={domain.domain_id}>{domain.domain_name} ({domain.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <Label className="text-xs text-muted-foreground">Atau buat governance domain baru</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Nama" value={newDomain.name} onChange={(e) => setNewDomain((prev) => ({ ...prev, name: e.target.value }))} />
                <Input
                  placeholder="Code"
                  value={newDomain.code}
                  onChange={(e) => setNewDomain((prev) => ({ ...prev, code: sanitizeGovernanceCode(e.target.value) }))}
                />
                <Button variant="outline" onClick={createDomain} disabled={creatingDomain || !orgId}>
                  {creatingDomain && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Buat Domain
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Code domain hanya boleh huruf besar, angka, underscore (`_`) atau dash (`-`), panjang 2-20 karakter.</p>
              <Input
                placeholder="Deskripsi (>=10 karakter)"
                value={newDomain.description}
                onChange={(e) => setNewDomain((prev) => ({ ...prev, description: e.target.value }))}
              />
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-accent" /><h3 className="font-semibold">Paket Juknis - 5 Domain</h3></div>
            <p className="text-sm text-muted-foreground">Semua sudah ter-isi default baku. Anda cukup meninjau, dan boleh menyesuaikan <b>klasifikasi</b> dan <b>masa kerahasiaan (tahun)</b> per domain.</p>
            <div className="space-y-2">
              {rows.map((row) => (
                <div key={row.key} className="grid grid-cols-1 sm:grid-cols-[1fr_200px_160px] gap-3 items-center rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{row.label}</p>
                    <p className="text-xs text-muted-foreground">{row.sub}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Klasifikasi</Label>
                    <Select value={row.classification} onValueChange={(value) => setRow(row.key, { classification: value })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{LEVELS.map((level) => <SelectItem key={level.v} value={level.v}>{level.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Kerahasiaan (thn)</Label>
                    <Input type="number" min={0} className="h-9" value={row.retention_years} onChange={(e) => setRow(row.key, { retention_years: Number(e.target.value) })} />
                  </div>
                </div>
              ))}
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={includeDict} onChange={(e) => setIncludeDict(e.target.checked)} />
              Sertakan kamus data (vocabulary + schema atribut wajib SIGI per domain)
            </label>
          </div>
        )}

        {step === 3 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent" /><h3 className="font-semibold">Terapkan Paket Juknis</h3></div>
            {!result ? (
              <>
                <p className="text-sm text-muted-foreground">
                  Akan membuat dataset-policy + contract-policy{includeDict ? " + vocabulary + schema" : ""} untuk 5 domain pada domain terpilih. Aman diulang (idempoten).
                </p>
                <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={apply} disabled={applying}>
                  {applying ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                  Terapkan Juknis
                </Button>
              </>
            ) : (
              <div className="space-y-3">
                <div className="flex items-center gap-2 text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                  <CheckCircle2 className="w-5 h-5" /> Paket Juknis diterapkan - platform siap menerima KKKS.
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Dataset-policy", result.dataset_policies_created],
                    ["Contract-policy", result.contract_policies_created],
                    ["Vocabulary", result.vocabularies_created],
                    ["Schema", result.schemas_created],
                  ].map(([label, total]) => (
                    <div key={label as string} className="stat-card"><p className="text-2xl font-bold">{total as number}</p><p className="text-xs text-muted-foreground">{label}</p></div>
                  ))}
                </div>
                {result.errors?.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {result.errors.length} item dilewati (kemungkinan sudah ada): {result.errors.slice(0, 3).join(", ")}...
                  </div>
                )}
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-xs text-slate-600 space-y-1">
                  <p className="font-semibold text-slate-700">Domain ini sudah siap governance.</p>
                  <p>
                    Policy + schema sudah terpasang di <strong>level domain</strong> (tidak terikat ke participant). Anda bisa <strong>langsung publish dataset</strong> di domain ini —
                    cukup pilih participant penyedia saat publish. <strong>Tidak perlu menunggu</strong> pendaftaran/approval participant, dan participant tidak wajib di-bind ke domain ini dulu.
                  </p>
                  <p className="text-slate-500">Pendaftaran penyedia (participant) adalah langkah terpisah untuk otorisasi &amp; visibilitas, bukan syarat publish.</p>
                </div>

                {/* Opsional: terbitkan kontrak kewajiban per katalog untuk provider pilihan */}
                <div className="space-y-2 rounded-lg border border-slate-200 p-3">
                  <div className="flex items-center gap-2 text-sm font-semibold text-slate-700">
                    <FileText className="w-4 h-4 text-accent" /> Terbitkan Kontrak Kewajiban (opsional)
                  </div>
                  {providerCandidates.length === 0 ? (
                    <p className="text-xs text-muted-foreground">
                      Belum ada provider (penyedia) terdaftar. Langkah ini dilewati — domain tetap siap. Kontrak kewajiban bisa diterbitkan nanti
                      di sini setelah ada provider, atau otomatis saat participant di-approve.
                    </p>
                  ) : (
                    <>
                      <p className="text-xs text-muted-foreground">
                        Membuat 5 kontrak kewajiban (satu per katalog) di domain ini untuk provider terpilih — tanpa menunggu approval participant.
                        {consumerParticipant ? "" : " Catatan: consumer (SKK Migas) belum terdaftar sebagai participant, terbitkan kontrak belum bisa jalan."}
                      </p>
                      <div className="flex flex-wrap items-center gap-2">
                        <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                          <SelectTrigger className="h-9 w-[260px]"><SelectValue placeholder="Pilih provider penyedia data" /></SelectTrigger>
                          <SelectContent>
                            {providerCandidates.map((p) => (
                              <SelectItem key={p.provider_id} value={p.provider_id}>{p.provider_name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        <Button
                          variant="outline"
                          onClick={() => void issueContracts()}
                          disabled={issuingContracts || !selectedProviderId || !consumerParticipant}
                        >
                          {issuingContracts ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
                          Terbitkan Kontrak
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              </div>
            )}
          </div>
        )}

        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((currentStep) => Math.max(0, currentStep - 1))} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setStep((currentStep) => currentStep + 1)} disabled={!canNext}>
              Lanjut <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          ) : (
            <span className="text-xs text-muted-foreground">{result ? "Selesai." : "Klik Terapkan Juknis."}</span>
          )}
        </div>
      </div>
    </div>
  );
};

export default SetupJuknis;
