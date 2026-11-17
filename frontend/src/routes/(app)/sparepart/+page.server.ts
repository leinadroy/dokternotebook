import { formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const sp = event.url.searchParams;
	const query = { q: sp.get('q'), cat: sp.get('cat'), low: sp.get('low'), edit: sp.get('edit') };
	const [rows, moves, all] = await Promise.all([
		get(event, '/spareparts', { q: query.q, cat: query.cat, low: query.low }),
		get(event, '/stock-movements'),
		query.edit ? get(event, '/spareparts') : Promise.resolve([])
	]);
	const editing = query.edit ? (all as any[]).find((p) => String(p.id) === query.edit) ?? null : null;
	return { rows, moves, query, editing };
};

const NUM = ['buy_price', 'sell_price', 'min_stock', 'stock'];

export const actions: Actions = {
	save: async (event) => {
		const body = formObj(await event.request.formData(), NUM);
		const id = body.id;
		delete body.id;
		return id ? send(event, `/spareparts/${id}`, 'PUT', body) : send(event, '/spareparts', 'POST', body);
	},
	stock: async (event) => {
		const body = formObj(await event.request.formData(), ['qty']);
		return send(event, `/spareparts/${body.id}/stock`, 'POST', body);
	},
	delete: async (event) => {
		const fd = await event.request.formData();
		return send(event, `/spareparts/${fd.get('id')}`, 'DELETE');
	}
};
