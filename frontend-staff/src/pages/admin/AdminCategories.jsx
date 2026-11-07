import { useEffect, useState } from 'react';
import api, { apiErrorMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, Pagination, StaffHeader } from '../staff/StaffUI.jsx';

export default function AdminCategories() {
  const toast = useToast();
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null); // {id?, name, description}
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(null);

  const load = async (p = page, q = search) => {
    try {
      const res = await api.get('/admin/categories', { params: { page: p, search: q || undefined } });
      setData(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    load(page, search);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    load(1, search);
  };

  const save = async () => {
    if (!modal.name?.trim()) return toast.error('Nama kategori wajib diisi.');
    setSaving(true);
    try {
      if (modal.id) {
        await api.put(`/admin/categories/${modal.id}`, { name: modal.name, description: modal.description || null });
        toast.success('Kategori diperbarui.');
      } else {
        await api.post('/admin/categories', { name: modal.name, description: modal.description || null });
        toast.success('Kategori ditambahkan.');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const remove = async (cat) => {
    if (!confirm(`Hapus kategori "${cat.name}"? Menu di dalamnya ikut terhapus.`)) return;
    setDeleting(cat.id);
    try {
      await api.delete(`/admin/categories/${cat.id}`);
      toast.success('Kategori dihapus.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setDeleting(null);
    }
  };

  return (
    <div className="min-h-screen pb-10">
      <StaffHeader title="Kategori" subtitle={`${data.total} kategori`} />

      <main className="px-4 py-4">
        <form onSubmit={handleSearch} className="flex gap-2 mb-4">
          <input className="input" placeholder="Cari kategori..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-secondary">Cari</button>
        </form>

        <button className="btn-primary w-full mb-4" onClick={() => setModal({ name: '', description: '' })}>
          + Tambah Kategori
        </button>

        {data.data.length === 0 ? (
          <EmptyState message="Belum ada kategori." />
        ) : (
          <div className="space-y-3">
            {data.data.map((cat) => (
              <div key={cat.id} className="card p-4 flex items-center gap-3">
                <div className="flex-1">
                  <p className="font-semibold text-sm">{cat.name}</p>
                  <p className="text-xs text-gray-500">
                    {cat.description || 'Tanpa deskripsi'} · {cat.menu_items_count} menu
                  </p>
                </div>
                <button
                  className="text-xs font-semibold text-primary-600 border border-primary-200 rounded-lg px-3 py-1.5"
                  onClick={() => setModal({ ...cat })}
                >
                  Ubah
                </button>
                <button
                  className="text-xs font-semibold text-red-600 border border-red-200 rounded-lg px-3 py-1.5 disabled:opacity-50"
                  onClick={() => remove(cat)}
                  disabled={deleting === cat.id}
                >
                  {deleting === cat.id ? '...' : 'Hapus'}
                </button>
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
            <h2 className="font-bold text-lg mb-4">{modal.id ? 'Ubah Kategori' : 'Tambah Kategori'}</h2>
            <div className="space-y-4">
              <div>
                <span className="label">Nama *</span>
                <input className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <span className="label">Deskripsi</span>
                <textarea
                  className="input"
                  rows={3}
                  value={modal.description || ''}
                  onChange={(e) => setModal({ ...modal, description: e.target.value })}
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
