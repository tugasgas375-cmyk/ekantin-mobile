import { useEffect } from 'react';

/**
 * Bottom sheet generik dengan animasi slide-up & backdrop blur.
 * onClose dipanggil saat backdrop diklik / tombol Escape.
 */
export default function BottomSheet({ open, onClose, children, maxHeight = '88vh', z = 50 }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e) => e.key === 'Escape' && onClose?.();
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 anim-fade flex items-end justify-center"
      style={{ zIndex: z, background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
      role="dialog"
      aria-modal="true"
    >
      <div
        className="anim-sheet bg-white w-full max-w-lg rounded-t-[28px] shadow-2xl overflow-hidden flex flex-col"
        style={{ maxHeight }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="pt-3 pb-1 shrink-0">
          <div className="sheet-handle !mb-0" />
        </div>
        <div className="overflow-y-auto px-5 pb-[calc(2rem+var(--safe-bottom))]">{children}</div>
      </div>
    </div>
  );
}
