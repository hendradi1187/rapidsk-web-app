import { z } from "zod";

export const vocabularySchema = z.object({
  name: z.string().min(3, "Nama vocabulary minimal 3 karakter"),
  version: z.string().min(1, "Version wajib diisi"),
  description: z.string().optional().nullable(),
  status: z.enum(["DRAFT", "PUBLISHED"]).default("DRAFT"),
});

export type VocabularyFormValues = z.infer<typeof vocabularySchema>;
