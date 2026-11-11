// Structure of a full course. Every language version of a course has exactly the same shape and order,
// and the same `answer` index for each question (checked by lib/learning/index.ts at load).

/**
 * Lesson text, one string per block:
 *   "## Heading", "- bullet", "> tip or key idea", "! example or prompt to copy", anything else is a paragraph.
 */
export type Body = string[];

export type Question = {
  q: string;
  options: string[];
  answer: number; // index of the correct option; never sent to the browser
  why: string; // shown after the attempt
};

export type Lesson = { id: string; title: string; minutes: number; body: Body; /** Photo shown above the lesson. */ image?: string };

export type Exercise = {
  id: string;
  title: string;
  minutes: number;
  intro: string;
  steps: string[];
  /** What the learner pastes back to show the work (a prompt, an agent's instructions, a result…). */
  submission: string;
};

export type Module = {
  id: string;
  title: string;
  summary: string;
  lessons: Lesson[];
  exercise: Exercise;
  quiz: Question[];
};

export type Course = {
  program: string;
  title: string;
  modules: Module[];
  exam: Question[];
};

export const QUIZ_PASS = 4; // out of 5
export const EXAM_PASS_RATIO = 0.7; // 35 out of 50
export const EXAM_RETRY_MINUTES = 60;
