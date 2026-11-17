<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { STATUS_LABEL, rupiah, tgl } from '$lib/format';

	let { data } = $props();
	const r = $derived(data.r);
	const daily = $derived(Object.entries(r.daily as Record<string, number>));
	const maxDaily = $derived(Math.max(1, ...daily.map(([, v]) => v)));
	const totalPiutang = $derived(r.piutang.reduce((a: number, x: any) => a + x.remaining, 0));
</script>

{#snippet card(label: string, value: string | number, sub = '', rose = false)}
	<div class="card p-4">
		<div class="text-xs text-slate-500">{label}</div>
		<div class="text-xl font-bold mt-1 {rose ? 'text-rose-600' : ''}">{value}</div>
		{#if sub}<div class="text-xs text-slate-500 mt-0.5">{sub}</div>{/if}
	</div>
{/snippet}

<PageHeader title="Laporan" subtitle="Periode {tgl(r.from)} – {tgl(r.to)}">
	<form class="flex flex-wrap gap-2 items-center">
		<input type="date" name="from" value={r.from} class="input w-auto" />
		<span class="text-slate-400">s/d</span>
		<input type="date" name="to" value={r.to} class="input w-auto" />
		<button class="btn-secondary">Tampilkan</button>
	</form>
</PageHeader>

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
	{@render card('Pemasukan (kas masuk)', rupiah(r.income))}
	{@render card('Unit masuk', r.received)}
	{@render card('Unit selesai', r.finished)}
	{@render card('Laba kotor sparepart', rupiah(r.part_sales - r.part_cost), `Penjualan ${rupiah(r.part_sales)}`)}
	{@render card('Pendapatan jasa', rupiah(r.jasa))}
	{@render card('Penjualan sparepart', rupiah(r.part_sales))}
	{@render card('Estimasi laba kotor', rupiah(r.jasa + r.part_sales - r.part_cost), 'Jasa + margin sparepart')}
	{@render card('Piutang (belum lunas)', rupiah(totalPiutang), `${r.piutang.length} nota`, true)}
</div>

<div class="card p-5 mb-6">
	<h2 class="font-semibold mb-4">Pemasukan harian</h2>
	<div class="flex items-end gap-1 h-48 overflow-x-auto">
		{#each daily as [d, v] (d)}
			<div class="flex-1 min-w-3 flex flex-col justify-end h-full">
				<div class="w-full bg-brand-500 rounded-t hover:bg-brand-700" style="height: {(v / maxDaily) * 100}%; min-height: {v ? 2 : 0}px" title="{d}: {rupiah(v)}"></div>
			</div>
		{/each}
	</div>
	<div class="flex justify-between text-xs text-slate-500 mt-1">
		<span>{daily[0]?.[0]}</span><span>{daily[daily.length - 1]?.[0]}</span>
	</div>
</div>

<div class="grid lg:grid-cols-3 gap-6 mb-6">
	<div class="card p-5">
		<h2 class="font-semibold mb-3">Per metode bayar</h2>
		<ul class="space-y-2 text-sm">
			{#each Object.entries(r.by_method) as [m, v]}
				<li class="flex justify-between"><span>{m}</span><b>{rupiah(v as number)}</b></li>
			{:else}
				<li class="text-slate-500">Belum ada</li>
			{/each}
		</ul>
		<h2 class="font-semibold mt-6 mb-3">Status unit masuk periode ini</h2>
		<ul class="space-y-1 text-sm">
			{#each Object.entries(r.status_counts) as [st, c]}
				<li class="flex justify-between"><span>{STATUS_LABEL[st]}</span><b>{c}</b></li>
			{/each}
		</ul>
	</div>
	<div class="card p-5">
		<h2 class="font-semibold mb-3">Kinerja teknisi</h2>
		<table class="table">
			<thead><tr><th>Teknisi</th><th class="text-right">Selesai</th><th class="text-right">Jasa</th></tr></thead>
			<tbody>
				{#each r.per_tech as t}
					<tr><td>{t.name}</td><td class="text-right">{t.count}</td><td class="text-right">{rupiah(t.jasa)}</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="card p-5">
		<h2 class="font-semibold mb-3">Sparepart terlaris</h2>
		<table class="table">
			<thead><tr><th>Sparepart</th><th class="text-right">Qty</th><th class="text-right">Omzet</th></tr></thead>
			<tbody>
				{#each r.top_parts as p}
					<tr><td>{p.name}</td><td class="text-right">{p.qty}</td><td class="text-right">{rupiah(p.omzet)}</td></tr>
				{:else}
					<tr><td colspan="3" class="text-slate-500 text-center py-4">Belum ada</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<div class="card overflow-x-auto">
	<div class="px-4 py-3 border-b border-slate-200 font-semibold">Daftar piutang (semua periode)</div>
	<table class="table">
		<thead><tr><th>Nota</th><th>Pelanggan</th><th>Status</th><th class="text-right">Sisa</th></tr></thead>
		<tbody>
			{#each r.piutang as x (x.id)}
				<tr>
					<td><a href="/servis/{x.id}" class="text-brand-600">{x.number}</a></td>
					<td>{x.customer}</td>
					<td>{STATUS_LABEL[x.status]}</td>
					<td class="text-right text-rose-600 font-medium">{rupiah(x.remaining)}</td>
				</tr>
			{:else}
				<tr><td colspan="4" class="text-center py-6 text-slate-500">Tidak ada piutang 👍</td></tr>
			{/each}
		</tbody>
	</table>
</div>
