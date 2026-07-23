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
  const overlapCountOf = (organization: TOrg) => {
    const organizationDomainIds = domainMap.get(organization.organization_id) ?? new Set<string>();
    return Array.from(organizationDomainIds).filter((domainId) => participantDomainSet.has(domainId)).length;
  };
  const overlapping = organizations
    .map((organization) => ({ organization, overlapCount: overlapCountOf(organization) }))
    .filter((item) => item.overlapCount > 0)
    .sort((left, right) => right.overlapCount - left.overlapCount);

  const candidates = overlapping.map((item) => item.organization);

  // Urutan prioritas SENGAJA: id/nama eksplisit dicek dulu ke SEMUA organisasi (bukan
  // cuma yang domain-nya overlap) sebelum jatuh ke heuristik domain-overlap. Kalau
  // dibalik (domain-overlap dicek duluan), consumer yang cross-organisasi (mis. SKK
  // Migas yang di-bind ke domain milik KKKS lain) akan salah ke-resolve jadi organisasi
  // PEMILIK domain itu, bukan organisasi participant itu sendiri — karena organisasi
  // consumer sendiri sering tidak punya domain apa pun untuk di-overlap-kan.
  if (preferredOrganizationId) {
    const preferredById = organizations.find((organization) => organization.organization_id === preferredOrganizationId);
    if (preferredById) {
      return {
        organization: preferredById,
        matchedBy: "preferred_org",
        overlapCount: overlapCountOf(preferredById),
        candidates,
      };
    }
  }

  if (normalizedParticipantName) {
    const participantNameMatch = organizations.find(
      (organization) => normalizeBindingKey(organization.organization_name) === normalizedParticipantName,
    );
    if (participantNameMatch) {
      return {
        organization: participantNameMatch,
        matchedBy: "participant_name",
        overlapCount: overlapCountOf(participantNameMatch),
        candidates,
      };
    }
  }

  if (normalizedPreferredName) {
    const preferredByName = organizations.find(
      (organization) => normalizeBindingKey(organization.organization_name) === normalizedPreferredName,
    );
    if (preferredByName) {
      return {
        organization: preferredByName,
        matchedBy: "preferred_name",
        overlapCount: overlapCountOf(preferredByName),
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

  // Catatan: preferredOrganizationId/participantName/preferredName sudah dicek di atas
  // terhadap SEMUA organisasi, jadi tidak perlu fallback id/nama lagi di sini.
  return {
    organization: null,
    matchedBy: "none",
    overlapCount: 0,
    candidates,
  };
};
