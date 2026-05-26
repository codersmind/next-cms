"use client";

import ReactMarkdown, { type Components } from "react-markdown";
import remarkGfm from "remark-gfm";

const mdComponents: Components = {
  h1: ({ children }) => (
    <h1 className="text-2xl font-bold text-white mt-8 mb-4 first:mt-0 border-b border-zinc-800 pb-2">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-xl font-semibold text-white mt-8 mb-3 first:mt-0">{children}</h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-lg font-semibold text-zinc-100 mt-6 mb-2">{children}</h3>
  ),
  p: ({ children }) => <p className="text-zinc-300 leading-relaxed mb-4">{children}</p>,
  ul: ({ children }) => <ul className="list-disc pl-6 mb-4 space-y-1 text-zinc-300">{children}</ul>,
  ol: ({ children }) => <ol className="list-decimal pl-6 mb-4 space-y-1 text-zinc-300">{children}</ol>,
  li: ({ children }) => <li className="text-zinc-300">{children}</li>,
  a: ({ href, children }) => (
    <a
      href={href}
      className="text-indigo-400 hover:text-indigo-300 underline underline-offset-2"
      target={href?.startsWith("http") ? "_blank" : undefined}
      rel={href?.startsWith("http") ? "noopener noreferrer" : undefined}
    >
      {children}
    </a>
  ),
  code: ({ className, children, ...props }) => {
    const inline = !className;
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 rounded bg-zinc-800 text-indigo-300 text-[0.9em] font-mono" {...props}>
          {children}
        </code>
      );
    }
    return (
      <code className={`block font-mono text-sm text-zinc-200 ${className ?? ""}`} {...props}>
        {children}
      </code>
    );
  },
  pre: ({ children }) => (
    <pre className="mb-4 overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950 p-4 text-sm">
      {children}
    </pre>
  ),
  blockquote: ({ children }) => (
    <blockquote className="border-l-4 border-indigo-500/50 pl-4 my-4 text-zinc-400 italic">
      {children}
    </blockquote>
  ),
  table: ({ children }) => (
    <div className="mb-4 overflow-x-auto rounded-lg border border-zinc-800">
      <table className="min-w-full text-sm text-left">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-zinc-800/80 text-zinc-200">{children}</thead>,
  th: ({ children }) => (
    <th className="px-3 py-2 font-semibold border-b border-zinc-700">{children}</th>
  ),
  td: ({ children }) => (
    <td className="px-3 py-2 border-b border-zinc-800 text-zinc-300">{children}</td>
  ),
  hr: () => <hr className="my-8 border-zinc-800" />,
  strong: ({ children }) => <strong className="font-semibold text-zinc-100">{children}</strong>,
};

type Props = {
  markdown: string;
};

export function PluginMarkdownViewer({ markdown }: Props) {
  return (
    <article className="plugin-markdown max-w-3xl">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={mdComponents}>
        {markdown}
      </ReactMarkdown>
    </article>
  );
}
