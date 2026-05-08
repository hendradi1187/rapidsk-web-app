// Based on rapiDSK Enterprise OpenAPI spec /providers

export interface Provider {
  provider_id: string;
  provider_name: string;
  status: string;          // free string per spec — Q-D (active/inactive/suspended/etc.)
}

export type ProviderListResponse = Provider[];
