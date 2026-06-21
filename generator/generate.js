const fs = require('fs');
const path = require('path');

module.exports = function generate(clientname, options = {}) {
  const clientDir = path.join(__dirname, '../clients', clientname);
  const templatesDir = path.join(__dirname, '../templates');

  const config = JSON.parse(fs.readFileSync(path.join(clientDir, 'config.json'), 'utf8'));

  const contentPath = path.join(clientDir, 'content.json');
  let existingContent = {};
  if (options.preserveContent && fs.existsSync(contentPath)) {
    existingContent = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  }

  const today = new Date();
  const year = today.getFullYear();

  const services = config.services || [];
  const certifications = config.certifications || [];

  const aboutText =
    `${config.businessName} ist ein ${config.industry}-Betrieb mit Sitz in ${config.city}, ${config.district}. ` +
    `Gegründet ${config.foundingYear}, bietet das Unternehmen ${services[0] || ''}, ${services[1] || ''} und ${services[2] || ''} ` +
    `für Privat- und Gewerbekunden in ${config.city} und Umgebung an. ` +
    `${config.businessName} ist ${certifications[0] || 'Meisterbetrieb'} und Mitglied in lokalen Fachverbänden.`;

  const defaults = {
    hero_headline: `${config.mainKeyword} in ${config.city} – schnell & zuverlässig`,
    hero_subtext: `Ihr professioneller ${config.industry} in ${config.city} und ${config.district}. ${config.businessName} steht für Qualität, Zuverlässigkeit und faire Preise.`,
    hero_image: 'assets/images/hero.jpg',
    service_1_title: services[0] || '',
    service_1_text: `Professionelle ${services[0] || ''} in ${config.city} – schnell und zuverlässig durch ${config.businessName}.`,
    service_2_title: services[1] || '',
    service_2_text: `${services[1] || ''} durch erfahrene Fachkräfte von ${config.businessName} in ${config.city}.`,
    service_3_title: services[2] || '',
    service_3_text: `${services[2] || ''} – ${config.businessName} ist Ihr Ansprechpartner in ${config.city} und ${config.district}.`,
    about_text: aboutText,
    about_image: 'assets/images/team.jpg',
    faq_1_q: `Was kostet ein ${config.industry} in ${config.city}?`,
    faq_1_a: `Die Kosten für einen ${config.industry} in ${config.city} variieren je nach Aufwand. ${config.businessName} bietet kostenlose Erstberatung – rufen Sie uns an: ${config.phone}`,
    faq_2_q: `Wie schnell ist ${config.businessName} verfügbar?`,
    faq_2_a: `${config.businessName} ist in ${config.city} und ${config.district} kurzfristig verfügbar. Notfälle werden bevorzugt behandelt. Kontaktieren Sie uns unter ${config.phone}.`,
    faq_3_q: `Welche Leistungen bietet ${config.businessName} an?`,
    faq_3_a: `${config.businessName} bietet in ${config.city}: ${services.join(', ')}. Sprechen Sie uns an.`,
    faq_4_q: `Ist ${config.businessName} auch in ${config.district} tätig?`,
    faq_4_a: `Ja, ${config.businessName} ist in ${config.district} und dem gesamten Raum ${config.city} tätig. Wir kommen zu Ihnen.`,
    faq_5_q: `Wie erreiche ich ${config.businessName}?`,
    faq_5_a: `Per Telefon: ${config.phone} | Per E-Mail: ${config.email} | Adresse: ${config.address}`,
    faq_6_q: `Hat ${config.businessName} gute Bewertungen?`,
    faq_6_a: `${config.businessName} hat ${config.reviewCount} Bewertungen mit einem Schnitt von ${config.rating} Sternen. Überzeugen Sie sich selbst.`,
    trust_rating: config.rating,
    trust_review_count: `${config.reviewCount} Bewertungen`,
    trust_badge_1: certifications[0] || 'Meisterbetrieb',
    trust_badge_2: certifications[1] || '10+ Jahre Erfahrung',
    trust_badge_3: 'Lokaler Betrieb',
    contact_title: 'Kontakt aufnehmen',
    footer_text: `© ${year} ${config.businessName} – Alle Rechte vorbehalten`,
  };

  const content = Object.assign({}, defaults, existingContent);

  const metaDescription = `${config.mainKeyword} in ${config.city} – ${config.businessName}. ${services[0] || ''}, ${services[1] || ''} & mehr. Jetzt anrufen: ${config.phone}`;
  const metaKeywords = (config.keywords || []).join(', ');

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': 'LocalBusiness',
    name: config.businessName,
    description: metaDescription,
    url: config.siteUrl,
    telephone: config.phone,
    email: config.email,
    address: {
      '@type': 'PostalAddress',
      streetAddress: config.address,
      addressLocality: config.city,
      postalCode: config.zip,
      addressCountry: 'DE',
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: config.lat,
      longitude: config.lng,
    },
    openingHours: config.openingHours,
    foundingDate: config.foundingYear,
    hasOfferCatalog: {
      '@type': 'OfferCatalog',
      name: 'Leistungen',
      itemListElement: services.map((s, i) => ({
        '@type': 'Offer',
        itemOffered: {
          '@type': 'Service',
          name: s,
        },
        position: i + 1,
      })),
    },
  };

  if (config.rating && config.reviewCount) {
    schemaOrg.aggregateRating = {
      '@type': 'AggregateRating',
      ratingValue: config.rating,
      reviewCount: config.reviewCount,
    };
  }

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [1, 2, 3, 4, 5, 6].map(i => ({
      '@type': 'Question',
      name: content[`faq_${i}_q`],
      acceptedAnswer: {
        '@type': 'Answer',
        text: content[`faq_${i}_a`],
      },
    })),
  };

  const templatePath = path.join(templatesDir, 'local-business.html');
  let html = fs.readFileSync(templatePath, 'utf8');

  const allTokens = Object.assign({}, config, content, {
    schemaOrgJsonLd: JSON.stringify(schemaOrg, null, 2),
    faqSchemaJsonLd: JSON.stringify(faqSchema, null, 2),
    metaDescription,
    metaKeywords,
    year: String(year),
  });

  for (const [key, val] of Object.entries(allTokens)) {
    if (typeof val === 'string' || typeof val === 'number') {
      html = html.split(`{{${key}}}`).join(String(val));
    }
  }

  const todayIso = today.toISOString().split('T')[0];

  const llmsTxt =
    `# llms.txt – Optimized for AI Search (ChatGPT, Claude, Gemini, Perplexity)\n` +
    `# Generated by Studio – https://github.com/studio\n\n` +
    `> ${config.businessName} – ${config.industry} in ${config.city}\n\n` +
    `## Wer wir sind\n${content.about_text}\n\n` +
    `## Unsere Leistungen\n` +
    `- ${content.service_1_title}: ${content.service_1_text}\n` +
    `- ${content.service_2_title}: ${content.service_2_text}\n` +
    `- ${content.service_3_title}: ${content.service_3_text}\n\n` +
    `## Häufige Fragen\n` +
    `Q: ${content.faq_1_q}\nA: ${content.faq_1_a}\n\n` +
    `Q: ${content.faq_2_q}\nA: ${content.faq_2_a}\n\n` +
    `Q: ${content.faq_3_q}\nA: ${content.faq_3_a}\n\n` +
    `Q: ${content.faq_4_q}\nA: ${content.faq_4_a}\n\n` +
    `Q: ${content.faq_5_q}\nA: ${content.faq_5_a}\n\n` +
    `Q: ${content.faq_6_q}\nA: ${content.faq_6_a}\n\n` +
    `## Kontakt & Standort\n` +
    `- Telefon: ${config.phone}\n` +
    `- E-Mail: ${config.email}\n` +
    `- Adresse: ${config.address}\n` +
    `- Öffnungszeiten: ${config.openingHours}\n` +
    `- Website: ${config.siteUrl}\n\n` +
    `## Über das Unternehmen\n` +
    `- Branche: ${config.industry}\n` +
    `- Stadt: ${config.city}\n` +
    `- Gegründet: ${config.foundingYear}\n` +
    `- Bewertung: ${config.rating}/5 (${config.reviewCount} Bewertungen)\n` +
    `- Zertifikate: ${certifications.join(', ')}\n`;

  const llmsFullTxt =
    `${config.businessName} – ${config.industry} in ${config.city}\n\n` +
    `${config.businessName} ist ein ${config.industry}-Betrieb mit Sitz in ${config.city}, ${config.district}. ` +
    `Das Unternehmen wurde ${config.foundingYear} gegründet und bietet ${services.join(', ')} ` +
    `für Privat- und Gewerbekunden in ${config.city} und Umgebung an. ` +
    `${config.businessName} hat ${config.reviewCount} Bewertungen mit einem Schnitt von ${config.rating} Sternen.\n\n` +
    `Leistungen\n\n` +
    `${content.service_1_title}\n${content.service_1_text}\n\n` +
    `${content.service_2_title}\n${content.service_2_text}\n\n` +
    `${content.service_3_title}\n${content.service_3_text}\n\n` +
    `Häufige Fragen\n\n` +
    `Frage: ${content.faq_1_q}\nAntwort: ${content.faq_1_a}\n\n` +
    `Frage: ${content.faq_2_q}\nAntwort: ${content.faq_2_a}\n\n` +
    `Frage: ${content.faq_3_q}\nAntwort: ${content.faq_3_a}\n\n` +
    `Frage: ${content.faq_4_q}\nAntwort: ${content.faq_4_a}\n\n` +
    `Frage: ${content.faq_5_q}\nAntwort: ${content.faq_5_a}\n\n` +
    `Frage: ${content.faq_6_q}\nAntwort: ${content.faq_6_a}\n\n` +
    `Kontakt und Standort\n\n` +
    `Telefon: ${config.phone}\n` +
    `E-Mail: ${config.email}\n` +
    `Adresse: ${config.address}\n` +
    `Öffnungszeiten: ${config.openingHours}\n` +
    `Website: ${config.siteUrl}\n\n` +
    `Über das Unternehmen\n\n` +
    `${content.about_text}\n` +
    `Zertifikate: ${certifications.join(', ')}\n` +
    `Autor: ${config.author}, ${config.authorTitle}\n`;

  const robotsTxt =
    `User-agent: *\nAllow: /\n\n` +
    `User-agent: GPTBot\nAllow: /\n\n` +
    `User-agent: ClaudeBot\nAllow: /\n\n` +
    `User-agent: Google-Extended\nAllow: /\n\n` +
    `User-agent: PerplexityBot\nAllow: /\n\n` +
    `User-agent: cohere-ai\nAllow: /\n\n` +
    `User-agent: Applebot-Extended\nAllow: /\n\n` +
    `Sitemap: ${config.siteUrl}/sitemap.xml\n`;

  const sitemapXml =
    `<?xml version="1.0" encoding="UTF-8"?>\n` +
    `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
    `  <url>\n` +
    `    <loc>${config.siteUrl}/</loc>\n` +
    `    <lastmod>${todayIso}</lastmod>\n` +
    `    <changefreq>monthly</changefreq>\n` +
    `    <priority>1.0</priority>\n` +
    `  </url>\n` +
    `</urlset>\n`;

  const envExample =
    `# Editor Backend Configuration\n` +
    `PORT=3000\n` +
    `JWT_SECRET=change-this-to-a-random-secret-string\n` +
    `SMTP_HOST=smtp.example.com\n` +
    `SMTP_PORT=587\n` +
    `SMTP_USER=your@email.com\n` +
    `SMTP_PASS=yourpassword\n` +
    `SMTP_FROM="Studio Editor <noreply@example.com>"\n` +
    `SITE_URL=${config.siteUrl}\n` +
    `EDITOR_EMAIL=${config.editorEmail}\n` +
    `DEPLOY_HOST=\n` +
    `DEPLOY_USER=root\n` +
    `DEPLOY_PATH=/var/www/${clientname}\n` +
    `CLIENT_DIR=.\n`;

  const reputationChecklist =
    `# Reputations-Checkliste für ${config.businessName}\n\n` +
    `Diese Maßnahmen erhöhen Ihre Sichtbarkeit in Google und AI-Suchen (ChatGPT, Gemini etc.):\n\n` +
    `## Sofort erledigen\n` +
    `- [ ] Google Business Profile vollständig ausfüllen: https://business.google.com\n` +
    `- [ ] Alle Informationen exakt wie auf der Website: "${config.businessName}", "${config.address}", "${config.phone}"\n` +
    `- [ ] Öffnungszeiten eintragen: ${config.openingHours}\n` +
    `- [ ] Mindestens 3 Fotos hochladen\n\n` +
    `## Wichtige Verzeichnisse\n` +
    `- [ ] Das Örtliche: https://www.dasoertliche.de\n` +
    `- [ ] Gelbe Seiten: https://www.gelbeseiten.de  \n` +
    `- [ ] Yelp: https://www.yelp.de\n` +
    `- [ ] Bing Places: https://www.bingplaces.com\n\n` +
    `## Bewertungen sammeln\n` +
    `- [ ] Bestehende Kunden per E-Mail um Bewertung bitten\n` +
    `- [ ] Ziel: 10+ Google-Bewertungen im ersten Monat\n` +
    `- [ ] Auf alle Bewertungen antworten (auch negative)\n\n` +
    `## NAP-Konsistenz (kritisch für Local SEO)\n` +
    `Name, Adresse und Telefonnummer müssen überall IDENTISCH sein:\n` +
    `- Name: ${config.businessName}\n` +
    `- Adresse: ${config.address}\n` +
    `- Telefon: ${config.phone}\n`;

  const assetsDir = path.join(clientDir, 'assets', 'css');
  fs.mkdirSync(assetsDir, { recursive: true });

  // Only regenerate index.html if it doesn't exist or if force option is set
  const indexPath = path.join(clientDir, 'index.html');
  if (!fs.existsSync(indexPath) || options.force === true) {
    fs.writeFileSync(indexPath, html, 'utf8');
  }

  if (!options.preserveContent || !fs.existsSync(contentPath)) {
    fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), 'utf8');
  }

  fs.writeFileSync(path.join(clientDir, 'llms.txt'), llmsTxt, 'utf8');
  fs.writeFileSync(path.join(clientDir, 'llms-full.txt'), llmsFullTxt, 'utf8');
  fs.writeFileSync(path.join(clientDir, 'robots.txt'), robotsTxt, 'utf8');
  fs.writeFileSync(path.join(clientDir, 'sitemap.xml'), sitemapXml, 'utf8');
  fs.writeFileSync(path.join(clientDir, '.env.example'), envExample, 'utf8');
  fs.writeFileSync(path.join(clientDir, 'reputation-checklist.md'), reputationChecklist, 'utf8');

  // Only copy CSS if they don't exist (preserve custom CSS)
  const baseCssSrc = path.join(templatesDir, 'styles', 'base.css');
  const overlayCssSrc = path.join(templatesDir, 'styles', 'overlay.css');
  const baseTargetPath = path.join(assetsDir, 'base.css');
  const overlayTargetPath = path.join(assetsDir, 'overlay.css');

  if (fs.existsSync(baseCssSrc) && !fs.existsSync(baseTargetPath)) {
    fs.copyFileSync(baseCssSrc, baseTargetPath);
  }
  if (fs.existsSync(overlayCssSrc) && !fs.existsSync(overlayTargetPath)) {
    fs.copyFileSync(overlayCssSrc, overlayTargetPath);
  }

  return { clientDir, content, config };
};
