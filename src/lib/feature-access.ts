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
  | "adapter_manage";

const FEATURE_PERMISSIONS: Record<FeatureKey, string[]> = {
  deployment_config: [
    "deployment-config.manage",
    "runtime-config.manage",
    "system.runtime.manage",
    "iam.policy.manage",
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
    "onboarding.participants.manage",
  ],
  adapter_manage: [
    "adapter.manage",
    "participants.adapters.manage",
    "dataplane.adapters.manage",
  ],
};

const ADMIN_ROLES: AppRole[] = ["SUPER_ADMIN", "ADMIN"];

const matchAnyPermission = (
  hasPermission: (permission: string) => boolean,
  candidates: string[],
) => candidates.some((permission) => hasPermission(permission));

export const canManageDeploymentConfig = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.deployment_config);

export const canManageConnectionPools = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.connection_pools_manage);

export const canManageAccessControl = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.access_control_manage);

export const canManageOrganizations = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.organizations_manage);

export const canManageParticipants = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.participants_manage);

export const canApproveParticipants = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.participants_approve);

export const canManageAdapters = ({
  role,
  roles,
  hasPermission,
}: FeatureAccessContext): boolean =>
  roles.includes("SUPER_ADMIN") ||
  role === "PROVIDER" ||
  ADMIN_ROLES.includes(role) ||
  matchAnyPermission(hasPermission, FEATURE_PERMISSIONS.adapter_manage);
