import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Rocket,
  Building2,
  Layers,
  Users2,
  Database,
  FileText,
  ArrowRightLeft,
  ClipboardCheck,
  Shield,
  Code2,
} from "lucide-react";
import type { AppRole } from "@/context/AuthContext";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles: AppRole[];
}

/**
 * All sidebar menu items with per-role visibility.
 *
 * SUPER_ADMIN : sees everything
 * PROVIDER    : data owner (KKKS) – manages datasets, contracts, transfers
 * CONSUMER    : data requester (Regulator) – browses, requests, audits
 * VIEWER      : read-only access to dataset catalog and API docs
 */
export const MENU_ITEMS: MenuItem[] = [
  {
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER", "VIEWER"],
  },
  {
    icon: Rocket,
    label: "Onboarding",
    path: "/onboarding",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: Building2,
    label: "Organizations",
    path: "/organizations",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: Layers,
    label: "Domains",
    path: "/domains",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: Users2,
    label: "Participants",
    path: "/participants",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: Database,
    label: "Dataset Catalog",
    path: "/datasets",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER", "VIEWER"],
  },
  {
    icon: FileText,
    label: "Contracts",
    path: "/contracts",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: ArrowRightLeft,
    label: "Data Transfer",
    path: "/transfer",
    roles: ["SUPER_ADMIN", "CONSUMER"], // ❌ provider gak boleh
  },
  {
    icon: ClipboardCheck,
    label: "Audit Trail",
    path: "/audit",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
  {
    icon: Shield,
    label: "Compliance",
    path: "/compliance",
    roles: ["SUPER_ADMIN"], // ❌ provider & consumer gak perlu
  },
  {
    icon: Code2,
    label: "API Docs",
    path: "/api-docs",
    roles: ["SUPER_ADMIN"],
  },
];

// Derive allowed routes per role from MENU_ITEMS + /settings (always accessible)
const buildRoleRoutes = (): Record<AppRole, string[]> => {
  const roles: AppRole[] = ["SUPER_ADMIN", "PROVIDER", "CONSUMER", "VIEWER"];
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
  const allowed = ROLE_ROUTES[role] ?? [];

  const p = path !== "/" ? path.replace(/\/+$/, "") : "/";

  return allowed.some((route) => {
    if (route === "/") return p === "/";
    return p === route || p.startsWith(route + "/");
  });
};

/** Human-readable label for each role (used in UI badges). */
export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Admin",
  PROVIDER: "Provider",
  CONSUMER: "Consumer",
  VIEWER: "Viewer",
};
