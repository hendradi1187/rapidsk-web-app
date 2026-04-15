import { z } from "zod";

export const agreementSchema = z.object({
  contract_id: z.string().min(1, "Contract wajib dipilih"),
  effective_from: z.string().min(1, "Tanggal mulai wajib diisi"),
  effective_to: z.string().min(1, "Tanggal selesai wajib diisi"),
  status: z.enum(["REQUESTED", "APPROVED", "REJECTED", "ACTIVE"]).optional().nullable(),
});

export type AgreementFormValues = z.infer<typeof agreementSchema>;
