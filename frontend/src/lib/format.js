export function rupiah(value) {
  const n = Number(value || 0);
  return `Rp ${n.toLocaleString('id-ID')}`;
}

export function formatDate(value, withTime = false) {
  if (!value) return '-';
  const d = new Date(value);
  const date = d.toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
  if (!withTime) return date;
  return `${date} ${d.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}`;
}

export const STATUS_LABEL = {
  pending: 'Menunggu',
  processing: 'Diproses',
  completed: 'Selesai',
  cancelled: 'Dibatalkan',
};

export const STATUS_COLOR = {
  pending: 'bg-yellow-100 text-yellow-800',
  processing: 'bg-blue-100 text-blue-800',
  completed: 'bg-green-100 text-green-800',
  cancelled: 'bg-red-100 text-red-800',
};

export function orderTypeLabel(type) {
  return type === 'takeaway' ? 'Bungkus' : 'Dine In';
}

export function paymentLabel(method) {
  return method === 'qris' ? 'QRIS' : 'Tunai';
}

export function todayKey() {
  return new Date().toISOString().slice(0, 10);
}
