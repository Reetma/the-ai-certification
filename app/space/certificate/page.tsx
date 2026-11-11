import { redirect } from 'next/navigation';
import { STUDENT_PROGRAM } from '@/lib/catalog';

// Old address of the AI course certificate.
export default function OldCertificate() {
  redirect(`/space/${STUDENT_PROGRAM}/certificate`);
}
