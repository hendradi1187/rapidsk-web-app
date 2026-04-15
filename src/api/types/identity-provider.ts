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
  email: string;
  full_name: string;
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
  token_type: string;
  user?: UserResponse;
}

export interface UserCreateRequest {
  username: string;
  email: string;
  full_name?: string | null;
  password: string;
  category_id: string;
  group_id: string;
}

export interface UserUpdateRequest {
  username?: string | null;
  full_name?: string | null;
  email?: string | null;
  password?: string | null;
  category_id?: string | null;
  group_id?: string | null;
}

export type UserListResponse = PaginatedResponse<UserResponse>;
