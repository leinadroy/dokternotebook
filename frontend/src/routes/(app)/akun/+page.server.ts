import { formObj, send } from '$lib/server/api';
import type { Actions } from './$types';

export const actions: Actions = {
	default: async (event) => send(event, '/me/password', 'POST', formObj(await event.request.formData()))
};
