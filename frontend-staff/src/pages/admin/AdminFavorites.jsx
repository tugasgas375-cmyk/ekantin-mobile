import { useEffect, useState } from 'react';
import api, { apiErrorMessage, imageUrl } from '../../lib/api';
import { rupiah } from '../../lib/format';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, Pagination, StaffHeader } from '../staff/StaffUI.jsx';

const PERIODS = [
  { v: 'all', l: 'Semua' },
  { v: 'today', l: 'Hari Ini' },
  { v: 'week', l: 'Minggu Ini' },
  { v: 'month', l: 'Bulan Ini' },
];

export default function AdminFavorites() {
  const toast = useToast();
  const [period, setPeriod] = useState('all');
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [resetting, setResetting] = useState(false);

  const load = async (p = page, per = period) => {
    try {
      const res = await api.get('/admin/menu-favorit', { params: { period: per, page: p } });
      setData(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    load(1, period);
  }, [period]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleBestSeller = async (menu) => {
    try {
      await api.post(`/admin/menu-items/${menu.id}/best-seller`);
      load(page, period);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const resetToday = async () => {
    if (!confirm('Hapus semua riwayat pesanan hari ini?')) return;
    setResetting(true);
    try {
      const res = await api.post('/admin/menu-favorit/reset-today');
      toast.success(res.data.message);
      load(1, period);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setResetting(false);
    }
  };

  const stats = data?.stats;

  return (
    <div className="min-h-screen pb-10">
      <StaffHeader title="Menu Favorit" subtitle="Statistik & best seller" />

      <main className="px-4 py-4 space-y-4">
        <div className="flex gap-2 overflow-x-auto pb-1">
          {PERIODS.map((p) => (
            <button
              key={p.v}
              onClick={() => { setPeriod(p.v); setPage(1); }}
              className={`chip border ${period === p.v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
            >
              {p.l}
            </button>
          ))}
        </div>

        {stats && (
          <div className="grid grid-cols-3 gap-3">
            <div className="card p-3 text-center">
              <p className="text-lg font-black">{stats.total_menu}</p>
              <p className="text-[11px] text-gray-500">Total Menu</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-black text-primary-700">{stats.total_ordered}</p>
              <p className="text-[11px] text-gray-500">Terjual</p>
            </div>
            <div className="card p-3 text-center">
              <p className="text-lg font-black text-green-600 text-[13px]">{rupiah(stats.total_revenue)}</p>
              <p className="text-[11px] text-gray-500">Pendapatan</p>
            </div>
          </div>
        )}

        {!data || data.menus.data.length === 0 ? (
          <EmptyState icon="⭐" message="Belum ada data penjualan." />
        ) : (
          <div className="space-y-3">
            {data.menus.data.map((menu, idx) => (
              <div key={menu.id} className="card p-4 flex items-center gap-3">
                <div className="w-6 text-center font-black text-gray-400">{idx + 1}</div>
                <div className="w-12 h-12 rounded-xl bg-primary-50 flex items-center justify-center text-xl overflow-hidden shrink-0">
                  {menu.image ? <img src={imageUrl(menu.image)} alt="" className="w-full h-full object-cover" /> : '🍽️'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">
                    {menu.name} {menu.is_best_seller && '⭐'}
                  </p>
                  <p className="text-xs text-gray-500">
                    {menu.total_orders} terjual · {rupiah(menu.total_revenue)}
                  </p>
                </div>
                <button
                  className={`text-xs font-semibold rounded-lg px-3 py-1.5 border ${
                    menu.is_best_seller
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'text-gray-600 border-gray-300'
                  }`}
                  onClick={() => toggleBestSeller(menu)}
                >
                  {menu.is_best_seller ? 'Best Seller' : 'Tandai'}
                </button>
              </div>
            ))}
          </div>
        )}

        <Pagination meta={data?.menus} onPage={(p) => { setPage(p); load(p, period); }} />

        <div className="card p-4 border-red-100 bg-red-50/50">
          <p className="text-sm font-semibold text-red-700">⚠️ Zona Berbahaya</p>
          <p className="text-xs text-red-500 mt-1">
            Reset riwayat pesanan hari ini akan menghapus seluruh transaksi hari ini (tidak bisa dibatalkan).
          </p>
          <button className="btn-danger w-full mt-3" onClick={resetToday} disabled={resetting}>
            {resetting ? 'Mereset...' : 'Reset Riwayat Hari Ini'}
          </button>
        </div>
      </main>
    </div>
  );
}
