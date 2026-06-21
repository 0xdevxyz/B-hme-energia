# Studio – Umzug auf neuen Server

Anleitung zum Umzug der **Studio-Build-/Editor-Umgebung** auf einen neuen Server.
Stand: 2026-06-04.

> Unterschied zu `DEPLOY.md`: `DEPLOY.md` beschreibt, wie ein *einzelner Kunde*
> ausgeliefert wird. Dieses Dokument beschreibt den Umzug der *kompletten Studio-Installation*.

---

## Was muss mit?

| Quelle | Kommt mit via | Aktion auf neuem Server |
|---|---|---|
| Studio-Code (cli, generator, templates, editor) | **Git** (88 Dateien tracked) | `git clone` / `git pull` |
| `vault/` (Obsidian-KB) | **Git-Submodule** | `git submodule update --init` |
| `node_modules/` | — (nicht umziehen) | `npm ci` neu bauen |
| **`clients/*/.env`** | ⚠️ **Git-ignoriert – manuell!** | sicher kopieren (Secrets) |
| `clients/*/assets/uploads/` | ⚠️ Git-ignoriert | mit kopieren, falls vorhanden |
| `clients/*/sessions.json` | — (regenerierbar) | ignorieren |
| `data/updates/*.md` | — (lokale Logs) | optional |

### Kritische Secrets in `clients/*/.env`
`JWT_SECRET`, `SMTP_HOST/PORT/USER/PASS/FROM`, `DEPLOY_HOST/USER/PATH`, `SITE_URL`, `PORT`, `CLIENT_DIR`.
Diese **nie** über Git/unverschlüsselt übertragen — per `scp`/Passwortmanager.

---

## Variante A: Fertiges Bundle (empfohlen)

Auf der alten Maschine wurde ein Bundle erstellt:
`/tmp/studio-migration-<datum>.tar.gz` (Code + Secrets, ohne node_modules/.git).

```bash
# Auf neuen Server kopieren
scp /tmp/studio-migration-*.tar.gz user@neuer-server:/tmp/

# Dort entpacken
mkdir -p /var/www/studio && cd /var/www/studio
tar xzf /tmp/studio-migration-*.tar.gz --strip-components=1

# Abhängigkeiten + Submodule
npm ci
git submodule update --init   # nur falls als Git-Repo geklont (Bundle enthält vault bereits)

# Studio-CLI global verfügbar machen (optional)
npm install -g .
```

## Variante B: Über Git

```bash
# Code holen
git clone <repo-url> saas && cd saas
git submodule update --init --recursive
cd studio && npm ci

# Secrets separat nachziehen (NICHT in Git!)
scp altserver:/home/clawd/saas/studio/clients/*/.env  clients/<kunde>/.env
```

---

## Nach dem Umzug prüfen

```bash
node cli/studio.js list          # Kunden sichtbar?
node -e "require('dotenv').config({path:'clients/<kunde>/.env'}); \
  console.log(process.env.JWT_SECRET ? 'env OK' : 'env FEHLT')"
```

- [ ] Node.js >= 18 installiert (`node -v`)
- [ ] `npm ci` ohne Fehler
- [ ] `vault/` vorhanden (Submodule)
- [ ] `clients/<kunde>/.env` vorhanden + vollständig
- [ ] Editor startet: `CLIENT_DIR=$(pwd)/clients/<kunde> node editor/server.js`
- [ ] PM2 / Reverse-Proxy laut `DEPLOY.md` einrichten
- [ ] DNS / SSL (certbot) auf neuen Server zeigen lassen

---

## Hinweise

- Der Code enthält **keine** hartkodierten Pfade — alles über Env-Vars
  (`CLIENT_DIR`, `SITE_URL`, `PORT`) und relative Pfade. Maschinenname egal.
- `JWT_SECRET` **gleich lassen**, sonst werden alle bestehenden Magic-Link-Sessions ungültig
  (kein Problem, sie laufen eh nach 1h ab — aber bewusst entscheiden).
- `DEPLOY_HOST` in den Kunden-`.env` ggf. anpassen, falls auch das Auslieferungsziel umzieht.
