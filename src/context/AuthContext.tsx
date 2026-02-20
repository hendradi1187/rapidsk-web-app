import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
  useCallback,
} from "react";

/**
 * Internal application roles derived from backend category + group.
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

  /** role asli dari user_info */
  role: AppRole;

  /** role yang dipakai UI (override kalau diset) */
  effectiveRole: AppRole;

  /** current override (null = pake role asli) */
  roleOverride: AppRole | null;

  /** set/clear override */
  setRoleOverride: (role: AppRole | null) => void;

  isAuthenticated: boolean;
  hasRole: (roles: AppRole[]) => boolean;
  setAuthUser: (userInfo: AuthUser) => void;
  clearAuth: () => void;
}

/**
 * Map backend category.code + group.code → AppRole.
 */
export const deriveRole = (categoryCode: string, groupCode: string): AppRole => {
  const cat = (categoryCode || "").toUpperCase();
  const grp = (groupCode || "").toUpperCase();

  // INTERNAL SUPERADMIN
  if (cat === "INTERNAL" && grp === "SUPERADMIN") return "SUPER_ADMIN";

  // PROVIDER side
  if (cat === "PROVIDER") {
    if (grp === "VIEWER") return "VIEWER";
    return "PROVIDER"; // ADMIN / STEWARD treated as PROVIDER
  }

  // CONSUMER side
  if (cat === "CONSUMER") {
    if (grp === "VIEWER") return "VIEWER";
    return "CONSUMER"; // ADMIN / STEWARD treated as CONSUMER
  }

  return "VIEWER";
};

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = "user_info";
const STORAGE_KEY_TOKEN = "auth_token";
const ROLE_OVERRIDE_KEY = "role_override";

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null;

    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) {
      // NOTE: ini insecure kalau dipakai beneran.
      // Kalau mau aman, ganti default role ke VIEWER.
      return {
        id: "",
        email: "",
        full_name: "Super Admin",
        role: "SUPER_ADMIN",
        category: { name: "Platform", code: "PLATFORM", description: "" },
        group: { name: "Admin", code: "ADMIN", description: "", priority: 0 },
      };
    }

    const parsed = JSON.parse(raw);
    const role = deriveRole(parsed.category?.code || "", parsed.group?.code || "");

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

  // role asli dari user
  const role: AppRole = user?.role ?? "VIEWER";

  // override role (buat switch testing)
  const [roleOverride, setRoleOverrideState] = useState<AppRole | null>(() => {
    const raw = localStorage.getItem(ROLE_OVERRIDE_KEY);
    return raw ? (raw as AppRole) : null;
  });

  const setRoleOverride = useCallback((r: AppRole | null) => {
    setRoleOverrideState(r);
    if (r) localStorage.setItem(ROLE_OVERRIDE_KEY, r);
    else localStorage.removeItem(ROLE_OVERRIDE_KEY);
  }, []);

  // role yang dipakai UI guard/menu
  const effectiveRole: AppRole = roleOverride ?? role;

  // Re-sync from storage on mount
  useEffect(() => {
    setUser(loadUserFromStorage());
  }, []);

  const setAuthUser = useCallback((userInfo: AuthUser) => {
    setUser(userInfo);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    setRoleOverrideState(null);
    localStorage.removeItem(ROLE_OVERRIDE_KEY);
  }, []);

  // hasRole ikut effectiveRole biar switch kerasa
  const hasRole = useCallback(
    (roles: AppRole[]): boolean => roles.includes(effectiveRole),
    [effectiveRole]
  );

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        effectiveRole,
        roleOverride,
        setRoleOverride,
        isAuthenticated: !!user,
        hasRole,
        setAuthUser,
        clearAuth,
      }}
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