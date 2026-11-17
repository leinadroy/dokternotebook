<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { api, errMsg } from '$lib/api';

	let { data } = $props();
	let pending = $state(false);
	let error = $state('');

	async function submit(e: SubmitEvent) {
		e.preventDefault();
		const fd = new FormData(e.currentTarget as HTMLFormElement);
		pending = true;
		error = '';
		const r = await api('/login', { method: 'POST', body: { username: fd.get('username'), password: fd.get('password') } });
		pending = false;
		if (!r.ok) {
			error = errMsg(r.data);
			return;
		}
		await invalidateAll();
		await goto('/');
	}
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
		<form class="space-y-4" onsubmit={submit}>
			<div>
				<label class="label" for="username">Username</label>
				<!-- svelte-ignore a11y_autofocus -->
				<input id="username" name="username" class="input" autofocus required autocomplete="username" />
			</div>
			<div>
				<label class="label" for="password">Password</label>
				<input id="password" name="password" type="password" class="input" required autocomplete="current-password" />
			</div>
			{#if error}<p class="text-sm text-rose-600">{error}</p>{/if}
			<button class="btn-primary w-full" disabled={pending}>{pending ? 'Masuk...' : 'Masuk'}</button>
		</form>
		<p class="text-center text-xs text-slate-500 mt-6">
			Pelanggan? <a href="/cek" class="text-brand-600 font-medium">Cek status servis di sini</a>
		</p>
	</div>
</div>
