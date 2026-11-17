import { formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const id = event.params.id;
	const [detail, techs, parts] = await Promise.all([
		get(event, `/services/${id}`),
		get(event, '/technicians'),
		get(event, '/spareparts', { in_stock: '1' })
	]);
	return { detail, techs, parts, isNew: event.url.searchParams.has('baru') };
};

export const actions: Actions = {
	details: async (event) => {
		const body = formObj(await event.request.formData(), ['estimated_cost', 'warranty_days', 'discount', 'technician_id']);
		return send(event, `/services/${event.params.id}`, 'PUT', body);
	},
	status: async (event) => {
		const body = formObj(await event.request.formData(), [], ['send_wa', 'force']);
		return send(event, `/services/${event.params.id}/status`, 'POST', body);
	},
	addItem: async (event) => {
		const body = formObj(await event.request.formData(), ['qty', 'price', 'sparepart_id']);
		return send(event, `/services/${event.params.id}/items`, 'POST', body);
	},
	deleteItem: async (event) => {
		const fd = await event.request.formData();
		return send(event, `/items/${fd.get('item_id')}`, 'DELETE');
	},
	pay: async (event) => {
		const body = formObj(await event.request.formData(), ['amount']);
		return send(event, `/services/${event.params.id}/payments`, 'POST', body);
	},
	deletePayment: async (event) => {
		const fd = await event.request.formData();
		return send(event, `/payments/${fd.get('payment_id')}`, 'DELETE');
	}
};
