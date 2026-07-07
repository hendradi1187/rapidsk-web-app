import type { LucideIcon } from "lucide-react";
import {
  LayoutDashboard,
  Building2,
  Users,
  Database,
  FileJson,
  BookOpen,
  Shield,
  FileSignature,
  Inbox,
  UserPlus,
  Sparkles,
  Send,
  ClipboardCheck,
  Code2,
  Link2,
  ShieldCheck,
  Braces,
  FileLock2,
  Activity,
} from "lucide-react";
import type { AppRole } from "@/context/AuthContext";

export type MenuSection = "persiapan" | "pemantauan" | "lain";

/** Label grup sidebar (urutan = alur kerja: setup dulu, baru pantau/operasional). */
export const SECTION_LABELS: Record<MenuSection, string> = {
  persiapan: "Persiapan",
  pemantauan: "Pemantauan & Operasional",
  lain: "Lainnya",
};

/** Urutan render grup di sidebar. */
export const SECTION_ORDER: MenuSection[] = ["persiapan", "pemantauan", "lain"];

export interface MenuItem {
  icon: LucideIcon;
  label: string;
  path: string;
  /** Canonical roles yang boleh akses menu ini (any-of). */
  roles: AppRole[];
  section: MenuSection;
  permissions?: string[];
}

/**
 * Sidebar menu — selaras breakdown FE (data exchange, tanpa peta).
 * SKK Migas = SUPER_ADMIN/ADMIN/CONSUMER/AUDITOR ; KKKS = PROVIDER.
 */
export const MENU_ITEMS: MenuItem[] = [
  // ── Persiapan (alur setup A–Z: dijalankan lebih dulu di instance fresh) ──
  {
    section: "persiapan",
    icon: Sparkles,
    label: "Setup Juknis",
    path: "/setup-juknis",
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [
      "setup-juknis.manage",
      "onboarding.setup.manage",
      "onboarding.registrations.approve",
    ],
  },
  {
    section: "persiapan",
    icon: Building2,
    label: "Organizations",
    path: "/organizations",
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [
      "organizations.manage",
      "governance.organizations.manage",
      "governance.domains.manage",
    ],
  },
  {
    section: "persiapan",
    icon: Link2,
    label: "Registry Koneksi",
    path: "/connection-pools",
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [
      "connection-pools.manage",
      "connector.connection-pool.manage",
      "connector.registry.manage",
    ],
  },
  {
    section: "persiapan",
    icon: Shield,
    label: "Hak Akses",
    path: "/access-control",
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [
      "iam.policy.manage",
      "iam.permissions.manage",
      "identity-provider.iam.manage",
      "rbac.manage",
    ],
  },
  // ── Pemantauan & Operasional ──
  {
    section: "pemantauan",
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
    permissions: ["dashboard.view"],
  },
  {
    section: "pemantauan",
    icon: Database,
    label: "Katalog Dataset",
    path: "/datasets",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST"],
    permissions: [
      "datasets.read",
      "dataset.read",
      "datasets.manage",
      "dataset.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: FileSignature,
    label: "Contracts",
    path: "/contracts",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "PROVIDER", "AUDITOR"],
    permissions: [
      "contracts.read",
      "contract.read",
      "contracts.manage",
      "contract.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Inbox,
    label: "Permintaan Masuk",
    path: "/inbox",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER"],
    permissions: [
      "inbox.read",
      "requests.incoming.read",
      "requests.incoming.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Send,
    label: "Transfer Data",
    path: "/transfers",
    roles: ["PROVIDER", "SUPER_ADMIN", "ADMIN"],
    permissions: [
      "transfers.read",
      "transfer.read",
      "transfers.manage",
      "transfer.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Users,
    label: "Participants",
    path: "/participants",
    // Gabungan dari Pendaftaran KKKS & Providers
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "AUDITOR"],
    permissions: [
      "participants.read",
      "participants.manage",
      "participants.approve",
      "onboarding.participants.manage",
      "onboarding.registrations.approve",
    ],
  },
  {
    section: "pemantauan",
    icon: FileJson,
    label: "Schemas",
    path: "/schemas",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
    permissions: [
      "schemas.read",
      "schema.read",
      "schemas.manage",
      "schema.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: BookOpen,
    label: "Vocabularies",
    path: "/vocabularies",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
    permissions: [
      "vocabularies.read",
      "vocabulary.read",
      "vocabularies.manage",
      "vocabulary.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Braces,
    label: "Metadata Katalog",
    path: "/catalog-metadata",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "GIS_ANALYST"],
    permissions: [
      "data-catalog.manage",
      "data-catalog.read",
      "vocabulary.manage",
      "datasets.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Shield,
    label: "Policies",
    path: "/policies",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "PROVIDER", "AUDITOR"],
    permissions: [
      "policies.read",
      "policy.read",
      "policies.manage",
      "policy.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: FileLock2,
    label: "Kebijakan Kontrak",
    path: "/contract-policies",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "AUDITOR"],
    permissions: [
      "policy-contract.manage",
      "policies.manage",
      "policy.manage",
      "contracts.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: ClipboardCheck,
    label: "Audit Trail",
    path: "/audit",
    roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
    permissions: [
      "audit.read",
      "audit.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: ShieldCheck,
    label: "Kepatuhan",
    path: "/compliance",
    roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
    permissions: [
      "compliance.read",
      "compliance.manage",
      "audit.read",
      "audit.manage",
    ],
  },
  {
    section: "pemantauan",
    icon: Activity,
    label: "Connector Monitor",
    path: "/connector-monitoring",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "AUDITOR"],
    permissions: [
      "connector.monitoring.read",
      "connector.monitoring.manage",
      "connector.runtime.manage",
    ],
  },
  // ── Lainnya ──
  {
    section: "lain",
    icon: Code2,
    label: "Dokumentasi API",
    path: "/api-docs",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
    permissions: [
      "docs.read",
      "api-docs.read",
    ],
  },
  {
    section: "lain",
    icon: Shield,
    label: "Konfigurasi Sistem",
    path: "/deployment-config",
    roles: ["SUPER_ADMIN", "ADMIN"],
    permissions: [
      "deployment-config.manage",
      "runtime-config.manage",
      "system.runtime.manage",
    ],
  },
];

// ─── Route gating ─────────────────────────────────────────────────────

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
      ...(role === "SUPER_ADMIN" || role === "ADMIN" ? ["/deployment-config"] : []),
    ];
  }
  return result;
};

const ROLE_ROUTES = buildRoleRoutes();

const findMenuItem = (path: string) =>
  MENU_ITEMS.find((item) => item.path === path || (item.path !== "/" && path.startsWith(item.path + "/")));

/**
 * SUPER_ADMIN selalu boleh akses semua route.
 * Role lain: cocokkan exact path atau prefix (untuk dynamic route seperti /participants/:id).
 * Contoh: jika "/participants" diizinkan → "/participants/abc-123" juga diizinkan.
 */
export const canAccess = (
  role: AppRole,
  path: string,
  hasPermission?: (permission: string) => boolean,
): boolean => {
  if (role === "SUPER_ADMIN") return true;
  const menuItem = findMenuItem(path);
  if (menuItem?.permissions?.length && hasPermission) {
    const permissionGranted = menuItem.permissions.some((permission) => hasPermission(permission));
    if (permissionGranted) return true;
  }
  const allowed = ROLE_ROUTES[role] ?? [];
  return allowed.some((r) => r === path || (r !== "/" && path.startsWith(r + "/")));
};

export const canAccessAny = (
  roles: AppRole[],
  path: string,
  hasPermission?: (permission: string) => boolean,
): boolean => {
  return roles.some((r) => canAccess(r, path, hasPermission));
};

export const ROLE_LABELS: Record<AppRole, string> = {
  SUPER_ADMIN: "SKK Migas (Super Admin)",
  ADMIN: "Admin",
  PROVIDER: "KKKS (Provider)",
  CONSUMER: "SKK Migas (Consumer)",
  VIEWER: "Viewer",
  AUDITOR: "Auditor",
  GIS_ANALYST: "GIS Analyst",
};
