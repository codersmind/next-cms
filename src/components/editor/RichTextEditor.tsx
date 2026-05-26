"use client";

import dynamic from "next/dynamic";
import "./quill-admin.css";

const QuillEditor = dynamic(() => import("./QuillEditor"), {
  ssr: false,
  loading: () => (
    <div
      className="rich-text-editor min-h-[12rem] rounded border border-zinc-700 bg-zinc-900/50 animate-pulse"
      aria-hidden
    />
  ),
});

const modules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ["bold", "italic", "underline", "strike"],
    [{ list: "ordered" }, { list: "bullet" }],
    [{ indent: "-1" }, { indent: "+1" }],
    ["link"],
    ["clean"],
  ],
};

export interface RichTextEditorProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  readOnly?: boolean;
}

export function RichTextEditor({
  value,
  onChange,
  placeholder = "Write content…",
  className,
  readOnly,
}: RichTextEditorProps) {
  return (
    <div className={className}>
      <QuillEditor
        theme="snow"
        value={value ?? ""}
        onChange={onChange}
        placeholder={placeholder}
        readOnly={readOnly}
        modules={modules}
        className="rich-text-editor"
      />
    </div>
  );
}
