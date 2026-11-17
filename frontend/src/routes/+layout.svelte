<script lang="ts">
	import '../app.css';
	let { children } = $props();
</script>

<svelte:head><title>Dokter Notebook</title></svelte:head>

{@render children()}
