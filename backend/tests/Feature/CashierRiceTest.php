<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class CashierRiceTest extends TestCase
{
    use RefreshDatabase;

    public function test_cashier_checkout_charges_each_selected_rice_addon_for_each_menu_quantity(): void
    {
        $user = User::create([
            'name' => 'Kasir',
            'email' => 'kasir-rice@test.com',
            'password' => Hash::make('password'),
            'role' => 'kasir',
        ]);
        $category = Category::create(['name' => 'Makanan']);
        $menu = MenuItem::create([
            'category_id' => $category->id,
            'name' => 'Nasi Goreng',
            'price' => 15000,
            'is_available' => true,
            'allow_extra_rice' => true,
        ]);

        $this->actingAs($user, 'sanctum')
            ->postJson('/api/kasir/orders', [
                'customer_name' => 'Pelanggan',
                'order_type' => 'takeaway',
                'payment_method' => 'cash',
                'items' => [[
                    'id' => $menu->id,
                    'quantity' => 2,
                    'extra_rice' => 2,
                ]],
            ])
            ->assertCreated()
            ->assertJsonPath('order.total', '38000.00')
            ->assertJsonPath('order.order_items.0.extra_rice', 4);

        $this->assertSame(38000.0, (float) Order::first()->total);
    }
}
