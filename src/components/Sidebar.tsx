"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { logoutAction } from "@/app/actions/auth";

type Item = { href: string; label: string; icon: string; roles?: string[] };
const ITEMS: Item[] = [
  { href: "/", label: "Dashboard", icon: "M3 12l9-9 9 9M5 10v10h14V10" },
  { href: "/servis", label: "Servis", icon: "M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z" },
  { href: "/servis/baru", label: "Terima Servis", icon: "M12 5v14M5 12h14", roles: ["OWNER", "ADMIN"] },
  { href: "/pelanggan", label: "Pelanggan", icon: "M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z" },
  { href: "/sparepart", label: "Sparepart & Stok", icon: "M4 7l8-4 8 4-8 4-8-4zM4 7v10l8 4 8-4V7" },
  { href: "/garansi", label: "Garansi", icon: "M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z", roles: ["OWNER", "ADMIN"] },
  { href: "/laporan", label: "Laporan", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2", roles: ["OWNER", "ADMIN"] },
  { href: "/pengguna", label: "Pengguna", icon: "M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 20v-1a4 4 0 0 0-3-3.9", roles: ["OWNER"] },
  { href: "/pengaturan", label: "Pengaturan", icon: "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1", roles: ["OWNER"] },
];

const ROLE: Record<string, string> = { OWNER: "Pemilik", ADMIN: "Admin / Kasir", TEKNISI: "Teknisi" };

export default function Sidebar({ user, storeName }: { user: { name: string; role: string }; storeName: string }) {
  const path = usePathname();
  const [open, setOpen] = useState(false);
  const items = ITEMS.filter((i) => !i.roles || i.roles.includes(user.role));
  const isActive = (href: string) =>
    href === "/"
      ? path === "/"
      : href === "/servis"
        ? path.startsWith("/servis") && path !== "/servis/baru"
        : path.startsWith(href);

  return (
    <>
      <div className="no-print md:hidden sticky top-0 z-30 flex items-center justify-between bg-brand-900 text-white px-4 h-14">
        <span className="font-semibold">{storeName}</span>
        <button onClick={() => setOpen(!open)} className="p-2" aria-label="Menu">
          <svg width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M3 6h16M3 11h16M3 16h16" />
          </svg>
        </button>
      </div>
      <aside
        className={`no-print fixed md:sticky top-0 z-40 h-screen w-64 shrink-0 bg-brand-900 text-white flex flex-col transition-transform ${
          open ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        <div className="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
          <img src="/icon.svg" alt="" className="w-8 h-8" />
          <span className="font-bold">{storeName}</span>
        </div>
        <nav className="flex-1 overflow-y-auto p-3 space-y-0.5">
          {items.map((i) => (
            <Link
              key={i.href}
              href={i.href}
              onClick={() => setOpen(false)}
              className={`flex items-center gap-3 rounded-lg px-3 py-2 text-sm ${
                isActive(i.href) ? "bg-white/15 font-medium" : "text-white/75 hover:bg-white/10 hover:text-white"
              }`}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <path d={i.icon} />
              </svg>
              {i.label}
            </Link>
          ))}
        </nav>
        <div className="p-4 border-t border-white/10 text-sm">
          <div className="font-medium">{user.name}</div>
          <div className="text-white/60 text-xs mb-3">{ROLE[user.role] || user.role}</div>
          <div className="flex gap-4">
            <Link href="/akun" className="text-xs text-white/70 hover:text-white">Ganti password</Link>
            <form action={logoutAction}>
              <button className="text-xs text-white/70 hover:text-white cursor-pointer">Keluar →</button>
            </form>
          </div>
        </div>
      </aside>
      {open && <div className="no-print fixed inset-0 z-30 bg-black/40 md:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}
