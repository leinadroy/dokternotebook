import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const sp = event.url.searchParams;
	return { r: await get(event, '/reports', { from: sp.get('from'), to: sp.get('to') }) };
};
