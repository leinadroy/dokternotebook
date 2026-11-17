<script lang="ts">
	/** Menampilkan hasil form action: { message } atau { error } */
	let { form }: { form: any } = $props();
</script>

{#if form?.error}
	<div class="card p-3 mb-4 text-sm bg-rose-50 border-rose-200 text-rose-700">{form.error}</div>
{:else if form?.message}
	<div class="card p-3 mb-4 text-sm bg-emerald-50 border-emerald-200 text-emerald-800">{form.message}</div>
{/if}
