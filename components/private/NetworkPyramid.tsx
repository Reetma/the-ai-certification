'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import CopyLink from '@/components/private/CopyLink';

// The ambassador network drawn as a pyramid: the top person, then each row below the one who invited them.
// SVG, so it stays sharp at any zoom. It opens on the whole pyramid (the more people, the further out), then you
// move around by zooming (pinch, Ctrl + wheel or the buttons, around the point aimed at) and dragging. No animation.
// A “+” under the viewer opens their invite link; whoever joins through it takes a place there.

export type PyramidNode = {
  id: string;
  name: string;
  school: string;
  paid: number;
  size: number;
  /** Commission the viewer earns on this person's school, in %, or 0. */
  rate: number;
  earned: string;
  children: PyramidNode[];
};

const W = 168; // card
const H = 64;
const GAP = 16; // between cards of a row
const ROW = 56; // between rows
const PAD = 16;
const MAX_ZOOM = 2.5;

type Placed = { node: PyramidNode; x: number; y: number; depth: number; parent?: Placed; invite?: boolean };
const INVITE_ID = '__invite';

export default function NetworkPyramid({ root, sponsor, viewerEarns, inviteUrl }: { root: PyramidNode; sponsor?: string | null; viewerEarns: boolean; inviteUrl: string }) {
  const [showInvite, setShowInvite] = useState(false);
  const top = sponsor ? H + ROW : 0; // room for “invited by” above the root

  const { placed, width, height } = useMemo(() => {
    const out: Placed[] = [];
    let leaf = 0;
    let maxDepth = 0;
    const place = (n: PyramidNode, depth: number, parent?: Placed): Placed => {
      const p: Placed = { node: n, x: 0, y: top + depth * (H + ROW), depth, parent, invite: n.id === INVITE_ID };
      maxDepth = Math.max(maxDepth, depth);
      out.push(p);
      // The viewer's own row ends with a “+” slot: the next person they invite.
      const children = depth === 0 ? [...n.children, { id: INVITE_ID, name: '', school: '', paid: 0, size: 0, rate: 0, earned: '', children: [] }] : n.children;
      const kids = children.map((c) => place(c, depth + 1, p));
      p.x = kids.length ? (kids[0].x + kids[kids.length - 1].x) / 2 : leaf++ * (W + GAP);
      return p;
    };
    place(root, 0);
    const w = Math.max(Math.max(leaf, 1) * (W + GAP) - GAP, W) + PAD * 2;
    const h = top + (maxDepth + 1) * (H + ROW) - ROW + PAD * 2;
    return { placed: out, width: w, height: h };
  }, [root, top]);

  const box = useRef<HTMLDivElement>(null);
  const [zoom, setZoom] = useState(1);
  // The frame is as tall as the pyramid needs at full width, between a small minimum and 70 % of the screen.
  const [boxH, setBoxH] = useState<number | undefined>(undefined);
  const zoomRef = useRef(zoom);
  zoomRef.current = zoom;

  // The whole pyramid in view.
  const fitZoom = () => {
    const el = box.current;
    if (!el) return 1;
    return Math.min(1, (el.clientWidth - 4) / width, (el.clientHeight - 4) / height);
  };

  // Zooming keeps the aimed point still (in box pixels); applied once the new size is laid out.
  const anchor = useRef<{ cx: number; cy: number; sx: number; sy: number } | null>(null);
  const offset = (z: number) => {
    const el = box.current!;
    return { x: Math.max(0, (el.clientWidth - width * z) / 2), y: Math.max(0, (el.clientHeight - height * z) / 2) };
  };
  const zoomAt = (next: number, sx?: number, sy?: number) => {
    const el = box.current;
    if (!el) return;
    const z = zoomRef.current;
    const nz = Math.max(fitZoom(), Math.min(MAX_ZOOM, next));
    const px = sx ?? el.clientWidth / 2;
    const py = sy ?? el.clientHeight / 2;
    const o = offset(z);
    anchor.current = { cx: (el.scrollLeft + px - o.x) / z, cy: (el.scrollTop + py - o.y) / z, sx: px, sy: py };
    zoomRef.current = nz;
    setZoom(nz);
  };
  useLayoutEffect(() => {
    const el = box.current;
    const a = anchor.current;
    if (!el || !a) return;
    const o = offset(zoom);
    el.scrollLeft = a.cx * zoom + o.x - a.sx;
    el.scrollTop = a.cy * zoom + o.y - a.sy;
    anchor.current = null;
  }, [zoom]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const big = Math.min(window.innerHeight * 0.7, 680);
    // The frame follows the pyramid's shape at full width (a wide one gets a low frame), never too low to zoom in.
    const atFit = height * Math.min(1, (el.clientWidth - 4) / width) + 8;
    setBoxH(Math.round(Math.max(Math.min(300, big), Math.min(big, atFit))));
  }, [width, height]);
  useEffect(() => { if (boxH) setZoom(fitZoom()); }, [boxH]); // eslint-disable-line react-hooks/exhaustive-deps

  // Ctrl + wheel and trackpad pinch zoom around the pointer (a plain wheel scrolls the page as usual).
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      if (!e.ctrlKey) return;
      e.preventDefault();
      const r = el.getBoundingClientRect();
      zoomAt(zoomRef.current * Math.exp(-e.deltaY / 200), e.clientX - r.left, e.clientY - r.top);
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }); // eslint-disable-line react-hooks/exhaustive-deps

  // One finger or the mouse drags the view, two fingers pinch to zoom.
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinch = useRef<{ dist: number; zoom: number } | null>(null);
  const travel = useRef(0); // how far the pointer moved: a tap opens the “+”, a drag does not
  const onDown = (e: React.PointerEvent) => {
    if (pointers.current.size === 0) travel.current = 0;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y) || 1, zoom: zoomRef.current };
    }
  };
  const onMove = (e: React.PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    const el = box.current;
    if (!prev || !el) return;
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pointers.current.size >= 2 && pinch.current) {
      travel.current += 100;
      const [a, b] = [...pointers.current.values()];
      const r = el.getBoundingClientRect();
      zoomAt(pinch.current.zoom * (Math.hypot(a.x - b.x, a.y - b.y) / pinch.current.dist), (a.x + b.x) / 2 - r.left, (a.y + b.y) / 2 - r.top);
      return;
    }
    travel.current += Math.abs(e.clientX - prev.x) + Math.abs(e.clientY - prev.y);
    el.scrollLeft -= e.clientX - prev.x;
    el.scrollTop -= e.clientY - prev.y;
  };
  const onUp = (e: React.PointerEvent) => {
    pointers.current.delete(e.pointerId);
    if (pointers.current.size < 2) pinch.current = null;
  };

  const cut = (t: string, n: number) => (t.length > n ? `${t.slice(0, n - 1)}…` : t);
  const rootX = placed[0]?.x ?? 0;

  return (
    <div className="py-wrap">
      <div className="py-tools">
        <button type="button" onClick={() => zoomAt(zoom / 1.4)} aria-label="Zoom out">−</button>
        <button type="button" onClick={() => zoomAt(zoom * 1.4)} aria-label="Zoom in">+</button>
        <button type="button" onClick={() => setZoom(fitZoom())}>See everyone</button>
        <span className="py-zoom">{Math.round(zoom * 100)} %</span>
      </div>
      <div className="py-box" ref={box} style={boxH ? { height: boxH } : undefined} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onPointerLeave={onUp}>
        <svg width={width * zoom} height={height * zoom} viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Ambassador network">
          <g transform={`translate(${PAD},${PAD})`}>
            {sponsor && (
              <g>
                <rect x={rootX} y={0} width={W} height={H} rx={14} className="py-sponsor" />
                <text x={rootX + W / 2} y={26} textAnchor="middle" className="py-small">Invited by</text>
                <text x={rootX + W / 2} y={46} textAnchor="middle" className="py-name">{cut(sponsor, 20)}</text>
                <path d={`M${rootX + W / 2},${H} V${top}`} className="py-line" />
              </g>
            )}
            {placed.filter((p) => p.parent).map((p) => {
              const px = p.parent!.x + W / 2, py = p.parent!.y + H, cx = p.x + W / 2, mid = py + ROW / 2;
              return <path key={`l-${p.node.id}`} d={`M${px},${py} V${mid} H${cx} V${p.y}`} className="py-line" />;
            })}
            {placed.filter((p) => p.invite).map((p) => (
              <g key={INVITE_ID} transform={`translate(${p.x},${p.y})`} className="py-invite" onClick={() => travel.current < 8 && setShowInvite(true)} role="button" aria-label="Invite someone">
                <rect width={W} height={H} rx={14} className="py-invite-box" />
                <circle cx={24} cy={H / 2} r={14} className="py-invite-plus-c" />
                <text x={24} y={H / 2 + 6} textAnchor="middle" className="py-invite-plus">+</text>
                <text x={46} y={28} className="py-name">Invite someone</text>
                <text x={46} y={45} className="py-small">Tap to copy your link</text>
              </g>
            ))}
            {placed.filter((p) => !p.invite).map((p) => {
              const n = p.node;
              const isRoot = p.depth === 0;
              const tone = isRoot ? 'py-root' : !viewerEarns ? 'py-node' : n.rate ? 'py-node py-earn' : 'py-node py-far';
              return (
                <g key={n.id} transform={`translate(${p.x},${p.y})`}>
                  <title>{`${n.name}\n${n.school}\n${n.paid} paid students · ${n.size} below${n.rate ? `\n${n.rate} % for you${n.earned ? ` (${n.earned})` : ''}` : ''}`}</title>
                  <rect width={W} height={H} rx={14} className={tone} />
                  <circle cx={24} cy={H / 2} r={14} className="py-avatar" />
                  <text x={24} y={H / 2 + 5} textAnchor="middle" className="py-initial">{(n.name.trim()[0] ?? '?').toUpperCase()}</text>
                  <text x={46} y={24} className="py-name">{cut(n.name, isRoot ? 14 : 15)}</text>
                  <text x={46} y={42} className="py-small">{isRoot ? cut(n.school, 20) : `${n.paid} paid · ${n.size} below`}</text>
                  {!isRoot && viewerEarns && n.rate > 0 && <text x={46} y={56} className="py-rate">{n.rate} % for you</text>}
                </g>
              );
            })}
          </g>
        </svg>
      </div>
      {showInvite && (
        <div className="py-invite-pop" role="dialog" aria-label="Your invite link">
          <div className="py-invite-card">
            <strong>Invite someone</strong>
            <p className="help">Send this link. When they join, they take this place in your pyramid.</p>
            <CopyLink url={inviteUrl} shareText="Join me as an ambassador for The AI Certification:" />
            <button type="button" className="linklike" onClick={() => setShowInvite(false)}>Close</button>
          </div>
        </div>
      )}
      <p className="help py-hint">Pinch or Ctrl + scroll to zoom where you point, drag to move around.</p>
    </div>
  );
}
