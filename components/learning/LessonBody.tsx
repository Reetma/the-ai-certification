import type { Body } from '@/lib/learning';

/** Lesson blocks: "## heading", "- bullet", "> key idea", "! example", "$ code", anything else a paragraph. */
export default function LessonBody({ body }: { body: Body }) {
  const out: React.ReactNode[] = [];
  let bullets: string[] = [];
  const flush = () => {
    if (bullets.length) out.push(<ul key={`ul-${out.length}`}>{bullets.map((b) => <li key={b}>{b}</li>)}</ul>);
    bullets = [];
  };
  body.forEach((block, i) => {
    if (block.startsWith('- ')) return void bullets.push(block.slice(2));
    flush();
    if (block.startsWith('## ')) out.push(<h4 key={i}>{block.slice(3)}</h4>);
    else if (block.startsWith('> ')) out.push(<p key={i} className="cx-tip">{block.slice(2)}</p>);
    else if (block.startsWith('! ')) out.push(<p key={i} className="cx-example">{block.slice(2)}</p>);
    else if (block.startsWith('$ ')) out.push(<pre key={i} className="cx-snippet"><code>{block.slice(2)}</code></pre>);
    else out.push(<p key={i}>{block}</p>);
  });
  flush();
  return <div className="cx-lesson-body">{out}</div>;
}

