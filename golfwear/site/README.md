# GOLFWEAR website

Shoppers browse here and buy on Tokopedia. Built with React, Vite, Tailwind CSS, GSAP, Lenis and
three.js.

What's on the page:

- **Hero:** a 3D golf ball with the GOLFWEAR print. It drops onto the green when the page loads.
  Drag it to spin, tap it to make it hop; it leans toward the cursor. Arrow keys and Enter work too.
- **Best sellers:** a tournament-style leaderboard, ranked by `rank` in the catalogue.
- **All products:** filter by arm sleeves, men's polos and women's polos, sort and search. Opening a
  product shows its colours, sizes, a scorecard-style spec card and a **Buy on Tokopedia** button.
- **About**, **How to order** and **Questions**, then the footer.
- Bahasa Indonesia and English (the ID/EN switch), a custom cursor and magnetic buttons for mouse
  users, smooth scrolling. Everything still works with a keyboard, on touch screens and with
  reduced motion turned on.

## Before you launch: replace the sample products

The ten products in `src/data/catalog.json` are **samples**: made-up GOLFWEAR items with drawn
mockups, so the page has something to show. While any product has `"sample": true`, a bar at the
top of the page says so.

For each real product:

1. Add it to `src/data/catalog.json` (copy an existing entry). The fields:
   - `rank`: 1 = best seller. It orders the leaderboard and the default sort.
   - `category`: `sleeves`, `polo-men` or `polo-women`.
   - `name`, `blurb`: in `id` and `en`.
   - `price` in rupiah, `colors`, `sizes`.
   - `specs`: `sleeve`, `polo` or `pique` (the rows are in `src/i18n.tsx`).
   - `tokopediaUrl`: the product's listing. Open it in your store and copy the address.
2. Put one photo per colour in `public/products/`, named `<id>-<colour key>.webp`, portrait 4:5
   (for example 900 × 1125). Or set `"image": "/products/your-file.jpg"` on the colour.
3. Remove the `"sample": true` line. When no product has it, the preview bar disappears.

Store-wide settings (the Tokopedia store link, WhatsApp number, Instagram, the rating shown in the
hero) are in `src/config.ts`. Adding a WhatsApp number adds an **Ask on WhatsApp** button to every
product.

## Run it

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints. To check the production build:

```bash
npm run build
```

```bash
npm run preview
```

## Put it online

`npm run build` writes a static site to `dist/`. Any static host serves it: Vercel, Netlify and
Cloudflare Pages can all build it straight from this folder (build command `npm run build`,
output folder `dist`).

## Regenerating the images

The sample product mockups, the golf ball's print and dimples, the favicon and the share image are
drawn by scripts, from the logo in `../brand`:

```bash
npm run assets
```

It needs Playwright with Chromium, and Python 3 with Pillow and NumPy. You don't need it for real
product photos: just drop those into `public/products/`.
