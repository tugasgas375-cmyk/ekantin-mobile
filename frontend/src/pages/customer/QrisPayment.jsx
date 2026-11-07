import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import QRCode from 'qrcode';
import api, { apiErrorMessage, API_URL } from '../../lib/api';
import { useToast } from '../../context/ToastContext.jsx';

export default function QrisPayment() {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const canvasRef = useRef(null);

  const [paid, setPaid] = useState(false);
  const [loading, setLoading] = useState(true);
  const [confirming, setConfirming] = useState(false);

  // QR menyimpan URL confirm (simulasi, sama seperti versi web)
  const confirmUrl = `${API_URL}/payment/${orderId}/qris-confirm`;

  useEffect(() => {
    if (canvasRef.current) {
      QRCode.toCanvas(canvasRef.current, confirmUrl, {
        width: 220,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' },
      }).catch(() => toast.error('Gagal membuat QR.'));
    }
  }, [confirmUrl]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let active = true;
    const poll = async () => {
      try {
        const res = await api.get(`/payment/${orderId}/status`);
        if (active && res.data.payment_status === 'paid') {
          setPaid(true);
          clearInterval(timer);
        }
      } catch {
        // biarkan mencoba lagi
      } finally {
        if (active) setLoading(false);
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId]);

  // Tombol simulasi bayar (karena QRIS di sini simulasi)
  const handlePay = async () => {
    setConfirming(true);
    try {
      await api.post(`/payment/${orderId}/qris-confirm`);
      setPaid(true);
      toast.success('Pembayaran berhasil! 🎉');
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setConfirming(false);
    }
  };

  useEffect(() => {
    if (paid) {
      const t = setTimeout(() => navigate(`/track/${orderId}`), 1800);
      return () => clearTimeout(t);
    }
  }, [paid, orderId, navigate]);

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-8">
          <Link to="/" className="text-xs text-white/75 font-semibold">
            ← Beranda
          </Link>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl">
              📱
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight">Pembayaran QRIS</h1>
              <p className="text-[11px] text-primary-200">Order #{orderId}</p>
            </div>
          </div>

          <div className="mt-4 flex items-center gap-2 bg-white/15 border border-white/20 rounded-2xl px-4 py-2.5 backdrop-blur">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                paid ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'
              }`}
            />
            <span className="text-xs font-semibold">
              {paid ? 'Lunas' : loading ? 'Memeriksa status...' : 'Menunggu pembayaran'}
            </span>
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[24px]" />
      </header>

      <main className="px-4 pt-4 flex flex-col items-center">
        {paid ? (
          <div className="text-center py-14 anim-up">
            <div className="w-24 h-24 bg-gradient-to-br from-emerald-400 to-green-600 rounded-full flex items-center justify-center text-5xl mx-auto mb-5 shadow-xl shadow-green-500/30 anim-bounce">
              ✅
            </div>
            <h2 className="text-2xl font-black text-emerald-700">Pembayaran Berhasil!</h2>
            <p className="text-sm text-gray-500 mt-1">Membuka pelacakan pesanan...</p>
            <div className="w-40 h-1.5 bg-gray-200 rounded-full mx-auto mt-6 overflow-hidden">
              <div className="h-full bg-primary-600 rounded-full animate-[shimmer_1.5s_ease-out_forwards]" style={{ width: '100%' }} />
            </div>
          </div>
        ) : (
          <>
            {/* Kartu QR */}
            <div className="card p-6 w-full max-w-sm text-center anim-up relative overflow-hidden">
              <div className="absolute -top-8 -right-8 w-28 h-28 rounded-full bg-primary-50" />
              <div className="relative">
                <p className="text-xs font-bold text-gray-700">Pindai QR dengan aplikasi pembayaranmu</p>
                <div className="mt-4 inline-block bg-white p-2 rounded-2xl border border-gray-100 shadow-sm">
                  <canvas ref={canvasRef} className="rounded-lg" />
                </div>
                <div className="mt-4 text-[11px] text-gray-400 uppercase tracking-wide font-semibold">
                  E-Kantin · Order #{orderId}
                </div>
                <div className="text-[10px] text-gray-300 mt-1 break-all">{confirmUrl}</div>
              </div>
            </div>

            {/* Panel simulasi */}
            <div className="card p-4 w-full max-w-sm mt-4 border-amber-200 bg-amber-50/60 anim-up">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-amber-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                  ⚠️
                </div>
                <div className="text-xs text-amber-900/80">
                  <p className="font-bold text-amber-900">Mode Simulasi</p>
                  QRIS di aplikasi ini tidak terhubung ke payment gateway sungguhan. Tekan tombol di
                  bawah untuk mensimulasikan pembayaran.
                </div>
              </div>
              <button className="btn-primary w-full mt-4" onClick={handlePay} disabled={confirming}>
                {confirming ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
                    Memproses...
                  </>
                ) : (
                  '💳 Bayar Sekarang (Simulasi)'
                )}
              </button>
            </div>

            <p className="text-xs text-gray-400 mt-4 text-center">
              {loading ? 'Memeriksa status pembayaran...' : 'Status diperiksa otomatis setiap 3 detik.'}
            </p>
          </>
        )}
      </main>
    </div>
  );
}
