import type { AppRole } from "@/context/AuthContext";

export const DATASPACE_UI_VERSION_KEY = "dataspace_ui_version";

export const isDataspaceV2Enabled = (): boolean => {
  if (typeof window === "undefined") return true;
  const storedVersion = localStorage.getItem(DATASPACE_UI_VERSION_KEY);
  return storedVersion !== "v1";
};

export const setDataspaceV2Enabled = (enabled: boolean) => {
  if (enabled) {
    localStorage.setItem(DATASPACE_UI_VERSION_KEY, "v2");
  } else {
    localStorage.removeItem(DATASPACE_UI_VERSION_KEY);
  }
};

export const getDefaultV2RouteForRole = (role: AppRole): string => {
  switch (role) {
    case "SUPER_ADMIN":
    case "ADMIN":
      return "/v2/authority/dashboard";
    case "CONSUMER":
      return "/v2/admin-consumer/dashboard";
    case "PROVIDER":
      return "/v2/admin-provider/dashboard";
    default:
      return "/";
  }
};
