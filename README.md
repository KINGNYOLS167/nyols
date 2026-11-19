# nyols

Personal Claude Code skills. Install by copying into `~/.claude/skills/`:

```bash
cp -r skills/* ~/.claude/skills/
```

| Skill(s) | What it covers | Origin |
|---|---|---|
| `gsap` | GSAP animation, ScrollTrigger, plugins, `useGSAP` | written from [greensock/GSAP](https://github.com/greensock/GSAP) |
| `lenis` | Lenis smooth scroll, React/Vue, snap, GSAP sync | written from [darkroomengineering/lenis](https://github.com/darkroomengineering/lenis) |
| `hyperframes`, `hyperframes-cli`, `hyperframes-registry`, `media-use`, `figma`, `slideshow`, `style-sampling`, `reverse-any-video`, `remotion-to-hyperframes` | HTML-to-video with HyperFrames | vendored from [heygen-com/hyperframes](https://github.com/heygen-com/hyperframes) `skills/` (Apache-2.0) |
| `firecrawl-build`, `firecrawl-build-scrape`, `firecrawl-build-search`, `firecrawl-build-interact`, `firecrawl-build-onboarding` | Integrating Firecrawl web data APIs into app code | vendored from [firecrawl/firecrawl](https://github.com/firecrawl/firecrawl) `skills/` (ISC, per skill metadata) |

| `firecrawl`, `firecrawl-scrape`, `firecrawl-search`, `firecrawl-crawl`, `firecrawl-map`, `firecrawl-interact`, `firecrawl-agent`, `firecrawl-parse`, `firecrawl-download`, `firecrawl-monitor`, `firecrawl-alexandria`, `firecrawl-research-index`, `firecrawl-developer-index` | Live web work via the Firecrawl CLI during a session | vendored from [firecrawl/cli](https://github.com/firecrawl/cli) `skills/` (ISC) |
| `firecrawl-workflows` + 18 workflow skills (`firecrawl-deep-research`, `-competitive-intel`, `-seo-audit`, `-lead-gen`, `-website-design-clone`, `-market-research`, ...) | Repeatable Firecrawl-powered deliverables | vendored from [firecrawl/firecrawl-workflows](https://github.com/firecrawl/firecrawl-workflows) `skills/` (ISC) |

Vendored skills are unmodified copies; re-copy from upstream to update.

## Plugins (project-scoped)

`.claude/settings.json` declares and enables plugins for anyone who opens this repo in Claude Code (they are prompted to trust/install on first run).

| Plugin | What it adds | Setup |
|---|---|---|
| `21st@21st` (marketplace [21st-dev/claude-code-plugin](https://github.com/21st-dev/claude-code-plugin), Apache-2.0) | 7 skills (`21st-cli-use`, `21st-ai`, `21st-registry`, `21st-design-sync`, `21st-ui-build`, `21st-ui-explore`, `21st-ui-review`) + the remote `21st` MCP server (`https://21st.dev/api/mcp`) | Export `API_KEY_21ST` (key from https://21st.dev/settings/api-keys) in the shell that launches Claude Code. Never commit the key. |

Manual equivalent:

```bash
claude plugin marketplace add 21st-dev/claude-code-plugin
claude plugin install 21st@21st --scope project
```
