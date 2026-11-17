import { STATUS_COLOR, STATUS_LABEL } from "@/lib/format";

export default function StatusBadge({ status }: { status: string }) {
  return <span className={`badge ${STATUS_COLOR[status] || "bg-slate-100"}`}>{STATUS_LABEL[status] || status}</span>;
}
