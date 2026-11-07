import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../lib/api';
import { rupiah, STATUS_COLOR, STATUS_LABEL, orderTypeLabel, paymentLabel } from '../../lib/format';
import { useToast } from '../../context/ToastContext.jsx';

export default function Receipt() {
  const { queueNumber } = useParams();
  const toast = useToast();
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    api
      .get(`/receipt/${queueNumber}`)
      .then((res) => setReceipt(res.data))
      .catch((err) => setError(apiErrorMessage(err, 'Struk tidak ditemukan.')));
  }, [queueNumber]);

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-3 anim-bounce">😕</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/" className="btn-primary">
          Kembali
        </Link>
      </div>
    );
  }

  if (!receipt) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Memuat struk...</p>
      </div>
    );
  }

  const handlePrint = () => window.print();

  const handleDownload = async () => {
    try {
      const html2canvas = (await import('html2canvas')).default;
      const el = document.getElementById('receipt-area');
      const canvas = await html2canvas(el);
      const link = document.createElement('a');
      link.download = `struk-A${receipt.queue_number}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      toast.success('Struk diunduh.');
    } catch {
      toast.error('Gagal mengunduh. Gunakan cetak (print).');
    }
  };

  return (
    <div className="min-h-screen pb-14 bg-gray-100">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white no-print">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-8 text-center">
          <Link to="/" className="float-left text-xs text-white/75 font-semibold">
            ← Kembali
          </Link>
          <div className="pt-6">
            <div className="text-3xl">🧾</div>
            <h1 className="text-xl font-black mt-1">Struk Pesanan</h1>
            <p className="text-[11px] text-primary-200">Simpan struk ini sebagai bukti</p>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-100 rounded-t-[24px]" />
      </header>

      <main className="px-4 -mt-2">
        {/* Struk thermal */}
        <div id="receipt-area" className="bg-white max-w-sm mx-auto rounded-2xl shadow-lg overflow-hidden anim-up">
          {/* header struk */}
          <div className="text-center px-5 pt-6 pb-4 border-b border-dashed border-gray-300 relative">
            <div className="text-3xl">🍽️</div>
            <h2 className="font-black text-lg tracking-wide mt-1">E-KANTIN</h2>
            <p className="text-[11px] text-gray-400">Struk Pesanan</p>
            <div className="mt-3 inline-block">
              <span className="text-[10px] text-gray-400 block">No. Antrean</span>
              <div className="text-4xl font-black text-primary-700 leading-none">
                A{receipt.queue_number}
              </div>
            </div>
            <span className={`badge mt-3 ${STATUS_COLOR[receipt.status]}`}>
              {STATUS_LABEL[receipt.status]}
            </span>
            {/* zigzag bawah */}
            <div
              className="absolute -bottom-2 left-0 right-0 h-3"
              style={{
                backgroundImage:
                  'linear-gradient(45deg, transparent 50%, white 50%), linear-gradient(-45deg, transparent 50%, white 50%)',
                backgroundSize: '12px 12px',
                backgroundPosition: 'top',
                backgroundRepeat: 'repeat-x',
              }}
            />
          </div>

          <div className="py-3 px-5 border-b border-dashed border-gray-300 text-xs space-y-1.5 text-gray-600">
            {[
              ['Nama', receipt.customer_name],
              ['Meja', receipt.table_number || '-'],
              ['Jenis', orderTypeLabel(receipt.order_type)],
              ['Pembayaran', paymentLabel(receipt.payment_method || 'cash')],
              ['Waktu', receipt.created_at],
            ].map(([k, v]) => (
              <div key={k} className="flex justify-between gap-3">
                <span>{k}</span>
                <span className="font-semibold text-gray-900 text-right">{v}</span>
              </div>
            ))}
          </div>

          <div className="py-3 px-5 space-y-2.5 border-b border-dashed border-gray-300">
            {receipt.items.map((item, idx) => (
              <div key={idx} className="text-xs">
                <div className="flex justify-between gap-3">
                  <span className="font-medium">
                    {item.quantity}x {item.name}
                  </span>
                  <span className="font-semibold">{rupiah(item.subtotal)}</span>
                </div>
                {(item.temperature || item.extra_rice > 0 || item.requested_price) && (
                  <div className="text-gray-400 pl-4 text-[10px]">
                    {item.temperature ? `${item.temperature} · ` : ''}
                    {item.extra_rice > 0 ? `+${item.extra_rice} nasi · ` : ''}
                    {item.requested_price ? `💬 Nawar ${rupiah(item.requested_price)}` : ''}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="px-5 py-4 bg-gray-50">
            <div className="flex justify-between font-black">
              <span>TOTAL</span>
              <span className="text-primary-700 text-lg">{rupiah(receipt.total)}</span>
            </div>
          </div>

          <div className="text-center py-4 px-5">
            <p className="text-xs font-semibold text-gray-600">Terima kasih sudah memesan 🙏</p>
            <p className="text-[10px] text-gray-400 mt-0.5">Sampai jumpa lagi di E-Kantin</p>
            <div
              className="mx-auto mt-3 h-8 w-40 opacity-60"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(90deg, #0f172a 0 2px, transparent 2px 5px, #0f172a 5px 8px, transparent 8px 11px, #0f172a 11px 13px, transparent 13px 17px)',
              }}
              aria-hidden="true"
            />
          </div>
        </div>

        {/* Aksi */}
        <div className="grid grid-cols-2 gap-3 max-w-sm mx-auto mt-5 no-print">
          <button className="btn-secondary" onClick={handlePrint}>
            🖨️ Cetak
          </button>
          <button className="btn-primary" onClick={handleDownload}>
            ⬇️ Unduh PNG
          </button>
          <Link to="/" className="btn-secondary col-span-2">
            🍽️ Pesan Lagi
          </Link>
        </div>
      </main>
    </div>
  );
}
