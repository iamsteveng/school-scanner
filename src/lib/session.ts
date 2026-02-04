export type SessionPayload = {
  sub: string;
  phone?: string;
  exp?: number;
};

export function getCookie(name: string): string | null {
  if (typeof document === "undefined") return null;
  const parts = document.cookie.split(";");
  for (const part of parts) {
    const [k, ...rest] = part.trim().split("=");
    if (k === name) {
      return decodeURIComponent(rest.join("="));
    }
  }
  return null;
}

export function getSessionToken(): string | null {
  return getCookie("ss_session");
}

function base64UrlDecode(input: string): string {
  const pad = input.length % 4;
  const padded = input + (pad ? "=".repeat(4 - pad) : "");
  const base64 = padded.replace(/-/g, "+").replace(/_/g, "/");
  return atob(base64);
}

export function decodeJwtPayload(token: string): SessionPayload | null {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const json = base64UrlDecode(parts[1]);
    return JSON.parse(json) as SessionPayload;
  } catch {
    return null;
  }
}

export function getSessionUserId(): string | null {
  const token = getSessionToken();
  if (!token) return null;
  const payload = decodeJwtPayload(token);
  return payload?.sub ?? null;
}
