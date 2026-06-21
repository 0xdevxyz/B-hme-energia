# Page Templates – Dokumentation

## Übersicht

Beim Erstellen neuer Seiten im Editor-Modus wählt der Kunde in einem 2-stufigen Wizard:
1. **Seitentyp** – Service-Seite / Geo-Seite / Blog-Artikel
2. **Template-Layout** – Fokus / Split / Story (nicht für Blog)

Jedes Template erbt exakt: Header, Nav, Footer, CSS/JS-Stack der `index.html`.

## Letzte Änderungen (2026-05-05)
- `add-page.js` loremTokens komplett erweitert: alle fehlenden Tokens für focus/split/story Templates
  - Neu: `page_subtext_2`, `page_hero_note`, `page_hero_image`, `page_trust_N_sub`, `page_service_N_detail`, `step_N_detail`, `benefit_N_text`, `page_body_1–5`, `page_body_quote`, `page_body_h1/h2`, `page_faq_intro`, `page_faq_cta_text`, `page_cta_band_note`, `page_services_tag`, `page_prozess_headline`, `page_prozess_sub`, `page_intro`
- `server.js` ALLOWED_CONTENT_KEYS um alle Page-Template-Felder erweitert

---

## Die 3 Layouts

| Layout | Icon | Name | Struktur | Ideal für |
|---|---|---|---|---|
| `focus` | 🎯 | Fokus | Hero (zentriert) → Trust-Badges → CTA-Band → FAQ | Schnelle Conversion-Seiten |
| `split` | ⚡ | Split | Hero (Text+Bild) → Leistungen → Prozess → FAQ → Kontakt | Standard Service/Geo-Seiten |
| `story` | 📖 | Story | Hero+Stats → Vorteile → Fließtext+Sidebar → CTA-Band → FAQ | Ausführliche Ratgeber-Seiten |

---

## Template-Dateien

```
templates/page-templates/
  focus.html    ← Minimal, conversion-maximiert
  split.html    ← Standard, Hero-Split-Layout
  story.html    ← Ausführlich, Sticky-Sidebar
```

---

## Tokens (alle Templates)

### Gemeinsame Basis-Tokens
| Token | Quelle | Beschreibung |
|---|---|---|
| `{{businessName}}` | config.json | Firmenname |
| `{{logoName}}` | config.json / auto | Kurzname für Logo |
| `{{phone}}` | config.json | Telefonnummer |
| `{{email}}` | config.json | E-Mail-Adresse |
| `{{address}}` | config.json | Straße + Hausnummer |
| `{{city}}` | config.json | Stadt |
| `{{siteUrl}}` | config.json | Basis-URL |
| `{{year}}` | auto | Aktuelles Jahr |
| `{{canonicalUrl}}` | auto | Vollständige URL der Seite |
| `{{metaDescription}}` | auto | SEO-Beschreibung |
| `{{schemaOrgJsonLd}}` | auto | Service/LocalBusiness-Schema |
| `{{faqSchemaJsonLd}}` | auto | FAQPage-Schema |

### Inhalts-Tokens (keyword-spezifisch, alle vorausgefüllt)
| Token | Beschreibung |
|---|---|
| `{{pageKeyword}}` | Das eingegebene Keyword |
| `{{page_headline}}` | H1 der Seite |
| `{{page_eyebrow}}` | Eyebrow-Tag über H1 |
| `{{page_subtext}}` | Einleitungstext |
| `{{page_intro}}` | Längere Einleitung (story) |
| `{{page_cta_text}}` | Sekundärer CTA-Button-Text |
| `{{page_trust_1/2/3}}` | Trust-Badges (focus) |
| `{{page_cta_band_headline}}` | CTA-Band Überschrift |
| `{{page_cta_band_subtext}}` | CTA-Band Text |
| `{{page_faq_1_q/a}}` ... `{{page_faq_4_q/a}}` | FAQ Fragen & Antworten |
| `{{page_services_headline}}` | Leistungen-Überschrift (split) |
| `{{page_service_1/2/3_title/text}}` | Service-Cards (split) |
| `{{page_prozess_headline}}` | Prozess-Überschrift (split) |
| `{{step_1/2/3_title/text}}` | Prozess-Schritte (split/focus) |
| `{{contact_cta_text}}` | Kontakt-Button-Text (split) |
| `{{contact_hours_display}}` | Öffnungszeiten (split) |
| `{{stat_1/2/3_number/label}}` | Statistik-Zahlen (story) |
| `{{benefit_1/2/3/4}}` | Vorteile (story) |
| `{{page_body}}` | Fließtext-Block mit H2/H3 (story) |
| `{{sidebar_headline}}` | Sidebar-Überschrift (story) |
| `{{sidebar_text}}` | Sidebar-Text (story) |
| `{{page_hero_image}}` | Hero-Bild (split) |

---

## Browser-Verwendung (Editor)

1. Toolbar `+ Neue Seite` klicken
2. **Schritt 1:** Seitentyp wählen (Service / Geo / Blog)
3. **Schritt 2:** Template-Layout klicken + Keyword eingeben
4. `Seite erstellen →` → Link zur neuen Seite erscheint
5. Seite öffnen → alle Texte per Klick bearbeitbar

---

## CLI-Verwendung

```bash
# Mit Layout-Auswahl (neu)
studio add-page zahnarztpraxis-mittweida service "Zahnimplantate" --layout focus
studio add-page zahnarztpraxis-mittweida service "Invisalign" --layout split
studio add-page zahnarztpraxis-mittweida local "Freiberg" --layout story

# Ohne Layout (default: split)
studio add-page zahnarztpraxis-mittweida service "Zahnreinigung"
```

---

## API-Parameter

```
POST /api/create-page
{
  "type":    "service" | "local" | "blog",
  "keyword": "Zahnimplantate",
  "title":   "Optionaler Titel (nur Blog)",
  "layout":  "focus" | "split" | "story"   ← NEU, default: "split"
}
```

---

## SEO & Conversion (fest eingebaut in allen Templates)

- `<title>` mit Keyword + Businessname
- `<meta name="description">` auto-generiert
- `<link rel="canonical">` korrekt gesetzt
- Open Graph Tags (`og:title`, `og:description`, `og:image`, `og:url`)
- `Service`- oder `LocalBusiness`-Schema.org JSON-LD
- `FAQPage`-Schema.org mit 4 Fragen (auto-generiert aus Keyword + config)
- Mindestens 2 `<a href="tel:{{phone}}">` CTAs pro Seite
- GSAP ScrollTrigger `.anim-fade-up` auf allen Sektionen
- Google Fonts (Inter) + `/assets/css/base.css` – konsistent mit index.html
- `/* STUDIO_OVERLAY_PLACEHOLDER */` → Editor-Overlay wird injiziert

---

## Sicherheit

- `layout`-Parameter wird gegen Whitelist `['focus','split','story']` geprüft
- Unbekannte Layouts fallen auf `split` zurück
- Keyword-Sanitierung: max. 80 Zeichen, nur erlaubte Zeichen
- Rate-Limit: 10 Seiten/Stunde pro Session
