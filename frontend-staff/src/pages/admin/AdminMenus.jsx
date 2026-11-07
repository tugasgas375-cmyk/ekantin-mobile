import { useEffect, useState } from 'react';
import api, { apiErrorMessage, imageUrl } from '../../lib/api';
import { rupiah } from '../../lib/format';
import { useToast } from '../../context/ToastContext.jsx';
import { EmptyState, Pagination, StaffHeader } from '../staff/StaffUI.jsx';

const EMPTY = {
  name: '',
  description: '',
  price: '',
  category_id: '',
  image: null,
  is_available: true,
  is_best_seller: false,
  has_temperature_option: false,
  allow_price_request: false,
  allow_extra_rice: false,
};

export default function AdminMenus() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [data, setData] = useState({ data: [], current_page: 1, last_page: 1, total: 0 });
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(null);
  const [saving, setSaving] = useState(false);
  const [imagePreview, setImagePreview] = useState(null);

  const load = async (p = page, q = search) => {
    try {
      const res = await api.get('/admin/menu-items', { params: { page: p, search: q || undefined } });
      setData(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  useEffect(() => {
    api.get('/admin/categories', { params: { per_page: 100 } }).then((res) => setCategories(res.data.data)).catch(() => {});
    load(page, search);
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  const openNew = () => {
    setModal({ ...EMPTY, category_id: categories[0]?.id || '' });
    setImagePreview(null);
  };

  const openEdit = (menu) => {
    setModal({
      id: menu.id,
      name: menu.name,
      description: menu.description || '',
      price: String(Number(menu.price)),
      category_id: menu.category_id,
      image: null,
      is_available: menu.is_available,
      is_best_seller: menu.is_best_seller,
      has_temperature_option: menu.has_temperature_option,
      allow_price_request: menu.allow_price_request,
      allow_extra_rice: menu.allow_extra_rice,
      current_image: menu.image,
    });
    setImagePreview(menu.image ? imageUrl(menu.image) : null);
  };

  const onImageChange = (file) => {
    if (!file) return;
    setModal((m) => ({ ...m, image: file }));
    setImagePreview(URL.createObjectURL(file));
  };

  const save = async () => {
    if (!modal.name?.trim()) return toast.error('Nama menu wajib diisi.');
    if (!modal.category_id) return toast.error('Pilih kategori.');
    if (!modal.price || Number(modal.price) < 0) return toast.error('Harga tidak valid.');

    setSaving(true);
    try {
      const form = new FormData();
      form.append('category_id', modal.category_id);
      form.append('name', modal.name);
      form.append('description', modal.description || '');
      form.append('price', modal.price);
      ['is_available', 'is_best_seller', 'has_temperature_option', 'allow_price_request', 'allow_extra_rice'].forEach(
        (k) => form.append(k, modal[k] ? 1 : 0)
      );
      if (modal.image instanceof File) form.append('image', modal.image);

      if (modal.id) {
        form.append('_method', 'PUT');
        await api.post(`/admin/menu-items/${modal.id}`, form);
        toast.success('Menu diperbarui.');
      } else {
        await api.post('/admin/menu-items', form);
        toast.success('Menu ditambahkan.');
      }
      setModal(null);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (menu) => {
    try {
      await api.post(`/admin/menu-items/${menu.id}/toggle`);
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const remove = async (menu) => {
    if (!confirm(`Hapus menu "${menu.name}"?`)) return;
    try {
      await api.delete(`/admin/menu-items/${menu.id}`);
      toast.success('Menu dihapus.');
      load();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const toggles = [
    ['is_available', 'Tersedia'],
    ['has_temperature_option', 'Pilihan suhu'],
    ['allow_price_request', 'Boleh nawar'],
    ['allow_extra_rice', 'Boleh + nasi'],
  ];

  return (
    <div className="min-h-screen pb-10">
      <StaffHeader title="Kelola Menu" subtitle={`${data.total} menu`} />

      <main className="px-4 py-4">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            setPage(1);
            load(1, search);
          }}
          className="flex gap-2 mb-4"
        >
          <input className="input" placeholder="Cari menu..." value={search} onChange={(e) => setSearch(e.target.value)} />
          <button className="btn-secondary">Cari</button>
        </form>

        <button className="btn-primary w-full mb-4" onClick={openNew}>
          + Tambah Menu
        </button>

        {data.data.length === 0 ? (
          <EmptyState message="Belum ada menu." />
        ) : (
          <div className="space-y-3">
            {data.data.map((menu) => (
              <div key={menu.id} className="card p-4">
                <div className="flex gap-3">
                  <div className="w-14 h-14 rounded-xl bg-primary-50 flex items-center justify-center text-2xl overflow-hidden shrink-0">
                    {menu.image ? <img src={imageUrl(menu.image)} alt="" className="w-full h-full object-cover" /> : '🍽️'}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="font-semibold text-sm truncate">
                          {menu.name} {menu.is_best_seller && '⭐'}
                        </p>
                        <p className="text-xs text-gray-500">{menu.category?.name}</p>
                      </div>
                      <span className={`badge ${menu.is_available ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {menu.is_available ? 'Tersedia' : 'Habis'}
                      </span>
                    </div>
                    <p className="text-sm font-bold text-primary-700 mt-1">{rupiah(menu.price)}</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-3">
                  <button className="btn-secondary flex-1 !py-2 text-xs" onClick={() => openEdit(menu)}>Ubah</button>
                  <button className="btn-secondary flex-1 !py-2 text-xs" onClick={() => toggle(menu)}>
                    {menu.is_available ? 'Tandai Habis' : 'Aktifkan'}
                  </button>
                  <button className="btn-danger !py-2 text-xs !px-3" onClick={() => remove(menu)}>🗑</button>
                </div>
              </div>
            ))}
          </div>
        )}

        <Pagination meta={data} onPage={setPage} />
      </main>

      {modal && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setModal(null)}>
          <div
            className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="font-bold text-lg mb-4">{modal.id ? 'Ubah Menu' : 'Tambah Menu'}</h2>

            <div className="space-y-4">
              <div>
                <span className="label">Nama *</span>
                <input className="input" value={modal.name} onChange={(e) => setModal({ ...modal, name: e.target.value })} />
              </div>
              <div>
                <span className="label">Kategori *</span>
                <select className="input" value={modal.category_id} onChange={(e) => setModal({ ...modal, category_id: Number(e.target.value) })}>
                  <option value="">Pilih kategori</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <span className="label">Harga (Rp) *</span>
                <input type="number" className="input" min="0" value={modal.price} onChange={(e) => setModal({ ...modal, price: e.target.value })} />
              </div>
              <div>
                <span className="label">Deskripsi</span>
                <textarea className="input" rows={2} value={modal.description} onChange={(e) => setModal({ ...modal, description: e.target.value })} />
              </div>
              <div>
                <span className="label">Gambar {modal.current_image && '(kosongkan untuk mempertahankan)'}</span>
                <input type="file" accept="image/*" className="input !p-2" onChange={(e) => onImageChange(e.target.files[0])} />
                {imagePreview && <img src={imagePreview} alt="" className="mt-2 w-20 h-20 object-cover rounded-xl" />}
              </div>
              <div className="space-y-2">
                {toggles.map(([key, label]) => (
                  <label key={key} className="flex items-center justify-between text-sm bg-gray-50 rounded-xl px-4 py-3">
                    <span>{label}</span>
                    <input
                      type="checkbox"
                      checked={!!modal[key]}
                      onChange={(e) => setModal({ ...modal, [key]: e.target.checked })}
                      className="w-5 h-5 accent-primary-600"
                    />
                  </label>
                ))}
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
