import { PaginatedResponse } from "./common";

// ============ PARTICIPANT ============

export type ParticipantOrganizationType = "GOV_LOCAL" | "GOV_PROV" | "GOV_CENTRAL" | "ENTERPRISE";
export type ParticipantStatus = "ACTIVE" | "SUSPENDED";

export interface ParticipantContactPerson {
  name: string;
  email: string;
  phone: string;
}

export interface Participant {
  id: string;
  organization_name: string;
  organization_type: ParticipantOrganizationType;
  address: string;
  contact_person: ParticipantContactPerson;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantCreateRequest {
  organization_name: string;
  organization_type: ParticipantOrganizationType;
  address: string;
  contact_person: ParticipantContactPerson;
}

export interface ParticipantUpdateRequest {
  organization_name?: string | null;
  organization_type?: ParticipantOrganizationType | null;
  address?: string | null;
  contact_person?: ParticipantContactPerson | null;
}

export type ParticipantListResponse = PaginatedResponse<Participant>;
export type ParticipantResponse = Participant;

// ============ PARTICIPANT DOMAIN ============

export type ParticipantDomainStatus = "ACTIVE";

export interface ParticipantDomain {
  id?: string;
  participant_id: string;
  domain_id: string;
  status: ParticipantDomainStatus;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ParticipantDomainCreateRequest {
  domain_id: string;
}

export interface ParticipantDomainUpdateRequest {
  domain_id: string;
}

export type ParticipantDomainListResponse = PaginatedResponse<ParticipantDomain>;
export type ParticipantDomainResponse = ParticipantDomain;

// ============ CONNECTION POOL ============

export type ConnectionPoolType = "CONSUMER" | "PROVIDER";

export interface ConnectionPoolMetadata {
  url_consumer: string;
  url_provider: string;
}

export interface ConnectionPool {
  id: string;
  participant_id: string;
  name: string;
  type: ConnectionPoolType;
  token: string;
  metadata: ConnectionPoolMetadata;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface ConnectionPoolCreateRequest {
  participant_id: string;
  name: string;
  type: ConnectionPoolType;
  token: string;
  metadata: ConnectionPoolMetadata;
}

export interface ConnectionPoolUpdateRequest {
  name?: string | null;
  type?: ConnectionPoolType | null;
  token?: string | null;
  metadata?: ConnectionPoolMetadata | null;
}

export type ConnectionPoolListResponse = PaginatedResponse<ConnectionPool>;
export type ConnectionPoolResponse = ConnectionPool;
