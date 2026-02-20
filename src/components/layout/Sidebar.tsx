import { useLocation } from "react-router-dom";
import { Settings, ChevronLeft, ChevronRight } from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/context/AuthContext";
import { MENU_ITEMS } from "@/config/rbac";
import { NavLink } from "@/components/NavLink"; // <-- pake wrapper NavLink lo

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();
  const { effectiveRole } = useAuth();

  // Only show menu items allowed for the current *effective* role
  const visibleItems = MENU_ITEMS.filter((item) => item.roles.includes(effectiveRole));

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

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {visibleItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className="nav-item"
            activeClassName="nav-item-active"
          >
            <item.icon className="w-5 h-5 flex-shrink-0" />
            {!collapsed && <span className="font-medium">{item.label}</span>}
          </NavLink>
        ))}
      </nav>

      {/* Settings & Collapse */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <NavLink to="/settings" className="nav-item" activeClassName="nav-item-active">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
        </NavLink>

        <button
          onClick={() => setCollapsed(!collapsed)}
          className="nav-item w-full justify-center"
        >
          {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
        </button>
      </div>
    </aside>
  );
};