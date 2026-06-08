// Decode JWT payload (tanpa verifikasi tanda tangan — hanya untuk membaca klaim di FE).
// access_token GX-Space memuat: sub, username, email, category{id,code},
// group{id,code}, is_superadmin, exp, iat.

export interface GxJwtClaims {
  sub?: string;
  username?: string;
  email?: string;
  category?: { id?: string; code?: string };
  group?: { id?: string; code?: string };
  is_superadmin?: boolean;
  /** ID participant (metadata-participant) yang ditautkan ke user — dipakai untuk
   *  mengenali "saya provider/consumer yang mana" pada kontrak. null bila superadmin. */
  participant_id?: string | null;
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export function decodeJwt(token: string): GxJwtClaims | null {
  try {
    const payload = token.split(".")[1];
    if (!payload) return null;
    // base64url → base64
    const b64 = payload.replace(/-/g, "+").replace(/_/g, "/");
    const json = decodeURIComponent(
      atob(b64)
        .split("")
        .map((c) => "%" + ("00" + c.charCodeAt(0).toString(16)).slice(-2))
        .join(""),
    );
    return JSON.parse(json) as GxJwtClaims;
  } catch {
    return null;
  }
}
