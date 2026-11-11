"use client";

import React from "react";
import ReactMarkdown from "react-markdown";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export default function MarkdownRenderer({ content, className = "" }: MarkdownRendererProps) {
  if (!content || !content.trim()) {
    return (
      <p className="text-zinc-500 italic text-xs">
        Penyelenggara belum menambahkan deskripsi khusus untuk turnamen ini.
      </p>
    );
  }

  return (
    <div className={`prose-arenatempur text-xs sm:text-sm text-zinc-300 leading-relaxed ${className}`}>
      <ReactMarkdown
        components={{
          h1: ({ node, ...props }) => (
            <h1 className="text-base sm:text-lg font-bold text-white font-heading tracking-tight mt-4 mb-2 pb-1 border-b border-zinc-800 flex items-center gap-2" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-sm sm:text-base font-bold text-amber-400 font-heading tracking-tight mt-4 mb-2 flex items-center gap-2" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-xs sm:text-sm font-bold text-zinc-100 uppercase tracking-wide mt-3 mb-1.5" {...props} />
          ),
          h4: ({ node, ...props }) => (
            <h4 className="text-xs font-bold text-zinc-200 mt-2 mb-1" {...props} />
          ),
          p: ({ node, ...props }) => (
            <p className="mb-2 text-zinc-300 leading-relaxed" {...props} />
          ),
          strong: ({ node, ...props }) => (
            <strong className="font-bold text-white" {...props} />
          ),
          em: ({ node, ...props }) => (
            <em className="italic text-zinc-200" {...props} />
          ),
          ul: ({ node, ...props }) => (
            <ul className="list-disc list-inside space-y-1 mb-3 text-zinc-300 ml-1" {...props} />
          ),
          ol: ({ node, ...props }) => (
            <ol className="list-decimal list-inside space-y-1 mb-3 text-zinc-300 ml-1 font-medium" {...props} />
          ),
          li: ({ node, ...props }) => (
            <li className="leading-relaxed" {...props} />
          ),
          hr: ({ node, ...props }) => (
            <hr className="border-zinc-800 my-4" {...props} />
          ),
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-2 border-amber-500/50 pl-3 py-1 my-2 italic text-zinc-400 bg-amber-500/5 rounded-r" {...props} />
          ),
          code: ({ node, ...props }) => (
            <code className="px-1.5 py-0.5 rounded bg-zinc-900 border border-zinc-800 font-mono text-amber-400 text-[11px]" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
