import { AxiosError } from "axios";

export interface ApiErrorSummary {
  title: string;
  detail: string;
  errorCount: number;
}

export function getApiErrorSummary(error: unknown, fallbackTitle = "Backend request failed"): ApiErrorSummary {
  const axiosError = error as AxiosError<any>;
  const errors = axiosError?.response?.data?.errors;
  if (Array.isArray(errors) && errors.length > 0) {
    return {
      title: fallbackTitle,
      detail: errors
        .map((entry: any) => `${entry.field || "field"}: ${entry.message || "Unknown backend error"}`)
        .join(" | "),
      errorCount: errors.length,
    };
  }

  const detail =
    axiosError?.response?.data?.detail ||
    axiosError?.response?.data?.message ||
    axiosError?.message ||
    "Unknown backend error";

  return {
    title: fallbackTitle,
    detail: String(detail),
    errorCount: 1,
  };
}

export function countMappingIssues(mappings: any[]) {
  return {
    missingDomainId: mappings.filter((mapping) => !mapping?.domain_id).length,
    missingStatus: mappings.filter((mapping) => !mapping?.status).length,
  };
}

export function countDatasetIssues(datasets: any[]) {
  return {
    missingEndpointUrl: datasets.filter((dataset) => !dataset?.endpoint?.url).length,
    missingProtocol: datasets.filter((dataset) => !dataset?.endpoint?.protocol).length,
    missingAccessType: datasets.filter((dataset) => !dataset?.endpoint?.access_type).length,
    missingSchema: datasets.filter((dataset) => !dataset?.schema_id).length,
  };
}

export function countContractIssues(contracts: any[]) {
  return {
    missingDatasets: contracts.filter((contract) => !Array.isArray(contract?.datasets)).length,
    missingPolicies: contracts.filter((contract) => !Array.isArray(contract?.contract_policies)).length,
    missingConsumerId: contracts.filter((contract) => !contract?.consumer_id).length,
    missingProviderId: contracts.filter((contract) => !contract?.provider_id).length,
  };
}

export function countAgreementIssues(agreements: any[]) {
  return {
    missingContractId: agreements.filter((agreement) => !agreement?.contract_id).length,
    missingEffectiveFrom: agreements.filter((agreement) => !agreement?.effective_from).length,
    missingEffectiveTo: agreements.filter((agreement) => !agreement?.effective_to).length,
    missingStatus: agreements.filter((agreement) => !agreement?.status).length,
  };
}

export function countTransferIssues(transfers: any[]) {
  return {
    missingStatus: transfers.filter((transfer) => !transfer?.status).length,
    missingFrom: transfers.filter((transfer) => !transfer?.from).length,
    missingTo: transfers.filter((transfer) => !transfer?.to).length,
    missingAgreementId: transfers.filter((transfer) => !transfer?.agreement_id).length,
    missingTimestamp: transfers.filter((transfer) => !(transfer?.lastSync || transfer?.updated_at || transfer?.created_at)).length,
  };
}
