import { useEffect, useState } from "react";
import { CheckCircle, Download, Upload } from "lucide-react";

export type ToastType = "exported" | "imported" | "exported-imported";

interface ToastProps {
  type: ToastType;
  onDone: () => void;
}

const CONFIG: Record<ToastType, { icon: React.ReactNode; title: string; sub: string }> = {
  exported: {
    icon: <Download size={15} className="text-blue-400" />,
    title: "Data exported",
    sub: "Saved to your slate-db folder",
  },
  imported: {
    icon: <Upload size={15} className="text-green-400" />,
    title: "Data imported",
    sub: "Your data has been replaced",
  },
  "exported-imported": {
    icon: <CheckCircle size={15} className="text-green-400" />,
    title: "Backup saved & imported",
    sub: "Old data exported, new data loaded",
  },
};

export function Toast({ type, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    const hide = setTimeout(() => setVisible(false), 2800);
    const done = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, []);

  const { icon, title, sub } = CONFIG[type];

  return (
    <div
      className="dropdown"
      style={{
        position: "fixed",
        top: 14,
        left: "50%",
        transform: `translateX(-50%) translateY(${visible ? 0 : -12}px)`,
        opacity: visible ? 1 : 0,
        transition: "opacity 0.22s ease, transform 0.22s ease",
        zIndex: 9999,
        borderRadius: 10,
        padding: "9px 14px",
        display: "flex",
        alignItems: "center",
        gap: 10,
        minWidth: 220,
        boxShadow: "0 4px 24px rgba(0,0,0,0.35)",
        border: "1px solid var(--c-border)",
        pointerEvents: "none",
      }}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-t1">{title}</span>
        <span className="text-[11px] text-t4">{sub}</span>
      </div>
    </div>
  );
}
