import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const sp = url.searchParams;
	return { r: await get('/reports', { from: sp.get('from'), to: sp.get('to') }) };
};
