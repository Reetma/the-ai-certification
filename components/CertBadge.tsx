// The AI Certification badges: one shape for every certification, a colour and an icon each.
// Our own artwork, shown when no product logo has been placed in public/logos/.

const ICONS: Record<string, React.ReactNode> = {
  ai: <><path d="M12 3l1.8 4.6L18.5 9l-4.7 1.4L12 15l-1.8-4.6L5.5 9l4.7-1.4z" /><path d="M18 15l.9 2.1L21 18l-2.1.9L18 21l-.9-2.1L15 18l2.1-.9z" /></>,
  slides: <><rect x="3" y="4" width="18" height="12" rx="1.5" /><path d="M12 16v4M8 20h8M7 12l3-3 2 2 4-4" /></>,
  doc: <><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></>,
  sheet: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M3 9h18M3 14h18M9 4v16M15 4v16" /></>,
  compass: <><circle cx="12" cy="12" r="9" /><path d="M15.5 8.5l-2 5-5 2 2-5z" /></>,
  chart: <><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>,
  lock: <><rect x="5" y="11" width="14" height="10" rx="2" /><path d="M8 11V7a4 4 0 0 1 8 0v4M12 15v2" /></>,
  megaphone: <><path d="M3 11v2a1 1 0 0 0 1 1h2l5 4V6L6 10H4a1 1 0 0 0-1 1z" /><path d="M15 9a4 4 0 0 1 0 6M18 6a8 8 0 0 1 0 12" /></>,
  kanban: <><rect x="3" y="4" width="18" height="16" rx="1.5" /><path d="M9 4v16M15 4v16M5.5 8h2M11.5 8h2M17.5 8h2M11.5 12h2" /></>,
  leaf: <><path d="M5 19c0-9 5-14 15-15-1 10-6 15-15 15z" /><path d="M5 19l7-7" /></>,
  mic: <><rect x="9" y="3" width="6" height="11" rx="3" /><path d="M5 11a7 7 0 0 0 14 0M12 18v3" /></>,
  chat: <><path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.5A8 8 0 1 1 21 12z" /><path d="M8.5 12h.01M12 12h.01M15.5 12h.01" /></>,
  image: <><rect x="3" y="4" width="18" height="16" rx="2" /><circle cx="9" cy="10" r="2" /><path d="M21 16l-5-5-9 9" /></>,
  video: <><rect x="3" y="6" width="13" height="12" rx="2" /><path d="M16 10l5-3v10l-5-3z" /></>,
  bolt: <><path d="M13 2L4 14h7l-1 8 9-12h-7z" /></>,
  bot: <><rect x="4" y="8" width="16" height="12" rx="3" /><path d="M12 8V4M9 13h.01M15 13h.01M9 17h6" /><circle cx="12" cy="3.5" r="1" /></>,
  code: <><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M14 4l-4 16" /></>,
  shield: <><path d="M12 3l8 3v6c0 4.5-3.4 8.3-8 9-4.6-.7-8-4.5-8-9V6z" /><path d="M8.5 12l2.5 2.5 4.5-4.5" /></>,
};

export type BadgeKind = keyof typeof ICONS;

export default function CertBadge({ kind, color, size = 56 }: { kind: BadgeKind; color: string; size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 56 56" aria-hidden="true">
      {/* Hexagon badge with a ribbon notch, in the certification colour */}
      <path d="M28 2l22.5 13v26L28 54 5.5 41V15z" fill={color} />
      <path d="M28 7.5l17.8 10.3v20.4L28 48.5 10.2 38.2V17.8z" fill="none" stroke="rgba(255,255,255,.35)" strokeWidth="1.2" />
      <g transform="translate(16 16)" fill="none" stroke="#fff" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
        <svg width="24" height="24" viewBox="0 0 24 24">{ICONS[kind]}</svg>
      </g>
    </svg>
  );
}
