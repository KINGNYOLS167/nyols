"""Bake the golf ball's dimples into an object-space normal map.

Equirectangular layout matching three.js SphereGeometry UVs, so the map lines up with
public/ball/albedo-*.webp. 392 dimples on a Fibonacci sphere, each a shallow bowl.

    python3 scripts/bake_ball.py          ->  public/ball/normal-2k.webp, normal-1k.webp
"""
from pathlib import Path

import numpy as np
from PIL import Image

OUT = Path(__file__).resolve().parent.parent / "public" / "ball"
N_DIMPLES = 392
COVER = 0.78          # share of the surface inside dimples
MAX_TILT = 0.36       # radians: steepest slope of a dimple wall
EDGE = 0.93           # start softening the rim at this fraction of the dimple radius


def fibonacci_sphere(n):
    i = np.arange(n) + 0.5
    y = 1 - 2 * i / n
    r = np.sqrt(1 - y * y)
    golden = np.pi * (3 - np.sqrt(5))
    phi = golden * i
    return np.stack([np.cos(phi) * r, y, np.sin(phi) * r], axis=1)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def bake(width, height):
    centres = fibonacci_sphere(N_DIMPLES)
    radius = np.sqrt(4 * COVER / N_DIMPLES)          # angular radius of one dimple
    px = (np.arange(width) + 0.5) / width
    py = (np.arange(height) + 0.5) / height
    phi = px * 2 * np.pi                              # three.js: u -> phi
    theta = py * np.pi                                # image row 0 = top = theta 0
    sin_t, cos_t = np.sin(theta)[:, None], np.cos(theta)[:, None]
    d = np.stack([-np.cos(phi)[None, :] * sin_t, np.broadcast_to(cos_t, (height, width)),
                  np.sin(phi)[None, :] * sin_t], axis=-1).reshape(-1, 3)
    out = np.empty_like(d)
    for s in range(0, len(d), 65536):
        dd = d[s:s + 65536]
        dots = dd @ centres.T
        k = dots.argmax(axis=1)
        cos_a = np.clip(dots[np.arange(len(dd)), k], -1, 1)
        ang = np.arccos(cos_a)
        c = centres[k]
        t = dd * cos_a[:, None] - c                    # tangent at d, pointing away from the dimple centre
        tn = np.linalg.norm(t, axis=1, keepdims=True)
        t = np.divide(t, tn, out=np.zeros_like(t), where=tn > 1e-9)
        tilt = np.where(ang < radius, MAX_TILT * (ang / radius) * (1 - smoothstep(EDGE * radius, radius, ang)), 0)
        n = dd * np.cos(tilt)[:, None] - t * np.sin(tilt)[:, None]   # bowl: normal leans toward the centre
        out[s:s + 65536] = n / np.linalg.norm(n, axis=1, keepdims=True)
    rgb = np.round((out * 0.5 + 0.5) * 255).astype(np.uint8).reshape(height, width, 3)
    return Image.fromarray(rgb, "RGB")


if __name__ == "__main__":
    OUT.mkdir(parents=True, exist_ok=True)
    for w, h, name in ((2048, 1024, "2k"), (1024, 512, "1k")):
        img = bake(w, h)
        dst = OUT / f"normal-{name}.webp"
        img.save(dst, "WEBP", lossless=True, quality=100, method=6)
        print(dst.name, f"{dst.stat().st_size / 1024:.0f} KB")
