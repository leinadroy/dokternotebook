import { formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => ({ s: await get(event, '/settings') });

export const actions: Actions = {
	default: async (event) => send(event, '/settings', 'PUT', formObj(await event.request.formData(), ['default_warranty_days']))
};
