<script lang="ts">
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { STATUS_LABEL, rupiah, tgl, tglJam } from '$lib/format';

	let { data } = $props();
	const svc = $derived(data.svc);
	const FLOW = ['DITERIMA', 'DIAGNOSA', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL'];
	const stepIdx = $derived(
		svc ? FLOW.indexOf(['MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART'].includes(svc.status) ? 'DIAGNOSA' : svc.status) : -1
	);
</script>

<svelte:head><title>Cek Status Servis · {data.settings.store_name}</title></svelte:head>

<div class="min-h-screen bg-gradient-to-b from-brand-900 to-brand-600 py-10 px-4">
	<div class="max-w-xl mx-auto">
		<div class="flex items-center gap-3 text-white mb-6">
			<img src="/icon.svg" alt="" class="w-11 h-11" />
			<div>
				<div class="font-bold text-lg">{data.settings.store_name}</div>
				<div class="text-sm text-white/70">Cek status servis laptop Anda</div>
			</div>
		</div>

		<form class="card p-5 space-y-3 mb-4">
			<div class="grid sm:grid-cols-[1fr_10rem] gap-3">
				<div>
					<label class="label" for="nota">Nomor nota</label>
					<input id="nota" name="nota" value={data.nota} class="input font-mono uppercase" placeholder="DN251117001" required />
				</div>
				<div>
					<label class="label" for="hp">4 digit terakhir no. HP</label>
					<!-- svelte-ignore a11y_autofocus -->
					<input id="hp" name="hp" value={data.hp} class="input" inputmode="numeric" maxlength="4" placeholder="xxxx" required autofocus={!!data.nota && !data.hp} />
				</div>
			</div>
			<button class="btn-primary w-full">Cek Status</button>
			{#if data.error}<p class="text-sm text-rose-600">{data.error}</p>{/if}
		</form>

		{#if svc}
			<div class="card p-5 space-y-5">
				<div class="flex justify-between items-start gap-2">
					<div>
						<div class="font-mono text-sm text-slate-500">{svc.number}</div>
						<div class="font-semibold text-lg">{svc.device}</div>
						<div class="text-sm text-slate-500">a.n. {svc.customer_name} · diterima {tgl(svc.received_at)}</div>
					</div>
					<StatusBadge status={svc.status} />
				</div>

				{#if svc.status !== 'BATAL'}
					<div class="flex items-center">
						{#each FLOW as st, i}
							<div class="flex-1 flex flex-col items-center relative">
								{#if i > 0}<div class="absolute top-3 right-1/2 w-full h-0.5 {i <= stepIdx ? 'bg-brand-500' : 'bg-slate-200'}"></div>{/if}
								<div class="relative z-10 w-6 h-6 rounded-full grid place-items-center text-xs text-white {i <= stepIdx ? 'bg-brand-600' : 'bg-slate-300'}">
									{i < stepIdx ? '✓' : i + 1}
								</div>
								<div class="text-[10px] sm:text-xs mt-1 text-center text-slate-600">{STATUS_LABEL[st]}</div>
							</div>
						{/each}
					</div>
				{/if}

				<div class="grid grid-cols-2 gap-3 text-sm">
					<div><div class="text-xs text-slate-500">Keluhan</div>{svc.complaint}</div>
					<div><div class="text-xs text-slate-500">Estimasi selesai</div>{tgl(svc.estimated_done)}</div>
					{#if svc.diagnosis}
						<div class="col-span-2"><div class="text-xs text-slate-500">Hasil pengecekan</div><span class="whitespace-pre-line">{svc.diagnosis}</span></div>
					{/if}
					<div><div class="text-xs text-slate-500">{svc.total ? 'Total biaya' : 'Estimasi biaya'}</div><b>{rupiah(svc.total || svc.estimated_cost)}</b></div>
					<div>
						<div class="text-xs text-slate-500">Sisa pembayaran</div>
						<b class={svc.remaining > 0 ? 'text-rose-600' : 'text-emerald-600'}>{svc.total ? (svc.remaining > 0 ? rupiah(svc.remaining) : 'Lunas') : '-'}</b>
					</div>
					{#if svc.warranty.until}
						<div class="col-span-2">
							<div class="text-xs text-slate-500">Garansi</div>
							{svc.warranty.active ? `Aktif s/d ${tgl(svc.warranty.until)}` : `Berakhir ${tgl(svc.warranty.until)}`}
						</div>
					{/if}
				</div>

				<div>
					<div class="text-xs text-slate-500 mb-2">Riwayat</div>
					<ul class="space-y-1.5 text-sm">
						{#each svc.logs as l}
							<li class="flex justify-between gap-2"><span>{STATUS_LABEL[l.status] || l.status}</span><span class="text-slate-500">{tglJam(l.created_at)}</span></li>
						{/each}
					</ul>
				</div>

				{#if svc.status === 'SELESAI'}
					<div class="rounded-lg bg-emerald-50 text-emerald-800 text-sm p-3">✅ Unit Anda sudah selesai dan siap diambil. Jangan lupa bawa tanda terima.</div>
				{/if}
				{#if svc.status === 'MENUNGGU_KONFIRMASI'}
					<div class="rounded-lg bg-amber-50 text-amber-800 text-sm p-3">⏳ Kami menunggu konfirmasi Anda untuk melanjutkan perbaikan. Silakan hubungi kami.</div>
				{/if}
			</div>
		{/if}

		<p class="text-center text-xs text-white/70 mt-6">
			{data.settings.store_address} · {data.settings.store_phone}<br />
			<a href="/login" class="underline">Login staf</a>
		</p>
	</div>
</div>
