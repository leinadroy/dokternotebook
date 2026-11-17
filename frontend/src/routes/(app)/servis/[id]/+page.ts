import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, url }) => {
	const [detail, techs, parts] = await Promise.all([
		get(`/services/${params.id}`),
		get('/technicians'),
		get('/spareparts', { in_stock: '1' })
	]);
	return { detail, techs, parts, isNew: url.searchParams.has('baru') };
};
