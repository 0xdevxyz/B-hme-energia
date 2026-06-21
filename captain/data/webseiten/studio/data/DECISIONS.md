# Architecture Decisions

## Plain HTML over React/Next.js
**Decision:** All generated pages are plain HTML5 with minimal CSS.
**Reason:** Google and LLM crawlers read raw HTML directly. No hydration overhead, no JS bundles blocking render. Core Web Vitals score higher. Zero build complexity for the client.

## content.json separation
**Decision:** Editable content lives in content.json, HTML structure lives in templates.
**Reason:** Enables `studio update` to refresh templates without destroying client edits. Also makes the overlay editor's save logic trivial – just update a key in the JSON.

## Magic Link over password
**Decision:** No password management. Email-based one-time links only.
**Reason:** Clients are non-technical. Password reset flows add support overhead. Magic links are secure (token is single-use, 1h TTL) and frictionless.

## White-Label Standalone over SaaS
**Decision:** Each client gets their own isolated installation, not a shared multi-tenant system.
**Reason:** 
- Clients can self-host if needed
- No data mixing between clients
- Simpler architecture, lower operational risk
- Each domain can have its own server, perfect for local SEO signals

## llms.txt as first-class output
**Decision:** Every generated site includes llms.txt and llms-full.txt.
**Reason:** AI search (ChatGPT, Claude, Gemini, Perplexity) is growing rapidly. These files signal to LLM crawlers what content is available and in what format. Early adoption = competitive advantage for clients.

## Git Submodule for Obsidian Vault
**Decision:** Knowledge base lives in a separate GitHub repo, mounted as a submodule.
**Reason:** Obsidian works locally on the vault folder. GitHub keeps it versioned. Any /saas project can reference the vault. No duplication.

## Express.js for editor backend
**Decision:** Lightweight Express server per client (shared binary, different CLIENT_DIR).
**Reason:** No database needed. content.json IS the database. One process per client domain, managed by PM2.
