import type { AppRole } from "@/context/AuthContext";

export interface FeatureAccessContext {
  role: AppRole;
  roles: AppRole[];
  hasPermission: (permission: string) => boolean;
}

type FeatureKey =
  | "deployment_config"
  | "access_control_manage"
  | "connection_pools_manage"
  | "organizations_manage"
  | "participants_manage"
  | "participants_approve"
  | "adapter_manage"
  | "setup_juknis_manage";

const FEATURE_PERMISSIONS: Record<FeatureKey, string[]> = {
  deployment_config: [
    "deployment-config.manage",
    "runtime-config.manage",
    "system.runtime.manage",
  ],
  access_control_manage: [
    "iam.policy.manage",
    "iam.permissions.manage",
    "identity-provider.iam.manage",
    "rbac.manage",
  ],
  connection_pools_manage: [
    "connection-pools.manage",
    "connector.connection-pool.manage",
    "connector.registry.manage",
  ],
  organizations_manage: [
    "organizations.manage",
    "governance.organizations.manage",
    "governance.domains.manage",
  ],
  participants_manage: [
    "participants.manage",
    "onboarding.participants.manage",
  ],
  participants_approve: [
    "participants.approve",
    "onboarding.registrations.approve",
  ],
  adapter_manage: [
    "adapter.manage",
    "participants.adapters.manage",
    "dataplane.adapters.manage",
  ],
  setup_juknis_manage: [
    "setup-juknis.manage",
    "onboarding.setup.manage",
    "onboarding.registrations.approve",
    "participants.approve",
  ],
};

const hasAnyRole = (roles: AppRole[], candidates: AppRole[]) =>
  candidates.some((candidate) => roles.includes(candidate));

const matchAnyPermission = (
  hasPermission: (permission: string) => boolean,
  candidates: string[],
) => candidates.some((permission) => hasPermission(permission));

export const canManageDeploymentConfig = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.deployment_config);

export const canManageConnectionPools = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.connection_pools_manage);

export const canManageAccessControl = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.access_control_manage);

export const canManageOrganizations = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.organizations_manage);

export const canManageParticipants = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.participants_manage);

export const canApproveParticipants = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.participants_approve);

export const canManageAdapters = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  role === "PROVIDER" ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.adapter_manage);

export const canManageSetupJuknis = ({
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  hasAnyRole(roles, ["SUPER_ADMIN"]) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.setup_juknis_manage);

export const canAccessManagedRoute = (
  path: string,
  context: FeatureAccessContext,
): boolean => {
  if (path === "/setup-juknis" || path.startsWith("/setup-juknis/")) {
    return canManageSetupJuknis(context);
  }

  if (path === "/organizations" || path.startsWith("/organizations/")) {
    return canManageOrganizations(context);
  }

  if (path === "/connection-pools" || path.startsWith("/connection-pools/")) {
    return canManageConnectionPools(context);
  }

  if (path === "/access-control" || path.startsWith("/access-control/")) {
    return canManageAccessControl(context);
  }

  if (path === "/participants" || path.startsWith("/participants/")) {
    return canManageParticipants(context) || canApproveParticipants(context);
  }

  if (path === "/deployment-config" || path.startsWith("/deployment-config/")) {
    return canManageDeploymentConfig(context);
  }

  return true;
};
