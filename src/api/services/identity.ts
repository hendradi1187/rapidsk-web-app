/* eslint-disable @typescript-eslint/no-explicit-any */
import { authClient as apiClient } from "../clients";

export interface CodeRef {
  id: string;
  code: string;
  name?: string;
}

const unwrap = (res: any): any[] => res?.data?.data ?? res?.data ?? [];
const getHasNext = (res: any) => Boolean(res?.data?.has_next);
const getTotal = (res: any): number | null => {
  const total = res?.data?.total;
  return typeof total === "number" ? total : null;
};
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
    const limit = 100;
    let offset = 0;
    let total: number | null = null;
    const rows: CodeRef[] = [];

    do {
      const res = await authClient.get("/identity-provider/user/categories/", {
        params: { limit, offset },
      });
      const batch = unwrap(res).map((c: any) => ({
        id: c.id,
        code: canonicalizeIamCode(c.code, c.name),
        name: c.name,
      })) as CodeRef[];
      rows.push(...batch);
      total = getTotal(res);
      if (!getHasNext(res) || batch.length < limit) break;
      offset += limit;
    } while (total === null || offset < total);

    return rows;
  },
};

export const userGroupsApi = {
  list: async (): Promise<Array<CodeRef & { category?: { code?: string; name?: string } }>> => {
    const limit = 100;
    let offset = 0;
    let total: number | null = null;
    const rows: Array<CodeRef & { category?: { code?: string; name?: string } }> = [];

    do {
      const res = await authClient.get("/identity-provider/user/groups/", {
        params: { limit, offset },
      });
      const batch = unwrap(res).map((g: any) => ({
        id: g.id,
        code: canonicalizeIamCode(g.code, g.name),
        name: g.name,
        category: g.category
          ? {
              ...g.category,
              code: canonicalizeIamCode(g.category?.code, g.category?.name),
              name: g.category?.name,
            }
          : g.category,
      })) as Array<CodeRef & { category?: { code?: string; name?: string } }>;
      rows.push(...batch);
      total = getTotal(res);
      if (!getHasNext(res) || batch.length < limit) break;
      offset += limit;
    } while (total === null || offset < total);

    return rows;
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
    const res = await authClient.post("/identity-provider/users/", body);
    return res.data as { id: string };
  },
  // Edit mapping/profil user existing. Kontrak live: UserUpdateRequest — semua
  // field optional & nullable. CATATAN: participant_id TIDAK ada di body PATCH
  // (beda dgn create), jadi ikatan participant tidak bisa diubah lewat sini.
  update: async (
    id: string,
    body: Partial<{
      username: string;
      email: string;
      full_name: string;
      password: string;
      category_id: string;
      group_id: string;
    }>,
  ): Promise<any> => {
    const res = await authClient.patch(`/identity-provider/users/${id}`, body);
    return res.data;
  },
  // Hapus user existing. Kontrak live: DELETE /identity-provider/users/{id}
  // (route terverifikasi hidup di runtime → 401 tanpa auth, bukan 404).
  remove: async (id: string): Promise<void> => {
    await authClient.delete(`/identity-provider/users/${id}`);
  },
  list: async (): Promise<any[]> => {
    const limit = 100;
    let offset = 0;
    let total: number | null = null;
    const rows: any[] = [];

    do {
      const res = await authClient.get("/identity-provider/users/", {
        params: { limit, offset },
      });
      const batch = unwrap(res);
      rows.push(...batch);
      total = getTotal(res);
      if (!getHasNext(res) || batch.length < limit) break;
      offset += limit;
    } while (total === null || offset < total);

    return rows;
  },
  // PUBLIK - operator set password via tautan email.
  confirmEmail: async (token: string, password: string): Promise<any> => {
    const res = await authClient.post("/identity-provider/users/confirm-email", {
      token,
      password,
    });
    return res.data;
  },
  // Kirim ulang email undangan/aktivasi (token baru 24 jam). PUBLIK.
  resendConfirmation: async (email: string): Promise<any> => {
    const res = await authClient.post(
      "/identity-provider/users/resend-email-confirmation",
      { email },
    );
    return res.data;
  },
};
