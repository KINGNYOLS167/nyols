"""Write a curl config that downloads every product image not yet on disk.

Usage: python3 download_images.py catalog.json out_dir > curl.cfg
Image file name = Tokopedia image id, so re-runs skip images already saved.
"""
import json
import os
import re
import sys


def image_key(x):
    m = re.search(r"/([0-9a-f]{32}|[0-9a-f-]{36})(?:\.jpg)?~", x["image"])
    return m.group(1) if m else x["slug"][-40:]


if __name__ == "__main__":
    data, out = json.load(open(sys.argv[1])), sys.argv[2]
    for x in data:
        path = os.path.join(out, image_key(x) + ".webp")
        if not os.path.exists(path) or os.path.getsize(path) == 0:
            print(f'url = "{x["image"]}"\noutput = "{path}"')
