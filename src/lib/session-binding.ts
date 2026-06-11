const ORG_ID_KEY = "preferred_organization_id";
const ORG_NAME_KEY = "preferred_organization_name";
const PARTICIPANT_ID_KEY = "preferred_participant_id";

const read = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

const write = (key: string, value: string | null): void => {
  try {
    if (value) localStorage.setItem(key, value);
    else localStorage.removeItem(key);
  } catch {
    // ignore storage issues
  }
};

export const getPreferredOrganizationId = (): string | null => read(ORG_ID_KEY);

export const getPreferredOrganizationName = (): string | null => read(ORG_NAME_KEY);

export const setPreferredOrganization = (
  organizationId: string | null,
  organizationName: string | null,
): void => {
  write(ORG_ID_KEY, organizationId);
  write(ORG_NAME_KEY, organizationName);
};

export const getPreferredParticipantId = (): string | null => read(PARTICIPANT_ID_KEY);

export const setPreferredParticipantId = (participantId: string | null): void => {
  write(PARTICIPANT_ID_KEY, participantId);
};

export const clearSessionBinding = (): void => {
  write(ORG_ID_KEY, null);
  write(ORG_NAME_KEY, null);
  write(PARTICIPANT_ID_KEY, null);
};
