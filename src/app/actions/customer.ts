"use server";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normPhone } from "@/lib/format";

export async function updateCustomer(id: number, fd: FormData) {
  await requireUser(["OWNER", "ADMIN"]);
  const phone = normPhone(String(fd.get("phone") || ""));
  const exists = await prisma.customer.findFirst({ where: { phone, NOT: { id } } });
  if (exists) redirect(`/pelanggan/${id}?err=` + encodeURIComponent("Nomor HP sudah dipakai pelanggan lain"));
  await prisma.customer.update({
    where: { id },
    data: {
      name: String(fd.get("name") || "").trim(),
      phone,
      address: String(fd.get("address") || "").trim() || null,
      email: String(fd.get("email") || "").trim() || null,
      notes: String(fd.get("notes") || "").trim() || null,
    },
  });
  redirect(`/pelanggan/${id}?msg=` + encodeURIComponent("Data pelanggan disimpan"));
}
