import { redirect } from '@sveltejs/kit';
import { api, formObj, get, send } from '$lib/server/api';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	if (event.locals.user?.role === 'TEKNISI') redirect(303, '/?denied=1');
	const klaim = event.url.searchParams.get('klaim');
	const customerId = event.url.searchParams.get('customer');
	const techs = await get(event, '/technicians');

	let parent: any = null;
	let customer: any = null;
	if (klaim) {
		const r = await api(event, `/services/${klaim}`);
		if (r.ok) {
			parent = r.data.service;
			customer = parent.customer;
		}
	} else if (customerId) {
		const r = await api(event, `/customers/${customerId}`);
		if (r.ok) customer = r.data.customer;
	}
	return { techs, parent, customer };
};

export const actions: Actions = {
	default: async (event) => {
		const body = formObj(await event.request.formData(), ['estimated_cost', 'down_payment', 'warranty_days', 'technician_id', 'parent_id']);
		const r = await send(event, '/services', 'POST', body);
		if ('data' in r && r.data?.id) redirect(303, `/servis/${r.data.id}?baru=1`);
		return r;
	}
};
