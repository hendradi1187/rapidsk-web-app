import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { useAuth } from "@/context/AuthContext";
import { organizationsApi } from "@/api/services/governance";
import { getActiveDomainId, setActiveDomainId } from "@/lib/domain";

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

/**
 * Resolusi governance domain aktif: organisasi pertama → domain pertama.
 * Disimpan ke localStorage (dipakai service domain-scoped GX-Space).
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
        const firstOrg = (orgs as Array<{ organization_id: string }>)[0];
        if (!firstOrg) {
          if (!cancelled) setReady(true);
          return;
        }
        const domains = await organizationsApi.listDomains(firstOrg.organization_id);
        const first = domains[0];
        if (!cancelled) {
          if (first) {
            setDomainId(first.domain_id);
            setDomainName(first.domain_name);
            setActiveDomainId(first.domain_id);
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
