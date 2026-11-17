<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$lib/components/Flash.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { METHODS, STATUSES, STATUS_LABEL, isManager, rupiah, tgl, tglJam } from '$lib/format';

	let { data, form } = $props();
	const s = $derived(data.detail.service);
	const t = $derived(data.detail.totals);
	const w = $derived(data.detail.warranty);
	const mgr = $derived(isManager(data.user?.role));
	const isOwner = $derived(data.user?.role === 'OWNER');
	const editable = $derived(s.status !== 'DIAMBIL' && s.status !== 'BATAL');

	/** Form tidak di-reset agar isian tetap tampil setelah simpan */
	const keep = () => async ({ update }: { update: (o?: { reset?: boolean }) => Promise<void> }) => update({ reset: false });
</script>

<svelte:head><title>{s.number} · Servis</title></svelte:head>

{#snippet info(label: string, value: string | null | undefined)}
	<div>
		<div class="text-xs text-slate-500">{label}</div>
		<div class="whitespace-pre-line">{value || '-'}</div>
	</div>
{/snippet}

<div class="max-w-6xl">
	<div class="flex flex-wrap items-start justify-between gap-3 mb-6">
		<div>
			<a href="/servis" class="text-sm text-slate-500">← Daftar servis</a>
			<h1 class="text-2xl font-bold flex flex-wrap items-center gap-3 mt-1">
				{s.number}
				<StatusBadge status={s.status} />
				{#if s.is_warranty_claim}<span class="badge bg-violet-100 text-violet-700">Klaim garansi</span>{/if}
			</h1>
			<p class="text-sm text-slate-500">Diterima {tglJam(s.received_at)} oleh {s.creator?.name || '-'}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<a href="/cetak/nota/{s.id}" target="_blank" class="btn-secondary">🖨 Tanda Terima</a>
			{#if mgr}<a href="/cetak/invoice/{s.id}" target="_blank" class="btn-secondary">🧾 Invoice</a>{/if}
			<a href={data.detail.wa_link} target="_blank" rel="noopener" class="btn-wa">WhatsApp Pelanggan</a>
		</div>
	</div>

	{#if data.isNew && !form}
		<div class="card p-4 mb-4 bg-emerald-50 border-emerald-200 text-sm text-emerald-800 flex flex-wrap items-center justify-between gap-2">
			<span>✅ Servis berhasil dicatat. Cetak tanda terima untuk pelanggan.</span>
			<a href="/cetak/nota/{s.id}" target="_blank" class="btn-success btn-sm">Cetak sekarang</a>
		</div>
	{/if}
	<Flash {form} />

	<div class="grid lg:grid-cols-3 gap-6">
		<div class="lg:col-span-2 space-y-6">
			<!-- Info unit -->
			<div class="card p-5">
				<div class="grid sm:grid-cols-2 gap-x-6 gap-y-3 text-sm">
					<div>
						<div class="text-xs text-slate-500">Pelanggan</div>
						<a href="/pelanggan/{s.customer.id}" class="text-brand-600 font-medium">{s.customer.name}</a>
						<div class="text-slate-500">{s.customer.phone}</div>
					</div>
					{@render info('Unit', `${s.device_type} · ${s.device_brand} ${s.device_model}\nSN: ${s.serial_number || '-'}`)}
					{@render info('Keluhan', s.complaint)}
					{@render info('Kelengkapan', s.accessories)}
					{@render info('Kondisi fisik', s.physical_condition)}
					{@render info('Password unit', s.device_password)}
					<div>
						<div class="text-xs text-slate-500">Teknisi</div>
						{#if s.technician}{s.technician.name}{:else}<span class="text-amber-600">Belum ditugaskan</span>{/if}
					</div>
					{@render info('Estimasi', `${rupiah(s.estimated_cost)} · selesai ${tgl(s.estimated_done)}`)}
					<div>
						<div class="text-xs text-slate-500">Garansi</div>
						{s.warranty_days} hari
						{#if w.until}<div class={w.active ? 'text-emerald-600' : 'text-slate-500'}>{w.active ? 'Aktif' : 'Habis'} s/d {tgl(w.until)}</div>{/if}
					</div>
					{#if s.parent}
						<div>
							<div class="text-xs text-slate-500">Klaim dari nota</div>
							<a href="/servis/{s.parent.id}" class="text-brand-600">{s.parent.number}</a>
						</div>
					{/if}
					{#if s.claims.length}
						<div>
							<div class="text-xs text-slate-500">Klaim garansi terkait</div>
							{#each s.claims as c (c.id)}<a href="/servis/{c.id}" class="text-brand-600 mr-2">{c.number}</a>{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Diagnosa & ubah data -->
			<details class="card p-5" open={!s.diagnosis}>
				<summary class="font-semibold cursor-pointer">Diagnosa & Ubah Data</summary>
				<form method="POST" action="?/details" use:enhance={keep} class="grid sm:grid-cols-2 gap-4 mt-4">
					<div class="sm:col-span-2">
						<label class="label" for="diagnosis">Hasil diagnosa / tindakan</label>
						<textarea id="diagnosis" name="diagnosis" rows="3" class="input" value={s.diagnosis ?? ''} placeholder="mis. IC power short, perlu ganti..."></textarea>
					</div>
					<div>
						<label class="label" for="estimated_cost">Estimasi biaya (Rp)</label>
						<input id="estimated_cost" name="estimated_cost" class="input" value={s.estimated_cost} inputmode="numeric" />
					</div>
					<div>
						<label class="label" for="estimated_done">Estimasi selesai</label>
						<input id="estimated_done" name="estimated_done" type="date" class="input" value={s.estimated_done ?? ''} />
					</div>
					{#if mgr}
						<div>
							<label class="label" for="technician_id">Teknisi</label>
							<select id="technician_id" name="technician_id" class="input" value={s.technician_id ? String(s.technician_id) : ''}>
								<option value="">— Belum ditugaskan —</option>
								{#each data.techs as x (x.id)}<option value={String(x.id)}>{x.name}</option>{/each}
							</select>
						</div>
						<div class="grid grid-cols-2 gap-2">
							<div>
								<label class="label" for="warranty_days">Garansi (hari)</label>
								<input id="warranty_days" name="warranty_days" class="input" value={s.warranty_days} inputmode="numeric" />
							</div>
							<div>
								<label class="label" for="discount">Diskon (Rp)</label>
								<input id="discount" name="discount" class="input" value={s.discount} inputmode="numeric" />
							</div>
						</div>
						<div><label class="label" for="device_brand">Merk</label><input id="device_brand" name="device_brand" class="input" value={s.device_brand} /></div>
						<div><label class="label" for="device_model">Model</label><input id="device_model" name="device_model" class="input" value={s.device_model} /></div>
						<div><label class="label" for="serial_number">Serial Number</label><input id="serial_number" name="serial_number" class="input" value={s.serial_number ?? ''} /></div>
						<div><label class="label" for="device_password">Password unit</label><input id="device_password" name="device_password" class="input" value={s.device_password ?? ''} /></div>
						<div class="sm:col-span-2"><label class="label" for="complaint">Keluhan</label><textarea id="complaint" name="complaint" rows="2" class="input" value={s.complaint}></textarea></div>
						<div><label class="label" for="accessories">Kelengkapan</label><input id="accessories" name="accessories" class="input" value={s.accessories ?? ''} /></div>
						<div><label class="label" for="physical_condition">Kondisi fisik</label><input id="physical_condition" name="physical_condition" class="input" value={s.physical_condition ?? ''} /></div>
					{/if}
					<div class="sm:col-span-2">
						<label class="label" for="notes">Catatan internal</label>
						<input id="notes" name="notes" class="input" value={s.notes ?? ''} />
					</div>
					<div><button class="btn-primary">Simpan</button></div>
				</form>
			</details>

			<!-- Biaya -->
			<div id="biaya" class="card overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-200 font-semibold">Rincian Biaya</div>
				<div class="overflow-x-auto">
					<table class="table">
						<thead><tr><th>Item</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Subtotal</th><th></th></tr></thead>
						<tbody>
							{#each s.items as i (i.id)}
								<tr>
									<td>
										<span class="badge mr-2 {i.type === 'PART' ? 'bg-orange-100 text-orange-700' : 'bg-sky-100 text-sky-700'}">{i.type === 'PART' ? 'Part' : 'Jasa'}</span>
										{i.description}
									</td>
									<td class="text-right">{i.qty}</td>
									<td class="text-right">{rupiah(i.price)}</td>
									<td class="text-right">{rupiah(i.qty * i.price)}</td>
									<td class="text-right">
										{#if editable}
											<form method="POST" action="?/deleteItem" use:enhance>
												<input type="hidden" name="item_id" value={i.id} />
												<button class="text-rose-600 text-xs cursor-pointer">Hapus</button>
											</form>
										{/if}
									</td>
								</tr>
							{:else}
								<tr><td colspan="5" class="text-center text-slate-500 py-6">Belum ada item biaya</td></tr>
							{/each}
						</tbody>
						<tfoot class="text-sm">
							<tr><td colspan="3" class="text-right">Subtotal</td><td class="text-right">{rupiah(t.subtotal)}</td><td></td></tr>
							{#if s.discount > 0}<tr><td colspan="3" class="text-right">Diskon</td><td class="text-right">- {rupiah(s.discount)}</td><td></td></tr>{/if}
							<tr class="font-semibold"><td colspan="3" class="text-right">Total</td><td class="text-right">{rupiah(t.total)}</td><td></td></tr>
							<tr><td colspan="3" class="text-right">Sudah dibayar</td><td class="text-right text-emerald-600">{rupiah(t.paid)}</td><td></td></tr>
							<tr class="font-semibold">
								<td colspan="3" class="text-right">{t.remaining >= 0 ? 'Sisa tagihan' : 'Kelebihan bayar'}</td>
								<td class="text-right {t.remaining > 0 ? 'text-rose-600' : ''}">{rupiah(Math.abs(t.remaining))}</td><td></td>
							</tr>
						</tfoot>
					</table>
				</div>

				{#if editable}
					<div class="grid md:grid-cols-2 gap-4 p-5 border-t border-slate-200 bg-slate-50">
						<form method="POST" action="?/addItem" use:enhance class="space-y-2">
							<input type="hidden" name="type" value="JASA" />
							<div class="text-sm font-medium">+ Tambah jasa</div>
							<input name="description" class="input" placeholder="mis. Jasa ganti keyboard" required />
							<div class="flex gap-2">
								<input name="price" class="input" placeholder="Harga" inputmode="numeric" required />
								<input name="qty" class="input w-20" value="1" inputmode="numeric" />
								<button class="btn-secondary">Tambah</button>
							</div>
						</form>
						<form method="POST" action="?/addItem" use:enhance class="space-y-2">
							<input type="hidden" name="type" value="PART" />
							<div class="text-sm font-medium">+ Pakai sparepart (stok otomatis berkurang)</div>
							<select name="sparepart_id" class="input" required value="">
								<option value="" disabled>Pilih sparepart...</option>
								{#each data.parts as p (p.id)}<option value={String(p.id)}>{p.name} — {rupiah(p.sell_price)} (stok {p.stock})</option>{/each}
							</select>
							<div class="flex gap-2">
								<input name="price" class="input" placeholder="Harga (default harga jual)" inputmode="numeric" />
								<input name="qty" class="input w-20" value="1" inputmode="numeric" />
								<button class="btn-secondary">Tambah</button>
							</div>
						</form>
					</div>
				{/if}
			</div>

			<!-- Pembayaran -->
			<div class="card overflow-hidden">
				<div class="px-5 py-3 border-b border-slate-200 font-semibold">Pembayaran</div>
				<table class="table">
					<thead><tr><th>Tanggal</th><th>Jenis</th><th>Metode</th><th class="text-right">Jumlah</th><th></th></tr></thead>
					<tbody>
						{#each s.payments as p (p.id)}
							<tr>
								<td>{tglJam(p.created_at)}<div class="text-xs text-slate-500">{p.user?.name ?? ''}{p.note ? ` · ${p.note}` : ''}</div></td>
								<td>{p.type}</td>
								<td>{p.method}</td>
								<td class="text-right {p.type === 'REFUND' ? 'text-rose-600' : ''}">{p.type === 'REFUND' ? '-' : ''}{rupiah(p.amount)}</td>
								<td class="text-right">
									{#if isOwner}
										<form method="POST" action="?/deletePayment" use:enhance>
											<input type="hidden" name="payment_id" value={p.id} />
											<button class="text-rose-600 text-xs cursor-pointer">Hapus</button>
										</form>
									{/if}
								</td>
							</tr>
						{:else}
							<tr><td colspan="5" class="text-center text-slate-500 py-6">Belum ada pembayaran</td></tr>
						{/each}
					</tbody>
				</table>
				{#if mgr}
					<form method="POST" action="?/pay" use:enhance class="flex flex-wrap gap-2 p-4 border-t border-slate-200 bg-slate-50">
						<input name="amount" class="input w-40" placeholder="Nominal" inputmode="numeric" value={t.remaining > 0 ? t.remaining : ''} required />
						<select name="type" class="input w-auto" value={t.total > 0 ? 'PELUNASAN' : 'DP'}>
							<option value="DP">DP</option>
							<option value="PELUNASAN">Pelunasan</option>
							<option value="REFUND">Refund</option>
						</select>
						<select name="method" class="input w-auto">{#each METHODS as m}<option>{m}</option>{/each}</select>
						<input name="note" class="input flex-1 min-w-32" placeholder="Catatan (opsional)" />
						<button class="btn-success">Catat Pembayaran</button>
					</form>
				{/if}
			</div>
		</div>

		<!-- Kolom kanan -->
		<div class="space-y-6">
			<div class="card p-5">
				<h2 class="font-semibold mb-3">Ubah Status</h2>
				<form method="POST" action="?/status" use:enhance class="space-y-3">
					<select name="status" class="input" value={s.status}>
						{#each STATUSES as x}<option value={x}>{STATUS_LABEL[x]}</option>{/each}
					</select>
					<textarea name="note" rows="2" class="input" placeholder="Catatan untuk riwayat / pesan WA (opsional)"></textarea>
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name="send_wa" value="1" checked={data.detail.fonnte_active} />
						Kirim WA otomatis {data.detail.fonnte_active ? '(Fonnte aktif)' : '(isi token Fonnte di Pengaturan)'}
					</label>
					{#if mgr && t.remaining > 0}
						<label class="flex items-center gap-2 text-xs text-slate-500">
							<input type="checkbox" name="force" value="1" /> Izinkan diambil walau belum lunas
						</label>
					{/if}
					<button class="btn-primary w-full">Update Status</button>
				</form>
				<p class="text-xs text-slate-500 mt-3">
					Tanpa token Fonnte, gunakan tombol <b>WhatsApp Pelanggan</b> untuk mengirim pesan status terbaru lewat WhatsApp Anda.
				</p>
			</div>

			<div class="card p-5">
				<h2 class="font-semibold mb-3">Riwayat</h2>
				<ol class="relative border-l border-slate-200 ml-2 space-y-4">
					{#each s.logs as l (l.id)}
						<li class="ml-4">
							<span class="absolute -left-1.5 mt-1.5 w-3 h-3 rounded-full bg-brand-500 border-2 border-white"></span>
							<div class="text-sm font-medium">{STATUS_LABEL[l.status] || l.status}</div>
							{#if l.note}<div class="text-sm text-slate-600">{l.note}</div>{/if}
							<div class="text-xs text-slate-400">{tglJam(l.created_at)} · {l.user?.name || '-'}</div>
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>
</div>
