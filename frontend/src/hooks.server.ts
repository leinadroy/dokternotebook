import { redirect, type Handle } from '@sveltejs/kit';
import { api, TOKEN_COOKIE } from '$lib/server/api';

const PUBLIC = ['/login', '/cek'];

export const handle: Handle = async ({ event, resolve }) => {
	event.locals.token = event.cookies.get(TOKEN_COOKIE) || null;
	event.locals.user = null;

	if (event.locals.token) {
		const r = await api(event, '/me');
		if (r.ok) event.locals.user = r.data;
		else {
			event.cookies.delete(TOKEN_COOKIE, { path: '/' });
			event.locals.token = null;
		}
	}

	const path = event.url.pathname;
	const isPublic = PUBLIC.some((p) => path === p || path.startsWith(p + '/'));
	if (!isPublic && !event.locals.user) redirect(303, '/login');

	return resolve(event);
};
