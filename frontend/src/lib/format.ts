export const rupiah = (n: number | null | undefined) =>
	'Rp ' + new Intl.NumberFormat('id-ID').format(Math.round(n || 0));

export const tgl = (d: string | Date | null | undefined) =>
	d ? new Date(d).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' }) : '-';

export const tglJam = (d: string | Date | null | undefined) =>
	d
		? new Date(d).toLocaleString('id-ID', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
		: '-';

export const STATUSES = [
	'DITERIMA',
	'DIAGNOSA',
	'MENUNGGU_KONFIRMASI',
	'MENUNGGU_SPAREPART',
	'DIKERJAKAN',
	'SELESAI',
	'DIAMBIL',
	'BATAL'
] as const;

export const STATUS_LABEL: Record<string, string> = {
	DITERIMA: 'Diterima',
	DIAGNOSA: 'Diagnosa',
	MENUNGGU_KONFIRMASI: 'Menunggu Konfirmasi',
	MENUNGGU_SPAREPART: 'Menunggu Sparepart',
	DIKERJAKAN: 'Dikerjakan',
	SELESAI: 'Selesai',
	DIAMBIL: 'Diambil',
	BATAL: 'Batal'
};

export const STATUS_COLOR: Record<string, string> = {
	DITERIMA: 'bg-slate-100 text-slate-700',
	DIAGNOSA: 'bg-sky-100 text-sky-700',
	MENUNGGU_KONFIRMASI: 'bg-amber-100 text-amber-800',
	MENUNGGU_SPAREPART: 'bg-orange-100 text-orange-800',
	DIKERJAKAN: 'bg-indigo-100 text-indigo-700',
	SELESAI: 'bg-emerald-100 text-emerald-700',
	DIAMBIL: 'bg-teal-100 text-teal-800',
	BATAL: 'bg-rose-100 text-rose-700'
};

export const BOOKING_LABEL: Record<string, string> = {
	BARU: 'Baru',
	DIKONFIRMASI: 'Dikonfirmasi',
	DITERIMA: 'Unit diterima',
	BATAL: 'Batal'
};

export const BOOKING_COLOR: Record<string, string> = {
	BARU: 'bg-amber-100 text-amber-800',
	DIKONFIRMASI: 'bg-sky-100 text-sky-700',
	DITERIMA: 'bg-emerald-100 text-emerald-700',
	BATAL: 'bg-rose-100 text-rose-700'
};

export const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

/** "2026-11-19" -> "Kamis, 19 Nov 2026" */
export const tglHari = (d: string | null | undefined) =>
	d ? new Date(d + 'T00:00:00').toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' }) : '-';

export const ROLE_LABEL: Record<string, string> = { OWNER: 'Pemilik', ADMIN: 'Admin / Kasir', TEKNISI: 'Teknisi' };
export const METHODS = ['TUNAI', 'TRANSFER', 'QRIS', 'DEBIT'];
export const isManager = (role?: string) => role === 'OWNER' || role === 'ADMIN';

/** Tanggal lokal YYYY-MM-DD */
export const isoDate = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
