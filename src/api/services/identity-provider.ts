// src/api/services/identity-provider.ts

import { apiClient } from "../client";
import type { PaginationParams } from "../client";
import type {
  LoginRequest,
  LoginResponse,
  User,
  UserCreateRequest,
  UserListResponse,
  UserUpdateRequest,
  UserCategory,
  UserCategoryListResponse,
  UserGroup,
  UserGroupListResponse,
  TokenPayload,
} from "../types/identity-provider";

const IDP_BASE_PATH = "/api/v1/identity-provider";

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
    // Backend expects form-urlencoded format, not JSON
    const formData = new URLSearchParams();
    formData.append("username", credentials.username);
    formData.append("password", credentials.password);

    const response = await apiClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/login`,
      formData,
      {
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
      }
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
   * Refresh the access token using a refresh token.
   */
  refreshToken: async (refreshToken: string): Promise<LoginResponse> => {
    const response = await apiClient.post<LoginResponse>(
      `${IDP_BASE_PATH}/auth/refresh-token`,
      { refresh_token: refreshToken }
    );
    return response.data;
  },

  /**
   * Revoke a specific token.
   */
  revokeToken: async (token: string): Promise<boolean> => {
    const response = await apiClient.post<boolean>(
      `${IDP_BASE_PATH}/auth/revoke-token`,
      { token }
    );
    return response.data;
  },

  /**
   * Revoke all tokens for a user (admin action).
   */
  revokeUserToken: async (userId: string): Promise<number> => {
    const response = await apiClient.post<number>(
      `${IDP_BASE_PATH}/auth/revoke-user-token`,
      { user_id: userId }
    );
    return response.data;
  },

  /**
   * Validates the current user's token.
   */
  validate: async (token: string): Promise<TokenPayload> => {
    const response = await apiClient.post<TokenPayload>(
      `${IDP_BASE_PATH}/auth/validate`,
      { token }
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

/**
 * == User Categories Service ==
 */
export const userCategoriesService = {
  list: async (params: PaginationParams = {}): Promise<UserCategoryListResponse> => {
    const response = await apiClient.get<UserCategoryListResponse>(
      `${IDP_BASE_PATH}/user/categories/`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<UserCategory> => {
    const response = await apiClient.get<UserCategory>(
      `${IDP_BASE_PATH}/user/categories/${id}`
    );
    return response.data;
  },
};

/**
 * == User Groups Service ==
 */
export const userGroupsService = {
  list: async (params: PaginationParams = {}): Promise<UserGroupListResponse> => {
    const response = await apiClient.get<UserGroupListResponse>(
      `${IDP_BASE_PATH}/user/groups/`,
      { params }
    );
    return response.data;
  },

  getById: async (id: string): Promise<UserGroup> => {
    const response = await apiClient.get<UserGroup>(
      `${IDP_BASE_PATH}/user/groups/${id}`
    );
    return response.data;
  },
};
