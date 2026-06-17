import { useEffect, useRef, useState } from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { listen } from "@tauri-apps/api/event";
import { useNotesStore } from "../notesStore";

export default function QuickNote() {
  const [text, setText] = useState("");
  const textVal = useRef("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const saving = useRef(false);

  useEffect(() => {
    const root = document.getElementById("root");
    if (root) root.style.background = "transparent";
    setTimeout(() => textareaRef.current?.focus(), 80);
  }, []);

  // Keep ref in sync so event listeners always read latest text
  useEffect(() => { textVal.current = text; }, [text]);

  const save = async () => {
    if (saving.current) return;
    saving.current = true;
    const trimmed = textVal.current.trim();
    if (trimmed) {
      const lines = trimmed.split("\n");
      const title = lines[0].slice(0, 60) || "Quick note";
      const content = lines.slice(1).join("\n").trim();
      await useNotesStore.getState().add(title, content);
    }
    await getCurrentWindow().close();
  };

  const saveRef = useRef(save);
  useEffect(() => { saveRef.current = save; });

  // Close when window loses focus
  useEffect(() => {
    const unlisten = listen("quick-note-blur", () => saveRef.current());
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
          if (e.key === "Escape") { e.preventDefault(); saveRef.current(); }
          if (e.key === "Enter" && e.metaKey) { e.preventDefault(); saveRef.current(); }
        }}
        placeholder="First line becomes the title…"
        className="flex-1 px-3 py-2.5 text-[13px] text-t1 bg-transparent outline-none resize-none placeholder-themed leading-relaxed"
      />
    </div>
  );
}
