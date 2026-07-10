let preferredOrganizationId: string | null = null;
let preferredOrganizationName: string | null = null;
let preferredParticipantId: string | null = null;

export const getPreferredOrganizationId = (): string | null =>
  preferredOrganizationId;

export const getPreferredOrganizationName = (): string | null =>
  preferredOrganizationName;

export const setPreferredOrganization = (
  organizationId: string | null,
  organizationName: string | null,
): void => {
  preferredOrganizationId = organizationId;
  preferredOrganizationName = organizationName;
};

export const getPreferredParticipantId = (): string | null =>
  preferredParticipantId;

export const setPreferredParticipantId = (participantId: string | null): void => {
  preferredParticipantId = participantId;
};

export const clearSessionBinding = (): void => {
  preferredOrganizationId = null;
  preferredOrganizationName = null;
  preferredParticipantId = null;
};
