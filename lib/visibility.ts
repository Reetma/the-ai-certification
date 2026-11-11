import 'server-only';
import { sql } from './db';
import { isAvailable } from './learning';

// Which certifications are on sale: every one whose course is written. (setOnSale and the course_visibility table
// remain from when they could be hidden one by one, but no longer change anything.)
export const ALWAYS_ON_SALE = 'ai-at-work';

/** A function telling whether a programme can be bought right now. */
export async function onSaleChecker() {
  // Every written certification is on sale.
  return (slug: string) => isAvailable(slug);
}

export async function isOnSale(slug: string) {
  return (await onSaleChecker())(slug);
}

export async function setOnSale(program: string, onSale: boolean) {
  await sql(
    `insert into course_visibility (program, on_sale, updated_at) values ($1, $2, now())
     on conflict (program) do update set on_sale = excluded.on_sale, updated_at = now()`,
    [program, onSale],
  );
}
