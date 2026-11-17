"use server";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { STATUSES, STATUS_LABEL, normPhone, serviceTotals } from "@/lib/format";
import { getSettings } from "@/lib/settings";
import { buildWaMessage, sendWaAuto } from "@/lib/wa";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const num = (fd: FormData, k: string) => Math.max(0, parseInt(str(fd, k).replace(/[^0-9]/g, "") || "0", 10));
const optDate = (v: string) => (v ? new Date(v + "T17:00:00") : null);

async function nextNumber() {
  const d = new Date();
  const prefix = "DN" + String(d.getFullYear()).slice(2) + String(d.getMonth() + 1).padStart(2, "0") + String(d.getDate()).padStart(2, "0");
  const last = await prisma.service.findFirst({ where: { number: { startsWith: prefix } }, orderBy: { number: "desc" } });
  const seq = last ? parseInt(last.number.slice(prefix.length), 10) + 1 : 1;
  return prefix + String(seq).padStart(3, "0");
}

export async function createService(fd: FormData) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const phone = normPhone(str(fd, "phone"));
  const name = str(fd, "customerName");
  if (!phone || !name) redirect("/servis/baru?err=" + encodeURIComponent("Nama & nomor HP pelanggan wajib diisi"));

  const customer = await prisma.customer.upsert({
    where: { phone },
    update: { name, address: str(fd, "address") || undefined, email: str(fd, "email") || undefined },
    create: { name, phone, address: str(fd, "address") || null, email: str(fd, "email") || null },
  });

  const settings = await getSettings();
  const dp = num(fd, "downPayment");
  const techId = parseInt(str(fd, "technicianId") || "0", 10) || null;
  const parentId = parseInt(str(fd, "parentId") || "0", 10) || null;

  const svc = await prisma.service.create({
    data: {
      number: await nextNumber(),
      customerId: customer.id,
      deviceType: str(fd, "deviceType") || "Laptop",
      deviceBrand: str(fd, "deviceBrand"),
      deviceModel: str(fd, "deviceModel"),
      serialNumber: str(fd, "serialNumber") || null,
      devicePassword: str(fd, "devicePassword") || null,
      complaint: str(fd, "complaint"),
      accessories: str(fd, "accessories") || null,
      physicalCondition: str(fd, "physicalCondition") || null,
      estimatedCost: num(fd, "estimatedCost"),
      estimatedDone: optDate(str(fd, "estimatedDone")),
      warrantyDays: parseInt(str(fd, "warrantyDays") || settings.defaultWarrantyDays || "30", 10),
      notes: str(fd, "notes") || null,
      technicianId: techId,
      createdById: user.id,
      isWarrantyClaim: !!parentId,
      parentId,
      logs: { create: { status: "DITERIMA", note: parentId ? "Klaim garansi - unit diterima" : "Unit diterima", userId: user.id } },
      payments: dp > 0 ? { create: { amount: dp, type: "DP", method: str(fd, "dpMethod") || "TUNAI", userId: user.id } } : undefined,
    },
  });
  redirect(`/servis/${svc.id}?baru=1`);
}

export async function updateStatus(id: number, fd: FormData) {
  const user = await requireUser();
  const status = str(fd, "status");
  if (!STATUSES.includes(status as (typeof STATUSES)[number])) return;
  const note = str(fd, "note");
  const svc = await prisma.service.findUniqueOrThrow({ where: { id }, include: { customer: true, items: true, payments: true } });

  if (user.role === "TEKNISI" && (status === "DIAMBIL" || svc.technicianId !== user.id)) {
    redirect(`/servis/${id}?err=` + encodeURIComponent("Teknisi hanya bisa mengubah status servis yang ditugaskan kepadanya (kecuali 'Diambil')."));
  }
  if (status === "DIAMBIL" && serviceTotals(svc).remaining > 0 && fd.get("force") !== "1") {
    redirect(`/servis/${id}?err=` + encodeURIComponent("Masih ada sisa tagihan. Catat pelunasan dulu sebelum unit diambil."));
  }

  await prisma.service.update({
    where: { id },
    data: {
      status,
      finishedAt: status === "SELESAI" ? new Date() : status === "DIAMBIL" ? svc.finishedAt ?? new Date() : svc.finishedAt,
      pickedUpAt: status === "DIAMBIL" ? new Date() : null,
      logs: { create: { status, note: note || null, userId: user.id } },
    },
  });

  let msg = `Status diubah ke ${STATUS_LABEL[status]}`;
  if (fd.get("sendWa") === "1") {
    const settings = await getSettings();
    const r = await sendWaAuto(svc.customer.phone, buildWaMessage({ ...svc, status }, settings, note), settings);
    msg += r.sent ? " · WhatsApp terkirim otomatis" : "";
  }
  revalidatePath(`/servis/${id}`);
  redirect(`/servis/${id}?msg=` + encodeURIComponent(msg));
}

export async function updateDetails(id: number, fd: FormData) {
  const user = await requireUser();
  const isMgr = canManage(user.role);
  const techId = parseInt(str(fd, "technicianId") || "0", 10) || null;
  await prisma.service.update({
    where: { id },
    data: {
      diagnosis: str(fd, "diagnosis") || null,
      notes: str(fd, "notes") || null,
      estimatedCost: num(fd, "estimatedCost"),
      estimatedDone: optDate(str(fd, "estimatedDone")),
      ...(isMgr
        ? {
            technicianId: techId,
            warrantyDays: num(fd, "warrantyDays"),
            discount: num(fd, "discount"),
            deviceBrand: str(fd, "deviceBrand"),
            deviceModel: str(fd, "deviceModel"),
            serialNumber: str(fd, "serialNumber") || null,
            devicePassword: str(fd, "devicePassword") || null,
            complaint: str(fd, "complaint"),
            accessories: str(fd, "accessories") || null,
            physicalCondition: str(fd, "physicalCondition") || null,
          }
        : {}),
    },
  });
  redirect(`/servis/${id}?msg=` + encodeURIComponent("Data servis disimpan"));
}

export async function addItem(id: number, fd: FormData) {
  await requireUser();
  const type = str(fd, "type") === "PART" ? "PART" : "JASA";
  const qty = Math.max(1, num(fd, "qty") || 1);
  if (type === "PART") {
    const partId = parseInt(str(fd, "sparepartId") || "0", 10);
    const part = await prisma.sparepart.findUnique({ where: { id: partId } });
    if (!part) redirect(`/servis/${id}?err=` + encodeURIComponent("Pilih sparepart"));
    if (part!.stock < qty) redirect(`/servis/${id}?err=` + encodeURIComponent(`Stok ${part!.name} tidak cukup (sisa ${part!.stock})`));
    const price = str(fd, "price") ? num(fd, "price") : part!.sellPrice;
    await prisma.$transaction([
      prisma.serviceItem.create({
        data: { serviceId: id, type, sparepartId: part!.id, description: part!.name, qty, price, costPrice: part!.buyPrice },
      }),
      prisma.sparepart.update({ where: { id: part!.id }, data: { stock: { decrement: qty } } }),
      prisma.stockMovement.create({ data: { sparepartId: part!.id, qty: -qty, type: "KELUAR", serviceId: id, note: "Dipakai servis" } }),
    ]);
  } else {
    const description = str(fd, "description");
    if (!description) redirect(`/servis/${id}?err=` + encodeURIComponent("Isi deskripsi jasa"));
    await prisma.serviceItem.create({ data: { serviceId: id, type, description, qty, price: num(fd, "price") } });
  }
  redirect(`/servis/${id}#biaya`);
}

export async function deleteItem(itemId: number) {
  await requireUser();
  const item = await prisma.serviceItem.findUniqueOrThrow({ where: { id: itemId } });
  const ops = [prisma.serviceItem.delete({ where: { id: itemId } })];
  if (item.sparepartId) {
    ops.push(
      prisma.sparepart.update({ where: { id: item.sparepartId }, data: { stock: { increment: item.qty } } }) as never,
      prisma.stockMovement.create({
        data: { sparepartId: item.sparepartId, qty: item.qty, type: "MASUK", serviceId: item.serviceId, note: "Batal dipakai servis" },
      }) as never,
    );
  }
  await prisma.$transaction(ops);
  redirect(`/servis/${item.serviceId}#biaya`);
}

export async function addPayment(id: number, fd: FormData) {
  const user = await requireUser(["OWNER", "ADMIN"]);
  const amount = num(fd, "amount");
  if (amount <= 0) redirect(`/servis/${id}?err=` + encodeURIComponent("Nominal pembayaran harus lebih dari 0"));
  await prisma.payment.create({
    data: { serviceId: id, amount, method: str(fd, "method") || "TUNAI", type: str(fd, "type") || "PELUNASAN", note: str(fd, "note") || null, userId: user.id },
  });
  redirect(`/servis/${id}?msg=` + encodeURIComponent("Pembayaran dicatat") + "#biaya");
}

export async function deletePayment(paymentId: number) {
  await requireUser(["OWNER"]);
  const p = await prisma.payment.delete({ where: { id: paymentId } });
  redirect(`/servis/${p.serviceId}#biaya`);
}
