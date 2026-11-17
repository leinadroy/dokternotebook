import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

// Akun default — SEGERA ganti password setelah login pertama (menu Pengguna).
const users = [
  { name: "Pemilik", username: "owner", password: "owner123", role: "OWNER" },
  { name: "Admin Kasir", username: "admin", password: "admin123", role: "ADMIN" },
  { name: "Budi Teknisi", username: "budi", password: "teknisi123", role: "TEKNISI" },
  { name: "Andi Teknisi", username: "andi", password: "teknisi123", role: "TEKNISI" },
];

const settings = {
  storeName: "Dokter Notebook",
  storeTagline: "Service Center Laptop & Notebook",
  storeAddress: "Jl. Contoh No. 123, Kota Anda",
  storePhone: "0812-0000-0000",
  defaultWarrantyDays: "30",
  receiptFooter:
    "Barang yang tidak diambil lebih dari 3 bulan setelah pemberitahuan selesai di luar tanggung jawab kami. Garansi tidak berlaku jika segel rusak / terkena cairan / jatuh.",
  waTemplate:
    "Halo {nama}, update servis {nota} ({perangkat}) di {toko}: status sekarang *{status}*. {catatan}\nCek status: {link}",
  publicUrl: "http://localhost:3100",
  fonnteToken: "",
};

const parts = [
  ["RAM-D4-8", "RAM DDR4 8GB SODIMM", "RAM", 220000, 350000, 6],
  ["RAM-D4-16", "RAM DDR4 16GB SODIMM", "RAM", 420000, 600000, 3],
  ["SSD-256", "SSD SATA 256GB", "Storage", 250000, 400000, 5],
  ["SSD-512-NV", "SSD NVMe 512GB", "Storage", 450000, 700000, 4],
  ["LCD-14-HD", "LCD 14\" HD 30pin", "LCD", 550000, 850000, 2],
  ["LCD-156-FHD", "LCD 15.6\" FHD IPS 30pin", "LCD", 750000, 1150000, 1],
  ["KB-ASUS-X441", "Keyboard ASUS X441", "Keyboard", 90000, 175000, 3],
  ["KB-LEN-IP320", "Keyboard Lenovo IdeaPad 320", "Keyboard", 95000, 185000, 0],
  ["BAT-ACER-AS16", "Baterai Acer AS16A5K", "Baterai", 280000, 450000, 2],
  ["CHG-UNI-65W", "Charger Universal 65W", "Charger", 85000, 150000, 8],
  ["PASTA-MX4", "Thermal Paste MX-4", "Aksesoris", 15000, 50000, 20],
  ["FAN-HP-14", "Fan HP 14-bs", "Fan", 70000, 140000, 1],
];

async function main() {
  for (const u of users) {
    await prisma.user.upsert({
      where: { username: u.username },
      update: {},
      create: {
        name: u.name,
        username: u.username,
        role: u.role,
        passwordHash: await bcrypt.hash(u.password, 10),
      },
    });
  }

  for (const [key, value] of Object.entries(settings)) {
    await prisma.setting.upsert({ where: { key }, update: {}, create: { key, value } });
  }

  for (const [sku, name, category, buyPrice, sellPrice, stock] of parts) {
    await prisma.sparepart.upsert({
      where: { sku },
      update: {},
      create: { sku, name, category, buyPrice, sellPrice, stock, minStock: 2 },
    });
  }

  if ((await prisma.service.count()) === 0) {
    const budi = await prisma.user.findUnique({ where: { username: "budi" } });
    const admin = await prisma.user.findUnique({ where: { username: "admin" } });
    const c1 = await prisma.customer.create({
      data: { name: "Rina Wulandari", phone: "6281234567890", address: "Jl. Melati 5" },
    });
    const c2 = await prisma.customer.create({
      data: { name: "Agus Santoso", phone: "6285711112222", address: "Perum Griya Asri B2" },
    });
    const today = new Date();
    const ymd = today.toISOString().slice(2, 10).replace(/-/g, "");

    await prisma.service.create({
      data: {
        number: `DN${ymd}001`,
        customerId: c1.id,
        deviceBrand: "ASUS",
        deviceModel: "VivoBook X441",
        serialNumber: "K8N0CV123456",
        complaint: "Laptop mati total, tidak ada indikator",
        accessories: "Charger",
        physicalCondition: "Lecet di cover atas",
        status: "DIAGNOSA",
        technicianId: budi.id,
        createdById: admin.id,
        estimatedCost: 450000,
        logs: {
          create: [
            { status: "DITERIMA", note: "Unit diterima", userId: admin.id },
            { status: "DIAGNOSA", note: "Mulai pengecekan", userId: budi.id },
          ],
        },
        payments: { create: [{ amount: 100000, type: "DP", method: "TUNAI", userId: admin.id }] },
      },
    });

    await prisma.service.create({
      data: {
        number: `DN${ymd}002`,
        customerId: c2.id,
        deviceBrand: "Lenovo",
        deviceModel: "IdeaPad 320",
        complaint: "Keyboard beberapa tombol tidak berfungsi",
        accessories: "Tanpa charger",
        status: "DITERIMA",
        createdById: admin.id,
        logs: { create: [{ status: "DITERIMA", note: "Unit diterima", userId: admin.id }] },
      },
    });
  }

  console.log("Seed selesai.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
