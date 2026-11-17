import { api } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const nota = (url.searchParams.get('nota') || '').trim().toUpperCase();
	const hp = (url.searchParams.get('hp') || '').replace(/\D/g, '');
	if (!nota || !hp) return { nota, hp, svc: null as any, error: '' };
	const r = await api('/public/cek', { query: { nota, hp } });
	return { nota, hp, svc: r.ok ? r.data : null, error: r.ok ? '' : r.data?.message || 'Data tidak ditemukan' };
};
