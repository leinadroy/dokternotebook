import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { tgl, warrantyInfo } from "@/lib/format";
import PageHeader from "@/components/PageHeader";
import StatusBadge from "@/components/StatusBadge";

export default async function Garansi({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser(["OWNER", "ADMIN"]);
  const { q } = await searchParams;

  const found = q
    ? await prisma.service.findMany({
        where: {
          OR: [
            { number: { contains: q.trim().toUpperCase() } },
            { serialNumber: { contains: q.trim() } },
            { customer: { phone: { contains: q.trim().replace(/^0/, "") } } },
            { customer: { name: { contains: q.trim() } } },
          ],
        },
        include: { customer: true, claims: true },
        orderBy: { receivedAt: "desc" },
        take: 30,
      })
    : [];

  // Garansi aktif (unit sudah diambil, masa garansi belum habis)
  const recent = await prisma.service.findMany({
    where: { status: "DIAMBIL", pickedUpAt: { gte: new Date(Date.now() - 365 * 86400000) }, warrantyDays: { gt: 0 } },
    include: { customer: true },
    orderBy: { pickedUpAt: "desc" },
  });
  const active = recent.map((s) => ({ s, w: warrantyInfo(s) })).filter((x) => x.w.active);
  const claims = await prisma.service.findMany({ where: { isWarrantyClaim: true }, include: { customer: true, parent: true }, orderBy: { receivedAt: "desc" }, take: 20 });

  return (
    <div>
      <PageHeader title="Garansi Servis" subtitle="Cek masa garansi dan buat klaim garansi berdasarkan nota" />
      <form className="card p-3 mb-6 flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Nomor nota, serial number, no HP, atau nama pelanggan" autoFocus />
        <button className="btn-primary">Cek Garansi</button>
      </form>

      {q && (
        <div className="card overflow-x-auto mb-6">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold">Hasil pencarian “{q}”</div>
          <table className="table">
            <thead><tr><th>Nota</th><th>Pelanggan / Unit</th><th>Status</th><th>Garansi</th><th></th></tr></thead>
            <tbody>
              {found.map((s) => {
                const w = warrantyInfo(s);
                return (
                  <tr key={s.id}>
                    <td><Link href={`/servis/${s.id}`} className="text-brand-600 font-medium">{s.number}</Link><div className="text-xs text-slate-500">{tgl(s.receivedAt)}</div></td>
                    <td>{s.customer.name}<div className="text-xs text-slate-500">{s.deviceBrand} {s.deviceModel}</div></td>
                    <td><StatusBadge status={s.status} /></td>
                    <td>
                      {s.status !== "DIAMBIL" ? (
                        <span className="text-xs text-slate-500">Belum diambil (garansi mulai saat diambil)</span>
                      ) : w.active ? (
                        <span className="badge bg-emerald-100 text-emerald-700">Aktif s/d {tgl(w.until)}</span>
                      ) : (
                        <span className="badge bg-rose-100 text-rose-700">Habis {tgl(w.until)}</span>
                      )}
                      {s.claims.length > 0 && <div className="text-xs text-violet-600 mt-1">{s.claims.length}x diklaim</div>}
                    </td>
                    <td className="text-right">
                      {w.active && <Link href={`/servis/baru?klaim=${s.id}`} className="btn-primary btn-sm">Buat Klaim</Link>}
                    </td>
                  </tr>
                );
              })}
              {found.length === 0 && <tr><td colSpan={5} className="text-center py-6 text-slate-500">Tidak ditemukan</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold">Garansi masih aktif ({active.length})</div>
          <table className="table">
            <thead><tr><th>Nota</th><th>Pelanggan</th><th>Berlaku s/d</th></tr></thead>
            <tbody>
              {active.slice(0, 30).map(({ s, w }) => (
                <tr key={s.id}>
                  <td><Link href={`/servis/${s.id}`} className="text-brand-600">{s.number}</Link></td>
                  <td>{s.customer.name}<div className="text-xs text-slate-500">{s.deviceBrand} {s.deviceModel}</div></td>
                  <td>{tgl(w.until)}</td>
                </tr>
              ))}
              {active.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-500">Belum ada</td></tr>}
            </tbody>
          </table>
        </div>
        <div className="card overflow-x-auto">
          <div className="px-4 py-3 border-b border-slate-200 font-semibold">Riwayat Klaim Garansi</div>
          <table className="table">
            <thead><tr><th>Nota klaim</th><th>Nota asal</th><th>Status</th></tr></thead>
            <tbody>
              {claims.map((c) => (
                <tr key={c.id}>
                  <td><Link href={`/servis/${c.id}`} className="text-brand-600">{c.number}</Link><div className="text-xs text-slate-500">{c.customer.name}</div></td>
                  <td>{c.parent && <Link href={`/servis/${c.parent.id}`} className="text-brand-600">{c.parent.number}</Link>}</td>
                  <td><StatusBadge status={c.status} /></td>
                </tr>
              ))}
              {claims.length === 0 && <tr><td colSpan={3} className="text-center py-6 text-slate-500">Belum ada klaim</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
