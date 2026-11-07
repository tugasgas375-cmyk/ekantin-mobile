import { useState } from 'react';
import { Link } from 'react-router-dom';
import api, { apiErrorMessage } from '../../lib/api';
import { rupiah, STATUS_COLOR, STATUS_LABEL } from '../../lib/format';

export default function CheckStatus() {
  const [queue, setQueue] = useState('');
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  const handleCheck = async (e) => {
    e.preventDefault();
    if (!queue.trim()) return;
    setLoading(true);
    setError(null);
    setResult(null);
    try {
      const res = await api.get(`/queue-status/${queue.trim()}`);
      setResult(res.data);
    } catch (err) {
      setError(apiErrorMessage(err, 'Pesanan tidak ditemukan untuk hari ini.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="absolute top-20 -left-12 w-32 h-32 rounded-full bg-white/5" />
        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-8">
          <Link to="/" className="text-xs text-white/75 font-semibold">
            ← Kembali ke menu
          </Link>
          <div className="flex items-center gap-3 mt-3">
            <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl">
              🔎
            </div>
            <div>
              <h1 className="text-xl font-black leading-tight">Cek Status Pesanan</h1>
              <p className="text-[11px] text-primary-200">
                Masukkan nomor antrean (angka saja)
              </p>
            </div>
          </div>

          <form onSubmit={handleCheck} className="mt-5 flex gap-2">
            <div className="relative flex-1">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 font-black text-gray-400">
                A
              </span>
              <input
                type="number"
                className="w-full rounded-2xl bg-white text-gray-800 placeholder:text-gray-400 pl-9 pr-4 py-3.5 text-base font-bold shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
                value={queue}
                onChange={(e) => setQueue(e.target.value)}
                placeholder="contoh: 12"
                min={1}
              />
            </div>
            <button
              className="btn bg-white text-primary-700 font-bold shadow-lg px-6 active:scale-95 disabled:opacity-60"
              disabled={loading || !queue.trim()}
            >
              {loading ? (
                <span className="w-5 h-5 border-2 border-primary-600 border-t-transparent rounded-full animate-spin" />
              ) : (
                'Cek'
              )}
            </button>
          </form>
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[24px]" />
      </header>

      <main className="px-4 pt-4 max-w-md mx-auto">
        {error && (
          <div className="card p-4 border-red-200 bg-red-50 anim-up flex items-start gap-3">
            <span className="text-lg">😕</span>
            <p className="text-sm text-red-600 leading-snug">{error}</p>
          </div>
        )}

        {result && (
          <div className="card overflow-hidden anim-up">
            <div className="bg-gradient-to-r from-primary-50 to-primary-100/60 px-5 py-4 flex items-center justify-between">
              <div>
                <p className="text-[11px] text-primary-600 font-semibold uppercase tracking-wide">
                  Nomor Antrean
                </p>
                <p className="text-3xl font-black text-primary-800 leading-tight">
                  A{result.queue_number}
                </p>
                <p className="text-sm text-gray-600">{result.customer_name}</p>
              </div>
              <span className={`badge text-xs px-3 py-1.5 shadow-sm ${STATUS_COLOR[result.status]}`}>
                {STATUS_LABEL[result.status]}
              </span>
            </div>
            <div className="px-5 py-4">
              <div className="flex justify-between text-sm py-1.5">
                <span className="text-gray-500">Total</span>
                <span className="font-black text-primary-700">{rupiah(result.total)}</span>
              </div>
              <div className="flex justify-between text-sm py-1.5 border-t border-gray-100">
                <span className="text-gray-500">Meja</span>
                <span className="font-semibold">{result.table_number || '-'}</span>
              </div>
              <Link to={`/struk/${result.queue_number}`} className="btn-primary w-full mt-4">
                🧾 Lihat Struk
              </Link>
              <Link to="/" className="btn-secondary w-full mt-2">
                Pesan Lagi
              </Link>
            </div>
          </div>
        )}

        {!result && !error && (
          <div className="text-center py-14 anim-up">
            <div className="text-5xl mb-3">🎫</div>
            <p className="text-sm text-gray-500">
              Cek nomor antrean untuk tahu pesananmu sudah sampai mana.
            </p>
            <div className="mt-5 flex flex-wrap justify-center gap-2 text-[11px] text-gray-400">
              <span className="bg-white border border-gray-200 rounded-full px-3 py-1.5">
                Contoh: <b>12</b> = A12
              </span>
              <span className="bg-white border border-gray-200 rounded-full px-3 py-1.5">
                Berlaku hari ini saja
              </span>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
