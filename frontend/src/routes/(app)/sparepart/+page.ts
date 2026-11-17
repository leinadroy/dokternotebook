import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url }) => {
	const sp = url.searchParams;
	const query = { q: sp.get('q'), cat: sp.get('cat'), low: sp.get('low'), edit: sp.get('edit') };
	const [rows, moves, all] = await Promise.all([
		get<any[]>('/spareparts', { q: query.q, cat: query.cat, low: query.low }),
		get('/stock-movements'),
		query.edit ? get<any[]>('/spareparts') : Promise.resolve([] as any[])
	]);
	const editing = query.edit ? (all.find((p) => String(p.id) === query.edit) ?? null) : null;
	return { rows, moves, query, editing };
};
