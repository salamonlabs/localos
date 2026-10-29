import math, random, sys
W, H = 1920, 1080
random.seed(11)

def ys(y0, amp, ph, fr, valley, skew, x):
    t = x / W
    u = 2 * t - 1 - skew
    return (y0 - valley * (u * u)
            + amp * math.sin(2 * math.pi * fr * t + ph)
            + amp * 0.35 * math.sin(2 * math.pi * fr * 2.7 * t + ph * 1.9))

def path(y0, amp, ph, fr, valley, skew, closed=True, dy=0.0, step=16):
    pts = [(x, ys(y0, amp, ph, fr, valley, skew, x) + dy) for x in range(-40, W + 41, step)]
    d = "M" + " L".join(f"{x},{y:.1f}" for x, y in pts)
    if closed:
        d += f" L{W+40},{H+60} L-40,{H+60} Z"
    return d

o = []
o.append(f'<svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}">')
o.append('''<defs>
<linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#050816"/><stop offset=".35" stop-color="#0B1233"/>
  <stop offset=".55" stop-color="#1D1C63"/><stop offset=".64" stop-color="#3A2A86"/>
  <stop offset=".75" stop-color="#121A45"/><stop offset="1" stop-color="#050816"/>
</linearGradient>
<radialGradient id="hglow" cx="960" cy="655" r="760" gradientUnits="userSpaceOnUse" gradientTransform="translate(960 655) scale(1 .32) translate(-960 -655)">
  <stop offset="0" stop-color="#FFE6D6" stop-opacity="1"/>
  <stop offset=".08" stop-color="#FFC3E1" stop-opacity=".9"/>
  <stop offset=".25" stop-color="#B27BF0" stop-opacity=".55"/>
  <stop offset=".6" stop-color="#3665F3" stop-opacity=".15"/>
  <stop offset="1" stop-color="#3665F3" stop-opacity="0"/>
</radialGradient>
<radialGradient id="aura" cx="960" cy="620" r="1000" gradientUnits="userSpaceOnUse">
  <stop offset="0" stop-color="#8E6BFF" stop-opacity=".45"/>
  <stop offset=".5" stop-color="#3665F3" stop-opacity=".12"/>
  <stop offset="1" stop-color="#3665F3" stop-opacity="0"/>
</radialGradient>
<linearGradient id="rim" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#20C9E8" stop-opacity=".9"/>
  <stop offset=".35" stop-color="#8FB4FF"/>
  <stop offset=".5" stop-color="#FFE1F2"/>
  <stop offset=".65" stop-color="#B48CFF"/>
  <stop offset="1" stop-color="#8055EF" stop-opacity=".9"/>
</linearGradient>
<linearGradient id="silk" x1="0" y1="0" x2="1" y2="0">
  <stop offset="0" stop-color="#20C9E8"/><stop offset=".45" stop-color="#A9B8FF"/>
  <stop offset=".55" stop-color="#E9C9FF"/><stop offset="1" stop-color="#8055EF"/>
</linearGradient>
<filter id="glow6" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="6"/></filter>
<filter id="glow18" x="-5%" y="-50%" width="110%" height="200%"><feGaussianBlur stdDeviation="18"/></filter>
<filter id="soft" x="-5%" y="-20%" width="110%" height="140%"><feGaussianBlur stdDeviation="2"/></filter>
<filter id="haze" x="-30%" y="-80%" width="160%" height="260%"><feGaussianBlur stdDeviation="40"/></filter>
<linearGradient id="vign" x1="0" y1="0" x2="0" y2="1">
  <stop offset="0" stop-color="#050816" stop-opacity=".35"/><stop offset=".3" stop-color="#050816" stop-opacity="0"/>
  <stop offset=".8" stop-color="#050816" stop-opacity="0"/><stop offset="1" stop-color="#050816" stop-opacity=".8"/>
</linearGradient>
<radialGradient id="side" cx=".5" cy=".55" r=".75">
  <stop offset=".6" stop-color="#050816" stop-opacity="0"/><stop offset="1" stop-color="#050816" stop-opacity=".55"/>
</radialGradient>
''')
# corpi delle onde: gradiente verticale (cresta luminosa -> profondo)
bodies = [
 ("#8A7DFF", "#3439B8", "#0E1448"),
 ("#6C78FF", "#2B3AAE", "#0C1342"),
 ("#5A92FF", "#2537A0", "#0B123E"),
 ("#9070FF", "#342A98", "#0A0F38"),
 ("#4AA6F5", "#1C2C86", "#080D30"),
 ("#2E4FD6", "#121B55", "#060920"),
]
for i, (a, b, c) in enumerate(bodies):
    o.append(f'<linearGradient id="g{i}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="{a}"/><stop offset=".25" stop-color="{b}"/><stop offset=".75" stop-color="{c}"/></linearGradient>')
o.append('</defs>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#sky)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#aura)"/>')
for _ in range(160):
    x, y = random.uniform(0, W), random.uniform(0, H * 0.48)
    r = random.choice([.5, .7, .9, 1.2])
    op = random.uniform(.15, .6) * (1 - y / (H * .55))
    o.append(f'<circle cx="{x:.0f}" cy="{y:.0f}" r="{r}" fill="#E8EEFF" opacity="{op:.2f}"/>')
# nastro di seta nel cielo (dall'alto a sinistra)
for k in range(28):
    yy = 260 + k * 5
    d = path(yy, 40, 0.9 + k*0.01, 0.55, -160, -0.6, closed=False, step=20)
    o.append(f'<path d="{d}" fill="none" stroke="url(#silk)" stroke-width="1" opacity="{0.22*(1-k/28):.3f}"/>')
for k in range(22):
    yy = 330 + k * 5
    d = path(yy, 34, 3.6 + k*0.012, 0.5, -140, 0.65, closed=False, step=20)
    o.append(f'<path d="{d}" fill="none" stroke="url(#silk)" stroke-width="1" opacity="{0.18*(1-k/22):.3f}"/>')
# bagliore all'orizzonte
o.append(f'<rect width="{W}" height="{H}" fill="url(#hglow)"/>')
o.append('<ellipse cx="960" cy="650" rx="520" ry="60" fill="#FFB9DC" opacity=".55" filter="url(#haze)"/><ellipse cx="960" cy="660" rx="300" ry="26" fill="#FFF0E4" opacity=".9" filter="url(#haze)"/>')

# strati: (y0, amp, ph, fr, valley, skew, body, silk_lines)
layers = [
 (640, 22, 0.5, 1.3, 150, 0.0, 0, 16),
 (690, 34, 2.2, 0.9, 260, -0.15, 1, 18),
 (745, 40, 4.1, 1.1, 300, 0.2, 2, 20),
 (820, 46, 1.3, 0.8, 330, -0.25, 3, 20),
 (900, 50, 3.3, 0.95, 300, 0.3, 4, 16),
 (985, 44, 5.2, 0.7, 260, -0.1, 5, 12),
]
for (y0, amp, ph, fr, va, sk, bi, n) in layers:
    o.append(f'<path d="{path(y0, amp, ph, fr, va, sk)}" fill="url(#g{bi})"/>')
    for k in range(1, n):
        dy = k * (2.6 + k * 0.45)
        op = 0.42 * (1 - k / n) ** 1.4
        o.append(f'<path d="{path(y0, amp*(1-k*0.01), ph + k*0.02, fr, va*(1-k*0.004), sk, closed=False, dy=dy)}" fill="none" stroke="url(#silk)" stroke-width="1" opacity="{op:.3f}"/>')
    crest = path(y0, amp, ph, fr, va, sk, closed=False)
    o.append(f'<path d="{crest}" fill="none" stroke="url(#rim)" stroke-width="10" opacity=".35" filter="url(#glow18)"/>')
    o.append(f'<path d="{crest}" fill="none" stroke="url(#rim)" stroke-width="3" opacity=".55" filter="url(#glow6)"/>')
    o.append(f'<path d="{crest}" fill="none" stroke="url(#rim)" stroke-width="1.4" opacity=".9"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#vign)"/>')
o.append(f'<rect width="{W}" height="{H}" fill="url(#side)"/>')
o.append('</svg>')
open(sys.argv[1], "w").write("\n".join(o))
