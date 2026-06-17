import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useNotesStore } from "../notesStore";

export default function QuickNote() {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saved = useRef(false);

  useEffect(() => {
    // Make root transparent so vibrancy shows through
    const root = document.getElementById("root");
    if (root) root.style.background = "transparent";
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  const save = async () => {
    if (saved.current) return;
    saved.current = true;
    const trimmed = text.trim();
    if (trimmed) {
      const lines = trimmed.split("\n");
      const title = lines[0].slice(0, 60) || "Quick note";
      const content = lines.slice(1).join("\n").trim();
      await useNotesStore.getState().add(title, content);
    }
    getCurrentWindow().close();
  };

  // Close when the OS window loses focus
  useEffect(() => {
    const unlisten = listen("quick-note-blur", () => save());
    return () => { unlisten.then((fn) => fn()); };
  }, []);

  return (
    <div className="w-full h-full flex flex-col" style={{ borderRadius: 12, overflow: "hidden" }}>
      <div
        className="px-3 py-2 text-[11px] text-t4 select-none shrink-0 border-b border-s"
        data-tauri-drag-region
      >
        Quick note — Esc or click outside to save
      </div>
      <textarea
        ref={textareaRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === "Escape") save();
          if (e.key === "Enter" && e.metaKey) { e.preventDefault(); save(); }
        }}
        placeholder="First line becomes the title…"
        className="flex-1 px-3 py-2.5 text-[13px] text-t1 bg-transparent outline-none resize-none placeholder-themed leading-relaxed"
      />
    </div>
  );
}
