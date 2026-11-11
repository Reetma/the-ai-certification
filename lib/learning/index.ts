import type { Locale } from '../locales';
import type { Course, Question } from './types';
import studentAiEn from './student-ai/en';
import studentAiFr from './student-ai/fr';
import studentAiEs from './student-ai/es';
import studentAiIt from './student-ai/it';
import studentAiDe from './student-ai/de';
import chatgpt from './catalog/chatgpt';
import claude from './catalog/claude';
import gemini from './catalog/gemini';
import microsoftCopilot from './catalog/microsoft-copilot';
import promptEngineering from './catalog/prompt-engineering';
import aiResearch from './catalog/ai-research';
import aiImages from './catalog/ai-images';
import aiVideo from './catalog/ai-video';
import aiAutomation from './catalog/ai-automation';
import aiAgents from './catalog/ai-agents';
import aiData from './catalog/ai-data';
import aiCoding from './catalog/ai-coding';
import responsibleAi from './catalog/responsible-ai';

export * from './types';

// Full courses, by programme then language. A programme without an entry here keeps the simple lesson list.
// Catalogue certifications are written in English, the language of the catalogue: every locale gets the same course.
const englishOnly = (course: Course): Record<Locale, Course> => ({ 'en-us': course, fr: course, es: course, it: course, de: course });

const COURSES: Record<string, Record<Locale, Course>> = {
  'student-ai': { 'en-us': studentAiEn, fr: studentAiFr, es: studentAiEs, it: studentAiIt, de: studentAiDe },
  chatgpt: englishOnly(chatgpt),
  claude: englishOnly(claude),
  gemini: englishOnly(gemini),
  'microsoft-copilot': englishOnly(microsoftCopilot),
  'prompt-engineering': englishOnly(promptEngineering),
  'ai-research': englishOnly(aiResearch),
  'ai-images': englishOnly(aiImages),
  'ai-video': englishOnly(aiVideo),
  'ai-automation': englishOnly(aiAutomation),
  'ai-agents': englishOnly(aiAgents),
  'ai-data': englishOnly(aiData),
  'ai-coding': englishOnly(aiCoding),
  'responsible-ai': englishOnly(responsibleAi),
};

// Every language must have the same modules, lessons, ids and correct answers as the English reference,
// so a learner can switch language without changing progress or results.
function shape(c: Course) {
  const qs = (list: Question[]) => list.map((q) => `${q.options.length}:${q.answer}`).join(',');
  return JSON.stringify({
    program: c.program,
    modules: c.modules.map((m) => ({ id: m.id, lessons: m.lessons.map((l) => l.id), exercise: m.exercise.id, quiz: qs(m.quiz) })),
    exam: qs(c.exam),
  });
}

for (const [program, byLocale] of Object.entries(COURSES)) {
  const reference = shape(byLocale['en-us']);
  for (const [locale, course] of Object.entries(byLocale)) {
    if (shape(course) !== reference) throw new Error(`Course ${program} (${locale}) does not match the English version`);
    for (const q of [...course.modules.flatMap((m) => m.quiz), ...course.exam]) {
      if (q.answer < 0 || q.answer >= q.options.length) throw new Error(`Course ${program} (${locale}): bad answer in "${q.q}"`);
    }
  }
}

/** A catalogue certification can be bought only once its course is written (the AI one is the student course). */
export function isAvailable(slug: string) {
  return slug === 'ai-at-work' || slug in COURSES;
}

/** Programmes that have a full course, in the order of the catalogue. */
export const COURSE_PROGRAMS = Object.keys(COURSES);

export function hasCourse(program: string) {
  return program in COURSES;
}

export function getCourse(program: string, locale: Locale): Course | null {
  return COURSES[program]?.[locale] ?? null;
}

export function lessonIdsOf(course: Course) {
  return course.modules.flatMap((m) => m.lessons.map((l) => l.id));
}

/** Option order shown to one learner for one question: stable for them, different between learners. */
export function shuffledOrder(seed: string, length: number): number[] {
  let h = 2166136261;
  for (let i = 0; i < seed.length; i++) h = Math.imul(h ^ seed.charCodeAt(i), 16777619);
  const next = () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
  const order = Array.from({ length }, (_, i) => i);
  for (let i = length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [order[i], order[j]] = [order[j], order[i]];
  }
  return order;
}

/** Questions asked in a final exam: at most 30, drawn from the course's question bank for this learner and attempt
 * (a new draw at each attempt), kept in the bank's order. Returns their indexes in the bank. */
export const EXAM_QUESTIONS = 30;
export function examDraw(bankSize: number, seed: string): number[] {
  if (bankSize <= EXAM_QUESTIONS) return Array.from({ length: bankSize }, (_, i) => i);
  return shuffledOrder(seed, bankSize).slice(0, EXAM_QUESTIONS).sort((a, b) => a - b);
}
