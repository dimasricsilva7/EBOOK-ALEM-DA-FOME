import Link from "next/link";
import { Fragment } from "react";

/**
 * Texto do CMS com parágrafos e links no formato [texto](url). Sem HTML bruto
 * (proteção contra XSS): só aceita links relativos, âncoras e https.
 */
const LINK = /\[([^\]]{1,120})\]\(((?:\/|#|https:\/\/)[^\s)]{0,300})\)/g;

function inline(text: string) {
  const out: React.ReactNode[] = [];
  let last = 0;
  for (const m of text.matchAll(LINK)) {
    out.push(text.slice(last, m.index));
    const href = m[2];
    out.push(
      href.startsWith("https://") ? (
        <a key={m.index} href={href} target="_blank" rel="noopener noreferrer" className="font-semibold text-primary underline underline-offset-2">
          {m[1]}
        </a>
      ) : (
        <Link key={m.index} href={href} className="font-semibold text-primary underline underline-offset-2">
          {m[1]}
        </Link>
      )
    );
    last = (m.index ?? 0) + m[0].length;
  }
  out.push(text.slice(last));
  return out;
}

export function RichText({ text, className = "" }: { text: string | null | undefined; className?: string }) {
  if (!text) return null;
  const paragraphs = text.split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
  return (
    <div className={className}>
      {paragraphs.map((p, i) => (
        <p key={i} className={i ? "mt-3" : undefined}>
          {p.split("\n").map((line, j) => (
            <Fragment key={j}>
              {j > 0 && <br />}
              {inline(line)}
            </Fragment>
          ))}
        </p>
      ))}
    </div>
  );
}
