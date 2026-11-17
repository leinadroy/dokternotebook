<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Payment extends Model
{
    const UPDATED_AT = null;
    protected $fillable = ['service_id', 'amount', 'method', 'type', 'note', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class)->select('id', 'name');
    }

    public function signedAmount(): int
    {
        return $this->type === 'REFUND' ? -$this->amount : $this->amount;
    }
}
