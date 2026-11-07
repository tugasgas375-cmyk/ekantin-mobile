import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../lib/api';
import { useAuth } from '../../context/AuthContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, Pagination, StaffHeader } from '../staff/StaffUI.jsx';

const EMPTY = { name: '', email: '', password: '', password_confirmation: '', role: 'kasir' };

export default function AdminUsers() {
  const { user: me } = useAuth();
  const toast = useToast();
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);

  const load = async (p = page) => {
    try {
      const res = await api.get('/admin/users', { params: { page: p } });
      setData(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    load(page);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const save = async () => {
    if (!modal.name?.trim() || !modal.email?.trim()) return toast.error('Nama dan email wajib diisi.');
    if (!modal.id && !modal.password) return toast.error('Password wajib diisi.');
    if (modal.password && modal.password !== modal.password_confirmation) return toast.error('Konfirmasi password tidak sama.');

    setSaving(true);
    try {
      const payload = {
        name: modal.name,
        email: modal.email,
        role: modal.role,
      };
      if (modal.password) {
        payload.password = modal.password;
        payload.password_confirmation = modal.password_confirmation;
      }

      if (modal.id) {
        await api.put(`/admin/users/${modal.id}`, payload);
        toast.success('Akun diperbarui.');
      } else {
        await api.post('/admin/users', payload);
        toast.success('Akun ditambahkan.');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (u) => {
    if (!confirm(`Hapus akun "${u.name}"?`)) return;
    try {
      await api.delete(`/admin/users/${u.id}`);
      toast.success('Akun dihapus.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <StaffHeader title="User Staf" subtitle={`${data.total} akun`} />

      <main className="px-4 py-4">
        <button
          className="btn-primary w-full mb-4"
          onClick={() => setModal({ ...EMPTY })}
        >
          + Tambah Akun
        </button>

        {data.data.length === 0 ? (
          <EmptyState message="Belum ada akun." />
        ) : (
          <div className="space-y-3">
            {data.data.map((u) => (
              <div key={u.id} className="card p-4 flex items-center gap-3">
                <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${u.role === 'admin' ? 'bg-primary-600' : 'bg-orange-500'}`}>
                  {u.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm truncate">{u.name}</p>
                  <p className="text-xs text-gray-500 truncate">{u.email}</p>
                  <span className={`badge mt-1 ${u.role === 'admin' ? 'bg-primary-100 text-primary-700' : 'bg-orange-100 text-orange-700'}`}>
                    {u.role}
                  </span>
                </div>
                <div className="flex flex-col gap-2">
                  <button
                    className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5"
                    onClick={() => setModal({ ...u, password: '', password_confirmation: '' })}
                  >
                    Ubah
                  </button>
                  {u.id !== me?.id && (
                    <button
                      className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5"
                      onClick={() => remove(u)}
                    >
                      Hapus
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination meta={data} onPage={setPage} />
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-4">{modal.id ? 'Ubah Akun' : 'Tambah Akun'}</h2>

            <div className="space-y-4">
              <div>
                <span className="label">Nama *</span>
                <input className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <span className="label">Email *</span>
                <input type="email" className="input" value={modal.email} onChange={(e) => setModal({ ...modal, email: e.target.value })} />
              </div>
              <div>
                <span className="label">Role *</span>
                <div className="flex gap-2">
                  {['admin', 'kasir'].map((r) => (
                    <button
                      key={r}
                      onClick={() => setModal({ ...modal, role: r })}
                      className={`chip border flex-1 ${modal.role === r ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <span className="label">{modal.id ? 'Password baru (kosongkan jika tidak diubah)' : 'Password *'}</span>
                <input type="password" className="input" value={modal.password} onChange={(e) => setModal({ ...modal, password: e.target.value })} />
              </div>
              <div>
                <span className="label">Konfirmasi Password</span>
                <input
                  type="password"
                  className="input"
                  value={modal.password_confirmation}
                  onChange={(e) => setModal({ ...modal, password_confirmation: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-5">
              <button className="btn-secondary" onClick={() => setModal(null)}>Batal</button>
              <button className="btn-primary" onClick={save} disabled={saving}>
                {saving ? 'Menyimpan...' : 'Simpan'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
