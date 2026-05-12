// src/pages/v2/V2Router.tsx
// Replaces the monolithic DataspaceV2.tsx with a proper per-route router

import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { canAccess } from "@/config/rbac";
import { getDefaultV2RouteForRole } from "@/lib/dataspace-version";

// Lazy-load all V2 pages for code splitting
const AuthorityDashboard = lazy(() => import("./authority/AuthorityDashboard"));
const ParticipantRegistration = lazy(() => import("./authority/ParticipantRegistration"));
const RegisterAdminConsumer = lazy(() => import("./authority/RegisterAdminConsumer"));
const RoleSetup = lazy(() => import("./authority/RoleSetup"));
const ActivationEmailPreview = lazy(() => import("./authority/ActivationEmailPreview"));
const ActivationLifecycle = lazy(() => import("./authority/ActivationLifecycle"));
const GatewayMonitor = lazy(() => import("./authority/GatewayMonitor"));
const Channels = lazy(() => import("./authority/Channels"));
const Organizations = lazy(() => import("./authority/Organizations"));
const StorageConfig = lazy(() => import("./authority/StorageConfig"));

const ConsumerDashboard = lazy(() => import("./admin-consumer/ConsumerDashboard"));
const MasterData = lazy(() => import("./admin-consumer/MasterData"));
const PolicyContract = lazy(() => import("./admin-consumer/PolicyContract"));
const SystemSetup = lazy(() => import("./admin-consumer/SystemSetup"));
const AdminProvider = lazy(() => import("./admin-consumer/AdminProvider"));
const DomainMapping = lazy(() => import("./admin-consumer/DomainMapping"));
const GeoServerSettings = lazy(() => import("./admin-consumer/GeoServerSettings"));
const TransferMonitor = lazy(() => import("./admin-consumer/TransferMonitor"));
const AuditLog = lazy(() => import("./admin-consumer/AuditLog"));
const Compliance = lazy(() => import("./admin-consumer/Compliance"));
const Reports = lazy(() => import("./admin-consumer/Reports"));

const ProviderDashboard = lazy(() => import("./admin-provider/ProviderDashboard"));
const AssignedDomains = lazy(() => import("./admin-provider/AssignedDomains"));
const ContractFulfilment = lazy(() => import("./admin-provider/ContractFulfilment"));
const DatasetRegistration = lazy(() => import("./admin-provider/DatasetRegistration"));
const FulfilmentReports = lazy(() => import("./admin-provider/FulfilmentReports"));

const LoadingFallback = () => (
  <div className="flex min-h-[60vh] items-center justify-center">
    <div className="flex flex-col items-center gap-3">
      <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      <p className="text-sm text-muted-foreground animate-pulse">Loading module...</p>
    </div>
  </div>
);

const V2Router = () => {
  const { role, user } = useAuth();
  const location = useLocation();

  // Redirect VIEWER to v1
  if (role === "VIEWER") {
    return <Navigate to="/" replace />;
  }

  // Redirect /v2 to role-specific dashboard
  const relativePath = location.pathname.replace("/v2", "").replace(/^\//, "");
  if (!relativePath) {
    return <Navigate to={getDefaultV2RouteForRole(role)} replace />;
  }

  // STRICT role lockdown using MENU_ITEMS_V2 roles array as source of truth.
  // Real super admin (is_superadmin=true from JWT) may bypass for inspection.
  // For other roles, they can access any path that has their role in roles[].
  const isRealSuperAdmin = user?.is_superadmin === true;
  if (!isRealSuperAdmin) {
    const fullPath = `/v2/${relativePath}`;
    if (!canAccess(role, fullPath, true)) {
      return <Navigate to={getDefaultV2RouteForRole(role)} replace />;
    }
  }

  return (
    <Suspense fallback={<LoadingFallback />}>
      <Routes>
        {/* Authority (SUPER_ADMIN) */}
        <Route path="authority/dashboard" element={<AuthorityDashboard />} />
        <Route path="authority/participant-registration" element={<ParticipantRegistration />} />
        <Route path="authority/register-admin-consumer" element={<RegisterAdminConsumer />} />
        <Route path="authority/role-setup" element={<RoleSetup />} />
        <Route path="authority/activation-email" element={<ActivationEmailPreview />} />
        <Route path="authority/activation" element={<ActivationLifecycle />} />
        <Route path="authority/user-provisioning" element={<Navigate to="/v2/authority/register-admin-consumer" replace />} />
        <Route path="authority/permissions" element={<Navigate to="/v2/authority/role-setup" replace />} />
        <Route path="authority/gateway" element={<GatewayMonitor />} />
        <Route path="authority/channels" element={<Channels />} />
        <Route path="authority/organizations" element={<Organizations />} />
        <Route path="authority/storage-config" element={<StorageConfig />} />

        {/* Admin Consumer (CONSUMER / SKK Migas) */}
        <Route path="admin-consumer/dashboard" element={<ConsumerDashboard />} />
        <Route path="admin-consumer/master-data" element={<MasterData />} />
        <Route path="admin-consumer/policy-contract" element={<PolicyContract />} />
        <Route path="admin-consumer/system-setup" element={<SystemSetup />} />
        <Route path="admin-consumer/admin-provider" element={<AdminProvider />} />
        <Route path="admin-consumer/domain-mapping" element={<DomainMapping />} />
        <Route path="admin-consumer/geoserver" element={<GeoServerSettings />} />
        <Route path="admin-consumer/transfer-monitor" element={<TransferMonitor />} />
        <Route path="admin-consumer/audit" element={<AuditLog />} />
        <Route path="admin-consumer/compliance" element={<Compliance />} />
        <Route path="admin-consumer/reports" element={<Reports />} />

        {/* Admin Provider (PROVIDER / KKKS) */}
        <Route path="admin-provider/dashboard" element={<ProviderDashboard />} />
        <Route path="admin-provider/assigned-domains" element={<AssignedDomains />} />
        <Route path="admin-provider/contract-fulfilment" element={<ContractFulfilment />} />
        <Route path="admin-provider/dataset-registration" element={<DatasetRegistration />} />
        <Route path="admin-provider/fulfilment-reports" element={<FulfilmentReports />} />

        {/* Fallback */}
        <Route path="*" element={<Navigate to={getDefaultV2RouteForRole(role)} replace />} />
      </Routes>
    </Suspense>
  );
};

export default V2Router;
