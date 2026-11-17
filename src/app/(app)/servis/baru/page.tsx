import { prisma } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { createService } from "@/app/actions/service";
import PageHeader from "@/components/PageHeader";
import CustomerFields from "./CustomerFields";

const BRANDS = ["ASUS", "Acer", "Lenovo", "HP", "Dell", "Apple", "MSI", "Toshiba", "Samsung", "Axioo", "Advan", "Huawei", "Xiaomi", "Lainnya"];
const ACCESSORIES = ["Charger", "Tas", "Mouse", "Baterai cadangan", "Dus / box", "Kabel data"];

export default async function NewService({ searchParams }: { searchParams: Promise<{ err?: string; customer?: string; klaim?: string }> }) {
  await requireUser(["OWNER", "ADMIN"]);
  const sp = await searchParams;
  const [techs, settings] = await Promise.all([
    prisma.user.findMany({ where: { role: "TEKNISI", active: true }, orderBy: { name: "asc" } }),
    getSettings(),
  ]);
  const parent = sp.klaim ? await prisma.service.findUnique({ where: { id: parseInt(sp.klaim, 10) }, include: { customer: true } }) : null;
  const customer = parent?.customer || (sp.customer ? await prisma.customer.findUnique({ where: { id: parseInt(sp.customer, 10) } }) : null);

  return (
    <div className="max-w-4xl">
      <PageHeader
        title={parent ? "Klaim Garansi" : "Terima Servis Baru"}
        subtitle={parent ? `Klaim atas nota ${parent.number} — biaya jasa tidak dikenakan bila kerusakan sama` : "Isi data pelanggan dan unit yang diterima"}
      />
      {sp.err && <div className="card p-3 mb-4 text-sm text-rose-700 bg-rose-50 border-rose-200">{sp.err}</div>}

      <form action={createService} className="space-y-6">
        {parent && <input type="hidden" name="parentId" value={parent.id} />}
        <section className="card p-5">
          <h2 className="font-semibold mb-4">1. Data Pelanggan</h2>
          <CustomerFields initial={customer ? { name: customer.name, phone: customer.phone, address: customer.address, email: customer.email } : undefined} />
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-4">2. Data Unit</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Jenis</label>
              <select name="deviceType" className="input" defaultValue={parent?.deviceType || "Laptop"}>
                {["Laptop", "Notebook", "MacBook", "Netbook", "Ultrabook", "Laptop Gaming", "PC / AIO", "Lainnya"].map((t) => <option key={t}>{t}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Merk *</label>
              <input name="deviceBrand" className="input" list="brands" required defaultValue={parent?.deviceBrand} />
              <datalist id="brands">{BRANDS.map((b) => <option key={b} value={b} />)}</datalist>
            </div>
            <div>
              <label className="label">Tipe / Model *</label>
              <input name="deviceModel" className="input" required defaultValue={parent?.deviceModel} placeholder="mis. VivoBook X441" />
            </div>
            <div>
              <label className="label">Serial Number</label>
              <input name="serialNumber" className="input" defaultValue={parent?.serialNumber || ""} />
            </div>
            <div>
              <label className="label">Password / PIN unit</label>
              <input name="devicePassword" className="input" placeholder="Untuk pengecekan" />
            </div>
            <div>
              <label className="label">Kondisi fisik</label>
              <input name="physicalCondition" className="input" placeholder="mis. lecet, engsel patah" />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Keluhan *</label>
              <textarea name="complaint" className="input" rows={3} required placeholder="Jelaskan keluhan pelanggan" />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Kelengkapan yang dititipkan</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {ACCESSORIES.map((a) => (
                  <span key={a} className="badge bg-slate-100 text-slate-600">{a}</span>
                ))}
              </div>
              <input name="accessories" className="input" placeholder="mis. Charger, Tas" />
            </div>
          </div>
        </section>

        <section className="card p-5">
          <h2 className="font-semibold mb-4">3. Penugasan & Biaya</h2>
          <div className="grid sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Teknisi</label>
              <select name="technicianId" className="input" defaultValue={parent?.technicianId || ""}>
                <option value="">— Tentukan nanti —</option>
                {techs.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Estimasi biaya (Rp)</label>
              <input name="estimatedCost" className="input" inputMode="numeric" placeholder="0" />
            </div>
            <div>
              <label className="label">Estimasi selesai</label>
              <input name="estimatedDone" type="date" className="input" />
            </div>
            <div>
              <label className="label">Uang muka / DP (Rp)</label>
              <input name="downPayment" className="input" inputMode="numeric" placeholder="0" />
            </div>
            <div>
              <label className="label">Metode DP</label>
              <select name="dpMethod" className="input">
                {["TUNAI", "TRANSFER", "QRIS", "DEBIT"].map((m) => <option key={m}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Garansi servis (hari)</label>
              <input name="warrantyDays" type="number" min={0} className="input" defaultValue={settings.defaultWarrantyDays || 30} />
            </div>
            <div className="sm:col-span-3">
              <label className="label">Catatan internal</label>
              <input name="notes" className="input" defaultValue={parent ? `Klaim garansi dari nota ${parent.number}` : ""} />
            </div>
          </div>
        </section>

        <div className="flex gap-2">
          <button className="btn-primary">Simpan & Buat Tanda Terima</button>
        </div>
      </form>
    </div>
  );
}
