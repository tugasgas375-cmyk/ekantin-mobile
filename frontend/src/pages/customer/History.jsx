import { Link } from 'react-router-dom';
import { rupiah, STATUS_COLOR, STATUS_LABEL, formatDate, todayKey } from '../../lib/format';
import { useCart } from '../../context/CartContext.jsx';

export default function History() {
  const { history, clearTodayHistory } = useCart();

  const today = todayKey();
  const todayOrders = history.filter((h) => (h.savedAt || '').slice(0, 10) === today);
  const olderOrders = history.filter((h) => (h.savedAt || '').slice(0, 10) !== today);
  const totalSpent = history.reduce((sum, o) => sum + (Number(o.total) || 0), 0);

  const renderOrder = (order, i) => (
    <div
      key={`${order.id}-${order.queue_number}`}
      className="card p-4 anim-up"
      style={{ animationDelay: `${i * 40}ms` }}
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-primary-50 to-primary-100 flex items-center justify-center text-primary-700 font-black text-sm shrink-0">
            A{order.queue_number}
          </div>
          <div>
            <p className="text-sm font-bold leading-tight">{order.items?.length || 0} item</p>
            <p className="text-[11px] text-gray-400">
              {formatDate(order.savedAt || order.created_at, true)}
            </p>
          </div>
        </div>
        <span className={`badge ${STATUS_COLOR[order.status] || 'bg-gray-100'}`}>
          {STATUS_LABEL[order.status] || order.status}
        </span>
      </div>

      {order.items?.length > 0 && (
        <div className="mt-3 bg-gray-50 rounded-xl px-3 py-2.5 text-xs text-gray-600 space-y-0.5">
          {order.items.slice(0, 3).map((it, idx) => (
            <p key={idx} className="flex justify-between gap-2">
              <span className="truncate">
                {it.quantity}x {it.name}
                {it.temperature ? ` (${it.temperature})` : ''}
                {it.extraRice ? ` +${it.extraRice} nasi` : ''}
                {it.requestedPrice ? ' 💬' : ''}
              </span>
              <span className="text-gray-400 shrink-0">
                {rupiah((it.requestedPrice || it.price) * it.quantity + (it.extraRice || 0) * 2000)}
              </span>
            </p>
          ))}
          {order.items.length > 3 && (
            <p className="text-gray-400">+{order.items.length - 3} lainnya...</p>
          )}
        </div>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="font-black text-primary-700">{rupiah(order.total)}</span>
        <div className="flex gap-2">
          <Link
            to={`/struk/${order.queue_number}`}
            className="text-xs font-semibold text-primary-600 bg-primary-50 rounded-lg px-3 py-1.5 active:scale-95 transition"
          >
            🧾 Struk
          </Link>
          {order.status === 'pending' && (
            <Link
              to={`/track/${order.id}`}
              className="text-xs font-semibold text-white bg-primary-600 rounded-lg px-3 py-1.5 active:scale-95 transition shadow-sm"
            >
              Lacak →
            </Link>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen pb-12">
      {/* Hero */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        <div className="absolute -top-14 -right-10 w-44 h-44 rounded-full bg-white/10" />
        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-8">
          <Link to="/" className="text-xs text-white/75 font-semibold">
            ← Kembali ke menu
          </Link>
          <div className="flex items-end justify-between mt-3">
            <div>
              <h1 className="text-xl font-black leading-tight">Riwayat Pesanan</h1>
              <p className="text-[11px] text-primary-200 mt-0.5">Tersimpan di perangkat ini</p>
            </div>
            {history.length > 0 && (
              <button
                className="text-[11px] bg-white/15 border border-white/20 rounded-full px-3 py-1.5 font-semibold active:scale-95"
                onClick={() => confirm('Hapus semua riwayat?') && clearTodayHistory()}
              >
                🗑 Hapus
              </button>
            )}
          </div>

          {history.length > 0 && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur">
                <p className="text-[10px] text-primary-200 uppercase tracking-wide">Total pesanan</p>
                <p className="text-2xl font-black leading-tight">{history.length}</p>
              </div>
              <div className="bg-white/15 border border-white/20 rounded-2xl px-4 py-3 backdrop-blur">
                <p className="text-[10px] text-primary-200 uppercase tracking-wide">Total belanja</p>
                <p className="text-2xl font-black leading-tight">{rupiah(totalSpent)}</p>
              </div>
            </div>
          )}
        </div>
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[24px]" />
      </header>

      <main className="px-4 pt-4 space-y-5">
        {history.length === 0 ? (
          <div className="text-center py-20 anim-up">
            <div className="text-6xl mb-4 anim-bounce">🧾</div>
            <p className="font-semibold text-gray-700">Belum ada riwayat pesanan</p>
            <p className="text-sm text-gray-400 mt-1">Pesanan yang kamu buat akan muncul di sini.</p>
            <Link to="/" className="btn-primary inline-flex mt-5">
              🍽️ Pesan Sekarang
            </Link>
          </div>
        ) : (
          <>
            {todayOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary-500" />
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
                    Hari Ini
                  </h2>
                  <span className="text-[11px] text-gray-400">({todayOrders.length})</span>
                </div>
                <div className="space-y-3">{todayOrders.map(renderOrder)}</div>
              </section>
            )}
            {olderOrders.length > 0 && (
              <section>
                <div className="flex items-center gap-2 mb-2.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-gray-300" />
                  <h2 className="text-xs font-extrabold text-gray-500 uppercase tracking-wide">
                    Sebelumnya
                  </h2>
                  <span className="text-[11px] text-gray-400">({olderOrders.length})</span>
                </div>
                <div className="space-y-3">{olderOrders.map(renderOrder)}</div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
}
