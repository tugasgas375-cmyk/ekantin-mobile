import { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api, { apiErrorMessage, imageUrl } from '../../lib/api';
import { rupiah } from '../../lib/format';
import { useCart } from '../../context/CartContext.jsx';
import { useToast } from '../../context/ToastContext.jsx';
import BottomSheet from '../../components/BottomSheet.jsx';

const RICE_PRICE = 2000;
const MIN_BARGAIN = 5000;

const CATEGORY_ICONS = ['🍚', '🥤', '🍪', '🍜', '🍰', '🥗'];

function greeting() {
  const h = new Date().getHours();
  if (h < 11) return 'Selamat pagi';
  if (h < 15) return 'Selamat siang';
  if (h < 18) return 'Selamat sore';
  return 'Selamat malam';
}

export default function CustomerMenu() {
  const navigate = useNavigate();
  const toast = useToast();
  const { items, total, count, addItem, updateQuantity, removeItem, clearCart, customerName, setCustomerName, addHistory } =
    useCart();

  const [categories, setCategories] = useState([]);
  const [menus, setMenus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);
  const [selected, setSelected] = useState(null);
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // form item modal
  const [qty, setQty] = useState(1);
  const [temperature, setTemperature] = useState(null);
  const [extraRice, setExtraRice] = useState(0);
  const [requestedPrice, setRequestedPrice] = useState('');

  // form checkout
  const [name, setName] = useState(customerName || '');
  const [table, setTable] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [payment, setPayment] = useState('cash');

  const loadData = async (signal, silent = false) => {
    if (!silent) setRefreshing(true);
    try {
      const [catRes, menuRes] = await Promise.all([
        api.get('/categories', { signal }),
        api.get('/menu-items', { signal }),
      ]);
      setCategories(catRes.data);
      setMenus(menuRes.data);
    } catch (err) {
      if (err.name !== 'CanceledError') toast.error(apiErrorMessage(err, 'Gagal memuat menu.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    loadData(controller.signal);
    return () => controller.abort();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const filtered = useMemo(() => {
    let list = menus;
    if (activeCategory) list = list.filter((m) => m.category_id === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter(
        (m) => m.name.toLowerCase().includes(q) || (m.description || '').toLowerCase().includes(q)
      );
    }
    return list;
  }, [menus, activeCategory, search]);

  const bestSellers = useMemo(
    () => menus.filter((m) => m.is_best_seller && m.is_available),
    [menus]
  );

  const showBestSellers = !search.trim() && !activeCategory && bestSellers.length > 0;

  const openItem = (menu) => {
    setSelected(menu);
    setQty(1);
    setTemperature(menu.has_temperature_option ? 'Dingin' : null);
    setExtraRice(0);
    setRequestedPrice('');
  };

  const handleAddToCart = () => {
    if (selected.allow_price_request) {
      const val = Number(requestedPrice);
      if (!requestedPrice || Number.isNaN(val)) return toast.error('Harga wajib diisi.');
      if (val < MIN_BARGAIN) return toast.error(`Harga minimum ${rupiah(MIN_BARGAIN)}.`);
      if (!Number.isInteger(val)) return toast.error('Harga harus bilangan bulat.');
    }
    addItem({
      id: selected.id,
      name: selected.name,
      price: Number(selected.price),
      quantity: qty,
      temperature,
      extraRice,
      requestedPrice: selected.allow_price_request ? Number(requestedPrice) : null,
    });
    toast.success(`✓ ${selected.name} ditambahkan`);
    setSelected(null);
  };

  const subtotalOf = (item) =>
    (item.requestedPrice || item.price) * item.quantity + (item.extraRice || 0) * RICE_PRICE;

  const handleCheckout = async () => {
    if (!name.trim()) return toast.error('Nama wajib diisi.');
    if (orderType === 'dine_in' && !table.trim()) return toast.error('Nomor meja wajib diisi.');
    if (items.length === 0) return toast.error('Keranjang kosong.');

    setSubmitting(true);
    try {
      const payload = {
        customer_name: name.trim(),
        table_number: orderType === 'takeaway' ? 'Bungkus' : table.trim(),
        order_type: orderType,
        payment_method: payment,
        menu_items: items.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          temperature: i.temperature || undefined,
          requested_price: i.requestedPrice || undefined,
          extra_rice: i.extraRice || undefined,
        })),
      };

      const res = await api.post('/orders', payload);
      const order = res.data.order;

      setCustomerName(name.trim());
      addHistory({
        ...order,
        customer_name: name.trim(),
        order_type: orderType,
        payment_method: payment,
        items: items.map((i) => ({ ...i })),
        total: Number(order.total),
      });
      clearCart();
      setCheckoutOpen(false);
      setCartOpen(false);

      if (payment === 'qris') {
        navigate(`/bayar/${order.id}`);
      } else {
        toast.success(res.data.message);
        navigate(`/track/${order.id}`);
      }
    } catch (err) {
      toast.error(apiErrorMessage(err, 'Gagal membuat pesanan.'));
    } finally {
      setSubmitting(false);
    }
  };

  const MenuCard = ({ menu }) => (
    <button
      onClick={() => openItem(menu)}
      disabled={!menu.is_available}
      className={`card-hover overflow-hidden text-left relative ${!menu.is_available ? 'opacity-70 saturate-50' : ''}`}
    >
      <div className="h-28 bg-gradient-to-br from-primary-100 via-primary-50 to-orange-50 flex items-center justify-center text-5xl relative overflow-hidden">
        {menu.image ? (
          <img src={imageUrl(menu.image)} alt={menu.name} className="w-full h-full object-cover" />
        ) : (
          <span className="drop-shadow-sm">🍽️</span>
        )}
        {menu.is_best_seller && (
          <span className="absolute top-2 left-2 badge bg-gradient-to-r from-orange-500 to-amber-500 text-white shadow-md text-[10px]">
            ⭐ Terlaris
          </span>
        )}
        {menu.allow_price_request && menu.is_available && (
          <span className="absolute top-2 right-2 badge bg-emerald-500 text-white shadow-md text-[10px]">
            💬 Nawar
          </span>
        )}
        {!menu.is_available && (
          <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
            <span className="bg-gray-700 text-white text-[11px] font-bold px-3 py-1 rounded-full tracking-wide">
              HABIS
            </span>
          </div>
        )}
        {menu.is_available && (
          <span className="absolute bottom-2 right-2 w-7 h-7 rounded-full bg-white shadow-md flex items-center justify-center text-primary-600 font-black text-lg">
            +
          </span>
        )}
      </div>
      <div className="p-3">
        <h3 className="text-sm font-bold leading-tight line-clamp-1">{menu.name}</h3>
        <p className="text-[11px] text-gray-400 line-clamp-1 mt-0.5">{menu.description}</p>
        <div className="mt-2 flex items-center justify-between">
          <span className="text-sm font-extrabold text-primary-700">
            {menu.allow_price_request ? '💬 Isi Harga' : rupiah(menu.price)}
          </span>
          <div className="flex gap-1">
            {menu.has_temperature_option && <span className="text-[10px]">🧊</span>}
            {menu.allow_extra_rice && <span className="text-[10px]">🍚</span>}
          </div>
        </div>
      </div>
    </button>
  );

  return (
    <div className="min-h-screen pb-32">
      {/* ===== Header hero ===== */}
      <header className="relative overflow-hidden bg-gradient-to-br from-primary-700 via-primary-600 to-primary-800 text-white">
        {/* dekorasi background */}
        <div className="absolute -top-16 -right-12 w-52 h-52 rounded-full bg-white/10" />
        <div className="absolute top-24 -left-16 w-40 h-40 rounded-full bg-white/5" />

        <div className="relative px-4 pt-[calc(1rem+var(--safe-top))] pb-4">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/15 border border-white/25 flex items-center justify-center text-2xl shadow-inner">
                🍽️
              </div>
              <div>
                <p className="text-[11px] text-primary-200 leading-none">{greeting()} 👋</p>
                <h1 className="text-xl font-black leading-tight mt-1">E-Kantin</h1>
                <p className="text-[11px] text-primary-200 leading-none mt-0.5">Pesan dari HP, tanpa antre</p>
              </div>
            </div>
            <div className="flex gap-1.5">
              <Link
                to="/cek-status"
                className="text-[11px] bg-white/15 border border-white/20 rounded-full px-3 py-2 font-semibold active:scale-95 transition"
              >
                🔎 Cek
              </Link>
              <Link
                to="/riwayat"
                className="text-[11px] bg-white/15 border border-white/20 rounded-full px-3 py-2 font-semibold active:scale-95 transition"
              >
                🧾 Riwayat
              </Link>
            </div>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
            <input
              className="w-full rounded-2xl bg-white text-gray-800 placeholder:text-gray-400 pl-11 pr-10 py-3 text-sm shadow-lg focus:outline-none focus:ring-2 focus:ring-white/60"
              placeholder="Cari nasi goreng, es teh..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button
                onClick={() => setSearch('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-gray-200 text-gray-500 text-xs flex items-center justify-center"
              >
                ✕
              </button>
            )}
          </div>

          {/* Categories */}
          <div className="flex gap-2 mt-3 overflow-x-auto pb-1 -mx-1 px-1 no-scrollbar">
            <button
              className={`chip ${activeCategory === null ? 'chip-active' : 'chip-idle'}`}
              onClick={() => setActiveCategory(null)}
            >
              ✨ Semua
            </button>
            {categories.map((c, i) => (
              <button
                key={c.id}
                className={`chip ${activeCategory === c.id ? 'chip-active' : 'chip-idle'}`}
                onClick={() => setActiveCategory(c.id)}
              >
                {CATEGORY_ICONS[i % CATEGORY_ICONS.length]} {c.name}
              </button>
            ))}
          </div>
        </div>

        {/* sudut bawah membulat */}
        <div className="absolute bottom-0 left-0 right-0 h-5 bg-gray-50 rounded-t-[24px]" />
      </header>

      {/* ===== Konten ===== */}
      <main className="px-4 pt-2">
        {loading ? (
          <>
            <div className="skeleton h-4 w-32 mb-3" />
            <div className="grid grid-cols-2 gap-3">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="skeleton h-44" />
              ))}
            </div>
          </>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 anim-up">
            <div className="text-5xl mb-3">🔍</div>
            <p className="font-semibold text-gray-700">Menu tidak ditemukan</p>
            <p className="text-sm text-gray-400 mt-1">Coba kata kunci atau kategori lain</p>
            {(search || activeCategory) && (
              <button
                className="btn-secondary mt-4"
                onClick={() => {
                  setSearch('');
                  setActiveCategory(null);
                }}
              >
                Reset filter
              </button>
            )}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Best seller */}
            {showBestSellers && (
              <section className="anim-up">
                <div className="flex items-center justify-between mb-3">
                  <h2 className="font-extrabold text-[15px] flex items-center gap-1.5">
                    🔥 Paling Laris
                  </h2>
                  <span className="text-[11px] text-gray-400">{bestSellers.length} menu</span>
                </div>
                <div className="flex gap-3 overflow-x-auto pb-2 no-scrollbar -mx-4 px-4">
                  {bestSellers.map((menu) => (
                    <button
                      key={menu.id}
                      onClick={() => openItem(menu)}
                      className="card-hover overflow-hidden text-left w-36 shrink-0"
                    >
                      <div className="h-24 bg-gradient-to-br from-orange-100 to-amber-50 flex items-center justify-center text-4xl relative">
                        {menu.image ? (
                          <img src={imageUrl(menu.image)} alt="" className="w-full h-full object-cover" />
                        ) : (
                          '🍽️'
                        )}
                        <span className="absolute top-1.5 left-1.5 badge bg-orange-500 text-white text-[9px] shadow">
                          ⭐
                        </span>
                      </div>
                      <div className="p-2.5">
                        <p className="text-xs font-bold line-clamp-1">{menu.name}</p>
                        <p className="text-xs font-extrabold text-primary-700 mt-1">
                          {menu.allow_price_request ? '💬 Nawar' : rupiah(menu.price)}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </section>
            )}

            {/* Semua menu */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-extrabold text-[15px]">
                  {activeCategory
                    ? categories.find((c) => c.id === activeCategory)?.name
                    : search
                      ? 'Hasil pencarian'
                      : '🍰 Semua Menu'}
                </h2>
                <span className="text-[11px] text-gray-400">{filtered.length} item</span>
              </div>
              <div className="grid grid-cols-2 gap-3">
                {filtered.map((menu) => (
                  <MenuCard key={menu.id} menu={menu} />
                ))}
              </div>
            </section>

            {refreshing && (
              <p className="text-center text-xs text-gray-400 py-2">Memperbarui...</p>
            )}
          </div>
        )}
      </main>

      {/* ===== Floating cart bar ===== */}
      {count > 0 && (
        <button
          onClick={() => setCartOpen(true)}
          className="anim-up fixed bottom-[calc(1rem+var(--safe-bottom))] left-4 right-4 z-40 bg-gradient-to-r from-primary-600 to-primary-700 text-white rounded-2xl shadow-2xl shadow-primary-600/40 px-5 py-4 flex items-center justify-between active:scale-[0.98] transition anim-float"
        >
          <span className="flex items-center gap-2.5 font-bold text-sm">
            <span className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center text-lg">🛒</span>
            {count} item
          </span>
          <span className="flex items-center gap-2">
            <span className="font-extrabold">{rupiah(total)}</span>
            <span className="w-7 h-7 rounded-full bg-white text-primary-700 flex items-center justify-center text-sm font-black">
              →
            </span>
          </span>
        </button>
      )}

      {/* ===== Modal item ===== */}
      <BottomSheet open={!!selected} onClose={() => setSelected(null)}>
        {selected && (
          <div className="anim-up">
            {/* Hero gambar */}
            <div className="-mx-5 -mt-4 mb-4 h-40 bg-gradient-to-br from-primary-100 to-orange-50 flex items-center justify-center text-6xl relative overflow-hidden">
              {selected.image ? (
                <img src={imageUrl(selected.image)} alt="" className="w-full h-full object-cover" />
              ) : (
                '🍽️'
              )}
              <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-white to-transparent" />
            </div>

            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-lg font-black leading-tight">{selected.name}</h2>
                <p className="text-xs text-gray-500 mt-0.5">{selected.description}</p>
              </div>
              <span className="text-lg font-extrabold text-primary-700 whitespace-nowrap">
                {selected.allow_price_request ? '💬 Nawar' : rupiah(selected.price)}
              </span>
            </div>

            {selected.is_best_seller && (
              <span className="badge bg-orange-100 text-orange-700 mt-2">⭐ Best Seller</span>
            )}

            {selected.has_temperature_option && (
              <div className="mt-5">
                <span className="label">Pilih Suhu</span>
                <div className="flex gap-2">
                  {[
                    { v: 'Dingin', icon: '🧊' },
                    { v: 'Panas', icon: '☕' },
                  ].map((t) => (
                    <button
                      key={t.v}
                      onClick={() => setTemperature(t.v)}
                      className={`opt-card ${temperature === t.v ? 'opt-on' : 'opt-off'}`}
                    >
                      <span className="block text-xl mb-0.5">{t.icon}</span>
                      {t.v}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {selected.allow_extra_rice && (
              <div className="mt-5">
                <span className="label">
                  Tambah Nasi <span className="text-primary-600">+{rupiah(RICE_PRICE)}</span>
                </span>
                <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                  <button
                    className="stepper-btn"
                    onClick={() => setExtraRice(Math.max(0, extraRice - 1))}
                    disabled={extraRice === 0}
                  >
                    −
                  </button>
                  <div className="text-center">
                    <span className="block font-black text-lg leading-none">{extraRice}</span>
                    <span className="text-[10px] text-gray-400">porsi nasi</span>
                  </div>
                  <button
                    className="stepper-btn"
                    onClick={() => setExtraRice(Math.min(99, extraRice + 1))}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            {selected.allow_price_request && (
              <div className="mt-5">
                <span className="label">💬 Tawar Hargamu</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-semibold text-sm">
                    Rp
                  </span>
                  <input
                    type="number"
                    className="input !pl-10 !text-base font-bold"
                    min={MIN_BARGAIN}
                    step={500}
                    value={requestedPrice}
                    onChange={(e) => setRequestedPrice(e.target.value)}
                    placeholder={String(MIN_BARGAIN)}
                  />
                </div>
                <div className="flex gap-2 mt-2">
                  {[5000, 7000, 10000].map((v) => (
                    <button
                      key={v}
                      onClick={() => setRequestedPrice(String(v))}
                      className="text-[11px] font-semibold bg-primary-50 text-primary-700 rounded-lg px-2.5 py-1.5 active:scale-95"
                    >
                      {rupiah(v)}
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-gray-400 mt-1.5">Minimum {rupiah(MIN_BARGAIN)}, kelipatan Rp500.</p>
              </div>
            )}

            <div className="mt-5">
              <span className="label">Jumlah</span>
              <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-2.5">
                <button
                  className="stepper-btn"
                  onClick={() => setQty(Math.max(1, qty - 1))}
                  disabled={qty === 1}
                >
                  −
                </button>
                <div className="text-center">
                  <span className="block font-black text-lg leading-none">{qty}</span>
                  <span className="text-[10px] text-gray-400">porsi</span>
                </div>
                <button className="stepper-btn" onClick={() => setQty(Math.min(99, qty + 1))}>
                  +
                </button>
              </div>
            </div>

            {/* ringkasan harga */}
            <div className="mt-5 bg-primary-50 border border-primary-100 rounded-xl px-4 py-3 flex justify-between items-center">
              <span className="text-sm text-primary-800 font-medium">Subtotal</span>
              <span className="font-black text-primary-700 text-base">
                {rupiah(
                  ((selected.allow_price_request ? Number(requestedPrice) || 0 : Number(selected.price)) * qty) +
                    extraRice * RICE_PRICE
                )}
              </span>
            </div>

            <button onClick={handleAddToCart} className="btn-primary w-full mt-4 !py-3.5">
              🛒 Tambah ke Keranjang
            </button>
          </div>
        )}
      </BottomSheet>

      {/* ===== Keranjang ===== */}
      <BottomSheet open={cartOpen} onClose={() => setCartOpen(false)}>
        <div className="anim-up">
          <div className="flex items-center justify-between mb-1">
            <h2 className="font-black text-lg">🛒 Keranjang</h2>
            {items.length > 0 && (
              <button
                className="text-xs text-red-500 font-semibold bg-red-50 rounded-lg px-3 py-1.5 active:scale-95"
                onClick={clearCart}
              >
                Kosongkan
              </button>
            )}
          </div>
          <p className="text-xs text-gray-400 mb-4">{count} item dalam keranjang</p>

          {items.length === 0 ? (
            <div className="text-center py-10">
              <div className="text-5xl mb-3">🛒</div>
              <p className="text-sm text-gray-500">Keranjang masih kosong.</p>
              <button className="btn-secondary mt-4" onClick={() => setCartOpen(false)}>
                Lihat Menu
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {items.map((item) => (
                <div
                  key={item.key}
                  className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 anim-up"
                >
                  <div className="w-10 h-10 rounded-lg bg-primary-100 flex items-center justify-center text-xl shrink-0">
                    🍽️
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold truncate">{item.name}</p>
                    <p className="text-[11px] text-gray-500">
                      {item.temperature ? `${item.temperature}` : ''}
                      {item.extraRice ? ` · +${item.extraRice} nasi` : ''}
                      {item.requestedPrice ? ` · 💬 ${rupiah(item.requestedPrice)}` : ` · ${rupiah(item.price)}`}
                    </p>
                    <p className="text-xs font-bold text-primary-700 mt-0.5">{rupiah(subtotalOf(item))}</p>
                  </div>
                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 font-bold active:scale-90"
                      onClick={() => updateQuantity(item.key, item.quantity - 1)}
                    >
                      −
                    </button>
                    <span className="w-6 text-center text-sm font-bold">{item.quantity}</span>
                    <button
                      className="w-8 h-8 rounded-full border border-gray-200 bg-white text-gray-600 font-bold active:scale-90"
                      onClick={() => updateQuantity(item.key, item.quantity + 1)}
                    >
                      +
                    </button>
                    <button
                      className="w-8 h-8 rounded-full bg-red-50 text-red-500 active:scale-90 ml-1"
                      onClick={() => removeItem(item.key)}
                    >
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {items.length > 0 && (
            <>
              <div className="mt-5 border-t border-dashed border-gray-200 pt-4 space-y-1.5">
                <div className="flex justify-between text-sm text-gray-500">
                  <span>Subtotal ({count} item)</span>
                  <span>{rupiah(total)}</span>
                </div>
                <div className="flex justify-between font-black text-lg">
                  <span>Total</span>
                  <span className="text-primary-700">{rupiah(total)}</span>
                </div>
              </div>
              <button
                className="btn-primary w-full mt-4 !py-3.5"
                onClick={() => {
                  setCartOpen(false);
                  setCheckoutOpen(true);
                }}
              >
                Lanjut Checkout →
              </button>
            </>
          )}
        </div>
      </BottomSheet>

      {/* ===== Checkout ===== */}
      <BottomSheet open={checkoutOpen} onClose={() => setCheckoutOpen(false)} maxHeight="92vh">
        <div className="anim-up">
          <div className="flex items-center gap-3 mb-5">
            <div className="w-10 h-10 rounded-xl bg-primary-100 flex items-center justify-center text-xl">🧾</div>
            <div>
              <h2 className="font-black text-lg leading-tight">Checkout</h2>
              <p className="text-[11px] text-gray-400">Lengkapi data pesananmu</p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <span className="label">Nama Kamu *</span>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2">👤</span>
                <input
                  className="input !pl-11"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth: Budi"
                />
              </div>
              {customerName && name !== customerName && (
                <button
                  className="text-[11px] text-primary-600 font-semibold mt-1.5"
                  onClick={() => setName(customerName)}
                >
                  Pakai "{customerName}" lagi
                </button>
              )}
            </div>

            <div>
              <span className="label">Jenis Pesanan</span>
              <div className="flex gap-2">
                {[
                  { v: 'dine_in', icon: '🍽️', l: 'Makan di tempat' },
                  { v: 'takeaway', icon: '📦', l: 'Bungkus' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setOrderType(o.v)}
                    className={`opt-card ${orderType === o.v ? 'opt-on' : 'opt-off'}`}
                  >
                    <span className="block text-xl mb-0.5">{o.icon}</span>
                    {o.l}
                  </button>
                ))}
              </div>
            </div>

            {orderType === 'dine_in' && (
              <div>
                <span className="label">Nomor Meja *</span>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2">🪑</span>
                  <input
                    className="input !pl-11"
                    value={table}
                    onChange={(e) => setTable(e.target.value)}
                    placeholder="cth: 5"
                  />
                </div>
              </div>
            )}

            <div>
              <span className="label">Metode Pembayaran</span>
              <div className="flex gap-2">
                {[
                  { v: 'cash', icon: '💵', l: 'Tunai' },
                  { v: 'qris', icon: '📱', l: 'QRIS' },
                ].map((o) => (
                  <button
                    key={o.v}
                    onClick={() => setPayment(o.v)}
                    className={`opt-card ${payment === o.v ? 'opt-on' : 'opt-off'}`}
                  >
                    <span className="block text-xl mb-0.5">{o.icon}</span>
                    {o.l}
                  </button>
                ))}
              </div>
              {payment === 'cash' && (
                <p className="text-[11px] text-gray-400 mt-1.5">Bayar tunai langsung di kasir saat ambil pesanan.</p>
              )}
            </div>

            <div className="bg-gradient-to-br from-primary-600 to-primary-700 text-white rounded-2xl p-4 shadow-lg shadow-primary-600/25">
              <div className="flex justify-between text-sm text-primary-100">
                <span>{count} item</span>
                <span>{rupiah(total)}</span>
              </div>
              <div className="flex justify-between font-black text-xl mt-1">
                <span>Total</span>
                <span>{rupiah(total)}</span>
              </div>
            </div>
          </div>

          <button
            className="btn-primary w-full mt-5 !py-3.5"
            onClick={handleCheckout}
            disabled={submitting}
          >
            {submitting ? (
              <>⏳ Memproses...</>
            ) : payment === 'qris' ? (
              <>📱 Pesan & Bayar QRIS</>
            ) : (
              <>✓ Pesan Sekarang · {rupiah(total)}</>
            )}
          </button>
          <p className="text-center text-[11px] text-gray-400 mt-3">
            Pesanan langsung diteruskan ke kasir 🚀
          </p>
        </div>
      </BottomSheet>
    </div>
  );
}
