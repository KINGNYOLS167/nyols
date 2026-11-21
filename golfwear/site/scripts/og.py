"""Draws public/og.jpg (1200x630), the image shown when a GOLFWEAR link is shared:
the hero photograph, a pine gradient, the logo and the campaign line.
    python3 scripts/og.py
"""
from PIL import Image, ImageDraw, ImageFont

W, H = 1200, 630
PINE = (16, 43, 37)
IVORY = (245, 242, 234)
CHAMPAGNE = (199, 181, 138)

photo = Image.open('public/campaign/hero-1536.webp').convert('RGB')
scale = max(W / photo.width, H / photo.height) * 1.02
photo = photo.resize((round(photo.width * scale), round(photo.height * scale)), Image.LANCZOS)
x = photo.width - W  # keep the golfer on the right
canvas = photo.crop((x, (photo.height - H) // 2, x + W, (photo.height - H) // 2 + H))

shade = Image.new('L', (W, H))
d = ImageDraw.Draw(shade)
for i in range(W):  # dark on the left where the type sits, clear on the right
    a = max(0, min(255, int(235 * (1 - i / (W * 0.72)) ** 1.4))) if i < W * 0.72 else 0
    d.line([(i, 0), (i, H)], fill=a)
canvas = Image.composite(Image.new('RGB', (W, H), PINE), canvas, shade)

logo = Image.open('../brand/logo/png/golfwear-horizontal-reverse.png').convert('RGBA')
lw = 300
logo = logo.resize((lw, round(logo.height * lw / logo.width)), Image.LANCZOS)
canvas.paste(logo, (72, 72), logo)

font = ImageFont.truetype('node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2', 112)
small = ImageFont.truetype('node_modules/@fontsource/jost/files/jost-latin-400-normal.woff2', 30)
draw = ImageDraw.Draw(canvas)
draw.text((66, 300), 'BEYOND', font=font, fill=IVORY)
draw.text((66, 400), 'THE GAME.', font=font, fill=IVORY)
draw.line([(72, 548), (112, 548)], fill=CHAMPAGNE, width=2)
draw.text((128, 530), 'Golf apparel from Jakarta. Shop on Tokopedia.', font=small, fill=(220, 214, 200))
canvas.save('public/og.jpg', quality=86, optimize=True, progressive=True)
print('public/og.jpg written')
