<?php

use Illuminate\Support\Facades\Route;

/*
| Frontend SvelteKit (SPA) dibuild ke public/ (npm run build di folder frontend).
| Semua alamat selain /api/* dan file statis dikembalikan ke halaman SPA.
*/
$spa = function (\Illuminate\Http\Request $request) {
    if ($request->is('api/*')) {
        return response()->json(['message' => 'Endpoint tidak ditemukan.'], 404);
    }
    $file = public_path('spa.html');
    if (!is_file($file)) {
        return response('Frontend belum dibuild. Jalankan "npm run build" di folder frontend.', 503);
    }
    return response()->file($file, ['Cache-Control' => 'no-cache']);
};

Route::get('/', $spa);
Route::fallback($spa);
