import { authClient as apiClient } from "../clients";
import { normalizeEffectivePermissions } from "@/lib/effective-permissions";

// Aplikasi platform yang terdaftar di IAM. Endpoint effective-permissions WAJIB
// query ?application, jadi untuk dapat izin gabungan user kita panggil per app
// lalu digabung. (Kalau BE menambah aplikasi baru, tambahkan kodenya di sini.)
const PLATFORM_APPLICATIONS = ["CONNECTOR", "CTS", "OGC_ADAPTER"];

export const iamApi = {
  // Izin efektif user saat ini, digabung dari semua aplikasi platform. Endpoint
  // tidak mendukung "semua aplikasi" dalam satu panggilan (harus per application),
  // jadi kita fan-out lalu merge. Per-app error diabaikan (allSettled).
  getMyEffectivePermissions: async (): Promise<string[]> => {
    const results = await Promise.allSettled(
      PLATFORM_APPLICATIONS.map((application) =>
        apiClient
          .get("/identity-provider/iam/me/effective-permissions", { params: { application } })
          .then((res) => normalizeEffectivePermissions(res.data)),
      ),
    );
    const merged = new Set<string>();
    for (const r of results) {
      if (r.status === "fulfilled") r.value.forEach((p) => merged.add(p));
    }
    return Array.from(merged);
  },
  // CATATAN: GET /iam/users/{id}/effective-permissions ADA di OpenAPI tapi
  // mengembalikan 404 di runtime (belum diimplementasi BE) — jadi tidak dipakai.
  // Bundle policy terkompilasi untuk sebuah aplikasi (audience + versi + resources).
  // Kontrak live: GET /identity-provider/iam/policy-bundle?application={code}.
  getPolicyBundle: async (
    application: string,
  ): Promise<{
    application: string;
    audience: string;
    version: number;
    resources: unknown[];
  }> => {
    const response = await apiClient.get("/identity-provider/iam/policy-bundle", {
      params: { application },
    });
    return response.data;
  },
};
