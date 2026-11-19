#!/bin/sh
# Builds the GOLFWEAR site from the public GitHub branch and puts the result in ./dist
set -eu
REPO=KINGNYOLS167/nyols
REF=add-21st-plugin
rm -rf src dist src.tgz
mkdir -p src
curl -fsSL "https://codeload.github.com/$REPO/tar.gz/refs/heads/$REF" -o src.tgz
tar -xzf src.tgz -C src --strip-components=1
cd src/golfwear/site
npm ci --include=dev --no-audit --no-fund
npm run build
cd ../../..
cp -r src/golfwear/site/dist dist
echo "Built $REPO@$REF"
