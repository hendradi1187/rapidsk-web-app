import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Lock, User, Eye, EyeOff, LogIn, ShieldCheck, Building2,
  KeyRound, Activity, Users, Repeat, Code2, type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectTrigger, SelectValue, SelectContent, SelectItem,
} from "@/components/ui/select";
import axios from "axios";
import { authService } from "@/api/services/identity-provider";
import { organizationsApi } from "@/api/services/governance";
import { providersApi } from "@/api/services/providers";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "http://localhost:8185/api/v1";
const publicClient = axios.create({ baseURL: API_BASE, timeout: 10000 });
import { useAuth, deriveRole, type AppRole } from "@/context/AuthContext";
import { decodeJwt } from "@/lib/jwt";
import { keycloak, isKeycloakConfigured } from "@/auth/keycloak";
import {
  getPreferredOrganizationName,
  setPreferredOrganization,
  setPreferredParticipantId,
} from "@/lib/session-binding";
import { SecurityCards } from "@/components/login/SecurityCards";
import { DomainCards } from "@/components/login/DomainCards";
import { DataFlowAnimation } from "@/components/login/DataFlowAnimation";
import { BackgroundScene } from "@/components/login/BackgroundScene";
import { getApiErrorMessage } from "@/lib/api-error";

const APP_VERSION = "4.0.3";
const BUILD_NUMBER = "2026.06.04";

const FALLBACK_ORGS = [
  "SKK MIGAS", "Pertamina Hulu Energi", "Medco Energi",
  "Eni Indonesia", "Chevron Indonesia", "Harbour Energy",
];

const STATS: { icon: LucideIcon; v: string; s: string }[] = [
  { icon: ShieldCheck, v: "Enterprise Grade", s: "ISO 27001 Aligned" },
  { icon: Activity, v: "99.9%", s: "System Availability" },
  { icon: Users, v: "50+", s: "Active Organizations" },
  { icon: Repeat, v: "1.2 PB+", s: "Data Exchanged" },
  { icon: Code2, v: `Version ${APP_VERSION}`, s: `Build ${BUILD_NUMBER}` },
];

const normalizeOrgKey = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

interface OrgOption {
  id: string | null;
  name: string;
  participantId: string | null;
}

/**
 * LoginPage — halaman login enterprise (Dark Mode Only, responsif).
 * Panel kiri = form fungsional (auth GX-Space LOCAL JWT). Panel kanan = showcase animasi.
 */
export const LoginPage = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();
  const preferredOrgName = getPreferredOrganizationName();
  const [org, setOrg] = useState(preferredOrgName || "__none__");
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);

  const from = (location.state as { from?: { pathname?: string } })?.from?.pathname || "/";

  useEffect(() => {
    let cancelled = false;

    const loadOrganizations = async () => {
      try {
        const [orgRes, provRes] = await Promise.allSettled([
          publicClient.get("/governance/organizations/"),
          publicClient.get("/onboarding/participants"),
        ]);

        const merged = new Map<string, OrgOption>();

        const upsert = (option: OrgOption) => {
          const key = normalizeOrgKey(option.name);
          if (!key) return;
          const current = merged.get(key);
          merged.set(key, {
            id: option.id ?? current?.id ?? null,
            name: current?.name ?? option.name,
            participantId: option.participantId ?? current?.participantId ?? null,
          });
        };

        if (orgRes.status === "fulfilled") {
          const data = orgRes.value.data;
          const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
          list.forEach((o: any) => {
            upsert({ id: o.id ?? o.organization_id, name: o.name ?? o.organization_name, participantId: null });
          });
        }

        if (provRes.status === "fulfilled") {
          const data = provRes.value.data;
          const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
          list.forEach((p: any) => {
            upsert({ id: null, name: p.provider_name ?? p.name, participantId: p.provider_id ?? p.id ?? null });
          });
        }

        if (merged.size === 0) {
          // Coba cache dari sesi login sebelumnya
          try {
            const cached = JSON.parse(localStorage.getItem("cached_orgs") ?? "[]") as { id: string; name: string }[];
            cached.forEach((o) => merged.set(o.name, { id: o.id, name: o.name, participantId: null }));
          } catch { /* ignore */ }
        }
        if (merged.size === 0) {
          FALLBACK_ORGS.forEach((name) => merged.set(name, { id: null, name, participantId: null }));
        }

        const nextOptions = Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
        if (preferredOrgName && !nextOptions.some((item) => item.name === preferredOrgName)) {
          nextOptions.unshift({ id: null, name: preferredOrgName, participantId: null });
        }

        if (!cancelled) {
          setOrgOptions(nextOptions);
          setOrgLoading(false);
          setOrg((current) => {
            if (current === "__none__" || nextOptions.some((item) => item.name === current)) return current;
            return preferredOrgName || nextOptions[0]?.name || "__none__";
          });
        }
      } catch {
        if (!cancelled) {
          setOrgOptions(FALLBACK_ORGS.map((name) => ({ id: null, name, participantId: null })));
          setOrgLoading(false);
        }
      }
    };

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [preferredOrgName]);

  const selectedOrgOption = useMemo(
    () => orgOptions.find((item) => item.name === org) ?? null,
    [org, orgOptions],
  );

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setLoading(true);
    try {
      const res = await authService.login({ username, password });
      const token = res.access_token;
      localStorage.setItem("auth_token", token);
      localStorage.setItem("remember_device", remember ? "1" : "0");

      const c = decodeJwt(token);
      const catCode = c?.category?.code ?? "";
      const grpCode = c?.group?.code ?? "";
      const role: AppRole = c?.is_superadmin ? "SUPER_ADMIN" : deriveRole(catCode, grpCode);
      const effectiveOrg = org === "__none__" ? "" : org;
      const selectedOrgKey = normalizeOrgKey(effectiveOrg);
      let resolvedOrgName = effectiveOrg;
      let resolvedOrgId: string | null = selectedOrgOption?.id ?? null;
      let resolvedParticipantId =
        (c?.participant_id as string | null | undefined) ?? selectedOrgOption?.participantId ?? null;

      try {
        const organizations = await organizationsApi.list();
        // Cache org list untuk login page berikutnya (sebelum auth)
        localStorage.setItem("cached_orgs", JSON.stringify(
          organizations.map((o) => ({ id: o.organization_id, name: o.organization_name }))
        ));
        const matchedOrg =
          organizations.find(
            (item) => normalizeOrgKey(item.organization_name) === selectedOrgKey,
          ) ?? null;
        if (matchedOrg) {
          resolvedOrgId = matchedOrg.organization_id;
          resolvedOrgName = matchedOrg.organization_name;
        }
      } catch {
        // Keep selected org label as a fallback session hint.
      }

      if (role !== "SUPER_ADMIN" && !resolvedParticipantId) {
        try {
          const participants = await providersApi.list();
          const matchedParticipant =
            participants.find(
              (item) => normalizeOrgKey(item.provider_name) === normalizeOrgKey(resolvedOrgName),
            ) ??
            participants.find(
              (item) => normalizeOrgKey(item.provider_name) === selectedOrgKey,
            ) ??
            null;
          resolvedParticipantId = matchedParticipant?.provider_id ?? null;
        } catch {
          // Leave participant empty if backend mapping is not readable here.
        }
      }

      setPreferredOrganization(resolvedOrgId, resolvedOrgName);
      setPreferredParticipantId(role === "SUPER_ADMIN" ? null : resolvedParticipantId);

      const user = {
        id: c?.sub ?? "",
        email: c?.email ?? "",
        full_name: (c?.username as string) ?? username,
        role,
        roles: [role],
        permissions: [] as string[],
        category: {
          name: resolvedOrgName,
          code: catCode || resolvedOrgName,
          description: "",
        },
        group: { name: grpCode, code: grpCode, description: "", priority: 0 },
        participantId: role === "SUPER_ADMIN" ? null : resolvedParticipantId,
      };
      localStorage.setItem("user_info", JSON.stringify(user));
      setAuthUser(user);
      toast.success("Welcome back!", { description: `Signed in as ${user.full_name} (${role})` });

      const roleRedirect: Record<string, string> = {
        SUPER_ADMIN: "/organizations",
        ADMIN: "/participants",
        PROVIDER: "/inbox",
        CONSUMER: "/contracts",
        AUDITOR: "/audit",
        VIEWER: "/datasets",
        GIS_ANALYST: "/datasets",
      };
      const destination = from !== "/" ? from : (roleRedirect[role] ?? "/");
      navigate(destination, { replace: true });
    } catch (err: unknown) {
      toast.error("Login gagal", {
        description: getApiErrorMessage(err, "Username atau password salah."),
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSSO = () => {
    if (isKeycloakConfigured && keycloak) {
      keycloak.login();
    } else {
      toast.info("SSO (OIDC) belum diaktifkan", {
        description: "Hubungi administrator untuk mengaktifkan Single Sign-On.",
      });
    }
  };

  return (
    <div className="h-screen w-screen flex overflow-hidden bg-[#070b16] text-slate-200 selection:bg-amber-500/30">
      {/* ───────── LEFT — Form (420px) ───────── */}
      <aside className="relative w-full lg:w-[420px] flex-shrink-0 flex flex-col bg-[#0b1120] border-r border-white/[0.06] z-10 overflow-y-auto">
        <div className="px-9 pt-8 pb-2 flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-amber-600 flex items-center justify-center shadow-lg shadow-amber-500/30">
            <span className="text-2xl font-black text-[#0b1120]">R</span>
          </div>
          <div>
            <h1 className="text-xl font-extrabold tracking-tight text-white leading-none">
              Rapi<span className="text-amber-400">DSK</span>
            </h1>
            <p className="text-[11px] text-slate-500 mt-1">Dataspace Connector</p>
          </div>
        </div>

        <div className="flex-1 flex flex-col justify-center px-9 py-6">
          <form onSubmit={handleLogin} className="w-full">
            <h2 className="text-[22px] font-bold text-white">Sign in to your account</h2>
            <p className="text-sm text-slate-400 mt-1 mb-6">Access RapiDSK Enterprise Platform</p>

            <div className="mb-4">
              <Label className="text-xs font-medium text-slate-400">Organization</Label>
              <Select value={org} onValueChange={setOrg}>
                <SelectTrigger className="mt-1.5 h-11 bg-[#070b16] border-white/10 text-slate-200 focus:ring-amber-500/40">
                  <span className="flex items-center gap-2 truncate">
                    <Building2 className="w-4 h-4 text-amber-400 flex-shrink-0" />
                    {orgLoading
                      ? <span className="text-slate-500 text-sm">Memuat...</span>
                      : <SelectValue placeholder="Pilih organisasi..." />}
                  </span>
                </SelectTrigger>
                <SelectContent className="bg-[#0b1120] border-white/10 text-slate-200">
                  <SelectItem value="__none__" className="focus:bg-white/10 focus:text-white text-slate-500 italic">
                    Pilih organisasi...
                  </SelectItem>
                  {orgOptions.map((option) => (
                    <SelectItem
                      key={`${option.id ?? "org"}-${option.participantId ?? "participant"}-${option.name}`}
                      value={option.name}
                      className="focus:bg-white/10 focus:text-white"
                    >
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="mb-4">
              <Label htmlFor="username" className="text-xs font-medium text-slate-400">Username</Label>
              <div className="relative mt-1.5">
                <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input id="username" value={username} onChange={(e) => setUsername(e.target.value)}
                  placeholder="skkmigas_admin" autoComplete="username"
                  className="h-11 pl-9 bg-[#070b16] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/40" />
              </div>
            </div>

            <div className="mb-4">
              <Label htmlFor="password" className="text-xs font-medium text-slate-400">Password</Label>
              <div className="relative mt-1.5">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <Input id="password" type={showPwd ? "text" : "password"} value={password}
                  onChange={(e) => setPassword(e.target.value)} placeholder="••••••••••••"
                  autoComplete="current-password"
                  className="h-11 pl-9 pr-10 bg-[#070b16] border-white/10 text-white placeholder:text-slate-600 focus-visible:ring-amber-500/40" />
                <button type="button" onClick={() => setShowPwd((v) => !v)} aria-label="Toggle password"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300">
                  {showPwd ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <label className="flex items-center gap-2.5 mb-5 cursor-pointer select-none">
              <Checkbox checked={remember} onCheckedChange={(v) => setRemember(!!v)}
                className="border-white/20 data-[state=checked]:bg-amber-500 data-[state=checked]:border-amber-500" />
              <span className="text-sm text-slate-400">Remember me on this device</span>
            </label>

            <Button type="submit" disabled={loading}
              className="w-full h-12 font-bold text-[15px] text-[#0b1120] bg-amber-500 hover:bg-amber-400 shadow-lg shadow-amber-500/20 transition-colors">
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Memproses...</>)
                : (<><LogIn className="w-4 h-4 mr-2" /> Sign In</>)}
            </Button>

            <div className="flex items-center gap-3 my-4 text-slate-600 text-xs">
              <span className="h-px flex-1 bg-white/10" /> or <span className="h-px flex-1 bg-white/10" />
            </div>

            <Button type="button" variant="outline" onClick={handleSSO}
              className="w-full h-11 bg-transparent border-white/12 text-slate-300 hover:bg-white/5 hover:text-white">
              <KeyRound className="w-4 h-4 mr-2" /> Sign in with SSO (OIDC)
            </Button>

            <div className="mt-6">
              <SecurityCards />
            </div>
          </form>
        </div>

        <div className="px-9 py-5 border-t border-white/[0.06]">
          <p className="text-[11px] text-slate-600">© 2026 RapiDSK Enterprise Platform. All rights reserved.</p>
          <div className="flex items-center gap-3 mt-1.5 text-[11px] text-slate-500">
            <span className="hover:text-slate-300 cursor-pointer">Privacy Policy</span>·
            <span className="hover:text-slate-300 cursor-pointer">Terms of Use</span>·
            <span className="hover:text-slate-300 cursor-pointer">Contact Support</span>
          </div>
        </div>
      </aside>

      {/* ───────── RIGHT — Showcase ───────── */}
      <main className="relative hidden lg:flex flex-1 flex-col overflow-hidden">
        <BackgroundScene />

        {/* top bar */}
        <div className="relative flex items-center justify-between px-10 pt-7">
          <div className="flex items-center gap-3">
            <span className="text-lg font-extrabold tracking-tight text-white">SKK<span className="text-amber-400">Migas</span></span>
            <span className="h-5 w-px bg-white/15" />
            <div className="leading-tight">
              <div className="text-sm font-bold text-white">RapiDSK</div>
              <div className="text-[10px] text-slate-500">Enterprise Platform</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-[11px] font-semibold text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> PRODUCTION
            </span>
            <span className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <ShieldCheck className="w-3.5 h-3.5" /> Secure Access · Enterprise Grade
            </span>
          </div>
        </div>

        {/* konten panel kanan — layout sesuai mockup (hero kiri + diagram kanan-atas, kartu, stats) */}
        <div className="relative flex-1 flex flex-col px-10 pb-5 overflow-y-auto">
          {/* baris atas: hero (kiri) + diagram animasi (kanan, rapat ke tepi via justify-between) */}
          <div className="flex items-start justify-between gap-10 pt-6">
            <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}
              className="max-w-[500px] flex-shrink-0">
              <h2 className="text-[38px] leading-[1.05] font-extrabold text-white" style={{ textShadow: "0 2px 18px rgba(0,0,0,0.6)" }}>
                National Upstream<br /><span className="text-amber-400">Data Exchange Platform</span>
              </h2>
              <p className="mt-3 text-[15px] font-medium text-slate-200" style={{ textShadow: "0 1px 10px rgba(0,0,0,0.6)" }}>
                Secure Exchange. Trusted Governance. National Scale.
              </p>
              <p className="mt-4 text-sm leading-relaxed text-slate-400 max-w-[460px]">
                RapiDSK menyediakan tata kelola data, kontrol akses, dan kepatuhan
                end-to-end untuk pertukaran data 5 domain migas antara KKKS dan SKK Migas.
              </p>
            </motion.div>

            <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.7, delay: 0.15 }}
              className="w-[50%] max-w-[660px] flex-shrink-0 mt-4 ml-auto">
              <DataFlowAnimation />
            </motion.div>
          </div>

          {/* spacer: dorong kartu + stats ke bawah agar area bawah tidak kosong */}
          <div className="flex-1 min-h-[28px]" />

          {/* kartu (5 domain SIGI / governance / OGC / highlights) */}
          <DomainCards />

          {/* stats bar */}
          <div className="mt-4 rounded-xl border border-white/[0.08] bg-[#070b16]/60 backdrop-blur-md">
            <div className="grid grid-cols-2 md:grid-cols-5 divide-x divide-white/[0.06]">
              {STATS.map(({ icon: Icon, v, s }) => (
                <div key={s} className="flex items-center gap-3 px-5 py-3.5">
                  <Icon className="w-5 h-5 text-amber-400/80 flex-shrink-0" />
                  <div className="leading-tight min-w-0">
                    <div className="text-sm font-bold text-white truncate">{v}</div>
                    <div className="text-[11px] text-slate-400 truncate">{s}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-3 text-center text-[11px] text-slate-400 flex items-center justify-center gap-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Protected by Zero Trust Architecture
            <span className="text-slate-600">·</span> All Access is Monitored and Audited
          </p>
        </div>
      </main>
    </div>
  );
};

export default LoginPage;
