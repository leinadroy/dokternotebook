<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class ServiceLog extends Model
{
    const UPDATED_AT = null;
    protected $fillable = ['service_id', 'status', 'note', 'user_id'];

    public function user()
    {
        return $this->belongsTo(User::class)->select('id', 'name');
    }
}
