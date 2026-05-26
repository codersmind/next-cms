"use client";

import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

export type QuillEditorProps = React.ComponentProps<typeof ReactQuill>;

export default function QuillEditor(props: QuillEditorProps) {
  return <ReactQuill {...props} />;
}
