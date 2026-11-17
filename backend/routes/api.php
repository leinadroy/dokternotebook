<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\CustomerController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\ReportController;
use App\Http\Controllers\ServiceController;
use App\Http\Controllers\SettingController;
use App\Http\Controllers\SparepartController;
use App\Http\Controllers\UserController;
use App\Http\Controllers\WarrantyController;
use Illuminate\Support\Facades\Route;

// ---------- Publik ----------
Route::post('/login', [AuthController::class, 'login'])->middleware('throttle:10,1');
Route::get('/public/settings', [SettingController::class, 'public']);
Route::get('/public/cek', [SettingController::class, 'cek'])->middleware('throttle:30,1');

// ---------- Semua staf yang login ----------
Route::middleware(['auth:sanctum', 'active'])->group(function () {
    Route::get('/me', [AuthController::class, 'me']);
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::post('/me/password', [AuthController::class, 'changePassword']);

    Route::get('/dashboard', DashboardController::class);
    Route::get('/technicians', [ServiceController::class, 'technicians']);

    Route::get('/services', [ServiceController::class, 'index']);
    Route::get('/services/{service}', [ServiceController::class, 'show']);
    Route::put('/services/{service}', [ServiceController::class, 'update']);
    Route::post('/services/{service}/status', [ServiceController::class, 'updateStatus']);
    Route::post('/services/{service}/items', [ServiceController::class, 'addItem']);
    Route::delete('/items/{item}', [ServiceController::class, 'deleteItem']);

    Route::get('/customers', [CustomerController::class, 'index']);
    Route::get('/customers/lookup', [CustomerController::class, 'lookup']);
    Route::get('/customers/{customer}', [CustomerController::class, 'show']);

    Route::get('/spareparts', [SparepartController::class, 'index']);
    Route::get('/stock-movements', [SparepartController::class, 'movements']);

    // ---------- Pemilik & Admin/Kasir ----------
    Route::middleware('role:OWNER,ADMIN')->group(function () {
        Route::post('/services', [ServiceController::class, 'store']);
        Route::post('/services/{service}/payments', [ServiceController::class, 'addPayment']);
        Route::put('/customers/{customer}', [CustomerController::class, 'update']);
        Route::post('/spareparts', [SparepartController::class, 'store']);
        Route::put('/spareparts/{sparepart}', [SparepartController::class, 'update']);
        Route::post('/spareparts/{sparepart}/stock', [SparepartController::class, 'adjust']);
        Route::get('/warranty', WarrantyController::class);
        Route::get('/reports', ReportController::class);
    });

    // ---------- Pemilik saja ----------
    Route::middleware('role:OWNER')->group(function () {
        Route::delete('/payments/{payment}', [ServiceController::class, 'deletePayment']);
        Route::delete('/spareparts/{sparepart}', [SparepartController::class, 'destroy']);
        Route::get('/users', [UserController::class, 'index']);
        Route::post('/users', [UserController::class, 'store']);
        Route::put('/users/{user}', [UserController::class, 'update']);
        Route::get('/settings', [SettingController::class, 'show']);
        Route::put('/settings', [SettingController::class, 'update']);
    });
});
