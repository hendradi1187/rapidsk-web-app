import { z } from "zod";

const optionalText = z.preprocess(
  (value) => (typeof value === "string" && value.trim() === "" ? null : value),
  z.string().min(3).optional().nullable()
);

export const userSchema = z.object({
  username: optionalText,
  full_name: optionalText,
  email: z.string().email("Format email tidak valid"),
  password: optionalText,
  category_id: z.string().uuid("Category ID harus berupa UUID"),
  group_id: z.string().uuid("Group ID harus berupa UUID"),
});

export type UserFormValues = z.infer<typeof userSchema>;
