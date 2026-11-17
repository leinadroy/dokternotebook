import QRCode from 'qrcode';
import { get } from '$lib/server/api';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async (event) => {
	const detail = await get(event, `/services/${event.params.id}`);
	const { settings } = await event.parent();
	const base = (settings.public_url || event.url.origin).replace(/\/$/, '');
	const cekUrl = `${base}/cek?nota=${detail.service.number}`;
	return { detail, cekUrl, qr: await QRCode.toDataURL(cekUrl, { margin: 0, width: 160 }), docTitle: 'Tanda Terima Servis' };
};
