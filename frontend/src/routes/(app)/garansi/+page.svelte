<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { tgl } from '$lib/format';
	let { data } = $props();
	const w = $derived(data.w);
</script>

<PageHeader title="Garansi Servis" subtitle="Cek masa garansi dan buat klaim garansi berdasarkan nota" />
<form class="card p-3 mb-6 flex gap-2" data-sveltekit-keepfocus>
	<!-- svelte-ignore a11y_autofocus -->
	<input name="q" value={data.q ?? ''} class="input" placeholder="Nomor nota, serial number, no HP, atau nama pelanggan" autofocus />
	<button class="btn-primary">Cek Garansi</button>
</form>

{#if data.q}
	<div class="card overflow-x-auto mb-6">
		<div class="px-4 py-3 border-b border-slate-200 font-semibold">Hasil pencarian “{data.q}”</div>
		<table class="table">
			<thead><tr><th>Nota</th><th>Pelanggan / Unit</th><th>Status</th><th>Garansi</th><th></th></tr></thead>
			<tbody>
				{#each w.found as s (s.id)}
					<tr>
						<td><a href="/servis/{s.id}" class="text-brand-600 font-medium">{s.number}</a><div class="text-xs text-slate-500">{tgl(s.received_at)}</div></td>
						<td>{s.customer.name}<div class="text-xs text-slate-500">{s.device_brand} {s.device_model}</div></td>
						<td><StatusBadge status={s.status} /></td>
						<td>
							{#if s.status !== 'DIAMBIL'}
								<span class="text-xs text-slate-500">Belum diambil (garansi mulai saat diambil)</span>
							{:else if s.warranty.active}
								<span class="badge bg-emerald-100 text-emerald-700">Aktif s/d {tgl(s.warranty.until)}</span>
							{:else}
								<span class="badge bg-rose-100 text-rose-700">Habis {tgl(s.warranty.until)}</span>
							{/if}
							{#if s.claims.length}<div class="text-xs text-violet-600 mt-1">{s.claims.length}x diklaim</div>{/if}
						</td>
						<td class="text-right">
							{#if s.warranty.active}<a href="/servis/baru?klaim={s.id}" class="btn-primary btn-sm">Buat Klaim</a>{/if}
						</td>
					</tr>
				{:else}
					<tr><td colspan="5" class="text-center py-6 text-slate-500">Tidak ditemukan</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}

<div class="grid lg:grid-cols-2 gap-6">
	<div class="card overflow-x-auto">
		<div class="px-4 py-3 border-b border-slate-200 font-semibold">Garansi masih aktif ({w.active.length})</div>
		<table class="table">
			<thead><tr><th>Nota</th><th>Pelanggan</th><th>Berlaku s/d</th></tr></thead>
			<tbody>
				{#each w.active as s (s.id)}
					<tr>
						<td><a href="/servis/{s.id}" class="text-brand-600">{s.number}</a></td>
						<td>{s.customer.name}<div class="text-xs text-slate-500">{s.device_brand} {s.device_model}</div></td>
						<td>{tgl(s.warranty.until)}</td>
					</tr>
				{:else}
					<tr><td colspan="3" class="text-center py-6 text-slate-500">Belum ada</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
	<div class="card overflow-x-auto">
		<div class="px-4 py-3 border-b border-slate-200 font-semibold">Riwayat Klaim Garansi</div>
		<table class="table">
			<thead><tr><th>Nota klaim</th><th>Nota asal</th><th>Status</th></tr></thead>
			<tbody>
				{#each w.claims as c (c.id)}
					<tr>
						<td><a href="/servis/{c.id}" class="text-brand-600">{c.number}</a><div class="text-xs text-slate-500">{c.customer.name}</div></td>
						<td>{#if c.parent}<a href="/servis/{c.parent.id}" class="text-brand-600">{c.parent.number}</a>{/if}</td>
						<td><StatusBadge status={c.status} /></td>
					</tr>
				{:else}
					<tr><td colspan="3" class="text-center py-6 text-slate-500">Belum ada klaim</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>
