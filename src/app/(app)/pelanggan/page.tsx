import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { tgl } from "@/lib/format";
import PageHeader from "@/components/PageHeader";

export default async function Customers({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  await requireUser();
  const { q } = await searchParams;
  const rows = await prisma.customer.findMany({
    where: q ? { OR: [{ name: { contains: q } }, { phone: { contains: q.replace(/^0/, "") } }, { address: { contains: q } }] } : {},
    include: { services: { select: { receivedAt: true }, orderBy: { receivedAt: "desc" } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div>
      <PageHeader title="Pelanggan" subtitle="Pelanggan otomatis tercatat saat menerima servis" />
      <form className="card p-3 mb-4 flex gap-2">
        <input name="q" defaultValue={q} className="input" placeholder="Cari nama, no HP, alamat..." />
        <button className="btn-secondary">Cari</button>
      </form>
      <div className="card overflow-x-auto">
        <table className="table">
          <thead><tr><th>Nama</th><th>No. HP</th><th>Alamat</th><th className="text-right">Jml Servis</th><th>Terakhir</th></tr></thead>
          <tbody>
            {rows.map((c) => (
              <tr key={c.id} className="hover:bg-slate-50">
                <td><Link href={`/pelanggan/${c.id}`} className="text-brand-600 font-medium">{c.name}</Link></td>
                <td>{c.phone}</td>
                <td className="text-slate-600">{c.address || "-"}</td>
                <td className="text-right">{c.services.length}</td>
                <td>{tgl(c.services[0]?.receivedAt)}</td>
              </tr>
            ))}
            {rows.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-slate-500">Tidak ada pelanggan</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}
