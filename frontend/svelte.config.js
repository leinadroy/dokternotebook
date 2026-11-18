import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

/**
 * Build menjadi SPA statis (folder build/) lalu disalin ke folder backend/
 * oleh scripts/copy-to-backend.mjs, sehingga cukup hosting PHP (tanpa Node.js).
 * @type {import('@sveltejs/kit').Config}
 */
const config = {
	preprocess: vitePreprocess(),
	kit: {
		adapter: adapter({ pages: 'build', assets: 'build', fallback: 'spa.html', strict: false })
	}
};

export default config;
