/* eslint-disable @typescript-eslint/no-explicit-any */
import { apiClient } from "../client";

export interface JuknisOverride {
  classification?: string;
  retention_years?: number;
}

export interface JuknisApplyResult {
  version: string;
  domains: number;
  dataset_policies_created: number;
  contract_policies_created: number;
  vocabularies_created: number;
  schemas_created: number;
  errors: string[];
}

export const juknisApi = {
  // Terapkan paket Juknis ke domain (SuperAdmin). overrides: { domainKey: {classification, retention_years} }
  apply: async (
    domainId: string,
    body: { overrides?: Record<string, JuknisOverride>; include_dictionary?: boolean },
  ): Promise<JuknisApplyResult> => {
    const res = await apiClient.post(`/policy-contract/${domainId}/apply-juknis`, {
      overrides: body.overrides ?? {},
      include_dictionary: body.include_dictionary ?? true,
    });
    return res.data as JuknisApplyResult;
  },
};
