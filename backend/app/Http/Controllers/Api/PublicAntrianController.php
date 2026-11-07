<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Order;
use Illuminate\Http\JsonResponse;

class PublicAntrianController extends Controller
{
    public function index(): JsonResponse
    {
        $today = today();

        $current = Order::where('status', 'processing')
            ->whereDate('created_at', $today)
            ->latest('queue_number')
            ->first();

        $pending = Order::where('status', 'pending')
            ->whereDate('created_at', $today)
            ->orderBy('queue_number')
            ->get();

        $completedCount = Order::where('status', 'completed')
            ->whereDate('created_at', $today)
            ->count();

        return response()->json([
            'current' => $current?->queue_number,
            'next' => $pending->first()?->queue_number,
            'pending' => $pending->pluck('queue_number'),
            'completed_count' => $completedCount,
        ]);
    }
}
