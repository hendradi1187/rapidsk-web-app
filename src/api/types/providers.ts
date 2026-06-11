export interface Provider {
  provider_id: string;
  provider_name: string;
  organization_type?: string;
  address?: string;
  status: string;
  contact_person?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}

export type ProviderListResponse = Provider[];

export interface ProviderCreateRequest {
  organization_name: string;
  organization_type: string;
  address: string;
  contact_person: {
    name: string;
    email: string;
    phone: string;
  };
}

export interface ProviderUpdateRequest {
  organization_name?: string;
  organization_type?: string;
  address?: string;
  contact_person?: {
    name?: string;
    email?: string;
    phone?: string;
  };
}
