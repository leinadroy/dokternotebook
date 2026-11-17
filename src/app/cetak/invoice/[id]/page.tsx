import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rupiah, serviceTotals, tgl, tglJam, warrantyInfo } from "@/lib/format";
import PrintButton from "../../PrintButton";
import Kop from "../../Kop";

export const dynamic = "force-dynamic";

export default async function Invoice({ params }: { params: Promise<{ id: string }> }) {
  await requireUser(["OWNER", "ADMIN"]);
  const { id } = await params;
  const s = await prisma.service.findUnique({
    where: { id: parseInt(id, 10) },
    include: { customer: true, items: true, payments: { orderBy: { createdAt: "asc" } }, technician: true },
  });
  if (!s) notFound();
  const settings = await getSettings();
  const t = serviceTotals(s);
  const w = warrantyInfo(s);

  return (
    <div className="bg-white min-h-screen">
      <PrintButton />
      <div className="max-w-3xl mx-auto p-6 text-sm">
        <Kop s={settings} title="Invoice" number={s.number} />
        <div className="grid grid-cols-2 gap-6 mb-4">
          <div>
            <div className="text-xs text-slate-500">Kepada</div>
            <div className="font-semibold">{s.customer.name}</div>
            <div>{s.customer.phone}</div>
            <div>{s.customer.address}</div>
          </div>
          <div className="text-right">
            <div>Tanggal: {tgl(new Date())}</div>
            <div>Unit: {s.deviceBrand} {s.deviceModel}</div>
            <div>SN: {s.serialNumber || "-"}</div>
            <div>Teknisi: {s.technician?.name || "-"}</div>
          </div>
        </div>
        {s.diagnosis && (
          <div className="border border-slate-300 rounded p-3 mb-4">
            <div className="text-xs text-slate-500">Diagnosa / Tindakan</div>
            <div className="whitespace-pre-line">{s.diagnosis}</div>
          </div>
        )}
        <table className="w-full border-collapse mb-4">
          <thead>
            <tr className="border-y-2 border-slate-800 text-left">
              <th className="py-1.5">Deskripsi</th><th className="text-right">Qty</th><th className="text-right">Harga</th><th className="text-right">Jumlah</th>
            </tr>
          </thead>
          <tbody>
            {s.items.map((i) => (
              <tr key={i.id} className="border-b border-slate-200">
                <td className="py-1.5">{i.description} <span className="text-xs text-slate-500">({i.type === "PART" ? "sparepart" : "jasa"})</span></td>
                <td className="text-right">{i.qty}</td>
                <td className="text-right">{rupiah(i.price)}</td>
                <td className="text-right">{rupiah(i.qty * i.price)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div className="flex justify-end">
          <table className="w-72">
            <tbody>
              <tr><td>Subtotal</td><td className="text-right">{rupiah(t.subtotal)}</td></tr>
              {s.discount > 0 && <tr><td>Diskon</td><td className="text-right">- {rupiah(s.discount)}</td></tr>}
              <tr className="font-bold border-t border-slate-800"><td className="py-1">TOTAL</td><td className="text-right">{rupiah(t.total)}</td></tr>
              {s.payments.map((p) => (
                <tr key={p.id} className="text-slate-600">
                  <td>{p.type} {p.method} <span className="text-xs">{tglJam(p.createdAt)}</span></td>
                  <td className="text-right">{p.type === "REFUND" ? "" : "-"} {rupiah(p.amount)}</td>
                </tr>
              ))}
              <tr className="font-bold border-t border-slate-300">
                <td className="py-1">{t.remaining > 0 ? "SISA TAGIHAN" : "STATUS"}</td>
                <td className="text-right">{t.remaining > 0 ? rupiah(t.remaining) : "LUNAS"}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="mt-6 border border-slate-300 rounded p-3 text-xs">
          <b>Garansi servis {s.warrantyDays} hari</b>
          {w.until ? ` — berlaku s/d ${tgl(w.until)}` : " — dihitung sejak unit diambil"}. Garansi hanya untuk kerusakan/sparepart yang sama.
        </div>
        <p className="text-xs text-slate-500 mt-3">{settings.receiptFooter}</p>
        <div className="text-center mt-8 text-sm">Terima kasih atas kepercayaan Anda 🙏</div>
      </div>
    </div>
  );
}
