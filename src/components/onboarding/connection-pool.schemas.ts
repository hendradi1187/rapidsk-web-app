import { z } from "zod";

export const connectionPoolSchema = z.object({
  name: z.string().min(3, "Nama pool minimal 3 karakter"),
  type: z.enum(["CONSUMER", "PROVIDER"]),
  participant_id: z.string().min(1, "Participant wajib dipilih"),
  token: z.string().min(1, "Token wajib diisi"),
  metadata: z.object({
    url_consumer: z.string().url("Format URL Consumer tidak valid"),
    url_provider: z.string().url("Format URL Provider tidak valid"),
  }),
});

export type ConnectionPoolFormValues = z.infer<typeof connectionPoolSchema>;
