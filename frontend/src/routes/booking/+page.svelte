<script lang="ts">
	import BookingForm from '$lib/components/BookingForm.svelte';

	let { data } = $props();
	const info = $derived(data.info);
	const store = $derived(info?.store);
	const wa = $derived(store?.wa ? `https://wa.me/${store.wa}?text=${encodeURIComponent('Halo, saya mau tanya servis laptop.')}` : '');

	const SERVICES = [
		{ icon: '⚡', title: 'Mati total & mati mendadak', desc: 'Pengecekan board, IC power, dan jalur daya sampai ketemu penyebabnya.' },
		{ icon: '🖥️', title: 'Layar & LCD', desc: 'Layar bergaris, berkedip, pecah, atau gelap. Ganti panel sesuai tipe.' },
		{ icon: '⌨️', title: 'Keyboard & touchpad', desc: 'Tombol mati, ngetik sendiri, atau touchpad tidak responsif.' },
		{ icon: '🔋', title: 'Baterai & charger', desc: 'Baterai drop, tidak mengisi, atau charger rusak.' },
		{ icon: '🚀', title: 'Upgrade RAM & SSD', desc: 'Laptop lambat jadi ngebut. Pindah data dan install ulang sekalian.' },
		{ icon: '💧', title: 'Kena air & panas berlebih', desc: 'Pembersihan board, ganti pasta thermal, dan servis kipas.' }
	];
	const STEPS = [
		{ t: 'Isi form booking', d: 'Pilih masalah, tanggal, dan jam yang Anda mau. Kurang dari 2 menit.' },
		{ t: 'Konfirmasi lewat WhatsApp', d: 'Tim kami menghubungi Anda untuk memastikan jadwal.' },
		{ t: 'Datang atau kami jemput', d: 'Laptop dicek dan Anda mendapat estimasi biaya sebelum dikerjakan.' },
		{ t: 'Pantau & ambil', d: 'Cek progres servis online kapan saja dengan nomor nota.' }
	];
</script>

<svelte:head>
	<title>Booking Servis Laptop · {store?.name || 'Dokter Notebook'}</title>
	<meta name="description" content={info?.intro || 'Booking servis laptop dan notebook online.'} />
</svelte:head>

{#if !info}
	<div class="min-h-screen grid place-items-center p-6 text-center">
		<div>
			<p class="font-semibold">Halaman booking belum dapat dimuat.</p>
			<p class="text-sm text-slate-500 mt-1">{data.loadError}</p>
		</div>
	</div>
{:else if data.embed}
	<!-- Mode sematan (iframe di situs lain): hanya form -->
	<div class="p-4 sm:p-6 bg-white">
		<BookingForm {info} />
	</div>
{:else}
	<div class="bg-white text-slate-800">
		<!-- Header -->
		<header class="sticky top-0 z-30 bg-white/90 backdrop-blur border-b border-slate-200">
			<div class="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between gap-4">
				<a href="/booking" class="flex items-center gap-2.5">
					<img src="/icon.svg" alt="" class="w-9 h-9" />
					<span class="font-bold text-lg">{store?.name}</span>
				</a>
				<nav class="hidden md:flex items-center gap-6 text-sm text-slate-600">
					<a href="#layanan" class="hover:text-brand-600">Layanan</a>
					<a href="#cara" class="hover:text-brand-600">Cara Booking</a>
					<a href="/booking/cek" class="hover:text-brand-600">Cek Booking</a>
					<a href="/cek" class="hover:text-brand-600">Cek Servis</a>
				</nav>
				<a href="#booking" class="btn-primary">Booking Sekarang</a>
			</div>
		</header>

		<!-- Hero -->
		<section class="relative overflow-hidden bg-gradient-to-br from-brand-900 via-brand-700 to-brand-500 text-white">
			<div class="max-w-6xl mx-auto px-4 py-16 md:py-24 grid md:grid-cols-2 gap-10 items-center">
				<div>
					<span class="inline-block rounded-full bg-white/15 px-3 py-1 text-xs font-medium mb-4">{store?.tagline}</span>
					<h1 class="text-4xl md:text-5xl font-extrabold leading-tight">Servis laptop tanpa antre, <span class="text-sky-200">jadwal Anda yang tentukan.</span></h1>
					<p class="mt-5 text-lg text-white/85 max-w-xl">{info.intro}</p>
					<div class="flex flex-wrap gap-3 mt-8">
						<a href="#booking" class="btn bg-white text-brand-700 hover:bg-brand-50 px-6 py-3 text-base font-semibold">Booking Sekarang</a>
						{#if wa}<a href={wa} target="_blank" rel="noopener" class="btn border border-white/40 text-white hover:bg-white/10 px-6 py-3 text-base">Tanya via WhatsApp</a>{/if}
					</div>
				</div>
				<ul class="grid grid-cols-2 gap-4 text-sm">
					{#each [['🛡️', 'Garansi servis', 'Kerusakan sama? Kami perbaiki lagi.'], ['🔍', 'Cek awal gratis', 'Diagnosa dulu, bayar kalau setuju.'], ['💬', 'Update via WhatsApp', 'Kabar tiap ada perubahan status.'], ['📱', 'Pantau online', 'Cek progres kapan saja.']] as [ic, t, d]}
						<li class="rounded-2xl bg-white/10 border border-white/15 p-4">
							<div class="text-2xl">{ic}</div>
							<div class="font-semibold mt-2">{t}</div>
							<div class="text-white/75 mt-0.5">{d}</div>
						</li>
					{/each}
				</ul>
			</div>
		</section>

		<!-- Layanan -->
		<section id="layanan" class="max-w-6xl mx-auto px-4 py-16 scroll-mt-16">
			<h2 class="text-3xl font-bold text-center">Kami tangani berbagai masalah laptop</h2>
			<p class="text-center text-slate-600 mt-2">Semua merk: ASUS, Acer, Lenovo, HP, Dell, MacBook, MSI, dan lainnya.</p>
			<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-10">
				{#each SERVICES as s}
					<div class="rounded-2xl border border-slate-200 p-6 hover:border-brand-300 hover:shadow-md transition">
						<div class="text-3xl">{s.icon}</div>
						<h3 class="font-semibold text-lg mt-3">{s.title}</h3>
						<p class="text-slate-600 text-sm mt-1">{s.desc}</p>
					</div>
				{/each}
			</div>
		</section>

		<!-- Cara booking -->
		<section id="cara" class="bg-slate-50 border-y border-slate-200 scroll-mt-16">
			<div class="max-w-6xl mx-auto px-4 py-16">
				<h2 class="text-3xl font-bold text-center">Cara booking</h2>
				<ol class="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-10">
					{#each STEPS as s, i}
						<li class="rounded-2xl bg-white border border-slate-200 p-6">
							<div class="w-9 h-9 rounded-full bg-brand-600 text-white grid place-items-center font-bold">{i + 1}</div>
							<h3 class="font-semibold mt-3">{s.t}</h3>
							<p class="text-slate-600 text-sm mt-1">{s.d}</p>
						</li>
					{/each}
				</ol>
			</div>
		</section>

		<!-- Form booking -->
		<section id="booking" class="max-w-3xl mx-auto px-4 py-16 scroll-mt-16">
			<h2 class="text-3xl font-bold text-center">Booking jadwal servis</h2>
			<p class="text-center text-slate-600 mt-2">Isi form di bawah, kami konfirmasi lewat WhatsApp.</p>
			<div class="card p-5 sm:p-8 mt-8 shadow-lg">
				<BookingForm {info} />
			</div>
			<p class="text-center text-sm text-slate-500 mt-4">Sudah booking? <a href="/booking/cek" class="text-brand-600 font-medium">Cek status booking</a></p>
		</section>

		<!-- Footer -->
		<footer class="bg-brand-900 text-white/80">
			<div class="max-w-6xl mx-auto px-4 py-10 grid sm:grid-cols-3 gap-6 text-sm">
				<div>
					<div class="flex items-center gap-2 text-white font-bold text-lg"><img src="/icon.svg" alt="" class="w-7 h-7" /> {store?.name}</div>
					<p class="mt-2">{store?.tagline}</p>
				</div>
				<div>
					<div class="text-white font-semibold mb-2">Alamat & kontak</div>
					<p>{store?.address}</p>
					<p class="mt-1">{store?.phone}</p>
				</div>
				<div>
					<div class="text-white font-semibold mb-2">Tautan</div>
					<ul class="space-y-1">
						<li><a href="#booking" class="hover:text-white">Booking servis</a></li>
						<li><a href="/booking/cek" class="hover:text-white">Cek status booking</a></li>
						<li><a href="/cek" class="hover:text-white">Cek status servis</a></li>
						<li><a href="/login" class="hover:text-white">Login staf</a></li>
					</ul>
				</div>
			</div>
		</footer>
	</div>
{/if}

<style>
	:global(html) {
		scroll-behavior: smooth;
	}
</style>
