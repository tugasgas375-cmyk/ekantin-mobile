import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../lib/api';
import { rupiah, STATUS_COLOR, STATUS_LABEL, orderTypeLabel, paymentLabel } from '../../lib/format';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, Pagination, StaffHeader } from '../staff/StaffUI.jsx';

function todayStr() {
  return new Date().toISOString().slice(0, 10);
}
function monthStr() {
  return new Date().toISOString().slice(0, 7);
}

export default function AdminReports() {
  const toast = useToast();
  const [type, setType] = useState('harian');
  const [date, setDate] = useState(todayStr());
  const [month, setMonth] = useState(monthStr());
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [exporting, setExporting] = useState(null);

  const params = () => ({ type, date, month, page });

  const load = async (p = page) => {
    try {
      const res = await api.get('/admin/laporan', { params: { ...params(), page: p } });
      setData(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    load(page);
  }, [type, date, month]); // eslint-disable-line react-hooks/exhaustive-deps

  const exportFile = async (kind) => {
    setExporting(kind);
    try {
      const res = await api.get(`/admin/laporan/export/${kind}`, {
        params: { type, date, month },
        responseType: 'blob',
      });
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = kind === 'pdf' ? `laporan-ekantin-${todayStr()}.pdf` : `laporan-ekantin-${todayStr()}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Export ${kind.toUpperCase()} berhasil.`);
    } catch {
      toast.error(`Export ${kind.toUpperCase()} gagal.`);
    } finally {
      setExporting(null);
    }
  };

  const stats = data?.stats;

  return (
    <div className="min-h-screen pb-10">
      <StaffHeader title="Laporan Transaksi" subtitle={data?.period_label} />

      <main className="px-4 py-4 space-y-4">
        {/* Filter */}
        <div className="card p-4 space-y-3">
          <div className="flex gap-2 p-1 bg-gray-100 rounded-xl">
            {[
              { v: 'harian', l: '📅 Harian' },
              { v: 'bulanan', l: '🗓️ Bulanan' },
            ].map((t) => (
              <button
                key={t.v}
                onClick={() => {
                  setType(t.v);
                  setPage(1);
                }}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${type === t.v ? 'bg-white shadow text-primary-700' : 'text-gray-500'}`}
              >
                {t.l}
              </button>
            ))}
          </div>

          {type === 'harian' ? (
            <input type="date" className="input" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} />
          ) : (
            <input type="month" className="input" value={month} onChange={(e) => { setMonth(e.target.value); setPage(1); }} />
          )}

          <div className="grid grid-cols-2 gap-2">
            <button className="btn-secondary !py-2.5 text-xs" onClick={() => exportFile('pdf')} disabled={!!exporting}>
              {exporting === 'pdf' ? 'Membuat...' : '⬇️ Export PDF'}
            </button>
            <button className="btn-secondary !py-2.5 text-xs" onClick={() => exportFile('excel')} disabled={!!exporting}>
              {exporting === 'excel' ? 'Membuat...' : '⬇️ Export Excel'}
            </button>
          </div>
        </div>

        {/* Stats */}
        {stats && (
          <div className="grid grid-cols-2 gap-3">
            <div className="card p-4">
              <p className="text-xl font-black">{stats.total_orders}</p>
              <p className="text-xs text-gray-500">Total Pesanan</p>
            </div>
            <div className="card p-4">
              <p className="text-xl font-black text-green-600">{rupiah(stats.total_revenue)}</p>
              <p className="text-xs text-gray-500">Pendapatan (selesai)</p>
            </div>
            <div className="card p-4">
              <p className="text-lg font-black text-green-600">{stats.completed_orders}</p>
              <p className="text-xs text-gray-500">Selesai</p>
            </div>
            <div className="card p-4">
              <p className="text-lg font-black text-yellow-600">
                {stats.pending_orders} / <span className="text-red-600">{stats.cancelled_orders}</span>
              </p>
              <p className="text-xs text-gray-500">Menunggu / Batal</p>
            </div>
          </div>
        )}

        {/* Menu summary */}
        {data?.menu_summary?.length > 0 && (
          <div className="card p-4">
            <h2 className="text-sm font-semibold text-gray-500 mb-2">Penjualan per Menu (selesai)</h2>
            <div className="space-y-2">
              {data.menu_summary.map((m) => (
                <div key={m.id} className="flex justify-between text-sm">
                  <span className="text-gray-700">
                    {m.name} <span className="text-gray-400">×{m.total_qty}</span>
                  </span>
                  <span className="font-semibold">{rupiah(m.total_revenue)}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Orders */}
        <div className="card p-4">
          <h2 className="text-sm font-semibold text-gray-500 mb-3">Daftar Pesanan</h2>
          {!data || data.orders.data.length === 0 ? (
            <EmptyState icon="🧾" message="Tidak ada transaksi pada periode ini." />
          ) : (
            <div className="space-y-3">
              {data.orders.data.map((o) => (
                <div key={o.id} className="border-b border-gray-100 pb-3 last:border-0">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-semibold">A{o.queue_number} · {o.customer_name}</p>
                      <p className="text-xs text-gray-500">
                        {orderTypeLabel(o.order_type)} · {paymentLabel(o.payment_method)}
                      </p>
                    </div>
                    <span className={`badge ${STATUS_COLOR[o.status]}`}>{STATUS_LABEL[o.status]}</span>
                  </div>
                  <div className="flex justify-between mt-1 text-sm">
                    <span className="text-gray-500 text-xs">{o.items?.length || o.order_items?.length} item</span>
                    <span className="font-bold text-primary-700">{rupiah(o.total)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
          <Pagination meta={data?.orders} onPage={(p) => { setPage(p); load(p); }} />
        </div>
      </main>
    </div>
  );
}
