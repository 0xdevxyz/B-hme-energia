# _example – Beispiel-Kundenprojekt

This is a reference implementation. Copy this pattern for every new client.

## Schnellstart: Neuen Kunden anlegen

### 1. Projekt erstellen
```bash
studio create mein-kunde
```

### 2. config.json befüllen
Öffne `clients/mein-kunde/config.json` und fülle alle Felder aus.

Pflichtfelder:
- `businessName` – Exakter Firmenname (konsistent überall)
- `city` + `district` – Für lokale Keyword-Platzierung
- `industry` – Branche (z.B. "Elektriker", "Maler", "Klempner")
- `mainKeyword` – Haupt-Suchbegriff (z.B. "Elektriker München")
- `phone` + `email` + `address` – NAP-Daten (müssen überall identisch sein)
- `editorEmail` – E-Mail des Kunden für Magic Link Login
- `siteUrl` – Finale Domain (mit https://)

### 3. Seite generieren
```bash
studio generate mein-kunde
```

Generierte Dateien:
- `index.html` – Fertige SEO + GEO optimierte Seite
- `content.json` – Alle bearbeitbaren Inhalte
- `llms.txt` – Für ChatGPT, Claude, Gemini, Perplexity
- `llms-full.txt` – Vollständige Textversion
- `robots.txt` – Mit allen AI-Crawler Freigaben
- `sitemap.xml` – XML Sitemap
- `.env.example` – Konfiguration für Editor-Backend
- `reputation-checklist.md` – Anleitung für Kunden

### 4. .env anlegen
```bash
cp clients/mein-kunde/.env.example clients/mein-kunde/.env
# Fülle alle Werte aus
```

### 5. Deployen
```bash
studio deploy mein-kunde
```

### 6. Landing Pages hinzufügen
```bash
studio add-page mein-kunde local "Elektriker Maxvorstadt"
studio add-page mein-kunde service "Smart Home Installation München"
```

### 7. Updates einspielen
```bash
studio update mein-kunde
```

## Editor-Backend lokal starten
```bash
cd clients/mein-kunde
CLIENT_DIR=. node ../../editor/server.js
```

Dann: http://localhost:3000/?edit
