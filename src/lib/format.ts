export const rupiah = (n: number | null | undefined) =>
  "Rp " + new Intl.NumberFormat("id-ID").format(Math.round(n || 0));

export const tgl = (d: Date | string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("id-ID", { day: "2-digit", month: "short", year: "numeric" }) : "-";

export const tglJam = (d: Date | string | null | undefined) =>
  d
    ? new Date(d).toLocaleString("id-ID", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" })
    : "-";

export const STATUSES = [
  "DITERIMA",
  "DIAGNOSA",
  "MENUNGGU_KONFIRMASI",
  "MENUNGGU_SPAREPART",
  "DIKERJAKAN",
  "SELESAI",
  "DIAMBIL",
  "BATAL",
] as const;

export const STATUS_LABEL: Record<string, string> = {
  DITERIMA: "Diterima",
  DIAGNOSA: "Diagnosa",
  MENUNGGU_KONFIRMASI: "Menunggu Konfirmasi",
  MENUNGGU_SPAREPART: "Menunggu Sparepart",
  DIKERJAKAN: "Dikerjakan",
  SELESAI: "Selesai",
  DIAMBIL: "Diambil",
  BATAL: "Batal",
};

export const STATUS_COLOR: Record<string, string> = {
  DITERIMA: "bg-slate-100 text-slate-700",
  DIAGNOSA: "bg-sky-100 text-sky-700",
  MENUNGGU_KONFIRMASI: "bg-amber-100 text-amber-800",
  MENUNGGU_SPAREPART: "bg-orange-100 text-orange-800",
  DIKERJAKAN: "bg-indigo-100 text-indigo-700",
  SELESAI: "bg-emerald-100 text-emerald-700",
  DIAMBIL: "bg-teal-100 text-teal-800",
  BATAL: "bg-rose-100 text-rose-700",
};

export const ROLE_LABEL: Record<string, string> = { OWNER: "Pemilik", ADMIN: "Admin / Kasir", TEKNISI: "Teknisi" };

export const OPEN_STATUSES = ["DITERIMA", "DIAGNOSA", "MENUNGGU_KONFIRMASI", "MENUNGGU_SPAREPART", "DIKERJAKAN"];

/** Normalisasi nomor HP Indonesia ke format 62xxxx */
export function normPhone(p: string) {
  let s = (p || "").replace(/[^0-9]/g, "");
  if (s.startsWith("0")) s = "62" + s.slice(1);
  else if (s.startsWith("8")) s = "62" + s;
  return s;
}

export function serviceTotals(s: {
  items: { qty: number; price: number }[];
  payments: { amount: number; type: string }[];
  discount: number;
}) {
  const subtotal = s.items.reduce((a, i) => a + i.qty * i.price, 0);
  const total = Math.max(0, subtotal - s.discount);
  const paid = s.payments.reduce((a, p) => a + (p.type === "REFUND" ? -p.amount : p.amount), 0);
  return { subtotal, total, paid, remaining: total - paid };
}

export function warrantyInfo(s: { pickedUpAt: Date | null; warrantyDays: number; status: string }) {
  if (!s.pickedUpAt || s.status !== "DIAMBIL") return { active: false, until: null as Date | null };
  const until = new Date(s.pickedUpAt.getTime() + s.warrantyDays * 86400000);
  return { active: until.getTime() >= Date.now() && s.warrantyDays > 0, until };
}
