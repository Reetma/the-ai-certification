"""Generate the AI Certification logo set (outlined SVG, no font dependency).
Usage: python3 generate-logo.py fonts/plus-jakarta-sans-latin-wght-normal.woff2 .   (font: Plus Jakarta Sans, OFL)"""
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


def symbol(cx, cy, r, bg=NAVY, st=WHITE):
    """Mark: a rounded square with the four-point star in the middle (navy and white only)."""
    return (f'<rect x="{cx - r:.2f}" y="{cy - r:.2f}" width="{2 * r:.2f}" height="{2 * r:.2f}" rx="{r * 0.5:.2f}" fill="{bg}"/>'
            f'<path d="{star(cx, cy, r * 0.6, 0.18)}" fill="{st}"/>')


def wordmark(x0, base, size, ink, accent):
    """'AI Certification' on one line, star above the I. Returns (svg, width, top)."""
    sp = size * 0.26
    d1, w1 = '', 0
    xa = x0
    d2, bx, w2 = shape('AI', 800, size, xa, base)
    xc = xa + w2 + sp
    d3, _, w3 = shape('Certification', 500, size, xc, base)
    i = bx[1]  # box of the I
    icx = (i[0] + i[2]) / 2
    sr = size * 0.26
    scy = i[1] - size * 0.1 - sr
    svg = (f'<path d="{d3}" fill="{ink}"/><path d="{d2}" fill="{ink}"/>'
           f'<path d="{star(icx, scy, sr)}" fill="{accent}"/>')
    return svg, xc + w3 - x0, scy - sr


def stacked(cx, top, size, ink, accent):
    """'The AI' big over 'CERTIFICATION' tracked. Returns (svg, width, height)."""
    big = size
    # measure
    wt = 0
    _, _, wa = shape('AI', 800, big, 0, 0)
    sp = 0
    wl1 = wa
    small = big * 0.34
    _, _, wl2 = shape('CERTIFICATION', 600, small, 0, 0, tracking=0.18)
    sr = big * 0.24
    base1 = top + sr * 2 + big * 0.1 + big * 0.73
    x1 = cx - wl1 / 2
    d1 = ''
    d2, bx, _ = shape('AI', 800, big, x1, base1)
    i = bx[1]; icx = (i[0] + i[2]) / 2
    scy = i[1] - big * 0.1 - sr
    base2 = base1 + small * 1.55
    d3, _, _ = shape('CERTIFICATION', 600, small, cx - wl2 / 2, base2, tracking=0.18)
    svg = (f'<path d="{d2}" fill="{ink}"/><path d="{star(icx, scy, sr)}" fill="{accent}"/>'
           f'<path d="{d3}" fill="{ink}"/>')
    return svg, max(wl1, wl2), base2 - top


def write(name, w, h, body, bg=None):
    rect = f'<rect width="{w:.0f}" height="{h:.0f}" fill="{bg}"/>' if bg else ''
    svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w:.0f} {h:.0f}" width="{w:.0f}" height="{h:.0f}">'
           f'<title>AI Certification</title>{rect}{body}</svg>\n')
    open(f'{OUT}/{name}', 'w').write(svg)


# 1. Logo = the wordmark alone ("AI Certification", star above the I)
for name, ink in (('logo.svg', NAVY), ('logo-white.svg', WHITE)):
    size = 100; pad = 16
    wm, ww, top = wordmark(pad, 0, size, ink, ink)
    write(name, ww + 2 * pad, (pad - top) + size * 0.03 + pad, f'<g transform="translate(0 {pad - top:.2f})">{wm}</g>')

# 2. Wordmark only
for name, ink in (('wordmark.svg', NAVY), ('wordmark-white.svg', WHITE)):
    size = 100; pad = 16
    wm, ww, top = wordmark(pad, 0, size, ink, ink)
    # shift so star top sits at pad
    body = f'<g transform="translate(0 {pad - top:.2f})">{wm}</g>'
    write(name, ww + 2 * pad, (pad - top) + size * 0.03 + pad, body)

# 3. Stacked (for square spaces, certificate, social)
for name, ink in (('logo-stacked.svg', NAVY), ('logo-stacked-white.svg', WHITE)):
    W = 620; top = 30
    st, sw, sh = stacked(W / 2, top, 150, ink, ink)
    write(name, W, top + sh + 40, st)

# 4. Symbol / app icon
write('symbol.svg', 128, 128, symbol(64, 64, 64))
write('icon.svg', 512, 512,
      f'<rect width="512" height="512" rx="112" fill="{NAVY}"/>'
      f'<path d="{star(256, 256, 170, 0.18)}" fill="{WHITE}"/>')
write('icon-maskable.svg', 512, 512,
      f'<rect width="512" height="512" fill="{NAVY}"/>'
      f'<path d="{star(256, 256, 130, 0.18)}" fill="{WHITE}"/>')
write('favicon.svg', 64, 64,
      f'<rect width="64" height="64" rx="14" fill="{NAVY}"/><path d="{star(32, 32, 22, 0.18)}" fill="{WHITE}"/>')
print('done')
