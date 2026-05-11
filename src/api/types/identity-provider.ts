// src/api/types/identity-provider.ts

import { PaginatedResponse } from "./common";

export interface UserCategory {
  id: string;
  name: string;
  code: string;
  description: string | null;
  created_at: string;
  updated_at: string;
}

export interface UserGroup {
  id: string;
  category_id: string;
  name: string;
  code: string;
  description: string | null;
  priority: number;
  created_at: string;
  updated_at: string;
  category?: UserCategory | null;
}

export interface UserResponse {
  id: string;
  username?: string;
  email: string;
  full_name: string | null;
  // Backend renamed flags. is_email_confirmed kept as legacy alias for older code.
  is_active?: boolean;
  is_verified?: boolean;
  is_email_confirmed?: boolean; // legacy alias — falls back to is_verified
  category: UserCategory | null;
  group: UserGroup | null;
  created_at: string;
  updated_at: string;
}

export type User = UserResponse;

export interface LoginRequest {
  username: string;
  password: string;
}

export interface LoginResponse {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  refresh_expires_in: number;
  token_type: string;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  full_name?: string | null;
  password: string;
  category_id: string;
  group_id: string;
  participant_id?: string | null; // backend now supports direct user→participant link
}

export interface UserUpdateRequest {
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  password?: string | null;
  category_id?: string | null;
  group_id?: string | null;
}

export interface ConfirmEmailRequest {
  token: string;
  password: string;
}

export interface ResendEmailConfirmationRequest {
  email: string;
}

export type UserListResponse = PaginatedResponse<UserResponse>;
export type UserCategoryListResponse = PaginatedResponse<UserCategory>;
export type UserGroupListResponse = PaginatedResponse<UserGroup>;

export interface RefreshTokenRequest {
  refresh_token: string;
}

export interface RevokeTokenRequest {
  token: string;
}

export interface RevokeUserTokenRequest {
  user_id: string;
}

export interface ValidateTokenRequest {
  token: string;
}

export interface TokenPayload {
  sub: string;
  username: string;
  email: string;
  is_superadmin: boolean;
  exp: string;
  iat: string;
  category: { id: string; code: string };
  group: { id: string; code: string };
}

export interface NormalizedAuthSession {
  id: string;
  username: string;
  email: string;
  full_name: string;
  role: "SUPER_ADMIN" | "PROVIDER" | "CONSUMER" | "VIEWER";
  permissions: string[];
  is_superadmin: boolean;
  category: { id?: string; name: string; code: string; description: string | null };
  group: { id?: string; category_id?: string; name: string; code: string; description: string | null; priority: number };
}
