import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { LearnerHeader } from '@/components/private/ConsoleHeaders';
import CourseBar from '@/components/learning/CourseBar';
import ExamRunner from '@/components/learning/ExamRunner';
import { requireLearner } from '@/components/learning/learner';
import { learn } from '@/lib/i18n/learn';
import { examDraw, shuffledOrder } from '@/lib/learning';
import { sql } from '@/lib/db';
import { examPassMark } from '@/lib/learning/progress';
import { LOCALES } from '@/lib/locales';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'The AI Certification', robots: { index: false, follow: false } };

type Props = { params: Promise<{ program: string }>; searchParams: Promise<Record<string, string | string[] | undefined>> };

// The final exam: proctored (leaving the page cancels it), unlimited attempts.
export default async function ExamPage({ params, searchParams }: Props) {
  const { program } = await params;
  const query = await searchParams;
  const { user, progress } = await requireLearner(program);
  if (progress.certificate) redirect(`/space/${program}/certificate`);
  const { locale, course } = progress;
  const l = learn(locale);
  // 30 questions drawn for this learner and attempt (the grading draws the same ones).
  const [{ n: attempts }] = await sql('select count(*)::int as n from exam_attempts where user_id = $1 and program = $2', [user.id, program]);
  const exam = examDraw(course.exam.length, `${user.id}:${program}:${attempts}`).map((i) => ({ ...course.exam[i], bank: i }));
  const pass = examPassMark(exam.length);
  // Options in an order of their own for this learner; only the text goes to the browser, never the answer.
  const questions = exam.map((q) => ({
    q: q.q,
    options: shuffledOrder(`${user.id}:exam:${q.bank}`, q.options.length).map((o) => ({ value: o, label: q.options[o] })),
  }));
  const last = progress.lastExam;

  return (
    <div lang={LOCALES[locale].lang}>
      <LearnerHeader user={user} locale={locale} />
      <main id="main" className="register hero-bands bands-clip">
        <div className="container" style={{ maxWidth: 820 }}>
          <CourseBar program={program} progress={progress} current="exam" l={l} />
          <section className="sp-hero sp-hero-module">
            <div className="sp-hero-text">
              <span className="eyebrow">{course.title}</span>
              <h1>{l.exam}</h1>
              <p className="lead" style={{ margin: 0 }}>{l.examLead(exam.length, pass)}</p>
            </div>
            <img className="sp-hero-mascot" src="/assets/course/exam.webp" alt="" width={200} height={200} />
          </section>
          {query.result === 'failed' && last && !last.passed && (
            <p className="price-alert" role="status">{l.examFailed(last.score, last.total, pass)} {l.examFailedRetry}</p>
          )}
          {query.error === 'incomplete' && <p className="error" role="alert">{l.examAnswerAll(exam.length)}</p>}
          {query.error === 'name' && <p className="error" role="alert">{l.examNameMissing}</p>}
          <ExamRunner
            program={program}
            questions={questions}
            defaultName={[user.first_name, user.last_name].filter(Boolean).join(' ')}
            t={{
              examSeriousTitle: l.examSeriousTitle, examRules: l.examRules, examAgree: l.examAgree, examBegin: l.examBegin,
              examCancelledTitle: l.examCancelledTitle, examCancelledText: l.examCancelledText, examWatch: l.examWatch,
              holderName: l.holderName, holderHelp: l.holderHelp, examSubmit: l.examSubmit, retry: l.retry,
              question: exam.map((_, i) => l.question(i + 1, exam.length)),
              answerAll: l.examAnswerAll(exam.length),
            }}
          />
        </div>
      </main>
    </div>
  );
}
