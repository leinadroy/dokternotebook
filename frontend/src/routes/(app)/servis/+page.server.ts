import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const sp = event.url.searchParams;
	const query = { q: sp.get('q'), status: sp.get('status'), tech: sp.get('tech'), page: sp.get('page') };
	const [list, techs] = await Promise.all([get(event, '/services', query), get(event, '/technicians')]);
	return { list, techs, query };
};
