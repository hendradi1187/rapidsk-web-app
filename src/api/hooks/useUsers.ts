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
import { useAuth, deriveRole } from "@/context/AuthContext";

const USER_QUERY_KEY = "users";

/**
 * Hook for user login.
 * On success, stores token + user_info in localStorage and syncs AuthContext.
 */
export const useLogin = () => {
  const queryClient = useQueryClient();
  const { setAuthUser } = useAuth();

  return useMutation({
    mutationFn: (credentials: LoginRequest) => authService.login(credentials),
    onSuccess: (data) => {
      localStorage.setItem("auth_token", data.access_token);

      if (data.user) {
        // Backend returned full user info — derive role from category/group
        localStorage.setItem("user_info", JSON.stringify(data.user));
        const role = deriveRole(
          data.user.category?.code || "",
          data.user.group?.code || ""
        );
        setAuthUser({
          id: data.user.id,
          email: data.user.email,
          full_name: data.user.full_name,
          role,
          category: data.user.category || { name: "", code: "", description: "" },
          group: data.user.group || { name: "", code: "", description: "", priority: 0 },
        });
        toast.success(`Welcome back, ${data.user.full_name}!`);
      } else {
        // Backend returned token only (no user object) — backward compatible fallback.
        // Default to SUPER_ADMIN so the initial superadmin setup still works.
        const fallback = {
          id: "",
          email: "",
          full_name: "Super Admin",
          role: "SUPER_ADMIN" as const,
          category: { name: "Platform", code: "PLATFORM", description: "" },
          group: { name: "Admin", code: "ADMIN", description: "", priority: 0 },
        };
        localStorage.setItem("user_info", JSON.stringify(fallback));
        setAuthUser(fallback);
        toast.success("Welcome back!");
      }

      queryClient.invalidateQueries({ queryKey: ["user", "validate"] });
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
 * Clears localStorage and AuthContext state.
 */
export const useLogout = () => {
  const queryClient = useQueryClient();
  const { clearAuth } = useAuth();

  const logout = () => {
    localStorage.removeItem("auth_token");
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
        description: error?.response?.data?.detail || "An error occurred",
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
        description: error?.response?.data?.detail || "An error occurred",
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
        description: error?.response?.data?.detail || "An error occurred",
      });
    },
  });
};
