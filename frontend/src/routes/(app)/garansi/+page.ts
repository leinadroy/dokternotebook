import { redirect } from '@sveltejs/kit';
import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (user?.role === 'TEKNISI') redirect(307, '/?denied=1');
	const q = url.searchParams.get('q');
	return { w: await get('/warranty', { q }), q };
};
