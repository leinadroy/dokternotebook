<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Customer extends Model
{
    protected $fillable = ['name', 'phone', 'address', 'email', 'notes'];

    public function services()
    {
        return $this->hasMany(Service::class);
    }

    /** Normalisasi nomor HP Indonesia ke format 62xxxx */
    public static function normPhone(?string $p): string
    {
        $s = preg_replace('/\D/', '', (string) $p);
        if (str_starts_with($s, '0')) {
            $s = '62' . substr($s, 1);
        } elseif (str_starts_with($s, '8')) {
            $s = '62' . $s;
        }
        return $s;
    }
}
