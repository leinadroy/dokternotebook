"use server";
import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => parseInt(str(fd, k).replace(/[^0-9-]/g, "") || "0", 10);

/* ---------- Sparepart ---------- */
export async function saveSparepart(fd: FormData) {
  await requireUser(["OWNER", "ADMIN"]);
  const id = num(fd, "id");
  const data = {
    sku: str(fd, "sku").toUpperCase(),
    name: str(fd, "name"),
    category: str(fd, "category") || "Lainnya",
    buyPrice: Math.max(0, num(fd, "buyPrice")),
    sellPrice: Math.max(0, num(fd, "sellPrice")),
    minStock: Math.max(0, num(fd, "minStock")),
    location: str(fd, "location") || null,
  };
  const dup = await prisma.sparepart.findFirst({ where: { sku: data.sku, NOT: id ? { id } : undefined } });
  if (dup) redirect("/sparepart?err=" + encodeURIComponent(`Kode ${data.sku} sudah dipakai`));
  if (id) {
    await prisma.sparepart.update({ where: { id }, data });
  } else {
    const stock = Math.max(0, num(fd, "stock"));
    await prisma.sparepart.create({
      data: { ...data, stock, movements: stock ? { create: { qty: stock, type: "MASUK", note: "Stok awal" } } : undefined },
    });
  }
  redirect("/sparepart?msg=" + encodeURIComponent("Sparepart disimpan"));
}

export async function adjustStock(fd: FormData) {
  await requireUser(["OWNER", "ADMIN"]);
  const id = num(fd, "id");
  const type = str(fd, "type"); // MASUK | KELUAR | PENYESUAIAN
  const qty = Math.abs(num(fd, "qty"));
  const note = str(fd, "note") || null;
  const part = await prisma.sparepart.findUniqueOrThrow({ where: { id } });
  let delta = type === "MASUK" ? qty : type === "KELUAR" ? -qty : qty - part.stock; // PENYESUAIAN = set stok jadi qty
  if (part.stock + delta < 0) delta = -part.stock;
  if (delta === 0) redirect("/sparepart");
  await prisma.$transaction([
    prisma.sparepart.update({ where: { id }, data: { stock: { increment: delta } } }),
    prisma.stockMovement.create({ data: { sparepartId: id, qty: delta, type, note } }),
  ]);
  redirect("/sparepart?msg=" + encodeURIComponent(`Stok ${part.name}: ${part.stock} → ${part.stock + delta}`));
}

export async function deleteSparepart(id: number) {
  await requireUser(["OWNER"]);
  const used = await prisma.serviceItem.count({ where: { sparepartId: id } });
  if (used) redirect("/sparepart?err=" + encodeURIComponent("Sparepart sudah pernah dipakai servis, tidak bisa dihapus"));
  await prisma.sparepart.delete({ where: { id } });
  redirect("/sparepart?msg=" + encodeURIComponent("Sparepart dihapus"));
}

/* ---------- Pengguna ---------- */
export async function saveUser(fd: FormData) {
  await requireUser(["OWNER"]);
  const id = num(fd, "id");
  const username = str(fd, "username").toLowerCase();
  const password = str(fd, "password");
  const dup = await prisma.user.findFirst({ where: { username, NOT: id ? { id } : undefined } });
  if (dup) redirect("/pengguna?err=" + encodeURIComponent("Username sudah dipakai"));
  const data = {
    name: str(fd, "name"),
    username,
    role: ["OWNER", "ADMIN", "TEKNISI"].includes(str(fd, "role")) ? str(fd, "role") : "ADMIN",
    phone: str(fd, "phone") || null,
    active: fd.get("active") === "1",
  };
  if (id) {
    await prisma.user.update({ where: { id }, data: { ...data, ...(password ? { passwordHash: await bcrypt.hash(password, 10) } : {}) } });
  } else {
    if (password.length < 6) redirect("/pengguna?err=" + encodeURIComponent("Password minimal 6 karakter"));
    await prisma.user.create({ data: { ...data, passwordHash: await bcrypt.hash(password, 10) } });
  }
  redirect("/pengguna?msg=" + encodeURIComponent("Pengguna disimpan"));
}

export async function changeOwnPassword(fd: FormData) {
  const me = await requireUser();
  const oldPw = str(fd, "old");
  const newPw = str(fd, "new");
  const u = await prisma.user.findUniqueOrThrow({ where: { id: me.id } });
  if (!(await bcrypt.compare(oldPw, u.passwordHash))) redirect("/akun?err=" + encodeURIComponent("Password lama salah"));
  if (newPw.length < 6) redirect("/akun?err=" + encodeURIComponent("Password baru minimal 6 karakter"));
  await prisma.user.update({ where: { id: me.id }, data: { passwordHash: await bcrypt.hash(newPw, 10) } });
  redirect("/akun?msg=" + encodeURIComponent("Password berhasil diganti"));
}

/* ---------- Pengaturan ---------- */
const SETTING_KEYS = ["storeName", "storeTagline", "storeAddress", "storePhone", "defaultWarrantyDays", "receiptFooter", "waTemplate", "publicUrl", "fonnteToken"];

export async function saveSettings(fd: FormData) {
  await requireUser(["OWNER"]);
  await prisma.$transaction(
    SETTING_KEYS.map((key) => {
      const value = String(fd.get(key) ?? "").trim();
      return prisma.setting.upsert({ where: { key }, update: { value }, create: { key, value } });
    }),
  );
  redirect("/pengaturan?msg=" + encodeURIComponent("Pengaturan disimpan"));
}
