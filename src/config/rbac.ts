import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Database,
  FileJson,
  BookOpen,
  Wand2,
  Globe,
  Shield,
  ClipboardCheck,
  Code2,
} from "lucide-react";
import type { AppRole } from "@/context/AuthContext";

// ─── Section discriminator ────────────────────────────────────────────
//
// Hanya `legacy` (rapiDSK Enterprise). Section field tetap dipertahankan
// supaya gampang ditambah category lain di masa depan.
export type MenuSection = "legacy";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Canonical roles yang boleh akses menu ini (any-of). */
  roles: AppRole[];
  /** Section grouping di sidebar. */
  section: MenuSection;
  /**
   * Optional fine-grained gate. Kalau di-set, user harus punya
   * minimal SATU permission di array ini (selain role match).
   */
  permissions?: string[];
}

/**
 * All sidebar menu items — backed by rapiDSK Enterprise API spec.
 *
 * Canonical role model (IAM-3):
 *   SUPER_ADMIN, ADMIN, PROVIDER, CONSUMER, VIEWER, AUDITOR, GIS_ANALYST
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    section: "legacy",
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "legacy",
    icon: Building2,
    label: "Organizations",
    path: "/organizations",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    section: "legacy",
    icon: Users,
    label: "Providers",
    path: "/providers",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST", "AUDITOR"],
  },
  {
    section: "legacy",
    icon: Database,
    label: "Dataset Catalog",
    path: "/datasets",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST"],
  },
  {
    section: "legacy",
    icon: FileJson,
    label: "Schemas",
    path: "/schemas",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST", "AUDITOR"],
  },
  {
    section: "legacy",
    icon: BookOpen,
    label: "Vocabularies",
    path: "/vocabularies",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST", "AUDITOR"],
  },
  {
    section: "legacy",
    icon: Wand2,
    label: "Auto Mapping",
    path: "/mapping",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER"],
  },
  {
    section: "legacy",
    icon: Globe,
    label: "ArcGIS Services",
    path: "/arcgis",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "GIS_ANALYST"],
  },
  {
    section: "legacy",
    icon: Shield,
    label: "Governance Policies",
    path: "/policies",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "legacy",
    icon: ClipboardCheck,
    label: "Audit Trail",
    path: "/audit",
    roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  },
  {
    section: "legacy",
    icon: Code2,
    label: "API Docs",
    path: "/api-docs",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
];

// ─── Route gating ─────────────────────────────────────────────────────

/**
 * Build allowed routes per role from MENU_ITEMS + /settings (always accessible).
 */
const buildRoleRoutes = (): Record<AppRole, string[]> => {
  const roles: AppRole[] = [
    "SUPER_ADMIN",
    "ADMIN",
    "PROVIDER",
    "CONSUMER",
    "VIEWER",
    "AUDITOR",
    "GIS_ANALYST",
  ];
  const result = {} as Record<AppRole, string[]>;
  for (const role of roles) {
    result[role] = [
      ...MENU_ITEMS.filter((m) => m.roles.includes(role)).map((m) => m.path),
      "/settings",
    ];
  }
  return result;
};

const ROLE_ROUTES = buildRoleRoutes();

/** Returns true if the given role may access the given path. */
export const canAccess = (role: AppRole, path: string): boolean => {
  return ROLE_ROUTES[role]?.includes(path) ?? false;
};

/**
 * Multi-role variant: returns true if ANY of the user's roles may access path.
 */
export const canAccessAny = (roles: AppRole[], path: string): boolean => {
  return roles.some((r) => canAccess(r, path));
};

/** Human-readable label for each role (used in UI badges). */
export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PROVIDER: "Provider",
  CONSUMER: "Consumer",
  VIEWER: "Viewer",
  AUDITOR: "Auditor",
  GIS_ANALYST: "GIS Analyst",
};
