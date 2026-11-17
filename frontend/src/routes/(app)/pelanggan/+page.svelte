<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { tgl } from '$lib/format';
	let { data } = $props();
</script>

<PageHeader title="Pelanggan" subtitle="Pelanggan otomatis tercatat saat menerima servis" />
<form class="card p-3 mb-4 flex gap-2" data-sveltekit-keepfocus>
	<input name="q" value={data.q ?? ''} class="input" placeholder="Cari nama, no HP, alamat..." />
	<button class="btn-secondary">Cari</button>
</form>
<div class="card overflow-x-auto">
	<table class="table">
		<thead><tr><th>Nama</th><th>No. HP</th><th>Alamat</th><th class="text-right">Jml Servis</th><th>Terakhir</th></tr></thead>
		<tbody>
			{#each data.rows as c (c.id)}
				<tr class="hover:bg-slate-50">
					<td><a href="/pelanggan/{c.id}" class="text-brand-600 font-medium">{c.name}</a></td>
					<td>{c.phone}</td>
					<td class="text-slate-600">{c.address || '-'}</td>
					<td class="text-right">{c.services_count}</td>
					<td>{tgl(c.services_max_received_at)}</td>
				</tr>
			{:else}
				<tr><td colspan="5" class="text-center py-8 text-slate-500">Tidak ada pelanggan</td></tr>
			{/each}
		</tbody>
	</table>
</div>
