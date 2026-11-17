import { formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => ({ detail: await get(event, `/customers/${event.params.id}`) });

export const actions: Actions = {
	default: async (event) => send(event, `/customers/${event.params.id}`, 'PUT', formObj(await event.request.formData()))
};
