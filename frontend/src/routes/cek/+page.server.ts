import { api } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const nota = (event.url.searchParams.get('nota') || '').trim().toUpperCase();
	const hp = (event.url.searchParams.get('hp') || '').replace(/\D/g, '');
	if (!nota || !hp) return { nota, hp, svc: null, error: '' };
	const r = await api(event, '/public/cek', { query: { nota, hp } });
	return { nota, hp, svc: r.ok ? r.data : null, error: r.ok ? '' : r.data?.message || 'Data tidak ditemukan' };
};
