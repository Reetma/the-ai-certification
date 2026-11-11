import 'server-only';
import { randomBytes } from 'node:crypto';
import { sql } from '../db';
import { STUDENT_PROGRAM } from '../catalog';
import { isLocale, type Locale } from '../locales';
import { EXAM_PASS_RATIO, getCourse, QUIZ_PASS, type Course, type Question } from './index';

// Where a learner stands in a full course: lessons, exercises, quizzes, exam and certificate.
// Everything is open from the start: modules in any order, and the final exam straight away.

export type ModuleState = {
  id: string;
  index: number;
  lessonsDone: number;
  lessonsTotal: number;
  exerciseDone: boolean;
  quizBest: number | null;
  quizPassed: boolean;
  complete: boolean;
  unlocked: boolean;
};

export type Progress = {
  course: Course;
  locale: Locale;
  done: Set<string>;
  modules: ModuleState[];
  percent: number;
  examUnlocked: boolean;
  lastExam: { score: number; total: number; passed: boolean; created_at: string } | null;
  certificate: { reference: string; holder_name: string; score: number; total: number; issued_at: string } | null;
};

export const examPassMark = (total: number) => Math.ceil(total * EXAM_PASS_RATIO);

/** True when the user has paid for this course. */
export async function hasPaidAccess(userId: string, program = STUDENT_PROGRAM) {
  const [r] = await sql(`select 1 from registrations where user_id = $1 and program = $2 and status = 'paid' limit 1`, [userId, program]);
  return Boolean(r);
}

export async function getProgress(userId: string, userLocale: string, program = STUDENT_PROGRAM): Promise<Progress | null> {
  const locale: Locale = isLocale(userLocale) ? userLocale : 'en-us';
  const course = getCourse(program, locale);
  if (!course) return null;

  const [lessons, exercises, quizzes, exams, certs] = await Promise.all([
    sql('select lesson_id from lesson_progress where user_id = $1', [userId]),
    sql('select exercise_id from exercise_submissions where user_id = $1 and program = $2', [userId, program]),
    sql('select module_id, max(score)::int as best from quiz_attempts where user_id = $1 and program = $2 group by module_id', [userId, program]),
    sql('select score, total, passed, created_at from exam_attempts where user_id = $1 and program = $2 order by created_at desc limit 1', [userId, program]),
    sql('select reference, holder_name, score, total, issued_at from certificates where user_id = $1 and program = $2', [userId, program]),
  ]);
  const done = new Set(lessons.map((r) => r.lesson_id as string));
  const submitted = new Set(exercises.map((r) => r.exercise_id as string));
  const best = new Map(quizzes.map((r) => [r.module_id as string, Number(r.best)]));

  const modules = course.modules.map((m, index) => {
    const lessonsDone = m.lessons.filter((l) => done.has(l.id)).length;
    const quizBest = best.get(m.id) ?? null;
    const quizPassed = quizBest !== null && quizBest >= QUIZ_PASS;
    const exerciseDone = submitted.has(m.exercise.id);
    const complete = lessonsDone === m.lessons.length && exerciseDone && quizPassed;
    const state = { id: m.id, index, lessonsDone, lessonsTotal: m.lessons.length, exerciseDone, quizBest, quizPassed, complete, unlocked: true };
    return state;
  });

  // Each module counts its lessons, its exercise and its quiz as steps.
  const steps = modules.reduce((n, m) => n + m.lessonsTotal + 2, 0);
  const stepsDone = modules.reduce((n, m) => n + m.lessonsDone + (m.exerciseDone ? 1 : 0) + (m.quizPassed ? 1 : 0), 0);

  return {
    course,
    locale,
    done,
    modules,
    percent: Math.round((stepsDone / steps) * 100),
    examUnlocked: true,
    lastExam: (exams[0] as Progress['lastExam']) ?? null,
    certificate: (certs[0] as Progress['certificate']) ?? null,
  };
}

/** Grades answers given as `q<i>` = original option index; returns the score and what each answer was. */
export function grade(questions: Question[], answers: Record<string, string>) {
  const chosen = questions.map((_, i) => (answers[`q${i}`] === undefined || answers[`q${i}`] === '' ? null : Number(answers[`q${i}`])));
  const score = questions.reduce((n, q, i) => n + (chosen[i] === q.answer ? 1 : 0), 0);
  return { score, chosen };
}

export function certificateReference() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return 'CERT-' + Array.from(randomBytes(8), (b) => alphabet[b % alphabet.length]).join('');
}

export async function certificateByReference(reference: string) {
  const [c] = await sql(
    `select c.reference, c.holder_name, c.program, c.score, c.total, c.issued_at from certificates c where upper(c.reference) = upper($1)`,
    [reference.trim()],
  );
  return c ?? null;
}
