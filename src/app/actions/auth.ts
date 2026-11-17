"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { login, logout } from "@/lib/auth";

export async function loginAction(_: unknown, fd: FormData) {
  const username = String(fd.get("username") || "").trim().toLowerCase();
  const password = String(fd.get("password") || "");
  const u = await prisma.user.findUnique({ where: { username } });
  if (!u || !u.active || !(await bcrypt.compare(password, u.passwordHash))) {
    return { error: "Username atau password salah" };
  }
  await login({ id: u.id, name: u.name, role: u.role });
  redirect("/");
}

export async function logoutAction() {
  await logout();
  redirect("/login");
}
