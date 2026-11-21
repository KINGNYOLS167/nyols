#!/bin/sh
# Builds GOLFWEAR (storefront, dashboard and API) from the public GitHub branch into a Vercel
# Build Output in ./.vercel/output: static files, one Node.js function for /api, and the routes.
# Override the branch with GOLFWEAR_REF in the project's environment variables.
set -eu
REPO=KINGNYOLS167/nyols
REF="${GOLFWEAR_REF:-claude/keen-knuth-2kevc4}"
rm -rf src src.tgz .vercel/output
mkdir -p src
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" -o src.tgz
tar -xzf src.tgz -C src --strip-components=1
cd src/golfwear/site
npm ci --include=dev --no-audit --no-fund
npm run build:vercel
cd ../../..
mkdir -p .vercel
cp -r src/golfwear/site/.vercel/output .vercel/output
echo "Built $REPO@$REF"
