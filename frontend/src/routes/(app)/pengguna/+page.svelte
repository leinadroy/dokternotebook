<script lang="ts">
	import { enhance } from '$app/forms';
	import Flash from '$lib/components/Flash.svelte';
	import PageHeader from '$lib/components/PageHeader.svelte';
	import { ROLE_LABEL } from '$lib/format';

	let { data, form } = $props();
	const editing = $derived(data.editing);
</script>

<div class="max-w-5xl">
	<PageHeader title="Pengguna" subtitle="Kelola akun pemilik, admin/kasir, dan teknisi" />
	<Flash {form} />
	<div class="grid lg:grid-cols-3 gap-6">
		<div class="card lg:col-span-2 overflow-x-auto">
			<table class="table">
				<thead><tr><th>Nama</th><th>Username</th><th>Peran</th><th>Status</th><th></th></tr></thead>
				<tbody>
					{#each data.users as u (u.id)}
						<tr class={u.active ? '' : 'opacity-50'}>
							<td>{u.name}<div class="text-xs text-slate-500">{u.phone ?? ''}</div></td>
							<td class="font-mono text-xs">{u.username}</td>
							<td>{ROLE_LABEL[u.role]}</td>
							<td>
								{#if u.active}<span class="badge bg-emerald-100 text-emerald-700">Aktif</span>{:else}<span class="badge bg-slate-100">Nonaktif</span>{/if}
							</td>
							<td class="text-right"><a href="/pengguna?edit={u.id}" class="text-brand-600 text-xs">Ubah</a></td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
		{#key editing?.id}
			<form method="POST" use:enhance class="card p-5 space-y-3 h-fit">
				<div class="flex justify-between">
					<h2 class="font-semibold">{editing ? 'Ubah Pengguna' : 'Tambah Pengguna'}</h2>
					{#if editing}<a href="/pengguna" class="text-xs text-slate-500">Batal</a>{/if}
				</div>
				<input type="hidden" name="id" value={editing?.id ?? ''} />
				<div><label class="label" for="name">Nama</label><input id="name" name="name" class="input" required value={editing?.name ?? ''} /></div>
				<div><label class="label" for="username">Username</label><input id="username" name="username" class="input" required value={editing?.username ?? ''} /></div>
				<div>
					<label class="label" for="role">Peran</label>
					<select id="role" name="role" class="input" value={editing?.role ?? 'TEKNISI'}>
						<option value="TEKNISI">Teknisi</option>
						<option value="ADMIN">Admin / Kasir</option>
						<option value="OWNER">Pemilik</option>
					</select>
				</div>
				<div><label class="label" for="phone">No. HP</label><input id="phone" name="phone" class="input" value={editing?.phone ?? ''} /></div>
				<div>
					<label class="label" for="password">{editing ? 'Password baru (kosongkan jika tidak diganti)' : 'Password'}</label>
					<input id="password" name="password" type="password" class="input" required={!editing} minlength="6" autocomplete="new-password" />
				</div>
				<label class="flex items-center gap-2 text-sm"><input type="checkbox" name="active" value="1" checked={editing ? editing.active : true} /> Aktif</label>
				<button class="btn-primary">Simpan</button>
			</form>
		{/key}
	</div>
	<div class="card p-4 mt-6 text-sm text-slate-600">
		<b>Hak akses:</b> <b>Pemilik</b> — semua menu. <b>Admin/Kasir</b> — terima servis, pembayaran, sparepart, garansi, laporan.
		<b>Teknisi</b> — melihat servis yang ditugaskan/belum ditugaskan, isi diagnosa, tambah jasa & sparepart, ubah status.
	</div>
</div>
