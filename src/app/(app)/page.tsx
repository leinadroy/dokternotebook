import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { OPEN_STATUSES, STATUSES, STATUS_LABEL, rupiah, tgl } from "@/lib/format";
import StatusBadge from "@/components/StatusBadge";
import PageHeader from "@/components/PageHeader";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ denied?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const startDay = new Date();
  startDay.setHours(0, 0, 0, 0);
  const startMonth = new Date(startDay.getFullYear(), startDay.getMonth(), 1);
  const techFilter = user.role === "TEKNISI" ? { technicianId: user.id } : {};

  const [byStatus, todayIn, payToday, payMonth, readyCount, lowStock, recent, overdue] = await Promise.all([
    prisma.service.groupBy({ by: ["status"], _count: true, where: techFilter }),
    prisma.service.count({ where: { receivedAt: { gte: startDay } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startDay }, type: { not: "REFUND" } } }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { createdAt: { gte: startMonth }, type: { not: "REFUND" } } }),
    prisma.service.count({ where: { status: "SELESAI" } }),
    prisma.sparepart.findMany({ orderBy: { stock: "asc" }, take: 50 }),
    prisma.service.findMany({
      where: { ...techFilter, status: { in: OPEN_STATUSES } },
      include: { customer: true, technician: true },
      orderBy: { receivedAt: "desc" },
      take: 10,
    }),
    prisma.service.count({ where: { ...techFilter, status: { in: OPEN_STATUSES }, estimatedDone: { lt: new Date() } } }),
  ]);

  const counts = Object.fromEntries(byStatus.map((b) => [b.status, b._count]));
  const openCount = OPEN_STATUSES.reduce((a, s) => a + (counts[s] || 0), 0);
  const low = lowStock.filter((p) => p.stock <= p.minStock).slice(0, 6);
  const isTech = user.role === "TEKNISI";

  return (
    <div>
      <PageHeader title={`Halo, ${user.name}`} subtitle={new Date().toLocaleDateString("id-ID", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}>
        {!isTech && (
          <Link href="/servis/baru" className="btn-primary">
            + Terima Servis
          </Link>
        )}
      </PageHeader>

      {sp.denied && <div className="card p-3 mb-4 text-sm text-rose-700 bg-rose-50 border-rose-200">Anda tidak punya akses ke halaman tersebut.</div>}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Stat label={isTech ? "Tugas aktif saya" : "Servis aktif"} value={openCount} href="/servis?status=AKTIF" />
        <Stat label="Siap diambil" value={readyCount} href="/servis?status=SELESAI" tone="emerald" />
        {!isTech ? (
          <>
            <Stat label="Pemasukan hari ini" value={rupiah(payToday._sum.amount)} sub={`${todayIn} unit masuk hari ini`} />
            <Stat label="Pemasukan bulan ini" value={rupiah(payMonth._sum.amount)} href="/laporan" />
          </>
        ) : (
          <>
            <Stat label="Lewat estimasi" value={overdue} tone={overdue ? "rose" : undefined} />
            <Stat label="Unit masuk hari ini" value={todayIn} />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200">
            <h2 className="font-semibold">Servis berjalan terbaru</h2>
            <Link href="/servis" className="text-sm text-brand-600">Lihat semua →</Link>
          </div>
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Nota</th><th>Pelanggan / Unit</th><th>Teknisi</th><th>Status</th></tr>
              </thead>
              <tbody>
                {recent.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50">
                    <td>
                      <Link href={`/servis/${s.id}`} className="font-medium text-brand-600">{s.number}</Link>
                      <div className="text-xs text-slate-500">{tgl(s.receivedAt)}</div>
                    </td>
                    <td>
                      <div>{s.customer.name}</div>
                      <div className="text-xs text-slate-500">{s.deviceBrand} {s.deviceModel}</div>
                    </td>
                    <td className="text-slate-600">{s.technician?.name || <span className="text-amber-600">Belum ditugaskan</span>}</td>
                    <td><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
                {recent.length === 0 && (
                  <tr><td colSpan={4} className="text-center text-slate-500 py-8">Tidak ada servis berjalan 🎉</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          <div className="card p-4">
            <h2 className="font-semibold mb-3">Status servis</h2>
            <div className="space-y-2">
              {STATUSES.map((st) => (
                <Link key={st} href={`/servis?status=${st}`} className="flex items-center justify-between text-sm hover:bg-slate-50 rounded px-1 py-0.5">
                  <span className="text-slate-600">{STATUS_LABEL[st]}</span>
                  <span className="font-semibold">{counts[st] || 0}</span>
                </Link>
              ))}
            </div>
          </div>
          <div className="card p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Stok menipis</h2>
              <Link href="/sparepart?low=1" className="text-sm text-brand-600">Semua →</Link>
            </div>
            {low.length === 0 ? (
              <p className="text-sm text-slate-500">Semua stok aman.</p>
            ) : (
              <ul className="space-y-2 text-sm">
                {low.map((p) => (
                  <li key={p.id} className="flex justify-between gap-2">
                    <span className="truncate">{p.name}</span>
                    <span className={`font-semibold ${p.stock === 0 ? "text-rose-600" : "text-amber-600"}`}>{p.stock}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Stat({ label, value, sub, href, tone }: { label: string; value: React.ReactNode; sub?: string; href?: string; tone?: "emerald" | "rose" }) {
  const color = tone === "emerald" ? "text-emerald-600" : tone === "rose" ? "text-rose-600" : "text-slate-900";
  const inner = (
    <div className="card p-4 h-full hover:border-brand-300 transition">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-1">{sub}</div>}
    </div>
  );
  return href ? <Link href={href}>{inner}</Link> : inner;
}
