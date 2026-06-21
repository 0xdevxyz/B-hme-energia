# Deploy-Anleitung

## Was muss auf den Server?

Pro Kunde wird **nur der Client-Ordner** deployed – nicht das gesamte Studio-Repo.

```
clients/zahnarztpraxis-mittweida/
├── index.html              ← Startseite
├── zahnimplantate.html     ← Unterseiten (via add-page generiert)
├── prophylaxe.html
├── config.json             ← Konfiguration (kein .env!)
├── content.json            ← Bearbeitete Inhalte
├── sitemap.xml
├── robots.txt
├── llms.txt
├── llms-full.txt
├── .env                    ← NICHT deployen (lokal bleiben lassen)
├── assets/
│   ├── css/base.css
│   ├── css/overlay.css
│   ├── images/             ← Hero-Bilder etc.
│   └── uploads/            ← Vom Editor hochgeladene Bilder
```

Der `editor/server.js` läuft auf dem Server als Node.js-Prozess (PM2).

---

## Neuer Server – Einmalig einrichten

```bash
# 1. Node.js installieren (>= 18)
curl -fsSL https://deb.nodesource.com/setup_20.x | bash -
apt install -y nodejs

# 2. PM2 installieren
npm install -g pm2

# 3. Studio-Abhängigkeiten auf dem Server (einmalig)
mkdir -p /var/www/studio
cd /var/www/studio
# package.json + node_modules werden EINMAL hochgeladen (siehe unten)
```

---

## Neuen Kunden deployen (Workflow)

### Schritt 1: Lokal generieren

```bash
# Kunden anlegen und generieren
node cli/studio.js create mein-kunde
# → config.json ausfüllen
node cli/studio.js generate mein-kunde

# Optional: Unterseiten hinzufügen
node cli/studio.js add-page mein-kunde service "Leistung XY"
node cli/studio.js add-page mein-kunde local "Stadteil ABC"
```

### Schritt 2: .env auf dem Server anlegen

```bash
# Vorlage kopieren
cp clients/mein-kunde/.env.example clients/mein-kunde/.env
# Felder ausfüllen: JWT_SECRET, SMTP_*, DEPLOY_HOST, DEPLOY_PATH
nano clients/mein-kunde/.env
```

### Schritt 3: Deployen

```bash
node cli/studio.js deploy mein-kunde
```

Das `deploy`-Kommando führt rsync aus – überträgt alles außer `.env` und `node_modules`.

### Schritt 4: Server starten (einmalig pro Kunde)

```bash
# Auf dem Server:
cd /var/www/mein-kunde
pm2 start /var/www/studio/editor/server.js --name mein-kunde -- --env production
pm2 save
```

Oder mit einer Ecosystem-Datei (empfohlen bei mehreren Kunden):

```js
// /var/www/studio/ecosystem.config.js
module.exports = {
  apps: [
    {
      name: 'zahnarztpraxis-mittweida',
      script: '/var/www/studio/editor/server.js',
      env: { CLIENT_DIR: '/var/www/zahnarztpraxis-mittweida', PORT: 3001, NODE_ENV: 'production' }
    },
    {
      name: 'mein-kunde',
      script: '/var/www/studio/editor/server.js',
      env: { CLIENT_DIR: '/var/www/mein-kunde', PORT: 3002, NODE_ENV: 'production' }
    }
  ]
};
```

```bash
pm2 start ecosystem.config.js
pm2 save
```

---

## Neue Seite zu bestehendem Kunden hinzufügen

```bash
# Lokal:
node cli/studio.js add-page zahnarztpraxis-mittweida service "Zahnimplantate"

# Deployen (rsync überträgt nur geänderte Dateien):
node cli/studio.js deploy zahnarztpraxis-mittweida

# Kein PM2-Neustart nötig – die HTML-Datei wird direkt ausgeliefert.
```

---

## Nginx-Konfiguration (Reverse Proxy)

```nginx
server {
    listen 80;
    server_name zahnarztpraxis-mittweida.de www.zahnarztpraxis-mittweida.de;

    location / {
        proxy_pass http://localhost:3001;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}
```

SSL mit Let's Encrypt:
```bash
certbot --nginx -d zahnarztpraxis-mittweida.de -d www.zahnarztpraxis-mittweida.de
```

---

## Was NICHT auf den Server muss

- `cli/` – nur lokal
- `generator/` – nur lokal
- `templates/` – nur lokal (HTML schon generiert)
- `vault/` – nur lokal
- `data/` – nur lokal
- `.git/` – rsync excludet es automatisch
- `node_modules/` – auf dem Server separat via `npm ci`
- `clients/_example/` – nur lokal

Der Server braucht nur:
- `editor/server.js`
- `editor/overlay.js`
- `package.json` + `node_modules/` (einmalig)
- Den jeweiligen Client-Ordner
