import { redirect } from '@sveltejs/kit';
import { api, get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (user?.role === 'TEKNISI') redirect(307, '/?denied=1');
	const klaim = url.searchParams.get('klaim');
	const customerId = url.searchParams.get('customer');
	const techs = await get('/technicians');

	let parentSvc: any = null;
	let customer: any = null;
	if (klaim) {
		const r = await api(`/services/${klaim}`);
		if (r.ok) {
			parentSvc = r.data.service;
			customer = parentSvc.customer;
		}
	} else if (customerId) {
		const r = await api(`/customers/${customerId}`);
		if (r.ok) customer = r.data.customer;
	}
	return { techs, parent: parentSvc, customer };
};
