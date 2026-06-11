import { useEffect, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/Header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Building2, Layers, ShieldCheck, CheckCircle2, Loader2, ArrowRight, ArrowLeft, Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { getApiErrorMessage } from "@/lib/api-error";
import { organizationsApi } from "@/api/services/governance";
import { juknisApi, type JuknisApplyResult } from "@/api/services/juknis";

const STEPS = ["Organisasi", "Governance Domain", "Paket Juknis", "Terapkan"];

const LEVELS = [
  { v: "L0", l: "L0 · PUBLIK (penuh)" },
  { v: "L1", l: "L1 · PUBLIK (terbatas)" },
  { v: "L2", l: "L2 · INTERNAL" },
  { v: "L3", l: "L3 · TERBATAS" },
  { v: "L4", l: "L4 · RAHASIA (tidak dipublikasikan)" },
];

// default paket Juknis (selaras BE)
const DEFAULT_ROWS = [
  { key: "wilayah_kerja", label: "Wilayah Kerja", sub: "PSC Area", classification: "L1", retention_years: 0 },
  { key: "lapangan", label: "Lapangan", sub: "Field", classification: "L2", retention_years: 5 },
  { key: "fasilitas", label: "Fasilitas", sub: "Facility", classification: "L2", retention_years: 5 },
  { key: "sumur", label: "Sumur", sub: "Well", classification: "L3", retention_years: 5 },
  { key: "seismik", label: "Survei Seismik", sub: "Seismic", classification: "L3", retention_years: 5 },
];

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

  // Step 1 — Organisasi
  const orgQ = useQuery({ queryKey: ["setup", "orgs"], queryFn: () => organizationsApi.list() });
  const orgs = (orgQ.data ?? []) as Array<{ organization_id: string; organization_name: string }>;
  const [orgId, setOrgId] = useState("");
  const [newOrgName, setNewOrgName] = useState("");
  const [creatingOrg, setCreatingOrg] = useState(false);

  useEffect(() => {
    if (!orgId && orgs.length > 0) setOrgId(orgs[0].organization_id);
  }, [orgs, orgId]);

  const createOrg = async () => {
    if (newOrgName.trim().length < 3) return toast.error("Nama organisasi minimal 3 karakter.");
    setCreatingOrg(true);
    try {
      await organizationsApi.create({ organization_name: newOrgName.trim() });
      await orgQ.refetch();
      setNewOrgName("");
      toast.success("Organisasi dibuat.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal membuat organisasi"));
    } finally {
      setCreatingOrg(false);
    }
  };

  // Step 2 — Domain
  const domQ = useQuery({
    queryKey: ["setup", "domains", orgId],
    queryFn: () => organizationsApi.listDomains(orgId),
    enabled: !!orgId,
  });
  const domains = domQ.data ?? [];
  const [domainId, setDomainId] = useState("");
  const [newDomain, setNewDomain] = useState({ name: "Data Migas Geospasial", code: "MIGAS-GEO", description: "Domain data geospasial migas SKK Migas (5 domain)." });
  const [creatingDomain, setCreatingDomain] = useState(false);

  useEffect(() => {
    if (domains.length > 0 && !domainId) setDomainId(domains[0].domain_id);
  }, [domains, domainId]);

  const createDomain = async () => {
    if (newDomain.name.length < 3 || newDomain.code.length < 2 || newDomain.description.length < 10)
      return toast.error("Lengkapi nama (≥3), code (≥2), deskripsi (≥10).");
    setCreatingDomain(true);
    try {
      const d = await organizationsApi.createDomain(orgId, newDomain);
      await domQ.refetch();
      setDomainId(d.domain_id);
      toast.success("Governance domain dibuat.");
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, "Gagal membuat domain"));
    } finally {
      setCreatingDomain(false);
    }
  };

  // Step 3 — Paket Juknis
  const [rows, setRows] = useState(DEFAULT_ROWS);
  const [includeDict, setIncludeDict] = useState(true);
  const setRow = (key: string, patch: Partial<(typeof DEFAULT_ROWS)[number]>) =>
    setRows((rs) => rs.map((r) => (r.key === key ? { ...r, ...patch } : r)));

  // Step 4 — Terapkan
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<JuknisApplyResult | null>(null);
  const overrides = useMemo(() => {
    const o: Record<string, { classification: string; retention_years: number }> = {};
    for (const r of rows) o[r.key] = { classification: r.classification, retention_years: r.retention_years };
    return o;
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

  const canNext = step === 0 ? !!orgId : step === 1 ? !!domainId : true;

  return (
    <div className="min-h-screen">
      <Header title="Setup Juknis SKK Migas" subtitle="Siapkan tata kelola data (sekali saat instance baru)" />
      <div className="p-6 space-y-6 max-w-4xl">
        <div className="panel p-4"><Stepper step={step} /></div>

        {/* STEP 1 */}
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
                        {orgs.map((o) => <SelectItem key={o.organization_id} value={o.organization_id}>{o.organization_name}</SelectItem>)}
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

        {/* STEP 2 */}
        {step === 1 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><Layers className="w-5 h-5 text-accent" /><h3 className="font-semibold">Governance Domain</h3></div>
            {domains.length > 0 && (
              <div className="space-y-2">
                <Label>Domain terdaftar</Label>
                <Select value={domainId} onValueChange={setDomainId}>
                  <SelectTrigger><SelectValue placeholder="Pilih domain" /></SelectTrigger>
                  <SelectContent>
                    {domains.map((d) => <SelectItem key={d.domain_id} value={d.domain_id}>{d.domain_name} ({d.code})</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="rounded-lg border border-dashed border-border p-3 space-y-3">
              <Label className="text-xs text-muted-foreground">Atau buat governance domain baru</Label>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                <Input placeholder="Nama" value={newDomain.name} onChange={(e) => setNewDomain({ ...newDomain, name: e.target.value })} />
                <Input placeholder="Code" value={newDomain.code} onChange={(e) => setNewDomain({ ...newDomain, code: e.target.value })} />
                <Button variant="outline" onClick={createDomain} disabled={creatingDomain || !orgId}>
                  {creatingDomain && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Buat Domain
                </Button>
              </div>
              <Input placeholder="Deskripsi (≥10 karakter)" value={newDomain.description} onChange={(e) => setNewDomain({ ...newDomain, description: e.target.value })} />
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div className="panel p-6 space-y-4">
            <div className="flex items-center gap-2"><ShieldCheck className="w-5 h-5 text-accent" /><h3 className="font-semibold">Paket Juknis — 5 Domain</h3></div>
            <p className="text-sm text-muted-foreground">Semua sudah ter-isi default baku. Anda cukup meninjau, dan boleh menyesuaikan <b>klasifikasi</b> & <b>masa kerahasiaan (tahun)</b> per domain.</p>
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={r.key} className="grid grid-cols-1 sm:grid-cols-[1fr_200px_160px] gap-3 items-center rounded-lg border border-border p-3">
                  <div>
                    <p className="font-medium text-sm">{r.label}</p>
                    <p className="text-xs text-muted-foreground">{r.sub}</p>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Klasifikasi</Label>
                    <Select value={r.classification} onValueChange={(v) => setRow(r.key, { classification: v })}>
                      <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                      <SelectContent>{LEVELS.map((l) => <SelectItem key={l.v} value={l.v}>{l.l}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label className="text-[10px] text-muted-foreground">Kerahasiaan (thn)</Label>
                    <Input type="number" min={0} className="h-9" value={r.retention_years} onChange={(e) => setRow(r.key, { retention_years: Number(e.target.value) })} />
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

        {/* STEP 4 */}
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
                  <CheckCircle2 className="w-5 h-5" /> Paket Juknis diterapkan — platform siap menerima KKKS.
                </div>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    ["Dataset-policy", result.dataset_policies_created],
                    ["Contract-policy", result.contract_policies_created],
                    ["Vocabulary", result.vocabularies_created],
                    ["Schema", result.schemas_created],
                  ].map(([l, n]) => (
                    <div key={l as string} className="stat-card"><p className="text-2xl font-bold">{n as number}</p><p className="text-xs text-muted-foreground">{l}</p></div>
                  ))}
                </div>
                {result.errors?.length > 0 && (
                  <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg p-3">
                    {result.errors.length} item dilewati (kemungkinan sudah ada): {result.errors.slice(0, 3).join(", ")}…
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between">
          <Button variant="outline" onClick={() => setStep((s) => Math.max(0, s - 1))} disabled={step === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" /> Kembali
          </Button>
          {step < STEPS.length - 1 ? (
            <Button className="bg-accent hover:bg-accent/90 text-accent-foreground" onClick={() => setStep((s) => s + 1)} disabled={!canNext}>
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
