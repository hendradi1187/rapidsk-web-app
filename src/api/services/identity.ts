/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";

export interface CodeRef {
  id: string;
  code: string;
  name?: string;
}

const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];

// Kategori & grup user (untuk resolve PROVIDER category_id/group_id).
export const userCategoriesApi = {
  list: async (): Promise<CodeRef[]> => {
    const res = await apiClient.get("/identity-provider/user/categories/");
    return unwrap(res).map((c: any) => ({ id: c.id, code: c.code, name: c.name }));
  },
};

export const userGroupsApi = {
  list: async (): Promise<Array<CodeRef & { category?: { code?: string } }>> => {
    const res = await apiClient.get("/identity-provider/user/groups/");
    return unwrap(res).map((g: any) => ({
      id: g.id,
      code: g.code,
      name: g.name,
      category: g.category,
    }));
  },
};

export const usersApi = {
  // Buat user operator (BE kirim email aktivasi otomatis). SuperAdmin.
  create: async (body: {
    username: string;
    email: string;
    full_name?: string;
    password: string;
    category_id: string;
    group_id: string;
    participant_id?: string;
  }): Promise<{ id: string }> => {
    const res = await apiClient.post("/identity-provider/users/", body);
    return res.data as { id: string };
  },
  list: async (): Promise<any[]> => {
    const res = await apiClient.get("/identity-provider/users/");
    return unwrap(res);
  },
  // PUBLIK — operator set password via tautan email.
  confirmEmail: async (token: string, password: string): Promise<any> => {
    const res = await apiClient.post("/identity-provider/users/confirm-email", {
      token,
      password,
    });
    return res.data;
  },
  // Kirim ulang email undangan/aktivasi (token baru 24 jam). PUBLIK.
  resendConfirmation: async (email: string): Promise<any> => {
    const res = await apiClient.post(
      "/identity-provider/users/resend-email-confirmation",
      { email },
    );
    return res.data;
  },
};
