const participantOrganizationBindingKey = (participantId: string) =>
  `participant_org_binding:${participantId}`;

export const getParticipantOrganizationBindingKey = (participantId: string) =>
  participantOrganizationBindingKey(participantId);

export const getStoredParticipantOrganizationId = (participantId: string): string | null => {
  if (!participantId || typeof window === "undefined") return null;
  try {
    return localStorage.getItem(participantOrganizationBindingKey(participantId));
  } catch {
    return null;
  }
};

export const setStoredParticipantOrganizationId = (
  participantId: string,
  organizationId: string | null,
): void => {
  if (!participantId || typeof window === "undefined") return;
  try {
    if (organizationId) {
      localStorage.setItem(participantOrganizationBindingKey(participantId), organizationId);
      return;
    }
    localStorage.removeItem(participantOrganizationBindingKey(participantId));
  } catch {
    // abaikan error storage
  }
};
