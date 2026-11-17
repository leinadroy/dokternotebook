import { json } from '@sveltejs/kit';
import { api } from '$lib/server/api';
import type { RequestHandler } from './$types';

/** Proxy pencarian pelanggan per no HP (token tetap di server) */
export const GET: RequestHandler = async (event) => {
	const r = await api(event, '/customers/lookup', { query: { phone: event.url.searchParams.get('phone') } });
	return json(r.ok ? r.data : null, { status: r.ok ? 200 : r.status });
};
