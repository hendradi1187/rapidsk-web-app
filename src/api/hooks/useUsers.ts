// src/api/hooks/useUsers.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  authService,
  userCategoriesService,
  userGroupsService,
  usersService,
} from "../services/identity-provider";
import type { PaginationParams } from "../client";
import type {
  LoginRequest,
  NormalizedAuthSession,
  UserCreateRequest,
  UserUpdateRequest,
} from "../types/identity-provider";
import { toast } from "sonner";
import { useAuth, derivePermissions, deriveRole } from "@/context/AuthContext";

const USER_QUERY_KEY = "users";
const USER_CATEGORIES_QUERY_KEY = "user-categories";
const USER_GROUPS_QUERY_KEY = "user-groups";

const getErrorDescription = (error: any) => {
  const data = error?.response?.data;

  if (typeof data?.detail === "string") return data.detail;
  if (typeof data?.errors?.detail === "string") return data.errors.detail;
  if (Array.isArray(data?.errors)) {
    return data.errors
      .map((item: any) => `${item.field || "field"}: ${item.message || "Invalid value"}`)
      .join(" | ");
  }

  if (data?.errors && typeof data.errors === "object") {
    return Object.entries(data.errors)
      .map(([key, value]) => `${key}: ${Array.isArray(value) ? value.join(", ") : String(value)}`)
      .join(" | ");
  }

  return data?.message || "An error occurred";
};

/**
 * Hook for user login.
 * On success, stores token + user_info in localStorage and syncs AuthContext.
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setAuthUser } = useAuth();

  return useMutation({
    mutationFn: async (credentials: LoginRequest): Promise<NormalizedAuthSession> => {
      const data = await authService.login(credentials);

      localStorage.setItem("auth_token", data.access_token);

      if (data.refresh_token) {
        localStorage.setItem("refresh_token", data.refresh_token);
      }
      if (data.expires_in) {
        localStorage.setItem("token_expires_at", String(Date.now() + data.expires_in * 1000));
      }

      const payload = await authService.validate(data.access_token);
      const role = deriveRole(
        payload.category?.code || "",
        payload.group?.code || "",
        payload.is_superadmin
      );
      const normalized: NormalizedAuthSession = {
        id: payload.sub,
        username: payload.username,
        email: payload.email,
        full_name: payload.username || payload.email,
        role,
        permissions: derivePermissions(
          payload.category?.code || "",
          payload.group?.code || "",
          payload.is_superadmin
        ),
        is_superadmin: payload.is_superadmin,
        category: {
          id: payload.category?.id || "",
          name: payload.category?.code || "",
          code: payload.category?.code || "",
          description: null,
        },
        group: {
          id: payload.group?.id || "",
          category_id: payload.category?.id || "",
          name: payload.group?.code || "",
          code: payload.group?.code || "",
          description: null,
          priority: 0,
        },
      };

      return normalized;
    },
    onSuccess: (session) => {
      localStorage.setItem("user_info", JSON.stringify(session));
      setAuthUser({
        id: session.id,
        username: session.username,
        email: session.email,
        full_name: session.full_name,
        role: session.role,
        permissions: session.permissions,
        is_superadmin: session.is_superadmin,
        category: session.category,
        group: session.group,
      });
      toast.success(`Welcome back, ${session.username || session.email}!`);
      queryClient.invalidateQueries({ queryKey: ["user", "validate"] });
    },
    onError: (error: any) => {
      localStorage.removeItem("auth_token");
      localStorage.removeItem("refresh_token");
      localStorage.removeItem("token_expires_at");
      localStorage.removeItem("user_info");
      console.error("Login error details:", error.response?.data);
      const errorMessage =
        error?.response?.data?.errors?.detail ||
        error?.response?.data?.detail ||
        error?.response?.data?.message ||
        "Invalid credentials";
      toast.error("Login failed", {
        description: errorMessage,
      });
    },
  });
};

/**
 * Hook for user logout.
 * Clears localStorage and AuthContext state. Revokes token on backend if possible.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  const logout = async () => {
    // Attempt to revoke token on backend (best-effort)
    const token = localStorage.getItem("auth_token");
    if (token) {
      try {
        await authService.revokeToken(token);
      } catch {
        // Ignore — we'll clear local state regardless
      }
    }

    localStorage.removeItem("auth_token");
    localStorage.removeItem("refresh_token");
    localStorage.removeItem("token_expires_at");
    localStorage.removeItem("user_info");
    clearAuth();
    queryClient.invalidateQueries();
    toast.info("You have been logged out");
  };
  return logout;
};


/**
 * Hook to fetch a paginated list of users.
 */
export const useUsers = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [USER_QUERY_KEY, params],
    queryFn: () => usersService.list(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useUserCategories = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [USER_CATEGORIES_QUERY_KEY, params],
    queryFn: () => userCategoriesService.list(params),
    placeholderData: (previousData) => previousData,
  });
};

export const useUserGroups = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [USER_GROUPS_QUERY_KEY, params],
    queryFn: () => userGroupsService.list(params),
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single user by ID.
 */
export const useUser = (id: string | null) => {
  return useQuery({
    queryKey: [USER_QUERY_KEY, id],
    queryFn: () => usersService.getById(id!),
    enabled: !!id,
  });
};

/**
 * Hook to create a new user.
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreateRequest) => usersService.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create user", {
        description: getErrorDescription(error),
      });
    },
  });
};

/**
 * Hook to update an existing user.
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateRequest }) =>
      usersService.update(id, data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update user", {
        description: getErrorDescription(error),
      });
    },
  });
};

/**
 * Hook to delete a user.
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete user", {
        description: getErrorDescription(error),
      });
    },
  });
};
