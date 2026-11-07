<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Laporan E-Kantin</title>
    <style>
        body { font-family: sans-serif; font-size: 12px; }
        h2 { margin-bottom: 4px; }
        table { width: 100%; border-collapse: collapse; margin-top: 12px; }
        th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
        th { background: #f0f0f0; }
        .text-right { text-align: right; }
        .summary { margin-top: 10px; }
    </style>
</head>
<body>
    <h2>LAPORAN TRANSAKSI E-KANTIN</h2>
    <div>{{ $periodLabel }}</div>

    <div class="summary">
        <strong>Total Pesanan:</strong> {{ $totalOrders }} &nbsp;&nbsp;
        <strong>Pendapatan (Selesai):</strong> Rp {{ number_format($totalRevenue, 0, ',', '.') }}
    </div>

    <table>
        <thead>
            <tr>
                <th>No</th>
                <th>Antrean</th>
                <th>Pelanggan</th>
                <th>Jenis</th>
                <th>Items</th>
                <th class="text-right">Total</th>
                <th>Pembayaran</th>
                <th>Status</th>
                <th>Tanggal</th>
            </tr>
        </thead>
        <tbody>
            @forelse ($orders as $index => $order)
                <tr>
                    <td>{{ $index + 1 }}</td>
                    <td>A{{ $order->queue_number }}</td>
                    <td>{{ $order->customer_name }}</td>
                    <td>{{ $order->order_type === 'dine_in' ? 'Dine In' : 'Bungkus' }}</td>
                    <td>
                        @foreach ($order->orderItems as $item)
                            {{ $item->quantity }}x {{ $item->menuItem->name }}<br>
                        @endforeach
                    </td>
                    <td class="text-right">Rp {{ number_format($order->total, 0, ',', '.') }}</td>
                    <td>{{ $order->payment_method === 'qris' ? 'QRIS' : 'Tunai' }}</td>
                    <td>
                        @if ($order->status === 'pending') Menunggu
                        @elseif ($order->status === 'processing') Diproses
                        @elseif ($order->status === 'completed') Selesai
                        @else Dibatalkan @endif
                    </td>
                    <td>{{ $order->created_at->format('d/m/Y H:i') }}</td>
                </tr>
            @empty
                <tr><td colspan="9">Tidak ada data.</td></tr>
            @endforelse
        </tbody>
    </table>
</body>
</html>
