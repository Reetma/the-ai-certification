'use client';

import { useEffect, useRef, useState } from 'react';
import { dict } from '@/lib/i18n';
import { LOCALES, type Locale } from '@/lib/locales';

const MATCH = 92;

// Timeline (ms)
const TYPE_SPEED = 28;
const STEP_TIME = 1100;
const HOLD_END = 4200;

type State = { typed: number; step: number; result: boolean; match: number };
const START: State = { typed: 0, step: -1, result: false, match: 0 };

export default function AgentDemo({ locale }: { locale: Locale }) {
  const t = dict(locale).agent;
  const PROMPT = t.prompt;
  const STEPS = t.steps;
  const DONE: State = { typed: PROMPT.length, step: STEPS.length, result: true, match: MATCH };
  const place = LOCALES[locale].example;
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);
  const [s, setS] = useState<State>(DONE); // server render and reduced motion show the final state

  // Start only once the demo scrolls into view.
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setVisible(e.isIntersecting), { threshold: 0.35 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  useEffect(() => {
    if (!visible) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setS(DONE);
      return;
    }

    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));

    function run() {
      setS(START);
      let t = 400;
      for (let i = 1; i <= PROMPT.length; i++) {
        at(t, () => setS((p) => ({ ...p, typed: i })));
        t += TYPE_SPEED;
      }
      t += 350;
      STEPS.forEach((_, i) => {
        at(t, () => setS((p) => ({ ...p, step: i })));
        t += STEP_TIME;
      });
      at(t, () => setS((p) => ({ ...p, step: STEPS.length, result: true })));
      // Count the match score up.
      for (let m = 1; m <= MATCH; m++) {
        at(t + 150 + m * 9, () => setS((p) => ({ ...p, match: m })));
      }
      t += 150 + MATCH * 9 + HOLD_END;
      at(t, run);
    }

    run();
    return () => timers.forEach(clearTimeout);
  }, [visible, PROMPT, STEPS]);

  const typing = s.typed < PROMPT.length;

  return (
    <div
      ref={ref}
      className="agent-demo"
      role="img"
      aria-label={t.aria(place)}
    >
      <div aria-hidden="true">
        <div className="agent-head">
          <strong>{t.name}</strong>
          <span className={`agent-status${s.result ? ' is-done' : s.step >= 0 ? ' is-busy' : ''}`}>
            {s.result ? t.done : s.step >= 0 ? t.working : t.ready}
          </span>
        </div>
        <p className="agent-prompt">
          {PROMPT.slice(0, s.typed)}
          {typing && <span className="caret" />}
        </p>
        <ul className="agent-steps is-animated">
          {STEPS.map((label, i) => {
            const state = s.step > i ? 'done' : s.step === i ? 'busy' : 'todo';
            return (
              <li key={label} className={`step-${state}`}>
                <span className="step-icon">
                  {state === 'done' && (
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="M5 12l5 5 9-10" /></svg>
                  )}
                </span>
                {label}
              </li>
            );
          })}
        </ul>
        <div className={`agent-result${s.result ? ' is-shown' : ''}`}>
          <span className="match">{t.match(s.match)}</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: 'var(--green-dark)' }}>{t.best}</span>
          <h3 style={{ margin: '4px 0' }}>{t.role}</h3>
          <p style={{ margin: 0, color: 'var(--muted)' }}>{place} · {t.hybrid}</p>
          <p style={{ margin: '10px 0 0' }}>{t.draft}</p>
        </div>
      </div>
    </div>
  );
}
