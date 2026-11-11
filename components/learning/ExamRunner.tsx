'use client';

import { useEffect, useRef, useState } from 'react';
import Spinner from '@/components/Spinner';
import { submitExamAction } from '@/lib/learnActions';
import type { LearnDict } from '@/lib/i18n/learn';

type Q = { q: string; options: { value: number; label: string }[] };
type Text = Pick<LearnDict, 'examSeriousTitle' | 'examRules' | 'examAgree' | 'examBegin' | 'examCancelledTitle' | 'examCancelledText' | 'examWatch' | 'holderName' | 'holderHelp' | 'examSubmit' | 'retry'> & {
  question: string[];
  answerAll: string;
};

// The proctored final exam: rules first, then the questions, full screen where the browser allows it (not on
// iPhone). Leaving the page (another tab, another app, the window losing focus, or leaving full screen) cancels
// the attempt; the learner can start again at once, as often as they like.
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => void };
type FsEl = HTMLElement & { webkitRequestFullscreen?: () => void };
const fullscreenElement = () => document.fullscreenElement ?? (document as FsDoc).webkitFullscreenElement ?? null;
function enterFullscreen() {
  const el = document.documentElement as FsEl;
  try {
    if (el.requestFullscreen) return el.requestFullscreen().then(() => true, () => false);
    if (el.webkitRequestFullscreen) { el.webkitRequestFullscreen(); return Promise.resolve(true); }
  } catch {}
  return Promise.resolve(false);
}
function exitFullscreen() {
  if (!fullscreenElement()) return;
  try { (document.exitFullscreen ?? (document as FsDoc).webkitExitFullscreen)?.call(document); } catch {}
}
export default function ExamRunner({ program, questions, t, defaultName }: { program: string; questions: Q[]; t: Text; defaultName: string }) {
  const [phase, setPhase] = useState<'rules' | 'running' | 'cancelled'>('rules');
  const [agreed, setAgreed] = useState(false);
  const [sending, setSending] = useState(false);
  const startedAt = useRef(0);
  const submitting = useRef(false);
  const inFullscreen = useRef(false);

  // While the exam runs, the page shows the exam only (header, course bar and banner hidden): the same on every
  // device, including iPhones, where Safari does not let a page go full screen.
  useEffect(() => {
    if (phase !== 'running') return;
    document.documentElement.classList.add('exam-focus');
    return () => document.documentElement.classList.remove('exam-focus');
  }, [phase]);

  useEffect(() => {
    if (phase !== 'running') return;
    const leave = () => {
      // A short grace period after starting, and never once the learner submits.
      if (submitting.current || Date.now() - startedAt.current < 1500) return;
      setPhase('cancelled');
      exitFullscreen();
    };
    const onVisibility = () => document.visibilityState === 'hidden' && leave();
    // Leaving full screen (Esc) counts as leaving the exam, once it was entered.
    const onFullscreen = () => {
      if (fullscreenElement()) inFullscreen.current = true;
      else if (inFullscreen.current) { inFullscreen.current = false; leave(); }
    };
    document.addEventListener('fullscreenchange', onFullscreen);
    document.addEventListener('webkitfullscreenchange', onFullscreen);
    const warn = (e: BeforeUnloadEvent) => { if (!submitting.current) e.preventDefault(); };
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('blur', leave);
    window.addEventListener('beforeunload', warn);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      document.removeEventListener('fullscreenchange', onFullscreen);
      document.removeEventListener('webkitfullscreenchange', onFullscreen);
      window.removeEventListener('blur', leave);
      window.removeEventListener('beforeunload', warn);
    };
  }, [phase]);

  function start() {
    startedAt.current = Date.now();
    // Asked within the click, as browsers require; where it is refused or unsupported the exam simply runs.
    void enterFullscreen().then((ok) => { if (ok) inFullscreen.current = true; });
    setPhase('running');
    window.scrollTo(0, 0);
  }

  if (phase === 'cancelled') {
    return (
      <section className="space-module learn-cancelled" role="alert">
        <h2>{t.examCancelledTitle}</h2>
        <p>{t.examCancelledText}</p>
        <button className="btn btn-green" type="button" onClick={() => { setAgreed(false); setPhase('rules'); }}>{t.retry}</button>
      </section>
    );
  }

  if (phase === 'rules') {
    return (
      <section className="space-module learn-rules">
        <h2>{t.examSeriousTitle}</h2>
        <ul>{t.examRules.map((r) => <li key={r}>{r}</li>)}</ul>
        <label className="check">
          <input type="checkbox" checked={agreed} onChange={(e) => setAgreed(e.target.checked)} />
          <span>{t.examAgree}</span>
        </label>
        <div><button className="btn btn-green" type="button" disabled={!agreed} onClick={start}>{t.examBegin}</button></div>
      </section>
    );
  }

  return (
    <form
      action={submitExamAction}
      className="form"
      onSubmit={(e) => {
        const form = e.currentTarget;
        if (questions.some((_, i) => !form.querySelector(`input[name="q${i}"]:checked`))) {
          e.preventDefault();
          alert(t.answerAll);
          return;
        }
        submitting.current = true;
        setSending(true);
        exitFullscreen();
      }}
    >
      <input type="hidden" name="program" value={program} />
      <p className="learn-watch" role="status">{t.examWatch}</p>
      <div className="field">
        <label htmlFor="holder_name">{t.holderName}</label>
        <input id="holder_name" name="holder_name" defaultValue={defaultName} required autoComplete="name" />
        <p className="help">{t.holderHelp}</p>
      </div>
      <ol className="learn-questions">
        {questions.map((q, i) => (
          <li key={q.q}>
            <fieldset>
              <legend><small>{t.question[i]}</small>{q.q}</legend>
              {q.options.map((o) => (
                <label key={o.value} className="learn-option">
                  <input type="radio" name={`q${i}`} value={o.value} />
                  <span>{o.label}</span>
                </label>
              ))}
            </fieldset>
          </li>
        ))}
      </ol>
      <div><button className="btn btn-green" type="submit" disabled={sending}>{sending ? <><Spinner /></> : null}{t.examSubmit}</button></div>
    </form>
  );
}
