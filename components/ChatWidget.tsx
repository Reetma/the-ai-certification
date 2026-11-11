'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import Spinner from '@/components/Spinner';
import { SITE_DOMAIN } from '@/lib/site';

// The floating assistant (bottom right): answers questions about The AI Certification and helps visitors register.

type Message = { role: 'user' | 'assistant'; content: string };

// Pages where the bubble would get in the way: the private spaces and sign-in.
const HIDDEN = [/^\/admin(\/|$)/, /^\/ambassador(\/|$)/, /^\/space/, /^\/login/];
const STORE = 'cfx_chat';

const SUGGESTIONS = ['C’est quoi la certification IA ?', 'Combien ça coûte ?', 'Is it for me?'];

/** Turns plain URLs into links; everything else stays text. */
function Linkified({ text }: { text: string }) {
  const parts = text.split(/(https?:\/\/[^\s)]+[^\s).,;!?])/g);
  return (
    <>
      {parts.map((p, i) =>
        /^https?:\/\//.test(p) ? <a key={i} href={p}>{p.replace(/^https?:\/\/(www\.)?/, '')}</a> : <span key={i}>{p}</span>,
      )}
    </>
  );
}

export default function ChatWidget() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [busy, setBusy] = useState(false);
  const listRef = useRef<HTMLDivElement>(null);

  // The conversation survives page changes within the visit.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(STORE);
      if (saved) setMessages(JSON.parse(saved));
    } catch {}
  }, []);
  useEffect(() => {
    try {
      sessionStorage.setItem(STORE, JSON.stringify(messages));
    } catch {}
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  if (HIDDEN.some((r) => r.test(pathname))) return null;

  async function send(text: string) {
    const question = text.trim();
    if (!question || busy) return;
    const history: Message[] = [...messages, { role: 'user', content: question }];
    setMessages([...history, { role: 'assistant', content: '' }]);
    setInput('');
    setBusy(true);
    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) throw new Error(String(res.status));
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let answer = '';
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        answer += decoder.decode(value, { stream: true });
        setMessages([...history, { role: 'assistant', content: answer }]);
      }
    } catch {
      setMessages([...history, { role: 'assistant', content: `Oups, je n’arrive pas à répondre pour le moment. Réessaie dans un instant, ou ouvre un ticket sur ${SITE_DOMAIN}/support.` }]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="chat">
      {open && (
        <section className="chat-panel" aria-label="Assistant The AI Certification">
          <header className="chat-head">
            <img src="/assets/kai-avatar.png" alt="" width={32} height={32} style={{ borderRadius: "50%" }} />
            <div>
              <strong>Assistant The AI Certification</strong>
              <small>Réponses instantanées</small>
            </div>
            <button type="button" className="chat-close" aria-label="Fermer" onClick={() => setOpen(false)}>×</button>
          </header>
          <div className="chat-list" ref={listRef} aria-live="polite">
            <p className="chat-msg is-assistant">
              Salut ! Je réponds à toutes tes questions sur The AI Certification et je t’aide à choisir ta certification. Hi! Ask me anything, in any language.
            </p>
            {messages.map((m, i) => (
              <p key={i} className={`chat-msg is-${m.role}`}>
                {m.content ? <Linkified text={m.content} /> : <Spinner size={20} label="…" />}
              </p>
            ))}
            {messages.length === 0 && (
              <div className="chat-suggestions">
                {SUGGESTIONS.map((s) => (
                  <button key={s} type="button" onClick={() => send(s)}>{s}</button>
                ))}
              </div>
            )}
          </div>
          <form className="chat-form" onSubmit={(e) => { e.preventDefault(); send(input); }}>
            <label className="skip" htmlFor="chat-input">Ta question</label>
            <input id="chat-input" value={input} onChange={(e) => setInput(e.target.value)} placeholder="Pose ta question…" maxLength={1500} autoComplete="off" />
            <button type="submit" className="btn btn-green btn-sm" disabled={busy || !input.trim()}>Envoyer</button>
          </form>
        </section>
      )}
      <button type="button" className="chat-bubble" aria-expanded={open} aria-label={open ? 'Fermer l’assistant' : 'Ouvrir l’assistant'} onClick={() => setOpen(!open)}>
        <img src="/assets/kai-avatar.png" alt="" width={44} height={44} style={{ borderRadius: "50%" }} />
      </button>
    </div>
  );
}
