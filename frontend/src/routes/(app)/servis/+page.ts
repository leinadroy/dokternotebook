import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const sp = url.searchParams;
	const query = { q: sp.get('q'), status: sp.get('status'), tech: sp.get('tech'), page: sp.get('page') };
	const [list, techs] = await Promise.all([get('/services', query), get('/technicians')]);
	return { list, techs, query };
};
