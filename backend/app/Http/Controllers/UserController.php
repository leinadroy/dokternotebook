<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

class UserController extends Controller
{
    public function index()
    {
        return User::orderByDesc('active')->orderBy('role')->orderBy('name')->get(['id', 'name', 'username', 'role', 'phone', 'active']);
    }

    private function validated(Request $r, ?User $u = null): array
    {
        $r->merge(['username' => strtolower(trim((string) $r->username))]);
        $d = $r->validate([
            'name' => 'required|string|max:255',
            'username' => ['required', 'string', 'max:50', 'alpha_dash', Rule::unique('users')->ignore($u?->id)],
            'role' => ['required', Rule::in(['OWNER', 'ADMIN', 'TEKNISI'])],
            'phone' => 'nullable|string|max:30',
            'active' => 'boolean',
            'password' => [$u ? 'nullable' : 'required', 'string', 'min:6'],
        ], ['username.unique' => 'Username sudah dipakai']);
        if (empty($d['password'])) {
            unset($d['password']);
        }
        return $d;
    }

    public function store(Request $r)
    {
        User::create($this->validated($r));
        return response()->json(['message' => 'Pengguna ditambahkan'], 201);
    }

    public function update(Request $r, User $user)
    {
        $d = $this->validated($r, $user);
        if ($user->id === $r->user()->id && (($d['active'] ?? true) === false || $d['role'] !== 'OWNER')) {
            return response()->json(['message' => 'Tidak bisa menonaktifkan / menurunkan peran akun sendiri'], 422);
        }
        $user->update($d);
        if (!$user->active) {
            $user->tokens()->delete();
        }
        return ['message' => 'Pengguna disimpan'];
    }
}
