# Studio – White-Label Website System

Conversion-optimized local business websites with Visual Overlay Editor and AI Search Optimization (GEO/LLMO).

## Features

- **Plain HTML** – Google and LLMs read it directly. No build overhead.
- **GEO/LLMO Ready** – llms.txt, Schema.org, FAQPage, AI-crawler allowlist
- **Visual Overlay Editor** – Clients edit text and images directly on the live page
- **Magic Link Login** – No passwords. Email link, one-time, expires in 1h
- **CLI Workflow** – `studio create` → `generate` → `deploy` in under 10 minutes
- **White-Label** – Each client gets their own isolated installation
- **Updatable** – Template improvements roll out via `studio update` without losing client content

## Quick Start

```bash
npm install
npm install -g .

studio create my-client
# edit clients/my-client/config.json
studio generate my-client
studio deploy my-client
```

## Commands

| Command | Description |
|---|---|
| `studio create [name]` | Create new client project |
| `studio generate [name]` | Generate all files from config.json |
| `studio add-page [name] local [keyword]` | Add local area landing page |
| `studio add-page [name] service [keyword]` | Add service landing page |
| `studio deploy [name]` | Deploy to server via rsync |
| `studio update [name]` | Apply template updates, preserve content |
| `studio list` | Show all clients with status |

## Documentation

- `data/CLI_USAGE.md` – Full CLI reference
- `data/BUSINESS_MODEL.md` – Pricing and packages
- `data/CLIENT_TEMPLATE.md` – Client onboarding checklist
- `data/GEO_LLMO_RESEARCH.md` – AI search optimization research
- `data/DECISIONS.md` – Architecture decisions
- `clients/_example/README.md` – Example client walkthrough

## Tech Stack

| Layer | Technology |
|---|---|
| Pages | Plain HTML5 + minimal CSS |
| AI Optimization | llms.txt + Schema.org + FAQ + E-E-A-T |
| CLI | Node.js + commander.js |
| Generator | Node.js (no framework) |
| Editor Backend | Express.js |
| Auth | Magic Link + JWT Cookie |
| Email | Nodemailer |
| Knowledge Base | Obsidian + Git Submodule (vault/) |
