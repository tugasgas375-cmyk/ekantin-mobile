<?php

namespace App\Http\Controllers\Api\Admin;

use App\Http\Controllers\Controller;
use App\Models\Order;
use App\Models\OrderItem;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use PhpOffice\PhpSpreadsheet\Spreadsheet;
use PhpOffice\PhpSpreadsheet\Writer\Xlsx;

class LaporanController extends Controller
{
    public function index(Request $request): JsonResponse
    {
        [$query, $statsQuery, $type, $date, $month, $periodLabel] = $this->buildQuery($request);

        $orders = $query->latest()->paginate(15);

        $totalOrders = $statsQuery->count();
        $totalRevenue = (clone $statsQuery)->where('status', 'completed')->sum('total');
        $completedOrders = (clone $statsQuery)->where('status', 'completed')->count();
        $pendingOrders = (clone $statsQuery)->where('status', 'pending')->count();
        $cancelledOrders = (clone $statsQuery)->where('status', 'cancelled')->count();

        $menuSummary = OrderItem::whereHas('order', function ($q) use ($type, $date, $month) {
            $this->applyPeriod($q, $type, $date, $month);
            $q->where('status', 'completed');
        })->with('menuItem')
            ->select('menu_item_id', DB::raw('SUM(quantity) as total_qty'), DB::raw('SUM(price * quantity) as total_revenue'))
            ->groupBy('menu_item_id')
            ->orderByDesc('total_qty')
            ->get()
            ->map(fn ($row) => [
                'id' => $row->menu_item_id,
                'name' => $row->menuItem?->name,
                'total_qty' => (int) $row->total_qty,
                'total_revenue' => (float) $row->total_revenue,
            ]);

        return response()->json([
            'orders' => $orders,
            'stats' => [
                'total_orders' => $totalOrders,
                'total_revenue' => $totalRevenue,
                'completed_orders' => $completedOrders,
                'pending_orders' => $pendingOrders,
                'cancelled_orders' => $cancelledOrders,
            ],
            'menu_summary' => $menuSummary,
            'type' => $type,
            'date' => $date,
            'month' => $month,
            'period_label' => $periodLabel,
        ]);
    }

    public function exportPdf(Request $request)
    {
        [$query, , , , , $periodLabel] = $this->buildQuery($request);

        $orders = $query->latest()->get();
        $totalOrders = $orders->count();
        $totalRevenue = $orders->where('status', 'completed')->sum('total');

        $pdf = Pdf::loadView('exports.laporan-pdf', compact('orders', 'totalOrders', 'totalRevenue', 'periodLabel'));
        $pdf->setPaper('a4', 'landscape');

        return $pdf->download('laporan-ekantin-'.now()->format('Y-m-d').'.pdf');
    }

    public function exportExcel(Request $request)
    {
        [$query, , , , , $periodLabel] = $this->buildQuery($request);

        $orders = $query->latest()->get();

        $spreadsheet = new Spreadsheet();
        $sheet = $spreadsheet->getActiveSheet();

        $sheet->mergeCells('A1:H1');
        $sheet->setCellValue('A1', 'LAPORAN TRANSAKSI E-KANTIN');
        $sheet->getStyle('A1')->getFont()->setBold(true)->setSize(14);

        $sheet->mergeCells('A2:H2');
        $sheet->setCellValue('A2', $periodLabel);

        $headers = ['No', 'Nomor Antrean', 'Nama Pelanggan', 'Jenis Pesanan', 'Total', 'Pembayaran', 'Status', 'Tanggal'];
        foreach ($headers as $index => $header) {
            $cell = chr(65 + $index).'4';
            $sheet->setCellValue($cell, $header);
            $sheet->getStyle($cell)->getFont()->setBold(true);
        }

        $row = 5;
        $no = 1;
        foreach ($orders as $order) {
            $statusLabel = match ($order->status) {
                'pending' => 'Menunggu',
                'processing' => 'Diproses',
                'completed' => 'Selesai',
                'cancelled' => 'Dibatalkan',
                default => $order->status,
            };
            $typeLabel = $order->order_type === 'dine_in' ? 'Dine In' : 'Bungkus';
            $paymentLabel = $order->payment_method === 'qris' ? 'QRIS' : 'Tunai';

            $sheet->setCellValue('A'.$row, $no++);
            $sheet->setCellValue('B'.$row, 'A'.$order->queue_number);
            $sheet->setCellValue('C'.$row, $order->customer_name);
            $sheet->setCellValue('D'.$row, $typeLabel);
            $sheet->setCellValue('E'.$row, $order->total);
            $sheet->setCellValue('F'.$row, $paymentLabel);
            $sheet->setCellValue('G'.$row, $statusLabel);
            $sheet->setCellValue('H'.$row, $order->created_at->format('d/m/Y H:i'));
            $row++;
        }

        foreach (range('A', 'H') as $col) {
            $sheet->getColumnDimension($col)->setAutoSize(true);
        }

        $writer = new Xlsx($spreadsheet);

        ob_start();
        $writer->save('php://output');
        $excel = ob_get_clean();

        return response($excel)
            ->header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet')
            ->header('Content-Disposition', 'attachment;filename=laporan-ekantin-'.now()->format('Y-m-d').'.xlsx');
    }

    private function buildQuery(Request $request): array
    {
        $type = $request->get('type', 'harian');
        $date = $request->get('date', now()->format('Y-m-d'));
        $month = $request->get('month', now()->format('Y-m'));

        $query = Order::with(['orderItems.menuItem']);

        if ($type === 'harian') {
            $query->whereDate('created_at', $date);
            $periodLabel = 'Harian - '.\Carbon\Carbon::parse($date)->translatedFormat('d F Y');
        } else {
            $year = substr($month, 0, 4);
            $m = substr($month, 5, 2);
            $query->whereYear('created_at', $year)->whereMonth('created_at', $m);
            $periodLabel = 'Bulanan - '.\Carbon\Carbon::parse($month.'-01')->translatedFormat('F Y');
        }

        $statsQuery = Order::query();
        $this->applyPeriod($statsQuery, $type, $date, $month);

        return [$query, $statsQuery, $type, $date, $month, $periodLabel];
    }

    private function applyPeriod($query, string $type, string $date, string $month): void
    {
        if ($type === 'harian') {
            $query->whereDate('created_at', $date);
        } else {
            $query->whereYear('created_at', substr($month, 0, 4))
                ->whereMonth('created_at', substr($month, 5, 2));
        }
    }
}
