import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LearnerHeader } from '@/components/private/ConsoleHeaders';
import AccountMenu from '@/components/private/AccountMenu';
import { currentUser } from '@/lib/auth';
import { sql } from '@/lib/db';
import { programBySlug, STUDENT_PROGRAM } from '@/lib/catalog';
import { member } from '@/lib/i18n/member';
import { learn } from '@/lib/i18n/learn';
import { EXAM_QUESTIONS, hasCourse } from '@/lib/learning';
import { examPassMark, getProgress, type Progress } from '@/lib/learning/progress';
import { resetMyProgressAction } from '@/lib/learnActions';
import { formatDate, isLocale, LOCALES, type Locale } from '@/lib/locales';
import { localeFromSearch } from '@/lib/requestLocale';
import { PRIVATE_SLUGS } from '@/lib/private';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The AI Certification', robots: { index: false, follow: false } };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };
type Owned = { program: string; reference: string; paid_at: string; progress: Progress };

// The learner's space: every course they bought (modules, exam, certificate), open as soon as the payment is confirmed.
// Admins see every written course here, to follow it like a learner.
export default async function SpacePage({ searchParams }: Props) {
  const queryLocale = await localeFromSearch(searchParams);
  const user = await currentUser();
  if (!user) redirect(`/login?lang=${queryLocale}`);
  const preview = user.role === 'admin';
  const ambassador = user.role === 'ambassador';
  const locale: Locale = isLocale(user.locale) ? user.locale : queryLocale;
  const t = member(locale).space;
  const l = learn(locale);

  const regs = await sql(
    `select r.reference, r.program, r.paid_at from registrations r where r.user_id = $1 and r.status = 'paid' order by r.paid_at desc`,
    [user.id],
  );
  const paid = [...new Map(regs.map((r) => [r.program as string, r])).values()];
  const entries = preview
    ? // The admin's student view shows the student course only (the €30 one).
      [paid.find((r) => r.program === STUDENT_PROGRAM) ?? { program: STUDENT_PROGRAM, reference: 'TEST', paid_at: new Date().toISOString() }]
    : [
        // Ambassadors try the student course they recommend, like any student, plus whatever they bought.
        ...(ambassador && !paid.some((r) => r.program === STUDENT_PROGRAM)
          ? [{ program: STUDENT_PROGRAM, reference: 'AMBASSADOR', paid_at: new Date().toISOString() }]
          : []),
        ...paid.filter((r) => hasCourse(r.program)),
      ];
  const owned: Owned[] = [];
  for (const r of entries) {
    const progress = await getProgress(user.id, locale, r.program);
    if (progress) owned.push({ program: r.program, reference: r.reference, paid_at: new Date(r.paid_at).toISOString(), progress });
  }
  // Bought before their course was written: shown as an outline.
  const pending = paid.filter((r) => !hasCourse(r.program) && programBySlug(r.program));
  const accessUntil = (paidAt: string) => formatDate(new Date(new Date(paidAt).setMonth(new Date(paidAt).getMonth() + 6)).toISOString(), locale);

  // The hero leads to the next step of the first course not finished yet.
  const current = owned.find((o) => !o.progress.certificate) ?? owned[0];
  const nextStep = current ? stepOf(current, l) : null;

  return (
    <div lang={LOCALES[locale].lang}>
      <LearnerHeader
        user={user}
        locale={locale}
      />
      <main id="main" className="register hero-bands bands-clip">
        <div className="container" style={{ maxWidth: 900 }}>
          {current && nextStep ? (
            <section className={`sp-hero${preview || ambassador ? ' is-console' : ''}`}>
              <div className="sp-hero-text">
                <span className="eyebrow">{current.progress.course.title}</span>
                <h1>{t.hello(user.first_name || '').replace(/\s+$/, '')}</h1>
                <div className="sp-progress">
                  <div className="space-bar"><span style={{ width: `${current.progress.percent}%` }} /></div>
                  <span>{l.overall(current.progress.percent)}</span>
                </div>
                <p className="sp-hero-cta">
                  <Link className="btn btn-green" href={nextStep.href}>{nextStep.label} →</Link>
                </p>
              </div>
              <img className="sp-hero-mascot" src={current.progress.certificate ? '/assets/course/certified.webp' : '/assets/course/welcome.webp'} alt="" width={190} height={190} />
              {!preview && !ambassador && <div className="sp-account"><AccountMenu name={user.first_name} email={user.email} role={t.title} signOut={t.logout} light /></div>}
            </section>
          ) : (
            <div className="space-head">
              <div>
                <span className="eyebrow">{t.title}</span>
                <h1>{t.hello(user.first_name || '')}</h1>
              </div>
              {!preview && !ambassador && <AccountMenu name={user.first_name} email={user.email} role={t.title} signOut={t.logout} light />}
            </div>
          )}

          {owned.map((o) => (
            <CourseRows key={o.program} owned={o} locale={locale} showTitle={owned.length > 1} />
          ))}


          {pending.map((r) => {
            const p = programBySlug(r.program)!;
            return (
              <section key={r.program} className="space-module">
                <h2><span className="eyebrow">Certification</span>{p.title}</h2>
                <p className="help">{t.reference}: {r.reference} · {t.accessUntil(accessUntil(new Date(r.paid_at).toISOString()))}</p>
                {p.modules.map((m, i) => (
                  <div key={m.title}>
                    <h3 style={{ fontSize: 17, margin: '16px 0 6px' }}>{l.module(i + 1)} · {m.title}</h3>
                    <ul style={{ display: 'block', paddingLeft: 18, listStyle: 'disc' }}>{m.lessons.map((x) => <li key={x}>{x}</li>)}</ul>
                  </div>
                ))}
                <p className="price-alert">{t.contentSoon}</p>
              </section>
            );
          })}

          {owned.length === 0 && pending.length === 0 && <p className="lead">{t.contentSoon}</p>}

          {/* Admin test: wipe one's own progress to follow the courses again from the start. */}
          {preview && (
            <form action={resetMyProgressAction} className="sp-reset">
              <span className="help">Test admin : efface ta progression pour refaire les parcours depuis le début.</span>
              <button className="btn btn-sm" type="submit">Repartir de zéro</button>
            </form>
          )}
        </div>
      </main>
    </div>
  );
}

function stepOf({ program, progress }: Owned, l: ReturnType<typeof learn>) {
  const base = `/space/${program}`;
  if (progress.certificate) return { href: `${base}/certificate`, label: l.viewCertificate.replace(/\s*→$/, '') };
  const next = progress.course.modules.find((_, i) => !progress.modules[i].complete);
  if (next) return { href: `${base}/module/${next.id}`, label: `${progress.modules.some((m) => m.lessonsDone) ? l.continue : l.start} · ${next.title}` };
  return { href: `${base}/exam`, label: l.examStart };
}

function CourseRows({ owned, locale, showTitle }: { owned: Owned; locale: Locale; showTitle: boolean }) {
  const l = learn(locale);
  const { program, progress } = owned;
  const base = `/space/${program}`;
  const exam = Math.min(progress.course.exam.length, EXAM_QUESTIONS);
  return (
    <section className="sp-course">
      {showTitle && (
        <div className="sp-course-head">
          <h2>{progress.course.title}</h2>
          <span>{l.overall(progress.percent)}</span>
        </div>
      )}
      <div className="sp-modules">
        {progress.course.modules.map((m, i) => {
          const st = progress.modules[i];
          const steps = st.lessonsTotal + 2;
          const doneSteps = st.lessonsDone + (st.exerciseDone ? 1 : 0) + (st.quizPassed ? 1 : 0);
          return (
            <Link key={m.id} className={`sp-module${st.complete ? ' is-done' : ''}`} href={`${base}/module/${m.id}`}>
              <span className="sp-num" aria-hidden="true">{st.complete ? '✓' : i + 1}</span>
              <div className="sp-module-body">
                <span className="sp-kicker">{l.module(i + 1)}</span>
                <strong>{m.title}</strong>
                <span className="sp-summary">{m.summary}</span>
                <div className="sp-mini">
                  <div className="space-bar"><span style={{ width: `${Math.round((doneSteps / steps) * 100)}%` }} /></div>
                  <span>{l.lessonCount(st.lessonsDone, st.lessonsTotal)} · {l.exercise} {st.exerciseDone ? '✓' : '–'} · {l.quiz} {st.quizBest !== null ? l.score(st.quizBest, m.quiz.length) : '–'}</span>
                </div>
              </div>
              <span className="sp-go">{st.complete ? l.review : st.lessonsDone ? l.continue : l.start} →</span>
            </Link>
          );
        })}
        <Link className="sp-module is-exam" href={progress.certificate ? `${base}/certificate` : `${base}/exam`}>
          <span className="sp-num" aria-hidden="true">★</span>
          <div className="sp-module-body">
            <span className="sp-kicker">{l.exam}</span>
            <strong>{progress.certificate ? l.certified : l.examStart}</strong>
            <span className="sp-summary">{l.examLead(exam, examPassMark(exam))}</span>
          </div>
          <span className="sp-go">{progress.certificate ? l.viewCertificate : '→'}</span>
        </Link>
      </div>
    </section>
  );
}
