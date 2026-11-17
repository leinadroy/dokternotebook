import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, signSession, verifySession, type SessionData } from "./session";
import { prisma } from "./db";

export async function getSession() {
  const store = await cookies();
  const s = await verifySession(store.get(SESSION_COOKIE)?.value);
  if (!s) return null;
  // pastikan user masih aktif
  const u = await prisma.user.findUnique({ where: { id: s.id } });
  if (!u || !u.active) return null;
  return { id: u.id, name: u.name, role: u.role } as SessionData;
}

export async function requireUser(roles?: string[]) {
  const s = await getSession();
  if (!s) redirect("/login");
  if (roles && !roles.includes(s.role)) redirect("/?denied=1");
  return s;
}

export async function login(data: SessionData) {
  const store = await cookies();
  store.set(SESSION_COOKIE, await signSession(data), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production" && process.env.INSECURE_COOKIE !== "1",
    path: "/",
    maxAge: 60 * 60 * 12,
  });
}

export async function logout() {
  const store = await cookies();
  store.delete(SESSION_COOKIE);
}

export const canManage = (role: string) => role === "OWNER" || role === "ADMIN";
