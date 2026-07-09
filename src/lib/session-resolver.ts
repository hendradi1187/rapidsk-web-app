import type { AppRole } from "@/context/AuthContext";
import type { Organization } from "@/api/types/governance";
import type { Provider } from "@/api/types/providers";
import type { RegistrationItem } from "@/api/services/onboarding";
import {
  resolveGovernanceOrganizationBinding,
  type ResolvedGovernanceBinding,
} from "@/lib/governance-binding";
import { getStoredParticipantOrganizationId } from "@/lib/participant-org-binding";

type ParticipantDomainRef = {
  domain_id?: string | null;
};

type LoginOrganizationOption = {
  id: string | null;
  name: string;
  participantId: string | null;
};

export interface LoginSessionBindingResolution {
  organizationId: string | null;
  organizationName: string;
  participantId: string | null;
  binding: ResolvedGovernanceBinding<Organization>;
  blockingReason: string | null;
}

const normalize = (value: string | null | undefined) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

const findOrganizationByName = (
  organizations: Organization[],
  organizationName: string | null | undefined,
) =>
  organizations.find((item) => normalize(item.organization_name) === normalize(organizationName)) ?? null;

export const resolveLoginSessionBinding = ({
  role,
  selectedOrganization,
  tokenParticipantId,
  tokenOrgName,
  matchedRegistration,
  matchedParticipant,
  organizations,
  participantDomains,
  organizationDomainsById,
}: {
  role: AppRole;
  selectedOrganization: LoginOrganizationOption | null;
  tokenParticipantId: string | null;
  tokenOrgName: string;
  matchedRegistration: RegistrationItem | null;
  matchedParticipant: Provider | null;
  organizations: Organization[];
  participantDomains: ParticipantDomainRef[];
  organizationDomainsById: Record<string, Array<{ domain_id: string }>>;
}): LoginSessionBindingResolution => {
  const isStrictOrganizationRole = role === "PROVIDER" || role === "ADMIN";

  const participantId =
    matchedParticipant?.provider_id ??
    matchedRegistration?.participant_id ??
    tokenParticipantId ??
    null;

  const participantName =
    matchedParticipant?.provider_name ??
    matchedRegistration?.organization_name ??
    tokenOrgName ??
    selectedOrganization?.name ??
    "";

  const storedOrganizationId = participantId
    ? getStoredParticipantOrganizationId(participantId)
    : null;

  const participantDomainIds = participantDomains
    .map((item) => String(item.domain_id ?? "").trim())
    .filter(Boolean);

  const binding = resolveGovernanceOrganizationBinding({
    organizations,
    domainsByOrganizationId: organizationDomainsById,
    participantDomainIds,
    participantName,
    preferredOrganizationId: storedOrganizationId ?? selectedOrganization?.id ?? null,
    preferredOrganizationName: selectedOrganization?.name ?? participantName,
  });

  const bindingHasRealEvidence =
    binding.matchedBy === "participant_domains" ||
    binding.matchedBy === "participant_name";

  const storedOrganization = storedOrganizationId
    ? organizations.find((item) => item.organization_id === storedOrganizationId) ?? null
    : null;

  const selectedOrganizationMatch = selectedOrganization?.id
    ? organizations.find((item) => item.organization_id === selectedOrganization.id) ?? null
    : findOrganizationByName(organizations, selectedOrganization?.name);

  const registrationOrganization = findOrganizationByName(
    organizations,
    matchedRegistration?.organization_name,
  );

  const participantOrganization = findOrganizationByName(
    organizations,
    matchedParticipant?.provider_name,
  );

  const trustedParticipantIds = new Set(
    [
      tokenParticipantId,
      matchedRegistration?.participant_id,
      matchedParticipant?.provider_id,
    ].filter(Boolean),
  );

  const trustedOrganizationIds = new Set<string>();
  const trustedOrganizationKeys = new Set<string>();

  const trustOrganization = (organization: Organization | null | undefined) => {
    if (!organization) return;
    if (organization.organization_id) {
      trustedOrganizationIds.add(organization.organization_id);
    }
    const key = normalize(organization.organization_name);
    if (key) {
      trustedOrganizationKeys.add(key);
    }
  };

  if (storedOrganizationId) {
    trustedOrganizationIds.add(storedOrganizationId);
  }

  if (bindingHasRealEvidence) {
    trustOrganization(binding.organization);
  }

  trustOrganization(registrationOrganization);
  trustOrganization(participantOrganization);

  [
    tokenOrgName,
    matchedRegistration?.organization_name,
    matchedParticipant?.provider_name,
  ].forEach((value) => {
    const key = normalize(value);
    if (key) {
      trustedOrganizationKeys.add(key);
    }
  });

  binding.candidates.forEach((candidate) => trustOrganization(candidate));

  const hasVerifiableEvidence =
    Boolean(storedOrganizationId) ||
    Boolean(matchedParticipant) ||
    Boolean(matchedRegistration) ||
    participantDomainIds.length > 0 ||
    binding.candidates.length > 0;

  const selectedOrganizationId = selectedOrganization?.id ?? null;
  const selectedOrganizationKey = normalize(selectedOrganization?.name);

  const selectionMatches =
    role === "SUPER_ADMIN" ||
    role === "CONSUMER" ||
    Boolean(selectedOrganizationId && trustedOrganizationIds.has(selectedOrganizationId)) ||
    Boolean(selectedOrganizationKey && trustedOrganizationKeys.has(selectedOrganizationKey)) ||
    Boolean(
      selectedOrganization?.participantId &&
      trustedParticipantIds.has(selectedOrganization.participantId),
    );

  const trustedResolvedOrganization =
    (bindingHasRealEvidence ? binding.organization : null) ??
    storedOrganization ??
    registrationOrganization ??
    participantOrganization ??
    (!isStrictOrganizationRole ? selectedOrganizationMatch : null) ??
    null;

  const hasTrustedOrganizationEvidence =
    trustedOrganizationIds.size > 0 || trustedOrganizationKeys.size > 0;

  let blockingReason: string | null = null;

  if (isStrictOrganizationRole && !selectedOrganizationId) {
    blockingReason = "Akun ini wajib login dengan organisasi governance yang dipilih dari daftar.";
  } else if (role === "PROVIDER" && !participantId) {
    blockingReason = "Akun provider ini belum terhubung ke participant yang valid.";
  } else if (isStrictOrganizationRole && !hasVerifiableEvidence) {
    blockingReason = "Binding organisasi akun ini belum bisa dibuktikan dari participant, registrasi, atau domain governance.";
  } else if (isStrictOrganizationRole && !hasTrustedOrganizationEvidence) {
    blockingReason = "Organisasi akun ini belum punya bukti binding yang tepercaya.";
  } else if (isStrictOrganizationRole && !selectionMatches) {
    blockingReason = "Organisasi yang dipilih tidak terhubung ke akun ini.";
  } else if (role !== "SUPER_ADMIN" && !trustedResolvedOrganization?.organization_name) {
    blockingReason =
      "Organisasi akun ini belum terbaca. Pastikan binding participant dan governance organization sudah ada.";
  }

  return {
    organizationId: trustedResolvedOrganization?.organization_id ?? selectedOrganizationId,
    organizationName:
      trustedResolvedOrganization?.organization_name ??
      selectedOrganization?.name ??
      participantName,
    participantId: role === "SUPER_ADMIN" ? null : participantId,
    binding,
    blockingReason,
  };
};

