<script lang="ts">
	import { enhance } from '$app/forms';
	let { data, form } = $props();
	let pending = $state(false);
</script>

<svelte:head><title>Masuk · {data.settings.store_name || 'Dokter Notebook'}</title></svelte:head>

<div class="min-h-screen grid place-items-center bg-gradient-to-br from-brand-900 to-brand-600 p-4">
	<div class="card w-full max-w-sm p-7">
		<div class="flex items-center gap-3 mb-6">
			<img src="/icon.svg" alt="" class="w-11 h-11" />
			<div>
				<h1 class="font-bold text-lg leading-tight">{data.settings.store_name || 'Dokter Notebook'}</h1>
				<p class="text-xs text-slate-500">{data.settings.store_tagline}</p>
			</div>
		</div>
		<form
			method="POST"
			class="space-y-4"
			use:enhance={() => {
				pending = true;
				return async ({ update }) => {
					await update();
					pending = false;
				};
			}}
		>
			<div>
				<label class="label" for="username">Username</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input id="username" name="username" class="input" value={form?.username ?? ''} autofocus required autocomplete="username" />
			</div>
			<div>
				<label class="label" for="password">Password</label>
				<input id="password" name="password" type="password" class="input" required autocomplete="current-password" />
			</div>
			{#if form?.error}<p class="text-sm text-rose-600">{form.error}</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>{pending ? 'Masuk...' : 'Masuk'}</button>
		</form>
		<p class="text-center text-xs text-slate-500 mt-6">
			Pelanggan? <a href="/cek" class="text-brand-600 font-medium">Cek status servis di sini</a>
		</p>
	</div>
</div>
