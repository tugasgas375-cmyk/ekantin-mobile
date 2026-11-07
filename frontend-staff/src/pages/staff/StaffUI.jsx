import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';

export function StaffHeader({ title, subtitle, backTo = '/admin', backLabel = '← Beranda' }) {
  const { user, logout } = useAuth();

  return (
    <header className="bg-primary-600 text-white px-4 py-4 sticky top-0 z-30">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link to={backTo} className="text-sm opacity-80">
            {backLabel}
          </Link>
          <div>
            <h1 className="text-lg font-bold leading-tight">{title}</h1>
            {subtitle && <p className="text-xs text-primary-100">{subtitle}</p>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs bg-primary-700 rounded-full px-3 py-1.5">{user?.name}</span>
          <button onClick={logout} className="text-xs bg-white/15 rounded-full px-3 py-1.5 font-medium">
            Keluar
          </button>
        </div>
      </div>
    </header>
  );
}

export function StatCard({ icon, label, value, color = 'bg-primary-50 text-primary-700' }) {
  return (
    <div className="card p-4">
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center text-lg ${color}`}>{icon}</div>
      <p className="text-xl font-black mt-2">{value}</p>
      <p className="text-xs text-gray-500">{label}</p>
    </div>
  );
}

export function EmptyState({ icon = '📭', message, action }) {
  return (
    <div className="text-center py-14 text-gray-500">
      <div className="text-4xl mb-2">{icon}</div>
      <p className="text-sm">{message}</p>
      {action}
    </div>
  );
}

export function Pagination({ meta, onPage }) {
  if (!meta || meta.last_page <= 1) return null;
  return (
    <div className="flex items-center justify-between mt-4 text-sm">
      <button
        className="btn-secondary !py-2"
        disabled={meta.current_page <= 1}
        onClick={() => onPage(meta.current_page - 1)}
      >
        ← Prev
      </button>
      <span className="text-gray-500 text-xs">
        Hal {meta.current_page} / {meta.last_page} · {meta.total} data
      </span>
      <button
        className="btn-secondary !py-2"
        disabled={meta.current_page >= meta.last_page}
        onClick={() => onPage(meta.current_page + 1)}
      >
        Next →
      </button>
    </div>
  );
}
