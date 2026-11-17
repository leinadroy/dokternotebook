<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Sparepart extends Model
{
    protected $fillable = ['sku', 'name', 'category', 'buy_price', 'sell_price', 'stock', 'min_stock', 'location'];

    public function movements()
    {
        return $this->hasMany(StockMovement::class);
    }
}
