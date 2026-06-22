import { createContext, useContext, useMemo, useState } from "react";
import {
  getRuntimeBootstrapState,
  setRuntimeBootstrapState,
  type LicenseState,
  type RuntimeBootstrapState,
  type RuntimeConfig,
  type SetupStatus,
} from "@/lib/runtime-config";
import { runtimeApi } from "@/api/services/runtime";

interface RuntimeContextValue {
  ready: boolean;
  source: RuntimeBootstrapState["source"];
  setupStatus: SetupStatus;
  runtimeConfig: RuntimeConfig | null;
  licenseState: LicenseState | null;
  refreshRuntime: () => Promise<RuntimeBootstrapState>;
  setBootstrapState: (state: RuntimeBootstrapState) => void;
}

const RuntimeContext = createContext<RuntimeContextValue | null>(null);

export const RuntimeProvider = ({ children }: { children: React.ReactNode }) => {
  const [state, setState] = useState<RuntimeBootstrapState>(() => getRuntimeBootstrapState());

  const refreshRuntime = async () => {
    const next = await runtimeApi.getBootstrapState();
    setRuntimeBootstrapState(next);
    setState(next);
    return next;
  };

  const setBootstrapState = (next: RuntimeBootstrapState) => {
    setRuntimeBootstrapState(next);
    setState(next);
  };

  const value = useMemo<RuntimeContextValue>(
    () => ({
      ready: state.ready,
      source: state.source,
      setupStatus: state.setupStatus,
      runtimeConfig: state.runtimeConfig,
      licenseState: state.licenseState,
      refreshRuntime,
      setBootstrapState,
    }),
    [state],
  );

  return <RuntimeContext.Provider value={value}>{children}</RuntimeContext.Provider>;
};

export const useRuntime = (): RuntimeContextValue => {
  const context = useContext(RuntimeContext);
  if (!context) throw new Error("useRuntime must be used within RuntimeProvider");
  return context;
};
