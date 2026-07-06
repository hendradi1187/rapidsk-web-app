import { Link, useLocation } from "react-router-dom";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS, SECTION_LABELS, SECTION_ORDER } from "@/config/rbac";

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { role, roles, hasPermission } = useAuth();
  const effectiveRoles = roles.length > 0 ? roles : [role];

  // Menu mengikuti role atau permission granular dari IAM.
  const visibleItems = MENU_ITEMS.filter((item) =>
    effectiveRoles.some((candidate) => item.roles.includes(candidate)) ||
    (item.permissions?.some((permission) => hasPermission(permission)) ?? false),
  );

  // Kelompokkan per grup (urut sesuai alur kerja); grup kosong otomatis tersembunyi.
  const groups = SECTION_ORDER.map((section) => ({
    section,
    label: SECTION_LABELS[section],
    items: visibleItems.filter((item) => item.section === section),
  })).filter((g) => g.items.length > 0);

  return (
    <aside
      className={cn(
        "fixed left-0 top-0 h-screen bg-sidebar flex flex-col transition-all duration-300 z-50",
        collapsed ? "w-20" : "w-64"
      )}
    >
      {/* Logo */}
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-amber to-amber-glow flex items-center justify-center amber-glow">
            <span className="text-xl font-bold text-sidebar">R</span>
          </div>
          {!collapsed && (
            <div className="animate-fade-in">
              <h1 className="text-xl font-bold text-sidebar-foreground">
                rapi<span className="text-gradient-amber">DSK</span>
              </h1>
              <p className="text-xs text-sidebar-foreground/50">Dataspace Connector</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation — dikelompokkan: Persiapan → Pemantauan & Operasional → Lainnya */}
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.section} className="space-y-1">
            {!collapsed && (
              <p className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-sidebar-foreground/40">
                {group.label}
              </p>
            )}
            {group.items.map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <Link
                  key={item.path}
                  to={item.path}
                  className={cn("nav-item", isActive && "nav-item-active")}
                >
                  <item.icon className="w-5 h-5 flex-shrink-0" />
                  {!collapsed && <span className="font-medium">{item.label}</span>}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Settings & Collapse */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link to="/settings" className="nav-item">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Pengaturan</span>}
        </Link>
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item w-full justify-center"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <ChevronLeft className="w-5 h-5" />
          )}
        </button>
      </div>
    </aside>
  );
};
