# GOLFWEAR website

The GOLFWEAR storefront, where shoppers browse and then buy on Tokopedia, and the owner's
private business dashboard. React, Vite, Tailwind CSS, GSAP and Lenis in the browser; a small
Hono API with Postgres behind it.

**Live: https://golfwear.vercel.app** · deployment and one-time setup: `../deploy/vercel/README.md`

## The store

- **Home:** rotating announcement bar; cinematic hero ("Beyond the game.") with a shot tracer
  drawn over the photo; best sellers, ranked only by real units sold (recorded sales plus the
  Tokopedia sold count you enter), or a clearly titled **Featured** selection until there are
  sales; shop by category; shop by brand; an editorial campaign; how ordering works; newsletter.
- **Shop** (`/shop`), **collections** (`/collections/polo-shirts`, `short-sleeve`, `long-sleeve`,
  `trousers`, `shorts`, `outerwear`, `accessories`, `new-arrivals`) and **brand pages**
  (`/brands/<brand>`): search, filters for category, brand, gender, size, price, availability and
  sale, and sorting by popularity, newest and price. Filters live in the URL, so links can be shared.
- **Product pages** (`/product/<slug>`): gallery, sizes with availability, colours, description,
  specifications, **Buy on Tokopedia** to the exact listing. A product without a Tokopedia link
  opens the store page instead, and says so.
- **About** (`/about`): the story, the interactive 3D golf ball, ordering steps and questions.
- Bahasa Indonesia and English, a custom cursor and magnetic buttons for mouse users, smooth
  scrolling, scroll and text reveals. Keyboard, touch and reduced-motion users get the same store
  without the motion.

Nothing on the store is invented: products, brands, prices and stock come from the dashboard.
Until products are published, sections that need them point shoppers to the Tokopedia store.

## The dashboard (`/admin`, owner only)

Not linked from the store, `noindex`, and every request behind it needs the owner's session
(password in the `ADMIN_PASSWORD` environment variable; signed, HttpOnly cookie; sign-in attempts
are rate limited).

- **Overview:** revenue, expenses, gross and net profit, margins, monthly charts, top products,
  pending orders and stock alerts, per year.
- **Sales:** one row per product per order (date, product, brand, size, quantity, price, discount,
  status, marketplace reference). Recording a sale can take units out of stock; cancelling or
  returning it puts them back.
- **Expenses:** product acquisition, shipping, operational, marketing, other.
- **Inventory:** stock per size, low and out-of-stock flags, restocks (ordered or received; a
  received restock adds stock and can record its cost as an acquisition expense).
- **Products and brands:** the catalogue the store shows, with photo upload, Tokopedia links,
  sizes and stock, and **Import** from a CSV (download the template there) or from the JSON made
  by `../scripts/parse_tokopedia.py`.
- **Reports:** monthly and yearly summaries; CSV exports of sales, expenses, monthly and yearly
  reports, inventory, products and newsletter sign-ups (UTF-8, open in Excel or Google Sheets).
- **Newsletter** sign-ups and **Settings** (announcements, contact links, Tokopedia store figures).

How the money is counted: revenue is quantity × price minus discounts for orders marked
processing, shipped or completed. Gross profit is revenue minus product acquisition; net profit
is revenue minus all expenses. Costs count in the month they were paid.

## Run it locally

```bash
npm install
```

```bash
npm run dev
```

The dev server includes the API and an embedded Postgres (PGlite) stored in `.data/`. To open the
dashboard locally, start it with a password:

```bash
ADMIN_PASSWORD=choose-a-local-password npm run dev
```

`DATABASE_URL=postgres://…` uses a real Postgres instead. To try a production build:

```bash
npm run preview
```

## Tests

`tests/e2e.mjs` drives the built site in Chromium (storefront, filters, product pages, links,
newsletter, dashboard sign-in, sales, stock, exports, phone layout, reduced motion, console
errors). It runs against `tests/vercel-harness.mjs`, which serves the exact Vercel build output:

```bash
npm run build:vercel
```

```bash
DATABASE_URL=postgres://… ADMIN_PASSWORD=test-password-123 node tests/vercel-harness.mjs
```

```bash
npm run test:e2e
```

`tests/seed.mjs` fills a local database with clearly labelled test data. It refuses to run
against the live site.

## Design system

- **Colour** (`src/styles.css`): deep forest `#173D32`, dark pine `#102B25`, warm ivory `#F5F2EA`,
  champagne `#C7B58A`, charcoal `#222522`, white. Champagne is an accent on dark surfaces; on
  ivory, champagne-toned text uses `#6F5D33`. Every text pairing meets WCAG AA.
- **Type:** Jost (the brand kit's typeface) only. Hierarchy comes from scale and weight:
  `t-hero`, `t-display`, `t-h2`, `t-h3`, `t-lede`, `t-small`, `t-micro`.
- **Graphic language:** green-reading contour lines (`public/textures/contours.svg`, drawn by
  `scripts/contours.py`) on dark sections, film grain on photography, the shot tracer in the hero.
- **Motion** (`src/lib/motion.tsx`, `src/lib/reveal.ts`): one orchestrated entrance in the hero,
  line reveals on section titles, image reveals and gentle parallax on scroll, magnetic buttons
  and a contextual cursor for mouse users. All of it is off with reduced motion.
- **Campaign photography** (`public/campaign/`) was generated for this site; it shows no products
  and can be replaced with real shoots at the same file names.

## Regenerating images

```bash
npm run assets
```

Re-renders the golf ball's print, the favicon and the share image from `../brand` (needs
Playwright with Chromium, and Python 3 with Pillow and NumPy). `python3 scripts/contours.py`
redraws the contour texture.
