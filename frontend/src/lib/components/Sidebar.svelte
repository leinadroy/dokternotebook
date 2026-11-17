<script lang="ts">
	import { page } from '$app/state';
	import { goto, invalidateAll } from '$app/navigation';
	import { api } from '$lib/api';
	import { ROLE_LABEL } from '$lib/format';

	async function logout() {
		await api('/logout', { method: 'POST' });
		await invalidateAll();
		await goto('/login');
	}

	let { user, storeName }: { user: { name: string; role: string }; storeName: string } = $props();
	let open = $state(false);

	const ITEMS = [
		{ href: '/', label: 'Dashboard', icon: 'M3 12l9-9 9 9M5 10v10h14V10' },
		{ href: '/servis', label: 'Servis', icon: 'M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.5-.5-.5-2.5z' },
		{ href: '/servis/baru', label: 'Terima Servis', icon: 'M12 5v14M5 12h14', roles: ['OWNER', 'ADMIN'] },
		{ href: '/pelanggan', label: 'Pelanggan', icon: 'M16 19a4 4 0 0 0-8 0M12 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6z' },
		{ href: '/sparepart', label: 'Sparepart & Stok', icon: 'M4 7l8-4 8 4-8 4-8-4zM4 7v10l8 4 8-4V7' },
		{ href: '/garansi', label: 'Garansi', icon: 'M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6l8-3z', roles: ['OWNER', 'ADMIN'] },
		{ href: '/laporan', label: 'Laporan', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2', roles: ['OWNER', 'ADMIN'] },
		{ href: '/pengguna', label: 'Pengguna', icon: 'M17 20v-1a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v1M10 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM21 20v-1a4 4 0 0 0-3-3.9', roles: ['OWNER'] },
		{ href: '/pengaturan', label: 'Pengaturan', icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM12 2v3M12 19v3M4.2 4.2l2.1 2.1M17.7 17.7l2.1 2.1M2 12h3M19 12h3M4.2 19.8l2.1-2.1M17.7 6.3l2.1-2.1', roles: ['OWNER'] }
	];

	const items = $derived(ITEMS.filter((i) => !i.roles || i.roles.includes(user.role)));
	const path = $derived(page.url.pathname);
	const isActive = (href: string) =>
		href === '/' ? path === '/' : href === '/servis' ? path.startsWith('/servis') && path !== '/servis/baru' : path.startsWith(href);
</script>

<div class="no-print md:hidden sticky top-0 z-30 flex items-center justify-between bg-brand-900 text-white px-4 h-14">
	<span class="font-semibold">{storeName}</span>
	<button onclick={() => (open = !open)} class="p-2" aria-label="Menu">
		<svg width="22" height="22" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h16M3 11h16M3 16h16" /></svg>
	</button>
</div>

<aside
	class="no-print fixed md:sticky top-0 z-40 h-screen w-64 shrink-0 bg-brand-900 text-white flex flex-col transition-transform {open
		? 'translate-x-0'
		: '-translate-x-full md:translate-x-0'}"
>
	<div class="flex items-center gap-2.5 px-5 h-16 border-b border-white/10">
		<img src="/icon.svg" alt="" class="w-8 h-8" />
		<span class="font-bold">{storeName}</span>
	</div>
	<nav class="flex-1 overflow-y-auto p-3 space-y-0.5">
		{#each items as i (i.href)}
			<a
				href={i.href}
				onclick={() => (open = false)}
				class="flex items-center gap-3 rounded-lg px-3 py-2 text-sm {isActive(i.href)
					? 'bg-white/15 font-medium'
					: 'text-white/75 hover:bg-white/10 hover:text-white'}"
			>
				<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d={i.icon} /></svg>
				{i.label}
			</a>
		{/each}
	</nav>
	<div class="p-4 border-t border-white/10 text-sm">
		<div class="font-medium">{user.name}</div>
		<div class="text-white/60 text-xs mb-3">{ROLE_LABEL[user.role] || user.role}</div>
		<div class="flex gap-4">
			<a href="/akun" class="text-xs text-white/70 hover:text-white">Ganti password</a>
			<button class="text-xs text-white/70 hover:text-white cursor-pointer" onclick={logout}>Keluar →</button>
		</div>
	</div>
</aside>

{#if open}
	<button class="no-print fixed inset-0 z-30 bg-black/40 md:hidden" aria-label="Tutup menu" onclick={() => (open = false)}></button>
{/if}
