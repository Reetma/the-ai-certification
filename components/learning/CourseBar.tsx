import Link from 'next/link';
import type { Progress } from '@/lib/learning/progress';
import type { LearnDict } from '@/lib/i18n/learn';

// Sticky course navigation on every course page: back to the space, the course title, and a step for each
// module and the exam (done ones ticked), so the learner can move around at any time.
export default function CourseBar({ program, progress, current, l }: { program: string; progress: Progress; current: string; l: LearnDict }) {
  const base = `/space/${program}`;
  return (
    <nav className="course-bar" aria-label={progress.course.title}>
      <div className="course-bar-row">
        <Link className="course-back" href="/space">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 18l-6-6 6-6" /></svg>
          {l.back.replace(/^←\s*/, '')}
        </Link>
        <strong className="course-bar-title">{progress.course.title}</strong>
      </div>
      <ol className="course-steps">
        {progress.course.modules.map((m, i) => {
          const done = progress.modules[i].complete;
          return (
            <li key={m.id}>
              <Link href={`${base}/module/${m.id}`} aria-current={current === m.id ? 'page' : undefined} className={done ? 'is-done' : ''}>
                <span aria-hidden="true">{done ? '✓' : i + 1}</span>
                {m.title}
              </Link>
            </li>
          );
        })}
        <li>
          <Link href={progress.certificate ? `${base}/certificate` : `${base}/exam`} aria-current={current === 'exam' ? 'page' : undefined} className={progress.certificate ? 'is-done' : ''}>
            <span aria-hidden="true">★</span>
            {progress.certificate ? l.certTitle : l.exam}
          </Link>
        </li>
      </ol>
    </nav>
  );
}
