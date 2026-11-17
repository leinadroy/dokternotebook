import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => ({
	dash: await get(event, '/dashboard'),
	denied: event.url.searchParams.has('denied')
});
