import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params }) => ({ detail: await get(`/customers/${params.id}`) });
