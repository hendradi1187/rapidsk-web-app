import { useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  AlertTriangle,
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  Globe,
  KeyRound,
  Loader2,
  Rocket,
  Server,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { runtimeApi, type SetupCheckItem } from "@/api/services/runtime";
import { useRuntime } from "@/context/RuntimeContext";
import { getApiErrorMessage } from "@/lib/api-error";
import type { RuntimeBootstrapState } from "@/lib/runtime-config";

type WizardStep = 0 | 1 | 2 | 3;

const setupInputClassName =
  "border-slate-300 bg-white text-slate-950 placeholder:text-slate-400 focus-visible:ring-amber-500/40";

const cardMotion = {
  initial: { opacity: 0, y: 18, scale: 0.985 },
  animate: { opacity: 1, y: 0, scale: 1 },
  exit: { opacity: 0, y: -12, scale: 0.985 },
  transition: { duration: 0.3, ease: "easeOut" as const },
};

const steps = [
  {
    id: 0 as WizardStep,
    title: "License",
    kicker: "Step 1",
    headline: "Aktivasi deployment license",
    description: "Masukkan license key dan host publik instance ini. Wrapper akan validasi online dulu, lalu masuk ke mode demo bila service lisensi belum tersedia.",
    icon: KeyRound,
    tint: "from-amber-400 via-orange-400 to-rose-400",
  },
  {
    id: 1 as WizardStep,
    title: "Endpoint",
    kicker: "Step 2",
    headline: "Hubungkan ke backend utama",
    description: "Tentukan URL publik aplikasi dan API base URL yang akan diproxy oleh wrapper browser bundle ini.",
    icon: Server,
    tint: "from-cyan-400 via-sky-400 to-blue-500",
  },
  {
    id: 2 as WizardStep,
    title: "SSO",
    kicker: "Step 3",
    headline: "Atur login enterprise opsional",
    description: "Bypass Keycloack jika belum siap.",
    icon: ShieldCheck,
    tint: "from-emerald-400 via-teal-400 to-green-500",
  },
  {
    id: 3 as WizardStep,
    title: "Validate",
    kicker: "Step 4",
    headline: "Review, test, lalu initialize",
    description: "Lihat hasil validasi real-time. Warning tidak memblok setup POC, tapi blocker merah wajib dibereskan dulu.",
    icon: Rocket,
    tint: "from-fuchsia-400 via-violet-400 to-indigo-500",
  },
] as const;

const maskLicenseKey = (value: string) => {
  if (value.length <= 8) return value;
  return `${value.slice(0, 4)}-${"*".repeat(Math.max(value.length - 8, 4))}-${value.slice(-4)}`;
};

const Setup = () => {
  const { setBootstrapState, source, setupStatus } = useRuntime();
  const [currentStep, setCurrentStep] = useState<WizardStep>(0);
  const [licenseKey, setLicenseKey] = useState("");
  const [publicAppUrl, setPublicAppUrl] = useState(window.location.origin);
  const [apiBaseUrl, setApiBaseUrl] = useState("/api/v1");
  const [adapterEndpoint, setAdapterEndpoint] = useState("");
  const [ssoEnabled, setSsoEnabled] = useState(false);
  const [keycloakUrl, setKeycloakUrl] = useState("");
  const [realm, setRealm] = useState("");
  const [clientId, setClientId] = useState("");
  const [licenseWarnings, setLicenseWarnings] = useState<string[]>([]);
  const [licenseBlockingErrors, setLicenseBlockingErrors] = useState<string[]>([]);
  const [licenseStatus, setLicenseStatus] = useState<string>("");
  const [licensedHost, setLicensedHost] = useState<string>("");
  const [checks, setChecks] = useState<SetupCheckItem[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [blockingErrors, setBlockingErrors] = useState<string[]>([]);
  const [validatingLicense, setValidatingLicense] = useState(false);
  const [validatingSetup, setValidatingSetup] = useState(false);
  const [initializing, setInitializing] = useState(false);

  const activeStep = steps.find((step) => step.id === currentStep) ?? steps[0];
  const progress = ((currentStep + 1) / steps.length) * 100;

  const ssoPayload = useMemo(
    () => ({
      enabled: ssoEnabled,
      keycloakUrl: keycloakUrl.trim(),
      realm: realm.trim(),
      clientId: clientId.trim(),
    }),
    [clientId, keycloakUrl, realm, ssoEnabled],
  );

  const hasBlockingErrors = useMemo(
    () => licenseBlockingErrors.length > 0 || blockingErrors.length > 0,
    [blockingErrors, licenseBlockingErrors],
  );

  const canMovePastLicense = Boolean(licenseKey.trim() && publicAppUrl.trim());
  const canMovePastEndpoint = Boolean(publicAppUrl.trim() && apiBaseUrl.trim());
  const isBootstrapMissing = source === "fallback";
  const canInitialize =
    !isBootstrapMissing &&
    !initializing &&
    !hasBlockingErrors &&
    licenseStatus.length > 0 &&
    checks.length > 0;

  const validateLicense = async () => {
    if (isBootstrapMissing) {
      toast.error("Wrapper belum aktif. Jalankan browser bundle supaya validasi lisensi bisa disimpan ke file runtime.");
      return;
    }
    setValidatingLicense(true);
    try {
      const result = await runtimeApi.validateLicense({
        licenseKey: licenseKey.trim(),
        publicAppUrl: publicAppUrl.trim(),
      });
      setLicenseStatus(result.status);
      setLicensedHost(result.licensedHost);
      setLicenseWarnings(result.warnings);
      setLicenseBlockingErrors(result.blockingErrors);
      toast.success("License berhasil divalidasi.");
      if (result.blockingErrors.length === 0) {
        setCurrentStep(1);
      }
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "License gagal divalidasi.");
      setLicenseStatus("INVALID");
      setLicensedHost("");
      setLicenseWarnings([]);
      setLicenseBlockingErrors([message]);
      toast.error(message);
    } finally {
      setValidatingLicense(false);
    }
  };

  const validateSetup = async () => {
    if (isBootstrapMissing) {
      toast.error("Wrapper belum aktif. Jalankan browser bundle supaya cek koneksi dan setup tersimpan.");
      return;
    }
    setValidatingSetup(true);
    try {
      const result = await runtimeApi.validateSetup({
        apiBaseUrl: apiBaseUrl.trim(),
        publicAppUrl: publicAppUrl.trim(),
        adapterEndpoint: adapterEndpoint.trim(),
        sso: ssoPayload,
      });
      setChecks(result.checks);
      setWarnings(result.warnings);
      setBlockingErrors(result.blockingErrors);
      toast.success("Validasi koneksi selesai.");
      setCurrentStep(3);
    } catch (error: unknown) {
      const message = getApiErrorMessage(error, "Validasi setup gagal.");
      setChecks([]);
      setWarnings([]);
      setBlockingErrors([message]);
      toast.error(message);
      setCurrentStep(3);
    } finally {
      setValidatingSetup(false);
    }
  };

  const initializeSetup = async () => {
    if (isBootstrapMissing) {
      toast.error("Mode dev murni tidak bisa initialize runtime server-side. Jalankan browser bundle dulu.");
      return;
    }
    setInitializing(true);
    try {
      const payload = await runtimeApi.initializeSetup({
        licenseKey: licenseKey.trim(),
        publicAppUrl: publicAppUrl.trim(),
        apiBaseUrl: apiBaseUrl.trim(),
        adapterEndpoint: adapterEndpoint.trim(),
        sso: ssoPayload,
      });
      const nextState: RuntimeBootstrapState = {
        source: "bootstrap",
        ready: true,
        setupStatus: payload.setupStatus,
        runtimeConfig: payload.runtimeConfig,
        licenseState: payload.licenseState,
      };
      setBootstrapState(nextState);
      toast.success("Inisialisasi selesai. Aplikasi akan memuat ulang.");
      window.location.href = "/login";
    } catch (error: unknown) {
      toast.error(getApiErrorMessage(error, "Gagal menyimpan konfigurasi runtime."));
    } finally {
      setInitializing(false);
    }
  };

  const goNext = () => {
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as WizardStep);
    }
  };

  const goPrev = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => (prev - 1) as WizardStep);
    }
  };

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <motion.div key="license" {...cardMotion} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="licenseKey">License Key</Label>
                <Input
                  id="licenseKey"
                  value={licenseKey}
                  onChange={(e) => setLicenseKey(e.target.value)}
                  placeholder="POC-ABCD1234-EFGH5678"
                  className={setupInputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="publicAppUrl-license">Public App URL</Label>
                <Input
                  id="publicAppUrl-license"
                  value={publicAppUrl}
                  onChange={(e) => setPublicAppUrl(e.target.value)}
                  placeholder="https://rapidsk.company.local"
                  className={setupInputClassName}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="mt-0.5 h-5 w-5 text-amber-500" />
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-amber-900">Demo-friendly validation</p>
                  <p className="text-sm text-amber-800">
                    Kalau license server belum ada, wrapper akan kasih warning dan fallback ke mode demo selama format key valid.
                  </p>
                </div>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                onClick={validateLicense}
                disabled={validatingLicense || !canMovePastLicense}
                className="bg-slate-950 text-white hover:bg-slate-800"
              >
                {validatingLicense ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <KeyRound className="mr-2 h-4 w-4" />}
                Validate License
              </Button>
              {licenseStatus && (
                <Badge variant={licenseBlockingErrors.length > 0 ? "destructive" : "outline"}>
                  {licenseStatus}
                </Badge>
              )}
              {licensedHost && (
                <Badge variant="secondary" className="bg-slate-100 text-slate-700">
                  Host: {licensedHost}
                </Badge>
              )}
            </div>
          </motion.div>
        );
      case 1:
        return (
          <motion.div key="endpoint" {...cardMotion} className="space-y-6">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="publicAppUrl-endpoint">Public App URL</Label>
                <Input
                  id="publicAppUrl-endpoint"
                  value={publicAppUrl}
                  onChange={(e) => setPublicAppUrl(e.target.value)}
                  placeholder="https://rapidsk.company.local"
                  className={setupInputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="apiBaseUrl">API Base URL</Label>
                <Input
                  id="apiBaseUrl"
                  value={apiBaseUrl}
                  onChange={(e) => setApiBaseUrl(e.target.value)}
                  placeholder="http://100.66.10.14:8181/api/v1"
                  className={setupInputClassName}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="adapterEndpoint">Adapter Endpoint</Label>
                <Input
                  id="adapterEndpoint"
                  value={adapterEndpoint}
                  onChange={(e) => setAdapterEndpoint(e.target.value)}
                  placeholder="http://100.66.10.14:8182"
                  className={setupInputClassName}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              {[
                "Wrapper akan proxy semua /api/*",
                "Pindah backend tidak butuh rebuild FE",
                "OpenAPI dan docs ikut diproxy lokal",
                "Permission server dicek sebelum aktivasi",
                "Config JSON disimpan aman di sisi wrapper",
                "Health check tetap transparan untuk operator",
              ].map((item) => (
                <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
                  {item}
                </div>
              ))}
            </div>
          </motion.div>
        );
      case 2:
        return (
          <motion.div key="sso" {...cardMotion} className="space-y-6">
            <div className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <div>
                <p className="text-sm font-semibold text-slate-900">Enable Keycloak SSO</p>
                <p className="mt-1 text-sm text-slate-600">
                  Kalau belum siap, matikan saja. Nanti bisa diubah lagi dari Deployment Config tanpa rebuild.
                </p>
              </div>
              <Switch checked={ssoEnabled} onCheckedChange={setSsoEnabled} />
            </div>

            <AnimatePresence initial={false}>
              {ssoEnabled ? (
                <motion.div
                  key="sso-fields"
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.25 }}
                  className="grid gap-4 md:grid-cols-3"
                >
                  <div className="space-y-2">
                    <Label htmlFor="keycloakUrl">Keycloak URL</Label>
                    <Input
                      id="keycloakUrl"
                      value={keycloakUrl}
                      onChange={(e) => setKeycloakUrl(e.target.value)}
                      placeholder="https://sso.company.local"
                      className={setupInputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="realm">Realm</Label>
                    <Input
                      id="realm"
                      value={realm}
                      onChange={(e) => setRealm(e.target.value)}
                      placeholder="rapidsk"
                      className={setupInputClassName}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="clientId">Client ID</Label>
                    <Input
                      id="clientId"
                      value={clientId}
                      onChange={(e) => setClientId(e.target.value)}
                      placeholder="rapidsk-web"
                      className={setupInputClassName}
                    />
                  </div>
                </motion.div>
              ) : (
                <motion.div
                  key="sso-off"
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800"
                >
                  Login lokal tetap aktif.
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      case 3:
        return (
          <motion.div key="validate" {...cardMotion} className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <Button variant="outline" onClick={validateSetup} disabled={validatingSetup} className="h-12">
                {validatingSetup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Globe className="mr-2 h-4 w-4" />}
                Test Connection
              </Button>
              <Button
                onClick={initializeSetup}
                disabled={!canInitialize}
                className="h-12 bg-slate-950 text-white hover:bg-slate-800"
              >
                {initializing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Rocket className="mr-2 h-4 w-4" />}
                Initialize Bundle
              </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">License</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{licenseKey ? maskLicenseKey(licenseKey) : "Belum diisi"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Backend</p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">{apiBaseUrl || "Belum diisi"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Adapter</p>
                <p className="mt-2 break-all text-sm font-medium text-slate-900">{adapterEndpoint || "Belum diisi"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SSO</p>
                <p className="mt-2 text-sm font-medium text-slate-900">{ssoEnabled ? "Enabled" : "Disabled"}</p>
              </div>
            </div>
          </motion.div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(255,200,87,0.28),_transparent_26%),radial-gradient(circle_at_top_right,_rgba(56,189,248,0.24),_transparent_24%),linear-gradient(180deg,#f8fafc_0%,#eef2ff_48%,#f8fafc_100%)] text-slate-950">
      <div className="mx-auto flex min-h-screen max-w-7xl flex-col gap-8 px-6 py-8 lg:px-10">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <Badge variant="outline" className="border-amber-400 bg-white/70 px-3 py-1 text-amber-700 shadow-sm backdrop-blur">
              Browser Bundle Initialization
            </Badge>
            <div className="space-y-2">
              <h1 className="max-w-3xl text-4xl font-black tracking-tight text-slate-950 sm:text-5xl">
                Setup wizard.
              </h1>
              <p className="max-w-3xl text-base leading-relaxed text-slate-600">
                Bundle ini belum aktif. Lengkapi lisensi, endpoint backend, dan SSO opsional lewat wizard interaktif.
                Hasil validasi tetap transparan, warning tetap terlihat.
              </p>
            </div>
          </div>

          <div className="w-full max-w-sm rounded-3xl border border-white/70 bg-white/80 p-5 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className="flex items-center justify-between text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <div className="mt-3 h-3 overflow-hidden rounded-full bg-slate-200">
              <motion.div
                className={`h-full rounded-full bg-gradient-to-r ${activeStep.tint}`}
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.45, ease: "easeOut" }}
              />
            </div>
            <p className="mt-3 text-sm text-slate-600">
              {activeStep.kicker} dari {steps.length}: {activeStep.title}
            </p>
          </div>
        </div>

        <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
          <Card className="overflow-hidden border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
            <div className={`h-2 w-full bg-gradient-to-r ${activeStep.tint}`} />
            <CardHeader className="pb-4">
              <div className="flex flex-wrap gap-3">
                {steps.map((step, index) => {
                  const StepIcon = step.icon;
                  const isCurrent = step.id === currentStep;
                  const isDone = step.id < currentStep;
                  return (
                    <button
                      key={step.id}
                      type="button"
                      onClick={() => setCurrentStep(step.id)}
                      className={`group flex min-w-[120px] items-center gap-3 rounded-2xl border px-4 py-3 text-left transition-all ${isCurrent
                          ? "border-slate-900 bg-slate-950 text-white shadow-lg"
                          : isDone
                            ? "border-emerald-200 bg-emerald-50 text-emerald-900"
                            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50"
                        }`}
                    >
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-2xl ${isCurrent
                            ? "bg-white/15 text-white"
                            : isDone
                              ? "bg-emerald-500 text-white"
                              : "bg-slate-100 text-slate-500"
                          }`}
                      >
                        {isDone ? <CheckCircle2 className="h-5 w-5" /> : <StepIcon className="h-5 w-5" />}
                      </div>
                      <div>
                        <p className="text-[11px] font-semibold uppercase tracking-[0.18em] opacity-70">
                          {index + 1}
                        </p>
                        <p className="text-sm font-semibold">{step.title}</p>
                      </div>
                    </button>
                  );
                })}
              </div>

              <div className="mt-5">
                <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{activeStep.kicker}</p>
                <CardTitle className="mt-2 text-3xl font-black tracking-tight text-slate-950">
                  {activeStep.headline}
                </CardTitle>
                <CardDescription className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                  {activeStep.description}
                </CardDescription>
              </div>
            </CardHeader>

            <CardContent className="space-y-8">
              {isBootstrapMissing && (
                <div className="rounded-3xl border border-amber-300 bg-amber-50 p-5 shadow-[0_18px_45px_rgba(245,158,11,0.10)]">
                  <div className="flex items-start gap-3">
                    <AlertTriangle className="mt-0.5 h-5 w-5 text-amber-600" />
                    <div className="space-y-2">
                      <p className="text-sm font-semibold text-amber-950">Wrapper belum aktif</p>
                      <p className="text-sm leading-relaxed text-amber-900">
                        Halaman ini terbuka dari mode `npm run dev`, jadi belum ada server wrapper yang bisa membaca atau
                        menyimpan `config/runtime.json` dan `config/license-state.json`.
                      </p>
                      <p className="text-sm leading-relaxed text-amber-900">
                        Untuk setup yang benar, build dulu lalu jalankan `npm run start:bundle`.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <AnimatePresence mode="wait">{renderStepContent()}</AnimatePresence>

              <div className="flex flex-col gap-3 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <Button variant="ghost" onClick={goPrev} disabled={currentStep === 0} className="justify-start">
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>
                <div className="flex flex-wrap gap-3">
                  {currentStep === 0 && (
                    <Button
                      variant="outline"
                      onClick={goNext}
                      disabled={!canMovePastLicense}
                    >
                      Skip to Endpoint
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {currentStep === 1 && (
                    <Button
                      onClick={goNext}
                      disabled={!canMovePastEndpoint}
                      className="bg-slate-950 text-white hover:bg-slate-800"
                    >
                      Continue to SSO
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                  {currentStep === 2 && (
                    <Button onClick={validateSetup} disabled={validatingSetup} className="bg-slate-950 text-white hover:bg-slate-800">
                      {validatingSetup ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                      Continue to Validation
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card className="overflow-hidden border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-black tracking-tight text-slate-950">Validation Board</CardTitle>
                <CardDescription className="text-slate-600">
                  Semua status penting tetap nempel di samping wizard supaya operator bisa lihat blocker, warning, dan readiness server kapan saja.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {checks.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-5 text-sm text-slate-500">
                    {isBootstrapMissing
                      ? "Wrapper belum aktif, jadi board ini belum bisa jalan. Pakai browser bundle supaya hasil validasi server-side bisa muncul di sini."
                      : "Belum ada hasil validasi koneksi. Jalankan `Validate License` atau `Test Connection` dari wizard untuk melihat kesiapan wrapper dan permission server."}
                  </div>
                ) : (
                  checks.map((check, index) => (
                    <motion.div
                      key={check.key}
                      initial={{ opacity: 0, x: 12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ duration: 0.2, delay: index * 0.04 }}
                      className="rounded-2xl border border-slate-200 bg-slate-50 p-4"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{check.label}</p>
                          <p className="mt-1 text-xs leading-relaxed text-slate-600">{check.message}</p>
                        </div>
                        <Badge
                          variant={
                            check.status === "fail"
                              ? "destructive"
                              : check.status === "warning"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {check.status.toUpperCase()}
                        </Badge>
                      </div>
                    </motion.div>
                  ))
                )}
              </CardContent>
            </Card>

            <Card className="border-white/70 bg-white/80 shadow-[0_24px_80px_rgba(15,23,42,0.10)] backdrop-blur">
              <CardHeader>
                <CardTitle className="text-xl font-black tracking-tight text-slate-950">Runtime Snapshot</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">License</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {licenseKey ? maskLicenseKey(licenseKey) : "Belum diisi"}
                  </p>
                  {licensedHost && <p className="mt-1 text-xs text-slate-500">Host: {licensedHost}</p>}
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">API Base URL</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">{apiBaseUrl || "Belum diisi"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Adapter Endpoint</p>
                  <p className="mt-2 break-all text-sm font-semibold text-slate-900">{adapterEndpoint || "Belum diisi"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">SSO</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">{ssoEnabled ? "Enabled" : "Disabled"}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-slate-500">Server Permission</p>
                  <p className="mt-2 text-sm font-semibold text-slate-900">
                    {checks.find((item) => item.key === "server-permission")?.status === "pass"
                      ? "Writable"
                      : checks.find((item) => item.key === "server-permission")
                        ? "Needs Attention"
                        : "Pending Check"}
                  </p>
                </div>
              </CardContent>
            </Card>

            {(licenseWarnings.length > 0 || warnings.length > 0) && (
              <Card className="border-amber-300 bg-amber-50 shadow-[0_18px_45px_rgba(245,158,11,0.10)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-amber-900">
                    <AlertTriangle className="h-5 w-5" />
                    Warnings
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...licenseWarnings, ...warnings].map((warning) => (
                    <p key={warning} className="text-sm leading-relaxed text-amber-900">
                      {warning}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {(licenseBlockingErrors.length > 0 || blockingErrors.length > 0) && (
              <Card className="border-red-300 bg-red-50 shadow-[0_18px_45px_rgba(239,68,68,0.10)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    Blocking Errors
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {[...licenseBlockingErrors, ...blockingErrors].map((error) => (
                    <p key={error} className="text-sm leading-relaxed text-red-900">
                      {error}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {setupStatus.blockingErrors.length > 0 && (
              <Card className="border-red-300 bg-red-50 shadow-[0_18px_45px_rgba(239,68,68,0.10)]">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    Runtime Gate
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-2">
                  {setupStatus.blockingErrors.map((error) => (
                    <p key={error} className="text-sm leading-relaxed text-red-900">
                      {error}
                    </p>
                  ))}
                </CardContent>
              </Card>
            )}

            {!hasBlockingErrors && licenseStatus && checks.length > 0 && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded-3xl border border-emerald-300 bg-emerald-50 p-5 shadow-[0_18px_45px_rgba(16,185,129,0.10)]"
              >
                <div className="flex items-start gap-3">
                  <CheckCircle2 className="mt-0.5 h-5 w-5 text-emerald-600" />
                  <div>
                    <p className="text-sm font-semibold text-emerald-900">Ready to initialize</p>
                    <p className="mt-1 text-sm leading-relaxed text-emerald-800">
                      Validasi minimum terpenuhi. Warning non-blocking tetap ditampilkan, tapi instance ini sudah siap diaktivasi untuk demo maupun staging awal.
                    </p>
                  </div>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Setup;
