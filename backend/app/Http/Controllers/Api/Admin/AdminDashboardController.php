<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Http\JsonResponse;
use Illuminate\Support\Facades\DB;

class AdminDashboardController extends Controller
{
    public function index(): JsonResponse
    {
        $today = today();

        return response()->json([
            'stats' => [
                'categories' => Category::count(),
                'menus' => MenuItem::count(),
                'available_menus' => MenuItem::where('is_available', true)->count(),
                'users' => User::count(),
                'orders_today' => Order::whereDate('created_at', $today)->count(),
                'revenue_today' => Order::whereDate('created_at', $today)->where('status', 'completed')->sum('total'),
            ],
        ]);
    }

    public function pollNewOrders(): JsonResponse
    {
        $today = today();

        $pendingCount = Order::where('status', 'pending')->whereDate('created_at', $today)->count();
        $processingCount = Order::where('status', 'processing')->whereDate('created_at', $today)->count();
        $completedCount = Order::where('status', 'completed')->whereDate('created_at', $today)->count();

        $latestOrder = Order::whereDate('created_at', $today)->latest()->first();

        $revenueToday = Order::whereDate('created_at', $today)->where('status', 'completed')->sum('total');

        return response()->json([
            'pending' => $pendingCount,
            'processing' => $processingCount,
            'completed' => $completedCount,
            'latest_order_id' => $latestOrder?->id,
            'latest_queue' => $latestOrder?->queue_number,
            'latest_order_name' => $latestOrder?->customer_name,
            'latest_order_total' => $latestOrder?->total,
            'revenue_today' => $revenueToday,
        ]);
    }
}
