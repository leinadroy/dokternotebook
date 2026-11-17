<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { STATUSES, STATUS_LABEL, rupiah, tgl } from '$lib/format';

	let { data } = $props();
	const isTech = $derived(data.user?.role === 'TEKNISI');
	const list = $derived(data.list);

	function pageUrl(p: number) {
		const u = new URLSearchParams();
		for (const [k, v] of Object.entries({ ...data.query, page: String(p) })) if (v) u.set(k, v);
		return `/servis?${u}`;
	}
</script>

<PageHeader title="Daftar Servis" subtitle="{list.total} servis ditemukan">
	{#if !isTech}<a href="/servis/baru" class="btn-primary">+ Terima Servis</a>{/if}
</PageHeader>

<form class="card p-3 mb-4 flex flex-wrap gap-2" data-sveltekit-keepfocus>
	<input name="q" value={data.query.q ?? ''} placeholder="Cari nota, nama, HP, merk, SN..." class="input flex-1 min-w-48" />
	<select name="status" value={data.query.status ?? ''} class="input w-auto">
		<option value="">Semua status</option>
		<option value="AKTIF">Sedang berjalan</option>
		{#each STATUSES as s}<option value={s}>{STATUS_LABEL[s]}</option>{/each}
	</select>
	{#if !isTech}
		<select name="tech" value={data.query.tech ?? ''} class="input w-auto">
			<option value="">Semua teknisi</option>
			<option value="none">Belum ditugaskan</option>
			{#each data.techs as t (t.id)}<option value={String(t.id)}>{t.name}</option>{/each}
		</select>
	{/if}
	<button class="btn-secondary">Filter</button>
</form>

<div class="card overflow-x-auto">
	<table class="table">
		<thead>
			<tr><th>Nota</th><th>Pelanggan</th><th>Unit & Keluhan</th><th>Teknisi</th><th>Status</th><th class="text-right">Tagihan</th></tr>
		</thead>
		<tbody>
			{#each list.data as s (s.id)}
				<tr class="hover:bg-slate-50">
					<td>
						<a href="/servis/{s.id}" class="font-medium text-brand-600">{s.number}</a>
						<div class="text-xs text-slate-500">{tgl(s.received_at)}</div>
						{#if s.is_warranty_claim}<span class="badge bg-violet-100 text-violet-700 mt-1">Klaim garansi</span>{/if}
					</td>
					<td>
						<div>{s.customer.name}</div>
						<div class="text-xs text-slate-500">{s.customer.phone}</div>
					</td>
					<td class="max-w-xs">
						<div class="font-medium">{s.device_brand} {s.device_model}</div>
						<div class="text-xs text-slate-500 line-clamp-2">{s.complaint}</div>
					</td>
					<td class="text-slate-600">{#if s.technician}{s.technician.name}{:else}<span class="text-amber-600 text-xs">Belum ditugaskan</span>{/if}</td>
					<td><StatusBadge status={s.status} /></td>
					<td class="text-right whitespace-nowrap">
						<div>{rupiah(s.totals.total || s.estimated_cost)}</div>
						{#if s.totals.remaining > 0}<div class="text-xs text-rose-600">Sisa {rupiah(s.totals.remaining)}</div>{/if}
						{#if s.totals.total > 0 && s.totals.remaining <= 0}<div class="text-xs text-emerald-600">Lunas</div>{/if}
					</td>
				</tr>
			{:else}
				<tr><td colspan="6" class="text-center py-10 text-slate-500">Tidak ada data servis.</td></tr>
			{/each}
		</tbody>
	</table>
</div>

{#if list.last_page > 1}
	<div class="flex justify-center gap-2 mt-4">
		{#if list.current_page > 1}<a href={pageUrl(list.current_page - 1)} class="btn-secondary btn-sm">← Sebelumnya</a>{/if}
		<span class="text-sm text-slate-500 self-center">Hal {list.current_page} / {list.last_page}</span>
		{#if list.current_page < list.last_page}<a href={pageUrl(list.current_page + 1)} class="btn-secondary btn-sm">Berikutnya →</a>{/if}
	</div>
{/if}
