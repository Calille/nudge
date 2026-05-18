import type { Editor } from "@tiptap/react";
import {
  Bold,
  Heading1,
  Heading2,
  Heading3,
  Highlighter,
  Image as ImageIcon,
  Italic,
  Link as LinkIcon,
  List,
  ListOrdered,
  Minus,
  Palette,
  Strikethrough,
  Underline,
  AlignLeft,
  AlignCenter,
  AlignRight,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { MergeFieldPicker } from "./MergeFieldPicker";

interface Props {
  editor: Editor | null;
}

const PRESET_COLORS = [
  "#EDEDEF",
  "#3B82F6",
  "#22C55E",
  "#F59E0B",
  "#EF4444",
  "#A855F7",
];

export function EditorToolbar({ editor }: Props) {
  if (!editor) return null;

  return (
    <div className="flex items-center gap-0.5 flex-wrap px-2 py-1.5 border-b border-border bg-bg-subtle">
      <ToolButton
        active={editor.isActive("bold")}
        onClick={() => editor.chain().focus().toggleBold().run()}
        title="Bold"
      >
        <Bold size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("italic")}
        onClick={() => editor.chain().focus().toggleItalic().run()}
        title="Italic"
      >
        <Italic size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("underline")}
        onClick={() => editor.chain().focus().toggleUnderline().run()}
        title="Underline"
      >
        <Underline size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("strike")}
        onClick={() => editor.chain().focus().toggleStrike().run()}
        title="Strikethrough"
      >
        <Strikethrough size={14} />
      </ToolButton>

      <Divider />

      <ToolButton
        active={editor.isActive("heading", { level: 1 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 1 }).run()
        }
        title="Heading 1"
      >
        <Heading1 size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("heading", { level: 2 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 2 }).run()
        }
        title="Heading 2"
      >
        <Heading2 size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("heading", { level: 3 })}
        onClick={() =>
          editor.chain().focus().toggleHeading({ level: 3 }).run()
        }
        title="Heading 3"
      >
        <Heading3 size={14} />
      </ToolButton>

      <Divider />

      <ToolButton
        active={editor.isActive({ textAlign: "left" })}
        onClick={() => editor.chain().focus().setTextAlign("left").run()}
        title="Align left"
      >
        <AlignLeft size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive({ textAlign: "center" })}
        onClick={() => editor.chain().focus().setTextAlign("center").run()}
        title="Align centre"
      >
        <AlignCenter size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive({ textAlign: "right" })}
        onClick={() => editor.chain().focus().setTextAlign("right").run()}
        title="Align right"
      >
        <AlignRight size={14} />
      </ToolButton>

      <Divider />

      <ToolButton
        active={editor.isActive("bulletList")}
        onClick={() => editor.chain().focus().toggleBulletList().run()}
        title="Bullet list"
      >
        <List size={14} />
      </ToolButton>
      <ToolButton
        active={editor.isActive("orderedList")}
        onClick={() => editor.chain().focus().toggleOrderedList().run()}
        title="Numbered list"
      >
        <ListOrdered size={14} />
      </ToolButton>

      <Divider />

      <ToolButton
        onClick={() => {
          const previous = editor.getAttributes("link").href;
          const url = window.prompt("URL", previous ?? "https://");
          if (url === null) return;
          if (url === "") {
            editor.chain().focus().extendMarkRange("link").unsetLink().run();
            return;
          }
          editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
        }}
        title="Insert link"
      >
        <LinkIcon size={14} />
      </ToolButton>

      <ToolButton
        onClick={async () => {
          const src = window.prompt(
            "Image URL",
            "https://"
          );
          if (src) editor.chain().focus().setImage({ src }).run();
        }}
        title="Insert image"
      >
        <ImageIcon size={14} />
      </ToolButton>

      <ToolButton
        onClick={() => editor.chain().focus().setHorizontalRule().run()}
        title="Divider"
      >
        <Minus size={14} />
      </ToolButton>

      <Divider />

      <ColorPicker
        icon={<Palette size={14} />}
        title="Text colour"
        onPick={(c) => editor.chain().focus().setColor(c).run()}
        onClear={() => editor.chain().focus().unsetColor().run()}
      />
      <ColorPicker
        icon={<Highlighter size={14} />}
        title="Highlight"
        onPick={(c) =>
          editor.chain().focus().setHighlight({ color: c }).run()
        }
        onClear={() => editor.chain().focus().unsetHighlight().run()}
      />

      <Divider />

      <MergeFieldPicker
        onInsert={(token) => {
          editor.chain().focus().insertContent(token).run();
        }}
      />
    </div>
  );
}

function ToolButton({
  active,
  onClick,
  children,
  title,
}: {
  active?: boolean;
  onClick: () => void;
  children: React.ReactNode;
  title?: string;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className={cn(
        "h-8 w-8 inline-flex items-center justify-center rounded transition-colors",
        active
          ? "bg-accent/20 text-fg"
          : "text-fg-muted hover:text-fg hover:bg-bg-hover"
      )}
    >
      {children}
    </button>
  );
}

function Divider() {
  return <span className="w-px h-5 bg-border mx-1" />;
}

function ColorPicker({
  icon,
  title,
  onPick,
  onClear,
}: {
  icon: React.ReactNode;
  title: string;
  onPick: (color: string) => void;
  onClear: () => void;
}) {
  return (
    <div className="relative group">
      <button
        className="h-8 w-8 inline-flex items-center justify-center rounded text-fg-muted hover:text-fg hover:bg-bg-hover"
        title={title}
      >
        {icon}
      </button>
      <div className="absolute top-full left-0 mt-1 z-20 hidden group-hover:flex group-focus-within:flex bg-bg-elevated border border-border rounded shadow-panel p-2 gap-1">
        {PRESET_COLORS.map((c) => (
          <button
            key={c}
            onClick={() => onPick(c)}
            className="w-5 h-5 rounded border border-border"
            style={{ background: c }}
          />
        ))}
        <button
          onClick={onClear}
          className="w-5 h-5 rounded border border-border bg-bg text-[9px] text-fg-muted"
        >
          ✕
        </button>
      </div>
    </div>
  );
}
