import { redirect } from '@sveltejs/kit';
import { api, TOKEN_COOKIE } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = () => redirect(303, '/');

export const actions: Actions = {
	default: async (event) => {
		if (event.locals.token) await api(event, '/logout', { method: 'POST' });
		event.cookies.delete(TOKEN_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
