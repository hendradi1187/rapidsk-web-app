import { useNavigate } from "react-router-dom";
import { Bell, Search, User, LogOut, Settings as SettingsIcon, ChevronDown, Layers } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useLogout } from "@/api/hooks/useAuth";
import { useAuth, type AppRole } from "@/context/AuthContext";
import { useDomain } from "@/context/DomainContext";
import { ROLE_LABELS } from "@/config/rbac";
import { cn } from "@/lib/utils";

interface HeaderProps {
  title: string;
  subtitle?: string;
}

const ROLE_BADGE_CLASS: Record<AppRole, string> = {
  SUPER_ADMIN: "border-primary text-primary",
  ADMIN: "border-primary/70 text-primary/90",
  PROVIDER: "border-accent text-accent",
  CONSUMER: "border-blue-500 text-blue-500",
  VIEWER: "border-muted-foreground text-muted-foreground",
  AUDITOR: "border-amber-500 text-amber-500",
  GIS_ANALYST: "border-emerald-500 text-emerald-500",
};

export const Header = ({ title, subtitle }: HeaderProps) => {
  const navigate = useNavigate();
  const logout = useLogout();
  const { user, role } = useAuth();
  const { domainId, domainName, availableDomains, switchDomain } = useDomain();
  const canSwitchDomain = (role === "SUPER_ADMIN" || role === "ADMIN") && availableDomains.length > 1;

  const userName = user?.full_name || "User";
  const organizationName = user?.category?.name || "Organisasi belum terdeteksi";
  const userInitials = userName
    .split(" ")
    .map((n: string) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  const handleSettings = () => {
    navigate("/settings");
  };

  return (
    <header className="sticky top-0 z-40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border-b border-border">
      <div className="flex items-center justify-between h-16 px-6">
        <div>
          <h1 className="section-title">{title}</h1>
          {subtitle && <p className="section-subtitle">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-4">
          {/* Search */}
          <div className="relative hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search..."
              className="pl-10 w-64 bg-muted/50 border-0 focus-visible:ring-1 focus-visible:ring-accent"
            />
          </div>

          {/* Domain Switcher — hanya untuk SUPER_ADMIN / ADMIN dengan >1 domain */}
          {canSwitchDomain && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm" className="hidden md:flex items-center gap-1.5 h-8 text-xs max-w-[200px]">
                  <Layers className="w-3.5 h-3.5 shrink-0 text-accent" />
                  <span className="truncate">{domainName ?? "Pilih Domain"}</span>
                  <ChevronDown className="w-3 h-3 shrink-0 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-64">
                <DropdownMenuLabel className="text-xs text-muted-foreground">Ganti Domain Aktif</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {availableDomains.map((d) => (
                  <DropdownMenuItem
                    key={d.domain_id}
                    onClick={() => switchDomain(d)}
                    className={cn("text-sm", d.domain_id === domainId && "bg-accent/10 font-medium")}
                  >
                    <Layers className="w-3.5 h-3.5 mr-2 text-muted-foreground" />
                    <div className="flex flex-col">
                      <span>{d.domain_name}</span>
                      {d.code && <span className="text-xs text-muted-foreground">{d.code}</span>}
                    </div>
                    {d.domain_id === domainId && (
                      <span className="ml-auto text-xs text-accent font-medium">aktif</span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Notifications */}
          <Button variant="ghost" size="icon" className="relative">
            <Bell className="w-5 h-5" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-accent rounded-full animate-pulse-amber" />
          </Button>

          {/* User Menu */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="flex items-center gap-2 px-2">
                <Avatar className="w-8 h-8">
                  <AvatarFallback className="bg-accent text-accent-foreground text-sm font-semibold">
                    {userInitials}
                  </AvatarFallback>
                </Avatar>
                <span className="hidden md:block text-sm font-medium">{userName}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col gap-1.5">
                  <span className="font-semibold">{userName}</span>
                  {user?.email && (
                    <span className="text-xs text-muted-foreground font-normal truncate">
                      {user.email}
                    </span>
                  )}
                  <span className="text-xs text-muted-foreground font-normal">
                    Org: {organizationName}
                  </span>
                  {domainName && (
                    <span className="text-xs text-muted-foreground font-normal">
                      Domain: {domainName}
                    </span>
                  )}
                  <Badge
                    variant="outline"
                    className={cn("text-xs w-fit font-medium", ROLE_BADGE_CLASS[role])}
                  >
                    {ROLE_LABELS[role]}
                  </Badge>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="w-4 h-4 mr-2" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleSettings}>
                <SettingsIcon className="w-4 h-4 mr-2" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive">
                <LogOut className="w-4 h-4 mr-2" />
                Log out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
};
