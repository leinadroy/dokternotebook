import { redirect } from '@sveltejs/kit';
import { api, get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ url, parent }) => {
	const { user } = await parent();
	if (user?.role === 'TEKNISI') redirect(307, '/?denied=1');
	const klaim = url.searchParams.get('klaim');
	const customerId = url.searchParams.get('customer');
	const bookingId = url.searchParams.get('booking');
	const techs = await get('/technicians');

	let parentSvc: any = null;
	let customer: any = null;
	let booking: any = null;
	if (bookingId) {
		// Unit datang dari booking online: isi form dari data booking
		const r = await api(`/bookings/${bookingId}`);
		if (r.ok && r.data.status !== 'DITERIMA') {
			booking = r.data;
			const lookup = await api('/customers/lookup', { query: { phone: booking.phone } });
			customer = lookup.ok && lookup.data
				? { ...lookup.data, phone: booking.phone }
				: { name: booking.name, phone: booking.phone, email: booking.email, address: booking.address };
		}
	} else if (klaim) {
		const r = await api(`/services/${klaim}`);
		if (r.ok) {
			parentSvc = r.data.service;
			customer = parentSvc.customer;
		}
	} else if (customerId) {
		const r = await api(`/customers/${customerId}`);
		if (r.ok) customer = r.data.customer;
	}
	return { techs, parent: parentSvc, customer, booking };
};
