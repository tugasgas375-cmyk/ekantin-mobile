<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\MenuItem;
use App\Models\Order;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Validation\ValidationException;

class PublicOrderController extends Controller
{
    public function store(Request $request): JsonResponse
    {
        $request->validate([
            'customer_name' => 'required|string|max:255',
            'table_number' => 'required|string|max:50',
            'menu_items' => 'required|array|min:1',
            'menu_items.*.id' => 'required|exists:menu_items,id',
            'menu_items.*.quantity' => 'required|integer|min:1|max:99',
            'menu_items.*.temperature' => 'nullable|string|in:Dingin,Panas',
            'menu_items.*.requested_price' => 'nullable|integer|min:5000',
            'menu_items.*.extra_rice' => 'nullable|integer|min:0|max:99',
            'order_type' => 'nullable|in:dine_in,takeaway',
            'payment_method' => 'nullable|in:cash,qris',
        ]);

        $menuIds = array_column($request->menu_items, 'id');
        $menus = MenuItem::whereIn('id', $menuIds)->get()->keyBy('id');

        $errors = [];
        foreach ($request->menu_items as $index => $item) {
            $menu = $menus[$item['id']] ?? null;

            if (! $menu || ! $menu->is_available) {
                $errors["menu_items.{$index}.id"] = 'Menu tidak tersedia.';
                continue;
            }

            if ($menu->allow_price_request && empty($item['requested_price'])) {
                $errors["menu_items.{$index}.requested_price"] = "Harga wajib diisi untuk menu {$menu->name}.";
            }
        }
        if ($errors) {
            throw ValidationException::withMessages($errors);
        }

        $total = 0;
        $orderItems = [];

        foreach ($request->menu_items as $item) {
            $menu = $menus[$item['id']];

            $requestedPrice = null;
            if (! empty($item['requested_price']) && $menu->allow_price_request) {
                $requestedPrice = (int) $item['requested_price'];
            }

            $unitPrice = $requestedPrice ?? $menu->price;
            $subtotal = $unitPrice * $item['quantity'];

            $extraRice = 0;
            if (! empty($item['extra_rice']) && $menu->allow_extra_rice) {
                $extraRice = min(99, (int) $item['extra_rice']);
            }
            $subtotal += $extraRice * (int) config('kantin.rice_price');

            $total += $subtotal;

            $orderItems[] = [
                'menu_item_id' => $menu->id,
                'quantity' => $item['quantity'],
                'price' => $unitPrice,
                'requested_price' => $requestedPrice,
                'temperature' => ! empty($item['temperature']) ? $item['temperature'] : null,
                'extra_rice' => $extraRice,
            ];
        }

        $paymentMethod = $request->payment_method ?? 'cash';

        $order = Order::createWithQueue([
            'customer_name' => $request->customer_name,
            'table_number' => $request->table_number,
            'total' => $total,
            'status' => 'pending',
            'source' => 'customer',
            'order_type' => $request->order_type ?? 'dine_in',
            'payment_method' => $paymentMethod,
            'payment_status' => 'unpaid',
        ], $orderItems);

        return response()->json([
            'message' => "Pesanan berhasil! Nomor antrean: A{$order->queue_number}.",
            'order' => [
                'id' => $order->id,
                'queue_number' => $order->queue_number,
                'status' => $order->status,
                'total' => $order->total,
                'payment_method' => $order->payment_method,
                'payment_status' => $order->payment_status,
            ],
        ], 201);
    }

    public function getStatus(Order $order): JsonResponse
    {
        return response()->json([
            'id' => $order->id,
            'queue_number' => $order->queue_number,
            'customer_name' => $order->customer_name,
            'status' => $order->status,
            'total' => $order->total,
        ]);
    }

    public function cancelOrder(Order $order): JsonResponse
    {
        if ($order->status !== 'pending') {
            return response()->json(['message' => 'Pesanan tidak bisa dibatalkan karena sudah diproses.'], 400);
        }

        $order->update(['status' => 'cancelled']);

        return response()->json(['message' => 'Pesanan berhasil dibatalkan.']);
    }

    public function getStatusByQueue(int $queueNumber): JsonResponse
    {
        $order = Order::where('queue_number', $queueNumber)
            ->whereDate('created_at', today())
            ->latest()
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        return response()->json([
            'queue_number' => $order->queue_number,
            'status' => $order->status,
            'customer_name' => $order->customer_name,
            'total' => $order->total,
        ]);
    }

    public function receipt(int $queueNumber): JsonResponse
    {
        $order = Order::with(['orderItems.menuItem'])
            ->where('queue_number', $queueNumber)
            ->whereDate('created_at', today())
            ->latest()
            ->first();

        if (! $order) {
            return response()->json(['message' => 'Pesanan tidak ditemukan'], 404);
        }

        return response()->json([
            'id' => $order->id,
            'queue_number' => $order->queue_number,
            'customer_name' => $order->customer_name,
            'table_number' => $order->table_number,
            'order_type' => $order->order_type,
            'status' => $order->status,
            'total' => $order->total,
            'source' => $order->source,
            'created_at' => $order->created_at->format('d M Y H:i'),
            'items' => $order->orderItems->map(fn ($item) => [
                'name' => $item->menuItem->name,
                'quantity' => $item->quantity,
                'price' => $item->price,
                'temperature' => $item->temperature,
                'extra_rice' => (int) $item->extra_rice,
                'requested_price' => $item->requested_price,
                'subtotal' => ($item->price * $item->quantity) + (config('kantin.rice_price') * $item->extra_rice),
            ]),
        ]);
    }
}
