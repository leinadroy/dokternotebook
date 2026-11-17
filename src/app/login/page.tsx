import Link from "next/link";
import LoginForm from "./LoginForm";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function LoginPage() {
  const s = await getSettings();
  return (
    <div className="min-h-screen grid place-items-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
      <div className="card w-full max-w-sm p-7">
        <div className="flex items-center gap-3 mb-6">
          <img src="/icon.svg" alt="" className="w-11 h-11" />
          <div>
            <h1 className="font-bold text-lg leading-tight">{s.storeName || "Dokter Notebook"}</h1>
            <p className="text-xs text-slate-500">{s.storeTagline}</p>
          </div>
        </div>
        <LoginForm />
        <p className="text-center text-xs text-slate-500 mt-6">
          Pelanggan?{" "}
          <Link href="/cek" className="text-brand-600 font-medium">
            Cek status servis di sini
          </Link>
        </p>
      </div>
    </div>
  );
}
