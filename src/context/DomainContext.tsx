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
import { resolveGovernanceOrganizationBinding } from "@/lib/governance-binding";

export interface AvailableDomain {
  domain_id: string;
  domain_name: string;
  code?: string;
}

export type DomainSource = "participant_binding" | "governance_fallback" | "none";

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

/**
 * Resolusi governance domain aktif: preferred organization yang dipilih user
 * saat login → domain pertama pada organization tersebut. Fallback ke org
 * pertama bila pilihan user belum cocok dengan data governance.
 * SUPER_ADMIN / ADMIN bisa switch domain lewat switchDomain().
 */
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
      setReady(false);
      return;
    }
    (async () => {
      try {
        const orgs = await organizationsApi.list();
        const items = orgs as Array<{
          organization_id: string;
          organization_name: string;
        }>;
        if (items.length === 0) {
          if (!cancelled) {
            setAvailableDomains([]);
            setDomainSource("none");
            setActiveOrganizationId(null);
            setActiveOrganizationName(null);
            setParticipantDomainCount(0);
            setReady(true);
          }
          return;
        }

        const preferredOrgId = getPreferredOrganizationId();
        const preferredOrgName = getPreferredOrganizationName();
        const storedParticipantOrganizationId = participantId
          ? getStoredParticipantOrganizationId(participantId)
          : null;
        let participantDomainIds: string[] = [];
        const participantDetail = participantId
          ? await providersApi.getById(participantId).catch(() => null)
          : null;
        if (participantId) {
          try {
            const pDomains = await providersApi.listDomains(participantId);
            participantDomainIds = (pDomains as Array<{ domain_id: string; status?: string }>)
              .filter((d) => !d.status || String(d.status).toUpperCase() === "ACTIVE")
              .map((d) => d.domain_id);
          } catch { /* fallback ke domain org */ }
        }

        const organizationDomainsById =
          participantDomainIds.length > 0
            ? await organizationsApi.listDomainsMap(items.map((org) => org.organization_id))
            : {};
        const binding = resolveGovernanceOrganizationBinding({
          organizations: items,
          domainsByOrganizationId: organizationDomainsById,
          participantDomainIds,
          participantName: String(
            participantDetail?.organization_name ??
              participantDetail?.provider_name ??
              "",
          ).trim(),
          preferredOrganizationId: storedParticipantOrganizationId ?? preferredOrgId,
          preferredOrganizationName: preferredOrgName,
        });
        const chosenOrg =
          binding.organization ??
          (role === "SUPER_ADMIN"
            ? items.find((org) => org.organization_id === preferredOrgId) ?? items[0] ?? null
            : null);

        if (!chosenOrg) {
          if (!cancelled) {
            setAvailableDomains([]);
            setDomainId(null);
            setDomainName(null);
            setDomainSource("none");
            setActiveOrganizationId(null);
            setActiveOrganizationName(null);
            setParticipantDomainCount(participantDomainIds.length);
            setActiveDomainId(null);
            setReady(true);
          }
          return;
        }

        const domains =
          participantDomainIds.length > 0
            ? ((organizationDomainsById[chosenOrg.organization_id] ?? []) as AvailableDomain[])
            : ((await organizationsApi.listDomains(chosenOrg.organization_id)) as AvailableDomain[]);

        if (!cancelled) {
          setPreferredOrganization(chosenOrg.organization_id, chosenOrg.organization_name);
          setAvailableDomains(domains);
          setDomainSource(participantDomainIds.length > 0 ? "participant_binding" : "governance_fallback");
          setActiveOrganizationId(chosenOrg.organization_id);
          setActiveOrganizationName(chosenOrg.organization_name);
          setParticipantDomainCount(participantDomainIds.length);

          const persistedId = getActiveDomainId();
          const persisted = persistedId ? domains.find((d) => d.domain_id === persistedId) : null;
          const participantDomain = participantDomainIds.length
            ? domains.find((d) => participantDomainIds.includes(d.domain_id))
            : null;
          const target = participantDomain ?? persisted ?? domains[0] ?? null;

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
      } catch {
        if (!cancelled) {
          setDomainSource("none");
          setActiveOrganizationId(null);
          setActiveOrganizationName(null);
          setParticipantDomainCount(0);
          setReady(true);
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
