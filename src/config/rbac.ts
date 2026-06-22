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
  },
  {
    section: "persiapan",
    icon: Building2,
    label: "Organizations",
    path: "/organizations",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  {
    section: "persiapan",
    icon: Link2,
    label: "Connection Pools",
    path: "/connection-pools",
    roles: ["SUPER_ADMIN", "ADMIN"],
  },
  // ── Pemantauan & Operasional ──
  {
    section: "pemantauan",
    icon: LayoutDashboard,
    label: "Dashboard",
    path: "/",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "pemantauan",
    icon: Database,
    label: "Katalog Dataset",
    path: "/datasets",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "GIS_ANALYST"],
  },
  {
    section: "pemantauan",
    icon: FileSignature,
    label: "Contracts",
    path: "/contracts",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "PROVIDER", "AUDITOR"],
  },
  {
    section: "pemantauan",
    icon: Inbox,
    label: "Permintaan Masuk",
    path: "/inbox",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER"],
  },
  {
    section: "pemantauan",
    icon: Send,
    label: "Transfer Data",
    path: "/transfers",
    roles: ["PROVIDER", "SUPER_ADMIN", "ADMIN"],
  },
  {
    section: "pemantauan",
    icon: Users,
    label: "Participants",
    path: "/participants",
    // Gabungan dari Pendaftaran KKKS & Providers
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "AUDITOR"],
  },
  {
    section: "pemantauan",
    icon: FileJson,
    label: "Schemas",
    path: "/schemas",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "pemantauan",
    icon: BookOpen,
    label: "Vocabularies",
    path: "/vocabularies",
    roles: ["SUPER_ADMIN", "ADMIN", "PROVIDER", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "pemantauan",
    icon: Shield,
    label: "Policies",
    path: "/policies",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "PROVIDER", "AUDITOR"],
  },
  {
    section: "pemantauan",
    icon: ClipboardCheck,
    label: "Audit Trail",
    path: "/audit",
    roles: ["SUPER_ADMIN", "ADMIN", "AUDITOR"],
  },
  // ── Lainnya ──
  {
    section: "lain",
    icon: Code2,
    label: "API Docs",
    path: "/api-docs",
    roles: ["SUPER_ADMIN", "ADMIN", "CONSUMER", "VIEWER", "AUDITOR", "GIS_ANALYST"],
  },
  {
    section: "lain",
    icon: Shield,
    label: "Deployment Config",
    path: "/deployment-config",
    roles: ["SUPER_ADMIN", "ADMIN"],
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

/**
 * SUPER_ADMIN selalu boleh akses semua route.
 * Role lain: cocokkan exact path atau prefix (untuk dynamic route seperti /participants/:id).
 * Contoh: jika "/participants" diizinkan → "/participants/abc-123" juga diizinkan.
 */
export const canAccess = (role: AppRole, path: string): boolean => {
  if (role === "SUPER_ADMIN") return true;
  const allowed = ROLE_ROUTES[role] ?? [];
  return allowed.some((r) => r === path || (r !== "/" && path.startsWith(r + "/")));
};

export const canAccessAny = (roles: AppRole[], path: string): boolean => {
  return roles.some((r) => canAccess(r, path));
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
