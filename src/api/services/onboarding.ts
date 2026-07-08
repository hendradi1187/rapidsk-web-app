/* eslint-disable @typescript-eslint/no-explicit-any */
import { ctsClient } from "../client";

// Self-service registrasi KKKS (publik) + antrian persetujuan SKK Migas.
export interface RegistrationItem {
  id: string;
  organization_name: string;
  wilayah_kerja: string;
  operator_name: string;
  operator_email: string;
  operator_phone?: string | null;
  status: "PENDING" | "APPROVED" | "REJECTED" | string;
  note?: string | null;
  participant_id?: string | null;
  created_at?: string;
}

export interface RegistrationCreate {
  organization_name: string;
  wilayah_kerja: string;
  operator_name: string;
  operator_email: string;
  operator_phone?: string;
  note?: string;
}

// Participant (provider) — create dipakai saat SKK Migas menyetujui pendaftaran.
export const participantsApi = {
  create: async (body: {
    organization_name: string;
    organization_type: string; // ENTERPRISE untuk KKKS
    address: string;
    contact_person: { name: string; email: string; phone: string };
  }): Promise<{ id: string }> => {
    const res = await ctsClient.post("/onboarding/participants", body);
    return res.data as { id: string };
  },
};

export const registrationsApi = {
  // PUBLIK — tanpa token.
  create: async (body: RegistrationCreate): Promise<RegistrationItem> => {
    const res = await ctsClient.post("/onboarding/registrations", body);
    return res.data as RegistrationItem;
  },
  // SuperAdmin.
  list: async (status?: string): Promise<RegistrationItem[]> => {
    const limit = 100;
    let offset = 0;
    let hasNext = false;
    const rows: RegistrationItem[] = [];

    do {
      const res = await ctsClient.get("/onboarding/registrations", {
        params: { ...(status ? { status } : {}), limit, offset },
      });
      const batch = (res?.data?.data ?? res?.data ?? []) as RegistrationItem[];
      rows.push(...batch);
      hasNext = Boolean(res?.data?.has_next);
      if (!hasNext || batch.length < limit) break;
      offset += limit;
    } while (hasNext);

    return rows;
  },
  update: async (
    id: string,
    body: { status?: string; note?: string; participant_id?: string },
  ): Promise<RegistrationItem> => {
    const res = await ctsClient.patch(`/onboarding/registrations/${id}`, body);
    return res.data as RegistrationItem;
  },
};
