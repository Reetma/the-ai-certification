import { redirect } from 'next/navigation';
import { STUDENT_PROGRAM } from '@/lib/catalog';

// Old address of the AI course exam.
export default function OldExam() {
  redirect(`/space/${STUDENT_PROGRAM}/exam`);
}
