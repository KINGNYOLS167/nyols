#!/usr/bin/env python3
"""Build GOLFWEAR-Finance.xlsx: a sales ledger and profit dashboard for a
Tokopedia pre-order store.

    python3 golfwear/finance/build_finance.py                 # -> golfwear/finance/GOLFWEAR-Finance.xlsx
    python3 golfwear/finance/build_finance.py --out new.xlsx  # fresh copy elsewhere
    python3 golfwear/finance/build_finance.py --sample t.xlsx # with test rows, to check the formulas

The default output is never overwritten once it exists (it may hold real sales);
pass --force to replace it. Only Excel-2007-era functions are used (SUMIFS,
COUNTIFS, INDEX/MATCH, SEARCH), so Excel, Google Sheets and LibreOffice all
calculate it.

Sheets
  Start Here  how to use it, colour legend, an example row, sources
  Dashboard   yearly totals, month-by-month profit, profit by product type and
              expense category, chart
  Sales       one row per product in each order -> fees, payout, cost, profit
  Expenses    ads, packaging, supplier shipping and other running costs
  Settings    report year, Tokopedia fees, tax, cost per product type, lists
"""
from __future__ import annotations

import argparse
from datetime import date
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.chart.data_source import NumFmt
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.worksheet.datavalidation import DataValidation

HERE = Path(__file__).resolve().parent
DEFAULT_OUT = HERE / "GOLFWEAR-Finance.xlsx"

# ---------- look ----------
FONT = "Arial"
INK, MUTED = "1B1F1C", "6B6F6A"
GREEN_DARK, GREEN_BAND, LINE = "1F3A2E", "E7EDE8", "D9DED8"
BRASS = "B8975A"
BLUE, LINKED, WARN = "0000FF", "008000", "B42318"
YELLOW = "FFFF00"

RP = '"Rp "#,##0;("Rp "#,##0);"-"'
INT = '#,##0;(#,##0);"-"'
PCT = '0.0%;(0.0%);"-"'
DATE_FMT = "dd mmm yyyy"
MONTH_FMT = "mmm yyyy"

thin = Side(style="thin", color=LINE)
BOTTOM = Border(bottom=thin)

# ---------- layout ----------
SALES_ROWS = 5000
EXP_ROWS = 1000
FIRST = 4                          # first data row on Sales and Expenses
S_LAST = FIRST + SALES_ROWS - 1
E_LAST = FIRST + EXP_ROWS - 1

# name, typical price (median listing price per type on tokopedia.com/golfwear,
# 19 Nov 2026), number of listings behind that median
PRODUCT_TYPES = [
    ("Arm Sleeves (pair)", 95000, 28),
    ("Men's Polo - Short Sleeve", 350000, 579),
    ("Men's Polo - Long Sleeve", 385000, 51),
    ("Women's Polo - Short Sleeve", 350000, 55),
    ("Women's Polo - Long Sleeve", 395000, 72),
    ("Other", None, None),
]
TYPE_FIRST, TYPE_LAST = 11, 18     # Settings rows; the spare rows let you add types
STATUSES = ["Completed", "Pending", "Cancelled", "Returned"]
STATUS_FIRST = 21
EXPENSE_CATS = ["Ads (TopAds / TikTok)", "Packaging", "Shipping & returns", "Supplier shipping & import",
                "Photos & content", "Staff", "Apps & tools", "Bank & admin fees", "Other"]
EXPCAT_FIRST = 21
EXPCAT_LAST = EXPCAT_FIRST + len(EXPENSE_CATS) - 1

SET_YEAR, SET_FEE, SET_FIXED, SET_TAX, SET_TAXFREE = (
    "Settings!$B$4", "Settings!$B$5", "Settings!$B$6", "Settings!$B$7", "Settings!$B$8")
TYPE_NAMES = f"Settings!$A${TYPE_FIRST}:$A${TYPE_LAST}"
TYPE_COSTS = f"Settings!$B${TYPE_FIRST}:$B${TYPE_LAST}"

FEE_SOURCES = (
    "Placeholder - replace with your own rate from Seller Center.\n"
    "Tokopedia lists 4.25%-10% for Fashion (Seller Regular / Power Shop): "
    "tokopedia.com/help/article/biaya-layanan-seller-regular-dan-power-shop\n"
    "A fashion seller reported 8.5% rising to 9.5% plus Rp 1,250 per order (Bisnis.com, 23 Jan 2026): "
    "teknologi.bisnis.com/read/20260123/84/1946722"
)
TAX_SOURCE = ("PPh Final UMKM: 0.5% of turnover; individual sellers pay nothing on the first "
              "Rp 500 million per year (PP 55/2022). Companies (PT/CV) get no tax-free part: set the "
              "next cell to 0. Check with a tax advisor; set the rate to 0% to switch the estimate off.")

SALES_HEAD = [
    # column, header, width, kind ("in" = you type, "calc" = formula), number format
    ("A", "Date", 12, "in", DATE_FMT),
    ("B", "Invoice no.", 27, "in", None),
    ("C", "Product type (optional: read from the name when empty)", 25, "in", None),
    ("D", "Product name", 42, "in", None),
    ("E", "Size / colour", 14, "in", None),
    ("F", "Qty", 7, "in", INT),
    ("G", "Unit price (Rp)", 13, "in", RP),
    ("H", "Your discount / voucher (Rp)", 13, "in", RP),
    ("I", "Shipping you paid (Rp)", 12, "in", RP),
    ("J", "Actual Tokopedia fees (Rp, optional)", 14, "in", RP),
    ("K", "Unit cost override (Rp, optional)", 13, "in", RP),
    ("L", "Status (empty = Completed)", 13, "in", None),
    ("M", "Product type used", 25, "calc", None),
    ("N", "Month", 10, "calc", MONTH_FMT),
    ("O", "Gross sales (Rp)", 14, "calc", RP),
    ("P", "Net sales (Rp)", 14, "calc", RP),
    ("Q", "Tokopedia fees (Rp)", 13, "calc", RP),
    ("R", "Net payout (Rp)", 14, "calc", RP),
    ("S", "Unit cost - HPP (Rp)", 13, "calc", RP),
    ("T", "Cost of goods (Rp)", 14, "calc", RP),
    ("U", "Profit (Rp)", 14, "calc", RP),
    ("V", "Margin", 9, "calc", PCT),
    ("W", "Counted", 8, "calc", "0"),
]


# ---------- helpers ----------
def font(size=10, bold=False, color=INK, italic=False):
    return Font(name=FONT, size=size, bold=bold, color=color, italic=italic)


def fill(color):
    return PatternFill("solid", fgColor=color)


def title(ws, text, sub):
    ws["A1"] = text
    ws["A1"].font = font(16, True, GREEN_DARK)
    ws["A2"] = sub
    ws["A2"].font = font(10, color=MUTED)
    ws.row_dimensions[1].height = 26


def header(ws, row, labels, col=1, height=32):
    for i, label in enumerate(labels):
        c = ws.cell(row, col + i, label)
        c.font = font(9, True, "FFFFFF")
        c.fill = fill(GREEN_DARK)
        c.alignment = Alignment(wrap_text=True, vertical="center")
    ws.row_dimensions[row].height = height


def fit_width(ws):
    """Print landscape, one page wide."""
    ws.page_setup.orientation = "landscape"
    ws.page_setup.fitToWidth, ws.page_setup.fitToHeight = 1, 0
    ws.sheet_properties.pageSetUpPr.fitToPage = True


def sales_formulas(r):
    """Formulas for one Sales row (also used for the example on Start Here)."""
    a, d = f"$A{r}", f"$D{r}"
    active = f'AND({a}<>"",$L{r}<>"Cancelled",$L{r}<>"Returned")'

    def has(word):
        return f'ISNUMBER(SEARCH("{word}",{d}))'

    def t(i):
        return f"Settings!$A${TYPE_FIRST + i}"

    is_arm = (f'AND(OR({has("arm sleeve")},{has("manset")},{has("sleeve golf")}),'
              f'NOT(OR({has("polo")},{has("baju")},{has("kaos")})))')
    is_top = f'OR({has("polo")},{has("baju")},{has("kaos")},{has("shirt")})'
    is_women = f'OR({has("wanita")},{has("women")},{has("woman")},{has("lady")})'
    is_long = f'OR({has("panjang")},{has("long")})'
    type_used = (f'IF($C{r}<>"",$C{r},IF({d}="","",IF({is_arm},{t(0)},IF(NOT({is_top}),{t(5)},'
                 f'IF({is_women},IF({is_long},{t(4)},{t(3)}),IF({is_long},{t(2)},{t(1)}))))))')
    return {
        "M": f"={type_used}",
        "N": f'=IF({a}="","",DATE(YEAR({a}),MONTH({a}),1))',
        "O": f'=IF({active},N($F{r})*N($G{r}),"")',
        "P": f'=IF(O{r}="","",O{r}-N($H{r}))',
        # % fee on the price after your discount; the fixed fee once per invoice
        # (rows of one invoice sit together, so only the first row pays it)
        "Q": (f'=IF(O{r}="","",IF($J{r}<>"",N($J{r}),'
              f'P{r}*{SET_FEE}+IF(OR($B{r}="",$B{r}<>$B{r - 1}),{SET_FIXED},0)))'),
        "R": f'=IF(O{r}="","",P{r}-Q{r}-N($I{r}))',
        "S": (f'=IF(O{r}="","",IF($K{r}<>"",N($K{r}),'
              f'IFERROR(N(INDEX({TYPE_COSTS},MATCH(M{r},{TYPE_NAMES},0))),0)))'),
        "T": f'=IF(O{r}="","",N($F{r})*S{r})',
        "U": f'=IF(O{r}="","",R{r}-T{r})',
        "V": f'=IF(OR(O{r}="",N(P{r})=0),"",U{r}/P{r})',
        "W": f'=IF(AND({a}<>"",OR($L{r}="",$L{r}="Completed")),1,0)',
    }


def rng(col, last=S_LAST, sheet="Sales"):
    return f"{sheet}!${col}${FIRST}:${col}${last}"


def in_year(month_col_range):
    return f'{month_col_range},">="&DATE($C$5,1,1),{month_col_range},"<="&DATE($C$5,12,1)'


def year_sum(col):
    """Completed sales in the report year."""
    return f"SUMIFS({rng(col)},{rng('W')},1,{in_year(rng('N'))})"


# ---------- sheets ----------
def build_settings(wb):
    ws = wb.create_sheet("Settings")
    title(ws, "Settings", "Check the yellow cells first. Every formula in the workbook reads them from here.")
    rows = [
        (4, "Report year", date.today().year, "0", None),
        (5, "Tokopedia service fee (% of price after your discount)", 0.095, PCT, FEE_SOURCES),
        (6, "Tokopedia fee per order (Rp)", 1250, RP, FEE_SOURCES),
        (7, "Tax estimate: PPh Final UMKM rate", 0.005, PCT, TAX_SOURCE),
        (8, "Tax-free turnover per year (Rp)", 500000000, RP, TAX_SOURCE),
    ]
    for r, label, value, fmt, note in rows:
        ws[f"A{r}"] = label
        ws[f"A{r}"].font = font()
        c = ws[f"B{r}"]
        c.value = value
        c.font = font(color=BLUE)
        c.number_format = fmt
        if r > 4:
            c.fill = fill(YELLOW)
        if note:
            c.comment = Comment(note, "GOLFWEAR")
            c.comment.width, c.comment.height = 420, 160
    ws["C5"] = "Placeholder: use your real rate (see the cell note and Start Here)."
    ws["C7"] = "Estimate only: confirm with a tax advisor."
    for ref in ("C5", "C7"):
        ws[ref].font = font(9, color=MUTED, italic=True)

    header(ws, 10, ["Product type", "Your cost per unit - HPP (Rp)", "Typical price on your store (Rp)",
                    "Profit per unit at typical price (Rp)", "Where the typical price comes from"])
    for i in range(TYPE_LAST - TYPE_FIRST + 1):
        r = TYPE_FIRST + i
        name, price, n = PRODUCT_TYPES[i] if i < len(PRODUCT_TYPES) else (None, None, None)
        ws[f"A{r}"] = name
        ws[f"A{r}"].font = font(color=BLUE)
        ws[f"B{r}"].font = font(color=BLUE)
        ws[f"B{r}"].number_format = RP
        if name:
            ws[f"B{r}"].fill = fill(YELLOW)
        ws[f"C{r}"] = price
        ws[f"C{r}"].font = font(color=BLUE)
        ws[f"C{r}"].number_format = RP
        ws[f"D{r}"] = f'=IF(OR(B{r}="",C{r}=""),"",C{r}*(1-$B$5)-$B$6-B{r})'
        ws[f"D{r}"].font = font()
        ws[f"D{r}"].number_format = RP
        if n:
            ws[f"E{r}"] = f"Median of {n} listings, tokopedia.com/golfwear, 19 Nov 2026"
            ws[f"E{r}"].font = font(9, color=MUTED)
        for col in "ABCDE":
            ws[f"{col}{r}"].border = BOTTOM
    ws[f"A{TYPE_LAST + 1}"] = ("Product types are read from the product name when the Sales sheet's type is empty: "
                               "the first five rows above are used for that, so rename them freely but keep their order.")
    ws[f"A{TYPE_LAST + 1}"].font = font(9, color=MUTED, italic=True)

    header(ws, STATUS_FIRST - 1, ["Order status (don't rename)"], col=1, height=20)
    for i, s in enumerate(STATUSES):
        ws.cell(STATUS_FIRST + i, 1, s).font = font()
    header(ws, EXPCAT_FIRST - 1, ["Expense categories (edit freely)"], col=3, height=20)
    for i, s in enumerate(EXPENSE_CATS):
        ws.cell(EXPCAT_FIRST + i, 3, s).font = font(color=BLUE)

    for col, w in {"A": 54, "B": 20, "C": 24, "D": 22, "E": 46}.items():
        ws.column_dimensions[col].width = w
    ws.sheet_properties.tabColor = "8A8F89"
    return ws


def build_sales(wb):
    ws = wb.create_sheet("Sales")
    title(ws, "Sales", "One row per product in each order. Type in the first 12 columns; the rest calculates. "
                       "Several products in one order: one row each, same invoice number, one under the other.")
    header(ws, 3, [h for _, h, _, _, _ in SALES_HEAD], height=44)
    for col, _, width, kind, fmt in SALES_HEAD:
        ws.column_dimensions[col].width = width
        if kind == "calc":  # lighter header = calculated column
            ws[f"{col}3"].fill = fill("3B5A4C")

    for r in range(FIRST, S_LAST + 1):
        f = sales_formulas(r)
        for col, _, _, kind, fmt in SALES_HEAD:
            c = ws[f"{col}{r}"]
            if kind == "calc":
                c.value = f[col]
                c.font = font()
            else:
                c.font = font(color=BLUE)
            if fmt:
                c.number_format = fmt

    dv_type = DataValidation(type="list", formula1=f"={TYPE_NAMES}", allow_blank=True)
    dv_status = DataValidation(type="list", formula1=f"=Settings!$A${STATUS_FIRST}:$A${STATUS_FIRST + len(STATUSES) - 1}",
                               allow_blank=True)
    dv_qty = DataValidation(type="whole", operator="greaterThanOrEqual", formula1="1", allow_blank=True)
    dv_qty.error, dv_qty.errorTitle = "Quantity must be a whole number, 1 or more.", "Qty"
    for dv, col in ((dv_type, "C"), (dv_status, "L"), (dv_qty, "F")):
        ws.add_data_validation(dv)
        dv.add(f"{col}{FIRST}:{col}{S_LAST}")

    ws.conditional_formatting.add(
        f"A{FIRST}:V{S_LAST}",
        FormulaRule(formula=[f'OR($L{FIRST}="Cancelled",$L{FIRST}="Returned")'], font=Font(color="9AA09B", italic=True)))
    ws.conditional_formatting.add(
        f"A{FIRST}:L{S_LAST}", FormulaRule(formula=[f'$L{FIRST}="Pending"'], fill=fill("FFF4CC")))
    ws.conditional_formatting.add(
        f"U{FIRST}:U{S_LAST}", CellIsRule(operator="lessThan", formula=["0"], font=Font(color=WARN, bold=True)))

    ws.column_dimensions["W"].hidden = True
    ws.freeze_panes = f"C{FIRST}"
    ws.auto_filter.ref = f"A3:W{S_LAST}"
    ws.print_title_rows = "3:3"
    ws.page_setup.orientation = "landscape"
    ws.sheet_properties.tabColor = GREEN_DARK
    return ws


def build_expenses(wb):
    ws = wb.create_sheet("Expenses")
    title(ws, "Expenses", "Running costs that aren't part of a single order: ads, packaging, supplier shipping, staff...")
    header(ws, 3, ["Date", "Category", "Description", "Amount (Rp)", "Month"])
    ws["E3"].fill = fill("3B5A4C")
    for r in range(FIRST, E_LAST + 1):
        ws[f"A{r}"].number_format = DATE_FMT
        ws[f"D{r}"].number_format = RP
        for col in "ABCD":
            ws[f"{col}{r}"].font = font(color=BLUE)
        ws[f"E{r}"] = f'=IF(A{r}="","",DATE(YEAR(A{r}),MONTH(A{r}),1))'
        ws[f"E{r}"].number_format = MONTH_FMT
        ws[f"E{r}"].font = font()
    dv = DataValidation(type="list", formula1=f"=Settings!$C${EXPCAT_FIRST}:$C${EXPCAT_LAST}", allow_blank=True)
    ws.add_data_validation(dv)
    dv.add(f"B{FIRST}:B{E_LAST}")
    for col, w in {"A": 12, "B": 26, "C": 44, "D": 15, "E": 11}.items():
        ws.column_dimensions[col].width = w
    ws.freeze_panes = f"A{FIRST}"
    ws.auto_filter.ref = f"A3:E{E_LAST}"
    ws.sheet_properties.tabColor = BRASS
    return ws


def build_dashboard(wb):
    ws = wb.create_sheet("Dashboard")
    title(ws, "Dashboard", "Completed orders only (Status empty or Completed). Change the year in Settings.")
    ws["B3"] = (f'=IF(COUNTIFS({TYPE_NAMES},"<>",{TYPE_COSTS},"")>0,'
                f'"Fill in your cost per unit (HPP) for every product type in Settings. Until then, profit is overstated.","")')
    ws["B3"].font = font(10, True, WARN)

    ws["B5"] = "Report year"
    ws["B5"].font = font(10, True)
    ws["C5"] = f"={SET_YEAR}"
    ws["C5"].font = font(10, True, LINKED)
    ws["C5"].number_format = "0"

    exp_total = (f"SUMIFS({rng('D', E_LAST, 'Expenses')},"
                 f"{in_year(rng('E', E_LAST, 'Expenses'))})")
    kpis = [
        # row, label, formula, format, note, bold
        (7, "Items sold", f"={year_sum('F')}", INT, "Units in completed orders", False),
        (8, "Gross sales", f"={year_sum('O')}", RP, "Qty x price", False),
        (9, "Your discounts & vouchers", f"={year_sum('H')}", RP, "Paid by you", False),
        (10, "Net sales", f"={year_sum('P')}", RP, "Gross sales minus your discounts", True),
        (11, "Tokopedia fees", f"={year_sum('Q')}", RP, "Actual fees where typed, else Settings %", False),
        (12, "Shipping you paid", f"={year_sum('I')}", RP, "", False),
        (13, "Net payout", f"={year_sum('R')}", RP, "What Tokopedia pays into your balance", True),
        (14, "Cost of goods (HPP)", f"={year_sum('T')}", RP, "Qty x your cost per unit", False),
        (15, "Gross profit", f"={year_sum('U')}", RP, "Net payout minus cost of goods", True),
        (16, "Operating expenses", f"={exp_total}", RP, "From the Expenses sheet", False),
        (17, "Profit before tax", "=C15-C16", RP, "", False),
        (18, "Tax estimate (PPh Final UMKM)", f"=MAX(0,C10-{SET_TAXFREE})*{SET_TAX}", RP, "See Settings: estimate only", False),
        (19, "Net profit", "=C17-C18", RP, "What the business earned this year", True),
        (20, "Net margin", '=IF(C10=0,"",C19/C10)', PCT, "Net profit / net sales", False),
        (21, "Fees as % of net sales", '=IF(C10=0,"",C11/C10)', PCT, "Watch this when Tokopedia changes fees", False),
        (22, "Pending orders (net sales)",
         f'=SUMIFS({rng("P")},{rng("L")},"Pending",{in_year(rng("N"))})', RP, "Not completed yet: not counted above", False),
    ]
    for r, label, formula, fmt, note, bold in kpis:
        ws[f"B{r}"] = label
        ws[f"B{r}"].font = font(10, bold)
        ws[f"C{r}"] = formula
        ws[f"C{r}"].font = font(10, bold)
        ws[f"C{r}"].number_format = fmt
        ws[f"D{r}"] = note
        ws[f"D{r}"].font = font(9, color=MUTED)
        for col in "BCD":
            ws[f"{col}{r}"].border = BOTTOM
    ws["C19"].fill = fill(GREEN_BAND)

    # ---- month by month ----
    top = 25
    ws[f"B{top - 1}"] = "Month by month"
    ws[f"B{top - 1}"].font = font(12, True, GREEN_DARK)
    cols = ["Month", "Items sold", "Net sales", "Tokopedia fees", "Shipping you paid", "Net payout",
            "Cost of goods", "Gross profit", "Expenses", "Net profit before tax", "Margin"]
    header(ws, top, cols, col=2)
    src = {"C": "F", "D": "P", "E": "Q", "F": "I", "G": "R", "H": "T", "I": "U"}
    for m in range(1, 13):
        r = top + m
        ws[f"B{r}"] = f"=DATE($C$5,{m},1)"
        ws[f"B{r}"].number_format = MONTH_FMT
        for col, s in src.items():
            ws[f"{col}{r}"] = f"=SUMIFS({rng(s)},{rng('W')},1,{rng('N')},$B{r})"
        ws[f"J{r}"] = f"=SUMIFS({rng('D', E_LAST, 'Expenses')},{rng('E', E_LAST, 'Expenses')},$B{r})"
        ws[f"K{r}"] = f"=I{r}-J{r}"
        ws[f"L{r}"] = f'=IF(D{r}=0,"",K{r}/D{r})'
    tot = top + 13
    ws[f"B{tot}"] = "Total"
    for col in "CDEFGHIJK":
        ws[f"{col}{tot}"] = f"=SUM({col}{top + 1}:{col}{top + 12})"
    ws[f"L{tot}"] = f'=IF(D{tot}=0,"",K{tot}/D{tot})'
    for r in range(top + 1, tot + 1):
        for col in "BCDEFGHIJKL":
            c = ws[f"{col}{r}"]
            c.font = font(10, r == tot)
            c.border = BOTTOM
            if col == "C":
                c.number_format = INT
            elif col == "L":
                c.number_format = PCT
            elif col != "B":
                c.number_format = RP
    ws[f"B{tot}"].fill = fill(GREEN_BAND)

    # ---- by product type ----
    pt = tot + 3
    ws[f"B{pt - 1}"] = "By product type"
    ws[f"B{pt - 1}"].font = font(12, True, GREEN_DARK)
    header(ws, pt, ["Product type", "Items sold", "Net sales", "Net payout", "Cost of goods", "Profit",
                    "Margin", "Share of profit"], col=2)
    n_types = TYPE_LAST - TYPE_FIRST + 1
    pt_tot = pt + n_types + 1
    for i in range(n_types):
        r = pt + 1 + i
        ws[f"B{r}"] = f'=IF(Settings!$A${TYPE_FIRST + i}="","",Settings!$A${TYPE_FIRST + i})'
        ws[f"B{r}"].font = font(color=LINKED)
        for col, s in {"C": "F", "D": "P", "E": "R", "F": "T", "G": "U"}.items():
            ws[f"{col}{r}"] = (f'=IF($B{r}="","",SUMIFS({rng(s)},{rng("W")},1,{rng("M")},$B{r},'
                               f'{in_year(rng("N"))}))')
        ws[f"H{r}"] = f'=IF(OR($B{r}="",N(D{r})=0),"",G{r}/D{r})'
        ws[f"I{r}"] = f'=IF(OR($B{r}="",$G${pt_tot}=0),"",G{r}/$G${pt_tot})'
    ws[f"B{pt_tot}"] = "Total"
    for col in "CDEFG":
        ws[f"{col}{pt_tot}"] = f"=SUM({col}{pt + 1}:{col}{pt + n_types})"
    ws[f"H{pt_tot}"] = f'=IF(D{pt_tot}=0,"",G{pt_tot}/D{pt_tot})'
    for r in range(pt + 1, pt_tot + 1):
        for col in "BCDEFGHI":
            c = ws[f"{col}{r}"]
            if col != "B":
                c.font = font(10, r == pt_tot)
            c.border = BOTTOM
            c.number_format = INT if col == "C" else PCT if col in "HI" else RP if col != "B" else "General"
    ws[f"B{pt_tot}"].font = font(10, True)
    ws[f"B{pt_tot}"].fill = fill(GREEN_BAND)

    # ---- expenses by category ----
    ec = pt_tot + 3
    ws[f"B{ec - 1}"] = "Expenses by category"
    ws[f"B{ec - 1}"].font = font(12, True, GREEN_DARK)
    header(ws, ec, ["Category", "Amount", "Share"], col=2)
    n_cats = len(EXPENSE_CATS)
    ec_tot = ec + n_cats + 2
    for i in range(n_cats):
        r = ec + 1 + i
        ws[f"B{r}"] = f"=Settings!$C${EXPCAT_FIRST + i}"
        ws[f"B{r}"].font = font(color=LINKED)
        ws[f"C{r}"] = (f"=SUMIFS({rng('D', E_LAST, 'Expenses')},{rng('B', E_LAST, 'Expenses')},$B{r},"
                       f"{in_year(rng('E', E_LAST, 'Expenses'))})")
    r_none = ec + n_cats + 1
    ws[f"B{r_none}"] = "(no category)"
    ws[f"C{r_none}"] = f"=C16-SUM(C{ec + 1}:C{ec + n_cats})"
    ws[f"B{ec_tot}"] = "Total"
    ws[f"C{ec_tot}"] = "=C16"
    for r in range(ec + 1, ec_tot + 1):
        ws[f"D{r}"] = f'=IF($C${ec_tot}=0,"",C{r}/$C${ec_tot})'
        for col in "BCD":
            c = ws[f"{col}{r}"]
            if col != "B" or r in (r_none, ec_tot):
                c.font = font(10, r == ec_tot)
            c.border = BOTTOM
            c.number_format = RP if col == "C" else PCT if col == "D" else "General"
    ws[f"B{ec_tot}"].fill = fill(GREEN_BAND)

    # ---- chart ----
    ch = BarChart()
    ch.type, ch.grouping = "col", "clustered"
    ch.title = "Net sales and net profit by month"
    ch.add_data(Reference(ws, min_col=4, min_row=top, max_row=top + 12), titles_from_data=True)
    ch.add_data(Reference(ws, min_col=11, min_row=top, max_row=top + 12), titles_from_data=True)
    ch.set_categories(Reference(ws, min_col=2, min_row=top + 1, max_row=top + 12))
    for s, color in zip(ch.series, (GREEN_DARK, BRASS)):
        s.graphicalProperties.solidFill = color
        s.graphicalProperties.line.solidFill = color
    ch.y_axis.numFmt = NumFmt(formatCode="#,##0", sourceLinked=False)
    ch.x_axis.number_format = "mmm"
    ch.roundedCorners = False
    ch.legend.position = "b"
    ch.legend.overlay = False
    ch.title.overlay = False
    ch.x_axis.delete = False
    ch.y_axis.delete = False
    ch.height, ch.width = 9.5, 18.5
    ws.add_chart(ch, "F5")

    for col, w in {"A": 2, "B": 30, "C": 18, "D": 34, "E": 15, "F": 15, "G": 15, "H": 15, "I": 15,
                   "J": 14, "K": 17, "L": 9}.items():
        ws.column_dimensions[col].width = w
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = BRASS
    fit_width(ws)
    return ws


def build_start(wb):
    ws = wb.active
    ws.title = "Start Here"
    title(ws, "GOLFWEAR - Finance",
          "Record every Tokopedia sale and see your real profit: after Tokopedia's fees, your shipping, "
          "the cost of the goods and your running costs.")
    ws.merge_cells("A2:F2")
    ws["A2"].alignment = Alignment(wrap_text=True, vertical="top")
    ws.row_dimensions[2].height = 28
    steps = [
        "1. Settings: check the report year and the Tokopedia fees, then type your cost per unit (HPP) for each "
        "product type in the yellow cells. Until the costs are filled in, profit is overstated.",
        "2. Sales: add one row per product in each order: date, invoice no., product name, qty and price. "
        "You can paste these straight from Tokopedia's order list. Leave Status empty for completed orders.",
        "3. Leave Product type empty and it is read from the product name (sleeve / polo, men / women, "
        "short / long sleeve). Pick one from the list only when the name doesn't say.",
        "4. When you know the exact fees Tokopedia took for an order (the order's income details in Seller "
        "Center), type them in 'Actual Tokopedia fees'. Otherwise the % in Settings is used.",
        "5. Expenses: add TopAds, packaging, supplier shipping and other running costs.",
        "6. Dashboard: profit for the year, month by month, per product type and per expense category.",
    ]
    ws["A4"] = "How to use it"
    ws["A4"].font = font(12, True, GREEN_DARK)
    for i, s in enumerate(steps):
        r = 5 + i
        ws.merge_cells(f"A{r}:F{r}")
        ws[f"A{r}"] = s
        ws[f"A{r}"].font = font()
        ws[f"A{r}"].alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[r].height = 30

    ws["A12"] = "Colour legend"
    ws["A12"].font = font(12, True, GREEN_DARK)
    legend = [
        ("Rp 79,000", font(color=BLUE), None, "Blue text: you type here"),
        ("Rp 75,265", font(), None, "Black text: calculated. Don't type over it"),
        ("Rp 95,000", font(color=LINKED), None, "Green text: pulled from another sheet"),
        ("", font(color=BLUE), fill(YELLOW), "Yellow: a number to fill in or check"),
    ]
    for i, (sample, f_, fl, text) in enumerate(legend):
        r = 13 + i
        ws[f"A{r}"] = sample
        ws[f"A{r}"].font = f_
        if fl:
            ws[f"A{r}"].fill = fl
        ws[f"B{r}"] = text
        ws[f"B{r}"].font = font()

    ex = 19
    ws[f"A{ex - 1}"] = "Example row (for reference only: not counted anywhere; your rows go in Sales)"
    ws[f"A{ex - 1}"].font = font(12, True, GREEN_DARK)
    header(ws, ex, [h for _, h, _, _, _ in SALES_HEAD[:-1]], height=44)
    r = ex + 1
    example = {"A": date(2026, 11, 18), "B": "INV/20261118/MPL/1234567890", "D": "Arm Sleeve Golf UV Protection",
               "E": "Black", "F": 2, "G": 79000, "K": 30000}
    f = sales_formulas(r)
    for col, _, _, kind, fmt in SALES_HEAD[:-1]:
        c = ws[f"{col}{r}"]
        if kind == "calc":
            c.value = f[col]
            c.font = font()
        else:
            c.value = example.get(col)
            c.font = font(color=BLUE)
        if fmt:
            c.number_format = fmt
    ws[f"A{r + 1}"] = ("Unit cost override Rp 30,000 is an example figure. Leave that column empty and the cost "
                       "for the product type in Settings is used.")
    ws[f"A{r + 1}"].font = font(9, color=MUTED, italic=True)

    src = r + 3
    ws[f"A{src}"] = "Where the starting numbers come from"
    ws[f"A{src}"].font = font(12, True, GREEN_DARK)
    notes = [
        "Tokopedia fee 9.5% + Rp 1,250 per order is a placeholder, not your rate. Tokopedia lists 4.25%-10% for "
        "Fashion (tokopedia.com/help/article/biaya-layanan-seller-regular-dan-power-shop); a fashion seller "
        "reported 9.5% + Rp 1,250 per order in January 2026 (teknologi.bisnis.com/read/20260123/84/1946722). "
        "Check your own in Seller Center.",
        "Tax: PPh Final UMKM 0.5% of turnover, first Rp 500 million per year tax-free for individual sellers "
        "(PP 55/2022). An estimate only: confirm with a tax advisor, or set the rate to 0%.",
        "Typical prices in Settings: median listing price per product type on tokopedia.com/golfwear, 19 Nov 2026.",
        f"Room for {SALES_ROWS:,} sales rows and {EXP_ROWS:,} expense rows. Need more? Copy the last row down.",
    ]
    for i, s in enumerate(notes):
        rr = src + 1 + i
        ws.merge_cells(f"A{rr}:F{rr}")
        ws[f"A{rr}"] = s
        ws[f"A{rr}"].font = font(9, color=MUTED)
        ws[f"A{rr}"].alignment = Alignment(wrap_text=True, vertical="top")
        ws.row_dimensions[rr].height = 36
    for col, _, width, _, _ in SALES_HEAD[:-1]:
        ws.column_dimensions[col].width = max(width, 12)
    ws.column_dimensions["A"].width = 14
    ws.column_dimensions["B"].width = 40
    ws.sheet_view.showGridLines = False
    ws.sheet_properties.tabColor = GREEN_DARK
    fit_width(ws)
    return ws


def add_sample(wb):
    """Test rows with hand-checked results (see verify step), never in the delivered file."""
    st = wb["Settings"]
    st["B4"] = 2026
    for r, cost in zip(range(TYPE_FIRST, TYPE_FIRST + 6), (30000, 150000, 170000, 160000, 180000, 50000)):
        st[f"B{r}"] = cost
    rows = [
        # date, invoice, type, name, variant, qty, price, disc, ship, actual fee, cost override, status
        (date(2026, 1, 5), "INV-A", None, "Arm Sleeve Golf UV Protection", "Black", 2, 79000, None, None, None, None, None),
        (date(2026, 1, 5), "INV-A", None, "Polo shirt golf kaos baju golf pria men", "L", 1, 350000, 10000, None, None, None, None),
        (date(2026, 2, 10), "INV-B", None, "Baju Golf Wanita Tangan panjang Polo golf women longsleeve", "M", 1, 395000,
         None, 5000, 40000, None, None),
        (date(2026, 2, 11), "INV-C", None, "Polo shirt golf pria", "L", 1, 350000, None, None, None, None, "Cancelled"),
        (date(2026, 3, 1), "INV-D", None, "Arm sleeve golf Manset", "White", 1, 95000, None, None, None, None, "Pending"),
        (date(2025, 12, 30), "INV-E", None, "Polo shirt golf pria", "M", 1, 350000, None, None, None, None, None),
        (date(2026, 3, 2), "INV-F", "Other", "Golf cap", "-", 1, 120000, None, None, None, 40000, "Completed"),
    ]
    ws = wb["Sales"]
    for i, row in enumerate(rows):
        for j, v in enumerate(row):
            if v is not None:
                ws.cell(FIRST + i, 1 + j, v)
    ex = wb["Expenses"]
    for i, row in enumerate([(date(2026, 1, 15), "Ads (TopAds / TikTok)", "TopAds", 100000),
                             (date(2026, 2, 1), "Packaging", "Polymailers", 50000),
                             (date(2025, 12, 1), "Ads (TopAds / TikTok)", "Last year", 999),
                             (date(2026, 3, 3), None, "Uncategorised", 7000)]):
        for j, v in enumerate(row):
            if v is not None:
                ex.cell(FIRST + i, 1 + j, v)


def build(out: Path, sample: bool):
    wb = Workbook()
    wb._named_styles["Normal"].font = Font(name=FONT, size=10)
    build_start(wb)
    build_dashboard(wb)
    build_sales(wb)
    build_expenses(wb)
    build_settings(wb)
    if sample:
        add_sample(wb)
    wb.properties.title = "GOLFWEAR Finance"
    wb.properties.creator = "GOLFWEAR"
    wb.active = 0
    out.parent.mkdir(parents=True, exist_ok=True)
    wb.save(out)
    return out


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--out", type=Path, help=f"output file (default {DEFAULT_OUT.name})")
    ap.add_argument("--force", action="store_true", help="overwrite an existing workbook")
    ap.add_argument("--sample", type=Path, metavar="FILE", help="write a copy with test rows to FILE")
    args = ap.parse_args()
    if args.sample:
        print(f"Wrote {build(args.sample, sample=True)} (with test rows)")
        return
    out = args.out or DEFAULT_OUT
    if out.exists() and not args.force:
        print(f"Skipped: {out} already exists and may hold your sales. Use --out or --force.")
        return
    print(f"Wrote {build(out, sample=False)}")


if __name__ == "__main__":
    main()
