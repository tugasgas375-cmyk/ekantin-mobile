<?php

namespace App\Http\Controllers\Api\Kasir;

use App\Http\Controllers\Controller;
use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;

class KasirOrderController extends Controller
{
    public function menuItems(): JsonResponse
    {
        $categories = Category::with(['menuItems' => function ($query) {
            $query->where('is_available', true)->orderBy('name');
        }])->get();

        return response()->json($categories);
    }

    public function orders(): JsonResponse
    {
        $orders = Order::with(['orderItems.menuItem'])
            ->whereIn('status', ['pending', 'processing'])
            ->latest()
            ->get();

        return response()->json($orders);
    }

    public function pollOrders(): JsonResponse
    {
        $orders = Order::with(['orderItems.menuItem'])
            ->whereIn('status', ['pending', 'processing'])
            ->latest()
            ->get();

        return response()->json([
            'orders' => $orders,
            'count' => $orders->count(),
        ]);
    }

    public function checkout(Request $request): JsonResponse
    {
        $validated = $request->validate([
            'customer_name' => 'required|string|max:255',
            'order_type' => 'required|in:dine_in,takeaway',
            'table_number' => 'nullable|string|max:50|required_if:order_type,dine_in',
            'payment_method' => 'nullable|in:cash,qris',
            'items' => 'required|array|min:1',
            'items.*.id' => 'required|exists:menu_items,id',
            'items.*.quantity' => 'required|integer|min:1|max:99',
            'items.*.temperature' => 'nullable|string|in:Dingin,Panas',
            'items.*.extra_rice' => 'nullable|integer|in:0,1',
        ]);

        $total = 0;
        $orderItems = [];
        $unavailable = [];

        $menuIds = array_column($validated['items'], 'id');
        $menus = MenuItem::whereIn('id', $menuIds)->get()->keyBy('id');

        foreach ($validated['items'] as $item) {
            $menu = $menus->get($item['id']);

            if (! $menu || ! $menu->is_available) {
                $unavailable[] = $menu->name ?? 'Menu #'.$item['id'];
                continue;
            }

            $subtotal = $menu->price * $item['quantity'];

            $extraRice = 0;
            if (! empty($item['extra_rice']) && $menu->allow_extra_rice) {
                $extraRice = min(99, (int) $item['extra_rice'] * (int) $item['quantity']);
            }
            $subtotal += $extraRice * (int) config('kantin.rice_price');

            $total += $subtotal;

            $orderItems[] = [
                'menu_item_id' => $menu->id,
                'quantity' => $item['quantity'],
                'price' => $menu->price,
                'temperature' => $item['temperature'] ?? null,
                'extra_rice' => $extraRice,
            ];
        }

        if (! empty($unavailable)) {
            return response()->json([
                'message' => 'Item berikut sudah tidak tersedia: '.implode(', ', $unavailable),
            ], 422);
        }

        $paymentMethod = $validated['payment_method'] ?? 'cash';

        $order = Order::createWithQueue([
            'customer_name' => $validated['customer_name'],
            'table_number' => $validated['order_type'] === 'takeaway' ? 'Bungkus' : $validated['table_number'],
            'total' => $total,
            'status' => 'pending',
            'source' => 'kasir',
            'order_type' => $validated['order_type'],
            'payment_method' => $paymentMethod,
            'payment_status' => 'unpaid',
        ], $orderItems);

        return response()->json([
            'message' => "Pesanan A{$order->queue_number} berhasil dibuat!",
            'order' => $order->load('orderItems.menuItem'),
        ], 201);
    }

    public function updateStatus(Order $order, Request $request): JsonResponse
    {
        $request->validate([
            'status' => 'required|in:processing,completed,cancelled',
        ]);

        $order->update(['status' => $request->status]);

        return response()->json([
            'message' => "Status pesanan A{$order->queue_number} berhasil diubah.",
            'order' => $order->fresh(),
        ]);
    }

    public function pollPayments(): JsonResponse
    {
        $recentlyPaid = Order::where('payment_status', 'paid')
            ->where('payment_method', 'qris')
            ->where('paid_at', '>=', now()->subSeconds(30))
            ->whereDate('created_at', today())
            ->get()
            ->map(fn ($order) => [
                'id' => $order->id,
                'queue_number' => $order->queue_number,
                'customer_name' => $order->customer_name,
                'total' => $order->total,
                'paid_at' => $order->paid_at?->format('H:i:s') ?? now()->format('H:i:s'),
            ]);

        return response()->json([
            'recently_paid' => $recentlyPaid,
        ]);
    }
}
