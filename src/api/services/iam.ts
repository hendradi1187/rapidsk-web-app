import { apiClient } from "../client";
import { normalizeEffectivePermissions } from "@/lib/effective-permissions";

export const iamApi = {
  getMyEffectivePermissions: async (): Promise<string[]> => {
    const response = await apiClient.get("/identity-provider/iam/me/effective-permissions");
    return normalizeEffectivePermissions(response.data);
  },
};
