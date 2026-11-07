import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import api, { apiErrorMessage } from '../../lib/api';
import { rupiah, STATUS_LABEL } from '../../lib/format';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // abaikan jika audio tidak tersedia
  }
}

const STEPS = [
  { key: 'pending', label: 'Menunggu', icon: '🕒', desc: 'Pesanan masuk ke kasir' },
  { key: 'processing', label: 'Diproses', icon: '🍳', desc: 'Sedang disiapkan' },
  { key: 'completed', label: 'Selesai', icon: '✅', desc: 'Siap diambil' },
];

export default function TrackOrder() {
  const { orderId } = useParams();
  const toast = useToast();
  const { updateHistory } = useCart();

  const [order, setOrder] = useState(null);
  const [error, setError] = useState(null);
  const [cancelling, setCancelling] = useState(false);
  const prevStatus = useRef(null);

  useEffect(() => {
    let active = true;
    let timer;

    const poll = async () => {
      try {
        const res = await api.get(`/orders/${orderId}/status`);
        if (!active) return;
        const next = res.data;
        setOrder(next);

        if (prevStatus.current && prevStatus.current !== next.status) {
          beep();
          if (next.status === 'completed') toast.success('Pesananmu selesai! 🎉');
          if (next.status === 'processing') toast.info('Pesanan sedang diproses 🍳');
          if (next.status === 'cancelled') toast.error('Pesanan dibatalkan.');
          updateHistory(Number(orderId), { status: next.status });
        }
        prevStatus.current = next.status;
        if (['completed', 'cancelled'].includes(next.status)) {
          clearInterval(timer);
        }
      } catch (err) {
        if (active && err.response?.status === 404) {
          setError('Pesanan tidak ditemukan.');
          clearInterval(timer);
        }
      }
    };

    poll();
    timer = setInterval(poll, 5000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, [orderId]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleCancel = async () => {
    if (!confirm('Batalkan pesanan ini?')) return;
    setCancelling(true);
    try {
      await api.post(`/orders/${orderId}/cancel`);
      toast.success('Pesanan dibatalkan.');
      const res = await api.get(`/orders/${orderId}/status`);
      setOrder(res.data);
      updateHistory(Number(orderId), { status: res.data.status });
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setCancelling(false);
    }
  };

  if (error) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
        <div className="text-5xl mb-3 anim-bounce">😕</div>
        <p className="text-gray-600 mb-4">{error}</p>
        <Link to="/" className="btn-primary">
          Kembali ke Menu
        </Link>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-gray-400">Memuat pesanan...</p>
      </div>
    );
  }

  const cancelled = order.status === 'cancelled';
  const stepIndex = STEPS.findIndex((s) => s.key === order.status);
  const current = STEPS[Math.max(0, stepIndex)];

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute bottom-0 -left-12 w-36 h-36 rounded-full bg-white/5" />

        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-8">
          <Link to="/" className="text-xs text-white/75 font-semibold">
            ← Kembali ke menu
          </Link>

          <div className="flex items-end justify-between mt-3">
            <div>
              <p className="text-[11px] text-primary-200">Nomor antrean kamu</p>
              <div className="text-5xl font-black tracking-tight leading-none mt-1">
                A{order.queue_number}
              </div>
              <p className="text-sm text-primary-100 mt-2 font-medium">{order.customer_name}</p>
            </div>
            <span
              className={`badge text-xs px-3 py-1.5 shadow-md ${
                cancelled
                  ? 'bg-red-500 text-white'
                  : order.status === 'completed'
                    ? 'bg-emerald-500 text-white'
                    : order.status === 'processing'
                      ? 'bg-amber-400 text-amber-950'
                      : 'bg-white text-primary-700'
              }`}
            >
              {STATUS_LABEL[order.status]}
            </span>
          </div>

          {/* status pill besar */}
          <div className="mt-5 bg-white/15 border border-white/20 rounded-2xl px-4 py-3 flex items-center gap-3 backdrop-blur">
            <span className="text-2xl">{cancelled ? '❌' : current.icon}</span>
            <div className="min-w-0">
              <p className="text-sm font-bold leading-tight">
                {cancelled ? 'Pesanan dibatalkan' : current.label}
              </p>
              <p className="text-[11px] text-primary-200">
                {cancelled ? 'Hubungi kasir jika ada pertanyaan' : current.desc}
              </p>
            </div>
            {!cancelled && order.status !== 'completed' && (
              <span className="ml-auto w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse shrink-0" />
            )}
          </div>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[24px]" />
      </header>

      <main className="px-4 pt-4 space-y-4">
        {/* Progress steps */}
        {!cancelled && (
          <section className="card p-5 anim-up">
            <div className="flex items-center justify-between mb-1">
              <h2 className="text-sm font-extrabold">Status Pesanan</h2>
              <span className="text-[11px] text-gray-400">auto-update 5 dtk</span>
            </div>
            <div className="mt-3 space-y-0">
              {STEPS.map((step, idx) => {
                const done = idx <= stepIndex;
                const isNow = idx === stepIndex;
                return (
                  <div key={step.key} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center text-base transition-all duration-300 ${
                          done
                            ? 'bg-gradient-to-br from-primary-500 to-primary-700 text-white shadow-md shadow-primary-600/30'
                            : 'bg-gray-100 text-gray-300 border border-gray-200'
                        } ${isNow ? 'ring-4 ring-primary-100' : ''}`}
                      >
                        {step.icon}
                      </div>
                      {idx < STEPS.length - 1 && (
                        <div
                          className={`w-1 h-8 rounded-full transition-colors duration-300 ${
                            idx < stepIndex ? 'bg-primary-500' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                    <div className={`pt-2 pb-4 ${done ? '' : 'opacity-40'}`}>
                      <p className="text-sm font-bold leading-tight">{step.label}</p>
                      <p className="text-[11px] text-gray-400">{step.desc}</p>
                      {isNow && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-primary-600 bg-primary-50 rounded-full px-2 py-0.5">
                          ● Sekarang
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {cancelled && (
          <div className="card p-6 text-center anim-up">
            <div className="text-4xl mb-2">❌</div>
            <p className="font-semibold text-red-600">Pesanan dibatalkan</p>
            <p className="text-sm text-gray-500 mt-1">Hubungi kasir jika ada pertanyaan.</p>
          </div>
        )}

        {/* Ringkasan */}
        <section className="card p-4 anim-up">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-400">Total bayar</p>
              <p className="font-black text-lg text-primary-700">{rupiah(order.total)}</p>
            </div>
            <Link
              to={`/struk/${order.queue_number}`}
              className="btn-secondary !py-2.5 text-xs"
            >
              🧾 Lihat Struk
            </Link>
          </div>
        </section>

        {order.status === 'pending' && !cancelled && (
          <button className="btn-danger w-full" onClick={handleCancel} disabled={cancelling}>
            {cancelling ? 'Membatalkan...' : '✕ Batalkan Pesanan'}
          </button>
        )}

        <p className="text-center text-xs text-gray-400 pt-1">
          {cancelled
            ? 'Pesanan sudah dibatalkan.'
            : order.status === 'completed'
              ? 'Pesanan siap diambil, tunjukkan nomor ini ke kasir. 🎉'
              : 'Status diperbarui otomatis setiap 5 detik.'}
        </p>
      </main>
    </div>
  );
}
