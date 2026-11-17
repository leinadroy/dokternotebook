import { redirect } from '@sveltejs/kit';
import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user?.role === 'TEKNISI') redirect(303, '/?denied=1');
	const q = event.url.searchParams.get('q');
	return { w: await get(event, '/warranty', { q }), q };
};
