<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceItem extends Model
{
    protected $fillable = ['service_id', 'type', 'sparepart_id', 'description', 'qty', 'price', 'cost_price'];

    public function sparepart()
    {
        return $this->belongsTo(Sparepart::class);
    }
}
