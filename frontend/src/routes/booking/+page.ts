import { api } from '$lib/api';
import type { PageLoad } from './$types';

export type BookingInfo = {
	enabled: boolean;
	pickup: boolean;
	intro: string;
	slots: string[];
	closed_days: number[];
	problem_types: string[];
	max_days: number;
	today: string;
	store: { name: string; tagline: string; address: string; phone: string; wa: string };
};

export const load: PageLoad = async ({ url }) => {
	const r = await api<BookingInfo>('/public/booking-info');
	return {
		info: r.ok ? r.data : null,
		embed: url.searchParams.has('embed'),
		loadError: r.ok ? '' : (r.data as any)?.message || 'Gagal memuat data booking.'
	};
};
