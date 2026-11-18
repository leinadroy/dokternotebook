<script lang="ts">
	import { apiForm, type FormResult } from '$lib/api';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { BOOKING_COLOR, BOOKING_LABEL, isoDate, tglHari, tglJam } from '$lib/format';

	let { data } = $props();
	let form = $state<FormResult>(null);
	let openId = $state<number | null>(null);
	let lastWa = $state<{ id: number; link: string } | null>(null);
	const list = $derived(data.list);
	const today = isoDate(new Date());

	const TABS = [
		['AKTIF', 'Perlu ditangani'],
		['BARU', 'Baru'],
		['DIKONFIRMASI', 'Dikonfirmasi'],
		['DITERIMA', 'Unit diterima'],
		['BATAL', 'Batal'],
		['SEMUA', 'Semua']
	];
	const tabCount = (k: string) =>
		k === 'AKTIF' ? list.counts.BARU + list.counts.DIKONFIRMASI : k === 'SEMUA' ? Object.values(list.counts as Record<string, number>).reduce((a, b) => a + b, 0) : list.counts[k];

	function tabUrl(st: string) {
		const u = new URLSearchParams();
		u.set('status', st);
		if (data.query.q) u.set('q', data.query.q);
		return `/booking-masuk?${u}`;
	}

	const done = (b: any) => (r: FormResult) => {
		form = r;
		if (r && !r.error) {
			openId = null;
			if (r.data?.booking?.status !== 'BARU') lastWa = { id: b.id, link: r.data.booking.wa_link };
		}
	};

	const dayTag = (d: string) => (d === today ? 'Hari ini' : d < today ? 'Terlewat' : '');
	const publicUrl = $derived((data.settings.public_url || (typeof location !== 'undefined' ? location.origin : '')).replace(/\/$/, ''));
</script>

<svelte:head><title>Booking · {data.settings.store_name}</title></svelte:head>

<PageHeader title="Booking Online" subtitle="{list.today} booking dijadwalkan hari ini · {list.counts.BARU} menunggu konfirmasi">
	<a href="/booking" target="_blank" class="btn-secondary">🌐 Halaman booking publik</a>
</PageHeader>

<Flash {form} />

<div class="flex flex-wrap gap-1.5 mb-4">
	{#each TABS as [k, label]}
		<a href={tabUrl(k)} class="btn btn-sm {data.query.status === k ? 'bg-brand-600 text-white' : 'bg-white border border-slate-300 text-slate-700 hover:bg-slate-50'}">
			{label} <span class="opacity-70">({tabCount(k)})</span>
		</a>
	{/each}
</div>

<form class="card p-3 mb-4 flex flex-wrap gap-2" data-sveltekit-keepfocus>
	<input type="hidden" name="status" value={data.query.status} />
	<input name="q" value={data.query.q ?? ''} placeholder="Cari kode, nama, no HP, merk..." class="input flex-1 min-w-48" />
	<input name="date" type="date" value={data.query.date ?? ''} class="input w-auto" aria-label="Tanggal jadwal" />
	<button class="btn-secondary">Cari</button>
</form>

<div class="space-y-3">
	{#each list.data as b (b.id)}
		{@const tag = dayTag(b.preferred_date)}
		<div class="card p-4 {b.status === 'BARU' ? 'border-l-4 border-l-amber-400' : ''}">
			<div class="flex flex-wrap justify-between gap-3">
				<div class="min-w-0">
					<div class="flex flex-wrap items-center gap-2">
						<span class="font-mono text-sm text-slate-500">{b.code}</span>
						<span class="badge {BOOKING_COLOR[b.status]}">{BOOKING_LABEL[b.status]}</span>
						<span class="badge {b.service_method === 'JEMPUT' ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-700'}">
							{b.service_method === 'JEMPUT' ? '🛵 Jemput' : '🏪 Datang'}
						</span>
					</div>
					<div class="font-semibold mt-1">{b.name} · <span class="font-normal text-slate-600">{b.phone}</span></div>
					<div class="text-sm"><b>{b.device_brand} {b.device_model ?? ''}</b> — {b.problem_type}</div>
					<div class="text-sm text-slate-600 mt-1 whitespace-pre-line">{b.complaint}</div>
					{#if b.address}<div class="text-sm text-slate-600 mt-1">📍 {b.address}</div>{/if}
					{#if b.staff_note}<div class="text-sm text-sky-700 mt-1">📝 {b.staff_note}</div>{/if}
					<div class="text-xs text-slate-400 mt-2">Masuk {tglJam(b.created_at)}{b.handled_by_name ? ` · ditangani ${b.handled_by_name}` : ''}</div>
				</div>
				<div class="text-right shrink-0">
					<div class="font-semibold">{tglHari(b.preferred_date)}</div>
					<div class="text-sm text-slate-600">{b.preferred_time}</div>
					{#if tag && ['BARU', 'DIKONFIRMASI'].includes(b.status)}
						<span class="badge mt-1 {tag === 'Hari ini' ? 'bg-emerald-100 text-emerald-700' : 'bg-rose-100 text-rose-700'}">{tag}</span>
					{/if}
				</div>
			</div>

			<div class="flex flex-wrap gap-2 mt-3 pt-3 border-t border-slate-100">
				{#if b.status === 'DITERIMA'}
					{#if b.service_id}<a href="/servis/{b.service_id}" class="btn-secondary btn-sm">Lihat nota {b.service_number}</a>{/if}
				{:else}
					{#if b.status !== 'BATAL'}
						<a href="/servis/baru?booking={b.id}" class="btn-success btn-sm">📥 Terima unit → buat nota</a>
					{/if}
					<button type="button" class="btn-primary btn-sm" onclick={() => (openId = openId === b.id ? null : b.id)}>
						{b.status === 'BARU' ? '✔ Konfirmasi' : b.status === 'BATAL' ? 'Aktifkan lagi' : 'Ubah jadwal'}
					</button>
					{#if b.status !== 'BATAL'}
						<form use:apiForm={{ path: `/bookings/${b.id}`, method: 'PUT', transform: (x) => ({ ...x, status: 'BATAL' }), done: done(b), confirm: `Batalkan booking ${b.code}?` }}>
							<input type="hidden" name="staff_note" value={b.staff_note ?? ''} />
							<button class="btn-secondary btn-sm text-rose-600">Batalkan</button>
						</form>
					{/if}
				{/if}
				<a href={lastWa && lastWa.id === b.id ? lastWa.link : b.wa_link} target="_blank" rel="noopener" class="btn-wa btn-sm {lastWa?.id === b.id ? 'ring-2 ring-offset-1 ring-[#25D366]' : ''}">
					WhatsApp{lastWa?.id === b.id ? ' (kirim konfirmasi)' : ''}
				</a>
			</div>

			{#if openId === b.id}
				<form
					use:apiForm={{ path: `/bookings/${b.id}`, method: 'PUT', bools: ['send_wa'], transform: (x) => ({ ...x, status: 'DIKONFIRMASI' }), done: done(b) }}
					class="mt-3 grid sm:grid-cols-4 gap-3 rounded-lg bg-slate-50 p-3"
				>
					<div>
						<label class="label" for="d{b.id}">Tanggal</label>
						<input id="d{b.id}" name="preferred_date" type="date" class="input" value={b.preferred_date} min={today} />
					</div>
					<div>
						<label class="label" for="t{b.id}">Jam</label>
						<select id="t{b.id}" name="preferred_time" class="input" value={b.preferred_time}>
							{#each [...new Set([...list.slots, b.preferred_time])] as s}<option>{s}</option>{/each}
						</select>
					</div>
					<div class="sm:col-span-2">
						<label class="label" for="n{b.id}">Catatan untuk pelanggan (ikut di pesan WA)</label>
						<input id="n{b.id}" name="staff_note" class="input" value={b.staff_note ?? ''} placeholder="mis. Mohon bawa charger" />
					</div>
					<label class="flex items-center gap-2 text-sm sm:col-span-3">
						<input type="checkbox" name="send_wa" value="1" /> Kirim WA otomatis (perlu token Fonnte di Pengaturan)
					</label>
					<button class="btn-primary">Simpan & konfirmasi</button>
				</form>
			{/if}
		</div>
	{:else}
		<div class="card p-10 text-center text-slate-500">
			Belum ada booking di sini.
			<div class="text-sm mt-2">Bagikan link booking ke pelanggan: <a href="/booking" target="_blank" class="text-brand-600 font-medium">{publicUrl}/booking</a></div>
		</div>
	{/each}
</div>
