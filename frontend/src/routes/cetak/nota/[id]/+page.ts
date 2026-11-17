import QRCode from 'qrcode';
import { get } from '$lib/api';
import type { PageLoad } from './$types';

export const load: PageLoad = async ({ params, parent }) => {
	const [detail, { settings }] = await Promise.all([get(`/services/${params.id}`), parent()]);
	const base = (settings.public_url || location.origin).replace(/\/$/, '');
	const cekUrl = `${base}/cek?nota=${detail.service.number}`;
	return { detail, cekUrl, qr: await QRCode.toDataURL(cekUrl, { margin: 0, width: 160 }), docTitle: 'Tanda Terima Servis' };
};
