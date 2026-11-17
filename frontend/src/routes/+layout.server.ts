import { api } from '$lib/server/api';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async (event) => {
	const r = await api(event, '/public/settings');
	return { user: event.locals.user, settings: (r.ok ? r.data : {}) as Record<string, string> };
};
