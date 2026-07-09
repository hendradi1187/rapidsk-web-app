// src/api/services/identity-provider.ts

import { authClient as apiClient } from "../clients";
import { AUTH } from "../endpoints";
import type { PaginationParams } from "../client"; // type-only, OK
import type {
  LoginRequest,
  LoginResponse,
  User,
  UserCreateRequest,
  UserListResponse,
  UserUpdateRequest,
} from "../types/identity-provider";

// Relatif terhadap baseURL (.../api/v1). Jangan tambahkan /api/v1 lagi.
// Path di-import dari endpoints.ts — AUTH.BASE = "/identity-provider"
const IDP_BASE_PATH = AUTH.BASE;

export const authService = {
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    const response = await authClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/login`,
      { username: credentials.username, password: credentials.password },
    );
    return response.data;
  },

  externalLogin: async (data: { provider: string; token: string }): Promise<LoginResponse> => {
    const response = await authClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/external-login`,
      data,
    );
    return response.data;
  },

  validate: async (): Promise<{ valid: boolean; user?: Partial<User> }> => {
    const response = await authClient.post(`${IDP_BASE_PATH}/auth/validate`);
    return response.data;
  },
};

export const usersService = {
  list: async (params: PaginationParams = {}): Promise<UserListResponse> => {
    const response = await authClient.get<UserListResponse>(
      `${IDP_BASE_PATH}/users/`,
      { params },
    );
    return response.data;
  },

  getById: async (id: string): Promise<User> => {
    const response = await authClient.get<User>(`${IDP_BASE_PATH}/users/${id}`);
    return response.data;
  },

  create: async (data: UserCreateRequest): Promise<User> => {
    const response = await authClient.post<User>(
      `${IDP_BASE_PATH}/users/`,
      data,
    );
    return response.data;
  },

  update: async (id: string, data: UserUpdateRequest): Promise<User> => {
    const response = await authClient.patch<User>(
      `${IDP_BASE_PATH}/users/${id}`,
      data,
    );
    return response.data;
  },

  delete: async (id: string): Promise<void> => {
    await authClient.delete(`${IDP_BASE_PATH}/users/${id}`);
  },
};
