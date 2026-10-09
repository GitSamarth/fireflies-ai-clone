"use client";
import { createContext, useCallback, useContext, useRef, useState } from "react";

type Kind = "success" | "error" | "info";
interface ToastItem { id: number; kind: Kind; message: string }
const Ctx = createContext<(message: string, kind?: Kind) => void>(() => {});
export const useToast = () => useContext(Ctx);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);
  const next = useRef(1);
  const push = useCallback((message: string, kind: Kind = "success") => {
    const id = next.current++;
    setItems((x) => [...x.slice(-3), { id, kind, message }]);
    setTimeout(() => setItems((x) => x.filter((t) => t.id !== id)), kind === "error" ? 6000 : 3500);
  }, []);
  return (
    <Ctx.Provider value={push}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {items.map((t) => (
          <div key={t.id} className={`toast ${t.kind}`}>
            <span>{t.message}</span>
            <button aria-label="Dismiss" onClick={() => setItems((x) => x.filter((i) => i.id !== t.id))}>×</button>
          </div>
        ))}
      </div>
    </Ctx.Provider>
  );
}
