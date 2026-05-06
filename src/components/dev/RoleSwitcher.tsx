// src/components/dev/RoleSwitcher.tsx
// Dev-only floating widget that lets you quickly switch roles to test V2 pages.
// This simulates different category.code + group.code to derive different AppRoles.

import { useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useAuth, deriveRole, type AppRole } from "@/context/AuthContext";
import { getDefaultV2RouteForRole } from "@/lib/dataspace-version";
import {
  Crown,
  Building2,
  Pickaxe,
  Eye,
  ChevronDown,
  ChevronUp,
  Bug,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";

const ROLE_PROFILES: {
  role: AppRole;
  label: string;
  desc: string;
  icon: typeof Crown;
  color: string;
  category: { id: string; name: string; code: string; description: string | null };
  group: { id: string; category_id: string; name: string; code: string; description: string | null; priority: number };
}[] = [
  {
    role: "SUPER_ADMIN",
    label: "Authority (Super Admin)",
    desc: "Platform administrator — full access",
    icon: Crown,
    color: "text-amber-400",
    category: { id: "cat-1", name: "Platform", code: "PLATFORM", description: "Platform category" },
    group: { id: "grp-1", category_id: "cat-1", name: "Admin", code: "ADMIN", description: "Administrator group", priority: 0 },
  },
  {
    role: "CONSUMER",
    label: "Admin Consumer (SKK Migas)",
    desc: "Regulator — manages domains, policies, agreements",
    icon: Building2,
    color: "text-blue-400",
    category: { id: "cat-2", name: "Government", code: "GOVERNMENT", description: "Government regulator" },
    group: { id: "grp-2", category_id: "cat-2", name: "Regulator", code: "REGULATOR", description: "Regulator group", priority: 1 },
  },
  {
    role: "PROVIDER",
    label: "Admin Provider (KKKS)",
    desc: "Data owner — registers datasets, fulfils contracts",
    icon: Pickaxe,
    color: "text-violet-400",
    category: { id: "cat-3", name: "Enterprise", code: "ENTERPRISE", description: "Enterprise KKKS" },
    group: { id: "grp-3", category_id: "cat-3", name: "Provider", code: "KKKS", description: "KKKS provider group", priority: 2 },
  },
  {
    role: "VIEWER",
    label: "Viewer (Read-only)",
    desc: "Basic user — read-only catalog access",
    icon: Eye,
    color: "text-slate-400",
    category: { id: "cat-4", name: "Public", code: "PUBLIC", description: "Public viewer" },
    group: { id: "grp-4", category_id: "cat-4", name: "Viewer", code: "VIEWER", description: "Viewer group", priority: 3 },
  },
];

export const RoleSwitcher = () => {
  const { role, user, setAuthUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [expanded, setExpanded] = useState(false);
  const currentProfile = ROLE_PROFILES.find((p) => p.role === role) ?? ROLE_PROFILES[0];

  const switchRole = (profile: (typeof ROLE_PROFILES)[0]) => {
    if (profile.role === role) return;

    // Derive role (sanity check)
    const derivedRole = deriveRole(profile.category.code, profile.group.code);

    // Update user_info in localStorage
    const newUser = {
      id: user?.id || "dev-user-001",
      email: user?.email || "dev@rapidsk.local",
      full_name: user?.full_name || "Dev User",
      role: derivedRole,
      category: profile.category,
      group: profile.group,
    };

    localStorage.setItem("user_info", JSON.stringify(newUser));
    setAuthUser(newUser);

    toast.success(`Switched to ${profile.label}`, {
      description: `Role: ${derivedRole} | Redirecting to V2 dashboard...`,
    });

    // Navigate to the correct V2 dashboard for this role
    const isOnV2 = location.pathname.startsWith("/v2");
    if (isOnV2 || derivedRole !== "VIEWER") {
      const target = getDefaultV2RouteForRole(derivedRole);
      setTimeout(() => navigate(target, { replace: true }), 300);
    } else {
      setTimeout(() => navigate("/", { replace: true }), 300);
    }

    setExpanded(false);
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Expanded panel */}
      {expanded && (
        <div className="mb-2 w-72 rounded-xl border border-border/60 bg-card/95 shadow-2xl shadow-primary/10 backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200">
          <div className="border-b border-border/40 px-4 py-3">
            <div className="flex items-center gap-2">
              <Bug className="h-4 w-4 text-amber-500" />
              <p className="text-sm font-semibold">Role Switcher</p>
              <Badge variant="outline" className="ml-auto text-[10px] border-amber-500/30 text-amber-500">DEV TOOL</Badge>
            </div>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Switch roles to test V2 pages for each persona
            </p>
          </div>
          <div className="p-2 space-y-1">
            {ROLE_PROFILES.map((profile) => {
              const isActive = profile.role === role;
              return (
                <button
                  key={profile.role}
                  onClick={() => switchRole(profile)}
                  className={`w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-all duration-150 ${
                    isActive
                      ? "bg-primary/10 border border-primary/20"
                      : "hover:bg-muted/50 border border-transparent"
                  }`}
                >
                  <div className={`rounded-lg p-1.5 ${isActive ? "bg-primary/20" : "bg-muted/50"}`}>
                    <profile.icon className={`h-4 w-4 ${isActive ? profile.color : "text-muted-foreground"}`} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className={`text-xs font-medium truncate ${isActive ? "text-foreground" : "text-muted-foreground"}`}>
                      {profile.label}
                    </p>
                    <p className="text-[10px] text-muted-foreground truncate">{profile.desc}</p>
                  </div>
                  {isActive && (
                    <Badge className="bg-primary/10 text-primary text-[10px] flex-shrink-0">Active</Badge>
                  )}
                </button>
              );
            })}
          </div>
          <div className="border-t border-border/40 px-4 py-2">
            <p className="text-[10px] text-muted-foreground">
              Current: <code className="rounded bg-muted px-1">{role}</code> |
              Category: <code className="rounded bg-muted px-1">{user?.category?.code || "—"}</code> |
              Group: <code className="rounded bg-muted px-1">{user?.group?.code || "—"}</code>
            </p>
          </div>
        </div>
      )}

      {/* Toggle button */}
      <button
        onClick={() => setExpanded(!expanded)}
        className={`flex items-center gap-2 rounded-full px-4 py-2.5 shadow-lg transition-all duration-200 border ${
          expanded
            ? "bg-card border-border/60"
            : "bg-card/90 backdrop-blur border-border/40 hover:border-primary/30 hover:shadow-primary/10"
        }`}
      >
        <currentProfile.icon className={`h-4 w-4 ${currentProfile.color}`} />
        <span className="text-xs font-medium">{currentProfile.label}</span>
        {expanded ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
      </button>
    </div>
  );
};
