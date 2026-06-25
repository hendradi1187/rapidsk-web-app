import { organizationsApi } from "@/api/services/governance";
import { type RegistrationItem } from "@/api/services/onboarding";
import { contractsApi } from "@/api/services/policy-contract";
import { providersApi } from "@/api/services/providers";
import { DOMAINS } from "@/lib/fulfillment";

type ProviderCandidate = {
  provider_id: string;
  provider_name: string;
  organization_type?: string;
};

type GovernanceOrganization = {
  organization_id: string;
  organization_name: string;
};

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

export const isConsumerCandidate = (provider: ProviderCandidate) => {
  const type = (provider.organization_type ?? "").toUpperCase();
  const name = normalize(provider.provider_name);

  return (
    type.startsWith("GOV") ||
    type.includes("CONSUMER") ||
    type.includes("REGULATOR") ||
    name.includes("skkmigas") ||
    name.includes("skkmiga") ||
    name.includes("regulator") ||
    name.includes("otoritas")
  );
};

export const rankConsumerCandidate = (provider: ProviderCandidate) => {
  const type = (provider.organization_type ?? "").toUpperCase();
  const name = normalize(provider.provider_name);

  if (name.includes("skkmigas")) return 100;
  if (type === "GOV_CENTRAL") return 90;
  if (type.startsWith("GOV")) return 80;
  if (type.includes("CONSUMER")) return 70;
  if (type.includes("REGULATOR")) return 60;
  if (name.includes("regulator")) return 50;
  if (name.includes("otoritas")) return 40;
  return 0;
};

export const selectConsumerParticipant = (
  items: ProviderCandidate[],
  preferredOrganizationName?: string | null,
): ProviderCandidate | null => {
  if (items.length === 0) return null;

  const sorted = [...items].sort((left, right) => rankConsumerCandidate(right) - rankConsumerCandidate(left));
  const byRule = sorted.find(isConsumerCandidate);
  if (byRule) return byRule;

  const preferredKey = normalize(preferredOrganizationName);
  if (preferredKey) {
    const byPreferredName = sorted.find((item) => normalize(item.provider_name) === preferredKey);
    if (byPreferredName) return byPreferredName;
  }

  const firstAuthority = sorted.find((item) => (item.organization_type ?? "").toUpperCase() !== "ENTERPRISE");
  if (firstAuthority) return firstAuthority;

  return sorted[0] ?? null;
};

const parseGovernanceReference = (note?: string | null) => {
  const match = (note ?? "").match(/Referensi organisasi governance:\s*(.+?)\s*\(([0-9a-f-]{36})\)/i);
  if (!match) return null;
  return {
    organization_name: match[1].trim(),
    organization_id: match[2].trim(),
  };
};

export const resolveGovernanceOrganization = async (
  registration: Pick<RegistrationItem, "organization_name" | "note">,
): Promise<GovernanceOrganization> => {
  const existingOrgs = await organizationsApi.list();
  const noteReference = parseGovernanceReference(registration.note);

  if (noteReference) {
    const byId = existingOrgs.find((item) => item.organization_id === noteReference.organization_id);
    if (byId) return byId;
  }

  const byName = existingOrgs.find(
    (item) => normalize(item.organization_name) === normalize(registration.organization_name),
  );
  if (byName) return byName;

  return organizationsApi.create({
    organization_name: registration.organization_name,
    code: registration.organization_name.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 20),
    description: `Organisasi ${registration.organization_name} — dibuat otomatis saat approve registrasi`,
  });
};

export const bindParticipantToOrganizationDomains = async (
  participantId: string,
  organizationId: string,
): Promise<string[]> => {
  const domains = await organizationsApi.listDomains(organizationId);
  const domainIds = domains.map((domain) => domain.domain_id).filter(Boolean);

  if (domainIds.length === 0) return [];

  const existingLinks = await providersApi.listDomains(participantId).catch(() => []);
  const assigned = new Set((existingLinks ?? []).map((item: any) => item.domain_id).filter(Boolean));

  await Promise.allSettled(
    domainIds
      .filter((domainId) => !assigned.has(domainId))
      .map((domainId) => providersApi.addDomain(participantId, { domain_id: domainId })),
  );

  try {
    localStorage.setItem(`participant_org_binding:${participantId}`, organizationId);
  } catch {
    // ignore storage issue
  }

  return domainIds;
};

export const issueAutoObligationContracts = async ({
  domainIds,
  consumerId,
  providerId,
  providerName,
}: {
  domainIds: string[];
  consumerId: string;
  providerId: string;
  providerName: string;
}): Promise<{ created: number; skipped: number }> => {
  let created = 0;
  let skipped = 0;

  for (const domainId of domainIds) {
    const existingContracts = await contractsApi.list(domainId).catch(() => []);
    for (const domain of DOMAINS) {
      const contractName = `[${domain.label}] Kewajiban Data — ${providerName}`;
      const alreadyExists = existingContracts.some(
        (item) => item.provider_id === providerId && normalize(item.name) === normalize(contractName),
      );
      if (alreadyExists) {
        skipped += 1;
        continue;
      }

      await contractsApi.create(domainId, {
        consumer_id: consumerId,
        provider_id: providerId,
        name: contractName,
        description: `Kewajiban penyediaan data ${domain.label} (${domain.sub}) sesuai Juknis SKK Migas.`,
      });
      created += 1;
    }
  }

  return { created, skipped };
};
