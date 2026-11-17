import { SignJWT, jwtVerify } from "jose";

export type SessionData = { id: number; name: string; role: string };
export const SESSION_COOKIE = "dn_session";

function key() {
  return new TextEncoder().encode(process.env.SESSION_SECRET || "dev-secret-dokternotebook-please-change");
}

export async function signSession(data: SessionData) {
  return new SignJWT({ ...data })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(key());
}

export async function verifySession(token?: string): Promise<SessionData | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, key());
    return { id: Number(payload.id), name: String(payload.name), role: String(payload.role) };
  } catch {
    return null;
  }
}
