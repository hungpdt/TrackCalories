"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { X } from "lucide-react";

/**
 * Bảng trượt lên từ đáy màn hình (desktop: hộp giữa màn). Dùng <dialog> gốc của trình duyệt:
 * giữ focus bên trong, Esc để đóng, nền mờ phía sau; bấm ra ngoài cũng đóng.
 */
export function Sheet({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return <dialog ref={ref} className="sheet" aria-label={title} onClose={onClose}
    onClick={event => { if (event.target === ref.current) onClose(); }}>
    <div className="sheet-body">
      <div className="sheet-handle" aria-hidden="true" />
      <div className="sheet-head">
        <h2>{title}</h2>
        <button type="button" className="icon-button" aria-label="Đóng" onClick={onClose}><X size={20} /></button>
      </div>
      {children}
    </div>
  </dialog>;
}
