# Deploying golfwear.vercel.app

The live site is the Vercel project **golfwear**. It isn't linked to GitHub, so pushing doesn't
redeploy it. A deployment is these three files: Vercel runs `build.sh`, which downloads the
`add-21st-plugin` branch from GitHub, builds `golfwear/site` and serves `dist/`.

To redeploy after pushing, create a production deployment of this folder, with:

- Install command: `echo using build.sh`
- Build command: `sh build.sh`
- Output directory: `dist`
- Framework: none

For example `vercel deploy --prod` from this folder, or the Vercel MCP `create_deployment` tool
with these files inline.

To deploy on every push instead, connect GitHub to the Vercel account, link the project to the
repository with root directory `golfwear/site`, and delete this folder.
