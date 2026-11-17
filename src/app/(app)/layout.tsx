import Sidebar from "@/components/Sidebar";
import { requireUser } from "@/lib/auth";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await requireUser();
  const s = await getSettings();
  return (
    <div className="md:flex min-h-screen">
      <Sidebar user={user} storeName={s.storeName || "Dokter Notebook"} />
      <main className="flex-1 min-w-0 p-4 md:p-8">{children}</main>
    </div>
  );
}
