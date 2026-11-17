<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';

	let { data, form } = $props();
	const s = $derived(data.s);
</script>

<div class="max-w-3xl">
	<PageHeader title="Pengaturan" subtitle="Identitas toko, nota, dan notifikasi WhatsApp" />
	<Flash {form} />
	<form method="POST" use:enhance={() => async ({ update }) => update({ reset: false })} class="space-y-6">
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
		<button class="btn-primary">Simpan Pengaturan</button>
	</form>
</div>
