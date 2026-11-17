import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { OPEN_STATUSES, STATUSES, STATUS_LABEL, rupiah, serviceTotals, tgl } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";

type SP = { q?: string; status?: string; tech?: string; page?: string };

export default async function ServisList({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const page = Math.max(1, parseInt(sp.page || "1", 10));
  const per = 25;

  const where: Prisma.ServiceWhereInput = {};
  if (sp.status === "AKTIF") where.status = { in: OPEN_STATUSES };
  else if (sp.status) where.status = sp.status;
  if (user.role === "TEKNISI") where.OR = [{ technicianId: user.id }, { technicianId: null }];
  else if (sp.tech) where.technicianId = sp.tech === "none" ? null : parseInt(sp.tech, 10);
  if (sp.q) {
    const q = sp.q.trim();
    where.AND = [
      {
        OR: [
          { number: { contains: q } },
          { deviceBrand: { contains: q } },
          { deviceModel: { contains: q } },
          { serialNumber: { contains: q } },
          { customer: { name: { contains: q } } },
          { customer: { phone: { contains: q.replace(/^0/, "") } } },
        ],
      },
    ];
  }

  const [rows, total, techs] = await Promise.all([
    prisma.service.findMany({
      where,
      include: { customer: true, technician: true, items: true, payments: true },
      orderBy: { receivedAt: "desc" },
      skip: (page - 1) * per,
      take: per,
    }),
    prisma.service.count({ where }),
    prisma.user.findMany({ where: { role: "TEKNISI", active: true }, orderBy: { name: "asc" } }),
  ]);
  const pages = Math.max(1, Math.ceil(total / per));
  const qs = (p: number) => {
    const u = new URLSearchParams(Object.entries({ ...sp, page: String(p) }).filter(([, v]) => v) as [string, string][]);
    return `/servis?${u}`;
  };

  return (
    <div>
      <PageHeader title="Daftar Servis" subtitle={`${total} servis ditemukan`}>
        {user.role !== "TEKNISI" && <Link href="/servis/baru" className="btn-primary">+ Terima Servis</Link>}
      </PageHeader>

      <form className="card p-3 mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={sp.q} placeholder="Cari nota, nama, HP, merk, SN..." className="input flex-1 min-w-48" />
        <select name="status" defaultValue={sp.status || ""} className="input w-auto">
          <option value="">Semua status</option>
          <option value="AKTIF">Sedang berjalan</option>
          {STATUSES.map((s) => (
            <option key={s} value={s}>{STATUS_LABEL[s]}</option>
          ))}
        </select>
        {user.role !== "TEKNISI" && (
          <select name="tech" defaultValue={sp.tech || ""} className="input w-auto">
            <option value="">Semua teknisi</option>
            <option value="none">Belum ditugaskan</option>
            {techs.map((t) => (
              <option key={t.id} value={t.id}>{t.name}</option>
            ))}
          </select>
        )}
        <button className="btn-secondary">Filter</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="table">
          <thead>
            <tr>
              <th>Nota</th>
              <th>Pelanggan</th>
              <th>Unit & Keluhan</th>
              <th>Teknisi</th>
              <th>Status</th>
              <th className="text-right">Tagihan</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((s) => {
              const t = serviceTotals(s);
              return (
                <tr key={s.id} className="hover:bg-slate-50">
                  <td>
                    <Link href={`/servis/${s.id}`} className="font-medium text-brand-600">{s.number}</Link>
                    <div className="text-xs text-slate-500">{tgl(s.receivedAt)}</div>
                    {s.isWarrantyClaim && <span className="badge bg-violet-100 text-violet-700 mt-1">Klaim garansi</span>}
                  </td>
                  <td>
                    <div>{s.customer.name}</div>
                    <div className="text-xs text-slate-500">{s.customer.phone}</div>
                  </td>
                  <td className="max-w-xs">
                    <div className="font-medium">{s.deviceBrand} {s.deviceModel}</div>
                    <div className="text-xs text-slate-500 line-clamp-2">{s.complaint}</div>
                  </td>
                  <td className="text-slate-600">{s.technician?.name || <span className="text-amber-600 text-xs">Belum ditugaskan</span>}</td>
                  <td><StatusBadge status={s.status} /></td>
                  <td className="text-right whitespace-nowrap">
                    <div>{rupiah(t.total || s.estimatedCost)}</div>
                    {t.remaining > 0 && <div className="text-xs text-rose-600">Sisa {rupiah(t.remaining)}</div>}
                    {t.total > 0 && t.remaining <= 0 && <div className="text-xs text-emerald-600">Lunas</div>}
                  </td>
                </tr>
              );
            })}
            {rows.length === 0 && (
              <tr><td colSpan={6} className="text-center py-10 text-slate-500">Tidak ada data servis.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="flex justify-center gap-2 mt-4">
          {page > 1 && <Link href={qs(page - 1)} className="btn-secondary btn-sm">← Sebelumnya</Link>}
          <span className="text-sm text-slate-500 self-center">Hal {page} / {pages}</span>
          {page < pages && <Link href={qs(page + 1)} className="btn-secondary btn-sm">Berikutnya →</Link>}
        </div>
      )}
    </div>
  );
}
