import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';
import { rupiah } from '../../lib/format';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { StatCard } from '../staff/StaffUI.jsx';
import { CUSTOMER_URL } from '../../lib/links';

export default function AdminDashboard() {
  const { logout } = useAuth();
  const toast = useToast();
  const [stats, setStats] = useState(null);
  const lastOrderId = useRef(null);
  const firstPoll = useRef(true);

  useEffect(() => {
    api
      .get('/admin/dashboard')
      .then((res) => setStats(res.data.stats))
      .catch(() => toast.error('Gagal memuat dashboard.'));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/admin/orders/poll');
        const d = res.data;
        if (!firstPoll.current && d.latest_order_id && d.latest_order_id !== lastOrderId.current) {
          toast.info(`Pesanan baru dari ${d.latest_order_name} (A${d.latest_queue})`);
        }
        firstPoll.current = false;
        lastOrderId.current = d.latest_order_id;
        setStats((prev) =>
          prev ? { ...prev, orders_today: d.pending + d.processing + d.completed, revenue_today: d.revenue_today } : prev
        );
      } catch {
        // abaikan
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const menu = [
    { to: '/admin/kategori', icon: '🗂️', label: 'Kategori', desc: 'Kelola kategori menu' },
    { to: '/admin/menu', icon: '🍛', label: 'Menu', desc: 'Tambah & ubah menu' },
    { to: '/admin/user', icon: '👥', label: 'User Staf', desc: 'Akun admin & kasir' },
    { to: '/admin/laporan', icon: '📊', label: 'Laporan', desc: 'Harian/bulanan + export' },
    { to: '/admin/menu-favorit', icon: '⭐', label: 'Menu Favorit', desc: 'Best seller & statistik' },
  ];

  return (
    <div className="min-h-screen pb-10">
      <header className="bg-primary-600 text-white px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold">Dashboard Admin</h1>
            <p className="text-xs text-primary-100">Ringkasan kantin hari ini</p>
          </div>
          <button onClick={logout} className="text-xs bg-primary-700 rounded-full px-3 py-1.5 font-medium">
            Keluar
          </button>
        </div>
      </header>

      <main className="px-4 py-4 space-y-5">
        <div className="grid grid-cols-2 gap-3">
          <StatCard icon="📦" label="Menu Tersedia" value={stats?.available_menus ?? '—'} />
          <StatCard icon="🧾" label="Pesanan Hari Ini" value={stats?.orders_today ?? '—'} color="bg-yellow-50 text-yellow-700" />
          <StatCard icon="💰" label="Pendapatan" value={stats ? rupiah(stats.revenue_today) : '—'} color="bg-green-50 text-green-700" />
          <StatCard icon="🗂️" label="Kategori" value={stats?.categories ?? '—'} color="bg-purple-50 text-purple-700" />
        </div>

        <section>
          <h2 className="text-sm font-semibold text-gray-500 mb-2">Kelola</h2>
          <div className="grid grid-cols-2 gap-3">
            {menu.map((m) => (
              <Link key={m.to} to={m.to} className="card p-4 active:scale-[0.98] transition">
                <div className="text-2xl">{m.icon}</div>
                <p className="font-semibold text-sm mt-2">{m.label}</p>
                <p className="text-xs text-gray-500">{m.desc}</p>
              </Link>
            ))}
            <a
              href={`${CUSTOMER_URL}/antrian`}
              target="_blank"
              rel="noreferrer"
              className="card p-4 active:scale-[0.98] transition"
            >
              <div className="text-2xl">🖥️</div>
              <p className="font-semibold text-sm mt-2">Layar Antrian</p>
              <p className="text-xs text-gray-500">Buka layar antrian</p>
            </a>
          </div>
        </section>

        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="card p-3">
            <p className="text-lg font-black text-yellow-600">⏳</p>
            <p className="text-xs text-gray-500">Menunggu</p>
          </div>
          <div className="card p-3">
            <p className="text-lg font-black text-blue-600">🔄</p>
            <p className="text-xs text-gray-500">Diproses</p>
          </div>
          <div className="card p-3">
            <p className="text-lg font-black text-green-600">✅</p>
            <p className="text-xs text-gray-500">Selesai</p>
          </div>
        </div>
      </main>
    </div>
  );
}
