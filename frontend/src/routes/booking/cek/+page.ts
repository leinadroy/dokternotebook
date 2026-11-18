import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const kode = (url.searchParams.get('kode') || '').trim().toUpperCase();
	const hp = (url.searchParams.get('hp') || '').replace(/\D/g, '');
	if (!kode || !hp) return { kode, hp, b: null as any, error: '' };
	const r = await api('/public/booking', { query: { kode, hp } });
	return { kode, hp, b: r.ok ? r.data : null, error: r.ok ? '' : r.data?.message || 'Booking tidak ditemukan' };
};
