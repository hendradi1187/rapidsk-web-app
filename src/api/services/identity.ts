/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";

export interface CodeRef {
  id: string;
  code: string;
  name?: string;
}

const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];
const normalizeIamCode = (value: string | null | undefined) =>
  String(value ?? "").trim().toUpperCase();

const isProviderAlias = (value: string | null | undefined) => {
  const code = normalizeIamCode(value);
  return [
    "PROVIDER",
    "KKKS",
    "ENTERPRISE",
    "DATA_PROVIDER",
    "ADMIN_PROVIDER",
  ].some((alias) => code.includes(alias));
};

const isConsumerAlias = (value: string | null | undefined) => {
  const code = normalizeIamCode(value);
  return [
    "CONSUMER",
    "SKK",
    "GOV",
    "REGULATOR",
  ].some((alias) => code.includes(alias));
};

const canonicalizeIamCode = (code: string | null | undefined, name?: string | null) => {
  if (isProviderAlias(code) || isProviderAlias(name)) return "PROVIDER";
  if (isConsumerAlias(code) || isConsumerAlias(name)) return "CONSUMER";
  return String(code ?? "").trim();
};

// Kategori & grup user (untuk resolve PROVIDER category_id/group_id).
export const userCategoriesApi = {
  list: async (): Promise<CodeRef[]> => {
    const res = await apiClient.get("/identity-provider/user/categories/");
    return unwrap(res).map((c: any) => ({
      id: c.id,
      code: canonicalizeIamCode(c.code, c.name),
      name: c.name,
    }));
  },
};

export const userGroupsApi = {
  list: async (): Promise<Array<CodeRef & { category?: { code?: string } }>> => {
    const res = await apiClient.get("/identity-provider/user/groups/");
    return unwrap(res).map((g: any) => ({
      id: g.id,
      code: canonicalizeIamCode(g.code, g.name),
      name: g.name,
      category: g.category
        ? {
            ...g.category,
            code: canonicalizeIamCode(g.category?.code, g.category?.name),
          }
        : g.category,
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
  // PUBLIK - operator set password via tautan email.
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
