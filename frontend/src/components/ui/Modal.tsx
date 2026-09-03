"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
};

/**
 * Built on the native `<dialog>` element rather than a hand-rolled overlay:
 * focus trapping, Escape-to-close and the backdrop all come from the
 * browser, for free, correctly.
 */
export function Modal({ open, onClose, title, children }: ModalProps) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      onClose={onClose}
      onCancel={onClose}
      className="rounded-card border border-rule bg-surface p-0 shadow-lg backdrop:bg-ink/50"
    >
      <div className="flex items-center justify-between border-b border-rule px-5 py-3">
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <button
          onClick={onClose}
          aria-label="Close"
          className="rounded-md p-1 text-ink-soft hover:bg-gold-wash hover:text-ink"
        >
          <X className="size-4" />
        </button>
      </div>
      <div className="p-5">{children}</div>
    </dialog>
  );
}
