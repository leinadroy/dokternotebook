import { env } from '$env/dynamic/private';
import { error, fail, redirect, type RequestEvent } from '@sveltejs/kit';

export const TOKEN_COOKIE = 'dn_token';
const base = () => (env.API_URL || 'http://127.0.0.1:8000/api').replace(/\/$/, '');

export type ApiResult<T = any> = { ok: boolean; status: number; data: T };

/** Panggil API Laravel dari server SvelteKit, membawa token login (cookie httpOnly) */
export async function api<T = any>(
	event: Pick<RequestEvent, 'locals' | 'fetch'>,
	path: string,
	opts: { method?: string; body?: unknown; query?: Record<string, string | null | undefined> } = {}
): Promise<ApiResult<T>> {
	const url = new URL(base() + path);
	for (const [k, v] of Object.entries(opts.query || {})) if (v) url.searchParams.set(k, v);
	const headers: Record<string, string> = { Accept: 'application/json' };
	if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
	if (event.locals.token) headers.Authorization = `Bearer ${event.locals.token}`;
	let res: Response;
	try {
		res = await event.fetch(url, {
			method: opts.method || 'GET',
			headers,
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
		});
	} catch {
		error(503, 'Backend API tidak dapat dihubungi. Pastikan server Laravel berjalan.');
	}
	const data = res.status === 204 ? null : await res.json().catch(() => null);
	return { ok: res.ok, status: res.status, data };
}

/** GET untuk load(): error HTTP diteruskan sebagai halaman error SvelteKit */
export async function get<T = any>(event: Pick<RequestEvent, 'locals' | 'fetch'>, path: string, query?: Record<string, string | null | undefined>) {
	const r = await api<T>(event, path, { query });
	if (r.status === 401) redirect(303, '/login');
	if (r.status === 403) redirect(303, '/?denied=1');
	if (!r.ok) error(r.status, (r.data as any)?.message || 'Terjadi kesalahan');
	return r.data;
}

/** Ambil pesan error pertama dari respons validasi Laravel */
export function errMsg(data: any): string {
	if (data?.errors) {
		const first = Object.values(data.errors)[0] as string[];
		if (first?.length) return first[0];
	}
	return data?.message || 'Terjadi kesalahan';
}

/** Untuk form action: kirim ke API, kembalikan {message} atau fail(..., {error}) */
export async function send(event: Pick<RequestEvent, 'locals' | 'fetch'>, path: string, method: string, body?: unknown) {
	const r = await api(event, path, { method, body });
	if (r.status === 401) redirect(303, '/login');
	if (!r.ok) return fail(r.status, { error: errMsg(r.data) });
	return { message: r.data?.message as string | undefined, data: r.data };
}

/** FormData -> object; field angka (format Rp boleh pakai titik) dikonversi */
export function formObj(fd: FormData, numeric: string[] = [], bools: string[] = []) {
	const o: Record<string, any> = {};
	for (const [k, v] of fd.entries()) o[k] = typeof v === 'string' ? v.trim() : v;
	for (const k of numeric) {
		const s = String(o[k] ?? '').replace(/[^0-9]/g, '');
		o[k] = s === '' ? null : parseInt(s, 10);
	}
	for (const k of bools) o[k] = fd.get(k) === '1' || fd.get(k) === 'on';
	for (const k of Object.keys(o)) if (o[k] === '') o[k] = null;
	return o;
}
