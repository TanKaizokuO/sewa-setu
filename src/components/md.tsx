// Tiny markdown renderer for assistant replies: paragraphs, bullet/numbered lists, **bold**.
import { Fragment } from "react";

function inline(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((p, i) =>
    p.startsWith("**") && p.endsWith("**") ? <strong key={i}>{p.slice(2, -2)}</strong> : <Fragment key={i}>{p}</Fragment>,
  );
}

export function Md({ text }: { text: string }) {
  const lines = text.split("\n");
  const out: React.ReactNode[] = [];
  let list: string[] = [];
  const flush = () => {
    if (list.length) {
      out.push(
        <ul key={`l${out.length}`} className="my-1 list-disc space-y-0.5 pl-5">
          {list.map((l, i) => (
            <li key={i}>{inline(l)}</li>
          ))}
        </ul>,
      );
      list = [];
    }
  };
  for (const raw of lines) {
    const line = raw.trim();
    const m = line.match(/^([-*•]|\d+[.)])\s+(.*)$/);
    if (m) list.push(m[2]);
    else {
      flush();
      if (line) out.push(<p key={`p${out.length}`} className="my-1">{inline(line.replace(/^#+\s*/, ""))}</p>);
    }
  }
  flush();
  return <div className="text-sm leading-relaxed">{out}</div>;
}
