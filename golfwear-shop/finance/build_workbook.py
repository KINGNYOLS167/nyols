#!/usr/bin/env python3
"""
Build the shop's finance workbook from the website catalog.

    python3 finance/build_workbook.py            -> finance/Golfwear-Finance.xlsx       (empty, ready to use; never overwrites)
    python3 finance/build_workbook.py --demo     -> finance/Golfwear-Finance-DEMO.xlsx  (filled with sample sales)

Works in Excel and in Google Sheets (File > Import > Upload). Only Excel-2007-era
functions are used (SUMIFS, INDEX/MATCH, VLOOKUP, RANK, LARGE) so every app can calculate it.

Sheets
  Start Here  how to use it, colour legend, an example row
  Dashboard   yearly KPIs, monthly profit & loss, channel / brand / category / expense splits, top 10, charts
  Sales       one row per item sold (Tokopedia invoice, WhatsApp, offline...) -> fees, COGS, profit
  Expenses    ads, packaging, photography... -> operating expenses
  Products    SKU master from the website: price, cost, stock on hand, units sold, rank
  Settings    report year, channel fee %, tax rate, dropdown lists
"""
from __future__ import annotations

import argparse
import json
import random
from datetime import date, timedelta
from pathlib import Path

from openpyxl import Workbook
from openpyxl.chart import BarChart, Reference
from openpyxl.comments import Comment
from openpyxl.formatting.rule import CellIsRule, FormulaRule
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "src" / "data" / "catalog.json"

# ---------- Look & feel (matches the website palette) ----------
FONT = "Arial"
GREEN, GREEN_DEEP, BRASS, BRASS_DARK = "183A2C", "0F1A15", "A8834A", "7E5F2C"
IVORY, IVORY_ALT, LINE = "FAF8F3", "F3EFE6", "E0D9CA"
INPUT_BLUE, LINK_GREEN = "0000FF", "008000"

RP = '"Rp "#,##0;("Rp "#,##0);"-"'
INT = '#,##0;(#,##0);"-"'
PCT = '0.0%;(0.0%);"-"'
DATE_FMT = "dd mmm yyyy"
MONTH_FMT = "mmm yyyy"

SALES_ROWS = 1000      # ledger rows pre-filled with formulas
EXPENSE_ROWS = 500
PRODUCT_ROWS = 200     # room to add new SKUs below the website catalog
HDR = 3                # header row on data sheets; data starts on row 4
FIRST = HDR + 1

thin = Side(style="thin", color=LINE)
BOX = Border(left=thin, right=thin, top=thin, bottom=thin)
BOTTOM = Border(bottom=thin)


def font(**kw):
    return Font(name=FONT, **kw)


def fill(hex_):
    return PatternFill("solid", start_color=hex_, end_color=hex_)


def title(ws, text, sub=None):
    ws["A1"] = text
    ws["A1"].font = font(size=18, bold=True, color=GREEN)
    if sub:
        ws["A2"] = sub
        ws["A2"].font = font(size=10, italic=True, color="5F6B64")
    ws.sheet_view.showGridLines = False


def header_row(ws, row, headers, inputs=(), col=1):
    """Green header cells; input columns get a brass header so it is obvious where to type."""
    for i, h in enumerate(headers):
        c = ws.cell(row=row, column=col + i, value=h)
        is_input = h in inputs
        c.font = font(bold=True, color="FFFFFF", size=10)
        c.fill = fill(BRASS_DARK if is_input else GREEN)
        c.alignment = Alignment(horizontal="center", vertical="center", wrap_text=True)
        c.border = BOX
    ws.row_dimensions[row].height = 32


def widths(ws, spec):
    for col, w in spec.items():
        ws.column_dimensions[col].width = w


def style_range(ws, ref, fmt=None, color=None, bold=False, align=None, fill_hex=None, border=None):
    for row in ws[ref]:
        for c in row:
            c.font = font(size=10, color=color, bold=bold)
            if fmt:
                c.number_format = fmt
            if align:
                c.alignment = Alignment(horizontal=align, vertical="center")
            if fill_hex:
                c.fill = fill(fill_hex)
            if border:
                c.border = border


# =====================================================================
# Settings
# =====================================================================
CHANNELS = [
    ("Tokopedia", 0.065, "PLACEHOLDER: set to your real Tokopedia fee (admin + payment + programs) for fashion/sport. Check Seller Center > fees."),
    ("WhatsApp / DM", 0.0, "Direct transfer, no platform fee."),
    ("Website", 0.0, "Orders that come straight from the website (no platform fee)."),
    ("Offline / Event", 0.0, "Sales at tournaments, pop-ups, golf clubs."),
    ("Other marketplace", 0.08, "PLACEHOLDER: e.g. another marketplace you sell on."),
]
EXPENSE_CATS = [
    "Tokopedia Ads / TopAds", "Social media ads", "Packaging", "Shipping supplies",
    "Photography & content", "Platform subscription", "Staff / freelancer", "Rent & utilities",
    "Bank & transfer fees", "Other",
]
STATUSES = ["Completed", "Returned", "Cancelled"]
CH_RANGE = "Settings!$A$8:$A$15"
CH_TABLE = "Settings!$A$8:$B$15"
EXP_RANGE = "Settings!$E$8:$E$22"
STATUS_RANGE = "Settings!$H$8:$H$10"
YEAR_CELL = "Settings!$B$3"
TAX_CELL = "Settings!$B$4"


def build_settings(wb, year):
    ws = wb.create_sheet("Settings")
    title(ws, "Settings", "Blue cells are yours to change. Everything else in the workbook updates automatically.")
    rows = [
        ("Report year", year, "0", "Dashboard shows this calendar year."),
        ("Tax rate (PPh Final UMKM)", 0.005, PCT,
         "Estimate only: 0.5% of monthly gross turnover for UMKM under PP 55/2022. Confirm with your tax advisor."),
    ]
    for i, (label, val, fmt, note) in enumerate(rows):
        r = 3 + i
        ws.cell(r, 1, label).font = font(bold=True, size=10)
        c = ws.cell(r, 2, val)
        c.font = font(size=10, color=INPUT_BLUE, bold=True)
        c.fill = fill("FFFF00")
        c.number_format = fmt
        c.border = BOX
        ws.cell(r, 3, note).font = font(size=9, italic=True, color="5F6B64")

    header_row(ws, 7, ["Sales channel", "Fee % of net sales", "Notes"], inputs=("Sales channel", "Fee % of net sales"))
    for i in range(8):
        r = 8 + i
        name, fee, note = CHANNELS[i] if i < len(CHANNELS) else (None, None, "Add another channel here")
        ws.cell(r, 1, name)
        ws.cell(r, 2, fee)
        ws.cell(r, 3, note)
        style_range(ws, f"A{r}:B{r}", color=INPUT_BLUE, border=BOX)
        ws[f"B{r}"].number_format = PCT
        ws[f"C{r}"].font = font(size=9, italic=True, color="5F6B64")
    ws["B8"].fill = fill("FFFF00")
    ws["B8"].comment = Comment("Assumption: 6.5% is a placeholder, not Tokopedia's published rate. "
                               "Replace with the total fee % you actually pay per order.", "Finance setup")

    header_row(ws, 7, ["Expense categories"], inputs=("Expense categories",), col=5)
    for i in range(15):
        c = ws.cell(8 + i, 5, EXPENSE_CATS[i] if i < len(EXPENSE_CATS) else None)
        c.font = font(size=10, color=INPUT_BLUE)
        c.border = BOX
    header_row(ws, 7, ["Order status"], col=8)
    for i, s in enumerate(STATUSES):
        c = ws.cell(8 + i, 8, s)
        c.font = font(size=10)
        c.border = BOX
    ws["H11"] = "Blank status = Completed"
    ws["H11"].font = font(size=9, italic=True, color="5F6B64")
    widths(ws, {"A": 28, "B": 18, "C": 70, "D": 3, "E": 26, "F": 3, "G": 3, "H": 22})
    return ws


# =====================================================================
# Products
# =====================================================================
P_HEAD = ["SKU", "Product", "Brand", "Category", "Gender", "List price (Rp)", "Unit cost (Rp)", "Margin %",
          "Opening stock", "Restocked", "Units sold", "Units returned", "Stock on hand", "Reorder at",
          "Stock status", "Net sales (Rp)", "Gross profit (Rp)", "Sales rank", "Rank key", "Tokopedia URL"]
P_INPUTS = {"SKU", "Product", "Brand", "Category", "Gender", "List price (Rp)", "Unit cost (Rp)",
            "Opening stock", "Restocked", "Reorder at", "Tokopedia URL"}
P_LAST = FIRST + PRODUCT_ROWS - 1
SKU_RANGE = f"Products!$A${FIRST}:$A${P_LAST}"


def build_products(wb, catalog, opening):
    ws = wb.create_sheet("Products")
    title(ws, "Products & Stock", "Synced from the website catalog. Add new SKUs in the empty rows below; keep SKUs identical to the website.")
    header_row(ws, HDR, P_HEAD, P_INPUTS)
    brands = {b["id"]: b["name"] for b in catalog["brands"]}
    cats = {c["id"]: c["name"] for c in catalog["categories"]}
    prods = catalog["products"]
    S = "Sales!"
    for i in range(PRODUCT_ROWS):
        r = FIRST + i
        p = prods[i] if i < len(prods) else None
        if p:
            values = [p["sku"], p["name"], brands[p["brand"]], cats[p["category"]], p["gender"].title(),
                      p["price"], p["cost"], None, opening.get(p["sku"], p["stock"]), 0, None, None, None,
                      max(3, round(p["stock"] * 0.2)), None, None, None, None, None, p.get("tokopediaUrl") or None]
            for col, v in enumerate(values, start=1):
                if v is not None:
                    ws.cell(r, col, v)
        a = f"$A{r}"
        ws[f"H{r}"] = f'=IF(OR({a}="",N(F{r})=0),"",(F{r}-G{r})/F{r})'
        sold = (f"SUMIFS({S}$I:$I,{S}$D:$D,{a})-SUMIFS({S}$I:$I,{S}$D:$D,{a},{S}$M:$M,\"Returned\")"
                f"-SUMIFS({S}$I:$I,{S}$D:$D,{a},{S}$M:$M,\"Cancelled\")")
        ws[f"K{r}"] = f'=IF({a}="","",{sold})'
        ws[f"L{r}"] = f'=IF({a}="","",SUMIFS({S}$I:$I,{S}$D:$D,{a},{S}$M:$M,"Returned"))'
        ws[f"M{r}"] = f'=IF({a}="","",N(I{r})+N(J{r})-K{r})'
        ws[f"O{r}"] = f'=IF({a}="","",IF(M{r}<=0,"Out of stock",IF(M{r}<=N(N{r}),"Reorder","OK")))'
        ws[f"P{r}"] = f'=IF({a}="","",SUMIFS({S}$O:$O,{S}$D:$D,{a}))'
        ws[f"Q{r}"] = f'=IF({a}="","",SUMIFS({S}$T:$T,{S}$D:$D,{a}))'
        ws[f"S{r}"] = f'=IF({a}="","",K{r}+(100000-ROW())/10000000)'
        ws[f"R{r}"] = f'=IF({a}="","",IF(K{r}<=0,"-",RANK(S{r},$S${FIRST}:$S${P_LAST})))'

        style_range(ws, f"A{r}:T{r}", border=BOTTOM)
        style_range(ws, f"A{r}:G{r}", color=INPUT_BLUE, border=BOTTOM)
        style_range(ws, f"I{r}:J{r}", color=INPUT_BLUE, fmt=INT, border=BOTTOM)
        style_range(ws, f"N{r}:N{r}", color=INPUT_BLUE, fmt=INT, border=BOTTOM)
        style_range(ws, f"T{r}:T{r}", color=INPUT_BLUE, border=BOTTOM)
        for col, fmt in (("F", RP), ("G", RP), ("H", PCT), ("K", INT), ("L", INT), ("M", INT), ("P", RP), ("Q", RP), ("S", "0.0000000")):
            ws[f"{col}{r}"].number_format = fmt
        ws[f"R{r}"].alignment = Alignment(horizontal="center")
        ws[f"O{r}"].alignment = Alignment(horizontal="center")

    rng = f"O{FIRST}:O{P_LAST}"
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Reorder"'], fill=fill("FCE8C3"), font=Font(name=FONT, color="7E5F2C", bold=True)))
    ws.conditional_formatting.add(rng, CellIsRule(operator="equal", formula=['"Out of stock"'], fill=fill("F6D5D1"), font=Font(name=FONT, color="A3352B", bold=True)))
    ws.column_dimensions["S"].hidden = True
    ws.freeze_panes = f"C{FIRST}"
    ws.auto_filter.ref = f"A{HDR}:T{P_LAST}"
    widths(ws, {"A": 12, "B": 34, "C": 14, "D": 22, "E": 9, "F": 15, "G": 15, "H": 10, "I": 10, "J": 10, "K": 10,
                "L": 10, "M": 11, "N": 10, "O": 13, "P": 16, "Q": 16, "R": 9, "S": 6, "T": 40})
    return ws


# =====================================================================
# Sales ledger
# =====================================================================
S_HEAD = ["Date", "Order / invoice no.", "Channel", "SKU", "Product", "Brand", "Category", "Size", "Qty",
          "Unit price (Rp)", "Discount / voucher (Rp)", "Seller shipping (Rp)", "Status",
          "Gross sales (Rp)", "Net sales (Rp)", "Platform fee (Rp)", "Net revenue (Rp)", "Unit cost (Rp)",
          "COGS (Rp)", "Gross profit (Rp)", "Margin %", "Month"]
S_INPUTS = {"Date", "Order / invoice no.", "Channel", "SKU", "Size", "Qty", "Unit price (Rp)",
            "Discount / voucher (Rp)", "Seller shipping (Rp)", "Status"}
S_LAST = FIRST + SALES_ROWS - 1
# Input columns in the order demo rows are written: A B C D H I J K L M
S_INPUT_COLS = [1, 2, 3, 4, 8, 9, 10, 11, 12, 13]


def build_sales(wb, rows):
    ws = wb.create_sheet("Sales")
    title(ws, "Sales Ledger", "One row per product line sold. Type in the brass columns only; green-header columns calculate themselves.")
    header_row(ws, HDR, S_HEAD, S_INPUTS)
    P = "Products!"
    for i in range(SALES_ROWS):
        r = FIRST + i
        d = f"$D{r}"
        if i < len(rows):
            for col, v in zip(S_INPUT_COLS, rows[i]):
                if v is not None:
                    ws.cell(r, col, v)
        lookup = lambda col: f'=IF({d}="","",IFERROR(INDEX({P}${col}:${col},MATCH({d},{P}$A:$A,0)),""))'
        ws[f"E{r}"] = f'=IF({d}="","",IFERROR(INDEX({P}$B:$B,MATCH({d},{P}$A:$A,0)),"Unknown SKU"))'
        ws[f"F{r}"] = lookup("C")
        ws[f"G{r}"] = lookup("D")
        ws[f"N{r}"] = f'=IF({d}="","",IF(OR($M{r}="",$M{r}="Completed"),N($I{r})*N($J{r}),0))'
        ws[f"O{r}"] = f'=IF({d}="","",IF($N{r}=0,0,$N{r}-N($K{r})))'
        ws[f"P{r}"] = f'=IF({d}="","",$O{r}*IFERROR(VLOOKUP($C{r},{CH_TABLE},2,FALSE),0))'
        ws[f"Q{r}"] = f'=IF({d}="","",$O{r}-$P{r}-N($L{r}))'
        ws[f"R{r}"] = f'=IF({d}="","",IFERROR(INDEX({P}$G:$G,MATCH({d},{P}$A:$A,0)),0))'
        ws[f"S{r}"] = f'=IF({d}="","",IF($N{r}=0,0,N($I{r})*$R{r}))'
        ws[f"T{r}"] = f'=IF({d}="","",$Q{r}-$S{r})'
        ws[f"U{r}"] = f'=IF({d}="","",IF($O{r}=0,"",$T{r}/$O{r}))'
        ws[f"V{r}"] = f'=IF($A{r}="","",DATE(YEAR($A{r}),MONTH($A{r}),1))'

        style_range(ws, f"A{r}:V{r}", border=BOTTOM)
        style_range(ws, f"A{r}:D{r}", color=INPUT_BLUE, border=BOTTOM)
        style_range(ws, f"H{r}:M{r}", color=INPUT_BLUE, border=BOTTOM)
        ws[f"A{r}"].number_format = DATE_FMT
        ws[f"I{r}"].number_format = INT
        for col in "JKLNOPQRST":
            ws[f"{col}{r}"].number_format = RP
        ws[f"U{r}"].number_format = PCT
        ws[f"V{r}"].number_format = MONTH_FMT
        ws[f"F{r}"].font = font(size=10, color=LINK_GREEN)
        ws[f"G{r}"].font = font(size=10, color=LINK_GREEN)
        ws[f"E{r}"].font = font(size=10, color=LINK_GREEN)
        ws[f"R{r}"].font = font(size=10, color=LINK_GREEN)

    for rng, src in ((f"C{FIRST}:C{S_LAST}", CH_RANGE), (f"D{FIRST}:D{S_LAST}", SKU_RANGE), (f"M{FIRST}:M{S_LAST}", STATUS_RANGE)):
        dv = DataValidation(type="list", formula1=f"={src}", allow_blank=True, showErrorMessage=True,
                            errorTitle="Pick from the list", error="Choose a value from the dropdown (lists live in Settings / Products).")
        ws.add_data_validation(dv)
        dv.add(rng)
    qty = DataValidation(type="whole", operator="greaterThan", formula1="0", allow_blank=True, showErrorMessage=True, error="Qty must be a whole number above 0.")
    ws.add_data_validation(qty)
    qty.add(f"I{FIRST}:I{S_LAST}")
    dte = DataValidation(type="date", operator="greaterThan", formula1="DATE(2020,1,1)", allow_blank=True, showErrorMessage=True, error="Enter a real date, e.g. 15/01/2026.")
    ws.add_data_validation(dte)
    dte.add(f"A{FIRST}:A{S_LAST}")

    ws.conditional_formatting.add(f"M{FIRST}:M{S_LAST}", CellIsRule(operator="equal", formula=['"Returned"'], font=Font(name=FONT, color="A3352B", bold=True)))
    ws.conditional_formatting.add(f"M{FIRST}:M{S_LAST}", CellIsRule(operator="equal", formula=['"Cancelled"'], font=Font(name=FONT, color="8E9A93", italic=True)))
    ws.conditional_formatting.add(f"T{FIRST}:U{S_LAST}", FormulaRule(formula=[f'AND(ISNUMBER(T{FIRST}),T{FIRST}<0)'], font=Font(name=FONT, color="A3352B")))
    ws.conditional_formatting.add(f"E{FIRST}:E{S_LAST}", CellIsRule(operator="equal", formula=['"Unknown SKU"'], fill=fill("F6D5D1")))
    ws.freeze_panes = f"E{FIRST}"
    ws.auto_filter.ref = f"A{HDR}:V{S_LAST}"
    widths(ws, {"A": 13, "B": 24, "C": 17, "D": 11, "E": 30, "F": 13, "G": 20, "H": 8, "I": 6, "J": 15, "K": 15,
                "L": 14, "M": 12, "N": 15, "O": 15, "P": 15, "Q": 15, "R": 14, "S": 14, "T": 15, "U": 9, "V": 11})
    return ws


# =====================================================================
# Expenses
# =====================================================================
E_HEAD = ["Date", "Category", "Description", "Amount (Rp)", "Paid via", "Month"]
E_LAST = FIRST + EXPENSE_ROWS - 1


def build_expenses(wb, rows):
    ws = wb.create_sheet("Expenses")
    title(ws, "Operating Expenses", "Everything you spend to run the shop, except the cost of the products themselves (that is COGS, from Products).")
    header_row(ws, HDR, E_HEAD, {"Date", "Category", "Description", "Amount (Rp)", "Paid via"})
    for i in range(EXPENSE_ROWS):
        r = FIRST + i
        if i < len(rows):
            for col, v in enumerate(rows[i], start=1):
                ws.cell(r, col, v)
        ws[f"F{r}"] = f'=IF($A{r}="","",DATE(YEAR($A{r}),MONTH($A{r}),1))'
        style_range(ws, f"A{r}:F{r}", border=BOTTOM)
        style_range(ws, f"A{r}:E{r}", color=INPUT_BLUE, border=BOTTOM)
        ws[f"A{r}"].number_format = DATE_FMT
        ws[f"D{r}"].number_format = RP
        ws[f"F{r}"].number_format = MONTH_FMT
    dv = DataValidation(type="list", formula1=f"={EXP_RANGE}", allow_blank=True, showErrorMessage=True, error="Pick a category (edit the list in Settings).")
    ws.add_data_validation(dv)
    dv.add(f"B{FIRST}:B{E_LAST}")
    ws.freeze_panes = f"A{FIRST}"
    ws.auto_filter.ref = f"A{HDR}:F{E_LAST}"
    widths(ws, {"A": 13, "B": 26, "C": 44, "D": 16, "E": 18, "F": 11})
    return ws


# =====================================================================
# Dashboard
# =====================================================================
def kpi(ws, col, row, label, formula, fmt):
    lab = ws.cell(row, col, label)
    lab.font = font(size=9, bold=True, color="5F6B64")
    lab.fill = fill(IVORY_ALT)
    lab.border = Border(top=Side(style="medium", color=BRASS))
    val = ws.cell(row + 1, col, formula)
    val.font = font(size=15, bold=True, color=GREEN)
    val.fill = fill(IVORY_ALT)
    val.number_format = fmt
    ws.row_dimensions[row + 1].height = 26


def table_title(ws, row, text, note=None):
    ws.cell(row, 2, text).font = font(size=13, bold=True, color=GREEN)
    if note:
        ws.cell(row, 6, note).font = font(size=9, italic=True, color="5F6B64")


def build_dashboard(wb, catalog):
    ws = wb.create_sheet("Dashboard", 1)
    title(ws, "Golfwear Shop — Financial Dashboard")
    ws["A2"] = "Year"
    ws["A2"].font = font(size=10, bold=True)
    ws["B2"] = f"={YEAR_CELL}"
    ws["B2"].font = font(size=12, bold=True, color=LINK_GREEN)
    ws["B2"].number_format = "0"
    ws["C2"] = "Change the year in Settings. All money in Rupiah."
    ws["C2"].font = font(size=9, italic=True, color="5F6B64")
    start, end = "DATE($B$2,1,1)", "DATE($B$2,12,1)"
    in_year = lambda rng: f'{rng},">="&{start},{rng},"<="&{end}'

    # ---- Monthly P&L ----
    m0 = 10
    table_title(ws, m0 - 1, "Monthly profit & loss")
    cols = ["Month", "Gross sales", "Discounts", "Net sales", "Platform fees", "Seller shipping", "Net revenue",
            "COGS", "Gross profit", "Operating expenses", "Est. tax", "Net profit", "Net margin", "Units sold"]
    header_row(ws, m0, cols, col=2)
    S = "Sales!"
    for m in range(12):
        r = m0 + 1 + m
        b = f"$B{r}"
        ws[f"B{r}"] = f"=DATE($B$2,{m + 1},1)"
        ws[f"C{r}"] = f"=SUMIFS({S}$N:$N,{S}$V:$V,{b})"
        ws[f"E{r}"] = f"=SUMIFS({S}$O:$O,{S}$V:$V,{b})"
        ws[f"D{r}"] = f"=C{r}-E{r}"
        ws[f"F{r}"] = f"=SUMIFS({S}$P:$P,{S}$V:$V,{b})"
        ws[f"G{r}"] = f"=SUMIFS({S}$L:$L,{S}$V:$V,{b})"
        ws[f"H{r}"] = f"=SUMIFS({S}$Q:$Q,{S}$V:$V,{b})"
        ws[f"I{r}"] = f"=SUMIFS({S}$S:$S,{S}$V:$V,{b})"
        ws[f"J{r}"] = f"=H{r}-I{r}"
        ws[f"K{r}"] = f"=SUMIFS(Expenses!$D:$D,Expenses!$F:$F,{b})"
        ws[f"L{r}"] = f"=E{r}*{TAX_CELL}"
        ws[f"M{r}"] = f"=J{r}-K{r}-L{r}"
        ws[f"N{r}"] = f'=IF(E{r}=0,"",M{r}/E{r})'
        ws[f"O{r}"] = (f'=SUMIFS({S}$I:$I,{S}$V:$V,{b})-SUMIFS({S}$I:$I,{S}$V:$V,{b},{S}$M:$M,"Returned")'
                       f'-SUMIFS({S}$I:$I,{S}$V:$V,{b},{S}$M:$M,"Cancelled")')
        style_range(ws, f"B{r}:O{r}", fmt=RP, border=BOTTOM)
        ws[f"B{r}"].number_format = MONTH_FMT
        ws[f"N{r}"].number_format = PCT
        ws[f"O{r}"].number_format = INT
    tot = m0 + 13
    ws[f"B{tot}"] = "Total"
    for col in "CDEFGHIJKLMO":
        ws[f"{col}{tot}"] = f"=SUM({col}{m0 + 1}:{col}{m0 + 12})"
    ws[f"N{tot}"] = f'=IF(E{tot}=0,"",M{tot}/E{tot})'
    style_range(ws, f"B{tot}:O{tot}", fmt=RP, bold=True, fill_hex=IVORY_ALT, border=Border(top=Side(style="medium", color=GREEN)))
    ws[f"N{tot}"].number_format = PCT
    ws[f"O{tot}"].number_format = INT
    ws.conditional_formatting.add(f"M{m0 + 1}:N{tot}", FormulaRule(formula=[f"AND(ISNUMBER(M{m0 + 1}),M{m0 + 1}<0)"], font=Font(name=FONT, color="A3352B", bold=True)))

    # ---- KPI tiles (rows 4-5 and 6-7) ----
    T = tot
    tiles = [
        ("NET SALES", f"=E{T}", RP), ("NET REVENUE", f"=H{T}", RP), ("GROSS PROFIT", f"=J{T}", RP),
        ("OPERATING EXPENSES", f"=K{T}", RP), ("NET PROFIT", f"=M{T}", RP),
        ("UNITS SOLD", f"=O{T}", INT), ("GROSS MARGIN", f'=IF(E{T}=0,"",J{T}/E{T})', PCT),
        ("NET MARGIN", f"=N{T}", PCT),
        ("AVG PRICE / UNIT", f'=IF(O{T}=0,"",E{T}/O{T})', RP),
        ("PLATFORM FEES", f"=F{T}", RP),
    ]
    for i, (label, f, fmt) in enumerate(tiles):
        row = 4 if i < 5 else 6
        col = 2 + (i % 5) * 2
        ws.merge_cells(start_row=row, start_column=col, end_row=row, end_column=col + 1)
        ws.merge_cells(start_row=row + 1, start_column=col, end_row=row + 1, end_column=col + 1)
        kpi(ws, col, row, label, f, fmt)
        ws.cell(row, col + 1).fill = fill(IVORY_ALT)
        ws.cell(row, col + 1).border = Border(top=Side(style="medium", color=BRASS))
        ws.cell(row + 1, col + 1).fill = fill(IVORY_ALT)

    # ---- Breakdown tables ----
    def breakdown(r0, heading, labels, key_col, note=None, label_is_formula=False):
        table_title(ws, r0, heading, note)
        header_row(ws, r0 + 1, [heading.split(" by ")[-1].capitalize(), "Units", "Net sales", "Platform fees",
                                "Net revenue", "Gross profit", "Margin", "Share of sales"], col=2)
        first, last = r0 + 2, r0 + 1 + len(labels)
        for i, lab in enumerate(labels):
            r = first + i
            ws[f"B{r}"] = lab
            k = f"$B{r}"
            base = f"{S}${key_col}:${key_col},{k},{in_year(f'{S}$V:$V')}"
            ws[f"C{r}"] = (f'=IF({k}="","",SUMIFS({S}$I:$I,{base})-SUMIFS({S}$I:$I,{base},{S}$M:$M,"Returned")'
                           f'-SUMIFS({S}$I:$I,{base},{S}$M:$M,"Cancelled"))')
            ws[f"D{r}"] = f'=IF({k}="","",SUMIFS({S}$O:$O,{base}))'
            ws[f"E{r}"] = f'=IF({k}="","",SUMIFS({S}$P:$P,{base}))'
            ws[f"F{r}"] = f'=IF({k}="","",SUMIFS({S}$Q:$Q,{base}))'
            ws[f"G{r}"] = f'=IF({k}="","",SUMIFS({S}$T:$T,{base}))'
            ws[f"H{r}"] = f'=IF(N(D{r})=0,"",G{r}/D{r})'
            ws[f"I{r}"] = f'=IF(OR(N(D{r})=0,$E${T}=0),"",D{r}/$E${T})'
            style_range(ws, f"B{r}:I{r}", fmt=RP, border=BOTTOM)
            ws[f"C{r}"].number_format = INT
            ws[f"H{r}"].number_format = PCT
            ws[f"I{r}"].number_format = PCT
            ws[f"B{r}"].number_format = "General"
            if label_is_formula:
                ws[f"B{r}"].font = font(size=10, color=LINK_GREEN)
        return first, last

    r = tot + 3
    ch_first, ch_last = breakdown(r, "Sales by channel", [f"=IF(Settings!$A${8 + i}=\"\",\"\",Settings!$A${8 + i})" for i in range(8)],
                                  "C", "Fees use the % in Settings.", label_is_formula=True)
    r = ch_last + 3
    brand_names = [b["name"] for b in catalog["brands"]]
    br_first, br_last = breakdown(r, "Sales by brand", brand_names, "F")
    r = br_last + 3
    cat_names = [c["name"] for c in catalog["categories"]]
    breakdown(r, "Sales by category", cat_names, "G")
    r = r + len(cat_names) + 4

    # ---- Expenses by category ----
    table_title(ws, r, "Operating expenses by category")
    header_row(ws, r + 1, ["Category", "Amount", "Share"], col=2)
    ex_first = r + 2
    for i in range(15):
        rr = ex_first + i
        ws[f"B{rr}"] = f'=IF(Settings!$E${8 + i}="","",Settings!$E${8 + i})'
        ws[f"C{rr}"] = f'=IF($B{rr}="","",SUMIFS(Expenses!$D:$D,Expenses!$B:$B,$B{rr},{in_year("Expenses!$F:$F")}))'
        ws[f"D{rr}"] = f'=IF(OR(N(C{rr})=0,$K${T}=0),"",C{rr}/$K${T})'
        style_range(ws, f"B{rr}:D{rr}", fmt=RP, border=BOTTOM)
        ws[f"B{rr}"].font = font(size=10, color=LINK_GREEN)
        ws[f"D{rr}"].number_format = PCT
    r = ex_first + 15 + 2

    # ---- Top 10 products (all time) ----
    table_title(ws, r, "Top 10 products by units sold", "All time, from the Products sheet. Use this to pick the website's best sellers.")
    header_row(ws, r + 1, ["Rank", "SKU", "Product", "Brand", "Units sold", "Net sales", "Gross profit", "Stock on hand"], col=2)
    keys = f"Products!$S${FIRST}:$S${P_LAST}"
    for k in range(1, 11):
        rr = r + 1 + k
        idx = f"MATCH(LARGE({keys},{k}),{keys},0)"
        pick = lambda col: f"=IFERROR(INDEX(Products!${col}${FIRST}:${col}${P_LAST},{idx}),\"\")"
        ws[f"B{rr}"] = k
        ws[f"C{rr}"] = pick("A")
        ws[f"D{rr}"] = pick("B")
        ws[f"E{rr}"] = pick("C")
        ws[f"F{rr}"] = pick("K")
        ws[f"G{rr}"] = pick("P")
        ws[f"H{rr}"] = pick("Q")
        ws[f"I{rr}"] = pick("M")
        style_range(ws, f"B{rr}:I{rr}", border=BOTTOM)
        ws[f"B{rr}"].alignment = Alignment(horizontal="center")
        for col in "CDE":
            ws[f"{col}{rr}"].font = font(size=10, color=LINK_GREEN)
        ws[f"F{rr}"].number_format = INT
        ws[f"G{rr}"].number_format = RP
        ws[f"H{rr}"].number_format = RP
        ws[f"I{rr}"].number_format = INT
    chart_row = r + 14

    # ---- Charts ----
    c1 = BarChart()
    c1.type = "col"
    c1.title = "Net sales vs net profit by month"
    c1.y_axis.title = "Rupiah"
    c1.add_data(Reference(ws, min_col=5, min_row=m0, max_row=m0 + 12), titles_from_data=True)
    c1.add_data(Reference(ws, min_col=13, min_row=m0, max_row=m0 + 12), titles_from_data=True)
    c1.set_categories(Reference(ws, min_col=2, min_row=m0 + 1, max_row=m0 + 12))
    c1.y_axis.number_format = '#,##0'
    c2 = BarChart()
    c2.type = "bar"
    c2.title = "Net sales by brand"
    c2.add_data(Reference(ws, min_col=4, min_row=br_first - 1, max_row=br_last), titles_from_data=True)
    c2.set_categories(Reference(ws, min_col=2, min_row=br_first, max_row=br_last))
    c2.legend = None
    c2.y_axis.number_format = '#,##0'
    for ch, anchor in ((c1, f"B{chart_row}"), (c2, f"I{chart_row}")):
        ch.height, ch.width = 8, 16
        ch.roundedCorners = False
        ch.x_axis.delete = False
        ch.y_axis.delete = False
        if ch.legend is not None:
            ch.legend.position = "b"
            ch.legend.overlay = False
        ch.title.overlay = False
        ws.add_chart(ch, anchor)
    s1, s2 = c1.series
    s1.graphicalProperties.solidFill = GREEN
    s2.graphicalProperties.solidFill = BRASS
    c2.series[0].graphicalProperties.solidFill = GREEN

    widths(ws, {"A": 6, "B": 22, "C": 15, "D": 15, "E": 15, "F": 15, "G": 15, "H": 15, "I": 15, "J": 15,
                "K": 16, "L": 13, "M": 15, "N": 11, "O": 11})
    ws.freeze_panes = "A3"
    return ws


# =====================================================================
# Start Here
# =====================================================================
def build_start(wb, demo):
    ws = wb.active
    ws.title = "Start Here"
    title(ws, "Golfwear Shop — Finance Workbook")
    lines = [
        ("DEMO FILE — every number here is made-up sample data. Use Golfwear-Finance.xlsx for your real books." if demo else
         "Your shop's books: record every sale and expense, and the Dashboard does the rest.", True),
        ("", False),
        ("How to use it", True),
        ("1. Settings: set the report year and replace the Tokopedia fee % with what you really pay per order.", False),
        ("2. Products: one row per SKU (already filled from the website). Enter unit cost and opening stock.", False),
        ("3. Sales: after each order, add a row — date, invoice no., channel, SKU, size, qty, unit price, voucher, status.", False),
        ("     Product, brand, fees, COGS and profit calculate automatically. Leave Status blank for a normal completed order.", False),
        ("4. Expenses: log ads, packaging, photography and other running costs.", False),
        ("5. Dashboard: monthly profit & loss, sales by channel / brand / category, top 10 products and charts.", False),
        ("6. Website best sellers: run  npm run sync-bestsellers  to copy units sold from this file into the website.", False),
        ("", False),
        ("Colour legend", True),
    ]
    r = 3
    for text, bold in lines:
        c = ws.cell(r, 1, text)
        c.font = font(size=11 if bold else 10, bold=bold, color=("A3352B" if demo and r == 3 else GREEN if bold else "0F1A15"))
        r += 1
    legend = [
        ("Blue text", "Your inputs: type here", INPUT_BLUE, None),
        ("Black text", "Formulas: do not type over them", "000000", None),
        ("Green text", "Pulled from another sheet", LINK_GREEN, None),
        ("Brass header", "Input column", "FFFFFF", BRASS_DARK),
        ("Green header", "Calculated column", "FFFFFF", GREEN),
        ("Yellow fill", "Key assumption to check", INPUT_BLUE, "FFFF00"),
    ]
    for name, desc, color, bg in legend:
        a = ws.cell(r, 1, name)
        a.font = font(size=10, bold=True, color=color)
        if bg:
            a.fill = fill(bg)
        ws.cell(r, 2, desc).font = font(size=10)
        r += 1
    r += 1
    ws.cell(r, 1, "Example sales row (format to follow)").font = font(size=11, bold=True, color=GREEN)
    r += 1
    example_head = ["Date", "Order / invoice no.", "Channel", "SKU", "Size", "Qty", "Unit price (Rp)", "Discount / voucher (Rp)", "Seller shipping (Rp)", "Status"]
    example = [date(2026, 1, 15), "INV/20260115/MPL/1234567", "Tokopedia", "FJ-PL-001", "L", 1, 1150000, 50000, 10000, "Completed"]
    for i, (h, v) in enumerate(zip(example_head, example)):
        hc = ws.cell(r, 1 + i, h)
        hc.font = font(size=9, bold=True, color="FFFFFF")
        hc.fill = fill(BRASS_DARK)
        hc.alignment = Alignment(wrap_text=True, horizontal="center")
        vc = ws.cell(r + 1, 1 + i, v)
        vc.font = font(size=10, color=INPUT_BLUE)
        vc.border = BOX
        vc.number_format = DATE_FMT if i == 0 else RP if i in (6, 7, 8) else "General"
    ws.row_dimensions[r].height = 30
    r += 3
    notes = [
        "Assumptions to check",
        "• Tokopedia fee 6.5% is a placeholder (Settings!B8). Use your real total fee from Tokopedia Seller Center.",
        "• Tax 0.5% = PPh Final UMKM estimate (PP 55/2022) on net sales. Confirm with a tax advisor; set 0% to hide it.",
        "• Returned and cancelled orders count as 0 sales; seller shipping you paid still counts as a cost.",
        "• Google Sheets: File > Import > Upload this file > Replace spreadsheet. All formulas keep working.",
    ]
    for i, t in enumerate(notes):
        ws.cell(r + i, 1, t).font = font(size=10, bold=(i == 0), color=GREEN if i == 0 else "0F1A15")
    widths(ws, {"A": 22, "B": 28, "C": 14, "D": 12, "E": 8, "F": 6, "G": 15, "H": 17, "I": 17, "J": 12})
    return ws


# =====================================================================
# Demo data
# =====================================================================
def demo_data(catalog, year):
    rng = random.Random(42)
    prods = catalog["products"]
    weights = [p["sold"] for p in prods]
    channels, ch_w = ["Tokopedia", "WhatsApp / DM", "Website", "Offline / Event"], [0.78, 0.11, 0.05, 0.06]
    sales, opening_used = [], {}
    n = 0
    for month in range(1, 12):  # Jan–Nov
        lines = int(26 + month * 3.2 + rng.randint(-4, 6))
        for _ in range(lines):
            p = rng.choices(prods, weights)[0]
            day = date(year, month, 1) + timedelta(days=rng.randint(0, 27))
            ch = rng.choices(channels, ch_w)[0]
            qty = rng.choice([1, 1, 1, 2, 2, 3]) if p["category"] in ("sleeves", "gloves") else rng.choice([1, 1, 1, 1, 2])
            status = rng.choices(["Completed", "Returned", "Cancelled"], [0.94, 0.04, 0.02])[0]
            disc = round(p["price"] * qty * rng.choice([0.05, 0.1]) / 1000) * 1000 if rng.random() < 0.2 else 0
            ship = rng.choice([0, 0, 5000, 10000, 15000]) if ch == "Tokopedia" else 0
            n += 1
            prefix = f"DEMO-INV/{day:%Y%m%d}/{n:04d}" if ch == "Tokopedia" else f"DEMO-{n:04d}"
            sales.append([day, prefix, ch, p["sku"], rng.choice(p["sizes"]), qty, p["price"], disc or None, ship or None,
                          None if status == "Completed" else status])
            if status != "Returned" and status != "Cancelled":
                opening_used[p["sku"]] = opening_used.get(p["sku"], 0) + qty
    sales.sort(key=lambda s: s[0])
    expenses = []
    for month in range(1, 12):
        d = lambda: date(year, month, rng.randint(1, 27))
        expenses += [
            [d(), "Tokopedia Ads / TopAds", "Product ads budget", rng.randint(15, 30) * 100000, "Tokopedia saldo"],
            [d(), "Packaging", "Polymailers, tissue, stickers", rng.randint(3, 6) * 100000, "Bank transfer"],
            [d(), "Social media ads", "Instagram ads", rng.randint(5, 12) * 100000, "Credit card"],
        ]
        if month % 3 == 1:
            expenses.append([d(), "Photography & content", "New collection photo shoot", 1500000, "Bank transfer"])
    expenses.sort(key=lambda e: e[0])
    opening = {p["sku"]: p["stock"] + opening_used.get(p["sku"], 0) for p in prods}
    return sales, expenses, opening


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--demo", action="store_true", help="fill the workbook with sample sales and expenses")
    ap.add_argument("--year", type=int, default=date.today().year)
    ap.add_argument("--out", type=Path)
    ap.add_argument("--force", action="store_true", help="overwrite an existing (non-demo) workbook")
    args = ap.parse_args()

    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    sales, expenses, opening = demo_data(catalog, args.year) if args.demo else ([], [], {})
    out = args.out or ROOT / "finance" / ("Golfwear-Finance-DEMO.xlsx" if args.demo else "Golfwear-Finance.xlsx")
    if out.exists() and not args.demo and not args.force:
        # Never wipe real bookkeeping by accident.
        print(f"Skipped: {out.relative_to(ROOT)} already exists and may hold your real sales. "
              "Use --out new-file.xlsx for a fresh copy, or --force to overwrite.")
        return

    wb = Workbook()
    build_start(wb, args.demo)
    build_settings(wb, args.year)
    build_products(wb, catalog, opening)
    build_sales(wb, sales)
    build_expenses(wb, expenses)
    build_dashboard(wb, catalog)
    order = ["Start Here", "Dashboard", "Sales", "Expenses", "Products", "Settings"]
    wb._sheets = [wb[n] for n in order]
    wb.active = 1 if args.demo else 0
    for ws in wb.worksheets:
        ws.sheet_properties.tabColor = {"Start Here": BRASS, "Dashboard": GREEN}.get(ws.title, "8E9A93")
    wb.save(out)
    print(f"Wrote {out.relative_to(ROOT)}  ({len(sales)} sales rows, {len(expenses)} expense rows)")


if __name__ == "__main__":
    main()
