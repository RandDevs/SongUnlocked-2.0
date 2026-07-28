import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from "react";

export interface ToastItem {
  id: string;
  message: string;
  error?: boolean;
}

interface ToastContextValue {
  toast: (message: string, options?: { error?: boolean }) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const timerRefs = useRef<Map<string, ReturnType<typeof setTimeout>>>(
    new Map(),
  );

  const toast = useCallback(
    (message: string, options: { error?: boolean } = {}) => {
      const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
      setToasts((prev) => [...prev, { id, message, error: options.error }]);

      const timeout = setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
        timerRefs.current.delete(id);
      }, options.error ? 5200 : 3200);

      timerRefs.current.set(id, timeout);
    },
    [],
  );

  useEffect(() => {
    return () => {
      for (const timer of timerRefs.current.values()) {
        clearTimeout(timer);
      }
      timerRefs.current.clear();
    };
  }, []);

  return (
    <ToastContext.Provider value={{ toast }}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.error ? "toast--error" : ""}`}
          >
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within ToastProvider");
  return ctx;
}
