// Salin hasil build SPA (frontend/build) ke backend/public tanpa menyentuh index.php milik Laravel.
import { cpSync, existsSync, rmSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const build = join(root, 'build');
const pub = join(root, '..', 'backend', 'public');

if (!existsSync(join(build, 'spa.html'))) {
	console.error('build/spa.html tidak ada — jalankan vite build dulu.');
	process.exit(1);
}

rmSync(join(pub, '_app'), { recursive: true, force: true });
cpSync(join(build, '_app'), join(pub, '_app'), { recursive: true });
for (const f of ['spa.html', 'icon.svg']) cpSync(join(build, f), join(pub, f));
console.log('SPA disalin ke backend/public');
