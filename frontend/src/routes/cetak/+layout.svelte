<script lang="ts">
	import { page } from '$app/state';
	let { data, children } = $props();
	const s = $derived(data.settings);
	// judul dokumen & nomor nota datang dari load() halaman anak
	const docTitle = $derived(page.data.docTitle as string);
	const number = $derived(page.data.detail?.service?.number as string);
</script>

<div class="bg-white min-h-screen">
	<div class="no-print flex gap-2 justify-center py-4">
		<button onclick={() => window.print()} class="btn-primary">🖨 Cetak</button>
		<button onclick={() => window.close()} class="btn-secondary">Tutup</button>
	</div>
	<div class="max-w-3xl mx-auto px-6 pb-6 text-sm">
		<div class="flex justify-between items-start border-b-2 border-slate-800 pb-3 mb-4">
			<div class="flex gap-3 items-center">
				<img src="/icon.svg" alt="" class="w-12 h-12" />
				<div>
					<div class="text-xl font-bold">{s.store_name}</div>
					<div class="text-xs text-slate-600">{s.store_tagline}</div>
					<div class="text-xs text-slate-600">{s.store_address} · {s.store_phone}</div>
				</div>
			</div>
			<div class="text-right">
				<div class="text-lg font-bold uppercase">{docTitle}</div>
				<div class="font-mono">{number}</div>
			</div>
		</div>
		{@render children()}
	</div>
</div>
