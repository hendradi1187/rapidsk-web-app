import { createContext, useContext, useState, useEffect, ReactNode, useCallback } from "react";
import { getKeycloak, isKeycloakConfigured } from "@/auth/keycloak";
import { useKeycloak } from "@/auth/KeycloakProvider";
import { decodeJwt } from "@/lib/jwt";
import {
  getPreferredOrganizationName,
  getPreferredParticipantId,
  clearSessionBinding,
} from "@/lib/session-binding";

// ─── Role Types (CANONICAL — IAM-3) ────────────────────────────────────
//
// 7 canonical role yang dipakai di seluruh ekosistem (rapiDSK + SPEKTRUM).
// Frontend HANYA mengenal role ini. Legacy rapiDSK roles
// (ORG_ADMIN, DATA_PROVIDER, READONLY, dll) di-map oleh IAM/backend layer
// sebelum JWT di-issue. Lihat `docs/IAM_ROLE_MAPPING_MATRIX.md`.
//
//   SUPER_ADMIN  : Platform admin, full access cross-org
//   ADMIN        : Organization admin
//   PROVIDER     : Data provider participant (KKKS)
//   CONSUMER     : Data consumer participant (Regulator)
//   VIEWER       : Read-only user
//   AUDITOR      : Compliance/audit officer
//   GIS_ANALYST  : Spatial data power user

export type AppRole =
  | "SUPER_ADMIN"
  | "ADMIN"
  | "PROVIDER"
  | "CONSUMER"
  | "VIEWER"
  | "AUDITOR"
  | "GIS_ANALYST";

const CANONICAL_ROLES: readonly AppRole[] = [
  "SUPER_ADMIN",
  "ADMIN",
  "PROVIDER",
  "CONSUMER",
  "VIEWER",
  "AUDITOR",
  "GIS_ANALYST",
] as const;

const isCanonicalRole = (role: string): role is AppRole =>
  (CANONICAL_ROLES as readonly string[]).includes(role);

export interface AuthUser {
  id: string;
  email: string;
  full_name: string;
  /**
   * Primary canonical role (untuk backward compat dengan komponen lama).
   * Phase 1B: di-derive sebagai roles[0] kalau dari Keycloak.
   */
  role: AppRole;
  /** Multi-role array (canonical). Empty fallback = ["VIEWER"]. */
  roles: AppRole[];
  /** Granular permission strings (mis. `gis.query`, `consent.revoke`). */
  permissions: string[];
  category: { name: string; code: string; description: string };
  group: { name: string; code: string; description: string; priority: number };
  /** ID participant (metadata-participant) yang ditautkan ke user. null untuk superadmin.
   *  Dipakai untuk memfilter kontrak di mana saya provider/consumer. */
  participantId?: string | null;
}

interface AuthContextType {
  user: AuthUser | null;
  /** Primary canonical role (single, untuk komponen yang masih single-role). */
  role: AppRole;
  /** Multi-role array. */
  roles: AppRole[];
  /** Granular permissions. */
  permissions: string[];
  /** ID participant user aktif (null untuk superadmin). */
  participantId: string | null;
  isAuthenticated: boolean;
  /** Check if current user has at least one of the given canonical roles. */
  hasRole: (roles: AppRole[]) => boolean;
  /** Check if current user has the given permission key. */
  hasPermission: (permission: string) => boolean;
  /** Sync user into context (called after legacy login). */
  setAuthUser: (userInfo: AuthUser) => void;
  /** Clear auth state (called after logout). */
  clearAuth: () => void;
}

// ─── Role Derivation (legacy rapiDSK login response) ─────────────────
//
// Map backend category.code + group.code → canonical AppRole.
// Hanya dipakai saat Keycloak tidak aktif (legacy fallback).

export const deriveRole = (
  categoryCode: string,
  groupCode: string,
): AppRole => {
  const cat = categoryCode.toUpperCase();
  const grp = groupCode.toUpperCase();

  if (
    grp.includes("SUPER") ||
    grp.includes("PLATFORM") ||
    cat.includes("PLATFORM") ||
    cat.includes("SYSTEM")
  ) {
    return "SUPER_ADMIN";
  }
  if (grp.includes("ADMIN")) {
    return "ADMIN";
  }
  if (grp.includes("AUDIT") || cat.includes("AUDIT") || cat.includes("COMPLIANCE")) {
    return "AUDITOR";
  }
  if (grp.includes("GIS") || cat.includes("GIS") || cat.includes("SPATIAL")) {
    return "GIS_ANALYST";
  }
  // GX-Space category/group codes: PROVIDER (KKKS) & CONSUMER langsung.
  if (grp.includes("PROVIDER") || cat.includes("PROVIDER") || cat.includes("KKKS") || cat.includes("ENTERPRISE")) {
    return "PROVIDER";
  }
  if (
    grp.includes("CONSUMER") ||
    cat.includes("CONSUMER") ||
    cat.includes("REGULATOR") ||
    cat.includes("GOV") ||
    cat.includes("GOVERNMENT") ||
    cat.includes("SKK")
  ) {
    return "CONSUMER";
  }

  return "VIEWER";
};

// ─── Keycloak JWT → AuthUser ─────────────────────────────────────────

/**
 * Parse Keycloak JWT (already authenticated) into AuthUser shape.
 * Filter realm roles ke canonical 7 saja, drop default Keycloak roles
 * (offline_access, uma_authorization, default-roles-*).
 */
const buildUserFromKeycloak = (): AuthUser | null => {
  const keycloak = getKeycloak();
  if (!keycloak?.authenticated) return null;

  const t = keycloak.tokenParsed as Record<string, unknown> | undefined;
  if (!t) return null;

  // ─── Defensive role extraction ──────────────────────────────────────
  // Coba multiple lokasi (urutan probability):
  //   1. realm_access.roles                (standard Keycloak default)
  //   2. roles                              (custom mapper di top-level)
  //   3. resource_access.{client}.roles     (resource-level roles)
  const realmRoles =
    (t.realm_access as { roles?: string[] } | undefined)?.roles ?? [];
  const topLevelRoles = Array.isArray(t.roles) ? (t.roles as string[]) : [];
  const resourceAccess = t.resource_access as
    | Record<string, { roles?: string[] }>
    | undefined;
  const clientRoles =
    resourceAccess && resourceAccess[(t.azp as string) ?? ""]?.roles
      ? (resourceAccess[t.azp as string].roles as string[])
      : [];

  const allRolesRaw = [...realmRoles, ...topLevelRoles, ...clientRoles];

  // Normalize uppercase + dedupe + filter ke canonical 7
  const canonicalRoles: AppRole[] = Array.from(
    new Set(
      allRolesRaw
        .map((r) => (typeof r === "string" ? r.toUpperCase() : r))
        .filter(isCanonicalRole),
    ),
  );

  // Permissions claim (custom mapper di Keycloak realm)
  const permissionsRaw = t.permissions;
  const permissions: string[] = Array.isArray(permissionsRaw)
    ? permissionsRaw.filter((p): p is string => typeof p === "string")
    : [];

  // Pick primary role: pertama dari canonicalRoles, fallback VIEWER
  const primary: AppRole = canonicalRoles[0] ?? "VIEWER";

  // Participant info dari custom mapper (kalau ada)
  const participantRaw = t.participant as
    | { organization_name?: string; role_type?: string }
    | undefined;
  const orgName = participantRaw?.organization_name ?? "";

  // Dev-only: log parsed role mapping untuk diagnose RBAC issue.
  // Split per-line supaya copy-paste console output easy (no need to expand).
  if (import.meta.env.DEV) {
    console.log("[Auth] === JWT parse debug ===");
    console.log("[Auth] realm_access.roles =", JSON.stringify(realmRoles));
    console.log("[Auth] top-level roles =", JSON.stringify(topLevelRoles));
    console.log("[Auth] resource_access roles =", JSON.stringify(clientRoles));
    console.log("[Auth] canonical_roles parsed =", JSON.stringify(canonicalRoles));
    console.log("[Auth] primary role =", primary);
    console.log("[Auth] permissions =", JSON.stringify(permissions));
    console.log("[Auth] name =", t.name, "| preferred_username =", t.preferred_username);
    console.log("[Auth] FULL tokenParsed =", JSON.stringify(t, null, 2));
    console.log("[Auth] ======================");
  }

  return mergeStoredBinding({
    id: (t.sub as string) ?? "",
    email: (t.email as string) ?? "",
    full_name:
      (t.name as string) ??
      (t.preferred_username as string) ??
      (t.given_name as string) ??
      "User",
    role: primary,
    roles: canonicalRoles.length > 0 ? canonicalRoles : ["VIEWER"],
    permissions,
    // Map participant info ke shape category/group lama untuk backward compat
    category: {
      name: orgName,
      code: orgName,
      description: "",
    },
    group: {
      name: primary,
      code: primary,
      description: "",
      priority: 0,
    },
    participantId: (t.participant_id as string | null | undefined) ?? null,
  });
};

// ─── Context ──────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextType | null>(null);

const STORAGE_KEY_USER = "user_info";
const STORAGE_KEY_TOKEN = "auth_token";

const mergeStoredBinding = (user: AuthUser): AuthUser => {
  const preferredOrgName = getPreferredOrganizationName();
  const preferredParticipantId = getPreferredParticipantId();

  return {
    ...user,
    category: {
      ...user.category,
      name: preferredOrgName || user.category.name || "",
      code: user.category.code || preferredOrgName || "",
    },
    participantId:
      user.role === "SUPER_ADMIN"
        ? null
        : user.participantId ?? preferredParticipantId ?? null,
  };
};

// Build AuthUser dari access_token GX-Space (LOCAL JWT). Klaim: sub, username,
// email, category{code}, group{code}, is_superadmin.
const buildUserFromJwt = (token: string): AuthUser | null => {
  const c = decodeJwt(token);
  if (!c) return null;
  const catCode = c.category?.code ?? "";
  const grpCode = c.group?.code ?? "";
  const role: AppRole = c.is_superadmin ? "SUPER_ADMIN" : deriveRole(catCode, grpCode);
  return mergeStoredBinding({
    id: c.sub ?? "",
    email: c.email ?? "",
    full_name: (c.username as string) ?? c.email ?? "User",
    role,
    roles: [role],
    permissions: [],
    category: { name: catCode, code: catCode, description: "" },
    group: { name: grpCode, code: grpCode, description: "", priority: 0 },
    participantId: (c.participant_id as string | null) ?? null,
  });
};

const loadUserFromStorage = (): AuthUser | null => {
  try {
    const token = localStorage.getItem(STORAGE_KEY_TOKEN);
    if (!token) return null;

    // Otoritatif: decode JWT GX-Space.
    const fromJwt = buildUserFromJwt(token);
    if (fromJwt) return fromJwt;

    // Fallback: user_info tersimpan (mis. login lama).
    const raw = localStorage.getItem(STORAGE_KEY_USER);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const role = deriveRole(parsed.category?.code || "", parsed.group?.code || "");
    return mergeStoredBinding({
      id: parsed.id || "",
      email: parsed.email || "",
      full_name: parsed.full_name || "",
      role,
      roles: parsed.roles && Array.isArray(parsed.roles) ? parsed.roles : [role],
      permissions: Array.isArray(parsed.permissions) ? parsed.permissions : [],
      category: parsed.category || { name: "", code: "", description: "" },
      group: parsed.group || { name: "", code: "", description: "", priority: 0 },
      participantId: parsed.participantId ?? null,
    });
  } catch {
    return null;
  }
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const { authenticated: keycloakAuthenticated, tokenVersion } = useKeycloak();

  const [user, setUser] = useState<AuthUser | null>(() => {
    // Initial state: try Keycloak first, then legacy storage
    const keycloak = getKeycloak();
    if (isKeycloakConfigured() && keycloak?.authenticated) {
      return buildUserFromKeycloak();
    }
    return loadUserFromStorage();
  });

  // Re-sync saat Keycloak state berubah (login, logout, token refresh)
  useEffect(() => {
    if (isKeycloakConfigured() && keycloakAuthenticated) {
      const fromKc = buildUserFromKeycloak();
      if (fromKc) {
        setUser(fromKc);
        return;
      }
    }
    // Fallback / atau user belum login via Keycloak — coba legacy
    setUser(loadUserFromStorage());
    // tokenVersion di-include supaya re-sync setiap token refresh
  }, [keycloakAuthenticated, tokenVersion]);

  const setAuthUser = useCallback((userInfo: AuthUser) => {
    setUser(userInfo);
  }, []);

  const clearAuth = useCallback(() => {
    setUser(null);
    localStorage.removeItem("auth_token");
    localStorage.removeItem("user_info");
    localStorage.removeItem("remember_device");
    clearSessionBinding();
  }, []);

  const hasRole = useCallback(
    (rolesToCheck: AppRole[]): boolean => {
      if (!user) return false;
      return rolesToCheck.some((r) => user.roles.includes(r));
    },
    [user],
  );

  const hasPermission = useCallback(
    (permission: string): boolean => {
      if (!user) return false;
      return user.permissions.includes(permission);
    },
    [user],
  );

  const role: AppRole = user?.role ?? "VIEWER";
  const roles: AppRole[] = user?.roles ?? [];
  const permissions: string[] = user?.permissions ?? [];
  const participantId: string | null = user?.participantId ?? null;

  return (
    <AuthContext.Provider
      value={{
        user,
        role,
        roles,
        permissions,
        participantId,
        isAuthenticated: !!user,
        hasRole,
        hasPermission,
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
