<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Setting extends Model
{
    protected $primaryKey = 'key';
    public $incrementing = false;
    protected $keyType = 'string';
    public $timestamps = false;
    protected $fillable = ['key', 'value'];

    const KEYS = [
        'store_name', 'store_tagline', 'store_address', 'store_phone', 'default_warranty_days',
        'receipt_footer', 'wa_template', 'public_url', 'fonnte_token',
    ];

    /** Semua pengaturan sebagai array key => value */
    public static function kv(): array
    {
        return static::query()->pluck('value', 'key')->toArray();
    }
}
