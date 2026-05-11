import type { LucideIcon } from "lucide-react";
import {
  Activity,
  Building2,
  ClipboardCheck,
  Database,
  FileText,
  Gauge,
  Handshake,
  KeyRound,
  Layers,
  LayoutDashboard,
  Network,
  RadioTower,
  Rocket,
  ArrowRightLeft,
  Shield,
  LockKeyhole,
  Code2,
  UserCog,
  BookOpen,
  Users2,
} from "lucide-react";
import type { AppRole } from "@/context/AuthContext";

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  roles: AppRole[];
  requiredPermissions?: string[];
}

/**
 * All sidebar menu items with per-role visibility.
 *
 * SUPER_ADMIN : sees everything
 * PROVIDER    : data owner (KKKS) - manages datasets, contracts, transfers
 * CONSUMER    : data requester (Regulator) - browses, requests, audits
 * VIEWER      : read-only access to dataset catalog and API docs
 */
export const MENU_ITEMS_V1: MenuItem[] = [
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
    roles: ["SUPER_ADMIN"],
  },
  {
    icon: Building2,
    label: "Organizations",
    path: "/organizations",
    roles: ["SUPER_ADMIN"],
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
    roles: ["SUPER_ADMIN"],
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
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
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
    roles: ["SUPER_ADMIN", "CONSUMER"],
  },
  {
    icon: Code2,
    label: "API Docs",
    path: "/api-docs",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER", "VIEWER"],
  },
  {
    icon: LockKeyhole,
    label: "Access Management",
    path: "/access",
    roles: ["SUPER_ADMIN"],
  },
  {
    icon: UserCog,
    label: "User Management",
    path: "/users",
    roles: ["SUPER_ADMIN"],
  },
  {
    icon: BookOpen,
    label: "Vocabularies",
    path: "/vocabularies",
    roles: ["SUPER_ADMIN", "PROVIDER"],
  },
  {
    icon: Network,
    label: "Connection Pools",
    path: "/pools",
    roles: ["SUPER_ADMIN", "PROVIDER"],
  },
  {
    icon: Handshake,
    label: "Agreements",
    path: "/agreements",
    roles: ["SUPER_ADMIN", "PROVIDER", "CONSUMER"],
  },
];

export const MENU_ITEMS_V2: MenuItem[] = [
  // ── AUTHORITY menus — for SUPER_ADMIN and ADMIN (internal users)
  // Per sequence diagram Phase 1 & 2: register participant, role mgmt,
  // email activation, monitoring, gateway, channels.
  // ADMIN sees everything visible here EXCEPT items requiring users.manage
  // (Register Admin Login).
  {
    icon: Gauge,
    label: "Dashboard Authority",
    path: "/v2/authority/dashboard",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    icon: Users2,
    label: "Onboarding Registration",
    path: "/v2/authority/participant-registration",
    roles: ["SUPER_ADMIN"],
    requiredPermissions: ["participants.manage", "users.manage"],
  },
  {
    icon: Users2,
    label: "Register Admin Login",
    path: "/v2/authority/register-admin-consumer",
    roles: ["SUPER_ADMIN"], // ADMIN tidak bisa register user (need users.manage)
    requiredPermissions: ["users.manage"],
  },
  {
    icon: KeyRound,
    label: "Role Setup",
    path: "/v2/authority/role-setup",
    roles: ["SUPER_ADMIN", "ADMIN"],
    requiredPermissions: ["participants.manage"],
  },
  // Activation Lifecycle (stub localStorage page) dihapus dari menu — bingungin.
  // Real activation flow ada di "Activation Email Preview" (/v2/authority/activation-email)
  // yang bisa POST /confirm-email beneran.
  {
    icon: RadioTower,
    label: "Gateway Monitor",
    path: "/v2/authority/gateway",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    icon: Network,
    label: "Channels",
    path: "/v2/authority/channels",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    icon: Building2,
    label: "Organizations",
    path: "/v2/authority/organizations",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    icon: Gauge,
    label: "Dashboard Consumer",
    path: "/v2/admin-consumer/dashboard",
    roles: ["CONSUMER"],
  },
  // ── ADMIN CONSUMER menus — STRICT, cuma role CONSUMER yg lihat
  {
    icon: BookOpen,
    label: "Master Data",
    path: "/v2/admin-consumer/master-data",
    roles: ["CONSUMER"],
    requiredPermissions: ["catalog.manage"],
  },
  {
    icon: FileText,
    label: "Policy & Contract",
    path: "/v2/admin-consumer/policy-contract",
    roles: ["CONSUMER"],
    requiredPermissions: ["contracts.manage"],
  },
  {
    icon: Shield,
    label: "System Setup",
    path: "/v2/admin-consumer/system-setup",
    roles: ["CONSUMER"],
    requiredPermissions: ["monitoring.manage"],
  },
  {
    icon: Building2,
    label: "Admin Provider",
    path: "/v2/admin-consumer/admin-provider",
    roles: ["CONSUMER"],
    requiredPermissions: ["participants.manage"],
  },
  {
    icon: Network,
    label: "Domain Mapping",
    path: "/v2/admin-consumer/domain-mapping",
    roles: ["SUPER_ADMIN", "CONSUMER"],
    requiredPermissions: ["mapping.manage"],
  },
  {
    icon: RadioTower,
    label: "Transfer Monitor",
    path: "/v2/admin-consumer/transfer-monitor",
    roles: ["CONSUMER"],
    requiredPermissions: ["transfer.view"],
  },
  {
    icon: ClipboardCheck,
    label: "Audit Log",
    path: "/v2/admin-consumer/audit",
    roles: ["CONSUMER"],
    requiredPermissions: ["audit.view"],
  },
  {
    icon: Shield,
    label: "Compliance",
    path: "/v2/admin-consumer/compliance",
    roles: ["CONSUMER"],
    requiredPermissions: ["compliance.view"],
  },
  {
    icon: Gauge,
    label: "Reports",
    path: "/v2/admin-consumer/reports",
    roles: ["CONSUMER"],
    requiredPermissions: ["reports.generate"],
  },
  {
    icon: Gauge,
    label: "Dashboard Provider",
    path: "/v2/admin-provider/dashboard",
    roles: ["PROVIDER"],
  },
  {
    icon: Layers,
    label: "Assigned Domains",
    path: "/v2/admin-provider/assigned-domains",
    roles: ["PROVIDER"],
    requiredPermissions: ["mapping.view:own"],
  },
  {
    icon: Handshake,
    label: "Contract Fulfilment",
    path: "/v2/admin-provider/contract-fulfilment",
    roles: ["PROVIDER"],
    requiredPermissions: ["fulfilment.manage"],
  },
  {
    icon: Database,
    label: "Dataset Registration",
    path: "/v2/admin-provider/dataset-registration",
    roles: ["PROVIDER"],
    requiredPermissions: ["datasets.manage"],
  },
  {
    icon: Activity,
    label: "Fulfilment Reports",
    path: "/v2/admin-provider/fulfilment-reports",
    roles: ["PROVIDER"],
    requiredPermissions: ["transfer.view:own"],
  },
];

export const PERMISSIONS_BY_ROLE: Record<AppRole, string[]> = {
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

export const MENU_ITEMS = MENU_ITEMS_V1;

export const getMenuItems = (
  role: AppRole,
  isV2: boolean,
  permissions: string[] = [],
  _isRealSuperAdmin = false
): MenuItem[] => {
  const items = isV2 ? MENU_ITEMS_V2 : MENU_ITEMS_V1;
  // Strict per role — semua role (termasuk SUPER_ADMIN) tampil cuma menu yg
  // role-nya match. Untuk eksplorasi cross-role, real super admin pakai
  // RoleSwitcher widget (yg ngubah role, sidebar otomatis adapt).
  return items.filter((item) => {
    if (!item.roles.includes(role)) return false;
    if (!isV2 || !item.requiredPermissions?.length) return true;
    return item.requiredPermissions.every((permission) => permissions.includes(permission));
  });
};

// Derive allowed routes per role from MENU_ITEMS + /settings (always accessible)
const buildRoleRoutes = (): Record<AppRole, string[]> => {
  const roles: AppRole[] = ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER"];
  const result = {} as Record<AppRole, string[]>;
  for (const role of roles) {
    result[role] = [
      ...MENU_ITEMS_V1.filter((m) => m.roles.includes(role)).map((m) => m.path),
      "/settings",
    ];
  }
  return result;
};

const ROLE_ROUTES = buildRoleRoutes();

const buildV2RoleRoutes = (): Record<AppRole, string[]> => {
  const roles: AppRole[] = ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER"];
  const result = {} as Record<AppRole, string[]>;
  for (const role of roles) {
    result[role] = MENU_ITEMS_V2.filter((m) => m.roles.includes(role)).map((m) => m.path);
  }
  return result;
};

const V2_ROLE_ROUTES = buildV2RoleRoutes();

/** Returns true if the given role may access the given path. */
export const canAccess = (role: AppRole, path: string, isV2 = false): boolean => {
  if (isV2) {
    if (role === "VIEWER" && path === "/") return true;
    // SUPER_ADMIN may access any V2 route for testing/inspection.
    if (role === "SUPER_ADMIN") return MENU_ITEMS_V2.some((m) => m.path === path);
    return V2_ROLE_ROUTES[role]?.includes(path) ?? false;
  }

  if (path.startsWith("/v2")) return false;
  return ROLE_ROUTES[role]?.includes(path) ?? false;
};

/** Human-readable label for each role (used in UI badges). */
export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin",
  ADMIN: "Admin",
  PROVIDER: "Provider",
  CONSUMER: "Consumer",
  VIEWER: "Viewer",
};

export const V2_ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "Super Admin / Data Space Authority",
  ADMIN: "Admin / Internal Operator",
  CONSUMER: "Admin Consumer / SKK Migas",
  PROVIDER: "Admin Provider / KKKS",
  VIEWER: "Viewer",
};

