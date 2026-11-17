<script lang="ts">
	import { page } from '$app/state';
</script>

<div class="min-h-screen grid place-items-center p-6">
	<div class="card p-8 max-w-md text-center">
		<div class="text-4xl font-bold text-brand-600">{page.status}</div>
		<p class="mt-2 text-slate-600">{page.error?.message}</p>
		<a href="/" class="btn-primary mt-6">Kembali ke Dashboard</a>
	</div>
</div>
