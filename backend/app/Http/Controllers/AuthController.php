<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\Hash;

/** Login berbasis sesi (cookie httpOnly) untuk SPA di domain yang sama */
class AuthController extends Controller
{
    public function login(Request $r)
    {
        $data = $r->validate(['username' => 'required|string', 'password' => 'required|string']);
        $ok = Auth::guard('web')->attempt([
            'username' => strtolower(trim($data['username'])),
            'password' => $data['password'],
            'active' => true,
        ]);
        if (!$ok) {
            return response()->json(['message' => 'Username atau password salah'], 422);
        }
        $r->session()->regenerate();
        return ['user' => Auth::guard('web')->user()->only('id', 'name', 'username', 'role')];
    }

    public function me(Request $r)
    {
        return $r->user()->only('id', 'name', 'username', 'role');
    }

    public function logout(Request $r)
    {
        Auth::guard('web')->logout();
        $r->session()->invalidate();
        $r->session()->regenerateToken();
        return ['ok' => true];
    }

    public function changePassword(Request $r)
    {
        $data = $r->validate(['old' => 'required', 'new' => 'required|min:6']);
        if (!Hash::check($data['old'], $r->user()->password)) {
            return response()->json(['message' => 'Password lama salah'], 422);
        }
        $r->user()->update(['password' => $data['new']]);
        return ['message' => 'Password berhasil diganti'];
    }
}
