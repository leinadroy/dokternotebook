import { redirect } from '@sveltejs/kit';
import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (user?.role === 'TEKNISI') redirect(307, '/?denied=1');
	const sp = url.searchParams;
	const query = { status: sp.get('status') || 'AKTIF', q: sp.get('q'), date: sp.get('date') };
	return { list: await get('/bookings', query), query };
};
