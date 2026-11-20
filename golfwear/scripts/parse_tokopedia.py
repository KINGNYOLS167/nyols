"""Parse Firecrawl markdown of Tokopedia shop product listing pages into JSON.

Usage: python3 parse_tokopedia.py out.json page1.md [page2.md ...]
Pages are read in order; the first time a product URL is seen fixes its rank.
"""
import json
import re
import sys

BLOCK = re.compile(r"\[!\[product-image\]\((?P<img>[^)]+)\)(?P<body>.*?)\]\((?P<url>https://www\.tokopedia\.com/golfwear/[^)\s]+)\)", re.S)


def clean_lines(body):
    lines = [l.strip().rstrip("\\").strip() for l in body.split("\n")]
    return [l for l in lines if l and not l.startswith("![")]


def parse_sold(text):
    m = re.match(r"([\d.,]+)\s*(rb)?\+?\s*terjual", text)
    if not m:
        return None
    n = float(m.group(1).replace(".", "").replace(",", "."))
    if m.group(2):
        n *= 1000
    return int(n)


def parse_block(m):
    lines = clean_lines(m.group("body"))
    item = {"badges": [], "rating": None, "sold": 0, "soldLabel": None,
            "price": None, "originalPrice": None, "discount": None}
    name = None
    for l in lines:
        if l.startswith("Rp"):
            v = int(re.sub(r"[^\d]", "", l))
            if item["price"] is None:
                item["price"] = v
            else:
                item["originalPrice"] = v
        elif re.fullmatch(r"\d+%", l):
            item["discount"] = int(l[:-1])
        elif re.fullmatch(r"[1-5]\.\d", l) or re.fullmatch(r"[1-5]", l):
            item["rating"] = float(l)
        elif "terjual" in l:
            item["sold"] = parse_sold(l) or 0
            item["soldLabel"] = l
        elif l.startswith("Hemat") or l.startswith("Cashback"):
            item["badges"].append(l)
        elif l in ("PreOrder", "Pre Order", "Grosir", "Terlaris", "Ad"):
            item["badges"].append(l)
        elif name is None:
            name = l.replace("\\_", "_").replace("\\-", "-")
        else:
            item["badges"].append(l)
    url = m.group("url").split("?")[0]
    item["name"] = name
    item["url"] = url
    item["slug"] = url.rsplit("/", 1)[-1]
    item["image"] = m.group("img")
    item["preorder"] = "PreOrder" in item["badges"] or "Pre Order" in item["badges"]
    return item


def main():
    out, pages = sys.argv[1], sys.argv[2:]
    seen = {}
    order = []
    for p in pages:
        text = open(p, encoding="utf-8").read()
        for m in BLOCK.finditer(text):
            it = parse_block(m)
            if it["url"] in seen:
                continue
            seen[it["url"]] = it
            order.append(it)
    for i, it in enumerate(order, 1):
        it["rank"] = i
    json.dump(order, open(out, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print(f"{len(order)} products -> {out}")


if __name__ == "__main__":
    main()
