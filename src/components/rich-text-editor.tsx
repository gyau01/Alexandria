"use client";

import { useRef } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { TextStyle, FontFamily, FontSize } from "@tiptap/extension-text-style";
import { createClient } from "../../supabase/client";
import { Button } from "@/components/ui/button";
import {
  Bold,
  Italic,
  List,
  ListOrdered,
  Image as ImageIcon,
} from "lucide-react";

const FONT_FAMILIES = [
  { label: "Default", value: "" },
  { label: "Sans", value: "Arial, Helvetica, sans-serif" },
  { label: "Serif", value: "Georgia, 'Times New Roman', serif" },
  { label: "Mono", value: "'Courier New', monospace" },
];

const FONT_SIZES = [
  { label: "Size", value: "" },
  { label: "Small", value: "12px" },
  { label: "Normal", value: "16px" },
  { label: "Large", value: "24px" },
  { label: "Huge", value: "32px" },
];

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  userId: string;
  placeholder?: string;
}

export default function RichTextEditor({
  value,
  onChange,
  userId,
}: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextStyle,
      FontFamily.configure({ types: ["textStyle"] }),
      FontSize.configure({ types: ["textStyle"] }),
      Image.configure({ inline: false, allowBase64: false }),
    ],
    content: value,
    editorProps: {
      attributes: {
        class:
          "min-h-[180px] w-full rounded-b-md px-3 py-2 focus:outline-none [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_img]:rounded-lg [&_img]:my-2 [&_img]:max-w-full",
      },
    },
    onUpdate: ({ editor }) => {
      onChange(editor.getHTML());
    },
  });

  if (!editor) {
    return (
      <div className="min-h-[220px] rounded-md border border-border" />
    );
  }

  const uploadImage = async (file: File): Promise<string | null> => {
    const supabase = createClient();
    const fileExt = file.name.split(".").pop();
    const fileName = `${userId}/community-${Date.now()}.${fileExt}`;
    const { error } = await supabase.storage
      .from("chat-images")
      .upload(fileName, file);
    if (error) {
      console.error("Image upload error:", error);
      return null;
    }
    const {
      data: { publicUrl },
    } = supabase.storage.from("chat-images").getPublicUrl(fileName);
    return publicUrl;
  };

  const handleImageChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const url = await uploadImage(file);
      if (url) {
        editor.chain().focus().setImage({ src: url }).run();
      } else {
        alert("Failed to upload image. Please try again.");
      }
    }
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const btn = (active: boolean) =>
    `h-8 w-8 p-0 ${active ? "bg-accent" : ""}`;

  return (
    <div className="rounded-md border border-border">
      <div className="flex flex-wrap items-center gap-1 border-b border-border p-2">
        <select
          className="h-8 rounded border border-border bg-background px-1 text-sm"
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontFamily(e.target.value).run()
              : editor.chain().focus().unsetFontFamily().run()
          }
          value={editor.getAttributes("textStyle").fontFamily || ""}
        >
          {FONT_FAMILIES.map((f) => (
            <option key={f.label} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>

        <select
          className="h-8 rounded border border-border bg-background px-1 text-sm"
          onChange={(e) =>
            e.target.value
              ? editor.chain().focus().setFontSize(e.target.value).run()
              : editor.chain().focus().unsetFontSize().run()
          }
          value={editor.getAttributes("textStyle").fontSize || ""}
        >
          {FONT_SIZES.map((s) => (
            <option key={s.label} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <span className="mx-1 h-5 w-px bg-border" />

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(editor.isActive("bold"))}
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          <Bold className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(editor.isActive("italic"))}
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          <Italic className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(editor.isActive("bulletList"))}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
        >
          <List className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(editor.isActive("orderedList"))}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
        >
          <ListOrdered className="h-4 w-4" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className={btn(false)}
          onClick={() => fileInputRef.current?.click()}
        >
          <ImageIcon className="h-4 w-4" />
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageChange}
          className="hidden"
        />
      </div>

      <EditorContent editor={editor} />
    </div>
  );
}
