const fs = require('fs');
const path = require('path');

function slugify(keyword) {
  return keyword
    .toLowerCase()
    .replace(/ü/g, 'ue')
    .replace(/ö/g, 'oe')
    .replace(/ä/g, 'ae')
    .replace(/ß/g, 'ss')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-');
}

function renderTemplate(template, tokens) {
  let out = template;
  for (const [key, val] of Object.entries(tokens)) {
    if (typeof val === 'string' || typeof val === 'number') {
      out = out.split(`{{${key}}}`).join(String(val));
    }
  }
  return out;
}

const VALID_LAYOUTS = ['focus', 'split', 'story'];

module.exports = function addPage(clientname, pagetype, keyword, layoutStyle = 'split') {
  if (!VALID_LAYOUTS.includes(layoutStyle)) layoutStyle = 'split';

  const clientDir = path.join(__dirname, '../clients', clientname);
  const templatesDir = path.join(__dirname, '../templates');

  const config = JSON.parse(fs.readFileSync(path.join(clientDir, 'config.json'), 'utf8'));
  const services = config.services || [];
  const certifications = config.certifications || [];

  const filename = slugify(keyword) + '.html';
  const todayIso = new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const canonicalUrl = `${config.siteUrl}/${filename}`;

  const useNewLayout = true;
  const templateFile = useNewLayout
    ? `page-templates/${layoutStyle}.html`
    : (pagetype === 'service' ? 'service-landing.html' : 'local-landing.html');

  const templatePath = path.join(templatesDir, templateFile);
  const template = fs.readFileSync(templatePath, 'utf8');

  const metaDescription = pagetype === 'service'
    ? `${keyword} in ${config.city} – ${config.businessName}. Professionell, zuverlässig & erfahren. Jetzt anrufen: ${config.phone}`
    : `${keyword} – ${config.businessName} in ${config.city}. Lokaler ${config.industry} für ${keyword} und Umgebung. Jetzt anrufen: ${config.phone}`;

  const metaKeywords = (config.keywords || []).concat([keyword, `${keyword} ${config.city}`]).join(', ');

  const faqItems = pagetype === 'service'
    ? [
        { q: `Was kostet ${keyword} in ${config.city}?`, a: `Die Kosten für ${keyword} variieren je nach Aufwand. ${config.businessName} berät Sie kostenlos – rufen Sie an: ${config.phone}` },
        { q: `Wie schnell ist ${config.businessName} für ${keyword} verfügbar?`, a: `${config.businessName} ist kurzfristig in ${config.city} verfügbar. Kontakt: ${config.phone}` },
        { q: `Ist ${config.businessName} auf ${keyword} spezialisiert?`, a: `Ja, ${config.businessName} bietet ${keyword} professionell in ${config.city} an. ${certifications[0] || 'Qualifizierter Betrieb'}.` },
        { q: `Wie erreiche ich ${config.businessName}?`, a: `Telefon: ${config.phone} | E-Mail: ${config.email} | Adresse: ${config.address}` },
      ]
    : [
        { q: `Gibt es einen ${config.industry} in ${keyword}?`, a: `Ja, ${config.businessName} ist in ${keyword} tätig. Rufen Sie uns an: ${config.phone}` },
        { q: `Wie schnell kommt ${config.businessName} nach ${keyword}?`, a: `${config.businessName} ist kurzfristig in ${keyword} und Umgebung verfügbar. Kontakt: ${config.phone}` },
        { q: `Welche Leistungen bietet ${config.businessName} in ${keyword} an?`, a: `${config.businessName} bietet in ${keyword}: ${services.join(', ')}.` },
        { q: `Wie erreiche ich ${config.businessName}?`, a: `Telefon: ${config.phone} | E-Mail: ${config.email} | Adresse: ${config.address}` },
      ];

  const schemaOrg = {
    '@context': 'https://schema.org',
    '@type': pagetype === 'service' ? 'Service' : 'LocalBusiness',
    name: pagetype === 'service' ? keyword : config.businessName,
    description: metaDescription,
    url: canonicalUrl,
    provider: {
      '@type': 'LocalBusiness',
      name: config.businessName,
      telephone: config.phone,
      email: config.email,
      address: {
        '@type': 'PostalAddress',
        streetAddress: config.address,
        addressLocality: config.city,
        postalCode: config.zip,
        addressCountry: 'DE',
      },
    },
  };

  const faqSchema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqItems.map(item => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  };

  const experienceYears = config.foundingYear
    ? `${new Date().getFullYear() - Number(config.foundingYear)}+`
    : '10+';

  const logoName = config.logoName || config.businessName.split(' ')[0];

  const loremTokens = {
    pageKeyword: keyword,
    page_eyebrow: pagetype === 'service'
      ? `${config.industry} in ${config.city}`
      : `${config.industry} in Ihrer Nähe`,
    page_headline: pagetype === 'service'
      ? `${keyword} in ${config.city} – ${config.businessName}`
      : `${config.industry} in ${keyword} – ${config.businessName}`,
    page_subtext: `${config.businessName} bietet ${keyword} in ${config.city} seit ${config.foundingYear || 'Jahren'} an. Vereinbaren Sie jetzt einen kostenlosen Beratungstermin.`,
    page_subtext_2: `Mit modernsten Methoden und langjähriger Erfahrung sorgen wir für Ihr optimales Ergebnis. Persönliche Beratung und transparente Kosten sind für uns selbstverständlich.`,
    page_intro: `Suchen Sie nach ${keyword} in ${config.city}? ${config.businessName} ist Ihr zuverlässiger Partner. Wir stehen Ihnen mit Fachwissen, Erfahrung und persönlichem Service zur Seite.`,
    page_hero_note: `Keine Wartezeit – rufen Sie jetzt an und vereinbaren Sie Ihren Termin`,
    page_cta_text: `Mehr erfahren`,
    page_trust_1: certifications[0] || 'Zertifizierter Fachbetrieb',
    page_trust_1_sub: `Qualität & Kompetenz seit ${config.foundingYear || 'Jahren'}`,
    page_trust_2: config.foundingYear ? `Seit ${config.foundingYear}` : 'Langjährige Erfahrung',
    page_trust_2_sub: `${experienceYears} Jahre Erfahrung in ${config.city}`,
    page_trust_3: config.rating ? `${config.rating} ★ Bewertungen` : '5 ★ Kundenbewertungen',
    page_trust_3_sub: `Empfohlen von ${config.reviewCount || 'vielen'} Patienten`,
    page_cta_band_headline: `${keyword} in ${config.city} – jetzt anfragen`,
    page_cta_band_subtext: `${config.businessName} berät Sie kostenlos und unverbindlich. Rufen Sie an oder schreiben Sie uns.`,
    page_cta_band_note: `Kein Risiko – kostenlose Erstberatung, keine versteckten Kosten`,
    page_faq_intro: `Hier finden Sie Antworten auf die häufigsten Fragen zu ${keyword} bei ${config.businessName}.`,
    page_faq_cta_text: `Haben Sie weitere Fragen? Wir helfen Ihnen gerne persönlich weiter.`,
    page_faq_1_q: faqItems[0].q, page_faq_1_a: faqItems[0].a,
    page_faq_2_q: faqItems[1].q, page_faq_2_a: faqItems[1].a,
    page_faq_3_q: faqItems[2].q, page_faq_3_a: faqItems[2].a,
    page_faq_4_q: faqItems[3].q, page_faq_4_a: faqItems[3].a,
    page_services_tag: `Leistungen`,
    page_services_headline: `Unsere Leistungen rund um ${keyword}`,
    page_services_sub: `${config.businessName} bietet Ihnen in ${config.city} folgende Leistungen an.`,
    page_service_1_title: services[0] || keyword,
    page_service_1_text: `Professionelle ${services[0] || keyword} durch ${config.businessName} in ${config.city}. Jetzt anfragen.`,
    page_service_1_detail: `Von der ersten Beratung bis zur Nachsorge begleiten wir Sie Schritt für Schritt – mit Erfahrung und Sorgfalt.`,
    page_service_2_title: services[1] || `${keyword} Beratung`,
    page_service_2_text: `Kompetente Beratung und Durchführung – ${config.businessName} ist Ihr Ansprechpartner.`,
    page_service_2_detail: `Individuelle Lösungen für jeden Patienten – transparent, verständlich und auf Ihre Bedürfnisse abgestimmt.`,
    page_service_3_title: services[2] || `${keyword} Nachsorge`,
    page_service_3_text: `Auch nach dem Eingriff sind wir für Sie da. Professionelle Betreuung durch ${config.businessName}.`,
    page_service_3_detail: `Regelmäßige Kontrollen und persönliche Begleitung sichern Ihr langfristiges Ergebnis.`,
    page_prozess_headline: `So läuft ${keyword} bei ${config.businessName} ab`,
    page_prozess_sub: `Einfach, transparent und professionell – von der ersten Anfrage bis zum Ergebnis.`,
    step_1_title: 'Kontaktaufnahme',
    step_1_text: `Rufen Sie uns an (${config.phone}) oder senden Sie eine Anfrage. Wir melden uns innerhalb von 24 Stunden.`,
    step_1_detail: `Schnelle Antwort garantiert – auch per E-Mail oder Kontaktformular.`,
    step_2_title: 'Beratung & Termin',
    step_2_text: `Wir besprechen Ihre Wünsche persönlich und vereinbaren einen passenden Termin in ${config.city}.`,
    step_2_detail: `Kein Wartezimmer-Stress – flexible Terminzeiten nach Ihren Möglichkeiten.`,
    step_3_title: 'Durchführung & Ergebnis',
    step_3_text: `${config.businessName} führt ${keyword} professionell durch – mit Qualität und Sorgfalt.`,
    step_3_detail: `Nachsorge und Ergebnis-Kontrolle inklusive – wir begleiten Sie bis zum Ende.`,
    contact_cta_text: `Termin vereinbaren`,
    contact_hours_display: config.openingHours || 'Mo–Fr 08:00–18:00 Uhr',
    stat_1_number: experienceYears,
    stat_1_label: 'Jahre Erfahrung',
    stat_2_number: String(config.reviewCount || '50+'),
    stat_2_label: 'Zufriedene Patienten',
    stat_3_number: config.rating ? `${config.rating}★` : '5★',
    stat_3_label: 'Ø Bewertung',
    benefit_1: `Erfahrener ${config.industry} in ${config.city}${config.foundingYear ? ' seit ' + config.foundingYear : ''}`,
    benefit_1_text: `${experienceYears} Jahre Erfahrung bedeuten: fundiertes Wissen, bewährte Methoden und echtes Vertrauen.`,
    benefit_2: certifications[0] || 'Zertifizierter Fachbetrieb',
    benefit_2_text: `Alle Behandlungen und Leistungen entsprechen den aktuellen Qualitätsstandards und Richtlinien.`,
    benefit_3: `${config.rating ? config.rating + ' Sterne' : 'Sehr gute'} Kundenbewertungen`,
    benefit_3_text: `Unsere Patienten empfehlen uns weiter – lesen Sie echte Erfahrungsberichte und Bewertungen.`,
    benefit_4: 'Faire Preise & kostenlose Erstberatung',
    benefit_4_text: `Transparente Kosten ohne versteckte Gebühren. Kostenlose Erstberatung – kein Risiko für Sie.`,
    page_body: `<h2>Was ist ${keyword}?</h2><p>${config.businessName} in ${config.city} bietet ${keyword} auf höchstem Niveau an. Unsere erfahrenen Spezialisten stehen Ihnen für alle Fragen zur Verfügung.</p><h2>Ablauf & Kosten</h2><p>Bei ${config.businessName} erhalten Sie eine kostenlose Erstberatung. Wir erklären Ihnen den genauen Ablauf und erstellen ein transparentes Angebot – ohne versteckte Kosten.</p><h2>Warum ${config.businessName}?</h2><p>Als führender ${config.industry} in ${config.city} verbinden wir modernste Methoden mit persönlicher Betreuung. Rufen Sie uns an: <a href="tel:${config.phone}">${config.phone}</a></p>`,
    page_body_1: `${config.businessName} in ${config.city} bietet ${keyword} auf höchstem Niveau an. Unsere erfahrenen Spezialisten stehen Ihnen für alle Fragen zur Verfügung und begleiten Sie durch den gesamten Prozess – von der ersten Beratung bis zur abschließenden Kontrolle.`,
    page_body_2: `Bei ${config.businessName} legen wir größten Wert auf individuelle Betreuung. Kein Patient ist wie der andere – daher erstellen wir für jeden einen maßgeschneiderten Behandlungsplan, der Ihre persönlichen Wünsche und medizinischen Bedürfnisse berücksichtigt.`,
    page_body_3: `Modernste Methoden und bewährte Techniken ergänzen sich in unserer Praxis zu einem Konzept, das Sicherheit, Effizienz und optimale Ergebnisse vereint. ${keyword} in ${config.city} – ${config.businessName} macht den Unterschied.`,
    page_body_4: `Als führender ${config.industry} in ${config.city} verbinden wir modernste Methoden mit persönlicher Betreuung. Bei ${config.businessName} sind Sie nicht nur Patient – Sie sind Mensch, dessen Wohlbefinden und Gesundheit uns am Herzen liegt.`,
    page_body_5: `Rufen Sie uns an und vereinbaren Sie noch heute Ihr kostenloses Erstgespräch. Wir freuen uns darauf, Sie kennenzulernen und gemeinsam den besten Weg für Sie zu finden. Kontakt: ${config.phone} | ${config.email}`,
    page_body_quote: `"${config.businessName} hat meine Erwartungen übertroffen. Professionell, einfühlsam und mit echtem Engagement – ich kann die Praxis nur wärmstens weiterempfehlen."`,
    page_body_h1: `${keyword} – Was Sie wissen sollten`,
    page_body_h2: `Unser Leistungsversprechen für Sie`,
    sidebar_headline: `${config.businessName} kontaktieren`,
    sidebar_text: `Wir beraten Sie gerne persönlich zu ${keyword} in ${config.city}.`,
    page_hero_image: `/assets/images/hero.jpg`,
    footer_text: `© ${year} ${config.businessName} – Alle Rechte vorbehalten`,
    canonicalUrl,
    logoName,
    postalCode: config.zip,
  };

  const tokens = Object.assign({}, config, loremTokens, {
    metaDescription,
    metaKeywords,
    schemaOrgJsonLd: JSON.stringify(schemaOrg, null, 2),
    faqSchemaJsonLd: JSON.stringify(faqSchema, null, 2),
    year: String(year),
    logoName,
  });

  const html = renderTemplate(template, tokens);
  fs.writeFileSync(path.join(clientDir, filename), html, 'utf8');

  const sitemapPath = path.join(clientDir, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const newEntry =
      `  <url>\n` +
      `    <loc>${canonicalUrl}</loc>\n` +
      `    <lastmod>${todayIso}</lastmod>\n` +
      `    <changefreq>monthly</changefreq>\n` +
      `    <priority>0.8</priority>\n` +
      `  </url>\n`;
    if (!sitemap.includes(canonicalUrl)) {
      sitemap = sitemap.replace('</urlset>', newEntry + '</urlset>');
      fs.writeFileSync(sitemapPath, sitemap, 'utf8');
    }
  }

  const llmsPath = path.join(clientDir, 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    let llms = fs.readFileSync(llmsPath, 'utf8');
    const llmsSection =
      `\n## Seite: ${keyword}\n` +
      `${config.businessName} bietet ${keyword} in ${config.city} an.\n` +
      `${metaDescription}\n` +
      `URL: ${canonicalUrl}\n` +
      `Kontakt: ${config.phone} | ${config.email}\n`;
    if (!llms.includes(`## Seite: ${keyword}`)) {
      llms += llmsSection;
      fs.writeFileSync(llmsPath, llms, 'utf8');
    }
  }

  return { filename, clientDir, url: `/${filename}` };
};
