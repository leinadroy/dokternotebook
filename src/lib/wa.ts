import { STATUS_LABEL, normPhone } from "./format";
import type { Settings } from "./settings";

type Svc = {
  number: string;
  status: string;
  deviceBrand: string;
  deviceModel: string;
  customer: { name: string; phone: string };
};

export function buildWaMessage(s: Svc, settings: Settings, note = "") {
  const tpl = settings.waTemplate || "Halo {nama}, status servis {nota}: {status}. {catatan}";
  const link = `${(settings.publicUrl || "").replace(/\/$/, "")}/cek?nota=${encodeURIComponent(s.number)}`;
  return tpl
    .replaceAll("{nama}", s.customer.name)
    .replaceAll("{nota}", s.number)
    .replaceAll("{perangkat}", `${s.deviceBrand} ${s.deviceModel}`)
    .replaceAll("{toko}", settings.storeName || "")
    .replaceAll("{status}", STATUS_LABEL[s.status] || s.status)
    .replaceAll("{catatan}", note)
    .replaceAll("{link}", link)
    .trim();
}

export function waLink(phone: string, message: string) {
  return `https://wa.me/${normPhone(phone)}?text=${encodeURIComponent(message)}`;
}

/** Kirim otomatis lewat gateway Fonnte jika token diisi di Pengaturan. Gagal = diam (fallback tombol wa.me). */
export async function sendWaAuto(phone: string, message: string, settings: Settings) {
  const token = settings.fonnteToken?.trim();
  if (!token) return { sent: false, reason: "no-token" };
  try {
    const body = new URLSearchParams({ target: normPhone(phone), message });
    const res = await fetch("https://api.fonnte.com/send", {
      method: "POST",
      headers: { Authorization: token },
      body,
    });
    return { sent: res.ok };
  } catch {
    return { sent: false, reason: "error" };
  }
}
