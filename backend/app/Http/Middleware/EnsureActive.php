<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

/** Sesi milik user yang sudah dinonaktifkan langsung ditolak */
class EnsureActive
{
    public function handle(Request $request, Closure $next)
    {
        if ($request->user() && !$request->user()->active) {
            Auth::guard('web')->logout();
            $request->session()->invalidate();
            return response()->json(['message' => 'Akun nonaktif.'], 401);
        }
        return $next($request);
    }
}
