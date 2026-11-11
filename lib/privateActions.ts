'use server';

// Form actions for the private pages. They are called by opaque ids, and every one checks the session itself.
import { redirect } from 'next/navigation';
import { currentUser } from './auth';
import { claimSchool, decideSchoolRequest, pickedSchool, requestSchool, schoolCount, joinTeam, markPayoutPaid, releaseSchool, requestPayout, saveBankDetails } from './team';
import { PRIVATE_SLUGS } from './private';
import { replyToTicket, setTicketStatus } from './tickets';
import { saveSetting, SETTINGS, type SettingKey } from './settings';
import { testSetting } from './settingsTest';
import { checkMollieKey, describeMollieCheck } from './mollie';
import { setOnSale } from './visibility';
import { programBySlug } from './catalog';

// Schools sit on the overview now: messages about them land there, at the schools section.
const team = (tab: string, msg: string) =>
  redirect(`/${PRIVATE_SLUGS.ambassador}?${tab === 'earnings' ? 'tab=earnings&' : ''}msg=${msg}${tab === 'schools' ? '#schools' : ''}`);
const pro = (tab: string, msg: string) => redirect(`/${PRIVATE_SLUGS.admin}?tab=${tab}&msg=${msg}`);

async function ambassador() {
  const user = await currentUser();
  if (!user || (user.role !== 'ambassador' && user.role !== 'admin')) redirect('/');
  return user;
}

async function admin() {
  const user = await currentUser();
  if (!user || user.role !== 'admin') redirect('/');
  return user;
}

export async function joinAction(formData: FormData) {
  const code = String(formData.get('code') ?? '');
  const result = await joinTeam({
    code,
    first_name: String(formData.get('first_name') ?? ''),
    last_name: String(formData.get('last_name') ?? ''),
    email: String(formData.get('email') ?? ''),
    university_id: String(formData.get('university_id') ?? ''),
    new_school: String(formData.get('new_school') ?? ''),
    new_school_city: String(formData.get('new_school_city') ?? ''),
    terms: formData.get('terms') === 'on',
  });
  redirect(`/${code}?${result.ok ? 'sent=1' : `error=${result.error}`}`);
}

export async function claimSchoolAction(formData: FormData) {
  const user = await ambassador();
  const universityId = String(formData.get('university_id') ?? '');
  const newName = String(formData.get('new_school') ?? '');
  const newCity = String(formData.get('new_school_city') ?? '');
  // One school per ambassador: the first is taken at once, any other one is asked for and decided in /admin.
  if (user.role !== 'admin' && (await schoolCount(user.id)) >= 1) {
    team('schools', await requestSchool(user.id, { universityId, newName, newCity }));
  }
  const school = await pickedSchool(universityId, newName, newCity);
  if (!school || !('id' in school)) team('schools', 'pick');
  const ok = await claimSchool(user.id, (school as { id: string }).id);
  team('schools', ok ? 'claimed' : 'taken');
}

export async function decideSchoolRequestAction(formData: FormData) {
  await admin();
  const result = await decideSchoolRequest(String(formData.get('request_id') ?? ''), formData.get('accept') === '1');
  pro('ambassadeurs', result);
}

export async function saveBankAction(formData: FormData) {
  const user = await ambassador();
  const ok = await saveBankDetails(user.id, String(formData.get('holder') ?? ''), String(formData.get('iban') ?? ''));
  team('earnings', ok ? 'bank_saved' : 'bank_invalid');
}

export async function requestPayoutAction() {
  const user = await ambassador();
  team('earnings', await requestPayout(user.id));
}

export async function markPayoutPaidAction(formData: FormData) {
  await admin();
  await markPayoutPaid(String(formData.get('payout_id') ?? ''));
  pro('versements', 'paye');
}

export async function releaseSchoolAction(formData: FormData) {
  await admin();
  await releaseSchool(String(formData.get('university_id') ?? ''));
  pro('ambassadeurs', 'libere');
}

export async function replyTicketAction(formData: FormData) {
  await admin();
  const id = String(formData.get('ticket_id') ?? '');
  await replyToTicket(id, String(formData.get('body') ?? ''));
  redirect(`/${PRIVATE_SLUGS.admin}?tab=tickets&id=${id}&msg=envoye`);
}

export async function ticketStatusAction(formData: FormData) {
  await admin();
  const id = String(formData.get('ticket_id') ?? '');
  const status = String(formData.get('status') ?? '');
  if (status === 'open' || status === 'answered' || status === 'closed') await setTicketStatus(id, status);
  redirect(`/${PRIVATE_SLUGS.admin}?tab=tickets&id=${id}`);
}

export async function saveSettingAction(formData: FormData) {
  await admin();
  const key = String(formData.get('key') ?? '') as SettingKey;
  if (!(key in SETTINGS)) redirect(`/${PRIVATE_SLUGS.admin}?tab=reglages`);
  // Pasted keys often come with spaces or quotes around them.
  const value = formData.get('clear') === '1' ? '' : String(formData.get('value') ?? '').trim().replace(/^["'“”‘’]+|["'“”‘’]+$/g, '').trim();
  if (key === 'MOLLIE_API_KEY' && value) {
    // A Mollie key is only saved once Mollie accepts it, so payments never break on a wrong paste.
    const check = await checkMollieKey(value);
    if (check.ok) await saveSetting(key, value);
    const detail = check.ok ? `Saved. ${describeMollieCheck(check)}` : `Key not saved. ${describeMollieCheck(check)}`;
    redirect(`/${PRIVATE_SLUGS.admin}?tab=reglages&test=${key}&ok=${check.ok ? 1 : 0}&detail=${encodeURIComponent(detail)}`);
  }
  await saveSetting(key, value);
  redirect(`/${PRIVATE_SLUGS.admin}?tab=reglages&saved=${key}`);
}

export async function testSettingAction(formData: FormData) {
  const user = await admin();
  const key = String(formData.get('key') ?? '') as SettingKey;
  const result = await testSetting(key, user.email);
  redirect(`/${PRIVATE_SLUGS.admin}?tab=reglages&test=${key}&ok=${result.ok ? 1 : 0}&detail=${encodeURIComponent(result.detail)}`);
}

/** Puts a written catalogue certification on sale, or takes it off (/admin → Formation). */
export async function courseOnSaleAction(formData: FormData) {
  await admin();
  const program = String(formData.get('program') ?? '');
  const lang = String(formData.get('lang') ?? 'fr');
  if (programBySlug(program)) await setOnSale(program, formData.get('on_sale') === '1');
  redirect(lang === 'settings' ? `/${PRIVATE_SLUGS.admin}?tab=reglages#ventes` : `/${PRIVATE_SLUGS.admin}?tab=formation&program=${program}&lang=${lang}`);
}
