<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Service extends Model
{
    const STATUSES = ['DITERIMA', 'DIAGNOSA', 'MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART', 'DIKERJAKAN', 'SELESAI', 'DIAMBIL', 'BATAL'];
    const OPEN = ['DITERIMA', 'DIAGNOSA', 'MENUNGGU_KONFIRMASI', 'MENUNGGU_SPAREPART', 'DIKERJAKAN'];
    const LABELS = [
        'DITERIMA' => 'Diterima', 'DIAGNOSA' => 'Diagnosa', 'MENUNGGU_KONFIRMASI' => 'Menunggu Konfirmasi',
        'MENUNGGU_SPAREPART' => 'Menunggu Sparepart', 'DIKERJAKAN' => 'Dikerjakan', 'SELESAI' => 'Selesai',
        'DIAMBIL' => 'Diambil', 'BATAL' => 'Batal',
    ];

    protected $guarded = ['id'];

    protected function casts(): array
    {
        return [
            'estimated_done' => 'date:Y-m-d',
            'received_at' => 'datetime',
            'finished_at' => 'datetime',
            'picked_up_at' => 'datetime',
            'is_warranty_claim' => 'boolean',
        ];
    }

    public function customer() { return $this->belongsTo(Customer::class); }
    public function technician() { return $this->belongsTo(User::class, 'technician_id')->select('id', 'name'); }
    public function creator() { return $this->belongsTo(User::class, 'created_by')->select('id', 'name'); }
    public function parent() { return $this->belongsTo(Service::class, 'parent_id')->select('id', 'number'); }
    public function claims() { return $this->hasMany(Service::class, 'parent_id')->select('id', 'number', 'parent_id', 'status'); }
    public function items() { return $this->hasMany(ServiceItem::class)->orderBy('id'); }
    public function payments() { return $this->hasMany(Payment::class)->orderBy('id'); }
    public function logs() { return $this->hasMany(ServiceLog::class)->orderByDesc('id'); }

    /** subtotal, total, paid, remaining — memerlukan relasi items & payments */
    public function totals(): array
    {
        $subtotal = (int) $this->items->sum(fn ($i) => $i->qty * $i->price);
        $total = max(0, $subtotal - $this->discount);
        $paid = (int) $this->payments->sum(fn ($p) => $p->signedAmount());
        return ['subtotal' => $subtotal, 'total' => $total, 'paid' => $paid, 'remaining' => $total - $paid];
    }

    /** Garansi berlaku sejak unit diambil */
    public function warranty(): array
    {
        if ($this->status !== 'DIAMBIL' || !$this->picked_up_at) {
            return ['active' => false, 'until' => null];
        }
        $until = $this->picked_up_at->copy()->addDays($this->warranty_days)->endOfDay();
        return ['active' => $this->warranty_days > 0 && $until->isFuture(), 'until' => $until->toDateString()];
    }

    public static function nextNumber(): string
    {
        $prefix = 'DN' . now()->format('ymd');
        $last = static::where('number', 'like', $prefix . '%')->orderByDesc('number')->value('number');
        $seq = $last ? ((int) substr($last, strlen($prefix))) + 1 : 1;
        return $prefix . str_pad((string) $seq, 3, '0', STR_PAD_LEFT);
    }
}
