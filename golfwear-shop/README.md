# Nyols Golf — golfwear storefront + finance workbook

A clean, fast storefront for a personal golf-apparel shop. Customers browse here, then check out
on **Tokopedia**. Every sale is recorded in a **finance workbook** (Excel or Google Sheets), and
the site's Best Sellers ranking can be refreshed from that workbook.

| Part | What you get |
|---|---|
| **Home** (`index.html`) | No. 1 best seller in the hero, ranked Best Sellers grid (filter by Clothing / Arm Sleeves / Headwear / Gloves), shop-by-category tiles, a brand explorer (pick a brand, then clothing / sleeves / headwear / gloves), new arrivals & offers, and a "How to order on Tokopedia" section |
| **Shop** (`shop.html`) | Filters for category, brand, gender, size, price and on-sale, with live counts; sorting (best selling, newest, price, name); shareable URLs such as `shop.html?brand=footjoy&category=sleeves`; mobile filter drawer |
| **Product** (`product.html?id=…`) | Colour and size pickers, stock status, "Buy on Tokopedia", size guide, delivery and returns, "Complete the look", and search-engine product data |
| **Everywhere** | Mega menu, instant search (press `/`), mobile menu, smooth scrolling (Lenis) and reveal animations (GSAP) that switch off when the visitor asks for reduced motion |
| **Finance** (`finance/`) | `Golfwear-Finance.xlsx` (empty, ready to use), `Golfwear-Finance-DEMO.xlsx` (sample data), the generator script, and a script that syncs units sold back into the website |

## Quick start

```bash
cd golfwear-shop
```

```bash
npm install
```

```bash
npm run dev
```

Open the address it prints (usually http://localhost:5173).

To publish, build the static site and upload the `dist/` folder to any static host
(Vercel, Netlify, GitHub Pages, Cloudflare Pages):

```bash
npm run build
```

## 1. Make it yours

**Store settings** live in `src/config.js`:

| Setting | What to put |
|---|---|
| `name`, `shortName`, `tagline`, `location` | Your shop name and wording |
| `tokopediaShopUrl` | Your shop page, e.g. `https://www.tokopedia.com/yourshop`. Every "Tokopedia Store" button uses it |
| `whatsapp` | Number like `6281234567890`. Shows a WhatsApp link in the footer and a "Ask about sizing" button |
| `instagram`, `email` | Optional footer links |
| `bestSellerCount` | How many top products get the "Best Seller" badge (default 10) |
| `lowStockThreshold` | Below this, the product page says "Only N left" |

**Products, brands and categories** live in `src/data/catalog.json`. Each product:

| Field | Meaning |
|---|---|
| `id` | URL name, e.g. `fj-lisle-performance-polo` → `product.html?id=fj-lisle-performance-polo` |
| `sku` | Must match the SKU in the finance workbook |
| `brand`, `category` | An `id` from the `brands` / `categories` lists in the same file |
| `gender` | `men`, `women` or `unisex` |
| `price`, `compareAt` | Selling price in Rupiah; set `compareAt` higher to show a sale price and a −% badge |
| `cost` | Your purchase cost (used by the workbook, never shown on the site) |
| `sold` | Units sold: drives the Best Sellers ranking (see section 3) |
| `stock`, `sizes`, `colors` | Stock count, size list and colours (`name` + `hex`) |
| `tags` | Add `"new"` for the New badge |
| `image` | Optional photo path, e.g. `/products/FJ-PL-001.webp` (put files in `public/products/`). Without a photo, a drawn illustration in the first colour is shown |
| `tokopediaUrl` | The exact Tokopedia listing for this product |
| `description`, `features` | Product page text |

> The 34 products, prices, costs, stock and sold counts that ship with this project are **sample data**.
> Replace them with your real range before going live.

## 2. How the Tokopedia connection works

- Every product has a **Buy on Tokopedia** button. It opens `tokopediaUrl` in a new tab.
- Until you fill in a product's `tokopediaUrl`, the button opens a Tokopedia search for that
  brand + product name (the same search format as `https://www.tokopedia.com/search?st=&q=golfwear`).
- Store-level buttons open `tokopediaShopUrl`, or a `golfwear` search until you set it.
- To get a listing URL: open the product in your Tokopedia store and copy the address bar.

Payment, vouchers, shipping and buyer protection all stay on Tokopedia. Automatic order import
from Tokopedia needs an approved app in the TikTok Shop / Tokopedia partner programme, so it is not
part of this project. Record each order in the workbook instead (it takes one row).

## 3. Finance workbook

Open `finance/Golfwear-Finance.xlsx` in Excel, or import it into Google Sheets
(File → Import → Upload → Replace spreadsheet). Look at `Golfwear-Finance-DEMO.xlsx` first to see it with a year of sample data.

| Sheet | Use |
|---|---|
| **Start Here** | Instructions, colour legend and an example row |
| **Dashboard** | Yearly KPIs (net sales, net revenue, gross profit, operating expenses, net profit, margins, units), monthly profit and loss, sales by channel, brand and category, expenses by category, top 10 products, two charts |
| **Sales** | One row per product line sold: date, invoice no., channel, SKU (dropdown), size, qty, unit price, voucher, seller-paid shipping, status. Product, brand, platform fee, COGS, profit and margin fill in automatically |
| **Expenses** | Ads, packaging, photography and other running costs |
| **Products** | SKUs from the website with price, cost, margin, opening stock, restocks, units sold, stock on hand, reorder alert and sales rank |
| **Settings** | Report year, fee % per channel, tax rate, dropdown lists |

Colour code: **blue text** = you type here, **black** = formula, **green** = pulled from another sheet,
**brass header** = input column, **yellow** = assumption to check.

Before you rely on the numbers, check these two assumptions in **Settings**:

- **Tokopedia fee 6.5% is a placeholder.** Replace it with the total % Tokopedia actually charges you per order.
- **Tax 0.5%** estimates PPh Final UMKM (PP 55/2022) on net sales. Confirm with your tax advisor, or set it to 0%.

The two scripts below need Python 3 with openpyxl (`pip install openpyxl`).

### Keep the website's Best Sellers in step with real sales

```bash
npm run sync-bestsellers
```

This reads `finance/Golfwear-Finance.xlsx`, adds up completed units per SKU, writes them into
`catalog.json` (`sold`), and prints the new top 10. Then run `npm run build` again.
It also accepts a different workbook, or a CSV of the Sales tab downloaded from Google Sheets:

```bash
python3 finance/sync_bestsellers.py ~/Downloads/Sales.csv --dry-run
```

### Regenerate the workbook after changing the catalog

```bash
python3 finance/build_workbook.py --out finance/Golfwear-Finance-2027.xlsx
```

The generator **never overwrites** an existing `Golfwear-Finance.xlsx` unless you pass `--force`,
so your filled-in books are safe. `npm run finance` rebuilds the demo file.
New SKUs can also be typed straight into the empty rows of the Products sheet.

## Design

Colours and type are design tokens in `src/styles/tokens.css`: deep forest green, ivory, brass
accents and Tokopedia green for checkout buttons, with Cormorant Garamond headings and Manrope text.
Text colours meet WCAG AA contrast. Change a token once and the whole site follows.

## Project layout

```
golfwear-shop/
├── index.html, shop.html, product.html   pages
├── public/                               favicon, product photos
├── src/
│   ├── config.js                         store settings
│   ├── data/catalog.json                 brands, categories, products
│   ├── components/                       header/footer/search, product card
│   ├── lib/                              catalog helpers, Tokopedia links, garment illustrations, motion
│   ├── pages/                            home.js, shop.js, product.js
│   └── styles/                           tokens.css, base.css, pages.css
└── finance/
    ├── Golfwear-Finance.xlsx             your books (empty)
    ├── Golfwear-Finance-DEMO.xlsx        sample year
    ├── build_workbook.py                 generator (Python 3 + openpyxl)
    └── sync_bestsellers.py               workbook → website best sellers
```
