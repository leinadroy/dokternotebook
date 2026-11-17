<?php

namespace App\Http\Middleware;

use Closure;
use Illuminate\Http\Request;

/** Pemakaian: ->middleware('role:OWNER,ADMIN') */
class EnsureRole
{
    public function handle(Request $request, Closure $next, string ...$roles)
    {
        $user = $request->user();
        if (!$user || !$user->active || !in_array($user->role, $roles)) {
            return response()->json(['message' => 'Anda tidak punya akses untuk tindakan ini.'], 403);
        }
        return $next($request);
    }
}
