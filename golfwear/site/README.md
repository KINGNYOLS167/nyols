# GOLFWEAR website

Shoppers browse here and buy on Tokopedia. A private dashboard at `/admin` keeps the shop's
sales, expenses and stock. Built with React, Vite, Tailwind CSS, GSAP (ScrollTrigger, SplitText,
Flip), Lenis, three.js and Neon Postgres.

**Live: https://golfwear.vercel.app**

## Pages

| Address | What it shows |
| --- | --- |
| `/` | Full-screen hero ("Beyond the game."), featured products, shop by category, an editorial section, the 3D golf ball, the Tokopedia store band |
| `/shop` | Every product. Search, filter by category, brand (when there's more than one), size, price and availability; sort by featured or best selling, newest, price low to high or high to low. Filters live in the address, so a filtered page can be shared |
| `/collections`, `/collections/<slug>` | New arrivals, polo shirts, short sleeve, long sleeve, arm sleeves, women's. Trousers, shorts, outerwear and accessories appear by themselves once a product is in them |
| `/product/<id>` | Photos per colour, sizes, price, availability, spec card, Tokopedia button, related products |
| `/about` | The brand, how to order, questions, photo credits |
| `/admin` | Private dashboard (see below). Not linked from the site, hidden from search engines |

Also: an announcement bar, a mega menu, search from any page (the magnifier), quick view on product
cards, Bahasa Indonesia and English (ID/EN), a newsletter form in the footer, a short intro
animation once per visit, and a custom cursor for mouse users. Everything works with a keyboard and
on phones; with "reduce motion" turned on the animations are skipped.

## Honest by design

- **Featured, not best sellers.** The home page says "Featured" and the shop sorts by "Featured"
  until you mark the ranking as real sales: set `"rankSource": "sales"` at the top of
  `src/data/catalog.json` once each product's `rank` comes from your Tokopedia sales. Then both
  say "Best sellers" / "Best selling".
- **Tokopedia buttons tell the truth.** With a product's own `tokopediaUrl` the button says
  "Buy on Tokopedia" and opens that listing. Without one it says "Visit our Tokopedia store",
  opens https://www.tokopedia.com/golfwear and explains that the product isn't listed yet.
  Payment always happens on Tokopedia; the site has no checkout of its own.
- **Sample products are labelled.** While any product has `"sample": true`, the site shows
  "Preview: these are sample products."

## Before you launch: replace the sample products

The ten products in `src/data/catalog.json` are samples: made-up GOLFWEAR items with drawn
mockups. For each real product:

1. Add it to `src/data/catalog.json` (copy an existing entry). The fields:
   - `id`: short name for the address, e.g. `fairway-polo`.
   - `rank`: 1 comes first in Featured / Best sellers.
   - `brand`: `GOLFWEAR`, or the real brand name if you're authorised to sell it.
   - `category`: `sleeves`, `polo-men`, `polo-women`, `trousers`, `shorts`, `outerwear` or
     `accessories`. `sleeve`: `arm`, `short` or `long` (for the sleeve collections).
   - `name`, `blurb`: in `id` and `en`. `kind`: a short type label, e.g. `Polo`.
   - `price` in rupiah; `salePrice` if it's discounted.
   - `availability`: `in_stock`, `preorder`, `sold_out` or `coming_soon`. `isNew`: `true` puts it
     in New arrivals.
   - `colors`, `sizes`, `specs` (`sleeve`, `polo` or `pique`; the rows are in `src/i18n.tsx`).
   - `tokopediaUrl`: the product's listing. Open it in your store and copy the address.
2. Photos: one per colour in `public/products/`, named `<id>-<colour key>.webp`, portrait 4:5
   (for example 900 × 1125). For several photos per colour, list them in the colour's `images`.
3. Remove `"sample": true`. When no product has it, the preview labels disappear.

Store-wide settings (Tokopedia link, WhatsApp number, Instagram, announcement bar messages) are in
`src/config.ts`. A WhatsApp number adds an "Ask on WhatsApp" button to every product.

## The admin dashboard (`/admin`)

Log in with the `ADMIN_PASSWORD` you set in Vercel. Everything is stored in your Neon database;
nothing is calculated from made-up numbers.

- **Overview:** revenue, expenses, gross and net profit with margins for the chosen year, a
  month-by-month chart and table, and restock alerts.
- **Sales:** record a sale (date, product, size, quantity, price, discount, Tokopedia fee, status,
  invoice number), edit or delete it. Only *completed* sales count as revenue.
- **Expenses:** product purchases ("Product acquisition" = cost of goods), shipping, operations,
  marketing, other.
- **Inventory:** stock per SKU with unit cost, quick +/− buttons and a restock level.
- **Subscribers:** newsletter sign-ups from the site.
- **Import & export:** import the order report from Tokopedia Seller Center (save it as CSV first).
  Columns are matched automatically and can be changed; lines already imported (same invoice,
  product and size) are skipped. Export sales, expenses, stock, subscribers and monthly or yearly
  summaries as CSV for Excel or Google Sheets.

How it's protected: the password is checked on the server, with at most 8 tries per 15 minutes from
one connection. A successful login sets a signed, HttpOnly cookie that lasts 12 hours and only goes
to `/api/admin`. Changes need a same-site header, so other websites can't make them for you.
Without `ADMIN_PASSWORD` or a database, the API refuses everything and the page shows setup steps.

### Setting it up (once, free)

1. In the Vercel project **golfwear**: **Storage → Create Database → Neon**, free plan, connected to
   the project. Vercel adds `DATABASE_URL` by itself. The tables are created on first use.
2. **Settings → Environment Variables:** add `ADMIN_PASSWORD` (at least 10 characters, only you
   know it). Optional: `SESSION_SECRET`, any long random text; changing it logs everyone out.
3. Redeploy (see `../deploy/vercel/README.md`).

## Run it on your computer

```bash
npm install
```

```bash
npm run dev
```

That runs the shop. To run everything, including the newsletter and `/admin`, against a throwaway
database that lives in memory:

```bash
npm run build:vercel
```

```bash
ADMIN_PASSWORD='choose-one-here' npm run serve:local
```

Then open http://localhost:4173 and http://localhost:4173/admin.

Checks:

```bash
npm run typecheck
```

```bash
npm run test:api
```

`test:api` runs 26 checks on the newsletter and admin API (login, lockout, cookies, validation,
duplicate imports) against an in-memory Postgres.

## How it's built

- `src/`: the React app. `pages/` (Home, Shop, Product, Collections, About, NotFound),
  `components/`, `admin/` (dashboard, loaded only on `/admin`), `data/` (catalogue, collections),
  `i18n.tsx` (all text in ID and EN), `lib/motion.tsx` (GSAP + Lenis setup), `router.tsx`.
- `server/`: the two API endpoints, `subscribe.ts` and `admin.ts`, plus `core.ts` (database,
  sessions, validation). They run as Vercel Edge Functions.
- `scripts/build-vercel.mjs`: packages `dist/` and the functions as Vercel Build Output in
  `.vercel/output`. `npm run build:vercel` runs the build and this script.
- `public/photos/`: golf photography from Unsplash (Unsplash License), listed with sources in
  `public/photos/credits.json` and credited on the About page.

## Regenerating the drawn images

The sample product mockups, the golf ball's print and dimples, the favicon and the share image are
drawn by scripts, from the logo in `../brand`:

```bash
npm run assets
```

It needs Playwright with Chromium, and Python 3 with Pillow and NumPy. You don't need it for real
product photos: just drop those into `public/products/`.
