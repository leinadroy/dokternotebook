import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { saveSettings } from "@/app/actions/admin";
import PageHeader from "@/components/PageHeader";

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ msg?: string }> }) {
  await requireUser(["OWNER"]);
  const sp = await searchParams;
  const s = await getSettings();

  return (
    <div className="max-w-3xl">
      <PageHeader title="Pengaturan" subtitle="Identitas toko, nota, dan notifikasi WhatsApp" />
      {sp.msg && <div className="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{sp.msg}</div>}
      <form action={saveSettings} className="space-y-6">
        <section className="card p-5 grid sm:grid-cols-2 gap-4">
          <h2 className="font-semibold sm:col-span-2">Identitas Toko</h2>
          <div><label className="label">Nama toko</label><input name="storeName" className="input" defaultValue={s.storeName} /></div>
          <div><label className="label">Tagline</label><input name="storeTagline" className="input" defaultValue={s.storeTagline} /></div>
          <div className="sm:col-span-2"><label className="label">Alamat</label><input name="storeAddress" className="input" defaultValue={s.storeAddress} /></div>
          <div><label className="label">Telepon / WA toko</label><input name="storePhone" className="input" defaultValue={s.storePhone} /></div>
          <div><label className="label">Garansi default (hari)</label><input name="defaultWarrantyDays" type="number" className="input" defaultValue={s.defaultWarrantyDays} /></div>
          <div className="sm:col-span-2"><label className="label">Catatan kaki nota (syarat & ketentuan)</label><textarea name="receiptFooter" rows={3} className="input" defaultValue={s.receiptFooter} /></div>
        </section>

        <section className="card p-5 space-y-4">
          <h2 className="font-semibold">WhatsApp & Cek Status Online</h2>
          <div>
            <label className="label">Alamat web aplikasi (untuk link cek status di nota & WA)</label>
            <input name="publicUrl" className="input" defaultValue={s.publicUrl} placeholder="https://servis.tokoanda.com" />
          </div>
          <div>
            <label className="label">Template pesan WA</label>
            <textarea name="waTemplate" rows={4} className="input font-mono text-xs" defaultValue={s.waTemplate} />
            <p className="text-xs text-slate-500 mt-1">Variabel: {"{nama} {nota} {perangkat} {toko} {status} {catatan} {link}"}</p>
          </div>
          <div>
            <label className="label">Token Fonnte (opsional — untuk kirim WA otomatis)</label>
            <input name="fonnteToken" type="password" className="input" defaultValue={s.fonnteToken} autoComplete="off" />
            <p className="text-xs text-slate-500 mt-1">
              Kosongkan jika tidak pakai. Tanpa token, kirim WA manual lewat tombol &ldquo;WhatsApp Pelanggan&rdquo; (membuka wa.me dengan pesan otomatis terisi).
            </p>
          </div>
        </section>
        <button className="btn-primary">Simpan Pengaturan</button>
      </form>
    </div>
  );
}
