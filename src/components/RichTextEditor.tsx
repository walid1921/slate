import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TaskList from "@tiptap/extension-task-list";
import TaskItem from "@tiptap/extension-task-item";
import Placeholder from "@tiptap/extension-placeholder";
import Highlight from "@tiptap/extension-highlight";
import { useEffect, useCallback } from "react";
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  Heading1, Heading2, List, ListOrdered, ListTodo,
  Code, Quote, Highlighter, Minus,
} from "lucide-react";

interface Props {
  value: string;
  onChange: (html: string) => void;
  onBlur?: () => void;
  placeholder?: string;
  className?: string;
  minHeight?: number;
}

type Level = 1 | 2 | 3;

interface ToolbarButtonProps {
  onClick: () => void;
  active?: boolean;
  title: string;
  children: React.ReactNode;
}

function ToolbarButton({ onClick, active, title, children }: ToolbarButtonProps) {
  return (
    <button
      type="button"
      onMouseDown={(e) => { e.preventDefault(); onClick(); }}
      title={title}
      className="flex items-center justify-center w-6 h-6 rounded transition-colors"
      style={{
        color: active ? "var(--c-text-1)" : "var(--c-text-3)",
        background: active ? "var(--c-surface-3)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <div className="w-px mx-0.5 self-stretch" style={{ background: "var(--c-border)" }} />;
}

export default function RichTextEditor({ value, onChange, onBlur, placeholder = "Write something…", className = "", minHeight = 120 }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        codeBlock: {
          HTMLAttributes: { class: "rte-code-block" },
        },
      }),
      Underline,
      Highlight.configure({ multicolor: false }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || "",
    onUpdate({ editor }) {
      onChange(editor.getHTML());
    },
    onBlur() {
      onBlur?.();
    },
    editorProps: {
      attributes: {
        class: "rte-prosemirror",
        style: `min-height: ${minHeight}px`,
      },
    },
  });

  // Sync external value changes (e.g. switching notes)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (current === value) return;
    // Preserve cursor position only if the editor is focused
    if (editor.isFocused) return;
    editor.commands.setContent(value || "");
  }, [value, editor]);

  const toggle = useCallback((cmd: () => boolean) => { cmd(); }, []);

  if (!editor) return null;

  return (
    <div className={`rte-root ${className}`}>
      {/* Toolbar */}
      <div className="rte-toolbar flex items-center gap-0.5 px-2 py-1 flex-wrap">
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleBold().run())} active={editor.isActive("bold")} title="Bold (⌘B)">
          <Bold size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleItalic().run())} active={editor.isActive("italic")} title="Italic (⌘I)">
          <Italic size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleUnderline().run())} active={editor.isActive("underline")} title="Underline (⌘U)">
          <UnderlineIcon size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleStrike().run())} active={editor.isActive("strike")} title="Strikethrough">
          <Strikethrough size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleHighlight().run())} active={editor.isActive("highlight")} title="Highlight">
          <Highlighter size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleCode().run())} active={editor.isActive("code")} title="Inline code">
          <Code size={11} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleHeading({ level: 1 as Level }).run())} active={editor.isActive("heading", { level: 1 })} title="Heading 1">
          <Heading1 size={12} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleHeading({ level: 2 as Level }).run())} active={editor.isActive("heading", { level: 2 })} title="Heading 2">
          <Heading2 size={12} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleBulletList().run())} active={editor.isActive("bulletList")} title="Bullet list">
          <List size={12} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleOrderedList().run())} active={editor.isActive("orderedList")} title="Numbered list">
          <ListOrdered size={12} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleTaskList().run())} active={editor.isActive("taskList")} title="Task list">
          <ListTodo size={12} />
        </ToolbarButton>

        <Divider />

        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleBlockquote().run())} active={editor.isActive("blockquote")} title="Blockquote">
          <Quote size={11} />
        </ToolbarButton>
        <ToolbarButton onClick={() => toggle(() => editor.chain().focus().toggleCodeBlock().run())} active={editor.isActive("codeBlock")} title="Code block">
          <Code size={11} strokeWidth={2.5} />
        </ToolbarButton>
        <ToolbarButton onClick={() => editor.chain().focus().setHorizontalRule().run()} title="Horizontal rule">
          <Minus size={11} />
        </ToolbarButton>
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}

/** Strip HTML tags to get plain text preview (for sidebar etc.) */
export function htmlToPlainText(html: string): string {
  return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
}
