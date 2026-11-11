import type { Locale } from './locales';

// Course outline. Lesson ids are stable keys for progress tracking; the lesson bodies are still to be written.
type Lesson = { id: string; title: Record<Locale, string> };
type Module = { id: string; title: Record<Locale, string>; lessons: Lesson[] };

const L = (en: string, fr: string, es: string, it: string, de: string): Record<Locale, string> => ({ 'en-us': en, fr, es, it, de });

export const COURSE: Module[] = [
  {
    id: 'm1',
    title: L('Foundations', 'Les bases', 'Fundamentos', 'Le basi', 'Grundlagen'),
    lessons: [
      { id: 'm1-l1', title: L('What AI can and can’t do at work', 'Ce que l’IA sait faire ou non au travail', 'Lo que la IA puede y no puede hacer en el trabajo', 'Cosa l’IA può e non può fare al lavoro', 'Was KI im Job kann und was nicht') },
      { id: 'm1-l2', title: L('Prompts that actually deliver', 'Des prompts qui donnent des résultats', 'Prompts que de verdad funcionan', 'Prompt che funzionano davvero', 'Prompts, die wirklich liefern') },
      { id: 'm1-l3', title: L('Picking the right tool', 'Choisir le bon outil', 'Elegir la herramienta adecuada', 'Scegliere lo strumento giusto', 'Das richtige Tool wählen') },
    ],
  },
  {
    id: 'm2',
    title: L('Automation', 'L’automatisation', 'Automatización', 'Automazione', 'Automatisierung'),
    lessons: [
      { id: 'm2-l1', title: L('Plugging AI into your documents and data', 'Connecter l’IA à tes documents et tes données', 'Conectar la IA a tus documentos y datos', 'Collegare l’IA a documenti e dati', 'KI mit Dokumenten und Daten verbinden') },
      { id: 'm2-l2', title: L('Building your first agent', 'Créer ton premier agent', 'Crear tu primer agente', 'Creare il tuo primo agente', 'Deinen ersten Agenten bauen') },
      { id: 'm2-l3', title: L('Giving your agent a real job', 'Donner un vrai travail à ton agent', 'Dar a tu agente un trabajo real', 'Dare al tuo agente un lavoro reale', 'Deinem Agenten eine echte Aufgabe geben') },
    ],
  },
  {
    id: 'm3',
    title: L('Refine and ship', 'Peaufiner et livrer', 'Pulir y terminar', 'Rifinisci e consegna', 'Verfeinern und abschließen'),
    lessons: [
      { id: 'm3-l1', title: L('Testing your agent', 'Tester ton agent', 'Probar tu agente', 'Testare il tuo agente', 'Deinen Agenten testen') },
      { id: 'm3-l2', title: L('Troubleshooting', 'Corriger les problèmes', 'Resolver problemas', 'Risolvere i problemi', 'Fehler beheben') },
      { id: 'm3-l3', title: L('Guided project walkthrough', 'Pas-à-pas guidé du projet', 'Guía paso a paso del proyecto', 'Guida passo passo al progetto', 'Geführte Projektanleitung') },
    ],
  },
];

export const ALL_LESSON_IDS = COURSE.flatMap((m) => m.lessons.map((l) => l.id));
