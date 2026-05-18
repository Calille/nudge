import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { type ReactNode, useEffect } from "react";
import { cn } from "@/lib/cn";

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  description?: ReactNode;
  size?: "sm" | "md" | "lg" | "xl" | "full";
  footer?: ReactNode;
  children: ReactNode;
  className?: string;
}

const sizeClass: Record<NonNullable<ModalProps["size"]>, string> = {
  sm: "max-w-sm",
  md: "max-w-md",
  lg: "max-w-2xl",
  xl: "max-w-5xl",
  full: "max-w-[90vw]",
};

export function Modal({
  open,
  onClose,
  title,
  description,
  size = "md",
  footer,
  children,
  className,
}: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-50 flex items-center justify-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/60 backdrop-blur-[2px]"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, y: 12, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ duration: 0.18, ease: "easeOut" }}
            className={cn(
              "relative w-full bg-bg-elevated border border-border rounded-lg shadow-panel overflow-hidden flex flex-col max-h-[85vh]",
              sizeClass[size],
              className
            )}
          >
            {(title || description) && (
              <div className="px-5 py-4 border-b border-border flex items-start gap-4">
                <div className="flex-1 min-w-0">
                  {title && (
                    <h3 className="text-base font-semibold text-fg truncate">
                      {title}
                    </h3>
                  )}
                  {description && (
                    <p className="text-sm text-fg-muted mt-0.5">
                      {description}
                    </p>
                  )}
                </div>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-hover transition-colors"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
            {footer && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg-subtle">
                {footer}
              </div>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function SlideOver({
  open,
  onClose,
  title,
  children,
  width = 520,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title?: ReactNode;
  children: ReactNode;
  width?: number;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-40"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="absolute inset-0 bg-black/40"
            onClick={onClose}
          />
          <motion.aside
            initial={{ x: width }}
            animate={{ x: 0 }}
            exit={{ x: width }}
            transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
            className="absolute right-0 top-0 bottom-0 bg-bg-elevated border-l border-border shadow-panel flex flex-col"
            style={{ width }}
          >
            {title && (
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <h3 className="text-base font-semibold">{title}</h3>
                <button
                  onClick={onClose}
                  className="p-1.5 rounded-md text-fg-muted hover:text-fg hover:bg-bg-hover"
                  aria-label="Close"
                >
                  <X size={16} />
                </button>
              </div>
            )}
            <div className="flex-1 overflow-y-auto">{children}</div>
            {footer && (
              <div className="px-5 py-3 border-t border-border flex items-center justify-end gap-2 bg-bg-subtle">
                {footer}
              </div>
            )}
          </motion.aside>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
