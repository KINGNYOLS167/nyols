"""Draws public/textures/contours.svg: topographic contour lines, like the slope maps golfers use
to read a green. Smooth random terrain -> marching squares -> joined, smoothed polylines.
    python3 scripts/contours.py [seed]
"""
import math, sys
import numpy as np

SEED = int(sys.argv[1]) if len(sys.argv) > 1 else 18
W, H, NX, NY, LEVELS = 1600, 1000, 200, 125, 22
rng = np.random.default_rng(SEED)
xs, ys = np.meshgrid(np.linspace(0, 1.6, NX), np.linspace(0, 1, NY))
z = np.zeros_like(xs)
for _ in range(14):  # rolling hills and hollows
    cx, cy = rng.uniform(-0.2, 1.8), rng.uniform(-0.2, 1.2)
    s = rng.uniform(0.12, 0.42)
    z += rng.uniform(-1, 1.4) * np.exp(-((xs - cx) ** 2 + (ys - cy) ** 2) / (2 * s * s))
z += 0.25 * np.sin(xs * 2.1 + 0.6) * np.cos(ys * 2.7)
levels = np.linspace(z.min(), z.max(), LEVELS + 2)[1:-1]

def interp(p1, p2, v1, v2, t):
    a = (t - v1) / (v2 - v1) if v2 != v1 else 0.5
    return (p1[0] + a * (p2[0] - p1[0]), p1[1] + a * (p2[1] - p1[1]))

def segments(t):
    out = []
    for j in range(NY - 1):
        for i in range(NX - 1):
            c = [(i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1)]
            v = [z[j, i], z[j, i + 1], z[j + 1, i + 1], z[j + 1, i]]
            idx = sum(1 << k for k in range(4) if v[k] > t)
            if idx in (0, 15):
                continue
            e = []
            for k in range(4):
                a, b = k, (k + 1) % 4
                if (v[a] > t) != (v[b] > t):
                    e.append(interp(c[a], c[b], v[a], v[b], t))
            if len(e) == 2:
                out.append((e[0], e[1]))
            elif len(e) == 4:
                out.append((e[0], e[1])); out.append((e[2], e[3]))
    return out

def join(segs):
    key = lambda p: (round(p[0], 4), round(p[1], 4))
    ends = {}
    for s in segs:
        for p in s:
            ends.setdefault(key(p), []).append(s)
    used, lines = set(), []
    for s in segs:
        if id(s) in used:
            continue
        used.add(id(s))
        line = [s[0], s[1]]
        for direction in (1, 0):
            while True:
                tip = line[-1] if direction else line[0]
                nxt = [o for o in ends.get(key(tip), []) if id(o) not in used]
                if not nxt:
                    break
                o = nxt[0]; used.add(id(o))
                q = o[1] if key(o[0]) == key(tip) else o[0]
                if direction: line.append(q)
                else: line.insert(0, q)
        if len(line) > 6:
            lines.append(line)
    return lines

def path(line):
    pts = [(x / (NX - 1) * W, y / (NY - 1) * H) for x, y in line][::2]
    if len(pts) < 3:
        return ''
    d = f'M{pts[0][0]:.0f} {pts[0][1]:.0f}'
    for k in range(len(pts) - 1):  # Catmull-Rom to cubic Bezier
        p0 = pts[k - 1] if k else pts[k]; p1 = pts[k]; p2 = pts[k + 1]; p3 = pts[k + 2] if k + 2 < len(pts) else p2
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += f'C{c1[0]:.0f} {c1[1]:.0f} {c2[0]:.0f} {c2[1]:.0f} {p2[0]:.0f} {p2[1]:.0f}'
    return d

paths = []
for n, t in enumerate(levels):
    for line in join(segments(t)):
        d = path(line)
        if d:
            paths.append((n % 5 == 0, d))
body = ''.join(f'<path d="{d}"{" stroke-width=\"1.5\" stroke-opacity=\"0.34\"" if major else ""}/>' for major, d in paths)
svg = (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {W} {H}" preserveAspectRatio="xMidYMid slice">'
       f'<g fill="none" stroke="#C7B58A" stroke-opacity="0.2" stroke-width="0.9" stroke-linecap="round">{body}</g></svg>')
open('public/textures/contours.svg', 'w').write(svg)
print(len(paths), 'lines,', len(svg) // 1024, 'KB')
