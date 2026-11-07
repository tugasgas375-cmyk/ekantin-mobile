<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\OrderItem;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class BestSellerController extends Controller
{
    public function report(Request $request): JsonResponse
    {
        $period = $request->get('period', 'all');

        $query = MenuItem::select(
            'menu_items.id',
            'menu_items.name',
            'menu_items.description',
            'menu_items.price',
            'menu_items.image',
            'menu_items.is_available',
            'menu_items.is_best_seller',
            'menu_items.category_id',
            DB::raw('COALESCE(SUM(order_items.quantity), 0) as total_orders'),
            DB::raw('COALESCE(SUM(order_items.quantity * order_items.price), 0) as total_revenue')
        )
            ->leftJoin('order_items', 'menu_items.id', '=', 'order_items.menu_item_id');

        if ($period !== 'all') {
            $query->leftJoin('orders', 'order_items.order_id', '=', 'orders.id')
                ->where(function ($q) use ($period) {
                    if ($period === 'today') {
                        $q->whereDate('orders.created_at', today());
                    } elseif ($period === 'week') {
                        $q->whereBetween('orders.created_at', [now()->startOfWeek(), now()->endOfWeek()]);
                    } elseif ($period === 'month') {
                        $q->whereMonth('orders.created_at', now()->month)
                            ->whereYear('orders.created_at', now()->year);
                    }
                });
        }

        $favoriteMenus = $query->groupBy(
            'menu_items.id', 'menu_items.name', 'menu_items.description',
            'menu_items.price', 'menu_items.image', 'menu_items.is_available',
            'menu_items.is_best_seller', 'menu_items.category_id'
        )
            ->orderByDesc('total_orders')
            ->paginate(10);

        $allMenus = (clone $query)->get();
        $stats = [
            'total_menu' => MenuItem::count(),
            'total_ordered' => $allMenus->sum('total_orders'),
            'total_revenue' => $allMenus->sum('total_revenue'),
            'top_menu' => $allMenus->first(),
        ];

        return response()->json([
            'period' => $period,
            'stats' => $stats,
            'menus' => $favoriteMenus,
        ]);
    }

    public function toggle(MenuItem $menu): JsonResponse
    {
        $menu->update(['is_best_seller' => ! $menu->is_best_seller]);

        return response()->json($menu->fresh());
    }

    public function reset(): JsonResponse
    {
        DB::statement('SET FOREIGN_KEY_CHECKS=0');
        OrderItem::truncate();
        Order::truncate();
        DB::statement('SET FOREIGN_KEY_CHECKS=1');

        return response()->json(['message' => 'Semua riwayat pesanan berhasil direset.']);
    }

    public function resetToday(): JsonResponse
    {
        $todayOrderIds = Order::whereDate('created_at', today())->pluck('id');

        if ($todayOrderIds->isNotEmpty()) {
            OrderItem::whereIn('order_id', $todayOrderIds)->delete();
            Order::whereIn('id', $todayOrderIds)->delete();
        }

        return response()->json(['message' => 'Riwayat pesanan hari ini berhasil direset.']);
    }
}
