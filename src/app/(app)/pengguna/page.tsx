import Link from "next/link";
import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { ROLE_LABEL } from "@/lib/format";
import { saveUser } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";

export default async function Users({ searchParams }: { searchParams: Promise<{ edit?: string; msg?: string; err?: string }> }) {
  await requireUser(["OWNER"]);
  const sp = await searchParams;
  const users = await prisma.user.findMany({ orderBy: [{ active: "desc" }, { role: "asc" }, { name: "asc" }] });
  const editing = sp.edit ? users.find((u) => u.id === parseInt(sp.edit!, 10)) : null;

  return (
    <div className="max-w-5xl">
      <PageHeader title="Pengguna" subtitle="Kelola akun pemilik, admin/kasir, dan teknisi" />
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      {sp.err && <div className="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{sp.err}</div>}
      <div className="grid lg:grid-cols-3 gap-6">
        <div className="card lg:col-span-2 overflow-x-auto">
          <table className="table">
            <thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th></th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className={u.active ? "" : "opacity-50"}>
                  <td>{u.name}<div className="text-xs text-slate-500">{u.phone}</div></td>
                  <td className="font-mono text-xs">{u.username}</td>
                  <td>{ROLE_LABEL[u.role]}</td>
                  <td>{u.active ? <span className="badge bg-emerald-100 text-emerald-700">Aktif</span> : <span className="badge bg-slate-100">Nonaktif</span>}</td>
                  <td className="text-right"><Link href={`/pengguna?edit=${u.id}`} className="text-brand-600 text-xs">Ubah</Link></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <form action={saveUser} className="card p-5 space-y-3 h-fit" key={editing?.id || "new"}>
          <div className="flex justify-between">
            <h2 className="font-semibold">{editing ? "Ubah Pengguna" : "Tambah Pengguna"}</h2>
            {editing && <Link href="/pengguna" className="text-xs text-slate-500">Batal</Link>}
          </div>
          <input type="hidden" name="id" value={editing?.id || ""} />
          <div><label className="label">Nama</label><input name="name" className="input" required defaultValue={editing?.name} /></div>
          <div><label className="label">Username</label><input name="username" className="input" required defaultValue={editing?.username} /></div>
          <div>
            <label className="label">Peran</label>
            <select name="role" className="input" defaultValue={editing?.role || "TEKNISI"}>
              <option value="TEKNISI">Teknisi</option>
              <option value="ADMIN">Admin / Kasir</option>
              <option value="OWNER">Pemilik</option>
            </select>
          </div>
          <div><label className="label">No. HP</label><input name="phone" className="input" defaultValue={editing?.phone || ""} /></div>
          <div>
            <label className="label">{editing ? "Password baru (kosongkan jika tidak diganti)" : "Password"}</label>
            <input name="password" type="password" className="input" required={!editing} minLength={6} autoComplete="new-password" />
          </div>
          <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" value="1" defaultChecked={editing ? editing.active : true} /> Aktif</label>
          <button className="btn-primary">Simpan</button>
        </form>
      </div>
      <div className="card p-4 mt-6 text-sm text-slate-600">
        <b>Hak akses:</b> <b>Pemilik</b> — semua menu. <b>Admin/Kasir</b> — terima servis, pembayaran, sparepart, garansi, laporan. <b>Teknisi</b> — melihat servis yang ditugaskan/belum ditugaskan, isi diagnosa, tambah jasa & sparepart, ubah status.
      </div>
    </div>
  );
}
