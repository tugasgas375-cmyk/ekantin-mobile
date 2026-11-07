import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../lib/api';

function useClock() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  return now;
}

export default function QueueScreen() {
  const [data, setData] = useState(null);
  const now = useClock();

  useEffect(() => {
    const poll = async () => {
      try {
        const res = await api.get('/antrian');
        setData(res.data);
      } catch {
        // abaikan error sementara
      }
    };
    poll();
    const timer = setInterval(poll, 5000);
    return () => clearInterval(timer);
  }, []);

  const dateLabel = now.toLocaleDateString('id-ID', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
  const timeLabel = now.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' });

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-900 via-primary-800 to-slate-900 text-white flex flex-col relative overflow-hidden">
      {/* dekorasi */}
      <div className="absolute top-[-80px] left-[-80px] w-72 h-72 rounded-full bg-primary-500/20 blur-2xl" />
      <div className="absolute bottom-[-100px] right-[-60px] w-80 h-80 rounded-full bg-blue-400/10 blur-3xl" />

      <header className="text-center pt-10 pb-6 relative">
        <div className="text-6xl drop-shadow-lg">🍽️</div>
        <h1 className="text-4xl font-black mt-3 tracking-tight">E-Kantin</h1>
        <p className="text-primary-300 text-sm mt-1 font-medium">Layar Antrian Kantin</p>
        <div className="mt-3 inline-flex items-center gap-3 bg-white/10 border border-white/15 rounded-full px-5 py-2 backdrop-blur">
          <span className="text-sm text-primary-200">{dateLabel}</span>
          <span className="w-1 h-1 rounded-full bg-primary-400" />
          <span className="text-lg font-black tabular-nums">{timeLabel}</span>
        </div>
      </header>

      <main className="flex-1 flex flex-col items-center justify-center px-6 pb-10 relative">
        <div className="grid grid-cols-2 gap-5 w-full max-w-3xl">
          <div className="bg-white/10 border border-white/15 rounded-[28px] p-7 text-center backdrop-blur-lg shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-emerald-400 to-teal-300" />
            <p className="text-xs text-primary-300 uppercase tracking-[0.2em] font-bold">
              Sedang Diproses
            </p>
            <div className="text-[86px] leading-none font-black mt-4 tabular-nums anim-bounce">
              {data?.current ? `A${data.current}` : '—'}
            </div>
            <p className="text-primary-300 text-xs mt-3">Silakan tunggu di meja masing-masing</p>
          </div>

          <div className="bg-white/10 border border-white/15 rounded-[28px] p-7 text-center backdrop-blur-lg shadow-2xl relative overflow-hidden">
            <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-amber-400 to-orange-400" />
            <p className="text-xs text-primary-300 uppercase tracking-[0.2em] font-bold">
              Berikutnya
            </p>
            <div className="text-[86px] leading-none font-black mt-4 text-yellow-300 tabular-nums drop-shadow-[0_0_24px_rgba(250,204,21,0.35)]">
              {data?.next ? `A${data.next}` : '—'}
            </div>
            <p className="text-primary-300 text-xs mt-3">Siapkan struk pesanan kamu</p>
          </div>
        </div>

        <div className="mt-7 w-full max-w-3xl bg-white/10 border border-white/15 rounded-3xl p-6 backdrop-blur-lg">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs text-primary-300 uppercase tracking-[0.15em] font-bold">
              Menunggu Antrean
            </p>
            <span className="text-xs bg-white/15 rounded-full px-3 py-1 font-bold">
              {data?.pending?.length || 0} pesanan
            </span>
          </div>
          {data?.pending?.length ? (
            <div className="flex flex-wrap gap-2.5">
              {data.pending.map((q, i) => (
                <span
                  key={q}
                  className={`rounded-xl px-4 py-2 font-black text-lg anim-up ${
                    i === 0
                      ? 'bg-amber-400/25 text-amber-200 border border-amber-400/40'
                      : 'bg-white/15 text-white border border-white/10'
                  }`}
                  style={{ animationDelay: `${i * 60}ms` }}
                >
                  A{q}
                </span>
              ))}
            </div>
          ) : (
            <div className="flex items-center gap-3 py-2">
              <span className="text-2xl">😌</span>
              <p className="text-sm text-primary-300">Tidak ada antrean. Pesan sekarang!</p>
            </div>
          )}
        </div>

        <div className="mt-7 flex items-center gap-4 bg-white/10 border border-white/15 rounded-2xl px-6 py-3 backdrop-blur">
          <div className="text-center">
            <p className="text-[10px] text-primary-300 uppercase tracking-wide">Selesai hari ini</p>
            <p className="text-3xl font-black leading-tight">{data?.completed_count ?? 0}</p>
          </div>
          <div className="w-px h-8 bg-white/20" />
          <div className="text-center">
            <p className="text-[10px] text-primary-300 uppercase tracking-wide">Dalam antrean</p>
            <p className="text-3xl font-black leading-tight">{data?.pending?.length ?? 0}</p>
          </div>
        </div>
      </main>

      <footer className="text-center pb-7 text-xs text-primary-400 no-print relative">
        <Link to="/" className="underline hover:text-white">
          Ke halaman pesan
        </Link>{' '}
        · diperbarui otomatis tiap 5 detik
      </footer>
    </div>
  );
}
