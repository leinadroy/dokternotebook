import { redirect } from '@sveltejs/kit';
import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const { user } = await parent();
	if (user?.role === 'TEKNISI') redirect(307, '/?denied=1');
	return { detail: await get(`/services/${params.id}`), docTitle: 'Invoice' };
};
