import { redirect } from 'next/navigation';
import { STUDENT_PROGRAM } from '@/lib/catalog';

// Old address of the AI course modules.
export default async function OldModule({ params }: { params: Promise<{ id: string }> }) {
  redirect(`/space/${STUDENT_PROGRAM}/module/${(await params).id}`);
}
