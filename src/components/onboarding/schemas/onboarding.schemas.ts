import { z } from "zod";

// Step 1: Organization Schema
export const organizationSchema = z.object({
  // Organization fields
  orgName: z.string().trim().min(3, "Nama organisasi minimal 3 karakter").max(255),
  orgCode: z.string().trim().min(2, "Kode minimal 2 karakter").max(20, "Kode maksimal 20 karakter"),
  orgType: z.enum(["KKKS", "Regulator", "ServiceProvider"], {
    required_error: "Pilih tipe organisasi",
  }),
  description: z.string().trim().min(10, "Deskripsi minimal 10 karakter").max(500),
  // Participant fields
  participantName: z.string().trim().min(2, "Nama participant minimal 2 karakter"),
  participantEmail: z.string().email("Email tidak valid"),
  participantPhone: z.string().trim().min(5, "Nomor telepon minimal 5 karakter"),
  participantAddress: z.string().trim().min(5, "Alamat minimal 5 karakter"),
  participantRole: z.enum(["Admin", "DataSteward", "Viewer"], {
    required_error: "Pilih role participant",
  }),
  // Domain fields (auto-create domain with the organization)
  domainName: z.string().trim().min(3, "Nama domain minimal 3 karakter").max(255),
  domainCode: z.string().trim().min(2, "Kode domain minimal 2 karakter").max(20, "Kode domain maksimal 20 karakter"),
  domainDescription: z.string().trim().min(10, "Deskripsi domain minimal 10 karakter").max(500),
});
export type OrganizationFormValues = z.infer<typeof organizationSchema>;

// Step 2: Security & Identity Schema
export const securitySchema = z.object({
  ssoType: z.enum(["OIDC", "SAML", "None"]).default("None"),
  tlsEnabled: z.boolean().default(true),
  twoFactorAuth: z.boolean().default(false),
  password: z
    .string()
    .min(8, "Password minimal 8 karakter")
    .optional()
    .or(z.literal("")),
});
export type SecurityFormValues = z.infer<typeof securitySchema>;

// Step 3: Vocabulary Schema
export const vocabularyTermSchema = z.object({
  term: z.string().trim().min(1, "Nama term wajib diisi"),
  datatype: z.string().trim().min(1, "Datatype wajib diisi"),
  unit: z.string().trim().optional(),
  description: z.string().trim().min(10, "Definisi minimal 10 karakter").optional(),
});
export const vocabularySchema = z.object({
  vocabularyName: z.string().trim().min(3, "Nama vocabulary minimal 3 karakter"),
  version: z.string().trim().min(1, "Version wajib diisi").default("1.0.0"),
  vocabularyDescription: z.string().trim().optional(),
  terms: z.array(vocabularyTermSchema).min(1, "Minimal satu term harus ditambahkan"),
});
export type VocabularyFormValues = z.infer<typeof vocabularySchema>;

// Step 4: Metadata Schema
export const metadataSchemaFieldSchema = z.object({
  termIndex: z.number(),
  required: z.boolean().default(false),
  cardinality: z.enum(["SINGLE", "MULTIPLE"]).default("SINGLE"),
});

export const metadataSchemaSchema = z
  .object({
    version: z.string().min(1, "Version wajib diisi").default("1.0.0"),
    fields: z.array(metadataSchemaFieldSchema),
  })
  .refine((data) => data.fields.length > 0, {
    message: "Minimal satu field vocabulary harus dikonfigurasi",
    path: ["fields"],
  });
export type MetadataSchemaFieldValues = z.infer<typeof metadataSchemaFieldSchema>;
export type MetadataSchemaFormValues = z.infer<typeof metadataSchemaSchema>;

// Step 5: Dataset Schema
export const datasetSchema = z.object({
  name: z.string().trim().min(3, "Nama dataset minimal 3 karakter").max(100),
  description: z.string().trim().max(500).optional(),
  provider: z.string().min(1, "Provider wajib diisi"),
  format: z.enum(["WMS", "WFS", "WCS"], {
    required_error: "Pilih format/tipe endpoint",
  }),
  endpoint: z
    .string()
    .url("URL tidak valid")
    .or(z.string().regex(/^https?:\/\//, "URL harus dimulai dengan http:// atau https://")),
  period: z.string().trim().min(1, "Period wajib diisi"),
  wells: z.coerce.number().int().min(0).optional(),
  accessLevel: z.enum(["public", "restricted", "confidential"], {
    required_error: "Pilih level akses",
  }),
});
export type DatasetFormValues = z.infer<typeof datasetSchema>;

// Step 6: Policy Definition Schema
export const policyRuleSchema = z.object({
  left_operand: z.string().trim().min(1, "Left operand wajib diisi"),
  operator: z.enum([
    "EQUALS",
    "NOT_EQUALS",
    "GREATER_THAN",
    "LESS_THAN",
    "CONTAINS",
    "STARTS_WITH",
    "ENDS_WITH",
  ]),
  right_operand: z.string().trim().min(1, "Right operand wajib diisi"),
});

export const policyDefinitionSchema = z.object({
  policyName: z.string().trim().min(3, "Nama policy minimal 3 karakter"),
  description: z.string().trim().optional(),
  version: z.string().trim().min(1, "Version wajib diisi").default("1.0.0"),
  type: z.enum(["ACCESS", "USAGE", "RETENTION", "SECURITY"]).default("ACCESS"),
  rules: z.array(policyRuleSchema).min(1, "Minimal satu rule harus ditambahkan"),
});
export type PolicyRuleValues = z.infer<typeof policyRuleSchema>;
export type PolicyDefinitionFormValues = z.infer<typeof policyDefinitionSchema>;

// Step 7: Contract Request Schema
export const contractPolicyInlineSchema = z.object({
  name: z.string().trim().min(1, "Nama policy wajib diisi"),
  dataClassification: z.string().trim().min(1, "Klasifikasi data wajib diisi"),
  description: z.string().trim().optional(),
});
export const contractRequestSchema = z.object({
  title: z.string().trim().min(3, "Nama kontrak minimal 3 karakter"),
  provider: z.string().min(1, "Provider wajib diisi"),
  consumer: z.string().min(1, "Consumer wajib diisi"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  policies: z.array(contractPolicyInlineSchema).min(1, "Minimal satu policy harus ditambahkan"),
});
export type ContractRequestFormValues = z.infer<typeof contractRequestSchema>;


// Step 8: Agreement & Approval Schema
export const agreementSchema = z.object({
  digitalSignature: z.string().min(1, "Digital signature is required."),
  approved: z.boolean().refine(val => val === true, {
    message: "You must approve the agreement to continue.",
  }),
});
export type AgreementFormValues = z.infer<typeof agreementSchema>;


// Step 9: Monitoring & Go-Live Schema
export const monitoringSchema = z.object({
  enableAuditLog: z.boolean().default(true),
  retentionPeriod: z.coerce.number().min(30, "Minimal 30 hari").max(365, "Maksimal 365 hari"),
  alertEmail: z.string().email("Email tidak valid").or(z.literal("")).optional(),
  complianceFrameworks: z.array(z.string()).min(1, "Pilih minimal satu framework"),
  enableRealTimeAlerts: z.boolean().default(false),
});
export type MonitoringFormValues = z.infer<typeof monitoringSchema>;

