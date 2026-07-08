// src/api/services/identity-provider.ts

import { authClient as apiClient } from "../clients";
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
const IDP_BASE_PATH = "/identity-provider";

/**
 * == Auth Service ==
 */
export const authService = {
  /**
   * Login a user with username and password.
   * @param credentials - The user's login credentials.
   * @returns A promise resolving to the login response (with token).
   */
  login: async (credentials: LoginRequest): Promise<LoginResponse> => {
    // GX-Space menerima JSON {username, password}.
    const response = await apiClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/login`,
      { username: credentials.username, password: credentials.password },
    );
    return response.data;
  },

  /**
   * External login for a user (e.g., via SSO).
   * @param data - Data from the external provider.
   * @returns A promise resolving to the login response (with token).
   */
  externalLogin: async (data: { provider: string; token: string }): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/external-login`,
      data
    );
    return response.data;
  },

  /**
   * Validates the current user's token.
   * @returns A promise resolving to the validation result.
   */
  validate: async (): Promise<{ valid: boolean; user?: Partial<User> }> => {
    const response = await apiClient.post(
      `${IDP_BASE_PATH}/auth/validate`
    );
    return response.data;
  },
};

/**
 * == Users Service ==
 */
export const usersService = {
  /**
   * List all users with pagination.
   * @param params - Pagination parameters (limit, offset).
   * @returns A promise resolving to a paginated list of users.
   */
  list: async (params: PaginationParams = {}): Promise<UserListResponse> => {
    const response = await apiClient.get<UserListResponse>(
      `${IDP_BASE_PATH}/users/`,
      { params }
    );
    return response.data;
  },

  /**
   * Get a single user by their ID.
   * @param id - The ID of the user.
   * @returns A promise resolving to the user object.
   */
  getById: async (id: string): Promise<User> => {
    const response = await apiClient.get<User>(`${IDP_BASE_PATH}/users/${id}`);
    return response.data;
  },

  /**
   * Create a new user.
   * @param data - The data for the new user.
   * @returns A promise resolving to the newly created user object.
   */
  create: async (data: UserCreateRequest): Promise<User> => {
    const response = await apiClient.post<User>(
      `${IDP_BASE_PATH}/users/`,
      data
    );
    return response.data;
  },

  /**
   * Update an existing user.
   * @param id - The ID of the user to update.
   * @param data - The fields to update.
   * @returns A promise resolving to the updated user object.
   */
  update: async (id: string, data: UserUpdateRequest): Promise<User> => {
    const response = await apiClient.patch<User>(
      `${IDP_BASE_PATH}/users/${id}`,
      data
    );
    return response.data;
  },

  /**
   * Delete a user by their ID.
   * @param id - The ID of the user to delete.
   * @returns A promise that resolves when the user is deleted.
   */
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`${IDP_BASE_PATH}/users/${id}`);
  },
};
