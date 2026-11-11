"""Generate The AI Certification logo set (outlined SVG, no font dependency)."""
import io, sys
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
from fontTools.pens.boundsPen import BoundsPen
import uharfbuzz as hb

SRC, OUT = sys.argv[1], sys.argv[2]
NAVY, NIGHT, GOLD, GOLD_DEEP, WHITE = '#17274C', '#0B152C', '#D4A74C', '#A8803A', '#FFFFFF'


def load(w):
    f = TTFont(SRC)
    f = instantiateVariableFont(f, {'wght': w})
    buf = io.BytesIO(); f.flavor = None; f.save(buf)
    data = buf.getvalue()
    return TTFont(io.BytesIO(data)), hb.Font(hb.Face(data))

FONTS = {w: load(w) for w in (500, 600, 800)}


def shape(text, w, size, x0, y0, tracking=0.0):
    """Return (svg path d, glyph boxes list, advance width) for text at baseline y0."""
    tt, hf = FONTS[w]
    upem = tt['head'].unitsPerEm
    s = size / upem
    buf = hb.Buffer(); buf.add_str(text); buf.guess_segment_properties()
    hb.shape(hf, buf, {'kern': True, 'liga': False})
    gs = tt.getGlyphSet(); order = tt.getGlyphOrder()
    pen = SVGPathPen(gs)
    x = 0; boxes = []
    for info, pos in zip(buf.glyph_infos, buf.glyph_positions):
        name = order[info.codepoint]
        ox = x0 + (x + pos.x_offset) * s
        t = (s, 0, 0, -s, ox, y0)
        gs[name].draw(TransformPen(pen, t))
        bp = BoundsPen(gs); gs[name].draw(bp)
        if bp.bounds:
            a, b, c, d = bp.bounds
            boxes.append((ox + a * s, y0 - d * s, ox + c * s, y0 - b * s))
        else:
            boxes.append(None)
        x += pos.x_advance + tracking * upem
    return pen.getCommands(), boxes, (x - tracking * upem) * s


def star(cx, cy, r, k=0.16):
    """Four-point sparkle, like the star on Kai's medal."""
    q = r * k
    return (f'M{cx:.2f} {cy - r:.2f}Q{cx + q:.2f} {cy - q:.2f} {cx + r:.2f} {cy:.2f}'
            f'Q{cx + q:.2f} {cy + q:.2f} {cx:.2f} {cy + r:.2f}Q{cx - q:.2f} {cy + q:.2f} {cx - r:.2f} {cy:.2f}'
            f'Q{cx - q:.2f} {cy - q:.2f} {cx:.2f} {cy - r:.2f}Z')


def symbol(cx, cy, r, bg=NAVY, ring=GOLD, st=GOLD):
    """Medal mark: navy disc, gold ring, gold sparkle."""
    return (f'<circle cx="{cx}" cy="{cy}" r="{r}" fill="{bg}"/>'
            f'<circle cx="{cx}" cy="{cy}" r="{r * 0.84:.2f}" fill="none" stroke="{ring}" stroke-width="{r * 0.07:.2f}"/>'
            f'<path d="{star(cx, cy, r * 0.56)}" fill="{st}"/>')


def wordmark(x0, base, size, ink, accent):
    """'The AI Certification' on one line, star above the I. Returns (svg, width, top)."""
    sp = size * 0.26
    d1, _, w1 = shape('The', 600, size, x0, base)
    xa = x0 + w1 + sp
    d2, bx, w2 = shape('AI', 800, size, xa, base)
    xc = xa + w2 + sp
    d3, _, w3 = shape('Certification', 600, size, xc, base)
    i = bx[1]  # box of the I
    icx = (i[0] + i[2]) / 2
    sr = size * 0.26
    scy = i[1] - size * 0.1 - sr
    svg = (f'<path d="{d1} {d3}" fill="{ink}"/><path d="{d2}" fill="{ink}"/>'
           f'<path d="{star(icx, scy, sr)}" fill="{accent}"/>')
    return svg, xc + w3 - x0, scy - sr


def stacked(cx, top, size, ink, accent):
    """'The AI' big over 'CERTIFICATION' tracked. Returns (svg, width, height)."""
    big = size
    # measure
    _, _, wt = shape('The', 600, big, 0, 0)
    _, _, wa = shape('AI', 800, big, 0, 0)
    sp = big * 0.24
    wl1 = wt + sp + wa
    small = big * 0.34
    _, _, wl2 = shape('CERTIFICATION', 600, small, 0, 0, tracking=0.18)
    sr = big * 0.24
    base1 = top + sr * 2 + big * 0.1 + big * 0.73
    x1 = cx - wl1 / 2
    d1, _, _ = shape('The', 600, big, x1, base1)
    d2, bx, _ = shape('AI', 800, big, x1 + wt + sp, base1)
    i = bx[1]; icx = (i[0] + i[2]) / 2
    scy = i[1] - big * 0.1 - sr
    base2 = base1 + small * 1.55
    d3, _, _ = shape('CERTIFICATION', 600, small, cx - wl2 / 2, base2, tracking=0.18)
    svg = (f'<path d="{d1} {d2}" fill="{ink}"/><path d="{star(icx, scy, sr)}" fill="{accent}"/>'
           f'<path d="{d3}" fill="{ink}"/>')
    return svg, max(wl1, wl2), base2 - top


def write(name, w, h, body, bg=None):
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ''
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">'
           f'<title>The AI Certification</title>{rect}{body}</svg>\n')
    open(f'{OUT}/{name}', 'w').write(svg)


# 1. Horizontal: medal + wordmark (wordmark measured first so the star is never clipped)
for name, ink in (('logo.svg', NAVY), ('logo-white.svg', WHITE)):
    size = 100; pad = 20; r = 58; gap = 30
    probe, ww, top = wordmark(0, 0, size, ink, GOLD)   # top < 0: star height above baseline
    cap = size * 0.72
    H = 2 * pad + max(-top, 2 * r)
    base = pad + (-top)                                # star top sits on pad
    cy = base - cap / 2                                # medal centred on the capitals
    H = max(H, cy + r + pad)
    wm, _, _ = wordmark(pad + 2 * r + gap, base, size, ink, GOLD)
    sym = symbol(pad + r, cy, r, bg=NAVY if ink == NAVY else WHITE)
    write(name, pad + 2 * r + gap + ww + pad, H, sym + wm)

# 2. Wordmark only
for name, ink in (('wordmark.svg', NAVY), ('wordmark-white.svg', WHITE)):
    size = 100; pad = 16
    wm, ww, top = wordmark(pad, 0, size, ink, GOLD)
    # shift so star top sits at pad
    body = f'<g transform="translate(0 {pad - top:.2f})">{wm}</g>'
    write(name, ww + 2 * pad, (pad - top) + size * 0.03 + pad, body)

# 3. Stacked (for square spaces, certificate, social)
for name, ink in (('logo-stacked.svg', NAVY), ('logo-stacked-white.svg', WHITE)):
    r = 70; W = 620; top = 30
    sym = symbol(W / 2, top + r, r, bg=NAVY if ink == NAVY else WHITE)
    st, sw, sh = stacked(W / 2, top + 2 * r + 30, 150, ink, GOLD)
    write(name, W, top + 2 * r + 30 + sh + 40, sym + st)

# 4. Symbol / app icon
write('symbol.svg', 128, 128, symbol(64, 64, 64))
write('icon.svg', 512, 512,
      f'<rect width="512" height="512" rx="112" fill="{NAVY}"/>'
      f'<circle cx="256" cy="256" r="178" fill="none" stroke="{GOLD}" stroke-width="22"/>'
      f'<path d="{star(256, 256, 128)}" fill="{GOLD}"/>')
write('icon-maskable.svg', 512, 512,
      f'<rect width="512" height="512" fill="{NAVY}"/>'
      f'<circle cx="256" cy="256" r="140" fill="none" stroke="{GOLD}" stroke-width="18"/>'
      f'<path d="{star(256, 256, 100)}" fill="{GOLD}"/>')
write('favicon.svg', 64, 64,
      f'<rect width="64" height="64" rx="14" fill="{NAVY}"/><path d="{star(32, 32, 24, 0.2)}" fill="{GOLD}"/>')
print('done')
