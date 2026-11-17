import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const users = await get<any[]>('/users');
	const edit = url.searchParams.get('edit');
	return { users, editing: edit ? (users.find((u) => String(u.id) === edit) ?? null) : null };
};
