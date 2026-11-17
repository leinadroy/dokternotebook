import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/db";
import { canManage, requireUser } from "@/lib/auth";
import { rupiah, tglJam } from "@/lib/format";
import { adjustStock, deleteSparepart, saveSparepart } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";

type SP = { q?: string; cat?: string; low?: string; edit?: string; msg?: string; err?: string };
const CATS = ["RAM", "Storage", "LCD", "Keyboard", "Baterai", "Charger", "Fan", "Motherboard", "IC / Chip", "Engsel / Casing", "Aksesoris", "Lainnya"];

export default async function Spareparts({ searchParams }: { searchParams: Promise<SP> }) {
  const user = await requireUser();
  const sp = await searchParams;
  const mgr = canManage(user.role);
  const where: Prisma.SparepartWhereInput = {};
  if (sp.q) where.OR = [{ name: { contains: sp.q } }, { sku: { contains: sp.q.toUpperCase() } }];
  if (sp.cat) where.category = sp.cat;

  let rows = await prisma.sparepart.findMany({ where, orderBy: [{ category: "asc" }, { name: "asc" }] });
  if (sp.low) rows = rows.filter((r) => r.stock <= r.minStock);
  const editing = sp.edit ? await prisma.sparepart.findUnique({ where: { id: parseInt(sp.edit, 10) } }) : null;
  const moves = await prisma.stockMovement.findMany({ include: { sparepart: true, service: true }, orderBy: { createdAt: "desc" }, take: 15 });
  const assetValue = rows.reduce((a, r) => a + r.stock * r.buyPrice, 0);
  const cats = Array.from(new Set([...CATS, ...rows.map((r) => r.category)]));

  return (
    <div>
      <PageHeader title="Sparepart & Stok" subtitle={`${rows.length} item${mgr ? ` · nilai stok (harga beli) ${rupiah(assetValue)}` : ""}`} />
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      {sp.err && <div className="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{sp.err}</div>}

      <div className="grid xl:grid-cols-3 gap-6">
        <div className="xl:col-span-2 space-y-4">
          <form className="card p-3 flex flex-wrap gap-2">
            <input name="q" defaultValue={sp.q} className="input flex-1 min-w-40" placeholder="Cari nama / kode..." />
            <select name="cat" defaultValue={sp.cat || ""} className="input w-auto">
              <option value="">Semua kategori</option>
              {cats.map((c) => <option key={c}>{c}</option>)}
            </select>
            <label className="flex items-center gap-1.5 text-sm px-2"><input type="checkbox" name="low" value="1" defaultChecked={!!sp.low} /> Stok menipis</label>
            <button className="btn-secondary">Filter</button>
          </form>

          <div className="card overflow-x-auto">
            <table className="table">
              <thead>
                <tr><th>Kode</th><th>Nama</th><th>Kategori</th>{mgr && <th className="text-right">Beli</th>}<th className="text-right">Jual</th><th className="text-right">Stok</th>{mgr && <th></th>}</tr>
              </thead>
              <tbody>
                {rows.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50">
                    <td className="font-mono text-xs">{p.sku}</td>
                    <td>{p.name}{p.location && <div className="text-xs text-slate-500">Rak: {p.location}</div>}</td>
                    <td>{p.category}</td>
                    {mgr && <td className="text-right">{rupiah(p.buyPrice)}</td>}
                    <td className="text-right">{rupiah(p.sellPrice)}</td>
                    <td className="text-right">
                      <span className={`font-semibold ${p.stock === 0 ? "text-rose-600" : p.stock <= p.minStock ? "text-amber-600" : ""}`}>{p.stock}</span>
                      <div className="text-xs text-slate-400">min {p.minStock}</div>
                    </td>
                    {mgr && (
                      <td className="whitespace-nowrap text-right">
                        <Link href={`/sparepart?edit=${p.id}`} className="text-brand-600 text-xs mr-2">Ubah/Stok</Link>
                        {user.role === "OWNER" && (
                          <form action={deleteSparepart.bind(null, p.id)} className="inline">
                            <button className="text-rose-600 text-xs cursor-pointer">Hapus</button>
                          </form>
                        )}
                      </td>
                    )}
                  </tr>
                ))}
                {rows.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500">Tidak ada sparepart</td></tr>}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-6">
          {mgr && (
            <form action={saveSparepart} className="card p-5 space-y-3" key={editing?.id || "new"}>
              <div className="flex justify-between items-center">
                <h2 className="font-semibold">{editing ? `Ubah: ${editing.name}` : "Tambah Sparepart"}</h2>
                {editing && <Link href="/sparepart" className="text-xs text-slate-500">Batal</Link>}
              </div>
              <input type="hidden" name="id" value={editing?.id || ""} />
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Kode / SKU</label><input name="sku" className="input" required defaultValue={editing?.sku} /></div>
                <div>
                  <label className="label">Kategori</label>
                  <select name="category" className="input" defaultValue={editing?.category || "Lainnya"}>{cats.map((c) => <option key={c}>{c}</option>)}</select>
                </div>
              </div>
              <div><label className="label">Nama</label><input name="name" className="input" required defaultValue={editing?.name} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="label">Harga beli</label><input name="buyPrice" className="input" inputMode="numeric" defaultValue={editing?.buyPrice} /></div>
                <div><label className="label">Harga jual</label><input name="sellPrice" className="input" inputMode="numeric" defaultValue={editing?.sellPrice} /></div>
                {!editing && <div><label className="label">Stok awal</label><input name="stock" className="input" inputMode="numeric" defaultValue={0} /></div>}
                <div><label className="label">Stok minimum</label><input name="minStock" className="input" inputMode="numeric" defaultValue={editing?.minStock ?? 1} /></div>
                <div><label className="label">Lokasi rak</label><input name="location" className="input" defaultValue={editing?.location || ""} /></div>
              </div>
              <button className="btn-primary">Simpan</button>
            </form>
          )}

          {mgr && editing && (
            <form action={adjustStock} className="card p-5 space-y-3">
              <h2 className="font-semibold">Mutasi Stok · sekarang {editing.stock}</h2>
              <input type="hidden" name="id" value={editing.id} />
              <div className="grid grid-cols-2 gap-3">
                <select name="type" className="input">
                  <option value="MASUK">Barang masuk (+)</option>
                  <option value="KELUAR">Barang keluar (−)</option>
                  <option value="PENYESUAIAN">Stok opname (set =)</option>
                </select>
                <input name="qty" className="input" inputMode="numeric" placeholder="Jumlah" required />
              </div>
              <input name="note" className="input" placeholder="Catatan, mis. beli dari supplier X" />
              <button className="btn-success">Simpan Mutasi</button>
            </form>
          )}

          <div className="card p-5">
            <h2 className="font-semibold mb-3">Mutasi Terakhir</h2>
            <ul className="space-y-2 text-sm">
              {moves.map((m) => (
                <li key={m.id} className="flex justify-between gap-2">
                  <div className="min-w-0">
                    <div className="truncate">{m.sparepart.name}</div>
                    <div className="text-xs text-slate-500">{tglJam(m.createdAt)} · {m.service ? <Link href={`/servis/${m.service.id}`} className="text-brand-600">{m.service.number}</Link> : m.note || m.type}</div>
                  </div>
                  <span className={`font-semibold ${m.qty > 0 ? "text-emerald-600" : "text-rose-600"}`}>{m.qty > 0 ? "+" : ""}{m.qty}</span>
                </li>
              ))}
              {moves.length === 0 && <li className="text-slate-500">Belum ada mutasi</li>}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
