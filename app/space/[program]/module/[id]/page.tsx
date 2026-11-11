import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { LearnerHeader } from '@/components/private/ConsoleHeaders';
import CourseBar from '@/components/learning/CourseBar';
import LessonBody from '@/components/learning/LessonBody';
import { requireLearner } from '@/components/learning/learner';
import { sql } from '@/lib/db';
import { learn } from '@/lib/i18n/learn';
import { QUIZ_PASS, shuffledOrder } from '@/lib/learning';
import { submitExerciseAction, submitQuizAction, toggleLessonAction } from '@/lib/learnActions';
import { formatDate, LOCALES } from '@/lib/locales';
import { STUDENT_PROGRAM } from '@/lib/catalog';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The AI Certification', robots: { index: false, follow: false } };

type Props = { params: Promise<{ program: string; id: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// One module: its lessons (read, then mark as done), its exercise and its quiz.
export default async function ModulePage({ params, searchParams }: Props) {
  const { program, id } = await params;
  const query = await searchParams;
  const { user, progress } = await requireLearner(program);
  const { locale, course } = progress;
  const l = learn(locale);
  const index = course.modules.findIndex((m) => m.id === id);
  if (index < 0) notFound();
  const m = course.modules[index];
  const state = progress.modules[index];

  const [submission] = await sql('select content, submitted_at from exercise_submissions where user_id = $1 and program = $2 and exercise_id = $3', [user.id, course.program, m.exercise.id]);
  // The attempt just submitted, to show the corrections.
  const attemptId = String(query.attempt ?? '');
  const [attempt] = attemptId ? await sql('select score, total, answers from quiz_attempts where id::text = $1 and user_id = $2', [attemptId, user.id]) : [];
  const chosen: (number | null)[] | null = attempt ? (typeof attempt.answers === 'string' ? JSON.parse(attempt.answers) : attempt.answers) : null;
  const next = course.modules[index + 1];

  return (
    <div lang={LOCALES[locale].lang}>
      <LearnerHeader user={user} locale={locale} />
      <main id="main" className="register hero-bands bands-clip">
        <div className="container" style={{ maxWidth: 820 }}>
          <CourseBar program={program} progress={progress} current={m.id} l={l} />
          <section className="sp-hero sp-hero-module">
            <div className="sp-hero-text">
              <span className="eyebrow">{l.module(index + 1)}</span>
              <h1>{m.title}</h1>
              <p className="lead" style={{ margin: 0 }}>{m.summary}</p>
            </div>
            {/* Illustration of the module: public/assets/course/<module id>.png */}
            <img className="sp-hero-mascot" src={`/assets/course/${m.id}.webp`} alt="" width={200} height={200} />
          </section>

          <section className="space-module">
            <h2>{l.checklist}</h2>
            <ul className="learn-checklist">
              <li className={state.lessonsDone === state.lessonsTotal ? 'is-done' : ''}><span className="lesson-check" />{l.checkLessons} ({state.lessonsDone}/{state.lessonsTotal})</li>
              <li className={state.exerciseDone ? 'is-done' : ''}><span className="lesson-check" />{l.checkExercise}</li>
              <li className={state.quizPassed ? 'is-done' : ''}><span className="lesson-check" />{l.checkQuiz(QUIZ_PASS, m.quiz.length)}</li>
            </ul>
          </section>

          <h2 className="learn-section">{l.lessons}</h2>
          {m.lessons.map((lesson) => {
            const isDone = progress.done.has(lesson.id);
            return (
              <article key={lesson.id} id={lesson.id} className={`space-module learn-lesson${isDone ? ' is-done' : ''}`}>
                <details open={!isDone}>
                  <summary>
                    <span className="lesson-check" aria-hidden="true" />
                    <span>{lesson.title}</span>
                    <small>{l.minutes(lesson.minutes)}</small>
                  </summary>
                  {/* CC0 photo of the lesson (StockSnap), see public/images/course/CREDITS.md */}
                  {(lesson.image || program === STUDENT_PROGRAM) && (
                    <img className="learn-photo" src={lesson.image ?? `/images/course/${lesson.id}.webp`} alt="" width={960} height={640} loading="lazy" />
                  )}
                  <LessonBody body={lesson.body} />
                  <form action={toggleLessonAction}>
                    <input type="hidden" name="program" value={program} />
                    <input type="hidden" name="lesson" value={lesson.id} />
                    <input type="hidden" name="done" value={isDone ? '0' : '1'} />
                    <button className={`btn btn-sm ${isDone ? 'btn-ghost' : 'btn-green'}`} type="submit">{isDone ? l.undo : l.markDone}</button>
                  </form>
                </details>
              </article>
            );
          })}

          <section id="exercise" className="space-module">
            <span className="eyebrow">{l.exercise} · {l.minutes(m.exercise.minutes)}</span>
            <h2>{m.exercise.title}</h2>
            <p>{m.exercise.intro}</p>
            <h3 style={{ fontSize: 16 }}>{l.steps}</h3>
            <ol>{m.exercise.steps.map((s) => <li key={s}>{s}</li>)}</ol>
            <form action={submitExerciseAction} className="form">
              <input type="hidden" name="program" value={program} />
              <input type="hidden" name="module" value={m.id} />
              <div className="field">
                <label htmlFor="content">{m.exercise.submission}</label>
                <textarea id="content" name="content" rows={8} defaultValue={submission?.content ?? ''} required />
              </div>
              {query.exercise === 'short' && <p className="error" role="alert">{l.tooShort}</p>}
              {submission && <p className="help">{l.submitted(formatDate(new Date(submission.submitted_at).toISOString(), locale))}</p>}
              <div><button className="btn btn-green" type="submit">{submission ? l.resubmit : l.submit}</button></div>
            </form>
          </section>

          <section id="quiz" className="space-module">
            <span className="eyebrow">{l.quiz}</span>
            <h2>{l.quiz}</h2>
            <p className="help">{l.quizLead(QUIZ_PASS, m.quiz.length)}</p>
            {attempt && (
              <p className={attempt.score >= QUIZ_PASS ? 'price-alert learn-pass' : 'price-alert'} role="status">
                <strong>{l.score(attempt.score, attempt.total)}</strong> · {attempt.score >= QUIZ_PASS ? l.quizPassed : l.quizFailed}
              </p>
            )}
            {!attempt && state.quizBest !== null && <p className="help">{l.best(state.quizBest, m.quiz.length)}</p>}
            {query.quiz === 'incomplete' && <p className="error" role="alert">{l.answerAll}</p>}

            {chosen ? (
              <>
                <ol className="learn-questions">
                  {m.quiz.map((q, i) => {
                    const right = chosen[i] === q.answer;
                    return (
                      <li key={q.q}>
                        <strong>{q.q}</strong>
                        <p className={right ? 'learn-right' : 'learn-wrong'}>{right ? l.correct : l.incorrect} · {q.options[chosen[i] ?? 0]}</p>
                        {!right && <p className="learn-right">✓ {q.options[q.answer]}</p>}
                        <p className="help">{q.why}</p>
                      </li>
                    );
                  })}
                </ol>
                <p><Link className="btn btn-ghost" href={`/space/${program}/module/${m.id}#quiz`}>{l.retry}</Link></p>
              </>
            ) : (
              <form action={submitQuizAction} className="form">
                <input type="hidden" name="program" value={program} />
              <input type="hidden" name="module" value={m.id} />
                <ol className="learn-questions">
                  {m.quiz.map((q, i) => (
                    <li key={q.q}>
                      <fieldset>
                        <legend>{q.q}</legend>
                        {shuffledOrder(`${user.id}:${m.id}:${i}`, q.options.length).map((o) => (
                          <label key={o} className="learn-option">
                            <input type="radio" name={`q${i}`} value={o} required />
                            <span>{q.options[o]}</span>
                          </label>
                        ))}
                      </fieldset>
                    </li>
                  ))}
                </ol>
                <div><button className="btn btn-green" type="submit">{l.quizSubmit}</button></div>
              </form>
            )}
          </section>

          {state.complete && (
            <p style={{ textAlign: 'center' }}>
              {next ? (
                <Link className="btn btn-green" href={`/space/${program}/module/${next.id}`}>{l.nextModule}</Link>
              ) : (
                <Link className="btn btn-green" href={`/space/${program}/exam`}>{l.toExam}</Link>
              )}
            </p>
          )}
        </div>
      </main>
    </div>
  );
}
