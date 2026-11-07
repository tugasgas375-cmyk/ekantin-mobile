import { useCallback, useEffect, useRef, useState } from 'react';
import api, { apiErrorMessage, imageUrl } from '../../lib/api';
import { rupiah, STATUS_COLOR, STATUS_LABEL, orderTypeLabel } from '../../lib/format';
import { useToast } from '../../context/ToastContext.jsx';
import { CUSTOMER_URL } from '../../lib/links';

const RICE_PRICE = 2000;

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.frequency.value = 660;
    gain.gain.setValueAtTime(0.2, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
    osc.start();
    osc.stop(ctx.currentTime + 0.5);
  } catch {
    // abaikan
  }
}

export default function KasirDashboard() {
  const toast = useToast();
  const [categories, setCategories] = useState([]);
  const [orders, setOrders] = useState([]);
  const [cart, setCart] = useState([]);
  const [tab, setTab] = useState('menu');
  const [activeCategory, setActiveCategory] = useState(null);

  // checkout form
  const [name, setName] = useState('');
  const [orderType, setOrderType] = useState('dine_in');
  const [table, setTable] = useState('');
  const [payment, setPayment] = useState('cash');
  const [submitting, setSubmitting] = useState(false);

  // item option picker
  const [optionItem, setOptionItem] = useState(null);
  const [optionTemp, setOptionTemp] = useState(null);
  const [optionRice, setOptionRice] = useState(0);

  const lastPaidIds = useRef(new Set());
  const firstPoll = useRef(true);

  const loadMenus = useCallback(async () => {
    try {
      const res = await api.get('/kasir/menu-items');
      setCategories(res.data);
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  }, [toast]);

  const loadOrders = useCallback(async () => {
    try {
      const res = await api.get('/kasir/orders/poll');
      setOrders(res.data.orders);
    } catch {
      // biarkan retry berikutnya
    }
  }, []);

  useEffect(() => {
    loadMenus();
    loadOrders();
    const timer = setInterval(loadOrders, 5000);
    return () => clearInterval(timer);
  }, [loadMenus, loadOrders]);

  // poll pembayaran QRIS masuk
  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/kasir/payments/poll');
        const paid = res.data.recently_paid || [];
        paid.forEach((p) => {
          if (!lastPaidIds.current.has(p.id)) {
            lastPaidIds.current.add(p.id);
            if (!firstPoll.current) {
              beep();
              toast.success(`💳 QRIS dibayar: A${p.queue_number} (${p.customer_name}) ${rupiah(p.total)}`);
            }
          }
        });
        firstPoll.current = false;
      } catch {
        // biarkan
      }
    };
    poll();
    const timer = setInterval(poll, 3000);
    return () => clearInterval(timer);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const menus = activeCategory
    ? categories.find((c) => c.id === activeCategory)?.menu_items || []
    : categories.flatMap((c) => c.menu_items || []);

  const addToCart = (menu) => {
    if (menu.has_temperature_option || menu.allow_extra_rice) {
      setOptionItem(menu);
      setOptionTemp(menu.has_temperature_option ? 'Dingin' : null);
      setOptionRice(0);
      return;
    }
    pushCart(menu, null, 0);
  };

  const pushCart = (menu, temperature, riceQty) => {
    const key = `${menu.id}_${temperature || ''}_${riceQty || 0}`;
    setCart((prev) => {
      const existing = prev.find((i) => i.key === key);
      if (existing) return prev.map((i) => (i.key === key ? { ...i, quantity: Math.min(99, i.quantity + 1) } : i));
      return [
        ...prev,
        {
          key,
          id: menu.id,
          name: menu.name,
          price: Number(menu.price),
          quantity: 1,
          temperature,
          extra_rice: riceQty,
        },
      ];
    });
    toast.success(`${menu.name} ditambahkan.`);
  };

  const confirmOption = () => {
    pushCart(optionItem, optionTemp, optionRice);
    setOptionItem(null);
  };

  const updateQty = (key, delta) => {
    setCart((prev) =>
      prev
        .map((i) => (i.key === key ? { ...i, quantity: Math.min(99, i.quantity + delta) } : i))
        .filter((i) => i.quantity > 0)
    );
  };

  const cartTotal = cart.reduce(
    (sum, i) => sum + i.price * i.quantity + i.extra_rice * RICE_PRICE * i.quantity,
    0
  );

  const checkout = async () => {
    if (!name.trim()) return toast.error('Nama pelanggan wajib diisi.');
    if (orderType === 'dine_in' && !table.trim()) return toast.error('Nomor meja wajib diisi.');
    if (cart.length === 0) return toast.error('Keranjang kosong.');

    setSubmitting(true);
    try {
      const res = await api.post('/kasir/orders', {
        customer_name: name.trim(),
        order_type: orderType,
        table_number: table.trim() || undefined,
        payment_method: payment,
        items: cart.map((i) => ({
          id: i.id,
          quantity: i.quantity,
          temperature: i.temperature || undefined,
          // Backend expects extra rice per menu unit and multiplies it by quantity.
          extra_rice: i.extra_rice || 0,
        })),
      });
      toast.success(res.data.message);
      setCart([]);
      setName('');
      setTable('');
      setTab('pesanan');
      loadOrders();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    } finally {
      setSubmitting(false);
    }
  };

  const changeStatus = async (order, status) => {
    if (status === 'cancelled' && !confirm(`Batalkan pesanan A${order.queue_number}?`)) return;
    try {
      const res = await api.post(`/kasir/orders/${order.id}/status`, { status });
      toast.success(res.data.message);
      loadOrders();
    } catch (err) {
      toast.error(apiErrorMessage(err));
    }
  };

  const tabs = [
    { v: 'menu', l: '🍛 Menu' },
    { v: 'keranjang', l: `🛒 Keranjang (${cart.length})` },
    { v: 'pesanan', l: `📋 Pesanan (${orders.length})` },
  ];

  return (
    <div className="min-h-screen pb-40">
      <header className="bg-primary-600 text-white px-4 py-4 sticky top-0 z-30">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-lg font-bold leading-tight">POS Kasir</h1>
            <p className="text-xs text-primary-100">{orders.length} pesanan aktif</p>
          </div>
          <a href={`${CUSTOMER_URL}/antrian`} target="_blank" rel="noreferrer" className="text-xs bg-primary-700 rounded-full px-3 py-1.5">
            🖥️ Antrian
          </a>
        </div>
        <div className="flex gap-2 mt-3">
          {tabs.map((t) => (
            <button
              key={t.v}
              onClick={() => setTab(t.v)}
              className={`flex-1 text-xs font-semibold rounded-lg py-2 ${
                tab === t.v ? 'bg-white text-primary-700' : 'bg-primary-700/60'
              }`}
            >
              {t.l}
            </button>
          ))}
        </div>
      </header>

      <main className="px-4 py-4">
        {tab === 'menu' && (
          <>
            <div className="flex gap-2 overflow-x-auto pb-3">
              <button
                className={`chip border ${activeCategory === null ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                onClick={() => setActiveCategory(null)}
              >
                Semua
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  className={`chip border ${activeCategory === c.id ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                  onClick={() => setActiveCategory(c.id)}
                >
                  {c.name}
                </button>
              ))}
            </div>

            <div className="grid grid-cols-2 gap-3">
              {menus.map((menu) => (
                <button key={menu.id} className="card p-3 text-left active:scale-[0.98] transition" onClick={() => addToCart(menu)}>
                  <div className="h-16 rounded-lg bg-primary-50 flex items-center justify-center text-2xl overflow-hidden">
                    {menu.image ? <img src={imageUrl(menu.image)} alt="" className="w-full h-full object-cover" /> : '🍽️'}
                  </div>
                  <p className="text-sm font-semibold mt-2 truncate">{menu.name}</p>
                  <p className="text-sm font-bold text-primary-700">{rupiah(menu.price)}</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {menu.has_temperature_option && <span className="badge bg-blue-50 text-blue-600">Suhu</span>}
                    {menu.allow_extra_rice && <span className="badge bg-green-50 text-green-600">+Nasi</span>}
                    {menu.is_best_seller && <span className="badge bg-orange-50 text-orange-600">⭐</span>}
                  </div>
                </button>
              ))}
            </div>
          </>
        )}

        {tab === 'keranjang' && (
          <div className="space-y-4">
            <div className="card p-4 space-y-3">
              <div>
                <span className="label">Nama Pelanggan *</span>
                <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Nama" />
              </div>
              <div>
                <span className="label">Jenis Pesanan</span>
                <div className="flex gap-2">
                  {[
                    { v: 'dine_in', l: '🍽️ Dine In' },
                    { v: 'takeaway', l: '📦 Bungkus' },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setOrderType(o.v)}
                      className={`chip border flex-1 ${orderType === o.v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
              {orderType === 'dine_in' && (
                <div>
                  <span className="label">Nomor Meja *</span>
                  <input className="input" value={table} onChange={(e) => setTable(e.target.value)} placeholder="contoh: 3" />
                </div>
              )}
              <div>
                <span className="label">Pembayaran</span>
                <div className="flex gap-2">
                  {[
                    { v: 'cash', l: '💵 Tunai' },
                    { v: 'qris', l: '📱 QRIS' },
                  ].map((o) => (
                    <button
                      key={o.v}
                      onClick={() => setPayment(o.v)}
                      className={`chip border flex-1 ${payment === o.v ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                    >
                      {o.l}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="card p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="font-bold text-sm">Item Keranjang</h2>
                {cart.length > 0 && (
                  <button className="text-xs text-red-600 font-semibold" onClick={() => setCart([])}>
                    Kosongkan
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <p className="text-sm text-gray-500 text-center py-6">Keranjang kosong. Pilih menu dulu.</p>
              ) : (
                <div className="space-y-3">
                  {cart.map((item) => (
                    <div key={item.key} className="flex items-center gap-3 border-b border-gray-100 pb-3 last:border-0">
                      <div className="flex-1">
                        <p className="text-sm font-semibold">{item.name}</p>
                        <p className="text-xs text-gray-500">
                          {item.temperature ? `${item.temperature} · ` : ''}
                          {item.extra_rice ? `+nasi ×${item.extra_rice} · ` : ''}
                          {rupiah(item.price)}
                        </p>
                        <p className="text-xs font-bold text-primary-700">
                          {rupiah(item.price * item.quantity + item.extra_rice * RICE_PRICE * item.quantity)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button className="w-8 h-8 rounded-full border border-gray-300" onClick={() => updateQty(item.key, -1)}>−</button>
                        <span className="w-6 text-center text-sm">{item.quantity}</span>
                        <button className="w-8 h-8 rounded-full border border-gray-300" onClick={() => updateQty(item.key, 1)} disabled={item.quantity >= 99}>+</button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between font-bold mt-4 pt-3 border-t border-gray-100">
                <span>Total</span>
                <span className="text-primary-700">{rupiah(cartTotal)}</span>
              </div>

              <button className="btn-primary w-full mt-4" onClick={checkout} disabled={submitting || cart.length === 0}>
                {submitting ? 'Memproses...' : 'Buat Pesanan'}
              </button>
            </div>
          </div>
        )}

        {tab === 'pesanan' && (
          <div className="space-y-3">
            {orders.length === 0 ? (
              <div className="text-center py-16 text-gray-500">
                <div className="text-4xl mb-2">📋</div>
                <p className="text-sm">Belum ada pesanan masuk.</p>
              </div>
            ) : (
              orders.map((order) => (
                <div key={order.id} className="card p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-lg font-black">A{order.queue_number}</span>
                        <span className={`badge ${STATUS_COLOR[order.status]}`}>{STATUS_LABEL[order.status]}</span>
                        {order.payment_method === 'qris' && order.payment_status === 'paid' && (
                          <span className="badge bg-green-100 text-green-700">💸 Lunas</span>
                        )}
                      </div>
                      <p className="text-sm text-gray-600">
                        {order.customer_name} · {orderTypeLabel(order.order_type)}
                        {order.order_type === 'dine_in' && order.table_number ? ` · Meja ${order.table_number}` : ''}
                      </p>
                    </div>
                    <span className="font-bold text-primary-700">{rupiah(order.total)}</span>
                  </div>

                  <div className="mt-2 text-xs text-gray-600 space-y-0.5 bg-gray-50 rounded-lg p-2">
                    {(order.order_items || []).map((it) => (
                      <p key={it.id}>
                        {it.quantity}x {it.menu_item?.name}
                        {it.temperature ? ` (${it.temperature})` : ''}
                        {Number(it.extra_rice) > 0 ? ` +${it.extra_rice} nasi` : ''}
                        {it.requested_price ? ` 💬 ${rupiah(it.requested_price)}` : ''}
                      </p>
                    ))}
                  </div>

                  <div className="flex gap-2 mt-3">
                    {order.status === 'pending' && (
                      <>
                        <button className="btn-primary flex-1 !py-2 text-xs" onClick={() => changeStatus(order, 'processing')}>
                          🔄 Proses
                        </button>
                        <button className="btn-danger !py-2 text-xs !px-3" onClick={() => changeStatus(order, 'cancelled')}>
                          ❌
                        </button>
                      </>
                    )}
                    {order.status === 'processing' && (
                      <>
                        <button className="btn-primary flex-1 !py-2 text-xs bg-green-600 hover:bg-green-700" onClick={() => changeStatus(order, 'completed')}>
                          ✅ Selesai
                        </button>
                        <button className="btn-danger !py-2 text-xs !px-3" onClick={() => changeStatus(order, 'cancelled')}>
                          ❌
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}
      </main>

      {cart.length > 0 && tab !== 'keranjang' && (
        <button
          onClick={() => setTab('keranjang')}
          className="fixed bottom-6 right-4 z-40 bg-primary-600 text-white rounded-full shadow-xl px-5 py-4 text-sm font-semibold active:scale-95"
        >
          🛒 {cart.length} item · {rupiah(cartTotal)}
        </button>
      )}

      {optionItem && (
        <div className="fixed inset-0 z-50 bg-black/50 flex items-end justify-center" onClick={() => setOptionItem(null)}>
          <div className="bg-white w-full max-w-lg rounded-t-3xl p-5 pb-8" onClick={(e) => e.stopPropagation()}>
            <div className="w-10 h-1 bg-gray-300 rounded-full mx-auto mb-4" />
            <h2 className="font-bold mb-4">{optionItem.name}</h2>

            <div className="space-y-4">
              {optionItem.has_temperature_option && (
                <div>
                  <span className="label">Suhu</span>
                  <div className="flex gap-2">
                    {['Dingin', 'Panas'].map((t) => (
                      <button
                        key={t}
                        onClick={() => setOptionTemp(t)}
                        className={`chip border flex-1 ${optionTemp === t ? 'bg-primary-600 text-white border-primary-600' : 'bg-white border-gray-300'}`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {optionItem.allow_extra_rice && (
                <div>
                  <span className="label">Tambah Nasi (+{rupiah(RICE_PRICE)})</span>
                  <div className="flex items-center gap-3">
                    <button className="btn-secondary w-10 h-10 !p-0 rounded-full" onClick={() => setOptionRice(Math.max(0, optionRice - 1))}>−</button>
                    <span className="w-8 text-center font-semibold">{optionRice}</span>
                    <button className="btn-secondary w-10 h-10 !p-0 rounded-full" onClick={() => setOptionRice(Math.min(9, optionRice + 1))}>+</button>
                  </div>
                </div>
              )}
            </div>

            <button className="btn-primary w-full mt-6" onClick={confirmOption}>
              Tambah ke Keranjang
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
