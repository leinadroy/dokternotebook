import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { STATUSES, STATUS_LABEL, rupiah, serviceTotals, tgl, tglJam, warrantyInfo } from "@/lib/format";
import { buildWaMessage, waLink } from "@/lib/wa";
import { addItem, addPayment, deleteItem, deletePayment, updateDetails, updateStatus } from "@/app/actions/service";
import StatusBadge from "@/components/StatusBadge";

type SP = { msg?: string; err?: string; baru?: string };

export default async function ServiceDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<SP> }) {
  const user = await requireUser();
  const { id: idStr } = await params;
  const sp = await searchParams;
  const id = parseInt(idStr, 10);
  const s = await prisma.service.findUnique({
    where: { id },
    include: {
      customer: true,
      technician: true,
      createdBy: true,
      parent: true,
      claims: true,
      items: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "asc" }, include: { user: true } },
      logs: { orderBy: { createdAt: "desc" }, include: { user: true } },
    },
  });
  if (!s) notFound();

  const [techs, parts, settings] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEKNISI", active: true }, orderBy: { name: "asc" } }),
    prisma.sparepart.findMany({ where: { stock: { gt: 0 } }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);

  const mgr = canManage(user.role);
  const t = serviceTotals(s);
  const w = warrantyInfo(s);
  const waMsg = buildWaMessage(s, settings, s.status === "SELESAI" && t.remaining > 0 ? `Total biaya ${rupiah(t.total)}, sisa pembayaran ${rupiah(t.remaining)}.` : "");
  const dateVal = (d: Date | null) => (d ? new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10) : "");

  return (
    <div className="max-w-6xl">
      <div className="flex flex-wrap items-start justify-between gap-3 mb-6">
        <div>
          <Link href="/servis" className="text-sm text-slate-500">← Daftar servis</Link>
          <h1 className="text-2xl font-bold flex flex-wrap items-center gap-3 mt-1">
            {s.number} <StatusBadge status={s.status} />
            {s.isWarrantyClaim && <span className="badge bg-violet-100 text-violet-700">Klaim garansi</span>}
          </h1>
          <p className="text-sm text-slate-500">Diterima {tglJam(s.receivedAt)} oleh {s.createdBy?.name || "-"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <a href={`/cetak/nota/${s.id}`} target="_blank" className="btn-secondary">🖨 Tanda Terima</a>
          {mgr && <a href={`/cetak/invoice/${s.id}`} target="_blank" className="btn-secondary">🧾 Invoice</a>}
          <a href={waLink(s.customer.phone, waMsg)} target="_blank" className="btn-wa">WhatsApp Pelanggan</a>
        </div>
      </div>

      {sp.baru && (
        <div className="card p-4 mb-4 bg-emerald-50 border-emerald-200 text-sm text-emerald-800 flex flex-wrap items-center justify-between gap-2">
          <span>✅ Servis berhasil dicatat. Cetak tanda terima untuk pelanggan.</span>
          <a href={`/cetak/nota/${s.id}`} target="_blank" className="btn-success btn-sm">Cetak sekarang</a>
        </div>
      )}
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      {sp.err && <div className="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{sp.err}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Info unit */}
          <div className="card p-5">
            <div className="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
              <Info label="Pelanggan">
                <Link href={`/pelanggan/${s.customer.id}`} className="text-brand-600 font-medium">{s.customer.name}</Link>
                <div className="text-slate-500">{s.customer.phone}</div>
              </Info>
              <Info label="Unit">{s.deviceType} · {s.deviceBrand} {s.deviceModel}<div className="text-slate-500">SN: {s.serialNumber || "-"}</div></Info>
              <Info label="Keluhan"><span className="whitespace-pre-line">{s.complaint}</span></Info>
              <Info label="Kelengkapan">{s.accessories || "-"}</Info>
              <Info label="Kondisi fisik">{s.physicalCondition || "-"}</Info>
              <Info label="Password unit">{s.devicePassword || "-"}</Info>
              <Info label="Teknisi">{s.technician?.name || <span className="text-amber-600">Belum ditugaskan</span>}</Info>
              <Info label="Estimasi">{rupiah(s.estimatedCost)} · selesai {tgl(s.estimatedDone)}</Info>
              <Info label="Garansi">
                {s.warrantyDays} hari
                {w.until && (
                  <div className={w.active ? "text-emerald-600" : "text-slate-500"}>
                    {w.active ? "Aktif" : "Habis"} s/d {tgl(w.until)}
                  </div>
                )}
              </Info>
              {s.parent && (
                <Info label="Klaim dari nota">
                  <Link href={`/servis/${s.parent.id}`} className="text-brand-600">{s.parent.number}</Link>
                </Info>
              )}
              {s.claims.length > 0 && (
                <Info label="Klaim garansi terkait">
                  {s.claims.map((c) => (
                    <Link key={c.id} href={`/servis/${c.id}`} className="text-brand-600 mr-2">{c.number}</Link>
                  ))}
                </Info>
              )}
            </div>
          </div>

          {/* Diagnosa & edit */}
          <details className="card p-5" open={!s.diagnosis}>
            <summary className="font-semibold cursor-pointer">Diagnosa & Ubah Data</summary>
            <form action={updateDetails.bind(null, s.id)} className="grid sm:grid-cols-2 gap-4 mt-4">
              <div className="sm:col-span-2">
                <label className="label">Hasil diagnosa / tindakan</label>
                <textarea name="diagnosis" rows={3} className="input" defaultValue={s.diagnosis || ""} placeholder="mis. IC power short, perlu ganti..." />
              </div>
              <div>
                <label className="label">Estimasi biaya (Rp)</label>
                <input name="estimatedCost" className="input" defaultValue={s.estimatedCost} inputMode="numeric" />
              </div>
              <div>
                <label className="label">Estimasi selesai</label>
                <input name="estimatedDone" type="date" className="input" defaultValue={dateVal(s.estimatedDone)} />
              </div>
              {mgr && (
                <>
                  <div>
                    <label className="label">Teknisi</label>
                    <select name="technicianId" className="input" defaultValue={s.technicianId || ""}>
                      <option value="">— Belum ditugaskan —</option>
                      {techs.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="label">Garansi (hari)</label>
                      <input name="warrantyDays" className="input" defaultValue={s.warrantyDays} inputMode="numeric" />
                    </div>
                    <div>
                      <label className="label">Diskon (Rp)</label>
                      <input name="discount" className="input" defaultValue={s.discount} inputMode="numeric" />
                    </div>
                  </div>
                  <div><label className="label">Merk</label><input name="deviceBrand" className="input" defaultValue={s.deviceBrand} /></div>
                  <div><label className="label">Model</label><input name="deviceModel" className="input" defaultValue={s.deviceModel} /></div>
                  <div><label className="label">Serial Number</label><input name="serialNumber" className="input" defaultValue={s.serialNumber || ""} /></div>
                  <div><label className="label">Password unit</label><input name="devicePassword" className="input" defaultValue={s.devicePassword || ""} /></div>
                  <div className="sm:col-span-2"><label className="label">Keluhan</label><textarea name="complaint" rows={2} className="input" defaultValue={s.complaint} /></div>
                  <div><label className="label">Kelengkapan</label><input name="accessories" className="input" defaultValue={s.accessories || ""} /></div>
                  <div><label className="label">Kondisi fisik</label><input name="physicalCondition" className="input" defaultValue={s.physicalCondition || ""} /></div>
                </>
              )}
              <div className="sm:col-span-2">
                <label className="label">Catatan internal</label>
                <input name="notes" className="input" defaultValue={s.notes || ""} />
              </div>
              <div><button className="btn-primary">Simpan</button></div>
            </form>
          </details>

          {/* Biaya */}
          <div id="biaya" className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold">Rincian Biaya</div>
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr><th>Item</th><th className="text-right">Qty</th><th className="text-right">Harga</th><th className="text-right">Subtotal</th><th></th></tr>
                </thead>
                <tbody>
                  {s.items.map((i) => (
                    <tr key={i.id}>
                      <td>
                        <span className={`badge mr-2 ${i.type === "PART" ? "bg-orange-100 text-orange-700" : "bg-sky-100 text-sky-700"}`}>{i.type === "PART" ? "Part" : "Jasa"}</span>
                        {i.description}
                      </td>
                      <td className="text-right">{i.qty}</td>
                      <td className="text-right">{rupiah(i.price)}</td>
                      <td className="text-right">{rupiah(i.qty * i.price)}</td>
                      <td className="text-right">
                        {s.status !== "DIAMBIL" && (
                          <form action={deleteItem.bind(null, i.id)}>
                            <button className="text-rose-600 text-xs cursor-pointer" title="Hapus">Hapus</button>
                          </form>
                        )}
                      </td>
                    </tr>
                  ))}
                  {s.items.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-6">Belum ada item biaya</td></tr>}
                </tbody>
                <tfoot className="text-sm">
                  <tr><td colSpan={3} className="text-right">Subtotal</td><td className="text-right">{rupiah(t.subtotal)}</td><td /></tr>
                  {s.discount > 0 && <tr><td colSpan={3} className="text-right">Diskon</td><td className="text-right">- {rupiah(s.discount)}</td><td /></tr>}
                  <tr className="font-semibold"><td colSpan={3} className="text-right">Total</td><td className="text-right">{rupiah(t.total)}</td><td /></tr>
                  <tr><td colSpan={3} className="text-right">Sudah dibayar</td><td className="text-right text-emerald-600">{rupiah(t.paid)}</td><td /></tr>
                  <tr className="font-semibold">
                    <td colSpan={3} className="text-right">{t.remaining >= 0 ? "Sisa tagihan" : "Kelebihan bayar"}</td>
                    <td className={`text-right ${t.remaining > 0 ? "text-rose-600" : ""}`}>{rupiah(Math.abs(t.remaining))}</td><td />
                  </tr>
                </tfoot>
              </table>
            </div>

            {s.status !== "DIAMBIL" && s.status !== "BATAL" && (
              <div className="grid md:grid-cols-2 gap-4 p-5 border-t border-slate-200 bg-slate-50">
                <form action={addItem.bind(null, s.id)} className="space-y-2">
                  <input type="hidden" name="type" value="JASA" />
                  <div className="text-sm font-medium">+ Tambah jasa</div>
                  <input name="description" className="input" placeholder="mis. Jasa ganti keyboard" required />
                  <div className="flex gap-2">
                    <input name="price" className="input" placeholder="Harga" inputMode="numeric" required />
                    <input name="qty" className="input w-20" defaultValue={1} inputMode="numeric" />
                    <button className="btn-secondary">Tambah</button>
                  </div>
                </form>
                <form action={addItem.bind(null, s.id)} className="space-y-2">
                  <input type="hidden" name="type" value="PART" />
                  <div className="text-sm font-medium">+ Pakai sparepart (stok otomatis berkurang)</div>
                  <select name="sparepartId" className="input" required defaultValue="">
                    <option value="" disabled>Pilih sparepart...</option>
                    {parts.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} — {rupiah(p.sellPrice)} (stok {p.stock})</option>
                    ))}
                  </select>
                  <div className="flex gap-2">
                    <input name="price" className="input" placeholder="Harga (default harga jual)" inputMode="numeric" />
                    <input name="qty" className="input w-20" defaultValue={1} inputMode="numeric" />
                    <button className="btn-secondary">Tambah</button>
                  </div>
                </form>
              </div>
            )}
          </div>

          {/* Pembayaran */}
          <div className="card overflow-hidden">
            <div className="px-5 py-3 border-b border-slate-200 font-semibold">Pembayaran</div>
            <table className="table">
              <thead><tr><th>Tanggal</th><th>Jenis</th><th>Metode</th><th className="text-right">Jumlah</th><th></th></tr></thead>
              <tbody>
                {s.payments.map((p) => (
                  <tr key={p.id}>
                    <td>{tglJam(p.createdAt)}<div className="text-xs text-slate-500">{p.user?.name}{p.note ? ` · ${p.note}` : ""}</div></td>
                    <td>{p.type}</td>
                    <td>{p.method}</td>
                    <td className={`text-right ${p.type === "REFUND" ? "text-rose-600" : ""}`}>{p.type === "REFUND" ? "-" : ""}{rupiah(p.amount)}</td>
                    <td className="text-right">
                      {user.role === "OWNER" && (
                        <form action={deletePayment.bind(null, p.id)}><button className="text-rose-600 text-xs cursor-pointer">Hapus</button></form>
                      )}
                    </td>
                  </tr>
                ))}
                {s.payments.length === 0 && <tr><td colSpan={5} className="text-center text-slate-500 py-6">Belum ada pembayaran</td></tr>}
              </tbody>
            </table>
            {mgr && (
              <form action={addPayment.bind(null, s.id)} className="flex flex-wrap gap-2 p-4 border-t border-slate-200 bg-slate-50">
                <input name="amount" className="input w-40" placeholder="Nominal" inputMode="numeric" defaultValue={t.remaining > 0 ? t.remaining : ""} required />
                <select name="type" className="input w-auto" defaultValue={t.total > 0 ? "PELUNASAN" : "DP"}>
                  <option value="DP">DP</option>
                  <option value="PELUNASAN">Pelunasan</option>
                  <option value="REFUND">Refund</option>
                </select>
                <select name="method" className="input w-auto">
                  {["TUNAI", "TRANSFER", "QRIS", "DEBIT"].map((m) => <option key={m}>{m}</option>)}
                </select>
                <input name="note" className="input flex-1 min-w-32" placeholder="Catatan (opsional)" />
                <button className="btn-success">Catat Pembayaran</button>
              </form>
            )}
          </div>
        </div>

        {/* Kolom kanan: status */}
        <div className="space-y-6">
          <div className="card p-5">
            <h2 className="font-semibold mb-3">Ubah Status</h2>
            <form action={updateStatus.bind(null, s.id)} className="space-y-3">
              <select name="status" className="input" defaultValue={s.status}>
                {STATUSES.map((x) => <option key={x} value={x}>{STATUS_LABEL[x]}</option>)}
              </select>
              <textarea name="note" rows={2} className="input" placeholder="Catatan untuk riwayat / pesan WA (opsional)" />
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" name="sendWa" value="1" defaultChecked={!!settings.fonnteToken} />
                Kirim WA otomatis {settings.fonnteToken ? "(Fonnte aktif)" : "(isi token Fonnte di Pengaturan)"}
              </label>
              {mgr && t.remaining > 0 && (
                <label className="flex items-center gap-2 text-xs text-slate-500">
                  <input type="checkbox" name="force" value="1" /> Izinkan diambil walau belum lunas
                </label>
              )}
              <button className="btn-primary w-full">Update Status</button>
            </form>
            <p className="text-xs text-slate-500 mt-3">
              Tanpa token Fonnte, gunakan tombol <b>WhatsApp Pelanggan</b> di atas untuk mengirim pesan status terbaru lewat WhatsApp Anda.
            </p>
          </div>

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Riwayat</h2>
            <ol className="relative border-l border-slate-200 ml-2 space-y-4">
              {s.logs.map((l) => (
                <li key={l.id} className="ml-4">
                  <span className="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-white" />
                  <div className="text-sm font-medium">{STATUS_LABEL[l.status] || l.status}</div>
                  {l.note && <div className="text-sm text-slate-600">{l.note}</div>}
                  <div className="text-xs text-slate-400">{tglJam(l.createdAt)} · {l.user?.name || "-"}</div>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs text-slate-500">{label}</div>
      <div>{children}</div>
    </div>
  );
}
