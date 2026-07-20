import { describe, it, expect } from "vitest";
import { getApiErrorMessage, normalizeApiErrorMessage } from "@/lib/api-error";

// Bungkus payload jadi bentuk yang dikenali axios.isAxiosError.
const axiosErr = (status: number, data: unknown) => ({
  isAxiosError: true,
  response: { status, data },
  message: "Request failed",
});

describe("normalizeApiErrorMessage — peta pesan", () => {
  const cases: Array<[string, RegExp]> = [
    ["Agreement not found", /provider|pool|sinkron/i],
    ["Connection pool not found", /connection pool/i],
    ["Active outbound transfer already exists for dataset X", /transfer aktif/i],
    ["Tansfer process not found", /proses transfer tidak ditemukan/i],
    ["USER tokens are not allowed for POST /connector/provider/initiate", /connector khusus/i],
    ["Audience doesn't match", /token layanan/i],
    ["No IAM api_resource registered for GET /x", /belum terdaftar di IAM/i],
    ["Missing Authorization bearer token", /sesi/i],
    ["Invalid username or password", /username atau password/i],
    ["Schema not found", /schema tidak ditemukan/i],
    ["Contract not found", /contract tidak ditemukan/i],
    ["version: String should match pattern '^d+.d+.d+$'", /X\.Y\.Z/],
    ["agreement_id: Field required", /agreement_id wajib diisi/i],
    ["Invalid or missing input parameters.", /Feature Layer|parameter query/i],
  ];
  it.each(cases)("map %s", (input, expected) => {
    expect(normalizeApiErrorMessage(input)).toMatch(expected);
  });
});

describe("getApiErrorMessage — 3 envelope live", () => {
  it("A: {error} agreement not found", () => {
    expect(getApiErrorMessage(axiosErr(400, { error: "Agreement not found" }))).toMatch(/provider|pool/i);
  });

  it("B: {detail:{code,message}} missing token", () => {
    const msg = getApiErrorMessage(axiosErr(401, { detail: { code: "MISSING_BEARER_TOKEN", message: "Missing Authorization bearer token" } }));
    expect(msg).toMatch(/sesi/i);
  });

  it("B: principal type not allowed", () => {
    const msg = getApiErrorMessage(axiosErr(403, { detail: { code: "PRINCIPAL_TYPE_NOT_ALLOWED", message: "USER tokens are not allowed for POST /api/v1/connector/provider/initiate" } }));
    expect(msg).toMatch(/connector khusus/i);
  });

  it("C: active outbound transfer (nested details.errors)", () => {
    const payload = { request_id: null, errors: { code: "VALIDATION_ERROR", detail: "ValidationError", message: "Validation Failed", details: { errors: [{ field: "dataset_id", message: "Active outbound transfer already exists for dataset 8e223d0a" }] } } };
    expect(getApiErrorMessage(axiosErr(422, payload))).toMatch(/transfer aktif/i);
  });

  it("C: transfer process not found", () => {
    const payload = { request_id: "x", errors: { code: "TRANSFER_PROCESS_NOT_FOUND_ERROR", detail: "TransferProcessNotFoundError", message: "Tansfer process not found" } };
    expect(getApiErrorMessage(axiosErr(404, payload))).toMatch(/proses transfer tidak ditemukan/i);
  });

  it("C: validation field required → terjemah", () => {
    const payload = { request_id: "x", errors: { code: "REQUEST_VALIDATION_ERROR", message: "Request validation failed.", details: { errors: [{ field: "agreement_id", type: "missing", message: "Field required", location: ["body", "agreement_id"] }] } } };
    expect(getApiErrorMessage(axiosErr(422, payload))).toMatch(/agreement_id wajib diisi/i);
  });

  it("C: INTEGRITY unique dataset → pesan bersih, TANPA bocor DB", () => {
    const dbError = "<class 'asyncpg.exceptions.UniqueViolationError'>: duplicate key value violates unique constraint \"uq_cts_catalog_datasets_domain_schema_version\"";
    const payload = { request_id: null, errors: { code: "INTEGRITY_ERROR", detail: "IntegrityError", message: "The requested operation conflicts...", details: { database_error: dbError } } };
    const msg = getApiErrorMessage(axiosErr(409, payload));
    expect(msg).toMatch(/schema \+ versi|sudah ada/i);
    expect(msg).not.toMatch(/asyncpg|database_error|constraint|UniqueViolation/i);
  });

  it("C: PROVIDER_RESPONSE_ERROR nested → surface penyebab terdalam", () => {
    const payload = { request_id: null, errors: { code: "PROVIDER_RESPONSE_ERROR", detail: "ProviderResponseError", message: "Provider connector returned a non-success response.", details: { provider_status_code: 400, provider_detail: { request_id: null, errors: { code: "PROVIDER_RESPONSE_ERROR", message: "Provider connector returned a non-success response.", details: { provider_status_code: 502, provider_detail: "Unable to access source endpoint" } } } } } };
    const msg = getApiErrorMessage(axiosErr(400, payload));
    expect(msg).toMatch(/tidak bisa menjangkau|source|connector penyedia/i);
    expect(msg).not.toMatch(/ProviderResponseError|provider_status_code/i);
  });

  it("C: INTEGRITY FK dataset_policy → pesan bersih, TANPA bocor DB", () => {
    const dbError = "<class 'asyncpg.exceptions.ForeignKeyViolationError'>: ... table \"pc_contract_dataset\" violates foreign key constraint \"fk_pc_contract_dataset_dataset_policy_id_pc_dataset_policies\"";
    const payload = { request_id: null, errors: { code: "INTEGRITY_ERROR", detail: "IntegrityError", message: "conflict", details: { database_error: dbError } } };
    const msg = getApiErrorMessage(axiosErr(409, payload));
    expect(msg).toMatch(/dataset policy/i);
    expect(msg).not.toMatch(/asyncpg|ForeignKey|constraint/i);
  });
});
