"""Generates the wall textures for the "View on a wall" room (public/static/walls/).

Every tile is seamless (built from FFT-filtered noise, which wraps by construction) and drawn at a
known real-world size, so wallroom.css can scale it with --ppc (pixels per cm) and the bricks and
boards appear at their true size next to the painting.

Usage: python scripts/make-walls.py            (writes the tiles and the small chip swatches)
"""
import os
import numpy as np
from PIL import Image

OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'public', 'static', 'walls')
os.makedirs(OUT, exist_ok=True)


# ---------------------------------------------------------------- noise helpers (all periodic)
def blur_noise(h, w, sy, sx, seed, angle=0.0):
    """White noise blurred by a Gaussian (sigmas in px, optional rotation), zero mean, unit std."""
    r = np.random.default_rng(seed)
    F = np.fft.fft2(r.standard_normal((h, w)))
    fy = np.fft.fftfreq(h)[:, None]
    fx = np.fft.fftfreq(w)[None, :]
    if angle:
        c, s = np.cos(angle), np.sin(angle)
        fx, fy = fx * c + fy * s, -fx * s + fy * c
    g = np.exp(-2 * np.pi ** 2 * ((sy * fy) ** 2 + (sx * fx) ** 2))
    n = np.real(np.fft.ifft2(F * g))
    return (n - n.mean()) / (n.std() + 1e-9)


def fbm(h, w, sigma, seed, octaves=4, gain=0.5, aspect=1.0, angle=0.0):
    """Fractal noise: octaves of blurred noise from coarse (sigma px) to fine. aspect stretches along y."""
    out = np.zeros((h, w))
    amp, total = 1.0, 0.0
    for o in range(octaves):
        s = sigma / 2 ** o
        out += amp * blur_noise(h, w, s * aspect, s, seed + o * 101, angle)
        total += amp
        amp *= gain
    out /= total
    return (out - out.mean()) / (out.std() + 1e-9)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def relief(height, k_down=1.0, k_left=0.35):
    """Shading from a height map, lit from above and a little from the left (the gallery spot)."""
    gy = (np.roll(height, -1, 0) - np.roll(height, 1, 0)) / 2   # + where the surface rises going down = faces up
    gx = (np.roll(height, -1, 1) - np.roll(height, 1, 1)) / 2
    return 1 + k_down * gy + k_left * gx


def save(name, rgb, quality=84):
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8), 'RGB')
    path = os.path.join(OUT, name + '.jpg')
    img.save(path, quality=quality, optimize=True, progressive=True, subsampling='4:2:0')
    return img, path


def swatch(name, img, crop_frac):
    """Small square for the chip: a crop showing a few bricks/boards, downsampled."""
    w, h = img.size
    s = int(min(w, h) * crop_frac)
    sw = img.crop((0, h - s, s, h)).resize((72, 72), Image.LANCZOS)
    sw.save(os.path.join(OUT, name + '-s.jpg'), quality=86, optimize=True)


def avg_hex(rgb):
    m = np.clip(rgb.reshape(-1, 3).mean(0), 0, 255).astype(int)
    return '#%02X%02X%02X' % tuple(m)


# ---------------------------------------------------------------- brick
def brick(painted=False, pxcm=11, seed=11):
    L, Hb, M = 22.2, 7.3, 1.0                       # SA face brick 222 x 73 mm, 10 mm joints
    nx, ny = 4, 8
    W, H = round((L + M) * nx * pxcm), round((Hb + M) * ny * pxcm)
    mx, my = W / nx, H / ny
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    row = np.floor(yy / my).astype(int)
    xr = (xx + (row % 2) * mx / 2) % W               # running bond
    col = np.floor(xr / mx).astype(int) % nx
    lx, ly = xr - col * mx, yy - row * my
    m2 = M * pxcm / 2
    d = np.minimum(np.minimum(lx - m2, mx - m2 - lx), np.minimum(ly - m2, my - m2 - ly))  # px inside the brick
    rough = fbm(H, W, 0.9 * pxcm, seed + 1, octaves=3)
    d_edge = d + rough * (0.07 if painted else 0.12) * pxcm   # slightly uneven arrises
    inside = d_edge > 0

    bid = row * nx + col
    r = np.random.default_rng(seed)
    nb = nx * ny
    if painted:
        pal = np.array([[236, 232, 225]] * nb, float) * r.uniform(0.985, 1.015, (nb, 1))
        mortar_c = np.array([224, 219, 210.0])
    else:
        choices = np.array([[152, 74, 54], [166, 86, 62], [138, 64, 47], [176, 100, 72], [124, 60, 45],
                            [160, 80, 57], [100, 52, 41], [188, 116, 84], [146, 82, 60]], float)
        wts = np.array([16, 14, 12, 9, 8, 14, 4, 5, 8], float)
        pal = choices[r.choice(len(choices), nb, p=wts / wts.sum())] * r.uniform(0.92, 1.08, (nb, 1))
        mortar_c = np.array([178, 170, 158.0])
    base = pal[bid]

    # surface: mottling across each brick, sand grain and small pits
    mott = fbm(H, W, 3.5 * pxcm, seed + 2, octaves=3)
    grain = fbm(H, W, 0.25 * pxcm, seed + 3, octaves=2)
    pits = blur_noise(H, W, 0.6, 0.6, seed + 4)
    pitmask = smoothstep(2.2, 3.2, pits)
    if painted:
        tone = 1 + 0.012 * mott + 0.012 * grain - 0.05 * pitmask
    else:
        burn = smoothstep(0.6 * pxcm, 0, d) * 0.06    # firing makes the edges a touch darker
        tone = 1 + 0.07 * mott + 0.06 * grain - 0.22 * pitmask - burn
    brick_rgb = base * tone[..., None]

    mort_tone = 1 + 0.06 * fbm(H, W, 0.4 * pxcm, seed + 5, octaves=2) + 0.03 * mott
    mort_rgb = mortar_c * mort_tone[..., None]

    # height: bricks proud of a recessed joint, bevelled edges, rough faces
    hb = smoothstep(0, (0.7 if painted else 0.5) * pxcm, d_edge) + (0.035 if painted else 0.09) * grain + 0.06 * mott
    hm = -0.35 + 0.05 * fbm(H, W, 0.3 * pxcm, seed + 6, octaves=2)
    height = np.where(inside, hb, hm)
    shade = relief(height * (1.1 if painted else 1.35), 1.0, 0.35)

    # ambient occlusion in the joints and the shadow under each brick (light from above)
    ins = inside.astype(float)
    occl = np.zeros_like(ins)
    for s in range(1, int(0.75 * pxcm) + 1):
        occl = np.maximum(occl, np.roll(ins, s, 0) * (1 - s / (0.8 * pxcm)))
    ao = np.where(inside, 1.0, 1 - 0.42 * occl - 0.10)
    rgb = np.where(inside[..., None], brick_rgb, mort_rgb) * (shade * ao)[..., None]
    return rgb, (W / pxcm, H / pxcm)


# ---------------------------------------------------------------- off-form concrete
def concrete(pxcm=8, seed=21):
    W = H = round(120 * pxcm)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    base = np.array([182, 178, 171.0])
    cloud = fbm(H, W, 22 * pxcm, seed, octaves=3)
    mid = fbm(H, W, 3.5 * pxcm, seed + 1, octaves=3)
    fine = fbm(H, W, 0.35 * pxcm, seed + 2, octaves=2)
    streak = blur_noise(H, W, 18 * pxcm, 0.6 * pxcm, seed + 3)          # faint vertical weathering
    panel = np.where((yy // (60 * pxcm)) % 2 == 0, 1.0, 0.975)            # each pour a slightly different grey
    tone = panel * (1 + 0.055 * np.tanh(1.4 * cloud) + 0.03 * mid + 0.025 * fine + 0.012 * streak)
    rgb = base * tone[..., None]

    # air pores
    r = np.random.default_rng(seed)
    height = 0.04 * fine
    n = int(W * H / (pxcm * pxcm) * 0.05)
    py, px = r.uniform(0, H, n), r.uniform(0, W, n)
    rad = r.gamma(2.0, 0.09, n) * pxcm
    pore = np.zeros((H, W))
    for y0, x0, rr in zip(py, px, rad):
        rr = max(rr, 0.6)
        y1, y2, x1, x2 = int(y0 - rr - 2), int(y0 + rr + 3), int(x0 - rr - 2), int(x0 + rr + 3)
        ys, xs = np.mgrid[y1:y2, x1:x2]
        dd = np.hypot(ys - y0, xs - x0)
        pore[ys % H, xs % W] = np.maximum(pore[ys % H, xs % W], smoothstep(rr, rr * 0.4, dd))
    height -= 0.9 * pore

    # formwork joints: panels 120 x 60 cm, slight fins where the boards met
    jy = np.minimum(yy % (60 * pxcm), 60 * pxcm - yy % (60 * pxcm))
    jx = np.minimum(xx % (120 * pxcm), 120 * pxcm - xx % (120 * pxcm))
    height += 0.5 * smoothstep(0.35 * pxcm, 0, jy) + 0.5 * smoothstep(0.35 * pxcm, 0, jx)
    rgb *= (1 - 0.05 * smoothstep(0.5 * pxcm, 0, np.minimum(jy, jx)))[..., None]

    # tie holes: 3 x 2 per panel, as in architectural off-form concrete
    hole = np.zeros((H, W))
    for cy in (15, 45, 75, 105):
        for cx in (20, 60, 100):
            dd = np.hypot(yy - cy * pxcm, xx - cx * pxcm)
            hole = np.maximum(hole, smoothstep(1.55 * pxcm, 1.1 * pxcm, dd))
    height -= 2.2 * hole
    rgb *= (1 - 0.22 * hole)[..., None]

    shade = relief(height * 3.0, 1.0, 0.35)
    rgb *= shade[..., None]
    return rgb, (W / pxcm, H / pxcm)


# ---------------------------------------------------------------- oak panelling (vertical boards)
def oak(pxcm=11, seed=31):
    bw, n = 12.0, 8
    W, H = round(bw * n * pxcm), round(120 * pxcm)
    yy, xx = np.mgrid[0:H, 0:W].astype(float)
    bwp = W / n
    board = np.floor(xx / bwp).astype(int)
    lx = xx - board * bwp
    r = np.random.default_rng(seed)
    early = np.array([200, 154, 104.0])
    late = np.array([140, 95, 58.0])
    rgb = np.zeros((H, W, 3))
    height = np.zeros((H, W))
    for b in range(n):
        m = board == b
        warp = fbm(H, W, 18 * pxcm, seed + 10 + b, octaves=3, aspect=5.0)    # slow waves along the board
        spacing = r.uniform(0.9, 1.5) * pxcm
        c = b * bwp + r.uniform(0.25, 0.75) * bwp
        # some boards are flat-sawn: rings bulge into arches that repeat up the board
        arch = r.uniform(0, 1) < 0.4
        bulge = (r.uniform(1.4, 2.4) * np.exp(-((xx - c) / (0.35 * bwp)) ** 2) * (0.5 + 0.5 * np.sin(2 * np.pi * yy / H * r.integers(1, 3) + r.uniform(0, 6.3)))) if arch else 0
        u = np.abs(xx - c) / spacing + 1.4 * warp + bulge
        t = u - np.floor(u)
        ring = smoothstep(0.45, 0.9, t) * (1 - smoothstep(0.9, 1.0, t))      # earlywood fades into a crisp latewood line
        tint = r.uniform(0.88, 1.07)
        warmth = np.array([1.0, r.uniform(0.97, 1.02), r.uniform(0.93, 1.03)])
        figure = fbm(H, W, 6 * pxcm, seed + 60 + b, octaves=3, aspect=6.0)
        col = (early + (late - early) * (0.75 * ring)[..., None]) * warmth * (tint * (1 + 0.035 * figure))[..., None]
        rgb[m] = col[m]
    flecks = smoothstep(1.6, 2.6, blur_noise(H, W, 1.4 * pxcm * 0.6, 0.12 * pxcm, seed + 80))
    rgb *= (1 - 0.10 * flecks)[..., None]
    pores = flecks
    # V-groove between boards
    edge = np.minimum(lx, bwp - lx)
    g = smoothstep(0.35 * pxcm, 0, edge)
    height -= 1.2 * g
    rgb *= (1 - 0.35 * smoothstep(0.12 * pxcm, 0, edge))[..., None]
    shade = relief(height * 1.1, 0.3, 0.55)                                 # side light picks out the grooves
    rgb *= shade[..., None]
    return rgb, (W / pxcm, H / pxcm)


# ---------------------------------------------------------------- limewash (soft clay rose)
def limewash(pxcm=4, seed=41):
    W = H = round(160 * pxcm)
    base = np.array([224, 199, 186.0])
    cloud = fbm(H, W, 26 * pxcm, seed, octaves=3)
    cloud = np.tanh(1.8 * cloud) / np.tanh(1.8)
    strokes = sum(fbm(H, W, r_ * pxcm, seed + i, octaves=2, aspect=0.22, angle=a)
                  for i, (r_, a) in enumerate([(9, 0.45), (6, -1.05), (12, 1.35), (7, -0.2)], 1)) / 2
    fine = fbm(H, W, 0.5 * pxcm, seed + 9, octaves=2)
    tone = 1 + 0.08 * cloud + 0.018 * strokes + 0.007 * fine
    lighter = smoothstep(0.35, 1.1, cloud) * 0.035                          # chalky bloom
    rgb = base * tone[..., None] + 255 * lighter[..., None]
    rgb *= relief(0.2 * fine, 0.25, 0.1)[..., None]
    return rgb, (W / pxcm, H / pxcm)


if __name__ == '__main__':
    jobs = [
        ('brick', lambda: brick(False), 0.42),
        ('brick-white', lambda: brick(True), 0.42),
        ('concrete', concrete, 0.34),
        ('oak', oak, 0.30),
        ('limewash', limewash, 0.5),
    ]
    for name, fn, crop in jobs:
        rgb, (wcm, hcm) = fn()
        img, path = save(name, rgb)
        swatch(name, img, crop)
        print(f'{name:12s} {img.size[0]}x{img.size[1]}px  tile {wcm:.1f} x {hcm:.1f} cm  '
              f'{os.path.getsize(path) / 1024:.0f} KB  avg {avg_hex(rgb)}')
