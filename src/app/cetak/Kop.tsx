import type { Settings } from "@/lib/settings";

export default function Kop({ s, title, number }: { s: Settings; title: string; number: string }) {
  return (
    <div className="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
      <div className="flex gap-3 items-center">
        <img src="/icon.svg" alt="" className="w-12 h-12" />
        <div>
          <div className="text-xl font-bold">{s.storeName}</div>
          <div className="text-xs text-slate-600">{s.storeTagline}</div>
          <div className="text-xs text-slate-600">{s.storeAddress} · {s.storePhone}</div>
        </div>
      </div>
      <div className="text-right">
        <div className="text-lg font-bold uppercase">{title}</div>
        <div className="font-mono">{number}</div>
      </div>
    </div>
  );
}
