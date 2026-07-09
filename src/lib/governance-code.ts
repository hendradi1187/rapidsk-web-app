const normalizeGovernanceCode = (value: string) =>
  value
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, "_")
    .replace(/_{2,}/g, "_")
    .replace(/-{2,}/g, "-")
    .replace(/^[_-]+|[_-]+$/g, "")
    .slice(0, 20);

export const sanitizeGovernanceCode = (value: string) =>
  normalizeGovernanceCode(value);

export const isValidGovernanceCode = (value: string) =>
  /^[A-Z0-9_-]{2,20}$/.test(value);
