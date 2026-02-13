// src/api/hooks/useUsers.ts

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { authService, usersService } from "../services/identity-provider";
import type { PaginationParams } from "../client";
import type {
  LoginRequest,
  UserCreateRequest,
  UserUpdateRequest,
} from "../types/identity-provider";
import { toast } from "sonner";

const USER_QUERY_KEY = "users";

/**
 * Hook for user login.
 * @returns A mutation object for the login operation.
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      // Save token and user info to localStorage
      localStorage.setItem("auth_token", data.access_token);
      if (data.user) {
        localStorage.setItem("user_info", JSON.stringify(data.user));
      }
      queryClient.invalidateQueries({ queryKey: ["user", "validate"] });
      toast.success(`Welcome back, ${data.user?.full_name || "User"}!`);
    },
    onError: (error: any) => {
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
 */
export const useLogout = () => {
    const queryClient = useQueryClient();
    const logout = () => {
        localStorage.removeItem("auth_token");
        localStorage.removeItem("user_info");
        queryClient.invalidateQueries(); // Invalidate all queries
        toast.info("You have been logged out");
    };
    return logout;
};


/**
 * Hook to fetch a paginated list of users.
 * @param params - Pagination parameters (limit, offset).
 * @returns A query object for the users list.
 */
export const useUsers = (params: PaginationParams = {}) => {
  return useQuery({
    queryKey: [USER_QUERY_KEY, params],
    queryFn: () => usersService.list(params),
    placeholderData: (previousData) => previousData,
  });
};

/**
 * Hook to fetch a single user by ID.
 * @param id - The ID of the user.
 * @returns A query object for the user.
 */
export const useUser = (id: string | null) => {
  return useQuery({
    queryKey: [USER_QUERY_KEY, id],
    queryFn: () => usersService.getById(id!),
    enabled: !!id, // Only run the query if the id is not null
  });
};

/**
 * Hook to create a new user.
 * @returns A mutation object for the create user operation.
 */
export const useCreateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UserCreateRequest) => usersService.create(data),
    onSuccess: () => {
      // Invalidate the users list to refetch
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User created successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to create user", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

/**
 * Hook to update an existing user.
 * @returns A mutation object for the update user operation.
 */
export const useUpdateUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: UserUpdateRequest }) =>
      usersService.update(id, data),
    onSuccess: (_, variables) => {
      // Invalidate the specific user and the users list
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User updated successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to update user", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};

/**
 * Hook to delete a user.
 * @returns A mutation object for the delete user operation.
 */
export const useDeleteUser = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => usersService.delete(id),
    onSuccess: () => {
      // Invalidate the users list
      queryClient.invalidateQueries({ queryKey: [USER_QUERY_KEY] });
      toast.success("User deleted successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to delete user", {
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};
