import { redirect } from '@sveltejs/kit';
import { api } from '$lib/api';
import type { LayoutLoad } from './$types';

// Aplikasi berjalan sebagai SPA statis yang dilayani Laravel (cocok untuk shared hosting tanpa Node.js)
export const ssr = false;
export const prerender = false;

export type User = { id: number; name: string; username: string; role: 'OWNER' | 'ADMIN' | 'TEKNISI' };

const PUBLIC = ['/login', '/cek'];

export const load: LayoutLoad = async ({ url, depends }) => {
	depends('app:auth');
	const [me, st] = await Promise.all([api<User>('/me'), api<Record<string, string>>('/public/settings')]);
	const user = me.ok ? me.data : null;
	const isPublic = PUBLIC.some((p) => url.pathname === p || url.pathname.startsWith(p + '/'));
	if (!user && !isPublic) redirect(307, '/login');
	return { user, settings: (st.ok ? st.data : {}) as Record<string, string> };
};
