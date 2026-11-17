<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$lib/components/Flash.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { isManager, rupiah, tgl } from '$lib/format';

	let { data, form } = $props();
	const c = $derived(data.detail.customer);
	const mgr = $derived(isManager(data.user?.role));
	const wa = $derived(`https://wa.me/${c.phone}?text=${encodeURIComponent(`Halo ${c.name}, `)}`);
</script>

<div class="max-w-5xl">
	<a href="/pelanggan" class="text-sm text-slate-500">← Pelanggan</a>
	<div class="flex flex-wrap justify-between items-end gap-3 mt-1 mb-6">
		<div>
			<h1 class="text-2xl font-bold">{c.name}</h1>
			<p class="text-sm text-slate-500">
				{c.phone} · pelanggan sejak {tgl(c.created_at)} · {data.detail.services.length} servis · total bayar {rupiah(data.detail.total_paid)}
			</p>
		</div>
		<div class="flex gap-2">
			<a href={wa} target="_blank" rel="noopener" class="btn-wa">WhatsApp</a>
			{#if mgr}<a href="/servis/baru?customer={c.id}" class="btn-primary">+ Servis baru</a>{/if}
		</div>
	</div>
	<Flash {form} />

	<div class="grid lg:grid-cols-3 gap-6">
		<div class="card lg:col-span-2 overflow-x-auto">
			<div class="px-4 py-3 border-b border-slate-200 font-semibold">Riwayat Servis</div>
			<table class="table">
				<thead><tr><th>Nota</th><th>Unit</th><th>Status</th><th class="text-right">Total</th></tr></thead>
				<tbody>
					{#each data.detail.services as s (s.id)}
						<tr>
							<td><a href="/servis/{s.id}" class="text-brand-600 font-medium">{s.number}</a><div class="text-xs text-slate-500">{tgl(s.received_at)}</div></td>
							<td>{s.device_brand} {s.device_model}<div class="text-xs text-slate-500 line-clamp-1">{s.complaint}</div></td>
							<td><StatusBadge status={s.status} /></td>
							<td class="text-right">{rupiah(s.totals.total)}</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#if mgr}
			<form method="POST" use:enhance={() => async ({ update }) => update({ reset: false })} class="card p-5 space-y-3 h-fit">
				<h2 class="font-semibold">Ubah Data</h2>
				<div><label class="label" for="name">Nama</label><input id="name" name="name" class="input" value={c.name} required /></div>
				<div><label class="label" for="phone">No. HP</label><input id="phone" name="phone" class="input" value={c.phone} required /></div>
				<div><label class="label" for="address">Alamat</label><input id="address" name="address" class="input" value={c.address ?? ''} /></div>
				<div><label class="label" for="email">Email</label><input id="email" name="email" class="input" value={c.email ?? ''} /></div>
				<div><label class="label" for="notes">Catatan</label><textarea id="notes" name="notes" class="input" rows="2" value={c.notes ?? ''}></textarea></div>
				<button class="btn-primary">Simpan</button>
			</form>
		{/if}
	</div>
</div>
