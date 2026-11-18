<?php
/** Booking servis: dibuat pelanggan dari halaman publik, dikelola staf (Pemilik & Admin). */
defined('DN_ROOT') or exit;

const BOOKING_STATUSES = ['BARU', 'DIKONFIRMASI', 'DITERIMA', 'BATAL'];
const BOOKING_LABELS = ['BARU' => 'Menunggu konfirmasi', 'DIKONFIRMASI' => 'Dikonfirmasi', 'DITERIMA' => 'Unit sudah diterima', 'BATAL' => 'Dibatalkan'];
const PROBLEM_TYPES = [
    'Mati total', 'Layar / LCD', 'Keyboard / touchpad', 'Baterai / charger', 'Lambat / install ulang',
    'Upgrade RAM / SSD', 'Kena air', 'Engsel / casing', 'Panas / kipas berisik', 'Lainnya',
];
const HARI = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];
const BULAN = ['', 'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

function tgl_id(string $date): string
{
    $t = strtotime($date);
    return HARI[(int) date('w', $t)] . ', ' . date('j', $t) . ' ' . BULAN[(int) date('n', $t)] . ' ' . date('Y', $t);
}

function booking_slots(): array
{
    return array_values(array_filter(array_map('trim', explode(',', settings()['booking_slots'] ?? ''))));
}

function booking_closed_days(): array
{
    $v = trim(settings()['booking_closed_days'] ?? '');
    return $v === '' ? [] : array_map('intval', explode(',', $v));
}

function next_booking_code(): string
{
    $prefix = 'BK' . date('ymd');
    $last = val('SELECT code FROM bookings WHERE code LIKE ? ORDER BY code DESC LIMIT 1', [$prefix . '%']);
    $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
    return $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
}

function client_ip(): string
{
    return substr((string) ($_SERVER['REMOTE_ADDR'] ?? ''), 0, 45);
}

function booking_status_link(array $b): string
{
    $base = rtrim(settings()['public_url'] ?? '', '/') ?: base_url();
    return $base . '/booking/cek?kode=' . urlencode($b['code']);
}

/** Pesan WA untuk pelanggan sesuai status booking */
function booking_wa_message(array $b): string
{
    $set = settings();
    $metode = $b['service_method'] === 'JEMPUT' ? 'dijemput ke alamat Anda' : 'datang ke toko';
    $common = [
        '{nama}' => $b['name'], '{kode}' => $b['code'], '{toko}' => $set['store_name'] ?? '',
        '{tanggal}' => tgl_id($b['preferred_date']), '{jam}' => $b['preferred_time'], '{metode}' => $metode,
        '{catatan}' => $b['staff_note'] ?? '', '{link}' => booking_status_link($b),
    ];
    if ($b['status'] === 'DIKONFIRMASI') {
        $tpl = $set['booking_wa_template'] ?? '';
        if (trim($tpl) === '') $tpl = 'Halo {nama}, booking servis {kode} di {toko} sudah dikonfirmasi untuk {tanggal}, jam {jam} ({metode}). {catatan}';
    } elseif ($b['status'] === 'BATAL') {
        $tpl = "Halo {nama}, mohon maaf booking servis {kode} di {toko} untuk {tanggal} kami batalkan. {catatan}\nSilakan hubungi kami untuk menjadwalkan ulang.";
    } elseif ($b['status'] === 'DITERIMA') {
        $tpl = 'Halo {nama}, terima kasih, unit Anda dari booking {kode} sudah kami terima di {toko}. Nota servis akan kami kirimkan.';
    } else {
        $tpl = "Halo {nama}, kami dari {toko} terkait booking servis {kode} untuk {tanggal}, jam {jam} ({metode}).";
    }
    return trim(strtr($tpl, $common));
}

function booking_out(array $b): array
{
    $b['created_at'] = iso($b['created_at']);
    $b['updated_at'] = iso($b['updated_at']);
    $b['wa_link'] = wa_link($b['phone'], booking_wa_message($b));
    unset($b['ip']);
    return $b;
}

/* ---------------------------------------------------------------- publik */

/** Info untuk form booking publik: jam, hari tutup, jenis kerusakan, kontak toko */
function api_public_booking_info(): array
{
    $s = settings();
    return [
        'enabled' => ($s['booking_enabled'] ?? '1') === '1',
        'pickup' => ($s['booking_pickup'] ?? '1') === '1',
        'intro' => $s['booking_intro'] ?? '',
        'slots' => booking_slots(),
        'closed_days' => booking_closed_days(),
        'problem_types' => PROBLEM_TYPES,
        'max_days' => 30,
        'today' => date('Y-m-d'),
        'store' => [
            'name' => $s['store_name'] ?? '', 'tagline' => $s['store_tagline'] ?? '',
            'address' => $s['store_address'] ?? '', 'phone' => $s['store_phone'] ?? '',
            'wa' => norm_phone($s['store_phone'] ?? ''),
        ],
    ];
}

/** Pelanggan membuat booking (tanpa login). Dilindungi batas per IP + jebakan bot (field "website"). */
function api_public_booking_store(): array
{
    $s = settings();
    if (($s['booking_enabled'] ?? '1') !== '1') throw new HttpError(422, 'Maaf, booking online sedang ditutup. Silakan hubungi kami lewat WhatsApp.');
    $in = body();
    // Jebakan bot: field tersembunyi yang tidak terlihat manusia
    if (!empty($in['website'])) return ['code' => 'BK000000000', 'message' => 'Booking terkirim'];

    $ip = client_ip();
    if ((int) val('SELECT COUNT(*) FROM bookings WHERE ip = ? AND created_at >= ?', [$ip, date('Y-m-d H:i:s', time() - 3600)]) >= 5) {
        throw new HttpError(429, 'Terlalu banyak booking dari jaringan Anda. Coba lagi nanti atau hubungi kami lewat WhatsApp.');
    }

    $d = validate($in, [
        'name' => 'required|string|max:100',
        'phone' => 'required|string|max:30',
        'email' => 'nullable|email|max:255',
        'device_brand' => 'required|string|max:50',
        'device_model' => 'nullable|string|max:100',
        'problem_type' => 'required|in:' . implode(',', PROBLEM_TYPES),
        'complaint' => 'required|string|min:5|max:2000',
        'service_method' => 'required|in:DATANG,JEMPUT',
        'address' => 'nullable|string|max:500',
        'preferred_date' => 'required|date',
        'preferred_time' => 'required|string|max:30',
    ]);
    $phone = norm_phone($d['phone']);
    if (strlen($phone) < 10 || strlen($phone) > 15) throw new HttpError(422, 'Nomor HP / WhatsApp tidak valid.', ['phone' => ['Nomor HP tidak valid.']]);
    if ($d['service_method'] === 'JEMPUT') {
        if (($s['booking_pickup'] ?? '1') !== '1') throw new HttpError(422, 'Layanan jemput sedang tidak tersedia.');
        if (empty($d['address']) || mb_strlen($d['address']) < 10) throw new HttpError(422, 'Alamat penjemputan wajib diisi lengkap.', ['address' => ['Alamat wajib diisi.']]);
    }
    $date = $d['preferred_date'];
    $maxDate = date('Y-m-d', strtotime('+30 days'));
    if ($date < date('Y-m-d') || $date > $maxDate) throw new HttpError(422, 'Pilih tanggal antara hari ini dan 30 hari ke depan.', ['preferred_date' => ['Tanggal tidak valid.']]);
    if (in_array((int) date('w', strtotime($date)), booking_closed_days(), true)) {
        throw new HttpError(422, 'Toko tutup pada ' . HARI[(int) date('w', strtotime($date))] . '. Silakan pilih tanggal lain.', ['preferred_date' => ['Toko tutup.']]);
    }
    if (!in_array($d['preferred_time'], booking_slots(), true)) throw new HttpError(422, 'Pilih jam kedatangan yang tersedia.', ['preferred_time' => ['Jam tidak valid.']]);
    if ((int) val("SELECT COUNT(*) FROM bookings WHERE phone = ? AND status IN ('BARU','DIKONFIRMASI') AND preferred_date >= CURDATE()", [$phone]) >= 3) {
        throw new HttpError(422, 'Nomor ini sudah punya beberapa booking aktif. Hubungi kami bila perlu mengubah jadwal.');
    }

    $code = tx(function () use ($d, $phone, $ip) {
        $code = next_booking_code();
        insert('bookings', [
            'code' => $code, 'name' => $d['name'], 'phone' => $phone, 'email' => $d['email'] ?? null,
            'device_brand' => $d['device_brand'], 'device_model' => $d['device_model'] ?? null,
            'problem_type' => $d['problem_type'], 'complaint' => $d['complaint'],
            'service_method' => $d['service_method'], 'address' => $d['service_method'] === 'JEMPUT' ? $d['address'] : null,
            'preferred_date' => $d['preferred_date'], 'preferred_time' => $d['preferred_time'],
            'status' => 'BARU', 'ip' => $ip, 'created_at' => now(), 'updated_at' => now(),
        ]);
        return $code;
    });

    // Notifikasi ke WA toko (bila token Fonnte diisi)
    $storeWa = norm_phone($s['store_phone'] ?? '');
    if ($storeWa !== '' && trim($s['fonnte_token'] ?? '') !== '') {
        $msg = "📅 Booking baru {$code}\n{$d['name']} ({$phone})\n{$d['device_brand']} {$d['device_model']} — {$d['problem_type']}\n"
            . tgl_id($d['preferred_date']) . ", {$d['preferred_time']} · " . ($d['service_method'] === 'JEMPUT' ? 'Jemput' : 'Datang ke toko');
        wa_send_auto($storeWa, $msg, $s);
    }

    http_response_code(201);
    return [
        'code' => $code,
        'message' => 'Booking terkirim',
        'date_label' => tgl_id($d['preferred_date']),
        'time' => $d['preferred_time'],
        'status_link' => booking_status_link(['code' => $code]),
    ];
}

/** Pelanggan cek status booking: kode + 4 digit terakhir no HP */
function api_public_booking_check(): array
{
    $_SESSION['cekbk'] = array_filter($_SESSION['cekbk'] ?? [], fn ($t) => $t > time() - 60);
    if (count($_SESSION['cekbk']) >= 30) throw new HttpError(429, 'Terlalu banyak permintaan. Coba lagi sebentar.');
    $_SESSION['cekbk'][] = time();

    $code = strtoupper(trim((string) query('kode')));
    $hp = preg_replace('/\D/', '', (string) query('hp'));
    $b = $code ? row('SELECT b.*, s.number service_number FROM bookings b LEFT JOIN services s ON s.id = b.service_id WHERE b.code = ?', [$code]) : null;
    if (!$b || strlen($hp) < 4 || substr($b['phone'], -4) !== substr($hp, -4)) {
        throw new HttpError(404, 'Booking tidak ditemukan. Periksa kode booking dan 4 digit terakhir nomor HP Anda.');
    }
    return [
        'code' => $b['code'], 'name' => $b['name'], 'status' => $b['status'], 'status_label' => BOOKING_LABELS[$b['status']],
        'device' => trim($b['device_brand'] . ' ' . $b['device_model']), 'problem_type' => $b['problem_type'],
        'service_method' => $b['service_method'], 'date_label' => tgl_id($b['preferred_date']), 'time' => $b['preferred_time'],
        'staff_note' => $b['staff_note'], 'service_number' => $b['service_number'], 'created_at' => iso($b['created_at']),
    ];
}

/* ---------------------------------------------------------------- staf */

function api_bookings_index(): array
{
    require_user(['OWNER', 'ADMIN']);
    $where = ['1'];
    $p = [];
    $status = query('status') ?? 'AKTIF';
    if ($status === 'AKTIF') $where[] = "b.status IN ('BARU','DIKONFIRMASI')";
    elseif ($status !== 'SEMUA') { $where[] = 'b.status = ?'; $p[] = $status; }
    if ($term = query('q')) {
        $cond = 'b.code LIKE ? OR b.name LIKE ? OR b.device_brand LIKE ? OR b.device_model LIKE ?';
        array_push($p, '%' . strtoupper($term) . '%', "%$term%", "%$term%", "%$term%");
        if (($ph = phone_term($term)) !== '') { $cond .= ' OR b.phone LIKE ?'; $p[] = "%$ph%"; }
        $where[] = "($cond)";
    }
    if ($date = query('date')) { $where[] = 'b.preferred_date = ?'; $p[] = $date; }
    $order = $status === 'AKTIF' ? "FIELD(b.status,'BARU','DIKONFIRMASI'), b.preferred_date, b.preferred_time" : 'b.created_at DESC';
    $list = rows(
        'SELECT b.*, s.number service_number, u.name handled_by_name FROM bookings b
         LEFT JOIN services s ON s.id = b.service_id LEFT JOIN users u ON u.id = b.handled_by
         WHERE ' . implode(' AND ', $where) . " ORDER BY $order LIMIT 200",
        $p
    );
    $counts = ['BARU' => 0, 'DIKONFIRMASI' => 0, 'DITERIMA' => 0, 'BATAL' => 0];
    foreach (rows('SELECT status, COUNT(*) c FROM bookings GROUP BY status') as $r) $counts[$r['status']] = (int) $r['c'];
    return [
        'data' => array_map('booking_out', $list),
        'counts' => $counts,
        'today' => (int) val("SELECT COUNT(*) FROM bookings WHERE preferred_date = CURDATE() AND status IN ('BARU','DIKONFIRMASI')"),
        'slots' => booking_slots(),
    ];
}

function find_booking(int $id): array
{
    $b = row('SELECT * FROM bookings WHERE id = ?', [$id]);
    if (!$b) throw new HttpError(404, 'Booking tidak ditemukan.');
    return $b;
}

function api_bookings_show(int $id): array
{
    require_user(['OWNER', 'ADMIN']);
    return booking_out(find_booking($id));
}

/** Konfirmasi / jadwal ulang / batalkan booking */
function api_bookings_update(int $id): array
{
    $u = require_user(['OWNER', 'ADMIN']);
    $b = find_booking($id);
    $d = validate(body(), [
        'status' => 'required|in:BARU,DIKONFIRMASI,BATAL',
        'preferred_date' => 'nullable|date',
        'preferred_time' => 'nullable|string|max:30',
        'staff_note' => 'nullable|string|max:500',
        'send_wa' => 'nullable|bool',
    ]);
    if ($b['status'] === 'DITERIMA') throw new HttpError(422, 'Booking ini sudah menjadi nota servis dan tidak bisa diubah.');
    $upd = [
        'status' => $d['status'],
        'staff_note' => $d['staff_note'] ?? null,
        'handled_by' => $u['id'],
        'updated_at' => now(),
    ];
    if (!empty($d['preferred_date'])) $upd['preferred_date'] = $d['preferred_date'];
    if (!empty($d['preferred_time'])) $upd['preferred_time'] = $d['preferred_time'];
    update('bookings', $id, $upd);

    $b = find_booking($id);
    $msg = ['BARU' => 'Booking dikembalikan ke status baru', 'DIKONFIRMASI' => 'Booking dikonfirmasi', 'BATAL' => 'Booking dibatalkan'][$d['status']];
    if (!empty($d['send_wa']) && wa_send_auto($b['phone'], booking_wa_message($b), settings())) $msg .= ' · WhatsApp terkirim otomatis';
    return ['message' => $msg, 'booking' => booking_out($b)];
}
