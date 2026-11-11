import 'server-only';
import { notFound, redirect } from 'next/navigation';
import { currentUser } from '@/lib/auth';
import { hasCourse } from '@/lib/learning';
import { getProgress, hasPaidAccess } from '@/lib/learning/progress';
import { STUDENT_PROGRAM } from '@/lib/catalog';

/** The signed-in learner of a course and where they stand; anyone else is sent to the right place. */
export async function requireLearner(program: string) {
  if (!hasCourse(program)) notFound();
  const user = await currentUser();
  if (!user) redirect('/login');
  // Admins follow every course like a learner, to test it, without paying; ambassadors do the same with the
  // student course they recommend. Any other course needs a payment.
  const free = user.role === 'admin' || (user.role === 'ambassador' && program === STUDENT_PROGRAM);
  if (!free && !(await hasPaidAccess(user.id, program))) redirect('/space');
  const progress = await getProgress(user.id, user.locale, program);
  if (!progress) redirect('/space');
  return { user, progress, program };
}
