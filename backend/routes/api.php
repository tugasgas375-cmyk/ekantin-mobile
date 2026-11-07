<?php

use App\Http\Controllers\Api\Admin\AdminDashboardController;
use App\Http\Controllers\Api\Admin\BestSellerController;
use App\Http\Controllers\Api\Admin\CategoryController;
use App\Http\Controllers\Api\Admin\LaporanController;
use App\Http\Controllers\Api\Admin\MenuItemController as AdminMenuItemController;
use App\Http\Controllers\Api\Admin\UserController;
use App\Http\Controllers\Api\AuthController;
use App\Http\Controllers\Api\Customer\CustomerMenuController;
use App\Http\Controllers\Api\Customer\PaymentController as CustomerPaymentController;
use App\Http\Controllers\Api\Kasir\KasirOrderController;
use App\Http\Controllers\Api\PublicAntrianController;
use App\Http\Controllers\Api\PublicOrderController;
use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| Public API (customer, tanpa login)
|--------------------------------------------------------------------------
*/

Route::get('/categories', [CustomerMenuController::class, 'categories']);
Route::get('/menu-items', [CustomerMenuController::class, 'index']);

Route::middleware('throttle:10,1')->group(function () {
    Route::post('/orders', [PublicOrderController::class, 'store']);
});

Route::get('/orders/{order}/status', [PublicOrderController::class, 'getStatus']);
Route::post('/orders/{order}/cancel', [PublicOrderController::class, 'cancelOrder']);
Route::get('/queue-status/{queueNumber}', [PublicOrderController::class, 'getStatusByQueue']);
Route::get('/receipt/{queueNumber}', [PublicOrderController::class, 'receipt'])->middleware('throttle:30,1');

Route::get('/payment/{order}/status', [CustomerPaymentController::class, 'checkPaymentStatus']);
Route::post('/payment/{order}/qris-confirm', [CustomerPaymentController::class, 'qrisConfirm']);

Route::get('/antrian', [PublicAntrianController::class, 'index']);

/*
|--------------------------------------------------------------------------
| Auth (Sanctum token)
|--------------------------------------------------------------------------
*/

Route::post('/login', [AuthController::class, 'login']);

Route::middleware('auth:sanctum')->group(function () {
    Route::post('/logout', [AuthController::class, 'logout']);
    Route::get('/me', [AuthController::class, 'me']);
});

/*
|--------------------------------------------------------------------------
| Admin (role:admin)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'role:admin'])->prefix('admin')->group(function () {
    Route::get('/dashboard', [AdminDashboardController::class, 'index']);
    Route::get('/orders/poll', [AdminDashboardController::class, 'pollNewOrders']);

    Route::apiResource('categories', CategoryController::class);

    Route::apiResource('menu-items', AdminMenuItemController::class);
    Route::post('/menu-items/{menuItem}/toggle', [AdminMenuItemController::class, 'toggle']);
    Route::post('/menu-items/{menu}/best-seller', [BestSellerController::class, 'toggle']);
    Route::post('/menu-items/{menu}/best-seller/reset', [BestSellerController::class, 'reset']);

    Route::apiResource('users', UserController::class);

    Route::get('/menu-favorit', [BestSellerController::class, 'report']);
    Route::post('/menu-favorit/reset-today', [BestSellerController::class, 'resetToday']);

    Route::get('/laporan', [LaporanController::class, 'index']);
    Route::get('/laporan/export/pdf', [LaporanController::class, 'exportPdf']);
    Route::get('/laporan/export/excel', [LaporanController::class, 'exportExcel']);
});

/*
|--------------------------------------------------------------------------
| Kasir (role:kasir)
|--------------------------------------------------------------------------
*/

Route::middleware(['auth:sanctum', 'role:kasir'])->prefix('kasir')->group(function () {
    Route::get('/menu-items', [KasirOrderController::class, 'menuItems']);
    Route::post('/orders', [KasirOrderController::class, 'checkout']);
    Route::get('/orders', [KasirOrderController::class, 'orders']);
    Route::get('/orders/poll', [KasirOrderController::class, 'pollOrders']);
    Route::post('/orders/{order}/status', [KasirOrderController::class, 'updateStatus']);
    Route::get('/payments/poll', [KasirOrderController::class, 'pollPayments']);
});
