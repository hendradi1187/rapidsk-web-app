import { z } from "zod";

// Step 1: Organization Schema
export const organizationSchema = z.object({
  orgName: z.string().trim().min(3, "Nama organisasi minimal 3 karakter").max(100),
  orgType: z.enum(["KKKS", "Regulator", "ServiceProvider"], {
    required_error: "Pilih tipe organisasi",
  }),
  description: z.string().trim().max(500).optional(),
  participantName: z.string().trim().min(2, "Nama participant minimal 2 karakter"),
  participantEmail: z.string().email("Email tidak valid"),
  participantRole: z.enum(["Admin", "DataSteward", "Viewer"], {
    required_error: "Pilih role participant",
  }),
});

export type OrganizationFormValues = z.infer<typeof organizationSchema>;

// Step 2: Vocabulary Schema
export const vocabularyTermSchema = z.object({
  name: z.string().trim().min(1, "Nama term wajib diisi"),
  definition: z.string().trim().min(10, "Definisi minimal 10 karakter"),
  dataType: z.enum(["string", "number", "boolean", "date", "object"]),
});

export const vocabularySchema = z.object({
  vocabularyName: z.string().trim().min(3, "Nama vocabulary minimal 3 karakter"),
  namespace: z.string().url("Namespace harus URL valid").or(z.literal("")).optional(),
  terms: z.array(vocabularyTermSchema).min(1, "Minimal satu term harus ditambahkan"),
});

export type VocabularyFormValues = z.infer<typeof vocabularySchema>;

// Step 3: Dataset Schema
export const datasetSchema = z.object({
  name: z.string().trim().min(3, "Nama dataset minimal 3 karakter").max(100),
  description: z.string().trim().max(500).optional(),
  provider: z.string().min(1, "Provider wajib dipilih"),
  domain: z.string().min(1, "Domain wajib dipilih"),
  endpointType: z.enum(["WMS", "WFS", "WCS"], {
    required_error: "Pilih tipe endpoint",
  }),
  endpointUrl: z
    .string()
    .url("URL tidak valid")
    .or(z.string().regex(/^https?:\/\//, "URL harus dimulai dengan http:// atau https://")),
  format: z.enum(["GeoJSON", "GML", "KML", "GeoTIFF", "Shapefile", "CSV"], {
    required_error: "Pilih format data",
  }),
  accessLevel: z.enum(["public", "restricted", "confidential"], {
    required_error: "Pilih level akses",
  }),
});

export type DatasetFormValues = z.infer<typeof datasetSchema>;

// Step 4: Contract Schema
export const policySchema = z.object({
  type: z.enum(["access", "usage", "retention"]),
  rule: z.string().min(1, "Rule wajib diisi"),
  value: z.string().min(1, "Value wajib diisi"),
});

export const contractSchema = z.object({
  contractName: z.string().trim().min(3, "Nama kontrak minimal 3 karakter"),
  provider: z.string().min(1, "Provider wajib dipilih"),
  consumer: z.string().min(1, "Consumer wajib dipilih"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  endDate: z.string().optional(),
  policies: z.array(policySchema).min(1, "Minimal satu policy harus ditambahkan"),
});

export type ContractFormValues = z.infer<typeof contractSchema>;

// Step 5: Transfer Schema
export const transferSchema = z.object({
  transferName: z.string().trim().min(3, "Nama transfer minimal 3 karakter"),
  sourceDataset: z.string().min(1, "Source dataset wajib dipilih"),
  targetEndpoint: z.string().url("Target endpoint harus URL valid"),
  protocol: z.enum(["HTTP", "HTTPS", "S3", "FTP"], {
    required_error: "Pilih protokol",
  }),
  scheduleType: z.enum(["realtime", "scheduled", "manual"], {
    required_error: "Pilih tipe jadwal",
  }),
  cronExpression: z.string().optional(),
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
