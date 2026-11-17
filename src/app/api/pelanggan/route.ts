import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/auth";
import { normPhone } from "@/lib/format";

// Cari pelanggan berdasarkan no HP (untuk auto-isi form terima servis)
export async function GET(req: NextRequest) {
  if (!(await getSession())) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const phone = normPhone(req.nextUrl.searchParams.get("phone") || "");
  if (phone.length < 8) return NextResponse.json(null);
  const c = await prisma.customer.findUnique({
    where: { phone },
    include: { _count: { select: { services: true } } },
  });
  return NextResponse.json(c ? { name: c.name, address: c.address, email: c.email, count: c._count.services } : null);
}
