import { z } from "zod";

const organizationTypeEnum = z.enum(
  ["GOV_LOCAL", "GOV_PROV", "GOV_CENTRAL", "ENTERPRISE"],
  {
    errorMap: () => ({ message: "Pilih tipe organisasi yang valid." }),
  }
);

export const participantSchema = z.object({
  organization_name: z.string().min(3, "Nama organisasi minimal 3 karakter."),
  organization_type: organizationTypeEnum,
  address: z.string().min(10, "Alamat minimal 10 karakter."),
  contact_person: z.object({
    name: z.string().min(3, "Nama contact person minimal 3 karakter."),
    email: z.string().email("Format email tidak valid."),
    phone: z.string().min(9, "Nomor telepon minimal 9 digit."),
  }),
});

export type ParticipantFormValues = z.infer<typeof participantSchema>;
