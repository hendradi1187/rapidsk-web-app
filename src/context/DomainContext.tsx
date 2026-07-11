import { createContext, useContext, useEffect, useState, useCallback, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { organizationsApi } from "@/api/services/governance";
import { providersApi } from "@/api/services/providers";
import { getActiveDomainId, setActiveDomainId } from "@/lib/domain";
import {
  getPreferredOrganizationId,
  getPreferredOrganizationName,
  setPreferredOrganization,
} from "@/lib/session-binding";
import { getStoredParticipantOrganizationId } from "@/lib/participant-org-binding";
import {
  normalizeBindingKey,
  resolveGovernanceOrganizationBinding,
} from "@/lib/governance-binding";

export interface AvailableDomain {
  domain_id: string;
  domain_name: string;
  code?: string;
}

export type DomainSource =
  | "participant_binding"
  | "governance_fallback"
  | "none";

interface DomainContextValue {
  domainId: string | null;
  domainName: string | null;
  ready: boolean;
  availableDomains: AvailableDomain[];
  domainSource: DomainSource;
  activeOrganizationId: string | null;
  activeOrganizationName: string | null;
  participantDomainCount: number;
  switchDomain: (domain: AvailableDomain) => void;
}

const DomainContext = createContext<DomainContextValue>({
  domainId: null,
  domainName: null,
  ready: false,
  availableDomains: [],
  domainSource: "none",
  activeOrganizationId: null,
  activeOrganizationName: null,
  participantDomainCount: 0,
  switchDomain: () => {},
});

const GOVERNANCE_FALLBACK_ROLES = new Set(["SUPER_ADMIN"]);

type ParticipantDomainBinding = {
  domain_id?: string;
  domain_name?: string;
  code?: string;
  status?: string;
};

const dedupeDomains = (domains: AvailableDomain[]): AvailableDomain[] => {
  const seen = new Set<string>();
  return domains.filter((domain) => {
    const id = String(domain.domain_id ?? "").trim();
    if (!id || seen.has(id)) return false;
    seen.add(id);
    return true;
  });
};

const directParticipantDomains = (
  participantDomains: ParticipantDomainBinding[],
): AvailableDomain[] => {
  return dedupeDomains(
    participantDomains
      .filter((domain) => !domain.status || String(domain.status).toUpperCase() === "ACTIVE")
      .map((domain) => {
        const domainId = String(domain.domain_id ?? "").trim();
        const domainName = String(domain.domain_name ?? domainId).trim() || domainId;
        return {
          domain_id: domainId,
          domain_name: domainName,
          code: domain.code,
        };
      })
      .filter((domain) => Boolean(domain.domain_id)),
  );
};

const mapParticipantBoundDomains = (
  participantDomains: ParticipantDomainBinding[],
  organizationDomainsById: Record<string, AvailableDomain[]>,
): AvailableDomain[] => {
  const metadataById = new Map<string, AvailableDomain>();

  Object.values(organizationDomainsById)
    .flat()
    .forEach((domain) => {
      const id = String(domain.domain_id ?? "").trim();
      if (!id) return;
      metadataById.set(id, domain);
    });

  const mergedDomains = dedupeDomains(
    participantDomains
      .filter((domain) => !domain.status || String(domain.status).toUpperCase() === "ACTIVE")
      .map((domain) => {
        const domainId = String(domain.domain_id ?? "").trim();
        const metadata = metadataById.get(domainId);
        return {
          domain_id: domainId,
          domain_name:
            String(metadata?.domain_name ?? domain.domain_name ?? domainId).trim() || domainId,
          code: metadata?.code ?? domain.code,
        };
      })
      .filter((domain) => Boolean(domain.domain_id)),
  );

  return mergedDomains.length > 0 ? mergedDomains : directParticipantDomains(participantDomains);
};

const applyEmptyDomainState = (
  setAvailableDomains: React.Dispatch<React.SetStateAction<AvailableDomain[]>>,
  setDomainIdState: React.Dispatch<React.SetStateAction<string | null>>,
  setDomainName: React.Dispatch<React.SetStateAction<string | null>>,
  setDomainSource: React.Dispatch<React.SetStateAction<DomainSource>>,
  setActiveOrganizationId: React.Dispatch<React.SetStateAction<string | null>>,
  setActiveOrganizationName: React.Dispatch<React.SetStateAction<string | null>>,
  setParticipantDomainCount: React.Dispatch<React.SetStateAction<number>>,
  setReady: React.Dispatch<React.SetStateAction<boolean>>,
) => {
  setAvailableDomains([]);
  setDomainIdState(null);
  setDomainName(null);
  setDomainSource("none");
  setActiveOrganizationId(null);
  setActiveOrganizationName(null);
  setParticipantDomainCount(0);
  setActiveDomainId(null);
  setReady(true);
};

export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated, role, participantId } = useAuth();
  const [domainId, setDomainId] = useState<string | null>(getActiveDomainId());
  const [domainName, setDomainName] = useState<string | null>(null);
  const [availableDomains, setAvailableDomains] = useState<AvailableDomain[]>([]);
  const [domainSource, setDomainSource] = useState<DomainSource>("none");
  const [activeOrganizationId, setActiveOrganizationId] = useState<string | null>(null);
  const [activeOrganizationName, setActiveOrganizationName] = useState<string | null>(null);
  const [participantDomainCount, setParticipantDomainCount] = useState(0);
  const [ready, setReady] = useState<boolean>(false);

  useEffect(() => {
    let cancelled = false;

    if (!isAuthenticated) {
      setAvailableDomains([]);
      setDomainId(null);
      setDomainName(null);
      setDomainSource("none");
      setActiveOrganizationId(null);
      setActiveOrganizationName(null);
      setParticipantDomainCount(0);
      setReady(false);
      return;
    }

    setReady(false);

    (async () => {
      try {
        const preferredOrgId = getPreferredOrganizationId();
        const preferredOrgName = getPreferredOrganizationName();
        const storedParticipantOrganizationId = participantId
          ? getStoredParticipantOrganizationId(participantId)
          : null;
        const roleAllowsFallback = GOVERNANCE_FALLBACK_ROLES.has(role ?? "");

        const participantDetail = participantId
          ? await providersApi.getById(participantId).catch(() => null)
          : null;
        const participantDomainsRaw = participantId
          ? await providersApi
              .listDomains(participantId)
              .catch(() => [] as ParticipantDomainBinding[])
          : [];

        const participantDomainIds = participantDomainsRaw
          .filter((domain) => !domain.status || String(domain.status).toUpperCase() === "ACTIVE")
          .map((domain) => String(domain.domain_id ?? "").trim())
          .filter(Boolean);

        const hasParticipantBinding = participantDomainIds.length > 0;

        let organizations: Array<{
          organization_id: string;
          organization_name: string;
        }> = [];
        try {
          organizations = (await organizationsApi.list()) as Array<{
            organization_id: string;
            organization_name: string;
          }>;
        } catch (error) {
          if (import.meta.env.DEV) {
            console.warn("[DomainContext] organizationsApi.list() gagal:", error);
          }
        }

        let organizationDomainsById: Record<string, AvailableDomain[]> = {};
        if (organizations.length > 0) {
          organizationDomainsById = await organizationsApi.listDomainsMap(
            organizations.map((organization) => organization.organization_id),
          );
        }

        if (participantId && !hasParticipantBinding && !roleAllowsFallback) {
          if (!cancelled) {
            applyEmptyDomainState(
              setAvailableDomains,
              setDomainId,
              setDomainName,
              setDomainSource,
              setActiveOrganizationId,
              setActiveOrganizationName,
              setParticipantDomainCount,
              setReady,
            );
          }
          return;
        }

        const binding = organizations.length > 0
          ? resolveGovernanceOrganizationBinding({
              organizations,
              domainsByOrganizationId: organizationDomainsById,
              participantDomainIds,
              participantName: String(
                participantDetail?.organization_name ?? participantDetail?.provider_name ?? "",
              ).trim(),
              preferredOrganizationId: storedParticipantOrganizationId ?? preferredOrgId,
              preferredOrganizationName: preferredOrgName,
            })
          : {
              organization: null,
            };

        const chosenOrg = organizations.length > 0
          ? binding.organization ??
            organizations.find((organization) => organization.organization_id === preferredOrgId) ??
            organizations.find(
              (organization) =>
                normalizeBindingKey(organization.organization_name) ===
                normalizeBindingKey(preferredOrgName),
            ) ??
            (roleAllowsFallback ? organizations[0] : null)
          : null;

        const governanceFallbackDomains = dedupeDomains(
          Object.values(organizationDomainsById).flat() as AvailableDomain[],
        );

        const resolvedDomains = hasParticipantBinding
          ? mapParticipantBoundDomains(participantDomainsRaw, organizationDomainsById)
          : governanceFallbackDomains;

        const resolvedSource: DomainSource = hasParticipantBinding
          ? "participant_binding"
          : governanceFallbackDomains.length > 0 && roleAllowsFallback
            ? "governance_fallback"
            : "none";

        if (!cancelled) {
          if (chosenOrg) {
            setPreferredOrganization(chosenOrg.organization_id, chosenOrg.organization_name);
          }

          setAvailableDomains(resolvedDomains);
          setDomainSource(resolvedSource);
          setActiveOrganizationId(
            chosenOrg?.organization_id ?? storedParticipantOrganizationId ?? preferredOrgId ?? null,
          );
          setActiveOrganizationName(
            chosenOrg?.organization_name ?? preferredOrgName ?? null,
          );
          setParticipantDomainCount(participantDomainIds.length);

          const persistedId = getActiveDomainId();
          const persisted = persistedId
            ? resolvedDomains.find((domain) => domain.domain_id === persistedId)
            : null;
          const participantDomain = hasParticipantBinding
            ? resolvedDomains.find((domain) => participantDomainIds.includes(domain.domain_id))
            : null;
          const target = persisted ?? participantDomain ?? resolvedDomains[0] ?? null;

          if (target) {
            setDomainId(target.domain_id);
            setDomainName(target.domain_name);
            setActiveDomainId(target.domain_id);
          } else {
            setDomainId(null);
            setDomainName(null);
            setActiveDomainId(null);
          }

          setReady(true);
        }
      } catch (error) {
        if (import.meta.env.DEV) {
          console.warn("[DomainContext] gagal resolve domain context:", error);
        }
        if (!cancelled) {
          applyEmptyDomainState(
            setAvailableDomains,
            setDomainId,
            setDomainName,
            setDomainSource,
            setActiveOrganizationId,
            setActiveOrganizationName,
            setParticipantDomainCount,
            setReady,
          );
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, role, participantId]);

  const switchDomain = useCallback((domain: AvailableDomain) => {
    setDomainId(domain.domain_id);
    setDomainName(domain.domain_name);
    setActiveDomainId(domain.domain_id);
  }, []);

  return (
    <DomainContext.Provider
      value={{
        domainId,
        domainName,
        ready,
        availableDomains,
        domainSource,
        activeOrganizationId,
        activeOrganizationName,
        participantDomainCount,
        switchDomain,
      }}
    >
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = (): DomainContextValue => useContext(DomainContext);
