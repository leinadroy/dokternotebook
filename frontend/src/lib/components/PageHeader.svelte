<script lang="ts">
	import type { Snippet } from 'svelte';
	let { title, subtitle = '', children }: { title: string; subtitle?: string; children?: Snippet } = $props();
</script>

<div class="flex flex-wrap items-end justify-between gap-3 mb-6">
	<div>
		<h1 class="text-2xl font-bold text-slate-900">{title}</h1>
		{#if subtitle}<p class="text-sm text-slate-500 mt-0.5">{subtitle}</p>{/if}
	</div>
	{#if children}<div class="flex flex-wrap gap-2 items-center">{@render children()}</div>{/if}
</div>
