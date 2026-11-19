#!/usr/bin/env python3
"""
Copy "units sold" from the finance workbook into the website catalog, so the site's
Best Sellers ranking follows your real sales.

    python3 finance/sync_bestsellers.py                                # reads finance/Golfwear-Finance.xlsx
    python3 finance/sync_bestsellers.py ~/Downloads/Golfwear-Finance.xlsx
    python3 finance/sync_bestsellers.py ~/Downloads/Sales.csv          # Google Sheets: File > Download > CSV (Sales tab)
    python3 finance/sync_bestsellers.py --dry-run                      # show changes without writing

Counts Qty per SKU for rows whose Status is blank or "Completed" (returns and cancellations
are skipped), then sets `sold` on matching products in src/data/catalog.json.
Products with no rows in the ledger keep their current number unless --reset-missing is given.
After syncing, rebuild the site (npm run build) to publish the new ranking.
"""
from __future__ import annotations

import argparse
import csv
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DEFAULT_BOOK = ROOT / "finance" / "Golfwear-Finance.xlsx"
CATALOG = ROOT / "src" / "data" / "catalog.json"


def rows_from_xlsx(path: Path):
    from openpyxl import load_workbook

    wb = load_workbook(path, read_only=True)  # inputs only, no formula values needed
    if "Sales" not in wb.sheetnames:
        raise SystemExit(f"{path} has no 'Sales' sheet.")
    yield from wb["Sales"].iter_rows(values_only=True)


def rows_from_csv(path: Path):
    with path.open(newline="", encoding="utf-8-sig") as f:
        yield from csv.reader(f)


def units_by_sku(rows) -> Counter:
    totals: Counter = Counter()
    cols = None
    for row in rows:
        cells = ["" if v is None else str(v).strip() for v in row]
        if cols is None:
            if "SKU" in cells and "Qty" in cells:
                cols = {name: cells.index(name) for name in ("SKU", "Qty", "Status")}
            continue
        sku = cells[cols["SKU"]] if cols["SKU"] < len(cells) else ""
        if not sku:
            continue
        status = cells[cols["Status"]] if cols["Status"] < len(cells) else ""
        if status not in ("", "Completed"):
            continue
        try:
            qty = int(float(cells[cols["Qty"]].replace(",", "") or 0))
        except ValueError:
            print(f"  skipped {sku}: Qty '{cells[cols['Qty']]}' is not a number")
            continue
        totals[sku] += qty
    if cols is None:
        raise SystemExit("Could not find the header row (needs 'SKU', 'Qty' and 'Status' columns).")
    return totals


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("file", nargs="?", type=Path, default=DEFAULT_BOOK, help=".xlsx workbook or .csv export of the Sales tab")
    ap.add_argument("--catalog", type=Path, default=CATALOG)
    ap.add_argument("--dry-run", action="store_true")
    ap.add_argument("--reset-missing", action="store_true", help="set sold = 0 for products with no ledger rows")
    args = ap.parse_args()

    if not args.file.exists():
        raise SystemExit(f"Not found: {args.file}")
    rows = rows_from_csv(args.file) if args.file.suffix.lower() == ".csv" else rows_from_xlsx(args.file)
    totals = units_by_sku(rows)
    catalog = json.loads(args.catalog.read_text(encoding="utf-8"))
    known = {p["sku"] for p in catalog["products"]}

    changes = []
    for p in catalog["products"]:
        new = totals.get(p["sku"], 0 if args.reset_missing else p["sold"])
        if new != p["sold"]:
            changes.append((p["sku"], p["name"], p["sold"], new))
            p["sold"] = new

    print(f"Ledger: {sum(totals.values())} units across {len(totals)} SKUs from {args.file.name}")
    for sku in sorted(set(totals) - known):
        print(f"  ! {sku} is in the ledger but not on the website (add it to catalog.json)")
    for sku, name, old, new in changes:
        print(f"  {sku:<10} {name:<36} {old:>5} -> {new}")
    if not changes:
        print("  No changes.")
    top = sorted(catalog["products"], key=lambda p: -p["sold"])[:10]
    print("New best-seller order: " + ", ".join(f"{i + 1}. {p['name']}" for i, p in enumerate(top)))

    if args.dry_run:
        print("Dry run: catalog not written.")
        return
    args.catalog.write_text(json.dumps(catalog, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"Updated {args.catalog.relative_to(ROOT)}. Run `npm run build` to publish.")


if __name__ == "__main__":
    main()
