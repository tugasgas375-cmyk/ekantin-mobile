import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { apiErrorMessage } from '../../lib/api';
import { CUSTOMER_URL } from '../../lib/links';

export default function StaffLogin() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const toast = useToast();

  const [role, setRole] = useState('kasir');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error('Email dan password wajib diisi.');
    setLoading(true);
    try {
      const user = await login(email, password, role);
      toast.success(`Selamat datang, ${user.name}!`);
      navigate(user.role === 'admin' ? '/admin' : '/kasir');
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Login gagal.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-primary-700 to-primary-900 flex flex-col justify-center px-5 py-10">
      <div className="text-center text-white mb-6">
        <div className="text-5xl">🍽️</div>
        <h1 className="text-2xl font-black mt-2">E-Kantin Staff</h1>
        <p className="text-primary-200 text-sm">Masuk untuk mengelola kantin</p>
      </div>

      <div className="bg-white rounded-3xl p-6 shadow-xl max-w-md w-full mx-auto">
        <div className="grid grid-cols-2 gap-2 p-1 bg-gray-100 rounded-xl mb-5">
          {[
            { v: 'kasir', l: '🧑‍🍳 Kasir', d: 'POS & pesanan' },
            { v: 'admin', l: '🛠️ Admin', d: 'Kelola menu' },
          ].map((r) => (
            <button
              key={r.v}
              onClick={() => setRole(r.v)}
              className={`rounded-lg py-2.5 text-sm font-semibold transition ${
                role === r.v ? 'bg-white shadow text-primary-700' : 'text-gray-500'
              }`}
            >
              {r.l}
              <span className="block text-[10px] font-normal">{r.d}</span>
            </button>
          ))}
        </div>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <span className="label">Email</span>
            <input
              type="email"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="nama@ekantin.com"
              autoComplete="email"
            />
          </div>
          <div>
            <span className="label">Password</span>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="input !pr-16"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                autoComplete="current-password"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold text-gray-500"
              >
                {showPassword ? 'Sembunyi' : 'Lihat'}
              </button>
            </div>
          </div>

          <button className="btn-primary w-full" disabled={loading}>
            {loading ? 'Memproses...' : 'Masuk'}
          </button>
        </form>

        <div className="mt-5 text-[11px] text-gray-400 bg-gray-50 rounded-xl p-3 space-y-1">
          <p className="font-semibold text-gray-500">Akun demo:</p>
          <p>Admin — admin@ekantin.com / admin123</p>
          <p>Kasir — kasir@ekantin.com / kasir123</p>
        </div>
      </div>

      <div className="text-center mt-6">
        <a href={CUSTOMER_URL} className="text-sm text-primary-200 underline">
          ← Kembali ke halaman pesan
        </a>
      </div>
    </div>
  );
}
