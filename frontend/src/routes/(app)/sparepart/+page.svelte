<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { isManager, rupiah, tglJam } from '$lib/format';

	let { data, form } = $props();
	const mgr = $derived(isManager(data.user?.role));
	const isOwner = $derived(data.user?.role === 'OWNER');
	const editing = $derived(data.editing);
	const CATS = ['RAM', 'Storage', 'LCD', 'Keyboard', 'Baterai', 'Charger', 'Fan', 'Motherboard', 'IC / Chip', 'Engsel / Casing', 'Aksesoris', 'Lainnya'];
	const cats = $derived(Array.from(new Set([...CATS, ...data.rows.map((r: any) => r.category)])));
	const assetValue = $derived(data.rows.reduce((a: number, r: any) => a + r.stock * (r.buy_price || 0), 0));
</script>

<PageHeader title="Sparepart & Stok" subtitle="{data.rows.length} item{mgr ? ` · nilai stok (harga beli) ${rupiah(assetValue)}` : ''}" />
<Flash {form} />

<div class="grid xl:grid-cols-3 gap-6">
	<div class="xl:col-span-2 space-y-4">
		<form class="card p-3 flex flex-wrap gap-2" data-sveltekit-keepfocus>
			<input name="q" value={data.query.q ?? ''} class="input flex-1 min-w-40" placeholder="Cari nama / kode..." />
			<select name="cat" value={data.query.cat ?? ''} class="input w-auto">
				<option value="">Semua kategori</option>
				{#each cats as c}<option>{c}</option>{/each}
			</select>
			<label class="flex items-center gap-1.5 text-sm px-2"><input type="checkbox" name="low" value="1" checked={!!data.query.low} /> Stok menipis</label>
			<button class="btn-secondary">Filter</button>
		</form>

		<div class="card overflow-x-auto">
			<table class="table">
				<thead>
					<tr>
						<th>Kode</th><th>Nama</th><th>Kategori</th>
						{#if mgr}<th class="text-right">Beli</th>{/if}
						<th class="text-right">Jual</th><th class="text-right">Stok</th>
						{#if mgr}<th></th>{/if}
					</tr>
				</thead>
				<tbody>
					{#each data.rows as p (p.id)}
						<tr class="hover:bg-slate-50">
							<td class="font-mono text-xs">{p.sku}</td>
							<td>{p.name}{#if p.location}<div class="text-xs text-slate-500">Rak: {p.location}</div>{/if}</td>
							<td>{p.category}</td>
							{#if mgr}<td class="text-right">{rupiah(p.buy_price)}</td>{/if}
							<td class="text-right">{rupiah(p.sell_price)}</td>
							<td class="text-right">
								<span class="font-semibold {p.stock === 0 ? 'text-rose-600' : p.stock <= p.min_stock ? 'text-amber-600' : ''}">{p.stock}</span>
								<div class="text-xs text-slate-400">min {p.min_stock}</div>
							</td>
							{#if mgr}
								<td class="whitespace-nowrap text-right">
									<a href="/sparepart?edit={p.id}" class="text-brand-600 text-xs mr-2">Ubah/Stok</a>
									{#if isOwner}
										<form method="POST" action="?/delete" use:enhance class="inline">
											<input type="hidden" name="id" value={p.id} />
											<button class="text-rose-600 text-xs cursor-pointer" onclick={(e) => { if (!confirm(`Hapus ${p.name}?`)) e.preventDefault(); }}>Hapus</button>
										</form>
									{/if}
								</td>
							{/if}
						</tr>
					{:else}
						<tr><td colspan="7" class="text-center py-8 text-slate-500">Tidak ada sparepart</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="space-y-6">
		{#if mgr}
			{#key editing?.id}
				<form method="POST" action="?/save" use:enhance class="card p-5 space-y-3">
					<div class="flex justify-between items-center">
						<h2 class="font-semibold">{editing ? `Ubah: ${editing.name}` : 'Tambah Sparepart'}</h2>
						{#if editing}<a href="/sparepart" class="text-xs text-slate-500">Batal</a>{/if}
					</div>
					<input type="hidden" name="id" value={editing?.id ?? ''} />
					<div class="grid grid-cols-2 gap-3">
						<div><label class="label" for="sku">Kode / SKU</label><input id="sku" name="sku" class="input" required value={editing?.sku ?? ''} /></div>
						<div>
							<label class="label" for="category">Kategori</label>
							<select id="category" name="category" class="input" value={editing?.category ?? 'Lainnya'}>{#each cats as c}<option>{c}</option>{/each}</select>
						</div>
					</div>
					<div><label class="label" for="name">Nama</label><input id="name" name="name" class="input" required value={editing?.name ?? ''} /></div>
					<div class="grid grid-cols-2 gap-3">
						<div><label class="label" for="buy_price">Harga beli</label><input id="buy_price" name="buy_price" class="input" inputmode="numeric" value={editing?.buy_price ?? ''} /></div>
						<div><label class="label" for="sell_price">Harga jual</label><input id="sell_price" name="sell_price" class="input" inputmode="numeric" value={editing?.sell_price ?? ''} /></div>
						{#if !editing}<div><label class="label" for="stock">Stok awal</label><input id="stock" name="stock" class="input" inputmode="numeric" value="0" /></div>{/if}
						<div><label class="label" for="min_stock">Stok minimum</label><input id="min_stock" name="min_stock" class="input" inputmode="numeric" value={editing?.min_stock ?? 1} /></div>
						<div><label class="label" for="location">Lokasi rak</label><input id="location" name="location" class="input" value={editing?.location ?? ''} /></div>
					</div>
					<button class="btn-primary">Simpan</button>
				</form>
			{/key}

			{#if editing}
				<form method="POST" action="?/stock" use:enhance class="card p-5 space-y-3">
					<h2 class="font-semibold">Mutasi Stok · sekarang {editing.stock}</h2>
					<input type="hidden" name="id" value={editing.id} />
					<div class="grid grid-cols-2 gap-3">
						<select name="type" class="input">
							<option value="MASUK">Barang masuk (+)</option>
							<option value="KELUAR">Barang keluar (−)</option>
							<option value="PENYESUAIAN">Stok opname (set =)</option>
						</select>
						<input name="qty" class="input" inputmode="numeric" placeholder="Jumlah" required />
					</div>
					<input name="note" class="input" placeholder="Catatan, mis. beli dari supplier X" />
					<button class="btn-success">Simpan Mutasi</button>
				</form>
			{/if}
		{/if}

		<div class="card p-5">
			<h2 class="font-semibold mb-3">Mutasi Terakhir</h2>
			<ul class="space-y-2 text-sm">
				{#each data.moves as m (m.id)}
					<li class="flex justify-between gap-2">
						<div class="min-w-0">
							<div class="truncate">{m.sparepart?.name}</div>
							<div class="text-xs text-slate-500">
								{tglJam(m.created_at)} ·
								{#if m.service}<a href="/servis/{m.service.id}" class="text-brand-600">{m.service.number}</a>{:else}{m.note || m.type}{/if}
							</div>
						</div>
						<span class="font-semibold {m.qty > 0 ? 'text-emerald-600' : 'text-rose-600'}">{m.qty > 0 ? '+' : ''}{m.qty}</span>
					</li>
				{:else}
					<li class="text-slate-500">Belum ada mutasi</li>
				{/each}
			</ul>
		</div>
	</div>
</div>
