<?php

namespace App\Support;

use App\Models\Customer;
use App\Models\Service;
use Illuminate\Support\Facades\Http;

class Wa
{
    public static function message(Service $s, array $settings, string $note = ''): string
    {
        $tpl = $settings['wa_template'] ?? 'Halo {nama}, status servis {nota}: {status}. {catatan}';
        $link = rtrim($settings['public_url'] ?? '', '/') . '/cek?nota=' . urlencode($s->number);
        return trim(strtr($tpl, [
            '{nama}' => $s->customer->name,
            '{nota}' => $s->number,
            '{perangkat}' => "{$s->device_brand} {$s->device_model}",
            '{toko}' => $settings['store_name'] ?? '',
            '{status}' => Service::LABELS[$s->status] ?? $s->status,
            '{catatan}' => $note,
            '{link}' => $link,
        ]));
    }

    public static function link(string $phone, string $message): string
    {
        return 'https://wa.me/' . Customer::normPhone($phone) . '?text=' . rawurlencode($message);
    }

    /** Kirim otomatis via gateway Fonnte bila token diisi. Gagal = false (pakai tombol wa.me). */
    public static function sendAuto(string $phone, string $message, array $settings): bool
    {
        $token = trim($settings['fonnte_token'] ?? '');
        if ($token === '') {
            return false;
        }
        try {
            return Http::timeout(10)->withHeaders(['Authorization' => $token])
                ->asForm()->post('https://api.fonnte.com/send', [
                    'target' => Customer::normPhone($phone),
                    'message' => $message,
                ])->successful();
        } catch (\Throwable) {
            return false;
        }
    }
}
