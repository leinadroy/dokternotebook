import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => ({
	dash: await get('/dashboard'),
	denied: url.searchParams.has('denied')
});
