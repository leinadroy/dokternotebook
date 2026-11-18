<script lang="ts">
	import PageHeader from '$lib/components/PageHeader.svelte';
	import StatusBadge from '$lib/components/StatusBadge.svelte';
	import { BOOKING_COLOR, BOOKING_LABEL, isoDate, STATUSES, STATUS_LABEL, rupiah, tgl, tglHari } from '$lib/format';

	let { data } = $props();
	const d = $derived(data.dash);
	const isTech = $derived(data.user?.role === 'TEKNISI');
	const today = new Date().toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
</script>

{#snippet stat(label: string, value: string | number, href = '', sub = '', tone = '')}
	<a href={href || undefined} class="card p-4 h-full block {href ? 'hover:border-brand-300' : ''}">
		<div class="text-xs text-slate-500">{label}</div>
		<div class="text-2xl font-bold mt-1 {tone === 'emerald' ? 'text-emerald-600' : tone === 'rose' ? 'text-rose-600' : 'text-slate-900'}">{value}</div>
		{#if sub}<div class="text-xs text-slate-500 mt-1">{sub}</div>{/if}
	</a>
{/snippet}

<PageHeader title="Halo, {data.user?.name}" subtitle={today}>
	{#if !isTech}<a href="/servis/baru" class="btn-primary">+ Terima Servis</a>{/if}
</PageHeader>

{#if data.denied}
	<div class="card p-3 mb-4 text-sm text-rose-700 bg-rose-50 border-rose-200">Anda tidak punya akses ke halaman tersebut.</div>
{/if}

<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
	{@render stat(isTech ? 'Tugas aktif saya' : 'Servis aktif', d.open_count, '/servis?status=AKTIF')}
	{@render stat('Siap diambil', d.ready_count, '/servis?status=SELESAI', '', 'emerald')}
	{#if !isTech}
		{@render stat('Pemasukan hari ini', rupiah(d.income_today), '', `${d.today_in} unit masuk hari ini`)}
		{@render stat('Pemasukan bulan ini', rupiah(d.income_month), '/laporan')}
	{:else}
		{@render stat('Lewat estimasi', d.overdue, '', '', d.overdue ? 'rose' : '')}
		{@render stat('Unit masuk hari ini', d.today_in)}
	{/if}
</div>

<div class="grid lg:grid-cols-3 gap-6">
	<div class="card lg:col-span-2 overflow-hidden">
		<div class="flex items-center justify-between px-4 py-3 border-b border-slate-200">
			<h2 class="font-semibold">Servis berjalan terbaru</h2>
			<a href="/servis" class="text-sm text-brand-600">Lihat semua →</a>
		</div>
		<div class="overflow-x-auto">
			<table class="table">
				<thead><tr><th>Nota</th><th>Pelanggan / Unit</th><th>Teknisi</th><th>Status</th></tr></thead>
				<tbody>
					{#each d.recent as s (s.id)}
						<tr class="hover:bg-slate-50">
							<td>
								<a href="/servis/{s.id}" class="font-medium text-brand-600">{s.number}</a>
								<div class="text-xs text-slate-500">{tgl(s.received_at)}</div>
							</td>
							<td>
								<div>{s.customer?.name}</div>
								<div class="text-xs text-slate-500">{s.device_brand} {s.device_model}</div>
							</td>
							<td class="text-slate-600">{#if s.technician}{s.technician.name}{:else}<span class="text-amber-600">Belum ditugaskan</span>{/if}</td>
							<td><StatusBadge status={s.status} /></td>
						</tr>
					{:else}
						<tr><td colspan="4" class="text-center text-slate-500 py-8">Tidak ada servis berjalan 🎉</td></tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<div class="space-y-6">
		{#if d.bookings}
			<div class="card p-4 {d.bookings.new ? 'border-amber-300 bg-amber-50/40' : ''}">
				<div class="flex items-center justify-between mb-3">
					<h2 class="font-semibold">Booking online</h2>
					<a href="/booking-masuk" class="text-sm text-brand-600">Kelola →</a>
				</div>
				<div class="flex gap-4 text-sm mb-3">
					<a href="/booking-masuk?status=BARU" class="flex-1 rounded-lg bg-white border border-slate-200 p-2 text-center">
						<div class="text-xl font-bold {d.bookings.new ? 'text-amber-600' : ''}">{d.bookings.new}</div>
						<div class="text-xs text-slate-500">perlu konfirmasi</div>
					</a>
					<a href="/booking-masuk?date={isoDate(new Date())}" class="flex-1 rounded-lg bg-white border border-slate-200 p-2 text-center">
						<div class="text-xl font-bold">{d.bookings.today}</div>
						<div class="text-xs text-slate-500">jadwal hari ini</div>
					</a>
				</div>
				{#if d.bookings.upcoming.length}
					<ul class="space-y-2 text-sm">
						{#each d.bookings.upcoming as b (b.id)}
							<li class="flex justify-between gap-2">
								<a href="/booking-masuk?q={b.code}&status=SEMUA" class="min-w-0">
									<div class="truncate font-medium">{b.name} <span class="badge {BOOKING_COLOR[b.status]} ml-1">{BOOKING_LABEL[b.status]}</span></div>
									<div class="text-xs text-slate-500 truncate">{b.device_brand} {b.device_model ?? ''} · {b.problem_type}</div>
								</a>
								<div class="text-right text-xs text-slate-600 shrink-0">{tglHari(b.preferred_date)}<br />{b.preferred_time}</div>
							</li>
						{/each}
					</ul>
				{:else}
					<p class="text-sm text-slate-500">Belum ada booking mendatang.</p>
				{/if}
			</div>
		{/if}
		<div class="card p-4">
			<h2 class="font-semibold mb-3">Status servis</h2>
			<div class="space-y-1">
				{#each STATUSES as st}
					<a href="/servis?status={st}" class="flex items-center justify-between text-sm hover:bg-slate-50 rounded px-1 py-0.5">
						<span class="text-slate-600">{STATUS_LABEL[st]}</span>
						<span class="font-semibold">{d.counts[st] || 0}</span>
					</a>
				{/each}
			</div>
		</div>
		<div class="card p-4">
			<div class="flex items-center justify-between mb-3">
				<h2 class="font-semibold">Stok menipis</h2>
				<a href="/sparepart?low=1" class="text-sm text-brand-600">Semua →</a>
			</div>
			{#if d.low_stock.length === 0}
				<p class="text-sm text-slate-500">Semua stok aman.</p>
			{:else}
				<ul class="space-y-2 text-sm">
					{#each d.low_stock as p (p.id)}
						<li class="flex justify-between gap-2">
							<span class="truncate">{p.name}</span>
							<span class="font-semibold {p.stock === 0 ? 'text-rose-600' : 'text-amber-600'}">{p.stock}</span>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	</div>
</div>
