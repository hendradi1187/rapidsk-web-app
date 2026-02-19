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
  email: string;
  full_name: string;
  role: AppRole;
  category: { name: string; code: string; description: string };
  group: { name: string; code: string; description: string; priority: number };
}

interface AuthContextType {
  user: AuthUser | null;
  role: AppRole;
  isAuthenticated: boolean;
  /** Check if current user has at least one of the given roles */
  hasRole: (roles: AppRole[]) => boolean;
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
  groupCode: string
): AppRole => {
  const cat = categoryCode.toUpperCase();
  const grp = groupCode.toUpperCase();

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

// ─── Context ──────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = "user_info";
const STORAGE_KEY_TOKEN = "auth_token";

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    // Derive role from stored category/group
    const role = deriveRole(
      parsed.category?.code || "",
      parsed.group?.code || ""
    );
    return {
      id: parsed.id || "",
      email: parsed.email || "",
      full_name: parsed.full_name || "",
      role,
      category: parsed.category || { name: "", code: "", description: "" },
      group: parsed.group || { name: "", code: "", description: "", priority: 0 },
    };
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<AuthUser | null>(loadUserFromStorage);

  // Re-derive role from storage on mount (handles page refresh)
  useEffect(() => {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) {
      setUser(null);
      return;
    }
    const loaded = loadUserFromStorage();
    setUser(loaded);
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

  const role: AppRole = user?.role ?? "VIEWER";

  return (
    <AuthContext.Provider
      value={{ user, role, isAuthenticated: !!user, hasRole, setAuthUser, clearAuth }}
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
