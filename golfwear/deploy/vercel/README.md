# Deploying golfwear.vercel.app

The live site is the Vercel project **golfwear**. It isn't linked to GitHub, so pushing doesn't
redeploy it. A deployment is two files: Vercel runs `build.sh`, which downloads the
`add-21st-plugin` branch from GitHub, runs `npm run build:vercel` in `golfwear/site` and copies
the result to `.vercel/output` ([Build Output API](https://vercel.com/docs/build-output-api/v3)).
That output holds the static site, the routing rules and two Edge Functions:
`/api/subscribe` (newsletter) and `/api/admin` (private dashboard).

To redeploy after pushing, create a production deployment of this folder, with:

- Install command: `echo using build.sh`
- Build command: `sh build.sh`
- Framework: none

For example `vercel deploy --prod` from this folder, or the Vercel MCP `create_deployment` tool
with these files inline.

## Settings the site needs in Vercel (once)

| Setting | Where | What it does |
| --- | --- | --- |
| `DATABASE_URL` | Storage → Create Database → Neon (free), connected to the project | Stores newsletter sign-ups, sales, expenses and stock |
| `ADMIN_PASSWORD` | Settings → Environment Variables (at least 10 characters) | The password for `/admin` |
| `SESSION_SECRET` (optional) | Settings → Environment Variables | Extra secret for login cookies; changing it logs everyone out |

After adding or changing a setting, redeploy. Without them the shop still works; the newsletter
form says sign-ups aren't open yet and `/admin` shows these setup steps.

To deploy on every push instead, connect GitHub to the Vercel account, link the project to the
repository with root directory `golfwear/site`, build command `npm run build:vercel`, and delete
this folder.
