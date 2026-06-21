# Section Builder – Dokumentation

## Übersicht

Der Section Builder ermöglicht es Kunden, direkt im Browser neue Sektionen zur bestehenden Seite hinzuzufügen – ohne CLI und ohne HTML-Kenntnisse.

## Toolbar-Buttons

Im Bearbeitungsmodus erscheinen zwei neue Buttons in der Toolbar:

```
[✏ Bearbeitungsmodus]  [+ Sektion]  [+ Neue Seite]  [● Status]  [Abmelden]
```

## Verfügbare Sektionstypen

| Typ | Name | Conversion-Fokus | Template-Datei |
|---|---|---|---|
| `testimonials` | Kundenbewertungen | Social Proof, Google-Stars, 3 Zitate | `templates/sections/testimonials.html` |
| `faq-extra` | FAQ-Block | 4 weitere Fragen, FAQ-Schema.org für AI-Snippets | `templates/sections/faq-extra.html` |
| `cta-band` | Conversion-Banner | Headline + Tel-Button, blauer Gradient | `templates/sections/cta-band.html` |
| `blog-teaser` | Blog-Teaser | 3 Artikel-Cards mit internen Links | `templates/sections/blog-teaser.html` |
| `before-after` | Vorher/Nachher | Bildvergleich, Vertrauen + Engagement | `templates/sections/before-after.html` |
| `process-steps` | 3-Schritt-Prozess | Ablauf erklären, Einwände entkräften | `templates/sections/process-steps.html` |

## Verwendung (Browser)

1. Editor öffnen: `https://ihre-domain.de/?edit`
2. Magic-Link per E-Mail anfordern und bestätigen
3. Toolbar erscheint oben
4. Auf `+ Sektion` klicken
5. Sektionstyp aus dem Modal wählen
6. Sektion wird live auf der Seite eingefügt (kein Reload)
7. Texte direkt per Klick bearbeiten und speichern

## API-Endpunkt

```
POST /api/add-section
Authorization: studio_session (Cookie)

Body:
{
  "sectionType": "testimonials",  // Whitelist: s.o.
  "targetPage": "index.html",     // Zieldatei (Dateiname)
  "position": "before-footer"     // "before-footer" | "append"
}

Response:
{
  "ok": true,
  "sectionHtml": "<section>...</section>"
}
```

## Content-Keys je Sektionstyp

### testimonials
- `testimonials_section_tag`, `testimonials_headline`, `testimonials_subline`, `testimonials_cta`
- `testimonial_1_text`, `testimonial_1_name`
- `testimonial_2_text`, `testimonial_2_name`
- `testimonial_3_text`, `testimonial_3_name`

### faq-extra
- `faq_extra_section_tag`, `faq_extra_headline`
- `faq_extra_1_q`, `faq_extra_1_a` ... `faq_extra_4_q`, `faq_extra_4_a`

### cta-band
- `cta_band_headline`, `cta_band_subtext`, `cta_band_phone_label`, `cta_band_secondary_label`

### blog-teaser
- `blog_teaser_section_tag`, `blog_teaser_headline`, `blog_teaser_subline`, `blog_teaser_cta`
- `blog_post_1_title`, `blog_post_1_teaser`, `blog_post_1_date` (× 3)

### before-after
- `before_after_section_tag`, `before_after_headline`, `before_after_subline`
- `before_after_before_text`, `before_after_after_text`, `before_after_cta_text`

### process-steps
- `process_section_tag`, `process_headline`, `process_subline`, `process_cta`
- `process_step_1_title`, `process_step_1_text` (× 3)

## SEO & Conversion (eingebaut)

- Jede Sektion enthält ein `<h2>` mit Keyword-Token (SEO)
- Jede Sektion hat mindestens 1 CTA mit `<a href="tel:{{phone}}">` (Conversion)
- Nach Einfügen sind alle Texte per `data-editable` sofort bearbeitbar
- Keine externen Stylesheets – Inline-CSS für maximale Kompatibilität

## Sicherheit

- Nur authentifizierte Sessions dürfen Sektionen hinzufügen
- `sectionType` wird gegen Whitelist geprüft (kein freier String)
- `targetPage` wird per `path.basename()` sanitized
- Nur `.html`-Dateien aus `CLIENT_DIR` können verändert werden
