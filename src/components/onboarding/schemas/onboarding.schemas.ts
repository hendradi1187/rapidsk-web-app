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

// Step 2: Vocabulary Schema
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

// Step 3: Dataset Schema
// Backend DatasetCreateRequest: name, provider, domain, format (WMS|WFS|WCS), endpoint, period, wells?, description?, accessLevel?
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

// Step 4: Contract Schema
// Backend ContractCreateRequest: title, provider, consumer, domain, policy, startDate, endDate?, description?, contract_policies?, datasets?
// Contract policies are created separately, then referenced by ID in the contract.
// For onboarding, we create contract policies inline and then attach them.
export const contractPolicyInlineSchema = z.object({
  name: z.string().trim().min(1, "Nama policy wajib diisi"),
  dataClassification: z.string().trim().min(1, "Klasifikasi data wajib diisi"),
  description: z.string().trim().optional(),
});

export const contractSchema = z.object({
  title: z.string().trim().min(3, "Nama kontrak minimal 3 karakter"),
  provider: z.string().min(1, "Provider wajib diisi"),
  consumer: z.string().min(1, "Consumer wajib diisi"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  description: z.string().trim().max(500).optional(),
  policies: z.array(contractPolicyInlineSchema).min(1, "Minimal satu policy harus ditambahkan"),
});

export type ContractFormValues = z.infer<typeof contractSchema>;

// Step 5: Transfer Schema
// Backend DataTransferCreateRequest: name, from, to, type (streaming|batch), sourceDataset?, targetEndpoint?, protocol?, scheduleType?, cronExpression?, encrypted?
export const transferSchema = z.object({
  name: z.string().trim().min(3, "Nama transfer minimal 3 karakter"),
  from: z.string().trim().min(1, "Sumber (from) wajib diisi"),
  to: z.string().trim().min(1, "Tujuan (to) wajib diisi"),
  type: z.enum(["streaming", "batch"], {
    required_error: "Pilih tipe transfer",
  }),
  targetEndpoint: z.string().url("Target endpoint harus URL valid"),
  protocol: z.enum(["HTTP", "HTTPS", "S3", "FTP", "SFTP"], {
    required_error: "Pilih protokol",
  }),
  scheduleType: z.enum(["realtime", "scheduled", "manual"], {
    required_error: "Pilih tipe jadwal",
  }),
  cronExpression: z.string().optional(),
  encrypted: z.boolean().default(true),
});

export type TransferFormValues = z.infer<typeof transferSchema>;

// Step 6: Monitoring Schema
export const monitoringSchema = z.object({
  enableAuditLog: z.boolean().default(true),
  retentionPeriod: z.coerce.number().min(30, "Minimal 30 hari").max(365, "Maksimal 365 hari"),
  alertEmail: z.string().email("Email tidak valid").or(z.literal("")).optional(),
  complianceFrameworks: z.array(z.string()).min(1, "Pilih minimal satu framework"),
  enableRealTimeAlerts: z.boolean().default(false),
});

export type MonitoringFormValues = z.infer<typeof monitoringSchema>;
