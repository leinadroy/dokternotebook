<script lang="ts">
	import { rupiah, tgl, tglJam } from '$lib/format';
	let { data } = $props();
	const s = $derived(data.detail.service);
	const dp = $derived(s.payments.filter((p: any) => p.type === 'DP').reduce((a: number, p: any) => a + p.amount, 0));
</script>

<svelte:head><title>Tanda Terima {s.number}</title></svelte:head>

{#snippet row(k: string, v: string | null | undefined, bold = false)}
	<tr><td class="py-1 pr-3 text-slate-600 w-36 align-top">{k}</td><td class="py-1 align-top {bold ? 'font-semibold' : ''}">{v || '-'}</td></tr>
{/snippet}

<div class="grid grid-cols-2 gap-6">
	<table><tbody>
		{@render row('Tanggal terima', tglJam(s.received_at))}
		{@render row('Nama', s.customer.name, true)}
		{@render row('No. HP', s.customer.phone)}
		{@render row('Alamat', s.customer.address)}
	</tbody></table>
	<table><tbody>
		{@render row('Unit', `${s.device_type} ${s.device_brand} ${s.device_model}`, true)}
		{@render row('Serial Number', s.serial_number)}
		{@render row('Kelengkapan', s.accessories)}
		{@render row('Kondisi fisik', s.physical_condition)}
	</tbody></table>
</div>
<div class="border border-slate-300 rounded p-3 my-4">
	<div class="text-xs text-slate-500">Keluhan</div>
	<div class="whitespace-pre-line">{s.complaint}</div>
</div>
<div class="grid grid-cols-3 gap-4 mb-4">
	<div class="border border-slate-300 rounded p-3"><div class="text-xs text-slate-500">Estimasi biaya</div><b>{s.estimated_cost ? rupiah(s.estimated_cost) : 'Menunggu diagnosa'}</b></div>
	<div class="border border-slate-300 rounded p-3"><div class="text-xs text-slate-500">Uang muka (DP)</div><b>{rupiah(dp)}</b></div>
	<div class="border border-slate-300 rounded p-3"><div class="text-xs text-slate-500">Estimasi selesai</div><b>{tgl(s.estimated_done)}</b></div>
</div>
<div class="flex gap-4 items-center mb-6">
	<img src={data.qr} alt="QR cek status" class="w-24 h-24" />
	<div class="text-xs text-slate-600">
		Cek status servis online: scan QR atau buka <b>{data.cekUrl}</b><br />
		Masukkan 4 digit terakhir no. HP Anda untuk verifikasi.<br />
		Simpan nota ini. Pengambilan unit wajib menunjukkan tanda terima.
	</div>
</div>
<p class="text-xs text-slate-500 border-t border-slate-200 pt-2 mb-10">{data.settings.receipt_footer}</p>
<div class="grid grid-cols-2 text-center text-sm">
	<div>Pelanggan<div class="h-16"></div>( {s.customer.name} )</div>
	<div>Penerima<div class="h-16"></div>( {s.creator?.name || '................'} )</div>
</div>
