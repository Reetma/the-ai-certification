import type { BadgeKind } from '@/components/CertBadge';

// The certification catalogue: one entry per certification, with its page content and course outline.
// `logo` is an image in public/logos/ shown instead of The AI Certification badge when the file is there.
export type Program = {
  slug: string;
  title: string;
  area: string;
  group: string;
  text: string;
  description: string;
  outcomes: string[];
  modules: { title: string; lessons: string[] }[];
  kind: BadgeKind;
  color: string;
  logo?: string;
  wide?: boolean;
  /** Set when the certification is sold elsewhere (the student programme): cards link there instead. */
  href?: string;
  /** Short facts shown as tags when the card is displayed wide. */
  tags?: string[];
};

// Charged in US dollars for now; choosing the currency from the visitor's country comes later.
export const PROGRAM_PRICE_CENTS = Number(process.env.PROGRAM_PRICE_USD_CENTS ?? 43000);
export const PROGRAM_CURRENCY = 'USD';

export const PROGRAMS: Program[] = [
  {
    slug: 'ai-at-work', title: 'AI for students', area: 'Students', group: 'Artificial intelligence',
    text: 'Build an AI agent that does a real job for you, and earn a certificate employers can check.',
    tags: ['3 modules', 'About 3 hours', 'No code', 'Funded student place'],
    description: 'Learn how AI is really used at work and build your own AI agent that performs a real task you define, without writing code.',
    outcomes: ['Know what AI can and cannot do at work', 'Write prompts that produce useful results', 'Connect AI to your documents and daily workflows', 'Build, test and fix a working AI agent'],
    modules: [
      { title: 'Foundations', lessons: ['What AI can and can’t do at work', 'Prompts that actually deliver', 'Picking the right tool'] },
      { title: 'Automation', lessons: ['Plugging AI into your documents and data', 'Building your first agent', 'Giving your agent a real job'] },
      { title: 'Refine and ship', lessons: ['Testing your agent', 'Troubleshooting', 'Guided project walkthrough'] },
    ],
    kind: 'ai', color: '#17274C', logo: 'ai-tools.png', wide: true, href: '/studies',
  },
  {
    slug: 'chatgpt', title: 'ChatGPT', area: 'AI assistants', group: 'AI assistants',
    text: 'Get reliable, useful work out of ChatGPT every day, from first draft to finished file.',
    description: 'Use ChatGPT like a professional: write, summarise and analyse with it, work with files and custom GPTs, and check every answer before you use it.',
    outcomes: ['Set up ChatGPT for work: memory, instructions and data controls', 'Write, rewrite and summarise with clear prompts', 'Analyse files and data and create visuals', 'Build a custom GPT for a repeated task'],
    modules: [
      { title: 'Getting started', lessons: ['How ChatGPT works and where it fails', 'Setting it up for work', 'Your first useful conversations'] },
      { title: 'Everyday work', lessons: ['Writing and rewriting', 'Summarising documents and meetings', 'Working with files and data'] },
      { title: 'Going further', lessons: ['Custom instructions and memory', 'Building a custom GPT', 'Checking and citing answers'] },
    ],
    kind: 'chat', color: '#17274C',
  },
  {
    slug: 'claude', title: 'Claude', area: 'AI assistants', group: 'AI assistants',
    text: 'Work with Claude on long documents, projects and careful writing.',
    description: 'Use Claude to read and reason over long documents, organise work in Projects, create artifacts and keep a clear head on what to trust.',
    outcomes: ['Choose the right Claude model and plan for a task', 'Analyse long documents and compare sources', 'Organise recurring work with Projects', 'Create and iterate on artifacts'],
    modules: [
      { title: 'Meet Claude', lessons: ['What Claude is good at', 'Models, plans and limits', 'Prompting Claude well'] },
      { title: 'Documents and projects', lessons: ['Working with long documents', 'Organising work in Projects', 'Artifacts: documents, pages and tools'] },
      { title: 'Professional use', lessons: ['Research and analysis', 'Writing in your own voice', 'Privacy and safe use'] },
    ],
    kind: 'ai', color: '#17274C',
  },
  {
    slug: 'gemini', title: 'Gemini', area: 'AI assistants', group: 'AI assistants',
    text: 'Use Google’s Gemini in the browser and inside Gmail, Docs and Sheets.',
    description: 'Get work done with Gemini on its own and inside Google Workspace: drafting in Gmail and Docs, analysing in Sheets and researching with Google’s tools.',
    outcomes: ['Use Gemini for research, writing and planning', 'Draft and summarise in Gmail and Docs', 'Analyse and organise data in Sheets', 'Create Gems for repeated tasks'],
    modules: [
      { title: 'Gemini basics', lessons: ['What Gemini can do', 'Prompts that work with Gemini', 'Research with Google’s tools'] },
      { title: 'Gemini in Workspace', lessons: ['Gmail: draft, reply and summarise', 'Docs: write and edit faster', 'Sheets: organise and analyse'] },
      { title: 'Advanced use', lessons: ['Gems for repeated tasks', 'Images and files', 'Good habits and data protection'] },
    ],
    kind: 'compass', color: '#17274C',
  },
  {
    slug: 'microsoft-copilot', title: 'Microsoft Copilot', area: 'AI assistants', group: 'AI assistants',
    text: 'Use Copilot in Word, Excel, PowerPoint, Outlook and Teams.',
    description: 'Save time in Microsoft 365 with Copilot: draft in Word, analyse in Excel, build decks in PowerPoint, and catch up on email and meetings.',
    outcomes: ['Understand what Copilot can reach in your organisation', 'Draft and rewrite documents in Word', 'Analyse data in Excel and build decks in PowerPoint', 'Summarise email threads and Teams meetings'],
    modules: [
      { title: 'Copilot basics', lessons: ['Copilot and Microsoft 365', 'Copilot Chat and your work data', 'Writing good Copilot prompts'] },
      { title: 'Documents and data', lessons: ['Word: draft and rewrite', 'Excel: analyse and explain', 'PowerPoint: from document to deck'] },
      { title: 'Communication', lessons: ['Outlook: triage and reply', 'Teams: meetings and recaps', 'Agents and good practice'] },
    ],
    kind: 'doc', color: '#17274C',
  },
  {
    slug: 'prompt-engineering', title: 'Prompt engineering', area: 'Prompting & research', group: 'Prompting & research',
    text: 'Write prompts that give the same good result every time, with any AI tool.',
    description: 'Learn the methods that make AI outputs reliable: context, examples, structure, step-by-step reasoning, testing and reusable prompt templates.',
    outcomes: ['Structure a prompt with role, context, task and format', 'Use examples and constraints to control the output', 'Break complex work into chained prompts', 'Test, compare and improve prompts systematically'],
    modules: [
      { title: 'The anatomy of a prompt', lessons: ['How language models read a prompt', 'Context, task and format', 'Examples and constraints'] },
      { title: 'Advanced techniques', lessons: ['Step-by-step reasoning', 'Chaining prompts', 'Structured outputs'] },
      { title: 'Prompts that last', lessons: ['Testing and comparing prompts', 'Building a prompt library', 'Avoiding common failures'] },
    ],
    kind: 'ai', color: '#1F3A75',
  },
  {
    slug: 'ai-research', title: 'Research with AI', area: 'Prompting & research', group: 'Prompting & research',
    text: 'Find, read and check sources faster with Perplexity, NotebookLM and deep research tools.',
    description: 'Run research with AI without losing rigour: search with cited answers, work from your own sources, use deep research modes and verify every claim.',
    outcomes: ['Pick the right AI research tool for a question', 'Get cited answers and follow them back to sources', 'Build a source notebook and question it', 'Verify facts and write an honest summary'],
    modules: [
      { title: 'Searching with AI', lessons: ['AI search versus classic search', 'Asking research questions', 'Reading and following citations'] },
      { title: 'Working from your sources', lessons: ['Building a source notebook', 'Summaries, briefings and audio overviews', 'Deep research reports'] },
      { title: 'Rigour', lessons: ['Verifying facts', 'Spotting hallucinations and bias', 'Writing up and citing'] },
    ],
    kind: 'compass', color: '#1F3A75',
  },
  {
    slug: 'ai-images', title: 'AI image creation', area: 'Creative AI', group: 'Creative AI',
    text: 'Create and edit professional visuals with Midjourney, DALL·E and Firefly.',
    description: 'Generate images that serve a purpose: write visual prompts, keep a consistent style, edit and extend images, and respect rights and brand rules.',
    outcomes: ['Write visual prompts: subject, style, light and composition', 'Keep a consistent style and character across images', 'Edit, extend and upscale images', 'Use generated images legally and responsibly'],
    modules: [
      { title: 'Visual prompting', lessons: ['How image models work', 'Describing subject, style and light', 'Choosing the right tool'] },
      { title: 'Control and consistency', lessons: ['Reference images and style', 'Editing, inpainting and extending', 'Series and brand consistency'] },
      { title: 'Professional use', lessons: ['Images for marketing and presentations', 'Rights, licences and disclosure', 'A complete visual project'] },
    ],
    kind: 'image', color: '#2B4A8B',
  },
  {
    slug: 'ai-video', title: 'AI video and voice', area: 'Creative AI', group: 'Creative AI',
    text: 'Produce short videos, voice-overs and subtitles with Runway, Kling and ElevenLabs.',
    description: 'Plan and produce short videos with AI: generate clips from text or images, add voice-overs and music, edit and caption, and stay within the rules on likeness and consent.',
    outcomes: ['Write a short script and shot list for AI video', 'Generate clips from text and from images', 'Add voice, music and subtitles', 'Respect consent, likeness and disclosure rules'],
    modules: [
      { title: 'Planning', lessons: ['What AI video can and cannot do', 'Script and shot list', 'Choosing your tools'] },
      { title: 'Production', lessons: ['Text-to-video and image-to-video', 'Voice-overs and music', 'Editing and subtitles'] },
      { title: 'Publishing', lessons: ['Formats for each platform', 'Consent, likeness and disclosure', 'A complete video project'] },
    ],
    kind: 'video', color: '#2B4A8B',
  },
  {
    slug: 'ai-automation', title: 'Automation with AI', area: 'Automation & agents', group: 'Automation & agents',
    text: 'Connect your apps and let AI handle repetitive work with Zapier, Make and n8n.',
    description: 'Automate real workflows without code: triggers and actions, AI steps that classify, extract and write, error handling and keeping a human in the loop.',
    outcomes: ['Map a manual process into triggers and actions', 'Add AI steps that classify, extract and draft', 'Handle errors, limits and costs', 'Keep a human check where it matters'],
    modules: [
      { title: 'Automation basics', lessons: ['Triggers, actions and data', 'Zapier, Make or n8n', 'Mapping a process'] },
      { title: 'AI inside workflows', lessons: ['Classifying and routing', 'Extracting data from text and documents', 'Drafting replies and reports'] },
      { title: 'Reliable automations', lessons: ['Errors, limits and costs', 'Human in the loop', 'An end-to-end automation'] },
    ],
    kind: 'bolt', color: '#17274C',
  },
  {
    slug: 'ai-agents', title: 'AI agents without code', area: 'Automation & agents', group: 'Automation & agents',
    text: 'Design, build and test AI agents that use tools and do real tasks.',
    description: 'Understand what makes an agent different from a chatbot, then design one with clear instructions, knowledge and tools, test it properly and deploy it safely.',
    outcomes: ['Explain how agents plan, use tools and act', 'Write instructions and give an agent knowledge', 'Connect tools and set limits on what it can do', 'Test, monitor and improve an agent'],
    modules: [
      { title: 'Understanding agents', lessons: ['From chatbot to agent', 'Tools, memory and planning', 'Good agent use cases'] },
      { title: 'Building an agent', lessons: ['Writing agent instructions', 'Knowledge and connected tools', 'Permissions and guardrails'] },
      { title: 'Shipping an agent', lessons: ['Testing with real cases', 'Monitoring and improving', 'Your agent in production'] },
    ],
    kind: 'bot', color: '#17274C',
  },
  {
    slug: 'ai-data', title: 'Data analysis with AI', area: 'Data & code', group: 'Data & code',
    text: 'Clean, analyse and chart data by asking questions in plain language.',
    description: 'Use AI to explore and explain data: upload files, clean them, ask questions, build charts and check the numbers before anyone relies on them.',
    outcomes: ['Prepare and upload data safely', 'Ask analytical questions in plain language', 'Create charts and summaries that tell a story', 'Check results and spot wrong numbers'],
    modules: [
      { title: 'Preparing data', lessons: ['Data AI can work with', 'Cleaning data with AI', 'Protecting sensitive data'] },
      { title: 'Analysing', lessons: ['Asking good analytical questions', 'Formulas and code written for you', 'Charts and dashboards'] },
      { title: 'Trusting the results', lessons: ['Checking the numbers', 'Explaining results to others', 'A complete analysis'] },
    ],
    kind: 'chart', color: '#1F3A75',
  },
  {
    slug: 'ai-coding', title: 'AI coding assistants', area: 'Data & code', group: 'Data & code',
    text: 'Build small tools and websites with Cursor, GitHub Copilot and Claude Code.',
    description: 'Use AI coding assistants to build and fix real software, even as a beginner: describe what you want, review what the AI writes, test it and ship it safely.',
    outcomes: ['Set up an AI coding assistant and a project', 'Describe features so the AI builds them correctly', 'Read, test and debug AI-written code', 'Ship a small project safely'],
    modules: [
      { title: 'Getting set up', lessons: ['What AI coding assistants do', 'Cursor, Copilot and Claude Code', 'Your first project'] },
      { title: 'Building with AI', lessons: ['Describing features clearly', 'Reviewing AI-written code', 'Debugging with AI'] },
      { title: 'Shipping', lessons: ['Testing and version control', 'Security basics', 'Publishing your project'] },
    ],
    kind: 'code', color: '#1F3A75',
  },
  {
    slug: 'responsible-ai', title: 'Responsible AI', area: 'Trust & safety', group: 'Trust & safety',
    text: 'Use AI at work within the law: GDPR, the EU AI Act, bias and confidentiality.',
    description: 'Know the rules and risks of AI at work: data protection, the EU AI Act, intellectual property, bias, transparency and the policies that keep you and your organisation safe.',
    outcomes: ['Know what data you may share with an AI tool', 'Understand the EU AI Act risk levels and duties', 'Spot bias and reduce it', 'Write a simple AI use policy for a team'],
    modules: [
      { title: 'Risks and data', lessons: ['What can go wrong with AI', 'Personal data and GDPR', 'Confidentiality and trade secrets'] },
      { title: 'The rules', lessons: ['The EU AI Act', 'Copyright and intellectual property', 'Transparency and disclosure'] },
      { title: 'In practice', lessons: ['Bias and fairness', 'Human oversight', 'Writing an AI use policy'] },
    ],
    kind: 'shield', color: '#2B4A8B',
  },
];

export const GROUPS = [
  { title: 'Artificial intelligence', text: 'Build your own AI agent and prove you can use AI at work.' },
  { title: 'AI assistants', text: 'The assistants everyone now works with, used properly.' },
  { title: 'Prompting & research', text: 'Get reliable answers and sources you can defend.' },
  { title: 'Creative AI', text: 'Images, video and voice made with AI, ready to publish.' },
  { title: 'Automation & agents', text: 'Let AI take over repetitive work, safely.' },
  { title: 'Data & code', text: 'Analyse data and build software with an AI at your side.' },
  { title: 'Trust & safety', text: 'Use AI within the law and with good judgement.' },
];

export const programBySlug = (slug: string) => PROGRAMS.find((p) => p.slug === slug) ?? null;

/** Where a certification card links to. */
export const programHref = (p: Program) => p.href ?? `/certifications/${p.slug}`;

// Registrations from the student pages (/studies, /etudes…) use this programme id and the
// translated course of lib/course.ts; catalogue purchases use the programme slug.
export const STUDENT_PROGRAM = 'student-ai';

export function lessonIds(program: Program) {
  return program.modules.flatMap((m, i) => m.lessons.map((_, j) => `${program.slug}-m${i + 1}-l${j + 1}`));
}

export const ALL_PROGRAM_LESSON_IDS = PROGRAMS.flatMap(lessonIds);
