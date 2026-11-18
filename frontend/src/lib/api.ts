import { goto, invalidateAll } from '$app/navigation';
import { error, redirect } from '@sveltejs/kit';

/**
 * Klien API Laravel (domain yang sama). Login memakai cookie sesi Sanctum (httpOnly)
 * + proteksi CSRF lewat cookie XSRF-TOKEN yang dikirim balik di header X-XSRF-TOKEN.
 */
export type ApiResult<T = any> = { ok: boolean; status: number; data: T };
type Query = Record<string, string | null | undefined>;

function xsrfToken() {
	const m = document.cookie.match(/(?:^|;\s*)XSRF-TOKEN=([^;]+)/);
	return m ? decodeURIComponent(m[1]) : '';
}

async function ensureCsrf(force = false) {
	if (force || !xsrfToken()) await fetch('/sanctum/csrf-cookie', { credentials: 'same-origin' });
}

export async function api<T = any>(path: string, opts: { method?: string; body?: unknown; query?: Query } = {}): Promise<ApiResult<T>> {
	const method = (opts.method || 'GET').toUpperCase();
	const url = new URL('/api' + path, location.origin);
	for (const [k, v] of Object.entries(opts.query || {})) if (v) url.searchParams.set(k, v);

	const doFetch = async () => {
		const headers: Record<string, string> = { Accept: 'application/json', 'X-Requested-With': 'XMLHttpRequest' };
		if (opts.body !== undefined) headers['Content-Type'] = 'application/json';
		if (method !== 'GET') headers['X-XSRF-TOKEN'] = xsrfToken();
		return fetch(url, {
			method,
			headers,
			credentials: 'same-origin',
			body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined
		});
	};

	if (method !== 'GET') await ensureCsrf();
	const read = async (res: Response) => (res.status === 204 ? null : await res.json().catch(() => null));
	let res: Response;
	let data: any;
	try {
		res = await doFetch();
		data = await read(res);
		// token CSRF kedaluwarsa (419, atau 403 bertanda errors.csrf) → ambil token baru lalu coba sekali lagi
		if (res.status === 419 || (res.status === 403 && data?.errors?.csrf)) {
			await ensureCsrf(true);
			res = await doFetch();
			data = await read(res);
		}
	} catch {
		return { ok: false, status: 0, data: { message: 'Server tidak dapat dihubungi. Periksa koneksi internet.' } as T };
	}
	return { ok: res.ok, status: res.status, data };
}

/** GET untuk load(): 401 → login, 403 → dashboard, error lain → halaman error */
export async function get<T = any>(path: string, query?: Query): Promise<T> {
	const r = await api<T>(path, { query });
	if (r.status === 401) redirect(307, '/login');
	if (r.status === 403) redirect(307, '/?denied=1');
	if (!r.ok) error(r.status || 503, (r.data as any)?.message || 'Terjadi kesalahan');
	return r.data;
}

/** Pesan error pertama dari respons validasi Laravel */
export function errMsg(data: any): string {
	if (data?.errors) {
		const first = Object.values(data.errors)[0] as string[];
		if (first?.length) return first[0];
	}
	return data?.message || 'Terjadi kesalahan';
}

export type FormResult = { message?: string; error?: string; data?: any } | null;

/** Kirim perubahan; hasil {message} atau {error} untuk ditampilkan di komponen Flash */
export async function send(path: string, method: string, body?: unknown): Promise<FormResult> {
	const r = await api(path, { method, body });
	if (r.status === 401) {
		await goto('/login');
		return null;
	}
	if (!r.ok) return { error: errMsg(r.data) };
	return { message: r.data?.message, data: r.data };
}

/** FormData -> object; field angka (format Rp boleh pakai titik) dikonversi, string kosong -> null */
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

type ApiFormOpts = {
	/** endpoint API, boleh fungsi dari isi form */
	path: string | ((body: Record<string, any>) => string);
	method?: string | ((body: Record<string, any>) => string);
	numeric?: string[];
	bools?: string[];
	/** ubah body sebelum dikirim */
	transform?: (body: Record<string, any>) => Record<string, any>;
	/** dipanggil dengan hasil {message}|{error} */
	done?: (r: FormResult) => unknown;
	/** kosongkan form setelah sukses */
	reset?: boolean;
	confirm?: string;
};

/** Svelte action: <form use:apiForm={{ path, method, done }}> — kirim form ke API lalu muat ulang data halaman */
export function apiForm(node: HTMLFormElement, opts: ApiFormOpts) {
	let o = opts;
	async function onSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (o.confirm && !window.confirm(o.confirm)) return;
		const btn = node.querySelector<HTMLButtonElement>('button[type=submit], button:not([type])');
		if (btn) btn.disabled = true;
		try {
			let body = formObj(new FormData(node), o.numeric, o.bools);
			if (o.transform) body = o.transform(body);
			const path = typeof o.path === 'function' ? o.path(body) : o.path;
			const method = typeof o.method === 'function' ? o.method(body) : o.method || 'POST';
			const r = await send(path, method, body);
			if (r && !r.error) {
				await invalidateAll();
				if (o.reset) node.reset();
			}
			await o.done?.(r);
		} finally {
			if (btn) btn.disabled = false;
		}
	}
	node.addEventListener('submit', onSubmit);
	return {
		update(n: ApiFormOpts) {
			o = n;
		},
		destroy() {
			node.removeEventListener('submit', onSubmit);
		}
	};
}
