<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Token milik user yang sudah dinonaktifkan langsung ditolak */
class EnsureActive
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && !$request->user()->active) {
            $request->user()->currentAccessToken()?->delete();
            return response()->json(['message' => 'Akun nonaktif.'], 401);
        }
        return $next($request);
    }
}
