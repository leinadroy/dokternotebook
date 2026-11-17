import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async () => ({ s: await get('/settings') });
