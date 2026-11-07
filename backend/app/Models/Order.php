<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Support\Facades\DB;

class Order extends Model
{
    use HasFactory;

    protected $fillable = [
        'queue_number',
        'customer_name',
        'table_number',
        'order_type',
        'total',
        'payment_method',
        'payment_status',
        'paid_at',
        'status',
        'source',
        'notes',
    ];

    protected $casts = [
        'total' => 'decimal:2',
        'queue_number' => 'integer',
        'paid_at' => 'datetime',
    ];

    public function orderItems(): HasMany
    {
        return $this->hasMany(OrderItem::class);
    }

    public static function generateQueueNumber(): int
    {
        $today = now()->toDateString();

        $lastOrder = DB::table('orders')
            ->whereDate('created_at', $today)
            ->lockForUpdate()
            ->max('queue_number');

        return $lastOrder ? $lastOrder + 1 : 1;
    }

    public static function createWithQueue(array $data, array $orderItems = []): self
    {
        $maxRetries = 5;

        for ($attempt = 1; $attempt <= $maxRetries; $attempt++) {
            try {
                return DB::transaction(function () use ($data, $orderItems) {
                    $data['queue_number'] = self::generateQueueNumber();
                    $order = self::create($data);

                    foreach ($orderItems as $item) {
                        $order->orderItems()->create($item);
                    }

                    return $order;
                });
            } catch (\Illuminate\Database\QueryException $e) {
                if ($attempt === $maxRetries) {
                    throw $e;
                }
                usleep(50000);
            }
        }

        throw new \Exception('Gagal generate nomor antrean setelah ' . $maxRetries . ' percobaan.');
    }
}
