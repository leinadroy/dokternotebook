<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;

class AuthController extends Controller
{
    public function login(Request $r)
    {
        $data = $r->validate(['username' => 'required|string', 'password' => 'required|string']);
        $user = User::where('username', strtolower(trim($data['username'])))->first();
        if (!$user || !$user->active || !Hash::check($data['password'], $user->password)) {
            return response()->json(['message' => 'Username atau password salah'], 422);
        }
        $token = $user->createToken('web', ['*'], now()->addHours(12))->plainTextToken;
        return ['token' => $token, 'user' => $user->only('id', 'name', 'username', 'role')];
    }

    public function me(Request $r)
    {
        return $r->user()->only('id', 'name', 'username', 'role');
    }

    public function logout(Request $r)
    {
        $r->user()->currentAccessToken()->delete();
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
