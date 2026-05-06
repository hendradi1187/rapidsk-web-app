import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";

// ─── Role Types ───────────────────────────────────────────────────────────────

/**
 * Internal application roles derived from backend category + group.
 * SUPER_ADMIN : Platform administrator — full access
 * PROVIDER    : Data owner (KKKS) — registers datasets, manages contracts as provider
 * CONSUMER    : Data requester (Regulator) — requests access, approves agreements
 * VIEWER      : Read-only access
 */
export type AppRole = "SUPER_ADMIN" | "PROVIDER" | "CONSUMER" | "VIEWER";

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
 * Adjust codes here when backend returns actual values.
 */
export const deriveRole = (
  categoryCode: string,
  groupCode: string,
  isSuperadmin = false
): AppRole => {
  const cat = categoryCode.toUpperCase();
  const grp = groupCode.toUpperCase();

  if (isSuperadmin) {
    return "SUPER_ADMIN";
  }

  // Super admin: group code contains ADMIN / SUPER / PLATFORM
  if (
    grp.includes("ADMIN") ||
    grp.includes("SUPER") ||
    grp.includes("PLATFORM") ||
    cat.includes("PLATFORM") ||
    cat.includes("SYSTEM")
  ) {
    return "SUPER_ADMIN";
  }

  // Provider: KKKS or ENTERPRISE org type
  if (cat.includes("KKKS") || cat.includes("ENTERPRISE")) {
    return "PROVIDER";
  }

  // Consumer: Regulator / Government
  if (
    cat.includes("REGULATOR") ||
    cat.includes("GOV") ||
    cat.includes("GOVERNMENT") ||
    cat.includes("SKK")
  ) {
    return "CONSUMER";
  }

  return "VIEWER";
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
