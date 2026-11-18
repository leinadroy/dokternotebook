// Salin hasil build SPA (frontend/build) ke folder backend/ (PHP), tanpa menyentuh file PHP-nya.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, 'build');
const target = join(root, '..', 'backend');

if (!existsSync(join(build, 'spa.html'))) {
	console.error('build/spa.html tidak ada — jalankan vite build dulu.');
	process.exit(1);
}

rmSync(join(target, '_app'), { recursive: true, force: true });
cpSync(join(build, '_app'), join(target, '_app'), { recursive: true });
for (const f of ['spa.html', 'icon.svg']) cpSync(join(build, f), join(target, f));
console.log('Tampilan disalin ke backend/');
