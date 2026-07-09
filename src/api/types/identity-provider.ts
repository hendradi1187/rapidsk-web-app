// src/api/types/identity-provider.ts  
 
import { PaginatedResponse } from './common'; 
 
export interface User { 
  id: string; 
  username?: string | null; 
  email: string; 
  full_name?: string | null; 
  is_active?: boolean; 
  is_verified?: boolean; 
  category?: { 
    id?: string; 
    name?: string; 
    code?: string; 
    description?: string; 
  } | null; 
  group?: { 
    id?: string; 
    name?: string; 
    code?: string; 
    description?: string; 
    priority?: number; 
  } | null; 
  created_at?: string; 
  updated_at?: string; 
} 
 
export interface LoginRequest { 
  username: string; 
  password: string; 
} 
 
export interface LoginResponse { 
  access_token: string; 
  token_type: string; 
  user?: User; 
} 
 
export interface UserCreateRequest { 
  username: string; 
  email: string; 
  full_name?: string; 
  password: string; 
  category_id: string; 
  group_id: string; 
  participant_id?: string; 
} 
 
export interface UserUpdateRequest { 
  username?: string; 
  email?: string; 
  full_name?: string; 
  password?: string; 
  category_id?: string; 
  group_id?: string; 
  is_active?: boolean; 
} 
 
export type UserListResponse = PaginatedResponse<User>; 
