<script lang="ts">
	import { goto } from '$app/navigation';
	import { api, formObj, send, type FormResult } from '$lib/api';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import Flash from '$lib/components/Flash.svelte';
	import { METHODS } from '$lib/format';

	let { data } = $props();
	let form = $state<FormResult>(null);
	const parent = $derived(data.parent);

	const BRANDS = ['ASUS', 'Acer', 'Lenovo', 'HP', 'Dell', 'Apple', 'MSI', 'Toshiba', 'Samsung', 'Axioo', 'Advan', 'Huawei', 'Xiaomi', 'Lainnya'];
	const TYPES = ['Laptop', 'Notebook', 'MacBook', 'Netbook', 'Ultrabook', 'Laptop Gaming', 'PC / AIO', 'Lainnya'];
	const ACCESSORIES = ['Charger', 'Tas', 'Mouse', 'Baterai cadangan', 'Dus / box', 'Kabel data'];

	// Data pelanggan (auto-isi dari no HP)
	let name = $state(data.customer?.name ?? '');
	let address = $state(data.customer?.address ?? '');
	let email = $state(data.customer?.email ?? '');
	let accessories = $state('');
	let info = $state('');
	let pending = $state(false);

	async function lookup(e: Event) {
		const phone = (e.target as HTMLInputElement).value;
		if (phone.replace(/\D/g, '').length < 8) return;
		const r = await api('/customers/lookup', { query: { phone } });
		const c = r.ok ? r.data : null;
		if (c) {
			name = c.name;
			address = c.address ?? '';
			email = c.email ?? '';
			info = `Pelanggan lama · ${c.services_count}x servis`;
		} else info = 'Pelanggan baru';
	}

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		pending = true;
		const body = formObj(new FormData(e.currentTarget as HTMLFormElement), ['estimated_cost', 'down_payment', 'warranty_days', 'technician_id', 'parent_id']);
		const r = await send('/services', 'POST', body);
		pending = false;
		if (r?.data?.id) await goto(`/servis/${r.data.id}?baru=1`);
		else {
			form = r;
			window.scrollTo({ top: 0, behavior: 'smooth' });
		}
	}

	function toggleAcc(a: string) {
		const list = accessories.split(',').map((s) => s.trim()).filter(Boolean);
		accessories = (list.includes(a) ? list.filter((x) => x !== a) : [...list, a]).join(', ');
	}
</script>

<div class="max-w-4xl">
	<PageHeader
		title={parent ? 'Klaim Garansi' : 'Terima Servis Baru'}
		subtitle={parent ? `Klaim atas nota ${parent.number} — biaya jasa tidak dikenakan bila kerusakan sama` : 'Isi data pelanggan dan unit yang diterima'}
	/>
	<Flash {form} />

	<form class="space-y-6" onsubmit={submit}>
		{#if parent}<input type="hidden" name="parent_id" value={parent.id} />{/if}

		<section class="card p-5">
			<h2 class="font-semibold mb-4">1. Data Pelanggan</h2>
			<div class="grid sm:grid-cols-2 gap-4">
				<div>
					<label class="label" for="phone">No. HP / WhatsApp *</label>
					<input id="phone" name="phone" class="input" required value={data.customer?.phone ?? ''} placeholder="08xxxxxxxxxx" onblur={lookup} inputmode="tel" />
					{#if info}<p class="text-xs text-brand-600 mt-1">{info}</p>{/if}
				</div>
				<div>
					<label class="label" for="customer_name">Nama pelanggan *</label>
					<input id="customer_name" name="customer_name" class="input" required bind:value={name} />
				</div>
				<div>
					<label class="label" for="address">Alamat</label>
					<input id="address" name="address" class="input" bind:value={address} />
				</div>
				<div>
					<label class="label" for="email">Email</label>
					<input id="email" name="email" type="email" class="input" bind:value={email} />
				</div>
			</div>
		</section>

		<section class="card p-5">
			<h2 class="font-semibold mb-4">2. Data Unit</h2>
			<div class="grid sm:grid-cols-3 gap-4">
				<div>
					<label class="label" for="device_type">Jenis</label>
					<select id="device_type" name="device_type" class="input" value={parent?.device_type ?? 'Laptop'}>
						{#each TYPES as t}<option>{t}</option>{/each}
					</select>
				</div>
				<div>
					<label class="label" for="device_brand">Merk *</label>
					<input id="device_brand" name="device_brand" class="input" list="brands" required value={parent?.device_brand ?? ''} />
					<datalist id="brands">{#each BRANDS as b}<option value={b}></option>{/each}</datalist>
				</div>
				<div>
					<label class="label" for="device_model">Tipe / Model *</label>
					<input id="device_model" name="device_model" class="input" required value={parent?.device_model ?? ''} placeholder="mis. VivoBook X441" />
				</div>
				<div>
					<label class="label" for="serial_number">Serial Number</label>
					<input id="serial_number" name="serial_number" class="input" value={parent?.serial_number ?? ''} />
				</div>
				<div>
					<label class="label" for="device_password">Password / PIN unit</label>
					<input id="device_password" name="device_password" class="input" placeholder="Untuk pengecekan" />
				</div>
				<div>
					<label class="label" for="physical_condition">Kondisi fisik</label>
					<input id="physical_condition" name="physical_condition" class="input" placeholder="mis. lecet, engsel patah" />
				</div>
				<div class="sm:col-span-3">
					<label class="label" for="complaint">Keluhan *</label>
					<textarea id="complaint" name="complaint" class="input" rows="3" required placeholder="Jelaskan keluhan pelanggan"></textarea>
				</div>
				<div class="sm:col-span-3">
					<label class="label" for="accessories">Kelengkapan yang dititipkan</label>
					<div class="flex flex-wrap gap-2 mb-2">
						{#each ACCESSORIES as a}
							<button type="button" class="badge cursor-pointer {accessories.includes(a) ? 'bg-brand-600 text-white' : 'bg-slate-100 text-slate-600'}" onclick={() => toggleAcc(a)}>{a}</button>
						{/each}
					</div>
					<input id="accessories" name="accessories" class="input" bind:value={accessories} placeholder="mis. Charger, Tas" />
				</div>
			</div>
		</section>

		<section class="card p-5">
			<h2 class="font-semibold mb-4">3. Penugasan & Biaya</h2>
			<div class="grid sm:grid-cols-3 gap-4">
				<div>
					<label class="label" for="technician_id">Teknisi</label>
					<select id="technician_id" name="technician_id" class="input" value={parent?.technician_id ? String(parent.technician_id) : ''}>
						<option value="">— Tentukan nanti —</option>
						{#each data.techs as t (t.id)}<option value={String(t.id)}>{t.name}</option>{/each}
					</select>
				</div>
				<div>
					<label class="label" for="estimated_cost">Estimasi biaya (Rp)</label>
					<input id="estimated_cost" name="estimated_cost" class="input" inputmode="numeric" placeholder="0" />
				</div>
				<div>
					<label class="label" for="estimated_done">Estimasi selesai</label>
					<input id="estimated_done" name="estimated_done" type="date" class="input" />
				</div>
				<div>
					<label class="label" for="down_payment">Uang muka / DP (Rp)</label>
					<input id="down_payment" name="down_payment" class="input" inputmode="numeric" placeholder="0" />
				</div>
				<div>
					<label class="label" for="dp_method">Metode DP</label>
					<select id="dp_method" name="dp_method" class="input">{#each METHODS as m}<option>{m}</option>{/each}</select>
				</div>
				<div>
					<label class="label" for="warranty_days">Garansi servis (hari)</label>
					<input id="warranty_days" name="warranty_days" type="number" min="0" class="input" value={data.settings.default_warranty_days || 30} />
				</div>
				<div class="sm:col-span-3">
					<label class="label" for="notes">Catatan internal</label>
					<input id="notes" name="notes" class="input" value={parent ? `Klaim garansi dari nota ${parent.number}` : ''} />
				</div>
			</div>
		</section>

		<button class="btn-primary" disabled={pending}>{pending ? 'Menyimpan...' : 'Simpan & Buat Tanda Terima'}</button>
	</form>
</div>
