<script lang="ts">
	import { rupiah, tgl, tglJam } from '$lib/format';
	let { data } = $props();
	const s = $derived(data.detail.service);
	const t = $derived(data.detail.totals);
	const w = $derived(data.detail.warranty);
</script>

<svelte:head><title>Invoice {s.number}</title></svelte:head>

<div class="grid grid-cols-2 gap-6 mb-4">
	<div>
		<div class="text-xs text-slate-500">Kepada</div>
		<div class="font-semibold">{s.customer.name}</div>
		<div>{s.customer.phone}</div>
		<div>{s.customer.address ?? ''}</div>
	</div>
	<div class="text-right">
		<div>Tanggal: {tgl(new Date())}</div>
		<div>Unit: {s.device_brand} {s.device_model}</div>
		<div>SN: {s.serial_number || '-'}</div>
		<div>Teknisi: {s.technician?.name || '-'}</div>
	</div>
</div>
{#if s.diagnosis}
	<div class="border border-slate-300 rounded p-3 mb-4">
		<div class="text-xs text-slate-500">Diagnosa / Tindakan</div>
		<div class="whitespace-pre-line">{s.diagnosis}</div>
	</div>
{/if}
<table class="w-full border-collapse mb-4">
	<thead>
		<tr class="border-y-2 border-slate-800 text-left">
			<th class="py-1.5">Deskripsi</th><th class="text-right">Qty</th><th class="text-right">Harga</th><th class="text-right">Jumlah</th>
		</tr>
	</thead>
	<tbody>
		{#each s.items as i (i.id)}
			<tr class="border-b border-slate-200">
				<td class="py-1.5">{i.description} <span class="text-xs text-slate-500">({i.type === 'PART' ? 'sparepart' : 'jasa'})</span></td>
				<td class="text-right">{i.qty}</td>
				<td class="text-right">{rupiah(i.price)}</td>
				<td class="text-right">{rupiah(i.qty * i.price)}</td>
			</tr>
		{/each}
	</tbody>
</table>
<div class="flex justify-end">
	<table class="w-80">
		<tbody>
			<tr><td>Subtotal</td><td class="text-right">{rupiah(t.subtotal)}</td></tr>
			{#if s.discount > 0}<tr><td>Diskon</td><td class="text-right">- {rupiah(s.discount)}</td></tr>{/if}
			<tr class="font-bold border-t border-slate-800"><td class="py-1">TOTAL</td><td class="text-right">{rupiah(t.total)}</td></tr>
			{#each s.payments as p (p.id)}
				<tr class="text-slate-600">
					<td>{p.type} {p.method} <span class="text-xs">{tglJam(p.created_at)}</span></td>
					<td class="text-right">{p.type === 'REFUND' ? '+' : '-'} {rupiah(p.amount)}</td>
				</tr>
			{/each}
			<tr class="font-bold border-t border-slate-300">
				<td class="py-1">{t.remaining > 0 ? 'SISA TAGIHAN' : 'STATUS'}</td>
				<td class="text-right">{t.remaining > 0 ? rupiah(t.remaining) : 'LUNAS'}</td>
			</tr>
		</tbody>
	</table>
</div>
<div class="mt-6 border border-slate-300 rounded p-3 text-xs">
	<b>Garansi servis {s.warranty_days} hari</b>
	{w.until ? ` — berlaku s/d ${tgl(w.until)}` : ' — dihitung sejak unit diambil'}. Garansi hanya untuk kerusakan/sparepart yang sama.
</div>
<p class="text-xs text-slate-500 mt-3">{data.settings.receipt_footer}</p>
<div class="text-center mt-8 text-sm">Terima kasih atas kepercayaan Anda 🙏</div>
