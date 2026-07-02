import { useEditor, EditorContent, ReactRenderer } from "@tiptap/react";
import { BubbleMenu } from "@tiptap/react/menus";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import Link from "@tiptap/extension-link";
import { Table } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableHeader } from "@tiptap/extension-table-header";
import { TableCell } from "@tiptap/extension-table-cell";
import Color from "@tiptap/extension-color";
import { TextStyle } from "@tiptap/extension-text-style";
import Superscript from "@tiptap/extension-superscript";
import Subscript from "@tiptap/extension-subscript";
import CharacterCount from "@tiptap/extension-character-count";
import Mention from "@tiptap/extension-mention";
import { Extension } from "@tiptap/core";
import Suggestion from "@tiptap/suggestion";
import { useEffect, useCallback, useState, useRef } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, ListTodo,
  Code, Quote, Highlighter, Minus, Link2, Link2Off, ExternalLink,
  Table as TableIcon, Trash2,
  Superscript as SuperscriptIcon, Subscript as SubscriptIcon,
  Undo2, Redo2, Palette, ChevronLeft, ChevronRight, Rows2,
  Type, AlignLeft,
} from "lucide-react";
import MentionList, { MentionItem, MentionListRef } from "./editor/MentionList";
import SlashList, { SlashCommand, SlashListRef } from "./editor/SlashList";
import { useTodoStore } from "../store";

// ── TextStyle extended with fontSize ─────────────────────
const TextStyleExt = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize?.replace("px", "") || null,
        renderHTML: (attrs: Record<string, unknown>) =>
          attrs.fontSize ? { style: `font-size: ${attrs.fontSize}px` } : {},
      },
    };
  },
});

// ── Slash commands definition ─────────────────────────────
const SLASH_COMMANDS: SlashCommand[] = [
  { title: "Heading 1",     description: "Large heading",          Icon: Heading1,    action: e => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { title: "Heading 2",     description: "Medium heading",         Icon: Heading2,    action: e => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { title: "Bullet list",   description: "Unordered list",         Icon: List,        action: e => e.chain().focus().toggleBulletList().run() },
  { title: "Numbered list", description: "Ordered list",           Icon: ListOrdered, action: e => e.chain().focus().toggleOrderedList().run() },
  { title: "Task list",     description: "Checklist",              Icon: ListTodo,    action: e => e.chain().focus().toggleTaskList().run() },
  { title: "Blockquote",    description: "Quoted text",            Icon: Quote,       action: e => e.chain().focus().toggleBlockquote().run() },
  { title: "Code block",    description: "Monospace code",         Icon: Code,        action: e => e.chain().focus().toggleCodeBlock().run() },
  { title: "Table",         description: "Insert 3×3 table",       Icon: TableIcon,   action: e => e.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run() },
  { title: "Divider",       description: "Horizontal line",        Icon: Minus,       action: e => e.chain().focus().setHorizontalRule().run() },
];

// ── Generic suggestion popup factory ─────────────────────
function makeSuggestionRender<
  Ref extends { onKeyDown: (event: KeyboardEvent) => boolean },
  Item,
>(
  Component: React.ForwardRefExoticComponent<{ items: Item[]; command: (item: Item) => void } & React.RefAttributes<Ref>>,
) {
  return () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let renderer: ReactRenderer<Ref, any>;
    let container: HTMLDivElement;

    const pos = (clientRect: (() => DOMRect | null) | null | undefined) => {
      const r = clientRect?.();
      if (!r || !container) return;
      const below = window.innerHeight - r.bottom;
      if (below > 240) { container.style.top = `${r.bottom + 4}px`; container.style.bottom = "auto"; }
      else             { container.style.top = "auto"; container.style.bottom = `${window.innerHeight - r.top + 4}px`; }
      container.style.left = `${Math.min(r.left, window.innerWidth - 260)}px`;
    };

    return {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onStart(props: any) {
        container = document.createElement("div");
        container.style.cssText = "position:fixed;z-index:9999;";
        document.body.appendChild(container);
        pos(props.clientRect);
        renderer = new ReactRenderer(Component, { props, editor: props.editor });
        container.appendChild(renderer.element);
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      onUpdate(props: any) {
        renderer.updateProps(props);
        pos(props.clientRect);
      },
      onKeyDown({ event }: { event: KeyboardEvent }) {
        if (event.key === "Escape") { container?.remove(); return true; }
        return renderer.ref?.onKeyDown(event) ?? false;
      },
      onExit() { container?.remove(); renderer?.destroy(); },
    };
  };
}

// ── Slash commands TipTap extension ──────────────────────
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const SlashCommandsExtension = Extension.create<{ suggestion: any }>({
  name: "slashCommands",
  addOptions() { return { suggestion: {} }; },
  addProseMirrorPlugins() {
    return [Suggestion({ editor: this.editor, char: "/", allowSpaces: false, ...this.options.suggestion })];
  },
});

// ── Constants ────────────────────────────────────────────
const COLORS = [
  "#ef4444", "#f97316", "#eab308", "#22c55e",
  "#3b82f6", "#8b5cf6", "#ec4899", "#14b8a6",
  "#f8fafc", "#94a3b8", "#6b7280", "#334155",
];
const FONT_SIZES = ["11", "12", "13", "14", "16", "18", "20", "24"];

// ── Small UI helpers ──────────────────────────────────────
interface TBtnProps { onClick: () => void; active?: boolean; title: string; children: React.ReactNode; disabled?: boolean }
function TBtn({ onClick, active, title, children, disabled }: TBtnProps) {
  return (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick(); }} title={title} disabled={disabled}
      className="flex items-center justify-center w-6 h-6 rounded transition-colors disabled:opacity-30"
      style={{ color: active ? "var(--c-text-1)" : "var(--c-text-3)", background: active ? "var(--c-surface-3)" : "transparent" }}>
      {children}
    </button>
  );
}
function Sep() {
  return <div className="w-px mx-0.5 self-stretch" style={{ background: "var(--c-border)" }} />;
}
function TblBtn({ onClick, title, danger, children }: { onClick: () => void; title?: string; danger?: boolean; children: React.ReactNode }) {
  return (
    <button type="button" onMouseDown={e => { e.preventDefault(); onClick(); }} title={title}
      className="flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] transition-colors"
      style={{ color: danger ? "rgba(248,113,113,0.8)" : "var(--c-text-3)", background: "var(--c-surface-2)" }}>
      {children}
    </button>
  );
}

// ── Main component ────────────────────────────────────────
interface Props {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

export default function RichTextEditor({ value, onChange, onBlur, placeholder = "Write something…", className = "", minHeight = 120 }: Props) {
  const [linkInput, setLinkInput] = useState<string | null>(null);
  const [showColors, setShowColors] = useState(false);
  const [showFontSize, setShowFontSize] = useState(false);
  const linkInputRef = useRef<HTMLInputElement>(null);
  const colorWrapRef = useRef<HTMLDivElement>(null);
  const sizeWrapRef = useRef<HTMLDivElement>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { class: "rte-code-block" } } }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
      Link.configure({ openOnClick: false, HTMLAttributes: { class: "rte-link", rel: "noopener noreferrer" } }),
      Table.configure({ resizable: false, HTMLAttributes: { class: "rte-table" } }),
      TableRow, TableHeader, TableCell,
      TextStyleExt,
      Color,
      Superscript,
      Subscript,
      CharacterCount,
      Mention.configure({
        HTMLAttributes: { class: "rte-mention" },
        suggestion: {
          items: ({ query }: { query: string }) => {
            return useTodoStore.getState().todos
              .filter(t => t.text.toLowerCase().includes(query.toLowerCase()))
              .slice(0, 8)
              .map(t => ({ id: String(t.id), label: t.text } as MentionItem));
          },
          render: makeSuggestionRender<MentionListRef, MentionItem>(MentionList),
        },
      }),
      SlashCommandsExtension.configure({
        suggestion: {
          items: ({ query }: { query: string }) =>
            SLASH_COMMANDS.filter(c => c.title.toLowerCase().includes(query.toLowerCase())),
          render: makeSuggestionRender<SlashListRef, SlashCommand>(SlashList),
          command: ({ editor: ed, range, props: item }: { editor: ReturnType<typeof useEditor>; range: { from: number; to: number }; props: SlashCommand }) => {
            ed!.chain().focus().deleteRange(range).run();
            item.action(ed!);
          },
        },
      }),
    ],
    content: value || "",
    onUpdate({ editor: ed }) { onChange(ed.getHTML()); },
    onBlur() { onBlur?.(); },
    editorProps: {
      attributes: { class: "rte-prosemirror", style: `min-height: ${minHeight}px` },
      handleClick(_view: unknown, _pos: unknown, event: MouseEvent) {
        const link = (event.target as HTMLElement).closest("a");
        if (link) {
          const href = link.getAttribute("href");
          if (href) { event.preventDefault(); import("@tauri-apps/plugin-opener").then(({ openUrl }) => openUrl(href)).catch(() => {}); }
          return true;
        }
        return false;
      },
    },
  });

  // Sync external value changes (switching notes)
  useEffect(() => {
    if (!editor || editor.getHTML() === value || editor.isFocused) return;
    editor.commands.setContent(value || "");
  }, [value, editor]);

  // Focus link input
  useEffect(() => {
    if (linkInput !== null) setTimeout(() => linkInputRef.current?.focus(), 20);
  }, [linkInput]);

  // Close dropdowns on outside click
  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (!colorWrapRef.current?.contains(e.target as Node)) setShowColors(false);
      if (!sizeWrapRef.current?.contains(e.target as Node)) setShowFontSize(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const toggle = useCallback((cmd: () => boolean) => { cmd(); }, []);

  const handleLinkButton = () => {
    if (!editor) return;
    setLinkInput(editor.isActive("link") ? (editor.getAttributes("link").href ?? "") : "");
  };

  const applyLink = (url: string) => {
    if (!editor) return;
    const trimmed = url.trim();
    if (!trimmed) editor.chain().focus().unsetLink().run();
    else editor.chain().focus().setLink({ href: /^https?:\/\//.test(trimmed) ? trimmed : `https://${trimmed}` }).run();
    setLinkInput(null);
  };

  const openUrl = (raw: string) => {
    const href = /^https?:\/\//.test(raw.trim()) ? raw.trim() : `https://${raw.trim()}`;
    import("@tauri-apps/plugin-opener").then(({ openUrl: open }) => open(href)).catch(() => {});
  };

  if (!editor) return null;

  const isLinkActive = editor.isActive("link");
  const inTable = editor.isActive("table");
  const currentColor = editor.getAttributes("textStyle")?.color ?? "";
  const currentFontSize = editor.getAttributes("textStyle")?.fontSize ?? "";
  const wordCount = (editor.storage.characterCount as { words: () => number } | undefined)?.words() ?? 0;
  const charCount = (editor.storage.characterCount as { characters: () => number } | undefined)?.characters() ?? 0;

  return (
    <div className={`rte-root ${className}`}>

      {/* Bubble menu on text selection */}
      <BubbleMenu editor={editor}
        className="rte-bubble flex items-center gap-0.5 px-1.5 py-1 rounded-lg shadow-xl"
        style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)" }}>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleBold().run())} active={editor.isActive("bold")} title="Bold"><Bold size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleItalic().run())} active={editor.isActive("italic")} title="Italic"><Italic size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleUnderline().run())} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleStrike().run())} active={editor.isActive("strike")} title="Strike"><Strikethrough size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleCode().run())} active={editor.isActive("code")} title="Code"><Code size={11} /></TBtn>
        <Sep />
        <TBtn onClick={handleLinkButton} active={isLinkActive} title="Link"><Link2 size={11} /></TBtn>
        <Sep />
        {COLORS.slice(0, 6).map(c => (
          <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); }}
            className="w-4 h-4 rounded-sm shrink-0 transition-transform hover:scale-110"
            style={{ background: c, outline: currentColor === c ? "2px solid rgba(255,255,255,0.75)" : "none", outlineOffset: 1 }} />
        ))}
        <TBtn onClick={() => editor.chain().focus().unsetColor().run()} title="Clear color"><Palette size={10} /></TBtn>
      </BubbleMenu>

      {/* Main toolbar */}
      <div className="rte-toolbar flex items-center gap-0.5 px-2 py-1 flex-wrap">

        {/* Undo / Redo */}
        <TBtn onClick={() => editor.chain().focus().undo().run()} title="Undo (⌘Z)" disabled={!editor.can().undo()}><Undo2 size={11} /></TBtn>
        <TBtn onClick={() => editor.chain().focus().redo().run()} title="Redo (⌘⇧Z)" disabled={!editor.can().redo()}><Redo2 size={11} /></TBtn>
        <Sep />

        {/* Text style */}
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleBold().run())} active={editor.isActive("bold")} title="Bold (⌘B)"><Bold size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleItalic().run())} active={editor.isActive("italic")} title="Italic (⌘I)"><Italic size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleUnderline().run())} active={editor.isActive("underline")} title="Underline"><UnderlineIcon size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleStrike().run())} active={editor.isActive("strike")} title="Strikethrough"><Strikethrough size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleHighlight().run())} active={editor.isActive("highlight")} title="Highlight"><Highlighter size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleCode().run())} active={editor.isActive("code")} title="Inline code"><Code size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleSuperscript().run())} active={editor.isActive("superscript")} title="Superscript"><SuperscriptIcon size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleSubscript().run())} active={editor.isActive("subscript")} title="Subscript"><SubscriptIcon size={11} /></TBtn>
        <Sep />

        {/* Color picker */}
        <div className="relative" ref={colorWrapRef}>
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowColors(v => !v); setShowFontSize(false); }}
            title="Text color" className="flex items-center gap-0.5 px-1.5 h-6 rounded transition-colors"
            style={{ color: "var(--c-text-3)", background: showColors ? "var(--c-surface-3)" : "transparent" }}>
            <Palette size={11} />
            <div className="w-3 h-1.5 rounded-sm" style={{ background: currentColor || "var(--c-text-3)" }} />
          </button>
          {showColors && (
            <div className="absolute top-full left-0 mt-1 p-2 rounded-lg shadow-xl z-50 grid grid-cols-6 gap-1"
              style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)", minWidth: 126 }}>
              {COLORS.map(c => (
                <button key={c} type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setColor(c).run(); setShowColors(false); }}
                  className="w-5 h-5 rounded transition-transform hover:scale-110"
                  style={{ background: c, outline: currentColor === c ? "2px solid rgba(255,255,255,0.75)" : "none", outlineOffset: 1 }} />
              ))}
              <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetColor().run(); setShowColors(false); }}
                className="w-5 h-5 rounded flex items-center justify-center col-span-2 text-[9px]"
                style={{ background: "var(--c-surface-3)", color: "var(--c-text-4)" }}>clear</button>
            </div>
          )}
        </div>

        {/* Font size */}
        <div className="relative" ref={sizeWrapRef}>
          <button type="button" onMouseDown={e => { e.preventDefault(); setShowFontSize(v => !v); setShowColors(false); }}
            title="Font size" className="flex items-center gap-0.5 px-1.5 h-6 rounded text-[10px] transition-colors"
            style={{ color: "var(--c-text-3)", background: showFontSize ? "var(--c-surface-3)" : "transparent", minWidth: 34 }}>
            <Type size={10} />
            <span>{currentFontSize || "–"}</span>
          </button>
          {showFontSize && (
            <div className="absolute top-full left-0 mt-1 rounded-lg shadow-xl z-50 py-1 overflow-hidden"
              style={{ background: "var(--c-tooltip)", border: "1px solid var(--c-border)", minWidth: 72 }}>
              {FONT_SIZES.map(s => (
                <button key={s} type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().setMark("textStyle", { fontSize: s }).run(); setShowFontSize(false); }}
                  className="w-full text-left px-3 py-1 text-[12px] transition-colors"
                  style={{ color: currentFontSize === s ? "var(--c-text-1)" : "var(--c-text-3)", background: currentFontSize === s ? "var(--c-surface-2)" : "transparent" }}>
                  {s}px
                </button>
              ))}
              <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetMark("textStyle").run(); setShowFontSize(false); }}
                className="w-full text-left px-3 py-1 text-[10px] transition-colors"
                style={{ color: "var(--c-text-5)", borderTop: "1px solid var(--c-border-subtle)" }}>
                reset
              </button>
            </div>
          )}
        </div>
        <Sep />

        {/* Headings */}
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleHeading({ level: 1 }).run())} active={editor.isActive("heading", { level: 1 })} title="Heading 1"><Heading1 size={12} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleHeading({ level: 2 }).run())} active={editor.isActive("heading", { level: 2 })} title="Heading 2"><Heading2 size={12} /></TBtn>
        <Sep />

        {/* Lists */}
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleBulletList().run())} active={editor.isActive("bulletList")} title="Bullet list"><List size={12} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleOrderedList().run())} active={editor.isActive("orderedList")} title="Numbered list"><ListOrdered size={12} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleTaskList().run())} active={editor.isActive("taskList")} title="Task list"><ListTodo size={12} /></TBtn>
        <Sep />

        {/* Blocks */}
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleBlockquote().run())} active={editor.isActive("blockquote")} title="Blockquote"><Quote size={11} /></TBtn>
        <TBtn onClick={() => toggle(() => editor.chain().focus().toggleCodeBlock().run())} active={editor.isActive("codeBlock")} title="Code block"><Code size={11} strokeWidth={2.5} /></TBtn>
        <TBtn onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule"><Minus size={11} /></TBtn>
        <Sep />

        {/* Link */}
        <TBtn onClick={handleLinkButton} active={isLinkActive} title={isLinkActive ? "Edit link" : "Add link"}><Link2 size={11} /></TBtn>
        <Sep />

        {/* Table */}
        <TBtn onClick={() => editor.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()} active={inTable} title="Insert table"><TableIcon size={11} /></TBtn>

        {/* Hint */}
        <div className="ml-auto flex items-center gap-2">
          <AlignLeft size={9} style={{ color: "var(--c-text-5)" }} />
          <span className="text-[9px]" style={{ color: "var(--c-text-5)" }}>/ commands · @ mention</span>
        </div>
      </div>

      {/* Table context bar */}
      {inTable && (
        <div className="flex items-center gap-1 px-2 py-1 flex-wrap"
          style={{ borderBottom: "1px solid var(--c-border-subtle)", background: "var(--c-surface-1)" }}>
          <span className="text-[10px] mr-0.5" style={{ color: "var(--c-text-4)" }}>col</span>
          <TblBtn onClick={() => editor.chain().focus().addColumnBefore().run()} title="Add column before"><ChevronLeft size={9} />add</TblBtn>
          <TblBtn onClick={() => editor.chain().focus().addColumnAfter().run()} title="Add column after">add<ChevronRight size={9} /></TblBtn>
          <TblBtn onClick={() => editor.chain().focus().deleteColumn().run()} danger title="Delete column">del</TblBtn>
          <Sep />
          <span className="text-[10px] mr-0.5" style={{ color: "var(--c-text-4)" }}>row</span>
          <TblBtn onClick={() => editor.chain().focus().addRowBefore().run()} title="Add row above"><Rows2 size={9} />↑</TblBtn>
          <TblBtn onClick={() => editor.chain().focus().addRowAfter().run()} title="Add row below">↓<Rows2 size={9} /></TblBtn>
          <TblBtn onClick={() => editor.chain().focus().deleteRow().run()} danger title="Delete row">del</TblBtn>
          <Sep />
          <TblBtn onClick={() => editor.chain().focus().toggleHeaderRow().run()} title="Toggle header row">header</TblBtn>
          <Sep />
          <TblBtn onClick={() => editor.chain().focus().deleteTable().run()} danger title="Delete table"><Trash2 size={9} />table</TblBtn>
        </div>
      )}

      {/* Link input */}
      {linkInput !== null && (
        <div className="flex items-center gap-1.5 px-2 py-1.5"
          style={{ borderBottom: "1px solid var(--c-border-subtle)", background: "var(--c-surface-1)" }}>
          <Link2 size={10} style={{ color: "var(--c-text-4)", flexShrink: 0 }} />
          <input ref={linkInputRef} value={linkInput} onChange={e => setLinkInput(e.target.value)}
            onKeyDown={e => {
              if (e.key === "Enter") { e.preventDefault(); applyLink(linkInput); }
              if (e.key === "Escape") { e.preventDefault(); setLinkInput(null); editor.commands.focus(); }
            }}
            placeholder="https://…"
            className="flex-1 text-[12px] outline-none bg-transparent placeholder-themed"
            style={{ color: "var(--c-text-2)" }} />
          {linkInput.trim() && (
            <button type="button" onMouseDown={e => { e.preventDefault(); openUrl(linkInput); }}
              title="Open URL" className="w-5 h-5 flex items-center justify-center" style={{ color: "var(--c-text-4)" }}>
              <ExternalLink size={10} />
            </button>
          )}
          {isLinkActive && (
            <button type="button" onMouseDown={e => { e.preventDefault(); editor.chain().focus().unsetLink().run(); setLinkInput(null); }}
              title="Remove link" className="w-5 h-5 flex items-center justify-center" style={{ color: "var(--c-text-4)" }}>
              <Link2Off size={10} />
            </button>
          )}
          <button type="button" onMouseDown={e => { e.preventDefault(); applyLink(linkInput); }}
            className="px-2 py-0.5 rounded text-[11px] text-white" style={{ background: "rgba(99,102,241,0.85)" }}>
            {isLinkActive ? "Update" : "Set"}
          </button>
          <button type="button" onMouseDown={e => { e.preventDefault(); setLinkInput(null); editor.commands.focus(); }}
            className="text-[11px]" style={{ color: "var(--c-text-4)" }}>Cancel</button>
        </div>
      )}

      {/* Editor body */}
      <EditorContent editor={editor} />

      {/* Word / char count footer */}
      <div className="flex justify-end px-1 pt-0.5 pb-0.5" style={{ borderTop: "1px solid var(--c-border-subtle)" }}>
        <span className="text-[10px]" style={{ color: "var(--c-text-5)" }}>
          {wordCount} {wordCount === 1 ? "word" : "words"} · {charCount} chars
        </span>
      </div>
    </div>
  );
}

export { type Props as RichTextEditorProps };

/** Strip HTML tags to get plain text preview */
export function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
