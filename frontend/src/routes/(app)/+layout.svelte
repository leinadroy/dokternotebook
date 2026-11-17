<script lang="ts">
	import Sidebar from '$lib/components/Sidebar.svelte';
	let { data, children } = $props();
</script>

<div class="md:flex min-h-screen">
	<Sidebar user={data.user!} storeName={data.settings.store_name || 'Dokter Notebook'} />
	<main class="flex-1 min-w-0 p-4 md:p-8">{@render children()}</main>
</div>
