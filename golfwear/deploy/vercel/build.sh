#!/bin/sh
# Builds the GOLFWEAR site from the public GitHub branch as Vercel Build Output (.vercel/output):
# the static site plus the /api/subscribe and /api/admin Edge Functions.
set -eu
REPO=KINGNYOLS167/nyols
REF=add-21st-plugin
rm -rf src dist src.tgz .vercel/output
mkdir -p src .vercel
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" -o src.tgz
tar -xzf src.tgz -C src --strip-components=1
cd src/golfwear/site
npm ci --include=dev --no-audit --no-fund
npm run build:vercel
cd ../../..
cp -r src/golfwear/site/.vercel/output .vercel/output
cp -r src/golfwear/site/dist dist
echo "Built $REPO@$REF"
