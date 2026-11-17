declare global {
	namespace App {
		interface Locals {
			user: { id: number; name: string; username: string; role: 'OWNER' | 'ADMIN' | 'TEKNISI' } | null;
			token: string | null;
		}
	}
}

export {};
