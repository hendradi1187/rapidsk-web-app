import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { Loader2 } from "lucide-react";
import { getKeycloak, initKeycloak, isKeycloakConfigured } from "./keycloak";

const KeycloakLoadingScreen = () => (
  <div className="min-h-screen flex items-center justify-center bg-background">
    <div className="text-center space-y-4">
      <Loader2 className="w-8 h-8 animate-spin mx-auto text-accent" />
      <p className="text-muted-foreground text-sm">Connecting to identity provider...</p>
    </div>
  </div>
);

interface KeycloakContextValue {
  enabled: boolean;
  initialized: boolean;
  authenticated: boolean;
  tokenVersion: number;
}

const KeycloakContext = createContext<KeycloakContextValue>({
  enabled: false,
  initialized: false,
  authenticated: false,
  tokenVersion: 0,
});

interface KeycloakProviderProps {
  children: ReactNode;
}

export const KeycloakProvider = ({ children }: KeycloakProviderProps) => {
  const keycloak = getKeycloak();
  const enabled = isKeycloakConfigured();
  const [initialized, setInitialized] = useState(!enabled);
  const [authenticated, setAuthenticated] = useState(false);
  const [tokenVersion, setTokenVersion] = useState(0);

  useEffect(() => {
    if (!enabled) return;

    let cancelled = false;

    initKeycloak()
      .then((isAuth) => {
        if (cancelled) return;
        setAuthenticated(isAuth);
        setInitialized(true);
      })
      .catch((err) => {
        if (cancelled) return;
        console.error("[Keycloak] init error:", err);
        setInitialized(true);
      });

    if (keycloak) {
      keycloak.onAuthRefreshSuccess = () => {
        setTokenVersion((v) => v + 1);
      };
      keycloak.onAuthSuccess = () => {
        setAuthenticated(true);
        setTokenVersion((v) => v + 1);
      };
      keycloak.onAuthLogout = () => {
        setAuthenticated(false);
      };
    }

    return () => {
      cancelled = true;
    };
  }, [enabled, keycloak]);

  if (!initialized) return <KeycloakLoadingScreen />;

  return (
    <KeycloakContext.Provider
      value={{
        enabled,
        initialized,
        authenticated,
        tokenVersion,
      }}
    >
      {children}
    </KeycloakContext.Provider>
  );
};

export const useKeycloak = (): KeycloakContextValue => {
  return useContext(KeycloakContext);
};
