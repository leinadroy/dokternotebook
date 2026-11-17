import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const q = event.url.searchParams.get('q');
	return { rows: await get(event, '/customers', { q }), q };
};
