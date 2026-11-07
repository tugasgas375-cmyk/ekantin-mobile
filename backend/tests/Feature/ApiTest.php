<?php

namespace Tests\Feature;

use App\Models\Category;
use App\Models\MenuItem;
use App\Models\Order;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Support\Facades\Hash;
use Tests\TestCase;

class ApiTest extends TestCase
{
    use RefreshDatabase;

    private User $admin;
    private User $kasir;
    private Category $category;
    private MenuItem $menuBiasa;
    private MenuItem $menuNawar;
    private MenuItem $menuHabis;

    protected function setUp(): void
    {
        parent::setUp();

        $this->admin = User::create([
            'name' => 'Admin',
            'email' => 'admin@test.com',
            'password' => Hash::make('admin123'),
            'role' => 'admin',
        ]);

        $this->kasir = User::create([
            'name' => 'Kasir',
            'email' => 'kasir@test.com',
            'password' => Hash::make('kasir123'),
            'role' => 'kasir',
        ]);

        $this->category = Category::create(['name' => 'Makanan']);

        $this->menuBiasa = MenuItem::create([
            'category_id' => $this->category->id,
            'name' => 'Nasi Goreng',
            'price' => 15000,
            'is_available' => true,
            'allow_extra_rice' => true,
        ]);

        $this->menuNawar = MenuItem::create([
            'category_id' => $this->category->id,
            'name' => 'Mie Ayam Spesial',
            'price' => 13000,
            'is_available' => true,
            'allow_price_request' => true,
        ]);

        $this->menuHabis = MenuItem::create([
            'category_id' => $this->category->id,
            'name' => 'Es Teh',
            'price' => 5000,
            'is_available' => false,
            'has_temperature_option' => true,
        ]);
    }

    public function test_publik_bisa_lihat_kategori_dan_menu(): void
    {
        $this->getJson('/api/categories')->assertOk()->assertJsonCount(1);

        $this->getJson('/api/menu-items')
            ->assertOk()
            ->assertJsonCount(2) // hanya menu tersedia (Es Teh habis tidak ikut)
            ->assertJsonFragment(['name' => 'Nasi Goreng']);
    }

    public function test_login_menghasilkan_token(): void
    {
        $res = $this->postJson('/api/login', [
            'email' => 'admin@test.com',
            'password' => 'admin123',
            'role' => 'admin',
        ])->assertOk();

        $this->assertArrayHasKey('token', $res->json());
        $this->assertSame('admin', $res->json('user.role'));
    }

    public function test_login_ditolak_jika_role_tidak_cocok(): void
    {
        $this->postJson('/api/login', [
            'email' => 'kasir@test.com',
            'password' => 'kasir123',
            'role' => 'admin',
        ])->assertStatus(422);
    }

    public function test_admin_tanpa_token_ditolak(): void
    {
        $this->getJson('/api/admin/dashboard')->assertStatus(401);
    }

    public function test_tanpa_token_pada_request_non_json_dapat_401(): void
    {
        // Request tanpa Accept: application/json (mis. dibuka langsung di browser)
        // dulu melempar RouteNotFoundException "Route [login] not defined" -> 500,
        // karena backend ini API-only dan tidak punya route 'login'.
        $this->get('/api/admin/dashboard', ['Accept' => 'text/html'])
            ->assertStatus(401);
    }

    public function test_kasir_ditolak_di_endpoint_admin(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertStatus(403);
    }

    public function test_checkout_menghitung_total_dengan_nasi(): void
    {
        $res = $this->postJson('/api/orders', [
            'customer_name' => 'Budi',
            'table_number' => '5',
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'menu_items' => [
                ['id' => $this->menuBiasa->id, 'quantity' => 2, 'extra_rice' => 1],
            ],
        ])->assertStatus(201);

        // 15000*2 + 2000 nasi = 32000
        $this->assertSame(32000.0, (float) $res->json('order.total'));
        $this->assertSame(1, $res->json('order.queue_number'));
        $this->assertSame('pending', $res->json('order.status'));
    }

    public function test_wajib_harga_untuk_menu_nawar(): void
    {
        $this->postJson('/api/orders', [
            'customer_name' => 'Siti',
            'table_number' => '2',
            'menu_items' => [
                ['id' => $this->menuNawar->id, 'quantity' => 1],
            ],
        ])->assertStatus(422);
    }

    public function test_nawar_di_bawah_minimum_ditolak(): void
    {
        $this->postJson('/api/orders', [
            'customer_name' => 'Siti',
            'table_number' => '2',
            'menu_items' => [
                ['id' => $this->menuNawar->id, 'quantity' => 1, 'requested_price' => 3000],
            ],
        ])->assertStatus(422);
    }

    public function test_harga_nawar_dipakai_sa_checkout(): void
    {
        $res = $this->postJson('/api/orders', [
            'customer_name' => 'Siti',
            'table_number' => '2',
            'order_type' => 'takeaway',
            'menu_items' => [
                ['id' => $this->menuNawar->id, 'quantity' => 2, 'requested_price' => 7000],
            ],
        ])->assertStatus(201);

        $this->assertSame(14000.0, (float) $res->json('order.total'));

        $order = Order::first();
        $this->assertSame(7000, (int) $order->orderItems->first()->requested_price);
    }

    public function test_pesanan_menu_habis_ditolak(): void
    {
        $this->postJson('/api/orders', [
            'customer_name' => 'Andi',
            'table_number' => '1',
            'menu_items' => [
                ['id' => $this->menuHabis->id, 'quantity' => 1],
            ],
        ])->assertStatus(422);
    }

    public function test_batal_hanya_sa_status_pending(): void
    {
        $pending = Order::createWithQueue([
            'customer_name' => 'A',
            'table_number' => '1',
            'total' => 1000,
            'status' => 'pending',
            'source' => 'customer',
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'payment_status' => 'unpaid',
        ]);

        $processing = Order::createWithQueue([
            'customer_name' => 'B',
            'table_number' => '2',
            'total' => 1000,
            'status' => 'processing',
            'source' => 'customer',
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'payment_status' => 'unpaid',
        ]);

        $this->postJson("/api/orders/{$pending->id}/cancel")->assertOk();
        $this->assertSame('cancelled', $pending->fresh()->status);

        $this->postJson("/api/orders/{$processing->id}/cancel")->assertStatus(400);
        $this->assertSame('processing', $processing->fresh()->status);
    }

    public function test_status_dan_struk_via_nomor_antrean(): void
    {
        $order = Order::createWithQueue([
            'customer_name' => 'Budi',
            'table_number' => '5',
            'total' => 15000,
            'status' => 'pending',
            'source' => 'customer',
            'order_type' => 'dine_in',
            'payment_method' => 'cash',
            'payment_status' => 'unpaid',
        ], [
            [
                'menu_item_id' => $this->menuBiasa->id,
                'quantity' => 1,
                'price' => 15000,
                'extra_rice' => 0,
            ],
        ]);

        $this->getJson("/api/queue-status/{$order->queue_number}")
            ->assertOk()
            ->assertJsonPath('customer_name', 'Budi');

        $this->getJson("/api/receipt/{$order->queue_number}")
            ->assertOk()
            ->assertJsonPath('items.0.name', 'Nasi Goreng');
    }

    public function test_pembayaran_qris_menandai_lunas(): void
    {
        $order = Order::createWithQueue([
            'customer_name' => 'Budi',
            'table_number' => '5',
            'total' => 15000,
            'status' => 'pending',
            'source' => 'customer',
            'order_type' => 'dine_in',
            'payment_method' => 'qris',
            'payment_status' => 'unpaid',
        ]);

        $this->postJson("/api/payment/{$order->id}/qris-confirm")
            ->assertOk()
            ->assertJsonPath('payment_status', 'paid');

        $this->assertNotNull($order->fresh()->paid_at);
    }

    public function test_kasir_checkout_dan_ubah_status(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/orders', [
                'customer_name' => 'Walk-in',
                'order_type' => 'takeaway',
                'payment_method' => 'cash',
                'items' => [
                    ['id' => $this->menuBiasa->id, 'quantity' => 1, 'extra_rice' => 1],
                ],
            ])
            ->assertStatus(201)
            ->assertJsonPath('order.source', 'kasir');

        // 15000 + 2000 = 17000
        $this->assertSame(17000.0, (float) Order::first()->total);

        $this->actingAs($this->kasir, 'sanctum')
            ->postJson('/api/kasir/orders/1/status', ['status' => 'processing'])
            ->assertOk()
            ->assertJsonPath('order.status', 'processing');
    }

    public function test_kasir_bisa_lihat_menu_dan_poll(): void
    {
        $this->actingAs($this->kasir, 'sanctum')
            ->getJson('/api/kasir/menu-items')
            ->assertOk()
            ->assertJsonPath('0.name', 'Makanan');

        $this->actingAs($this->kasir, 'sanctum')
            ->getJson('/api/kasir/orders/poll')
            ->assertOk()
            ->assertJsonPath('count', 0);
    }

    public function test_dashboard_admin_menampilkan_statistik(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->getJson('/api/admin/dashboard')
            ->assertOk()
            ->assertJsonPath('stats.menus', 3)
            ->assertJsonPath('stats.users', 2);
    }

    public function test_admin_crud_kategori(): void
    {
        $this->actingAs($this->admin, 'sanctum')
            ->postJson('/api/admin/categories', ['name' => 'Minuman'])
            ->assertStatus(201)
            ->assertJsonPath('name', 'Minuman');

        $this->actingAs($this->admin, 'sanctum')
            ->putJson('/api/admin/categories/1', ['name' => 'Snack'])
            ->assertOk()
            ->assertJsonPath('name', 'Snack');

        $this->actingAs($this->admin, 'sanctum')
            ->deleteJson('/api/admin/categories/1')
            ->assertOk();
    }
}
