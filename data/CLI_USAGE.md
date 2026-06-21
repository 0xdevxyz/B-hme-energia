# CLI Usage Guide

## Installation
```bash
cd /path/to/studio
npm install
npm install -g .
```

## Commands

### studio create [clientname]
Create a new client project.
```bash
studio create elektro-mueller
```
Creates: `clients/elektro-mueller/` with template `config.json`

### studio generate [clientname]
Generate all files from config.json.
```bash
studio generate elektro-mueller
```
Output: index.html, content.json, llms.txt, llms-full.txt, robots.txt, sitemap.xml, .env.example, reputation-checklist.md

### studio add-page [clientname] [type] [keyword]
Add a new landing page.
```bash
# Local area page
studio add-page elektro-mueller local "Elektriker Schwabing"

# Service page
studio add-page elektro-mueller service "Smart Home Installation München"
```
Output: {slug}.html, updated sitemap.xml, updated llms.txt

### studio deploy [clientname]
Deploy to server via rsync.
```bash
studio deploy elektro-mueller
```
Requires: `clients/elektro-mueller/.env` with DEPLOY_HOST, DEPLOY_PATH set

### studio update [clientname]
Apply template updates without overwriting client content.
```bash
studio update elektro-mueller
```
Preserves: config.json, content.json, assets/

### studio blog add [clientname]
Neuen Blog-Artikel erstellen (SEO + AI-optimiert).
```bash
# Minimal (Pflicht: --keyword)
studio blog add zahnarztpraxis-mittweida --keyword "Zahnimplantate Kosten"

# Vollständig
studio blog add zahnarztpraxis-mittweida \
  --keyword "Zahnimplantate Kosten" \
  --title "Zahnimplantate: Was kostet das wirklich?" \
  --author "Dr. Benedix" \
  --image "assets/images/blog/implantate.jpg" \
  --date "2026-05-05"
```
Output:
- `blog/<slug>.html` – Artikel mit Article-Schema.org, FAQPage-Schema, Breadcrumb
- `blog/index.html` – Blog-Übersicht (wird automatisch neu gebaut)
- `sitemap.xml` aktualisiert (Blog-Index + Artikel)
- `llms.txt` aktualisiert (Kurz-Eintrag)
- `llms-full.txt` aktualisiert (Volltext für AI-Crawler)

### studio list
Show all client projects with status.
```bash
studio list
```

## Running the Editor Backend
```bash
# Development (single client)
cd clients/elektro-mueller
CLIENT_DIR=. node ../../editor/server.js

# Production (PM2)
PM2_CLIENT=elektro-mueller pm2 start ../../editor/server.js \
  --name "studio-elektro-mueller" \
  --env "CLIENT_DIR=."
```

## Workflow: New Client in 10 Minutes
```bash
studio create new-client           # 1 min: create project
# edit clients/new-client/config.json  # 3 min: fill in data
studio generate new-client         # 30 sec: generate all files
cp clients/new-client/.env.example clients/new-client/.env
# edit .env                        # 2 min: set SMTP + deploy config
studio deploy new-client           # 2 min: rsync to server
# Done – send client their magic link URL
```
