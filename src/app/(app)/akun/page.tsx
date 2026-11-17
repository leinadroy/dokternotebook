import { requireUser } from "@/lib/auth";
import { changeOwnPassword } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";

export default async function Akun({ searchParams }: { searchParams: Promise<{ msg?: string; err?: string }> }) {
  const user = await requireUser();
  const sp = await searchParams;
  return (
    <div className="max-w-md">
      <PageHeader title="Akun Saya" subtitle={user.name} />
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      {sp.err && <div className="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{sp.err}</div>}
      <form action={changeOwnPassword} className="card p-5 space-y-3">
        <h2 className="font-semibold">Ganti Password</h2>
        <div><label className="label">Password lama</label><input name="old" type="password" className="input" required autoComplete="current-password" /></div>
        <div><label className="label">Password baru</label><input name="new" type="password" className="input" required minLength={6} autoComplete="new-password" /></div>
        <button className="btn-primary">Simpan</button>
      </form>
    </div>
  );
}
