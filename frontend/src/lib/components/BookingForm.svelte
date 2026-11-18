<script lang="ts">
	import { api, errMsg } from '$lib/api';
	import { HARI } from '$lib/format';
	import type { BookingInfo } from '../../routes/booking/+page';

	let { info }: { info: BookingInfo } = $props();

	const BRANDS = ['ASUS', 'Acer', 'Lenovo', 'HP', 'Dell', 'Apple', 'MSI', 'Toshiba', 'Samsung', 'Axioo', 'Advan', 'Huawei', 'Xiaomi', 'Lainnya'];

	let problem = $state('');
	let method = $state<'DATANG' | 'JEMPUT'>('DATANG');
	let date = $state('');
	let time = $state('');
	let pending = $state(false);
	let error = $state('');
	let fieldErrors = $state<Record<string, string>>({});
	let done = $state<{ code: string; date_label: string; time: string; status_link: string } | null>(null);
	let formEl = $state<HTMLFormElement>();

	const iso = (d: Date) => new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
	const minDate = $derived(info.today);
	const maxDate = $derived(iso(new Date(new Date(info.today + 'T00:00:00').getTime() + info.max_days * 86400000)));
	const closedNames = $derived(info.closed_days.map((d) => HARI[d]).join(', '));
	const dateClosed = $derived(date ? info.closed_days.includes(new Date(date + 'T00:00:00').getDay()) : false);

	// Beberapa tanggal terdekat yang buka, sebagai pilihan cepat
	const quickDates = $derived.by(() => {
		const out: { value: string; label: string }[] = [];
		const d = new Date(info.today + 'T00:00:00');
		for (let i = 0; out.length < 6 && i < info.max_days; i++) {
			if (!info.closed_days.includes(d.getDay())) {
				out.push({
					value: iso(d),
					label: i === 0 ? 'Hari ini' : i === 1 ? 'Besok' : d.toLocaleDateString('id-ID', { weekday: 'short', day: 'numeric', month: 'short' })
				});
			}
			d.setDate(d.getDate() + 1);
		}
		return out;
	});

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		error = '';
		fieldErrors = {};
		if (!problem) return fail('Pilih jenis kerusakan.', 'problem_type');
		if (!date) return fail('Pilih tanggal kedatangan.', 'preferred_date');
		if (dateClosed) return fail(`Toko tutup pada hari ${HARI[new Date(date + 'T00:00:00').getDay()]}. Pilih tanggal lain.`, 'preferred_date');
		if (!time) return fail('Pilih jam kedatangan.', 'preferred_time');

		if (!formEl) return;
		const fd = new FormData(formEl);
		const body: Record<string, unknown> = Object.fromEntries([...fd.entries()].map(([k, v]) => [k, String(v).trim()]));
		Object.assign(body, { problem_type: problem, service_method: method, preferred_date: date, preferred_time: time });

		pending = true;
		const r = await api('/public/booking', { method: 'POST', body });
		pending = false;
		if (!r.ok) {
			error = errMsg(r.data);
			const errs = (r.data as any)?.errors || {};
			fieldErrors = Object.fromEntries(Object.keys(errs).map((k) => [k, errs[k][0]]));
			formEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
			return;
		}
		done = r.data;
		formEl?.parentElement?.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}

	function fail(msg: string, field: string) {
		error = msg;
		fieldErrors = { [field]: msg };
	}

	function reset() {
		done = null;
		problem = '';
		date = '';
		time = '';
		method = 'DATANG';
	}

	const waStore = $derived(
		info.store.wa ? `https://wa.me/${info.store.wa}?text=${encodeURIComponent(done ? `Halo, saya sudah booking servis dengan kode ${done.code}.` : 'Halo, saya mau tanya servis laptop.')}` : ''
	);
</script>

{#if done}
	<div class="text-center py-6">
		<div class="mx-auto w-16 h-16 rounded-full bg-emerald-100 text-emerald-600 grid place-items-center text-3xl">✓</div>
		<h3 class="text-xl font-bold mt-4">Booking terkirim!</h3>
		<p class="text-slate-600 mt-1">Kami akan menghubungi Anda lewat WhatsApp untuk konfirmasi jadwal.</p>
		<div class="inline-block mt-5 rounded-xl border-2 border-dashed border-brand-300 bg-brand-50 px-6 py-4">
			<div class="text-xs text-slate-500">Kode booking Anda</div>
			<div class="font-mono text-2xl font-bold text-brand-700 tracking-wider">{done.code}</div>
			<div class="text-sm text-slate-600 mt-1">{done.date_label} · {done.time}</div>
		</div>
		<p class="text-xs text-slate-500 mt-3">Simpan kode ini untuk mengecek status booking.</p>
		<div class="flex flex-wrap justify-center gap-2 mt-5">
			<a href={done.status_link} target="_top" class="btn-secondary">Cek status booking</a>
			{#if waStore}<a href={waStore} target="_blank" rel="noopener" class="btn-wa">Chat WhatsApp toko</a>{/if}
			<button type="button" class="btn-secondary" onclick={reset}>Booking lagi</button>
		</div>
	</div>
{:else if !info.enabled}
	<div class="text-center py-8">
		<p class="font-semibold">Booking online sedang ditutup.</p>
		<p class="text-sm text-slate-600 mt-1">Silakan hubungi kami langsung untuk menjadwalkan servis.</p>
		{#if waStore}<a href={waStore} target="_blank" rel="noopener" class="btn-wa mt-4">Chat WhatsApp</a>{/if}
	</div>
{:else}
	<form bind:this={formEl} onsubmit={submit} class="space-y-6" novalidate>
		<!-- jebakan bot: disembunyikan dari manusia -->
		<div class="hidden" aria-hidden="true">
			<label>Website <input name="website" tabindex="-1" autocomplete="off" /></label>
		</div>

		{#if error}
			<div class="rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-sm p-3" role="alert">{error}</div>
		{/if}

		<fieldset class="space-y-3">
			<legend class="font-semibold text-slate-900 mb-2"><span class="step">1</span> Apa masalah laptop Anda?</legend>
			<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Jenis kerusakan">
				{#each info.problem_types as p}
					<button
						type="button"
						role="radio"
						aria-checked={problem === p}
						class="chip {problem === p ? 'chip-on' : ''}"
						onclick={() => {
							problem = p;
							fieldErrors.problem_type = '';
						}}>{p}</button
					>
				{/each}
			</div>
			{#if fieldErrors.problem_type}<p class="field-err">{fieldErrors.problem_type}</p>{/if}
			<div class="grid sm:grid-cols-2 gap-3">
				<div>
					<label class="label" for="bk-brand">Merk laptop *</label>
					<input id="bk-brand" name="device_brand" class="input" list="bk-brands" required placeholder="mis. ASUS" />
					<datalist id="bk-brands">{#each BRANDS as b}<option value={b}></option>{/each}</datalist>
				</div>
				<div>
					<label class="label" for="bk-model">Tipe / model</label>
					<input id="bk-model" name="device_model" class="input" placeholder="mis. VivoBook X441 (boleh dikosongkan)" />
				</div>
			</div>
			<div>
				<label class="label" for="bk-complaint">Ceritakan keluhannya *</label>
				<textarea id="bk-complaint" name="complaint" class="input" rows="3" required minlength="5" placeholder="mis. Laptop tidak mau menyala sejak kemarin, lampu indikator mati"></textarea>
				{#if fieldErrors.complaint}<p class="field-err">{fieldErrors.complaint}</p>{/if}
			</div>
		</fieldset>

		<fieldset class="space-y-3">
			<legend class="font-semibold text-slate-900 mb-2"><span class="step">2</span> Kapan Anda ingin datang?</legend>
			<div class="grid {info.pickup ? 'sm:grid-cols-2' : ''} gap-3">
				<label class="option {method === 'DATANG' ? 'option-on' : ''}">
					<input type="radio" name="_method" value="DATANG" bind:group={method} class="sr-only" />
					<span class="font-medium">🏪 Datang ke toko</span>
					<span class="text-xs text-slate-500">Bawa laptop Anda ke toko sesuai jadwal</span>
				</label>
				{#if info.pickup}
					<label class="option {method === 'JEMPUT' ? 'option-on' : ''}">
						<input type="radio" name="_method" value="JEMPUT" bind:group={method} class="sr-only" />
						<span class="font-medium">🛵 Dijemput kurir</span>
						<span class="text-xs text-slate-500">Kami ambil laptop di alamat Anda</span>
					</label>
				{/if}
			</div>
			{#if method === 'JEMPUT'}
				<div>
					<label class="label" for="bk-address">Alamat penjemputan lengkap *</label>
					<textarea id="bk-address" name="address" class="input" rows="2" placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan, patokan"></textarea>
					{#if fieldErrors.address}<p class="field-err">{fieldErrors.address}</p>{/if}
				</div>
			{/if}
			<div>
				<span class="label">Tanggal *</span>
				<div class="flex flex-wrap gap-2 mb-2">
					{#each quickDates as q (q.value)}
						<button type="button" class="chip {date === q.value ? 'chip-on' : ''}" onclick={() => (date = q.value)}>{q.label}</button>
					{/each}
				</div>
				<input type="date" class="input sm:w-56" bind:value={date} min={minDate} max={maxDate} aria-label="Pilih tanggal lain" />
				{#if closedNames}<p class="text-xs text-slate-500 mt-1">Toko tutup hari {closedNames}.</p>{/if}
				{#if fieldErrors.preferred_date || dateClosed}<p class="field-err">{fieldErrors.preferred_date || 'Toko tutup pada hari tersebut.'}</p>{/if}
			</div>
			<div>
				<span class="label">Jam *</span>
				<div class="flex flex-wrap gap-2" role="radiogroup" aria-label="Jam kedatangan">
					{#each info.slots as s}
						<button type="button" role="radio" aria-checked={time === s} class="chip {time === s ? 'chip-on' : ''}" onclick={() => (time = s)}>{s}</button>
					{/each}
				</div>
				{#if fieldErrors.preferred_time}<p class="field-err">{fieldErrors.preferred_time}</p>{/if}
			</div>
		</fieldset>

		<fieldset class="space-y-3">
			<legend class="font-semibold text-slate-900 mb-2"><span class="step">3</span> Data Anda</legend>
			<div class="grid sm:grid-cols-2 gap-3">
				<div>
					<label class="label" for="bk-name">Nama *</label>
					<input id="bk-name" name="name" class="input" required autocomplete="name" />
					{#if fieldErrors.name}<p class="field-err">{fieldErrors.name}</p>{/if}
				</div>
				<div>
					<label class="label" for="bk-phone">No. WhatsApp *</label>
					<input id="bk-phone" name="phone" class="input" required inputmode="tel" autocomplete="tel" placeholder="08xxxxxxxxxx" />
					{#if fieldErrors.phone}<p class="field-err">{fieldErrors.phone}</p>{/if}
				</div>
				<div class="sm:col-span-2">
					<label class="label" for="bk-email">Email (opsional)</label>
					<input id="bk-email" name="email" type="email" class="input" autocomplete="email" />
					{#if fieldErrors.email}<p class="field-err">{fieldErrors.email}</p>{/if}
				</div>
			</div>
		</fieldset>

		<button class="btn-primary w-full py-3 text-base" disabled={pending}>{pending ? 'Mengirim...' : 'Kirim Booking'}</button>
		<p class="text-xs text-center text-slate-500">Gratis, tanpa biaya booking. Kami konfirmasi lewat WhatsApp.</p>
	</form>
{/if}

<style>
	.step {
		display: inline-grid;
		place-items: center;
		width: 1.5rem;
		height: 1.5rem;
		margin-right: 0.4rem;
		border-radius: 9999px;
		background: #1f63d8;
		color: white;
		font-size: 0.75rem;
	}
	.chip {
		border: 1px solid #cbd5e1;
		background: white;
		border-radius: 9999px;
		padding: 0.4rem 0.85rem;
		font-size: 0.875rem;
		cursor: pointer;
		transition: all 0.15s;
	}
	.chip:hover {
		border-color: #2f7cf6;
	}
	.chip-on {
		background: #1f63d8;
		border-color: #1f63d8;
		color: white;
	}
	.option {
		display: flex;
		flex-direction: column;
		gap: 0.15rem;
		border: 1.5px solid #cbd5e1;
		border-radius: 0.75rem;
		padding: 0.75rem 1rem;
		cursor: pointer;
		background: white;
	}
	.option-on {
		border-color: #1f63d8;
		background: #eef6ff;
		box-shadow: 0 0 0 3px #d9eaff;
	}
	.field-err {
		color: #e11d48;
		font-size: 0.75rem;
		margin-top: 0.25rem;
	}
</style>
