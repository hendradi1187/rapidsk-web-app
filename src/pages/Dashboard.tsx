import { useMemo } from "react";
import { Header } from "@/components/layout/Header";
import { StatCard } from "@/components/dashboard/StatCard";
import { RecentActivity } from "@/components/dashboard/RecentActivity";
import {
  Building2,
  Database,
  Users,
  FileText,
  Shield,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useOrganizations } from "@/api/hooks/useOrganizations";
import { useDatasets } from "@/api/hooks/useDatasets";
import { useProviders } from "@/api/hooks/useProviders";
import { useAuditLogs } from "@/api/hooks/useAuditLogs";
import { useSystemHealth } from "@/api/hooks/useSystemHealth";
import { useArcGISLayers } from "@/api/hooks/useArcGIS";
import { useKeycloak } from "@/auth/KeycloakProvider";

// ─── System status helper ─────────────────────────────────────────────
type StatusKind = "operational" | "degraded" | "down" | "pending";

const STATUS_DOT_CLASS: Record<StatusKind, string> = {
  operational: "bg-emerald-500",
  degraded: "bg-amber-500",
  down: "bg-rose-500",
  pending: "bg-slate-400",
};

const STATUS_LABEL: Record<StatusKind, string> = {
  operational: "Operational",
  degraded: "Degraded",
  down: "Down",
  pending: "Pending",
};

interface SystemStatusItem {
  label: string;
  status: StatusKind;
}

const Dashboard = () => {
  // Data hooks (semua flat array dari rapiDSK Enterprise spec)
  const { data: orgsData, isError: orgsError } = useOrganizations();
  const { data: datasetsData, isError: datasetsError } = useDatasets();
  const { data: providersData, isError: providersError } = useProviders();
  const { data: auditData, isError: auditError } = useAuditLogs();

  // System health + Keycloak
  const { data: healthData, isError: healthError, isLoading: healthLoading } = useSystemHealth();
  const { isError: arcgisError, isLoading: arcgisLoading } = useArcGISLayers();
  const { authenticated: keycloakAuthenticated, enabled: keycloakEnabled } = useKeycloak();

  // ─── Stats ──────────────────────────────────────────────────────────
  const orgsCount = orgsData?.length ?? 0;
  const datasetsCount = datasetsData?.length ?? 0;
  const providersCount = providersData?.length ?? 0;

  // Audit events today (client-side filter — spec tidak punya date filter)
  const todayEventsCount = useMemo(() => {
    if (!auditData) return 0;
    const todayPrefix = new Date().toISOString().slice(0, 10);
    return auditData.filter((log) => {
      if (!log.timestamp) return false;
      try {
        return new Date(log.timestamp).toISOString().startsWith(todayPrefix);
      } catch {
        return log.timestamp.startsWith(todayPrefix);
      }
    }).length;
  }, [auditData]);

  // ─── System status (computed from each subsystem) ────────────────────
  const systemStatus: SystemStatusItem[] = useMemo(() => {
    const apiStatus: StatusKind = healthLoading
      ? "pending"
      : healthError
        ? "down"
        : healthData?.status?.toLowerCase() === "operational"
          ? "operational"
          : healthData?.status
            ? "degraded"
            : "pending";

    const idpStatus: StatusKind = !keycloakEnabled
      ? "pending"
      : keycloakAuthenticated
        ? "operational"
        : "degraded";

    const arcgisStatus: StatusKind = arcgisLoading
      ? "pending"
      : arcgisError
        ? "down"
        : "operational";

    const auditStatus: StatusKind = auditError ? "down" : auditData ? "operational" : "pending";

    return [
      { label: "API Gateway", status: apiStatus },
      { label: "Identity Provider", status: idpStatus },
      { label: "ArcGIS Connector", status: arcgisStatus },
      { label: "Audit Pipeline", status: auditStatus },
    ];
  }, [
    healthLoading,
    healthError,
    healthData,
    keycloakEnabled,
    keycloakAuthenticated,
    arcgisLoading,
    arcgisError,
    auditError,
    auditData,
  ]);

  return (
    <div className="min-h-screen">
      <Header
        title="Dashboard"
        subtitle="Welcome to rapiDSK Dataspace Connector"
      />
      <div className="p-6 space-y-6">
        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Organizations"
            value={orgsError ? "—" : orgsCount}
            change={orgsError ? "Backend unreachable" : "Total registered"}
            changeType={orgsError ? "negative" : "neutral"}
            icon={Building2}
            iconColor="bg-info/10 text-info"
          />
          <StatCard
            title="Datasets"
            value={datasetsError ? "—" : datasetsCount}
            change={datasetsError ? "Backend unreachable" : "Total catalog"}
            changeType={datasetsError ? "negative" : "neutral"}
            icon={Database}
            iconColor="bg-accent/10 text-accent"
          />
          <StatCard
            title="Providers"
            value={providersError ? "—" : providersCount}
            change={providersError ? "Backend unreachable" : "Active providers"}
            changeType={providersError ? "negative" : "neutral"}
            icon={Users}
            iconColor="bg-success/10 text-success"
          />
          <StatCard
            title="Audit Events Today"
            value={auditError ? "—" : todayEventsCount}
            change={auditError ? "Backend unreachable" : "Last 24h"}
            changeType={auditError ? "negative" : "neutral"}
            icon={FileText}
            iconColor="bg-purple-100 text-purple-600"
          />
        </div>

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Activity & Compliance */}
          <div className="lg:col-span-2 space-y-6">
            <RecentActivity />

            {/* Quick Compliance Status (static — no compliance endpoint in spec) */}
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">Compliance Status</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">ISO 27001</span>
                  </div>
                  <p className="text-sm text-emerald-600">Compliant</p>
                </div>
                <div className="p-4 rounded-lg bg-emerald-50 border border-emerald-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-emerald-600" />
                    <span className="font-medium text-emerald-700">COBIT/ITIL</span>
                  </div>
                  <p className="text-sm text-emerald-600">Compliant</p>
                </div>
                <div className="p-4 rounded-lg bg-amber-50 border border-amber-200">
                  <div className="flex items-center gap-2 mb-2">
                    <Shield className="w-5 h-5 text-amber-600" />
                    <span className="font-medium text-amber-700">SKK Migas</span>
                  </div>
                  <p className="text-sm text-amber-600">Review Required</p>
                </div>
              </div>
            </div>
          </div>

          {/* System Status — computed from real subsystem health */}
          <div className="lg:col-span-1">
            <div className="bg-card rounded-xl border border-border p-6">
              <h3 className="text-lg font-semibold mb-4">System Status</h3>
              <div className="space-y-3">
                {systemStatus.map((item) => (
                  <div
                    key={item.label}
                    className="flex items-center justify-between p-3 rounded-lg border border-border"
                  >
                    <div className="flex items-center gap-2">
                      <div
                        className={cn(
                          "w-2 h-2 rounded-full",
                          STATUS_DOT_CLASS[item.status],
                          item.status === "pending" && "animate-pulse",
                        )}
                      />
                      <span className="text-sm">{item.label}</span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      {STATUS_LABEL[item.status]}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
