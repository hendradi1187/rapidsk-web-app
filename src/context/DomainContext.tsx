import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { organizationsApi } from "@/api/services/governance";
import { getActiveDomainId, setActiveDomainId } from "@/lib/domain";
import {
  getPreferredOrganizationId,
  getPreferredOrganizationName,
  setPreferredOrganization,
} from "@/lib/session-binding";

interface DomainContextValue {
  domainId: string | null;
  domainName: string | null;
  ready: boolean;
}

const DomainContext = createContext<DomainContextValue>({
  domainId: null,
  domainName: null,
  ready: false,
});

const normalize = (value: string | null | undefined) =>
  (value ?? "").toLowerCase().replace(/[^a-z0-9]/g, "");

/**
 * Resolusi governance domain aktif: preferred organization yang dipilih user
 * saat login → domain pertama pada organization tersebut. Fallback ke org
 * pertama bila pilihan user belum cocok dengan data governance.
 */
export const DomainProvider = ({ children }: { children: ReactNode }) => {
  const { isAuthenticated } = useAuth();
  const [domainId, setDomainId] = useState<string | null>(getActiveDomainId());
  const [domainName, setDomainName] = useState<string | null>(null);
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
          if (!cancelled) setReady(true);
          return;
        }

        const preferredOrgId = getPreferredOrganizationId();
        const preferredOrgName = getPreferredOrganizationName();
        const chosenOrg =
          items.find((org) => org.organization_id === preferredOrgId) ??
          items.find((org) => normalize(org.organization_name) === normalize(preferredOrgName)) ??
          items[0];

        const domains = await organizationsApi.listDomains(chosenOrg.organization_id);
        const first = domains[0] ?? null;
        if (!cancelled) {
          setPreferredOrganization(chosenOrg.organization_id, chosenOrg.organization_name);
          if (first) {
            setDomainId(first.domain_id);
            setDomainName(first.domain_name);
            setActiveDomainId(first.domain_id);
          } else {
            setDomainId(null);
            setDomainName(null);
            setActiveDomainId(null);
          }
          setReady(true);
        }
      } catch {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated]);

  return (
    <DomainContext.Provider value={{ domainId, domainName, ready }}>
      {children}
    </DomainContext.Provider>
  );
};

export const useDomain = (): DomainContextValue => useContext(DomainContext);
