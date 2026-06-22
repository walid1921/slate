import { useState, useRef, useEffect } from "react";

let _setGlobalTooltip: ((t: { label: string; x: number; y: number; side: "top" | "bottom" } | null) => void) | null = null;

export function GlobalTooltip() {
  const [tip, setTip] = useState<{ label: string; x: number; y: number; side: "top" | "bottom" } | null>(null);
  useEffect(() => { _setGlobalTooltip = setTip; return () => { _setGlobalTooltip = null; }; }, []);
  if (!tip) return null;
  return (
    <div
      className="pointer-events-none fixed px-2 py-1 rounded text-[10px] text-t1 whitespace-nowrap"
      style={{
        top: tip.y, left: tip.x,
        transform: tip.side === "top" ? "translate(-50%, -100%)" : "translate(-50%, 0)",
        background: "rgba(20,20,24,0.97)", border: "1px solid var(--c-border)",
        boxShadow: "0 4px 12px rgba(0,0,0,0.4)", zIndex: 99999,
      }}
    >
      {tip.label}
    </div>
  );
}

export function Tooltip({ label, children, side = "bottom" }: { label: string; children: React.ReactNode; side?: "top" | "bottom" }) {
  const ref = useRef<HTMLDivElement>(null);
  const show = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r && _setGlobalTooltip) _setGlobalTooltip({ label, x: r.left + r.width / 2, y: side === "top" ? r.top - 5 : r.bottom + 5, side });
  };
  return (
    <div ref={ref} className="inline-flex" onMouseEnter={show} onPointerEnter={show} onMouseLeave={() => _setGlobalTooltip?.(null)} onPointerLeave={() => _setGlobalTooltip?.(null)}>
      {children}
    </div>
  );
}

export function TipBtn({ label, side = "top", className, style, onClick, onMouseDown, children }: {
  label: string; side?: "top" | "bottom"; className?: string; style?: React.CSSProperties;
  onClick?: React.MouseEventHandler<HTMLButtonElement>;
  onMouseDown?: React.MouseEventHandler<HTMLButtonElement>;
  children: React.ReactNode;
}) {
  return (
    <div className="group/tip relative inline-flex">
      <button className={className} style={style} onClick={onClick} onMouseDown={onMouseDown}>{children}</button>
      <span className={`pointer-events-none absolute left-1/2 -translate-x-1/2 px-1.5 py-0.5 rounded text-[10px] text-t2 whitespace-nowrap opacity-0 group-hover/tip:opacity-100 transition-opacity duration-150 z-[999999] ${side === "top" ? "bottom-full mb-1" : "top-full mt-1"}`} style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>{label}</span>
    </div>
  );
}
