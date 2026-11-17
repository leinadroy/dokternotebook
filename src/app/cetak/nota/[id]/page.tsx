import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { rupiah, tgl, tglJam } from "@/lib/format";
import PrintButton from "../../PrintButton";
import Kop from "../../Kop";

export const dynamic = "force-dynamic";

export default async function Nota({ params }: { params: Promise<{ id: string }> }) {
  await requireUser();
  const { id } = await params;
  const s = await prisma.service.findUnique({
    where: { id: parseInt(id, 10) },
    include: { customer: true, payments: true, createdBy: true },
  });
  if (!s) notFound();
  const settings = await getSettings();
  const dp = s.payments.filter((p) => p.type === "DP").reduce((a, p) => a + p.amount, 0);
  const cekUrl = `${(settings.publicUrl || "").replace(/\/$/, "")}/cek?nota=${s.number}`;
  const qr = await QRCode.toDataURL(cekUrl, { margin: 0, width: 160 });

  const Row = ({ k, v }: { k: string; v: React.ReactNode }) => (
    <tr><td className="py-1 pr-3 text-slate-600 w-40 align-top">{k}</td><td className="py-1 align-top">{v}</td></tr>
  );

  return (
    <div className="bg-white min-h-screen">
      <PrintButton />
      <div className="max-w-3xl mx-auto p-6 text-sm">
        <Kop s={settings} title="Tanda Terima Servis" number={s.number} />
        <div className="grid grid-cols-2 gap-6">
          <table><tbody>
            <Row k="Tanggal terima" v={tglJam(s.receivedAt)} />
            <Row k="Nama" v={<b>{s.customer.name}</b>} />
            <Row k="No. HP" v={s.customer.phone} />
            <Row k="Alamat" v={s.customer.address || "-"} />
          </tbody></table>
          <table><tbody>
            <Row k="Unit" v={<b>{s.deviceType} {s.deviceBrand} {s.deviceModel}</b>} />
            <Row k="Serial Number" v={s.serialNumber || "-"} />
            <Row k="Kelengkapan" v={s.accessories || "-"} />
            <Row k="Kondisi fisik" v={s.physicalCondition || "-"} />
          </tbody></table>
        </div>
        <div className="border border-slate-300 rounded p-3 my-4">
          <div className="text-xs text-slate-500">Keluhan</div>
          <div className="whitespace-pre-line">{s.complaint}</div>
        </div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="border border-slate-300 rounded p-3"><div className="text-xs text-slate-500">Estimasi biaya</div><b>{s.estimatedCost ? rupiah(s.estimatedCost) : "Menunggu diagnosa"}</b></div>
          <div className="border border-slate-300 rounded p-3"><div className="text-xs text-slate-500">Uang muka (DP)</div><b>{rupiah(dp)}</b></div>
          <div className="border border-slate-300 rounded p-3"><div className="text-xs text-slate-500">Estimasi selesai</div><b>{tgl(s.estimatedDone)}</b></div>
        </div>
        <div className="flex gap-4 items-center mb-6">
          <img src={qr} alt="QR cek status" className="w-24 h-24" />
          <div className="text-xs text-slate-600">
            Cek status servis online: scan QR atau buka <b>{cekUrl}</b>
            <br />Masukkan 4 digit terakhir no. HP Anda untuk verifikasi.
            <br />Simpan nota ini. Pengambilan unit wajib menunjukkan tanda terima.
          </div>
        </div>
        <p className="text-xs text-slate-500 border-t border-slate-200 pt-2 mb-10">{settings.receiptFooter}</p>
        <div className="grid grid-cols-2 text-center text-sm">
          <div>Pelanggan<div className="h-16" />( {s.customer.name} )</div>
          <div>Penerima<div className="h-16" />( {s.createdBy?.name || "................"} )</div>
        </div>
      </div>
    </div>
  );
}
