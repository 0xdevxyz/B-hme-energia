# Blog-System – Dokumentation

## Übersicht

Das Blog-System generiert vollständige, statische Blog-Artikel mit E-E-A-T-Struktur, Schema.org JSON-LD, FAQ-Snippets und AI-Sichtbarkeit (llms.txt, llms-full.txt). Conversion-Elemente (Telefon-CTAs) sind fest eingebaut.

## Dateistruktur

```
clients/<client>/
  blog/
    index.html          ← Blog-Übersicht (alle Artikel als Grid)
    <slug>.html         ← Einzelner Artikel
```

## CLI-Befehle

### Blog-Artikel erstellen

```bash
studio blog add <client> --keyword "Zahnimplantate Kosten" --title "Zahnimplantate: Was kostet das wirklich?" --author "Dr. Benedix"
```

Pflichtflag: `--keyword`

Optionale Flags:
```
--title   "Vollständiger Artikel-Titel"       (default: keyword)
--author  "Name des Autors"                    (default: businessName)
--intro   "Einleitungstext"                    (default: auto-generiert)
--image   "assets/images/blog/artikel.jpg"     (default: assets/images/blog-default.jpg)
--date    "2026-05-05"                          (default: heute)
```

Ausgabe:
```
✓ Blog-Artikel erstellt: blog/zahnimplantate-kosten.html
✓ Blog-Index aktualisiert: blog/index.html
✓ sitemap.xml erweitert
✓ llms.txt erweitert
✓ llms-full.txt erweitert
! URL: /blog/zahnimplantate-kosten.html
```

### Blog-Artikel per Browser (Editor)

1. Toolbar `+ Neue Seite` klicken
2. Typ: `Blog-Artikel` wählen
3. Keyword eingeben (z.B. "Zahnimplantate Kosten")
4. Optional: Vollständigen Titel eingeben
5. `Seite erstellen` – direkt Link zur neuen Seite

## Template-Struktur

### blog-post.html (E-E-A-T-Struktur)

1. **Hero-Bereich** – H1 + Datum, Autor, Lesedauer (automatisch berechnet)
2. **Einleitung** – `{{blogIntro}}`, Problem des Lesers
3. **Hauptinhalt** – `{{blogBody}}`, H2/H3-Struktur
4. **Inline-CTA** – Nach dem Hauptinhalt, Telefon prominent
5. **FAQ-Block** – 3 Fragen automatisch aus Keyword + Config
6. **Related Posts** – Links zu anderen Artikeln
7. **Sticky Sidebar** – Desktop-only, Kontakt-Box

### blog-index.html

- Responsive Grid mit Blog-Cards (Bild, Titel, Datum, Teaser)
- `ItemList`-Schema.org für die Übersicht
- Breadcrumb-Schema.org
- CTA-Band mit Telefonnummer

## SEO automatisch eingebaut

Jeder neue Blog-Artikel erhält automatisch:

- `Article`-Schema.org mit: `headline`, `datePublished`, `dateModified`, `author`, `publisher`, `image`
- `BreadcrumbList`-Schema.org (Home → Blog → Artikel)
- `FAQPage`-Schema.org mit 3 Fragen
- `<meta name="description">` aus erstem Satz des Intros
- `<link rel="canonical">` korrekt gesetzt
- `<meta property="og:*">` Open Graph Tags
- `<meta property="article:published_time">` für News-Indexierung

## AI-Sichtbarkeit (llms.txt / llms-full.txt)

### llms.txt Eintrag (kurz)

```
## Blog & Ratgeber: [Titel]
- [Teaser-Satz]
  URL: [siteUrl]/blog/[slug].html
  Datum: [Datum]
  Keyword: [keyword]
  Autor: [Autor]
```

### llms-full.txt Eintrag (vollständig)

```
Blog-Artikel: [Titel]
Veröffentlicht: [Datum] | Autor: [Autor]
Keyword: [keyword]

[Einleitung]
[Vollständiger Body-Text (HTML-Tags entfernt)]

FAQ:
Q: Was ist [keyword]?
A: ...
Q: Was kostet [keyword] in [city]?
A: ...
```

**Ziel:** ChatGPT, Perplexity, Claude und andere AI-Systeme können Blog-Inhalte bei Wissensfragen zitieren – erhöht die AI-Sichtbarkeit des Kunden erheblich.

## sitemap.xml

Jeder Artikel + der Blog-Index werden automatisch eingetragen:

```xml
<url>
  <loc>[siteUrl]/blog/</loc>
  <lastmod>[today]</lastmod>
  <changefreq>weekly</changefreq>
  <priority>0.8</priority>
</url>
<url>
  <loc>[siteUrl]/blog/[slug].html</loc>
  <lastmod>[dateIso]</lastmod>
  <changefreq>monthly</changefreq>
  <priority>0.7</priority>
</url>
```

## Programmatische Verwendung

```js
const addBlogPost = require('./generator/blog');

addBlogPost('zahnarztpraxis-mittweida', {
  title: 'Zahnimplantate in Mittweida – was kostet das?',
  keyword: 'Zahnimplantate Kosten',
  author: 'Dr. Benedix',
  intro: 'Zahnimplantate sind eine dauerhafte Lösung...',
  body: '<h2>Was sind Zahnimplantate?</h2><p>...</p>',
  image: 'assets/images/blog/implantate.jpg',
  date: '5. Mai 2026',
  dateIso: '2026-05-05',
});
```

Rückgabe:
```js
{
  slug: 'zahnimplantate-kosten',
  filename: 'blog/zahnimplantate-kosten.html',
  clientDir: '/path/to/client',
  url: '/blog/zahnimplantate-kosten.html',
  blogIndexUrl: '/blog/',
}
```

## API-Endpunkt (Browser/Editor)

```
POST /api/create-page
Authorization: studio_session (Cookie)
Rate-Limit: 10 Seiten/Stunde

Body:
{
  "type": "blog",
  "keyword": "Zahnimplantate Kosten",
  "title": "Zahnimplantate: Was kostet das wirklich?"
}

Response (Erfolg):
{
  "ok": true,
  "url": "/blog/zahnimplantate-kosten.html",
  "blogIndexUrl": "/blog/"
}
```

## Conversion-Elemente (fest eingebaut)

- **Sticky Sidebar** (Desktop): Kontaktbox mit Telefonnummer
- **Inline-CTA** nach Hauptinhalt: Blauer Banner mit Tel-Link
- **Sidebar-CTA** mit `<a href="tel:{{phone}}">` – immer sichtbar
- **Related Posts** → interne Verlinkung stärkt SEO und Verweildauer
- **FAQ-Block** → FAQ-Schema.org verbessert AI-Snippets in Google und ChatGPT

## Qualität (Definition of Done)

- [x] Article-Schema.org JSON-LD vollständig
- [x] BreadcrumbList-Schema.org
- [x] FAQPage-Schema.org mit 3 Fragen
- [x] sitemap.xml automatisch erweitert
- [x] llms.txt + llms-full.txt automatisch erweitert
- [x] Alle Texte per `data-editable` bearbeitbar
- [x] Mindestens 2 Telefon-CTAs pro Artikel
- [x] Lesedauer automatisch berechnet
- [x] Blog-Index neu gebaut bei jedem neuen Artikel
- [x] Related Posts zeigen andere Artikel
