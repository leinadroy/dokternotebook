import Link from "next/link";
import { prisma } from "@/lib/db";
import { getSettings } from "@/lib/settings";
import { STATUSES, STATUS_LABEL, rupiah, serviceTotals, tgl, tglJam, warrantyInfo } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: "Cek Status Servis" };

const FLOW = ["DITERIMA", "DIAGNOSA", "DIKERJAKAN", "SELESAI", "DIAMBIL"];

export default async function CekStatus({ searchParams }: { searchParams: Promise<{ nota?: string; hp?: string }> }) {
  const sp = await searchParams;
  const settings = await getSettings();
  const nota = (sp.nota || "").trim().toUpperCase();
  const hp = (sp.hp || "").replace(/\D/g, "");

  let svc = null;
  let error = "";
  if (nota && hp) {
    const s = await prisma.service.findUnique({
      where: { number: nota },
      include: { customer: true, items: true, payments: true, technician: true, logs: { orderBy: { createdAt: "asc" } } },
    });
    // verifikasi 4 digit terakhir no HP agar data pelanggan tidak bisa dilihat orang lain
    if (s && hp.length >= 4 && s.customer.phone.endsWith(hp.slice(-4))) svc = s;
    else error = "Data tidak ditemukan. Periksa nomor nota dan 4 digit terakhir nomor HP Anda.";
  }

  const t = svc ? serviceTotals(svc) : null;
  const w = svc ? warrantyInfo(svc) : null;
  const stepIdx = svc ? FLOW.indexOf(["MENUNGGU_KONFIRMASI", "MENUNGGU_SPAREPART"].includes(svc.status) ? "DIAGNOSA" : svc.status) : -1;

  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-900 to-brand-600 py-10 px-4">
      <div className="max-w-xl mx-auto">
        <div className="flex items-center gap-3 text-white mb-6">
          <img src="/icon.svg" alt="" className="w-11 h-11" />
          <div>
            <div className="font-bold text-lg">{settings.storeName}</div>
            <div className="text-sm text-white/70">Cek status servis laptop Anda</div>
          </div>
        </div>

        <form className="card p-5 space-y-3 mb-4">
          <div className="grid sm:grid-cols-[1fr_10rem] gap-3">
            <div>
              <label className="label">Nomor nota</label>
              <input name="nota" defaultValue={nota} className="input font-mono uppercase" placeholder="DN251117001" required />
            </div>
            <div>
              <label className="label">4 digit terakhir no. HP</label>
              <input name="hp" defaultValue={sp.hp} className="input" inputMode="numeric" maxLength={4} placeholder="xxxx" required autoFocus={!!nota && !hp} />
            </div>
          </div>
          <button className="btn-primary w-full">Cek Status</button>
          {error && <p className="text-sm text-rose-600">{error}</p>}
        </form>

        {svc && t && w && (
          <div className="card p-5 space-y-5">
            <div className="flex justify-between items-start gap-2">
              <div>
                <div className="font-mono text-sm text-slate-500">{svc.number}</div>
                <div className="font-semibold text-lg">{svc.deviceBrand} {svc.deviceModel}</div>
                <div className="text-sm text-slate-500">a.n. {svc.customer.name} · diterima {tgl(svc.receivedAt)}</div>
              </div>
              <StatusBadge status={svc.status} />
            </div>

            {svc.status !== "BATAL" && (
              <div className="flex items-center">
                {FLOW.map((st, i) => (
                  <div key={st} className="flex-1 flex flex-col items-center relative">
                    {i > 0 && <div className={`absolute top-3 right-1/2 w-full h-0.5 ${i <= stepIdx ? "bg-brand-500" : "bg-slate-200"}`} />}
                    <div className={`relative z-10 w-6 h-6 rounded-full grid place-items-center text-xs text-white ${i <= stepIdx ? "bg-brand-600" : "bg-slate-300"}`}>{i < stepIdx ? "✓" : i + 1}</div>
                    <div className="text-[10px] sm:text-xs mt-1 text-center text-slate-600">{STATUS_LABEL[st]}</div>
                  </div>
                ))}
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div><div className="text-xs text-slate-500">Keluhan</div>{svc.complaint}</div>
              <div><div className="text-xs text-slate-500">Estimasi selesai</div>{tgl(svc.estimatedDone)}</div>
              {svc.diagnosis && <div className="col-span-2"><div className="text-xs text-slate-500">Hasil pengecekan</div><span className="whitespace-pre-line">{svc.diagnosis}</span></div>}
              <div><div className="text-xs text-slate-500">{t.total ? "Total biaya" : "Estimasi biaya"}</div><b>{rupiah(t.total || svc.estimatedCost)}</b></div>
              <div>
                <div className="text-xs text-slate-500">Sisa pembayaran</div>
                <b className={t.remaining > 0 ? "text-rose-600" : "text-emerald-600"}>{t.total ? (t.remaining > 0 ? rupiah(t.remaining) : "Lunas") : "-"}</b>
              </div>
              {w.until && (
                <div className="col-span-2"><div className="text-xs text-slate-500">Garansi</div>{w.active ? `Aktif s/d ${tgl(w.until)}` : `Berakhir ${tgl(w.until)}`}</div>
              )}
            </div>

            <div>
              <div className="text-xs text-slate-500 mb-2">Riwayat</div>
              <ul className="space-y-1.5 text-sm">
                {svc.logs.filter((l) => STATUSES.includes(l.status as never)).map((l) => (
                  <li key={l.id} className="flex justify-between gap-2"><span>{STATUS_LABEL[l.status]}</span><span className="text-slate-500">{tglJam(l.createdAt)}</span></li>
                ))}
              </ul>
            </div>

            {svc.status === "SELESAI" && <div className="rounded-lg bg-emerald-50 text-emerald-800 text-sm p-3">✅ Unit Anda sudah selesai dan siap diambil. Jangan lupa bawa tanda terima.</div>}
            {svc.status === "MENUNGGU_KONFIRMASI" && <div className="rounded-lg bg-amber-50 text-amber-800 text-sm p-3">⏳ Kami menunggu konfirmasi Anda untuk melanjutkan perbaikan. Silakan hubungi kami.</div>}
          </div>
        )}

        <p className="text-center text-xs text-white/70 mt-6">
          {settings.storeAddress} · {settings.storePhone}
          <br />
          <Link href="/login" className="underline">Login staf</Link>
        </p>
      </div>
    </div>
  );
}
