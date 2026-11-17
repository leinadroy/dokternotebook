import { fail, redirect } from '@sveltejs/kit';
import { api, errMsg, TOKEN_COOKIE } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	if (locals.user) redirect(303, '/');
};

export const actions: Actions = {
	default: async (event) => {
		const fd = await event.request.formData();
		const username = String(fd.get('username') || '');
		const r = await api(event, '/login', { method: 'POST', body: { username, password: String(fd.get('password') || '') } });
		if (!r.ok) return fail(r.status, { error: errMsg(r.data), username });
		event.cookies.set(TOKEN_COOKIE, r.data.token, {
			path: '/',
			httpOnly: true,
			sameSite: 'lax',
			secure: event.url.protocol === 'https:',
			maxAge: 60 * 60 * 12
		});
		redirect(303, '/');
	}
};
