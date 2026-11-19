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

Vendored skills are unmodified copies; re-copy from upstream to update.
Firecrawl CLI and workflow skills live in separate repos (`firecrawl/cli`, `firecrawl/firecrawl-workflows`) and are not included.
