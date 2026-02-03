import { Link, useLocation } from "react-router-dom";
import {
  LayoutDashboard,
  Building2,
  Database,
  FileText,
  ArrowRightLeft,
  ClipboardCheck,
  Shield,
  Settings,
  ChevronLeft,
  ChevronRight,
  Rocket,
} from "lucide-react";
import { useState } from "react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Rocket, label: "Onboarding", path: "/onboarding" },
  { icon: Building2, label: "Organizations", path: "/organizations" },
  { icon: Database, label: "Dataset Catalog", path: "/datasets" },
  { icon: FileText, label: "Contracts", path: "/contracts" },
  { icon: ArrowRightLeft, label: "Data Transfer", path: "/transfer" },
  { icon: ClipboardCheck, label: "Audit Trail", path: "/audit" },
  { icon: Shield, label: "Compliance", path: "/compliance" },
];

export const Sidebar = () => {
  const [collapsed, setCollapsed] = useState(false);
  const location = useLocation();

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
        {menuItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "nav-item",
                isActive && "nav-item-active"
              )}
            >
              <item.icon className="w-5 h-5 flex-shrink-0" />
              {!collapsed && <span className="font-medium">{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      {/* Settings & Collapse */}
      <div className="p-4 border-t border-sidebar-border space-y-1">
        <Link to="/settings" className="nav-item">
          <Settings className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium">Settings</span>}
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
