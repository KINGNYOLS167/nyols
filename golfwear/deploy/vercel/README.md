# Deploying golfwear.vercel.app

The live site is the Vercel project **golfwear**. It isn't linked to GitHub, so pushing doesn't
redeploy it. A deployment is the three files in this folder: Vercel runs `build.sh`, which
downloads the `claude/keen-knuth-2kevc4` branch from GitHub (set `GOLFWEAR_REF` in the project's
environment variables to build another branch, e.g. `main` after merging), builds
`golfwear/site`, and writes a [Build Output](https://vercel.com/docs/build-output-api/v3) to
`.vercel/output`:

- `static/`: the storefront and the dashboard (one single-page app)
- `functions/api.func`: the API, one Node.js function behind every `/api/*` request
- `config.json`: routes, cache headers, security headers, `noindex` on `/admin`

## One-time setup: database and owner password

The storefront works without these (it shows the Tokopedia store until products are added).
The dashboard at **/admin** needs both; until then it shows a setup screen.

1. **Database.** In Vercel: project **golfwear**, Storage, Create Database, **Neon** (Postgres;
   the free plan is enough), connect it to the project for Production and Preview. Vercel adds
   `DATABASE_URL`. Any other Postgres works too: add its connection string as `DATABASE_URL`.
   Tables are created automatically on the first request.
2. **Owner password.** Settings, Environment Variables: add `ADMIN_PASSWORD` (10 characters or
   more, mark it Sensitive). Optionally add `SESSION_SECRET` (a long random string); without it,
   the session key is derived from the password, so changing the password signs everyone out.
3. Redeploy (below). Then open https://golfwear.vercel.app/admin and sign in.

## Redeploying after a push

Create a production deployment of this folder, with the settings in `vercel.json`
(install `echo using build.sh`, build `sh build.sh`, no framework). For example
`vercel deploy --prod` from this folder, or the Vercel MCP `create_deployment` tool with these
three files inline and `target: production`.

To deploy on every push instead, connect GitHub to the Vercel account and link the project to
the repository with root directory `golfwear/site`, build command `npm run build:vercel`.

## Checking a build locally

From `golfwear/site`:

```bash
npm run build:vercel
```

```bash
DATABASE_URL=postgres://user:pass@localhost:5432/db ADMIN_PASSWORD=choose-a-password node tests/vercel-harness.mjs
```

The harness serves `.vercel/output` with the same routes Vercel applies.
