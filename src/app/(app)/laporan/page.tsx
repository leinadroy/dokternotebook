import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { STATUS_LABEL, rupiah, serviceTotals, tgl } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);

export default async function Laporan({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  await requireUser(["OWNER", "ADMIN"]);
  const sp = await searchParams;
  const now = new Date();
  const fromStr = sp.from || iso(new Date(now.getFullYear(), now.getMonth(), 1));
  const toStr = sp.to || iso(now);
  const from = new Date(fromStr + "T00:00:00");
  const to = new Date(toStr + "T23:59:59.999");
  const range = { gte: from, lte: to };

  const [payments, received, finished, items, techs, outstanding, statusGroups] = await Promise.all([
    prisma.payment.findMany({ where: { createdAt: range } }),
    prisma.service.count({ where: { receivedAt: range } }),
    prisma.service.findMany({ where: { finishedAt: range }, include: { items: true, technician: true } }),
    prisma.serviceItem.findMany({ where: { createdAt: range }, include: { sparepart: true } }),
    prisma.user.findMany({ where: { role: "TEKNISI" } }),
    prisma.service.findMany({ where: { status: { in: ["SELESAI", "DIAMBIL"] } }, include: { items: true, payments: true, customer: true } }),
    prisma.service.groupBy({ by: ["status"], _count: true, where: { receivedAt: range } }),
  ]);

  const income = payments.reduce((a, p) => a + (p.type === "REFUND" ? -p.amount : p.amount), 0);
  const byMethod: Record<string, number> = {};
  payments.forEach((p) => (byMethod[p.method] = (byMethod[p.method] || 0) + (p.type === "REFUND" ? -p.amount : p.amount)));

  const jasa = items.filter((i) => i.type === "JASA").reduce((a, i) => a + i.qty * i.price, 0);
  const partSales = items.filter((i) => i.type === "PART").reduce((a, i) => a + i.qty * i.price, 0);
  const partCost = items.filter((i) => i.type === "PART").reduce((a, i) => a + i.qty * i.costPrice, 0);

  // Harian
  const daily: Record<string, number> = {};
  for (let d = new Date(from); d <= to; d.setDate(d.getDate() + 1)) daily[iso(d)] = 0;
  payments.forEach((p) => {
    const k = iso(p.createdAt);
    if (k in daily) daily[k] += p.type === "REFUND" ? -p.amount : p.amount;
  });
  const dailyArr = Object.entries(daily);
  const maxDaily = Math.max(1, ...dailyArr.map(([, v]) => v));

  // Teknisi
  const perTech = techs.map((t) => {
    const done = finished.filter((s) => s.technicianId === t.id);
    return { name: t.name, count: done.length, jasa: done.reduce((a, s) => a + s.items.filter((i) => i.type === "JASA").reduce((b, i) => b + i.qty * i.price, 0), 0) };
  });

  // Sparepart terlaris
  const partMap: Record<string, { name: string; qty: number; omzet: number }> = {};
  items.filter((i) => i.type === "PART").forEach((i) => {
    const k = String(i.sparepartId);
    partMap[k] ??= { name: i.description, qty: 0, omzet: 0 };
    partMap[k].qty += i.qty;
    partMap[k].omzet += i.qty * i.price;
  });
  const topParts = Object.values(partMap).sort((a, b) => b.qty - a.qty).slice(0, 10);

  const piutang = outstanding.map((s) => ({ s, r: serviceTotals(s).remaining })).filter((x) => x.r > 0);
  const totalPiutang = piutang.reduce((a, x) => a + x.r, 0);

  return (
    <div>
      <PageHeader title="Laporan" subtitle={`Periode ${tgl(from)} – ${tgl(to)}`}>
        <form className="flex flex-wrap gap-2 items-center">
          <input type="date" name="from" defaultValue={fromStr} className="input w-auto" />
          <span className="text-slate-400">s/d</span>
          <input type="date" name="to" defaultValue={toStr} className="input w-auto" />
          <button className="btn-secondary">Tampilkan</button>
        </form>
      </PageHeader>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <Card label="Pemasukan (kas masuk)" value={rupiah(income)} />
        <Card label="Unit masuk" value={received} />
        <Card label="Unit selesai" value={finished.length} />
        <Card label="Laba kotor sparepart" value={rupiah(partSales - partCost)} sub={`Penjualan ${rupiah(partSales)}`} />
        <Card label="Pendapatan jasa" value={rupiah(jasa)} />
        <Card label="Penjualan sparepart" value={rupiah(partSales)} />
        <Card label="Estimasi laba kotor" value={rupiah(jasa + partSales - partCost)} sub="Jasa + margin sparepart" />
        <Card label="Piutang (belum lunas)" value={rupiah(totalPiutang)} sub={`${piutang.length} nota`} tone="rose" />
      </div>

      <div className="card p-5 mb-6">
        <h2 className="font-semibold mb-4">Pemasukan harian</h2>
        <div className="flex items-end gap-1 h-48 overflow-x-auto">
          {dailyArr.map(([d, v]) => (
            <div key={d} className="flex-1 min-w-3 flex flex-col items-center justify-end h-full group relative">
              <div className="w-full bg-brand-500 rounded-t hover:bg-brand-700" style={{ height: `${(v / maxDaily) * 100}%`, minHeight: v ? 2 : 0 }} title={`${d}: ${rupiah(v)}`} />
            </div>
          ))}
        </div>
        <div className="flex justify-between text-xs text-slate-500 mt-1">
          <span>{dailyArr[0]?.[0]}</span>
          <span>{dailyArr[dailyArr.length - 1]?.[0]}</span>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 mb-6">
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Per metode bayar</h2>
          <ul className="space-y-2 text-sm">
            {Object.entries(byMethod).map(([m, v]) => <li key={m} className="flex justify-between"><span>{m}</span><b>{rupiah(v)}</b></li>)}
            {payments.length === 0 && <li className="text-slate-500">Belum ada</li>}
          </ul>
          <h2 className="font-semibold mt-6 mb-3">Status unit masuk periode ini</h2>
          <ul className="space-y-1 text-sm">
            {statusGroups.map((g) => <li key={g.status} className="flex justify-between"><span>{STATUS_LABEL[g.status]}</span><b>{g._count}</b></li>)}
          </ul>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Kinerja teknisi</h2>
          <table className="table">
            <thead><tr><th>Teknisi</th><th className="text-right">Selesai</th><th className="text-right">Jasa</th></tr></thead>
            <tbody>
              {perTech.map((t) => <tr key={t.name}><td>{t.name}</td><td className="text-right">{t.count}</td><td className="text-right">{rupiah(t.jasa)}</td></tr>)}
            </tbody>
          </table>
        </div>
        <div className="card p-5">
          <h2 className="font-semibold mb-3">Sparepart terlaris</h2>
          <table className="table">
            <thead><tr><th>Sparepart</th><th className="text-right">Qty</th><th className="text-right">Omzet</th></tr></thead>
            <tbody>
              {topParts.map((p) => <tr key={p.name}><td>{p.name}</td><td className="text-right">{p.qty}</td><td className="text-right">{rupiah(p.omzet)}</td></tr>)}
              {topParts.length === 0 && <tr><td colSpan={3} className="text-slate-500 text-center py-4">Belum ada</td></tr>}
            </tbody>
          </table>
        </div>
      </div>

      <div className="card overflow-x-auto">
        <div className="px-4 py-3 border-b border-slate-200 font-semibold">Daftar piutang (semua periode)</div>
        <table className="table">
          <thead><tr><th>Nota</th><th>Pelanggan</th><th>Status</th><th className="text-right">Sisa</th></tr></thead>
          <tbody>
            {piutang.map(({ s, r }) => (
              <tr key={s.id}>
                <td><Link href={`/servis/${s.id}`} className="text-brand-600">{s.number}</Link></td>
                <td>{s.customer.name}</td>
                <td>{STATUS_LABEL[s.status]}</td>
                <td className="text-right text-rose-600 font-medium">{rupiah(r)}</td>
              </tr>
            ))}
            {piutang.length === 0 && <tr><td colSpan={4} className="text-center py-6 text-slate-500">Tidak ada piutang 👍</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Card({ label, value, sub, tone }: { label: string; value: React.ReactNode; sub?: string; tone?: "rose" }) {
  return (
    <div className="card p-4">
      <div className="text-xs text-slate-500">{label}</div>
      <div className={`text-xl font-bold mt-1 ${tone === "rose" ? "text-rose-600" : ""}`}>{value}</div>
      {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
    </div>
  );
}
