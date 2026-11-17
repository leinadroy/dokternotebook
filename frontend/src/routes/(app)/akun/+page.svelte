<script lang="ts">
	import { apiForm, type FormResult } from '$lib/api';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	let { data } = $props();
	let form = $state<FormResult>(null);
</script>

<div class="max-w-md">
	<PageHeader title="Akun Saya" subtitle={data.user?.name} />
	<Flash {form} />
	<form use:apiForm={{ path: '/me/password', done: (r) => (form = r), reset: true }} class="card p-5 space-y-3">
		<h2 class="font-semibold">Ganti Password</h2>
		<div><label class="label" for="old">Password lama</label><input id="old" name="old" type="password" class="input" required autocomplete="current-password" /></div>
		<div><label class="label" for="new">Password baru</label><input id="new" name="new" type="password" class="input" required minlength="6" autocomplete="new-password" /></div>
		<button class="btn-primary">Simpan</button>
	</form>
</div>
