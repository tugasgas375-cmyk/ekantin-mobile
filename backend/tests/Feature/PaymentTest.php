<?php

namespace Tests\Feature;

use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class PaymentTest extends TestCase
{
    use RefreshDatabase;

    public function test_qris_confirmation_rejects_cash_orders(): void
    {
        $order = $this->makeOrder('cash');

        $this->postJson("/api/payment/{$order->id}/qris-confirm")
            ->assertStatus(422)
            ->assertJsonPath('message', 'Pesanan ini tidak menggunakan pembayaran QRIS.');

        $this->assertSame('unpaid', $order->fresh()->payment_status);
    }

    public function test_qris_confirmation_does_not_pay_cancelled_orders(): void
    {
        $order = $this->makeOrder('qris', 'cancelled');

        $this->postJson("/api/payment/{$order->id}/qris-confirm")
            ->assertStatus(409);

        $this->assertSame('unpaid', $order->fresh()->payment_status);
    }

    private function makeOrder(string $paymentMethod, string $status = 'pending'): Order
    {
        return Order::createWithQueue([
            'customer_name' => 'Test Customer',
            'table_number' => '1',
            'total' => 10000,
            'status' => $status,
            'source' => 'customer',
            'order_type' => 'dine_in',
            'payment_method' => $paymentMethod,
            'payment_status' => 'unpaid',
        ]);
    }
}
