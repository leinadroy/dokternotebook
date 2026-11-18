<script lang="ts">
	import { apiForm, type FormResult } from '$lib/api';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { HARI } from '$lib/format';

	let { data } = $props();
	let form = $state<FormResult>(null);
	const s = $derived(data.s);
	let closed = $state<number[]>(
		String(data.s.booking_closed_days ?? '')
			.split(',')
			.filter((x) => x !== '')
			.map(Number)
	);
	const appUrl = $derived((s.public_url || location.origin).replace(/\/$/, ''));
	const embedCode = $derived(
		`<iframe src="${appUrl}/booking?embed=1" style="width:100%;min-height:1100px;border:0" title="Booking servis laptop" loading="lazy"></iframe>`
	);
</script>

<div class="max-w-3xl">
	<PageHeader title="Pengaturan" subtitle="Identitas toko, nota, dan notifikasi WhatsApp" />
	<Flash {form} />
	<form use:apiForm={{ path: '/settings', method: 'PUT', numeric: ['default_warranty_days'], bools: ['booking_enabled', 'booking_pickup'], done: (r) => (form = r) }} class="space-y-6">
		<section class="card p-5 grid sm:grid-cols-2 gap-4">
			<h2 class="font-semibold sm:col-span-2">Identitas Toko</h2>
			<div><label class="label" for="store_name">Nama toko</label><input id="store_name" name="store_name" class="input" required value={s.store_name ?? ''} /></div>
			<div><label class="label" for="store_tagline">Tagline</label><input id="store_tagline" name="store_tagline" class="input" value={s.store_tagline ?? ''} /></div>
			<div class="sm:col-span-2"><label class="label" for="store_address">Alamat</label><input id="store_address" name="store_address" class="input" value={s.store_address ?? ''} /></div>
			<div><label class="label" for="store_phone">Telepon / WA toko</label><input id="store_phone" name="store_phone" class="input" value={s.store_phone ?? ''} /></div>
			<div><label class="label" for="default_warranty_days">Garansi default (hari)</label><input id="default_warranty_days" name="default_warranty_days" type="number" class="input" value={s.default_warranty_days ?? 30} /></div>
			<div class="sm:col-span-2">
				<label class="label" for="receipt_footer">Catatan kaki nota (syarat & ketentuan)</label>
				<textarea id="receipt_footer" name="receipt_footer" rows="3" class="input" value={s.receipt_footer ?? ''}></textarea>
			</div>
		</section>

		<section class="card p-5 space-y-4">
			<h2 class="font-semibold">WhatsApp & Cek Status Online</h2>
			<div>
				<label class="label" for="public_url">Alamat web aplikasi (untuk link cek status di nota & WA)</label>
				<input id="public_url" name="public_url" class="input" value={s.public_url ?? ''} placeholder="https://servis.tokoanda.com" />
			</div>
			<div>
				<label class="label" for="wa_template">Template pesan WA</label>
				<textarea id="wa_template" name="wa_template" rows="4" class="input font-mono text-xs" value={s.wa_template ?? ''}></textarea>
				<p class="text-xs text-slate-500 mt-1">Variabel: {'{nama} {nota} {perangkat} {toko} {status} {catatan} {link}'}</p>
			</div>
			<div>
				<label class="label" for="fonnte_token">Token Fonnte (opsional — untuk kirim WA otomatis)</label>
				<input id="fonnte_token" name="fonnte_token" type="password" class="input" value={s.fonnte_token ?? ''} autocomplete="off" />
				<p class="text-xs text-slate-500 mt-1">
					Kosongkan jika tidak pakai. Tanpa token, kirim WA manual lewat tombol “WhatsApp Pelanggan” (membuka wa.me dengan pesan otomatis terisi).
				</p>
			</div>
		</section>

		<section class="card p-5 space-y-4">
			<div class="flex flex-wrap justify-between gap-2">
				<h2 class="font-semibold">Booking Online</h2>
				<a href="/booking" target="_blank" class="text-sm text-brand-600">Lihat halaman booking →</a>
			</div>
			<div class="flex flex-wrap gap-6">
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="booking_enabled" value="1" checked={s.booking_enabled !== '0'} /> Terima booking online</label>
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="booking_pickup" value="1" checked={s.booking_pickup !== '0'} /> Tawarkan layanan jemput</label>
			</div>
			<div>
				<label class="label" for="booking_slots">Pilihan jam (pisahkan dengan koma)</label>
				<input id="booking_slots" name="booking_slots" class="input" value={s.booking_slots ?? ''} placeholder="09.00 - 12.00,12.00 - 15.00,15.00 - 18.00" />
			</div>
			<div>
				<span class="label">Hari tutup (tidak bisa dipilih pelanggan)</span>
				<div class="flex flex-wrap gap-3">
					{#each HARI as h, i}
						<label class="flex items-center gap-1.5 text-sm">
							<input
								type="checkbox"
								checked={closed.includes(i)}
								onchange={(e) => (closed = (e.currentTarget as HTMLInputElement).checked ? [...closed, i] : closed.filter((x) => x !== i))}
							/>
							{h}
						</label>
					{/each}
				</div>
				<input type="hidden" name="booking_closed_days" value={[...closed].sort().join(',')} />
			</div>
			<div>
				<label class="label" for="booking_intro">Kalimat pembuka di halaman booking</label>
				<textarea id="booking_intro" name="booking_intro" rows="2" class="input" value={s.booking_intro ?? ''}></textarea>
			</div>
			<div>
				<label class="label" for="booking_wa_template">Template WA konfirmasi booking</label>
				<textarea id="booking_wa_template" name="booking_wa_template" rows="3" class="input font-mono text-xs" value={s.booking_wa_template ?? ''}></textarea>
				<p class="text-xs text-slate-500 mt-1">Variabel: {'{nama} {kode} {toko} {tanggal} {jam} {metode} {catatan} {link}'}</p>
			</div>
			<div class="rounded-lg bg-slate-50 p-3 text-sm space-y-2">
				<div class="font-medium">Pasang di situs WordPress / landing page</div>
				<p class="text-slate-600">Arahkan tombol "Book Now" ke link ini:</p>
				<code class="block bg-white border border-slate-200 rounded px-2 py-1 text-xs break-all">{appUrl}/booking#booking</code>
				<p class="text-slate-600">Atau sematkan form booking langsung (blok "Custom HTML" di WordPress):</p>
				<code class="block bg-white border border-slate-200 rounded px-2 py-1 text-xs break-all">{embedCode}</code>
			</div>
		</section>
		<button class="btn-primary">Simpan Pengaturan</button>
	</form>
</div>
