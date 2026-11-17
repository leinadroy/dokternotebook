import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { rupiah, serviceTotals, tgl } from "@/lib/format";
import { waLink } from "@/lib/wa";
import { updateCustomer } from "@/app/actions/customer";
import StatusBadge from "@/components/StatusBadge";

export default async function CustomerDetail({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireUser();
  const { id } = await params;
  const sp = await searchParams;
  const c = await prisma.customer.findUnique({
    where: { id: parseInt(id, 10) },
    include: { services: { include: { items: true, payments: true }, orderBy: { receivedAt: "desc" } } },
  });
  if (!c) notFound();
  const spent = c.services.reduce((a, s) => a + serviceTotals(s).paid, 0);
  const mgr = canManage(user.role);

  return (
    <div className="max-w-5xl">
      <Link href="/pelanggan" className="text-sm text-slate-500">← Pelanggan</Link>
      <div className="flex flex-wrap justify-between items-end gap-3 mt-1 mb-6">
        <div>
          <h1 className="text-2xl font-bold">{c.name}</h1>
          <p className="text-sm text-slate-500">{c.phone} · pelanggan sejak {tgl(c.createdAt)} · {c.services.length} servis · total bayar {rupiah(spent)}</p>
        </div>
        <div className="flex gap-2">
          <a href={waLink(c.phone, `Halo ${c.name}, `)} target="_blank" className="btn-wa">WhatsApp</a>
          {mgr && <Link href={`/servis/baru?customer=${c.id}`} className="btn-primary">+ Servis baru</Link>}
        </div>
      </div>
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      {sp.err && <div className="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{sp.err}</div>}

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold">Riwayat Servis</div>
          <table className="table">
            <thead><tr><th>Nota</th><th>Unit</th><th>Status</th><th className="text-right">Total</th></tr></thead>
            <tbody>
              {c.services.map((s) => (
                <tr key={s.id}>
                  <td><Link href={`/servis/${s.id}`} className="text-brand-600 font-medium">{s.number}</Link><div className="text-xs text-slate-500">{tgl(s.receivedAt)}</div></td>
                  <td>{s.deviceBrand} {s.deviceModel}<div className="text-xs text-slate-500 line-clamp-1">{s.complaint}</div></td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-right">{rupiah(serviceTotals(s).total)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {mgr && (
          <form action={updateCustomer.bind(null, c.id)} className="card p-5 space-y-3 h-fit">
            <h2 className="font-semibold">Ubah Data</h2>
            <div><label className="label">Nama</label><input name="name" className="input" defaultValue={c.name} required /></div>
            <div><label className="label">No. HP</label><input name="phone" className="input" defaultValue={c.phone} required /></div>
            <div><label className="label">Alamat</label><input name="address" className="input" defaultValue={c.address || ""} /></div>
            <div><label className="label">Email</label><input name="email" className="input" defaultValue={c.email || ""} /></div>
            <div><label className="label">Catatan</label><textarea name="notes" className="input" rows={2} defaultValue={c.notes || ""} /></div>
            <button className="btn-primary">Simpan</button>
          </form>
        )}
      </div>
    </div>
  );
}
