import apiClient from "../client";

export type LoginResponse = {
  access_token: string;
  token_type: string; // "bearer"
  user: {
    id: string;
    email: string;
    full_name: string;
    category?: any;
    group?: any;
    created_at?: string;
    updated_at?: string;
  };
};

const BASE_PATH1 = "/api/v1/identity-provider/auth/login";
const BASE_PATH2 = "/api/v1/identity-provider/auth/external-login";
const BASE_PATH3 = "/api/v1/identity-provider/auth/validate";

export async function login(username: string, password: string) {
  const { data } = await apiClient.post<LoginResponse>(
    BASE_PATH1,
    { username, password }
  );
  return data;
}

export function logout() {
  localStorage.removeItem("auth_token");
  localStorage.removeItem("auth_user");

  // biar clean (react-query, state, dll reset)
  window.location.href = "/login";
}

export async function externalLogin(token: string) {
  const { data } = await apiClient.post<LoginResponse>(
    BASE_PATH2,
    { token, provider_name: "KEYCLOAK" }
  );
  return data;
}
export async function validateToken(token: string) {
  const { data } = await apiClient.post(
    BASE_PATH3,
    null,
    {
      params: { token },
    }
  );
  return data;
}
export function setSession(res: LoginResponse) {
  localStorage.setItem("auth_token", res.access_token);
  localStorage.setItem("auth_user", JSON.stringify(res.user));
}