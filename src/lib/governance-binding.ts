export interface GovernanceOrganizationLike {
  organization_id: string;
  organization_name: string;
}

export interface GovernanceDomainLike {
  domain_id: string;
}

export interface ResolvedGovernanceBinding<TOrg extends GovernanceOrganizationLike> {
  organization: TOrg | null;
  matchedBy: "participant_domains" | "preferred_org" | "participant_name" | "preferred_name" | "none";
  overlapCount: number;
  candidates: TOrg[];
}

export const normalizeBindingKey = (value: string | null | undefined) =>
  String(value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const buildOrganizationDomainMap = <TOrg extends GovernanceOrganizationLike>(
  organizations: TOrg[],
  domainsByOrganizationId: Record<string, GovernanceDomainLike[]>,
) => {
  const map = new Map<string, Set<string>>();

  organizations.forEach((organization) => {
    const domainIds = (domainsByOrganizationId[organization.organization_id] ?? [])
      .map((domain) => String(domain.domain_id ?? "").trim())
      .filter(Boolean);
    map.set(organization.organization_id, new Set(domainIds));
  });

  return map;
};

export const resolveGovernanceOrganizationBinding = <TOrg extends GovernanceOrganizationLike>({
  organizations,
  domainsByOrganizationId,
  participantDomainIds,
  participantName,
  preferredOrganizationId,
  preferredOrganizationName,
}: {
  organizations: TOrg[];
  domainsByOrganizationId: Record<string, GovernanceDomainLike[]>;
  participantDomainIds: string[];
  participantName?: string | null;
  preferredOrganizationId?: string | null;
  preferredOrganizationName?: string | null;
}): ResolvedGovernanceBinding<TOrg> => {
  const normalizedParticipantName = normalizeBindingKey(participantName);
  const normalizedPreferredName = normalizeBindingKey(preferredOrganizationName);
  const participantDomainSet = new Set(
    participantDomainIds.map((domainId) => String(domainId ?? "").trim()).filter(Boolean),
  );

  const domainMap = buildOrganizationDomainMap(organizations, domainsByOrganizationId);
  const overlapping = organizations
    .map((organization) => {
      const organizationDomainIds = domainMap.get(organization.organization_id) ?? new Set<string>();
      const overlapCount = Array.from(organizationDomainIds).filter((domainId) => participantDomainSet.has(domainId)).length;
      return { organization, overlapCount };
    })
    .filter((item) => item.overlapCount > 0)
    .sort((left, right) => right.overlapCount - left.overlapCount);

  const candidates = overlapping.map((item) => item.organization);

  if (preferredOrganizationId) {
    const preferredById = overlapping.find((item) => item.organization.organization_id === preferredOrganizationId);
    if (preferredById) {
      return {
        organization: preferredById.organization,
        matchedBy: "preferred_org",
        overlapCount: preferredById.overlapCount,
        candidates,
      };
    }
  }

  if (normalizedPreferredName) {
    const preferredByName = overlapping.find(
      (item) => normalizeBindingKey(item.organization.organization_name) === normalizedPreferredName,
    );
    if (preferredByName) {
      return {
        organization: preferredByName.organization,
        matchedBy: "preferred_name",
        overlapCount: preferredByName.overlapCount,
        candidates,
      };
    }
  }

  if (normalizedParticipantName) {
    const participantNameMatch = overlapping.find(
      (item) => normalizeBindingKey(item.organization.organization_name) === normalizedParticipantName,
    );
    if (participantNameMatch) {
      return {
        organization: participantNameMatch.organization,
        matchedBy: "participant_name",
        overlapCount: participantNameMatch.overlapCount,
        candidates,
      };
    }
  }

  if (overlapping.length === 1) {
    return {
      organization: overlapping[0].organization,
      matchedBy: "participant_domains",
      overlapCount: overlapping[0].overlapCount,
      candidates,
    };
  }

  if (overlapping.length > 1) {
    const strongest = overlapping[0];
    const second = overlapping[1];
    if (strongest.overlapCount > second.overlapCount) {
      return {
        organization: strongest.organization,
        matchedBy: "participant_domains",
        overlapCount: strongest.overlapCount,
        candidates,
      };
    }
  }

  const fallbackById =
    preferredOrganizationId
      ? organizations.find((organization) => organization.organization_id === preferredOrganizationId) ?? null
      : null;
  if (fallbackById) {
    return {
      organization: fallbackById,
      matchedBy: "preferred_org",
      overlapCount: 0,
      candidates,
    };
  }

  const fallbackByName =
    organizations.find(
      (organization) =>
        normalizeBindingKey(organization.organization_name) === normalizedParticipantName ||
        normalizeBindingKey(organization.organization_name) === normalizedPreferredName,
    ) ?? null;

  if (fallbackByName) {
    return {
      organization: fallbackByName,
      matchedBy:
        normalizeBindingKey(fallbackByName.organization_name) === normalizedParticipantName
          ? "participant_name"
          : "preferred_name",
      overlapCount: 0,
      candidates,
    };
  }

  return {
    organization: null,
    matchedBy: "none",
    overlapCount: 0,
    candidates,
  };
};
