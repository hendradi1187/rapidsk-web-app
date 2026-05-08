import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ─── Role Types ───────────────────────────────────────────────────────────────

/**
 * Internal application roles derived from backend category + group.
 * SUPER_ADMIN : Platform administrator — full access (group=SUPERADMIN or is_superadmin)
 * ADMIN       : Internal admin — most platform ops, NOT super (group=ADMIN, category=INTERNAL)
 * PROVIDER    : Data owner (KKKS) — registers datasets, manages contracts as provider
 * CONSUMER    : Data requester (Regulator) — requests access, approves agreements
 * VIEWER      : Read-only access
 */
export type AppRole = "SUPER_ADMIN" | "ADMIN" | "PROVIDER" | "CONSUMER" | "VIEWER";

export interface AuthUser {
  id: string;
  username?: string;
  email: string;
  full_name: string;
  role: AppRole;
  permissions: string[];
  is_superadmin?: boolean;
  category: { id?: string; name: string; code: string; description: string | null };
  group: { id?: string; category_id?: string; name: string; code: string; description: string | null; priority: number };
}

interface AuthContextType {
  user: AuthUser | null;
  role: AppRole;
  isAuthenticated: boolean;
  /** Check if current user has at least one of the given roles */
  hasRole: (roles: AppRole[]) => boolean;
  /** Check whether current user has a given permission */
  hasPermission: (permission: string) => boolean;
  /** Sync user into context (called after login) */
  setAuthUser: (userInfo: AuthUser) => void;
  /** Clear auth state (called after logout) */
  clearAuth: () => void;
}

// ─── Role Derivation ──────────────────────────────────────────────────────────

/**
 * Map backend category.code + group.code → AppRole.
 *
 * Backend seed (verified via /user/categories/ + /user/groups/):
 *   category INTERNAL  + group SUPERADMIN → SUPER_ADMIN
 *   category INTERNAL  + group ADMIN      → ADMIN (platform admin, lower than super)
 *   category INTERNAL  + group STEWARD    → ADMIN (treat as same level)
 *   category INTERNAL  + group VIEWER     → VIEWER
 *   category CONSUMER  + any group        → CONSUMER (group decides level: admin/steward/viewer)
 *   category PROVIDER  + any group        → PROVIDER
 *   anything else                          → VIEWER
 *
 * Category determines WHO they are. Group decides level within that category.
 */
export const deriveRole = (
  categoryCode: string,
  groupCode: string,
  isSuperadmin = false
): AppRole => {
  const cat = (categoryCode || "").toUpperCase();
  const grp = (groupCode || "").toUpperCase();
  let result: AppRole;

  if (isSuperadmin) {
    result = "SUPER_ADMIN";
  } else if (cat === "PROVIDER") {
    result = "PROVIDER";
  } else if (cat === "CONSUMER") {
    result = "CONSUMER";
  } else if (cat === "INTERNAL") {
    if (grp === "SUPERADMIN") result = "SUPER_ADMIN";
    else if (grp === "ADMIN" || grp === "STEWARD") result = "ADMIN";
    else result = "VIEWER";
  } else {
    result = "VIEWER";
  }

  // Dev logger so user can see exactly why role was derived
  if (typeof window !== "undefined" && (import.meta as any).env?.DEV) {
    // eslint-disable-next-line no-console
    console.log(
      `%c[deriveRole]%c cat=${categoryCode || "(empty)"} grp=${groupCode || "(empty)"} is_superadmin=${isSuperadmin} → ${result}`,
      "color:#f59e0b;font-weight:bold",
      "color:inherit"
    );
  }
  return result;
};

const PERMISSIONS_BY_ROLE: Record<AppRole, string[]> = {
  SUPER_ADMIN: [
    "catalog.view",
    "catalog.manage",
    "catalog.vocab",
    "catalog.publish",
    "datasets.manage",
    "contracts.view",
    "contracts.manage",
    "agreements.view",
    "agreements.approve",
    "agreements.manage",
    "participants.manage",
    "users.manage",
    "mapping.manage",
    "mapping.view:own",
    "monitoring.view",
    "monitoring.manage",
    "transfer.view",
    "transfer.view:own",
    "transfer.manage",
    "audit.view",
    "audit.view:own",
    "compliance.view",
    "fulfilment.manage",
    "docs.view",
    "domains.acknowledge",
    "reports.generate",
  ],
  ADMIN: [
    // Internal admin — broad ops but NOT users.manage / SUPER_ADMIN-only ops
    "catalog.view",
    "catalog.manage",
    "catalog.vocab",
    "catalog.publish",
    "datasets.manage",
    "contracts.view",
    "contracts.manage",
    "agreements.view",
    "agreements.approve",
    "agreements.manage",
    "participants.manage",
    "mapping.manage",
    "mapping.view:own",
    "monitoring.view",
    "monitoring.manage",
    "transfer.view",
    "transfer.view:own",
    "transfer.manage",
    "audit.view",
    "audit.view:own",
    "compliance.view",
    "fulfilment.manage",
    "reports.generate",
    "domains.acknowledge",
    "docs.view",
  ],
  CONSUMER: [
    "catalog.view",
    "catalog.manage",
    "catalog.vocab",
    "contracts.view",
    "contracts.manage",
    "agreements.view",
    "agreements.approve",
    "agreements.manage",
    "participants.manage",
    "mapping.manage",
    "monitoring.view",
    "monitoring.manage",
    "transfer.view",
    "transfer.manage",
    "audit.view",
    "audit.view:own",
    "compliance.view",
    "fulfilment.manage",
    "datasets.manage",
    "reports.generate",
  ],
  PROVIDER: [
    "catalog.view",
    "catalog.publish",
    "catalog.manage",
    "datasets.manage",
    "contracts.view",
    "contracts.manage",
    "agreements.view",
    "agreements.manage",
    "mapping.view:own",
    "mapping.manage",
    "monitoring.view",
    "monitoring.manage",
    "transfer.view",
    "transfer.view:own",
    "transfer.manage",
    "audit.view",
    "audit.view:own",
    "fulfilment.manage",
    "domains.acknowledge",
    "reports.generate",
  ],
  VIEWER: ["catalog.view", "docs.view"],
};

export const derivePermissions = (
  categoryCode: string,
  groupCode: string,
  isSuperadmin = false
): string[] => {
  const role = deriveRole(categoryCode, groupCode, isSuperadmin);
  return PERMISSIONS_BY_ROLE[role];
};

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = "user_info";
const STORAGE_KEY_TOKEN = "auth_token";

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null; // No token at all → definitely not authenticated

    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw);
    const role = deriveRole(
      parsed.category?.code || "",
      parsed.group?.code || "",
      Boolean(parsed.is_superadmin)
    );
    // Always re-derive permissions on load so stale localStorage from older
    // sessions doesn't lock the UI when the role's permission set expands.
    const permissions = derivePermissions(
      parsed.category?.code || "",
      parsed.group?.code || "",
      Boolean(parsed.is_superadmin)
    );
    return {
      id: parsed.id || "",
      username: parsed.username || "",
      email: parsed.email || "",
      full_name: parsed.full_name || "",
      role,
      permissions,
      is_superadmin: Boolean(parsed.is_superadmin),
      category: parsed.category || { id: "", name: "", code: "", description: "" },
      group: parsed.group || { id: "", category_id: "", name: "", code: "", description: "", priority: 0 },
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);

  // Re-sync from storage on mount (handles page refresh)
  useEffect(() => {
    setUser(loadUserFromStorage());
  }, []);

  const setAuthUser = useCallback((userInfo: AuthUser) => {
    setUser(userInfo);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
  }, []);

  // ── Session check + auto-refresh ──────────────────────────────────────
  // Check token expiry every 60s. If expires within 2 minutes, refresh.
  // If expired and refresh fails, redirect to login.
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const tick = async () => {
      if (cancelled) return;
      const expiresAt = Number(localStorage.getItem("token_expires_at") || 0);
      const refreshToken = localStorage.getItem("refresh_token");
      if (!expiresAt) return;

      const now = Date.now();
      const msUntilExpiry = expiresAt - now;

      if (msUntilExpiry <= 0) {
        // Already expired
        localStorage.removeItem("auth_token");
        localStorage.removeItem("refresh_token");
        localStorage.removeItem("token_expires_at");
        localStorage.removeItem("user_info");
        setUser(null);
        if (window.location.pathname !== "/login") {
          window.location.href = "/login?session=expired";
        }
        return;
      }

      // Refresh proactively if expires within 2 minutes
      if (msUntilExpiry < 120_000 && refreshToken) {
        try {
          const { authService } = await import("@/api/services/identity-provider");
          const data = await authService.refreshToken(refreshToken);
          localStorage.setItem("auth_token", data.access_token);
          if (data.refresh_token) localStorage.setItem("refresh_token", data.refresh_token);
          if (data.expires_in) {
            localStorage.setItem("token_expires_at", String(Date.now() + data.expires_in * 1000));
          }
        } catch {
          // refresh failed — let next tick handle expiry redirect
        }
      }
    };

    tick(); // run immediately
    const interval = setInterval(tick, 60_000); // every 60s
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [user]);

  const hasRole = useCallback(
    (roles: AppRole[]): boolean => {
      if (!user) return false;
      return roles.includes(user.role);
    },
    [user]
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user]
  );

  const role: AppRole = user?.role ?? "VIEWER";

  return (
    <AuthContext.Provider
      value={{ user, role, isAuthenticated: !!user, hasRole, hasPermission, setAuthUser, clearAuth }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
};
