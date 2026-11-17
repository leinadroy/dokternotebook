import { formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const users = await get(event, '/users');
	const edit = event.url.searchParams.get('edit');
	return { users, editing: edit ? (users as any[]).find((u) => String(u.id) === edit) ?? null : null };
};

export const actions: Actions = {
	default: async (event) => {
		const body = formObj(await event.request.formData(), [], ['active']);
		const id = body.id;
		delete body.id;
		return id ? send(event, `/users/${id}`, 'PUT', body) : send(event, '/users', 'POST', body);
	}
};
