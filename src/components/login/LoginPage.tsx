import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Loader2, Lock, User, Eye, EyeOff, LogIn, ShieldCheck, Building2,
  KeyRound, Activity, Users, Repeat, Code2, type LucideIcon,
  Check, ChevronsUpDown,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import axios from "axios";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { authService } from "@/api/services/identity-provider";
import { iamApi } from "@/api/services/iam";
import { organizationsApi } from "@/api/services/governance";
import { registrationsApi } from "@/api/services/onboarding";
import { providersApi } from "@/api/services/providers";
import { getFrontendApiBasePath } from "@/lib/runtime-config";
import { useAuth, deriveRole, type AppRole } from "@/context/AuthContext";
import { decodeJwt } from "@/lib/jwt";
import { getKeycloak, isKeycloakConfigured } from "@/auth/keycloak";
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
import { cn } from "@/lib/utils";
import { resolveLoginSessionBinding } from "@/lib/session-resolver";
import type { Organization } from "@/api/types/governance";

const API_BASE = getFrontendApiBasePath();
const publicClient = axios.create({ baseURL: API_BASE, timeout: 10000 });

const APP_VERSION = "4.0.3";
const BUILD_NUMBER = "2026.06.04";
const STATS: { icon: LucideIcon; v: string; s: string }[] = [
  { icon: ShieldCheck, v: "Enterprise Grade", s: "ISO 27001 Aligned" },
  { icon: Activity, v: "99.9%", s: "System Availability" },
  { icon: Users, v: "50+", s: "Active Organizations" },
  { icon: Repeat, v: "1.2 PB+", s: "Data Exchanged" },
  { icon: Code2, v: `Version ${APP_VERSION}`, s: `Build ${BUILD_NUMBER}` },
];

const normalizeOrgKey = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const EMPTY_ORG_SELECTION = "__none__";

const getOrgSelectionValue = (item: Pick<OrgOption, "id" | "name">) =>
  item.id ? `id:${item.id}` : `name:${normalizeOrgKey(item.name)}`;

const readCachedOrganizations = (): OrgOption[] => {
  try {
    const cached = JSON.parse(localStorage.getItem("cached_orgs") ?? "[]") as Array<{
      id: string;
      name: string;
    }>;
    return cached
      .filter((item) => item?.id && item?.name)
      .map((item) => ({
        id: item.id,
        name: item.name,
        participantId: null,
        hasGovernanceOrg: true,
        hasParticipant: false,
      }));
  } catch {
    return [];
  }
};

const fetchPublicOrganizationCache = async (): Promise<OrgOption[]> => {
  const res = await fetch("/public/organizations", {
    credentials: "same-origin",
  });
  if (!res.ok) {
    throw new Error(`Public organization cache unavailable (${res.status})`);
  }

  const payload = await res.json() as {
    data?: Array<{ id: string; name: string }>;
  };

  return (payload.data ?? [])
    .filter((item) => item?.id && item?.name)
    .map((item) => ({
      id: item.id,
      name: item.name,
      participantId: null,
      hasGovernanceOrg: true,
      hasParticipant: false,
    }));
};

const fetchGovernanceOrganizationsPublic = async (): Promise<OrgOption[]> => {
  const limit = 100;
  let offset = 0;
  let total: number | null = null;
  const rows: OrgOption[] = [];

  do {
    const res = await publicClient.get("/governance/organizations/", {
      params: { limit, offset },
    });
    const data = res.data;
    const list = Array.isArray(data) ? data : (data?.data ?? data?.results ?? []);
    list.forEach((o: PublicOrganizationPayload) => {
      rows.push({
        id: o.id ?? o.organization_id ?? null,
        name: o.name ?? o.organization_name ?? "",
        participantId: null,
        hasGovernanceOrg: true,
        hasParticipant: false,
      });
    });
    total = typeof data?.total === "number" ? data.total : null;
    if (list.length < limit) break;
    offset += limit;
  } while (total === null || offset < total);

  const merged = new Map<string, OrgOption>();
  [...readCachedOrganizations(), ...rows].forEach((item) => {
    const key = item.id ?? normalizeOrgKey(item.name);
    if (!key) return;
    merged.set(key, item);
  });

  return Array.from(merged.values()).sort((a, b) => a.name.localeCompare(b.name));
};

const clearLoginState = () => {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("user_info");
  localStorage.removeItem("remember_device");
};

const createLoginBindingError = (message: string) => new Error(`LOGIN_BINDING:${message}`);

interface OrgOption {
  id: string | null;
  name: string;
  participantId: string | null;
  hasGovernanceOrg: boolean;
  hasParticipant: boolean;
}

interface PublicOrganizationPayload {
  id?: string | null;
  organization_id?: string | null;
  name?: string | null;
  organization_name?: string | null;
}

interface ParticipantDomainRef {
  domain_id?: string | null;
}

/**
 * LoginPage — halaman login enterprise (Dark Mode Only, responsif).
 * Panel kiri = form fungsional (auth GX-Space LOCAL JWT). Panel kanan = showcase animasi.
 */
export const LoginPage = () => {
  const navigate = useNavigate();
  const { setAuthUser } = useAuth();
  const preferredOrgName = getPreferredOrganizationName();
  const [orgSelection, setOrgSelection] = useState(EMPTY_ORG_SELECTION);
  const [orgOptions, setOrgOptions] = useState<OrgOption[]>([]);
  const [orgLoading, setOrgLoading] = useState(true);
  const [orgPickerOpen, setOrgPickerOpen] = useState(false);
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
        let nextOptions = await fetchGovernanceOrganizationsPublic().catch(() => []);
        if (nextOptions.length === 0) {
          nextOptions = await fetchPublicOrganizationCache().catch(() => []);
        }

        if (nextOptions.length > 0) {
          localStorage.setItem(
            "cached_orgs",
            JSON.stringify(nextOptions.map((item) => ({ id: item.id, name: item.name }))),
          );
        }

        if (!cancelled) {
          setOrgOptions(nextOptions);
          setOrgLoading(false);
          setOrgSelection((current) => {
            if (
              current !== EMPTY_ORG_SELECTION &&
              nextOptions.some((item) => getOrgSelectionValue(item) === current)
            ) {
              return current;
            }

            const preferredOption = preferredOrgName
              ? nextOptions.find((item) => normalizeOrgKey(item.name) === normalizeOrgKey(preferredOrgName))
              : null;

            if (preferredOption) {
              return getOrgSelectionValue(preferredOption);
            }

            return nextOptions[0] ? getOrgSelectionValue(nextOptions[0]) : EMPTY_ORG_SELECTION;
          });
        }
      } catch {
        const cachedOptions = readCachedOrganizations().sort((a, b) => a.name.localeCompare(b.name));
        if (!cancelled) {
          setOrgOptions(cachedOptions);
          setOrgLoading(false);
          setOrgSelection((current) => {
            if (
              current !== EMPTY_ORG_SELECTION &&
              cachedOptions.some((item) => getOrgSelectionValue(item) === current)
            ) {
              return current;
            }

            const preferredOption = preferredOrgName
              ? cachedOptions.find((item) => normalizeOrgKey(item.name) === normalizeOrgKey(preferredOrgName))
              : null;

            if (preferredOption) {
              return getOrgSelectionValue(preferredOption);
            }

            return cachedOptions[0] ? getOrgSelectionValue(cachedOptions[0]) : EMPTY_ORG_SELECTION;
          });
        }
      }
    };

    void loadOrganizations();

    return () => {
      cancelled = true;
    };
  }, [preferredOrgName]);

  const selectedOrgOption = useMemo(
    () => orgOptions.find((item) => getOrgSelectionValue(item) === orgSelection) ?? null,
    [orgOptions, orgSelection],
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
      const decodedEmail = String(c?.email ?? "").trim().toLowerCase();
      const tokenParticipantId = (c?.participant_id as string | null | undefined) ?? null;
      const tokenOrgName = String((c as { category?: { name?: string; code?: string } })?.category?.name ?? c?.category?.code ?? "").trim();
      const isStrictOrganizationRole = role === "PROVIDER" || role === "ADMIN";
      let resolvedOrgName = selectedOrgOption?.name || tokenOrgName;
      let resolvedOrgId: string | null = selectedOrgOption?.id ?? null;
      let resolvedParticipantId = tokenParticipantId;

      try {
        const [organizations, registrations, participants] = await Promise.all([
          organizationsApi.list(),
          registrationsApi.list().catch(() => []),
          providersApi.list().catch(() => []),
        ]);

        localStorage.setItem(
          "cached_orgs",
          JSON.stringify(organizations.map((o) => ({ id: o.organization_id, name: o.organization_name }))),
        );

        const approvedRegistrations = registrations.filter((item) => item.status === "APPROVED");
        const matchedRegistration =
          approvedRegistrations.find((item) => item.participant_id && item.participant_id === tokenParticipantId) ??
          approvedRegistrations.find((item) => decodedEmail && normalizeOrgKey(item.operator_email) === normalizeOrgKey(decodedEmail)) ??
          approvedRegistrations.find((item) => normalizeOrgKey(item.organization_name) === normalizeOrgKey(tokenOrgName)) ??
          null;

        if (matchedRegistration) {
          resolvedOrgName = matchedRegistration.organization_name || resolvedOrgName;
          if (!resolvedParticipantId && matchedRegistration.participant_id) {
            resolvedParticipantId = matchedRegistration.participant_id;
          }
        }

        const governanceOrganizations = organizations as Organization[];        const matchedParticipant =          participants.find((item) => item.provider_id === tokenParticipantId) ??          (matchedRegistration?.participant_id            ? participants.find((item) => item.provider_id === matchedRegistration.participant_id) ?? null            : null) ??          participants.find((item) => normalizeOrgKey(item.provider_name) === normalizeOrgKey(tokenOrgName)) ??          null;        if (matchedParticipant?.provider_id) {          resolvedParticipantId = matchedParticipant.provider_id;          resolvedOrgName = matchedParticipant.provider_name || resolvedOrgName;        }        const participantDomains = resolvedParticipantId          ? await providersApi.listDomains(resolvedParticipantId).catch(() => [])          : [];        const participantDomainIds = participantDomains          .map((item) => String((item as ParticipantDomainRef)?.domain_id ?? "").trim())          .filter(Boolean);        const organizationDomainsById =          participantDomainIds.length > 0            ? await organizationsApi.listDomainsMap(                governanceOrganizations.map((organization) => organization.organization_id),              )            : {};        const sessionBinding = resolveLoginSessionBinding({          role,          selectedOrganization: selectedOrgOption,          tokenParticipantId,          tokenOrgName,          matchedRegistration,          matchedParticipant,          organizations: governanceOrganizations,          participantDomains,          organizationDomainsById,        });        resolvedOrgId = sessionBinding.organizationId;        resolvedOrgName = sessionBinding.organizationName || resolvedOrgName;        resolvedParticipantId = sessionBinding.participantId;        if (role !== "SUPER_ADMIN" && sessionBinding.blockingReason) {          clearLoginState();          throw createLoginBindingError(sessionBinding.blockingReason);        }
      } catch (error) {
        if (error instanceof Error && error.message.startsWith("LOGIN_BINDING:")) {
          throw new Error(error.message.replace("LOGIN_BINDING:", ""));
        }
        if (isStrictOrganizationRole) {
          clearLoginState();
          throw new Error("Validasi organisasi untuk akun ini gagal dibuktikan. Pastikan binding participant dan governance organization sudah benar.");
        }
      }

      if (role !== "SUPER_ADMIN" && !resolvedOrgName) {
        clearLoginState();
        throw new Error("Organisasi akun ini belum terbaca. Pastikan binding participant dan governance organization sudah ada.");
      }

      if (role === "SUPER_ADMIN") {
        resolvedParticipantId = null;
      }

      const effectivePermissions = await iamApi.getMyEffectivePermissions().catch(() => []);

      setPreferredOrganization(resolvedOrgId, resolvedOrgName || null);
      setPreferredParticipantId(role === "SUPER_ADMIN" ? null : resolvedParticipantId);

      const user = {
        id: c?.sub ?? "",
        email: c?.email ?? "",
        full_name: (c?.username as string) ?? username,
        role,
        roles: [role],
        permissions: effectivePermissions,
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
    const keycloak = getKeycloak();
    if (isKeycloakConfigured() && keycloak) {
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
              <Popover open={orgPickerOpen} onOpenChange={setOrgPickerOpen}>
                <PopoverTrigger asChild>
                  <Button
                    type="button"
                    variant="outline"
                    role="combobox"
                    aria-expanded={orgPickerOpen}
                    className="mt-1.5 h-11 w-full justify-between border-white/10 bg-[#070b16] px-3 text-slate-200 hover:bg-white/5 hover:text-white"
                  >
                    <span className="flex min-w-0 items-center gap-2 truncate">
                      <Building2 className="h-4 w-4 shrink-0 text-amber-400" />
                      <span className="truncate text-sm">
                        {orgLoading
                          ? "Memuat organisasi..."
                          : orgSelection === EMPTY_ORG_SELECTION
                            ? (orgOptions.length === 0 ? "Belum ada organisasi" : "Pilih organisasi...")
                            : (selectedOrgOption?.name ?? "Pilih organisasi...")}
                      </span>
                    </span>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-60" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[360px] border border-slate-700 bg-[#111827] p-0 text-slate-100 shadow-2xl" align="start">
                  <Command className="bg-transparent text-slate-100 [&_[cmdk-input-wrapper]]:border-slate-700 [&_[cmdk-input-wrapper]]:bg-[#0f172a] [&_[cmdk-input-wrapper]_svg]:text-slate-400 [&_[cmdk-input]]:text-slate-100 [&_[cmdk-input]]:placeholder:text-slate-400">
                    <CommandInput
                      placeholder="Cari organisasi governance..."
                      className="text-slate-100 placeholder:text-slate-400"
                    />
                    <CommandList className="max-h-72">
                      <CommandEmpty className="text-slate-400">Organisasi tidak ditemukan.</CommandEmpty>
                      <CommandItem
                        value="Pilih organisasi"
                        onSelect={() => {
                          setOrgSelection(EMPTY_ORG_SELECTION);
                          setOrgPickerOpen(false);
                        }}
                        className="cursor-pointer text-slate-300 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                      >
                        <Check className={cn("mr-2 h-4 w-4", orgSelection === EMPTY_ORG_SELECTION ? "opacity-100" : "opacity-0")} />
                        Pilih organisasi...
                      </CommandItem>
                      {orgOptions.map((option) => (
                        <CommandItem
                          key={`${option.id ?? "org"}-${option.name}`}
                          value={`${option.name} ${option.id ?? ""}`}
                          onSelect={() => {
                            setOrgSelection(getOrgSelectionValue(option));
                            setOrgPickerOpen(false);
                          }}
                          className="cursor-pointer text-slate-100 data-[selected=true]:bg-slate-700 data-[selected=true]:text-white"
                        >
                          <Check
                            className={cn(
                              "mr-2 h-4 w-4",
                              orgSelection === getOrgSelectionValue(option) ? "opacity-100" : "opacity-0",
                            )}
                          />
                          <span className="truncate">{option.name}</span>
                        </CommandItem>
                      ))}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              {!orgLoading && orgOptions.length === 0 ? (
                <p className="mt-1.5 text-xs text-slate-500">
                  Daftar organisasi belum tersedia dari governance service maupun cache wrapper.
                </p>
              ) : null}
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
