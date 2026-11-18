<script lang="ts">
	import { BOOKING_COLOR, tglJam } from '$lib/format';
	let { data } = $props();
	const b = $derived(data.b);
	const NOTE: Record<string, string> = {
		BARU: 'Booking Anda sudah kami terima. Tim kami akan segera menghubungi Anda lewat WhatsApp untuk konfirmasi.',
		DIKONFIRMASI: 'Jadwal sudah dikonfirmasi. Sampai bertemu sesuai jadwal di bawah.',
		DITERIMA: 'Laptop Anda sudah kami terima dan sedang ditangani.',
		BATAL: 'Booking ini dibatalkan. Silakan booking ulang atau hubungi kami.'
	};
</script>

<svelte:head><title>Cek Booking · {data.settings.store_name}</title></svelte:head>

<div class="min-h-screen bg-gradient-to-b from-brand-900 to-brand-600 py-10 px-4">
	<div class="max-w-xl mx-auto">
		<a href="/booking" class="flex items-center gap-3 text-white mb-6">
			<img src="/icon.svg" alt="" class="w-11 h-11" />
			<div>
				<div class="font-bold text-lg">{data.settings.store_name}</div>
				<div class="text-sm text-white/70">Cek status booking servis</div>
			</div>
		</a>

		<form class="card p-5 space-y-3 mb-4">
			<div class="grid sm:grid-cols-[1fr_10rem] gap-3">
				<div>
					<label class="label" for="kode">Kode booking</label>
					<input id="kode" name="kode" value={data.kode} class="input font-mono uppercase" placeholder="BK261118001" required />
				</div>
				<div>
					<label class="label" for="hp">4 digit terakhir no. HP</label>
					<input id="hp" name="hp" value={data.hp} class="input" inputmode="numeric" maxlength="4" placeholder="xxxx" required />
				</div>
			</div>
			<button class="btn-primary w-full">Cek Booking</button>
			{#if data.error}<p class="text-sm text-rose-600">{data.error}</p>{/if}
		</form>

		{#if b}
			<div class="card p-5 space-y-4">
				<div class="flex justify-between items-start gap-2">
					<div>
						<div class="font-mono text-sm text-slate-500">{b.code}</div>
						<div class="font-semibold text-lg">{b.device}</div>
						<div class="text-sm text-slate-500">a.n. {b.name} · {b.problem_type}</div>
					</div>
					<span class="badge {BOOKING_COLOR[b.status]}">{b.status_label}</span>
				</div>
				<div class="rounded-lg bg-slate-50 p-3 text-sm">{NOTE[b.status]}</div>
				<div class="grid grid-cols-2 gap-3 text-sm">
					<div><div class="text-xs text-slate-500">Jadwal</div><b>{b.date_label}</b><div>{b.time}</div></div>
					<div><div class="text-xs text-slate-500">Layanan</div>{b.service_method === 'JEMPUT' ? 'Dijemput kurir' : 'Datang ke toko'}</div>
					{#if b.staff_note}<div class="col-span-2"><div class="text-xs text-slate-500">Catatan dari kami</div>{b.staff_note}</div>{/if}
					<div class="col-span-2"><div class="text-xs text-slate-500">Dibuat</div>{tglJam(b.created_at)}</div>
				</div>
				{#if b.service_number}
					<a href="/cek?nota={b.service_number}&hp={data.hp}" class="btn-primary w-full">Lihat progres servis ({b.service_number})</a>
				{/if}
			</div>
		{/if}

		<p class="text-center text-xs text-white/70 mt-6">
			<a href="/booking" class="underline">Booking baru</a> · <a href="/cek" class="underline">Cek status servis</a>
		</p>
	</div>
</div>
