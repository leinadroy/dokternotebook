<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class StockMovement extends Model
{
    const UPDATED_AT = null;
    protected $fillable = ['sparepart_id', 'qty', 'type', 'note', 'service_id'];

    public function sparepart()
    {
        return $this->belongsTo(Sparepart::class)->select('id', 'name', 'sku');
    }

    public function service()
    {
        return $this->belongsTo(Service::class)->select('id', 'number');
    }
}
