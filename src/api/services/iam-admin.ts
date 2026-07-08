import { authClient } from "../client";

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

// Ambil SEMUA halaman untuk endpoint paginated. Penting: satu group bisa punya
// ratusan permission (mis. 264). Kalau cuma ambil 1 halaman, sisanya tampil OFF
// di matrix → di-toggle ON → POST duplikat → 409 IntegrityError.
async function fetchAllPages<T>(
  fetchPage: (limit: number, offset: number) => Promise<PaginatedResponse<T>>,
): Promise<PaginatedResponse<T>> {
  const limit = 100;
  let offset = 0;
  const all: T[] = [];
  let total = 0;
  for (let i = 0; i < 200; i++) {
    const page = await fetchPage(limit, offset);
    const rows = page?.data ?? [];
    all.push(...rows);
    total = typeof page?.total === "number" ? page.total : all.length;
    if (rows.length < limit || all.length >= total) break;
    offset += limit;
  }
  return { data: all, total: all.length, limit, offset: 0 };
}

export const iamAdminApi = {
  async listApplications() {
    return fetchAllPages<IamApplication>((limit, offset) =>
      authClient
        .get<PaginatedResponse<IamApplication>>("/identity-provider/iam/applications", {
          params: { limit, offset },
        })
        .then((r) => r.data),
    );
  },

  async createApplication(body: CreateIamApplicationRequest) {
    const response = await authClient.post<IamApplication>("/identity-provider/iam/applications", body);
    return response.data;
  },

  async updateApplication(applicationId: string, body: Partial<CreateIamApplicationRequest>) {
    const response = await authClient.put<IamApplication>(
      `/identity-provider/iam/applications/${applicationId}`,
      body,
    );
    return response.data;
  },

  async deleteApplication(applicationId: string) {
    await authClient.delete(`/identity-provider/iam/applications/${applicationId}`);
  },

  async listApiResources() {
    return fetchAllPages<IamApiResource>((limit, offset) =>
      authClient
        .get<PaginatedResponse<IamApiResource>>("/identity-provider/iam/api-resources", {
          params: { limit, offset },
        })
        .then((r) => r.data),
    );
  },

  async createApiResource(body: CreateIamApiResourceRequest) {
    const response = await authClient.post<IamApiResource>("/identity-provider/iam/api-resources", body);
    return response.data;
  },

  async updateApiResource(apiResourceId: string, body: Partial<CreateIamApiResourceRequest>) {
    const response = await authClient.put<IamApiResource>(
      `/identity-provider/iam/api-resources/${apiResourceId}`,
      body,
    );
    return response.data;
  },

  async deleteApiResource(apiResourceId: string) {
    await authClient.delete(`/identity-provider/iam/api-resources/${apiResourceId}`);
  },

  async listPermissions() {
    return fetchAllPages<IamPermission>((limit, offset) =>
      authClient
        .get<PaginatedResponse<IamPermission>>("/identity-provider/iam/permissions", {
          params: { limit, offset },
        })
        .then((r) => r.data),
    );
  },

  async createPermission(body: CreateIamPermissionRequest) {
    const response = await authClient.post<IamPermission>("/identity-provider/iam/permissions", body);
    return response.data;
  },

  async updatePermission(permissionId: string, body: Partial<CreateIamPermissionRequest>) {
    const response = await authClient.put<IamPermission>(
      `/identity-provider/iam/permissions/${permissionId}`,
      body,
    );
    return response.data;
  },

  async deletePermission(permissionId: string) {
    await authClient.delete(`/identity-provider/iam/permissions/${permissionId}`);
  },

  async linkPermissionApiResources(permissionId: string, apiResourceIds: string[]) {
    const response = await authClient.post(
      `/identity-provider/iam/permissions/${permissionId}/api-resources`,
      { api_resource_ids: apiResourceIds },
    );
    return response.data;
  },

  async listGroups() {
    return fetchAllPages<IamUserGroup>((limit, offset) =>
      authClient
        .get<PaginatedResponse<IamUserGroup>>("/identity-provider/user/groups/", {
          params: { limit, offset },
        })
        .then((r) => r.data),
    );
  },

  async listGroupPermissions(groupId: string) {
    return fetchAllPages<IamGroupPermission>((limit, offset) =>
      authClient
        .get<PaginatedResponse<IamGroupPermission>>(
          `/identity-provider/iam/groups/${groupId}/permissions`,
          { params: { limit, offset } },
        )
        .then((r) => r.data),
    );
  },

  async grantGroupPermission(groupId: string, body: CreateGroupPermissionRequest) {
    const response = await authClient.post<IamGroupPermission>(
      `/identity-provider/iam/groups/${groupId}/permissions`,
      body,
    );
    return response.data;
  },

  async updateGroupPermission(groupId: string, groupPermissionId: string, constraints: Record<string, unknown>) {
    const response = await authClient.put<IamGroupPermission>(
      `/identity-provider/iam/groups/${groupId}/permissions/${groupPermissionId}`,
      { constraints },
    );
    return response.data;
  },

  async deleteGroupPermission(groupId: string, groupPermissionId: string) {
    await authClient.delete(`/identity-provider/iam/groups/${groupId}/permissions/${groupPermissionId}`);
  },
};
