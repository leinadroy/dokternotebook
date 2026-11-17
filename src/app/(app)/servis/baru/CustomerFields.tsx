"use client";
import { useState } from "react";

type C = { name?: string; phone?: string; address?: string | null; email?: string | null };

export default function CustomerFields({ initial }: { initial?: C }) {
  const [name, setName] = useState(initial?.name || "");
  const [address, setAddress] = useState(initial?.address || "");
  const [email, setEmail] = useState(initial?.email || "");
  const [info, setInfo] = useState("");

  async function lookup(phone: string) {
    if (phone.replace(/\D/g, "").length < 8) return;
    const r = await fetch(`/api/pelanggan?phone=${encodeURIComponent(phone)}`);
    const c = await r.json();
    if (c) {
      setName(c.name);
      setAddress(c.address || "");
      setEmail(c.email || "");
      setInfo(`Pelanggan lama · ${c.count}x servis`);
    } else setInfo("Pelanggan baru");
  }

  return (
    <div className="grid sm:grid-cols-2 gap-4">
      <div>
        <label className="label">No. HP / WhatsApp *</label>
        <input name="phone" className="input" required defaultValue={initial?.phone} placeholder="08xxxxxxxxxx" onBlur={(e) => lookup(e.target.value)} inputMode="tel" />
        {info && <p className="text-xs text-brand-600 mt-1">{info}</p>}
      </div>
      <div>
        <label className="label">Nama pelanggan *</label>
        <input name="customerName" className="input" required value={name} onChange={(e) => setName(e.target.value)} />
      </div>
      <div>
        <label className="label">Alamat</label>
        <input name="address" className="input" value={address} onChange={(e) => setAddress(e.target.value)} />
      </div>
      <div>
        <label className="label">Email</label>
        <input name="email" type="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} />
      </div>
    </div>
  );
}
