<?php

namespace App\Http\Controllers\Api\Customer;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

class PaymentController extends Controller
{
    public function qrisConfirm(Order $order): JsonResponse
    {
        if ($order->payment_method !== 'qris') {
            return response()->json([
                'message' => 'Pesanan ini tidak menggunakan pembayaran QRIS.',
            ], 422);
        }

        if ($order->status === 'cancelled') {
            return response()->json([
                'message' => 'Pembayaran tidak dapat dikonfirmasi untuk pesanan yang dibatalkan.',
            ], 409);
        }

        if ($order->payment_status !== 'paid') {
            $order->update([
                'payment_status' => 'paid',
                'paid_at' => now(),
            ]);
        }

        $order->refresh();

        return response()->json([
            'message' => 'Pembayaran berhasil.',
            'payment_status' => $order->payment_status,
            'paid_at' => $order->paid_at?->format('d M Y H:i:s'),
        ]);
    }

    public function checkPaymentStatus(Order $order): JsonResponse
    {
        return response()->json([
            'payment_status' => $order->payment_status,
            'paid_at' => $order->paid_at?->format('d M Y H:i:s'),
        ]);
    }
}
