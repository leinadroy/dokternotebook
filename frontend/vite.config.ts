import { sveltekit } from '@sveltejs/kit/vite';
import tailwindcss from '@tailwindcss/vite';
import { defineConfig } from 'vite';

// Saat development, /api dan /sanctum diteruskan ke Laravel (php artisan serve)
// supaya cookie sesi berlaku di domain yang sama seperti di hosting.
const backend = process.env.BACKEND_URL || 'http://127.0.0.1:8000';

export default defineConfig({
	plugins: [tailwindcss(), sveltekit()],
	server: {
		proxy: {
			'/api': { target: backend },
			'/sanctum': { target: backend }
		}
	}
});
