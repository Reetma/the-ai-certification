import Link from 'next/link';
import LessonBody from '@/components/learning/LessonBody';
import { getCourse, hasCourse, lessonIdsOf, type Question } from '@/lib/learning';
import { PROGRAMS, programBySlug, STUDENT_PROGRAM } from '@/lib/catalog';
import { LOCALES, isLocale, type Locale } from '@/lib/locales';
import { PRIVATE_SLUGS } from '@/lib/private';
import { courseOnSaleAction } from '@/lib/privateActions';
import { ALWAYS_ON_SALE, onSaleChecker } from '@/lib/visibility';

// Admin view of a course as written: every lesson, exercise, quiz and the exam, with the right answers shown.
// Rendered inside the admin console (the "Formation" tab).

// The AI certification in the catalogue is the student course, stored under its own programme id.
const courseKey = (slug: string) => (slug === 'ai-at-work' ? STUDENT_PROGRAM : slug);

const href = (program: string, lang: string) => `/${PRIVATE_SLUGS.admin}?tab=formation&program=${program}&lang=${lang}`;

function Questions({ list }: { list: Question[] }) {
  return (
    <ol className="cx-questions">
      {list.map((q) => (
        <li key={q.q}>
          <strong>{q.q}</strong>
          <ul>
            {q.options.map((o, i) => (
              <li key={o} className={i === q.answer ? 'is-answer' : ''}>{i === q.answer ? '✓ ' : ''}{o}</li>
            ))}
          </ul>
          <small>{q.why}</small>
        </li>
      ))}
    </ol>
  );
}

export default async function CoursePreview({ params }: { params: Record<string, string | string[] | undefined> }) {
  const onSale = await onSaleChecker();
  const program = programBySlug(String(params.program ?? '')) ? String(params.program) : 'ai-at-work';
  const lang: Locale = isLocale(String(params.lang ?? '')) ? (String(params.lang) as Locale) : 'fr';
  const course = getCourse(courseKey(program), lang);
  const outline = programBySlug(program);

  return (
    <>
      <section className="cx-card">
        <h2>Formation</h2>
        <p className="help">Le contenu tel que les élèves le voient, avec les bonnes réponses en vert. Pour le modifier, dis à Claude ce que tu veux changer.</p>
        <p><Link className="btn btn-sm btn-green" href="/space">Suivre le parcours comme un élève →</Link></p>
        {/* Courses on sale first; hidden ones stay folded away, each can be opened and put back on sale. */}
        <div className="cx-toolbar">
          <nav className="cx-pills" aria-label="Programme">
            {PROGRAMS.filter((p) => onSale(p.slug)).map((p) => (
              <Link key={p.slug} href={href(p.slug, lang)} aria-current={p.slug === program ? 'page' : undefined}>{p.title}</Link>
            ))}
          </nav>
        </div>
        {PROGRAMS.some((p) => !onSale(p.slug)) && (
          <details className="cx-hidden-courses" open={!onSale(program)}>
            <summary>Formations masquées ({PROGRAMS.filter((p) => !onSale(p.slug)).length})</summary>
            <nav className="cx-pills" aria-label="Formations masquées">
              {PROGRAMS.filter((p) => !onSale(p.slug)).map((p) => (
                <Link key={p.slug} href={href(p.slug, lang)} aria-current={p.slug === program ? 'page' : undefined}>
                  {p.title}{hasCourse(courseKey(p.slug)) ? '' : ' (plan)'}
                </Link>
              ))}
            </nav>
          </details>
        )}
        {course && program !== ALWAYS_ON_SALE && (
          <form action={courseOnSaleAction} className="cx-onsale">
            <input type="hidden" name="program" value={program} />
            <input type="hidden" name="lang" value={lang} />
            <input type="hidden" name="on_sale" value={onSale(program) ? '0' : '1'} />
            <span className={`cx-badge ${onSale(program) ? 'tone-ok' : 'tone-warn'}`}>{onSale(program) ? 'En vente' : 'Masquée'}</span>
            <span className="help">{onSale(program) ? 'Visible et achetable sur le site.' : 'Affichée « Coming soon » sur le site, impossible à acheter.'}</span>
            <button className={`btn btn-sm${onSale(program) ? '' : ' btn-green'}`} type="submit">{onSale(program) ? 'Masquer' : 'Mettre en vente'}</button>
          </form>
        )}
        {course && (
          <nav className="cx-pills" aria-label="Langue">
            {(Object.keys(LOCALES) as Locale[]).map((l) => (
              <Link key={l} href={href(program, l)} aria-current={l === lang ? 'page' : undefined}>{LOCALES[l].label}</Link>
            ))}
          </nav>
        )}
      </section>

      {!course && outline && (
        <section className="cx-card">
          <h2>{outline.title}</h2>
          <p className="price-alert">Pas encore de contenu rédigé : seul le plan existe.</p>
          {outline.modules.map((m, i) => (
            <div key={m.title}>
              <h3>Module {i + 1} · {m.title}</h3>
              <ul>{m.lessons.map((l) => <li key={l}>{l}</li>)}</ul>
            </div>
          ))}
        </section>
      )}

      {course && (
        <>
          <section className="cx-card">
            <h2>{course.title}</h2>
            <p className="help">
              {course.modules.length} modules · {lessonIdsOf(course).length} leçons ·{' '}
              {course.modules.reduce((n, m) => n + m.lessons.reduce((s, l) => s + l.minutes, 0) + m.exercise.minutes, 0)} min · examen de{' '}
              {course.exam.length} questions
            </p>
            <ol>
              {course.modules.map((m) => (
                <li key={m.id}><a href={`#${m.id}`}>{m.title}</a></li>
              ))}
              <li><a href="#exam">Examen final</a></li>
            </ol>
          </section>

          {course.modules.map((m, i) => (
            <section key={m.id} id={m.id} className="cx-card">
              <span className="cx-kicker">Module {i + 1}</span>
              <h2>{m.title}</h2>
              <p className="help">{m.summary}</p>
              {m.lessons.map((l) => (
                <details key={l.id} className="cx-lesson">
                  <summary>{l.title} <small>· {l.minutes} min · {l.id}</small></summary>
                  <img className="learn-photo" src={`/images/course/${l.id}.webp`} alt="" width={960} height={640} loading="lazy" />
                  <LessonBody body={l.body} />
                </details>
              ))}
              <details className="cx-lesson">
                <summary>Exercice : {m.exercise.title} <small>· {m.exercise.minutes} min</small></summary>
                <div className="cx-lesson-body">
                  <p>{m.exercise.intro}</p>
                  <ol>{m.exercise.steps.map((s) => <li key={s}>{s}</li>)}</ol>
                  <p className="cx-tip">À rendre : {m.exercise.submission}</p>
                </div>
              </details>
              <details className="cx-lesson">
                <summary>Quiz <small>· {m.quiz.length} questions</small></summary>
                <Questions list={m.quiz} />
              </details>
            </section>
          ))}

          <section id="exam" className="cx-card">
            <h2>Examen final <small>({course.exam.length} questions)</small></h2>
            <details className="cx-lesson">
              <summary>Voir les questions et les réponses</summary>
              <Questions list={course.exam} />
            </details>
          </section>
        </>
      )}
    </>
  );
}
