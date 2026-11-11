'use server';

// Form actions of the course pages. Each one checks the session and the learner's access itself.
import { randomUUID } from 'node:crypto';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { currentUser } from './auth';
import { sql } from './db';
import { examDraw, hasCourse } from './learning';
import { STUDENT_PROGRAM } from './catalog';
import { certificateReference, examPassMark, getProgress, grade, hasPaidAccess } from './learning/progress';

const MIN_SUBMISSION = 40;

// Every form names its course; the learner must have paid for it (admins test every course).
async function learner(formData: FormData) {
  const program = String(formData.get('program') ?? '');
  if (!hasCourse(program)) redirect('/space');
  const user = await currentUser();
  if (!user) redirect('/login');
  const free = user.role === 'admin' || (user.role === 'ambassador' && program === STUDENT_PROGRAM);
  if (!free && !(await hasPaidAccess(user.id, program))) redirect('/space');
  const progress = await getProgress(user.id, user.locale, program);
  if (!progress) redirect('/space');
  return { user, progress, program, base: `/space/${program}` };
}

const answersOf = (formData: FormData) =>
  Object.fromEntries([...formData.entries()].filter(([k]) => /^q\d+$/.test(k)).map(([k, v]) => [k, String(v)]));

export async function toggleLessonAction(formData: FormData) {
  const { user, progress, program, base } = await learner(formData);
  const lesson = String(formData.get('lesson') ?? '');
  const module = progress.course.modules.find((m) => m.lessons.some((l) => l.id === lesson));
  if (!module) return;
  if (formData.get('done') === '1') {
    await sql('insert into lesson_progress (user_id, lesson_id) values ($1, $2) on conflict do nothing', [user.id, lesson]);
  } else {
    await sql('delete from lesson_progress where user_id = $1 and lesson_id = $2', [user.id, lesson]);
  }
  revalidatePath('/space');
  redirect(`${base}/module/${module.id}#${lesson}`);
}

export async function submitExerciseAction(formData: FormData) {
  const { user, progress, program, base } = await learner(formData);
  const moduleId = String(formData.get('module') ?? '');
  const module = progress.course.modules.find((m) => m.id === moduleId);
  if (!module) redirect('/space');
  const content = String(formData.get('content') ?? '').trim().slice(0, 20000);
  if (content.length < MIN_SUBMISSION) redirect(`${base}/module/${moduleId}?exercise=short#exercise`);
  await sql(
    `insert into exercise_submissions (user_id, program, exercise_id, content) values ($1, $2, $3, $4)
     on conflict (user_id, program, exercise_id) do update set content = excluded.content, submitted_at = now()`,
    [user.id, program, module.exercise.id, content],
  );
  redirect(`${base}/module/${moduleId}#exercise`);
}

export async function submitQuizAction(formData: FormData) {
  const { user, progress, program, base } = await learner(formData);
  const moduleId = String(formData.get('module') ?? '');
  const module = progress.course.modules.find((m) => m.id === moduleId);
  if (!module) redirect('/space');
  const { score, chosen } = grade(module.quiz, answersOf(formData));
  if (chosen.some((c) => c === null)) redirect(`${base}/module/${moduleId}?quiz=incomplete#quiz`);
  const id = randomUUID();
  await sql(
    `insert into quiz_attempts (id, user_id, program, module_id, score, total, answers) values ($1, $2, $3, $4, $5, $6, $7)`,
    [id, user.id, program, moduleId, score, module.quiz.length, JSON.stringify(chosen)],
  );
  redirect(`${base}/module/${moduleId}?attempt=${id}#quiz`);
}

export async function submitExamAction(formData: FormData) {
  const { user, progress, program, base } = await learner(formData);
  if (progress.certificate) redirect(`${base}/certificate`);
  // Unlimited attempts, one right after another.
  if (!progress.examUnlocked) redirect('/space');
  const holder = String(formData.get('holder_name') ?? '').trim().replace(/\s+/g, ' ').slice(0, 120);
  if (!holder) redirect(`${base}/exam?error=name`);
  // The same draw as the exam page showed (it depends on the attempts made before this one).
  const [{ n: attempts }] = await sql('select count(*)::int as n from exam_attempts where user_id = $1 and program = $2', [user.id, program]);
  const exam = examDraw(progress.course.exam.length, `${user.id}:${program}:${attempts}`).map((i) => progress.course.exam[i]);
  const { score, chosen } = grade(exam, answersOf(formData));
  if (chosen.some((c) => c === null)) redirect(`${base}/exam?error=incomplete`);
  const passed = score >= examPassMark(exam.length);
  await sql(`insert into exam_attempts (id, user_id, program, score, total, passed) values ($1, $2, $3, $4, $5, $6)`, [
    randomUUID(), user.id, program, score, exam.length, passed,
  ]);
  if (!passed) redirect(`${base}/exam?result=failed`);
  await sql(
    `insert into certificates (reference, user_id, program, holder_name, score, total) values ($1, $2, $3, $4, $5, $6)
     on conflict (user_id, program) do nothing`,
    [certificateReference(), user.id, program, holder, score, exam.length],
  );
  redirect(`${base}/certificate`);
}

/** Admins testing the course: wipe their own progress, quizzes, exam attempts and certificate. */
export async function resetMyProgressAction() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') redirect('/');
  await sql('delete from lesson_progress where user_id = $1', [user.id]);
  for (const table of ['exercise_submissions', 'quiz_attempts', 'exam_attempts', 'certificates']) {
    await sql(`delete from ${table} where user_id = $1`, [user.id]);
  }
  redirect('/space');
}
