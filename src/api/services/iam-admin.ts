import { apiClient } from "../client";

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  limit: number;
  offset: number;
  has_next: boolean;
  has_prev: boolean;
}

export interface IamApplication {
  id: string;
  code: string;
  name: string;
  audience: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IamApiResource {
  id: string;
  application_id: string;
  resource_code: string;
  method: string;
  path_template: string;
  description: string | null;
  is_sensitive: boolean;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IamPermission {
  id: string;
  application_id: string;
  code: string;
  name: string;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface IamUserGroup {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface IamGroupPermission {
  id: string;
  group_id: string;
  permission_id: string;
  constraints: Record<string, unknown>;
  permission?: IamPermission | null;
  created_at: string;
  updated_at: string;
}

export interface CreateIamApplicationRequest {
  code: string;
  name: string;
  audience: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateIamApiResourceRequest {
  application_id: string;
  resource_code: string;
  method: string;
  path_template: string;
  description?: string | null;
  is_sensitive?: boolean;
  is_active?: boolean;
}

export interface CreateIamPermissionRequest {
  application_id: string;
  code: string;
  name: string;
  description?: string | null;
  is_active?: boolean;
}

export interface CreateGroupPermissionRequest {
  permission_id: string;
  constraints?: Record<string, unknown>;
}

export const iamAdminApi = {
  async listApplications(limit = 100, offset = 0) {
    const response = await apiClient.get<PaginatedResponse<IamApplication>>(
      "/identity-provider/iam/applications",
      { params: { limit, offset } },
    );
    return response.data;
  },

  async createApplication(body: CreateIamApplicationRequest) {
    const response = await apiClient.post<IamApplication>("/identity-provider/iam/applications", body);
    return response.data;
  },

  async updateApplication(applicationId: string, body: Partial<CreateIamApplicationRequest>) {
    const response = await apiClient.put<IamApplication>(
      `/identity-provider/iam/applications/${applicationId}`,
      body,
    );
    return response.data;
  },

  async deleteApplication(applicationId: string) {
    await apiClient.delete(`/identity-provider/iam/applications/${applicationId}`);
  },

  async listApiResources(limit = 100, offset = 0) {
    const response = await apiClient.get<PaginatedResponse<IamApiResource>>(
      "/identity-provider/iam/api-resources",
      { params: { limit, offset } },
    );
    return response.data;
  },

  async createApiResource(body: CreateIamApiResourceRequest) {
    const response = await apiClient.post<IamApiResource>("/identity-provider/iam/api-resources", body);
    return response.data;
  },

  async updateApiResource(apiResourceId: string, body: Partial<CreateIamApiResourceRequest>) {
    const response = await apiClient.put<IamApiResource>(
      `/identity-provider/iam/api-resources/${apiResourceId}`,
      body,
    );
    return response.data;
  },

  async deleteApiResource(apiResourceId: string) {
    await apiClient.delete(`/identity-provider/iam/api-resources/${apiResourceId}`);
  },

  async listPermissions(limit = 100, offset = 0) {
    const response = await apiClient.get<PaginatedResponse<IamPermission>>(
      "/identity-provider/iam/permissions",
      { params: { limit, offset } },
    );
    return response.data;
  },

  async createPermission(body: CreateIamPermissionRequest) {
    const response = await apiClient.post<IamPermission>("/identity-provider/iam/permissions", body);
    return response.data;
  },

  async updatePermission(permissionId: string, body: Partial<CreateIamPermissionRequest>) {
    const response = await apiClient.put<IamPermission>(
      `/identity-provider/iam/permissions/${permissionId}`,
      body,
    );
    return response.data;
  },

  async deletePermission(permissionId: string) {
    await apiClient.delete(`/identity-provider/iam/permissions/${permissionId}`);
  },

  async linkPermissionApiResources(permissionId: string, apiResourceIds: string[]) {
    const response = await apiClient.post(
      `/identity-provider/iam/permissions/${permissionId}/api-resources`,
      { api_resource_ids: apiResourceIds },
    );
    return response.data;
  },

  async listGroups(limit = 100, offset = 0) {
    const response = await apiClient.get<PaginatedResponse<IamUserGroup>>(
      "/identity-provider/user/groups/",
      { params: { limit, offset } },
    );
    return response.data;
  },

  async listGroupPermissions(groupId: string, limit = 100, offset = 0) {
    const response = await apiClient.get<PaginatedResponse<IamGroupPermission>>(
      `/identity-provider/iam/groups/${groupId}/permissions`,
      { params: { limit, offset } },
    );
    return response.data;
  },

  async grantGroupPermission(groupId: string, body: CreateGroupPermissionRequest) {
    const response = await apiClient.post<IamGroupPermission>(
      `/identity-provider/iam/groups/${groupId}/permissions`,
      body,
    );
    return response.data;
  },

  async updateGroupPermission(groupId: string, groupPermissionId: string, constraints: Record<string, unknown>) {
    const response = await apiClient.put<IamGroupPermission>(
      `/identity-provider/iam/groups/${groupId}/permissions/${groupPermissionId}`,
      { constraints },
    );
    return response.data;
  },

  async deleteGroupPermission(groupId: string, groupPermissionId: string) {
    await apiClient.delete(`/identity-provider/iam/groups/${groupId}/permissions/${groupPermissionId}`);
  },
};
