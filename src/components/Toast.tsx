import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle, Download, Upload, Send, X } from "lucide-react";

export type ToastType = "exported" | "imported" | "exported-imported" | "error" | "success";

interface ToastProps {
  type: ToastType;
  message?: string;
  persistent?: boolean;
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
  error: {
    icon: <AlertCircle size={15} className="text-red-400" />,
    title: "Something went wrong",
    sub: "Please try again",
  },
  success: {
    icon: <Send size={14} className="text-sky-400" />,
    title: "Sent to Tasks",
    sub: "Items added",
  },
};

export function Toast({ type, message, persistent, onDone }: ToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const show = setTimeout(() => setVisible(true), 10);
    if (persistent) {
      return () => { clearTimeout(show); };
    }
    const hide = setTimeout(() => setVisible(false), 2800);
    const done = setTimeout(() => onDone(), 3300);
    return () => { clearTimeout(show); clearTimeout(hide); clearTimeout(done); };
  }, [persistent]);

  const dismiss = () => {
    setVisible(false);
    setTimeout(() => onDone(), 250);
  };

  const { icon, title, sub: defaultSub } = CONFIG[type];
  const sub = message ?? defaultSub;

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
        pointerEvents: persistent ? "auto" : "none",
      }}
    >
      {icon}
      <div className="flex flex-col">
        <span className="text-[13px] font-medium text-t1">{title}</span>
        <span className="text-[11px] text-t4">{sub}</span>
      </div>
      {persistent && (
        <button
          onClick={dismiss}
          className="ml-2 text-t5 hover:text-t2 transition-colors"
          title="Dismiss"
        >
          <X size={12} />
        </button>
      )}
    </div>
  );
}
