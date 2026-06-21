const fs = require('fs');
const path = require('path');

function slugify(str) {
  return str
    .toLowerCase()
    .replace(/ü/g, 'ue').replace(/ö/g, 'oe').replace(/ä/g, 'ae').replace(/ß/g, 'ss')
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

function estimateReadingTime(text) {
  const words = text.split(/\s+/).length;
  return Math.max(1, Math.round(words / 200));
}

function buildBlogCard(post, siteUrl) {
  const imageTag = post.image
    ? `<img src="${post.image}" alt="${post.title}" loading="lazy">`
    : `<div style="width:100%;height:100%;background:#dbeafe;display:flex;align-items:center;justify-content:center;color:#1e3a8a;font-size:2rem;">📝</div>`;
  return `    <article class="blog-card" data-post-slug="${post.slug}">
      <a href="${siteUrl}/blog/${post.slug}.html" class="blog-card-image">${imageTag}</a>
      <div class="blog-card-body">
        <div class="blog-card-meta">
          <time datetime="${post.dateIso}">${post.date}</time>
          <span>· ${post.author}</span>
        </div>
        <h2 class="blog-card-title"><a href="${siteUrl}/blog/${post.slug}.html">${post.title}</a></h2>
        <p class="blog-card-teaser">${post.teaser}</p>
        <a href="${siteUrl}/blog/${post.slug}.html" class="blog-card-cta">Weiterlesen →</a>
      </div>
    </article>`;
}

function buildRelatedPostsHtml(posts, currentSlug, siteUrl) {
  const others = posts.filter(p => p.slug !== currentSlug).slice(0, 3);
  if (others.length === 0) return '<li><a href="/blog/">Zurück zur Übersicht</a></li>';
  return others.map(p => `<li><a href="${siteUrl}/blog/${p.slug}.html">${p.title}</a></li>`).join('\n            ');
}

function rebuildBlogIndex(clientDir, config, posts) {
  const templatesDir = path.join(__dirname, '../templates');
  const template = fs.readFileSync(path.join(templatesDir, 'blog-index.html'), 'utf8');
  const year = new Date().getFullYear();

  const cardsHtml = posts.length === 0
    ? '<div class="blog-empty"><p>Noch keine Artikel vorhanden.</p></div>'
    : posts.map(p => buildBlogCard(p, config.siteUrl)).join('\n');

  const itemListSchema = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: `Ratgeber von ${config.businessName}`,
    url: `${config.siteUrl}/blog/`,
    numberOfItems: posts.length,
    itemListElement: posts.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      url: `${config.siteUrl}/blog/${p.slug}.html`,
      name: p.title,
    })),
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: config.businessName, item: config.siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Ratgeber', item: `${config.siteUrl}/blog/` },
    ],
  };

  const tokens = {
    businessName: config.businessName,
    city: config.city,
    industry: config.industry,
    phone: config.phone,
    siteUrl: config.siteUrl,
    year: String(year),
    blogCardsHtml: cardsHtml,
    itemListSchemaJsonLd: JSON.stringify(itemListSchema, null, 2),
    breadcrumbSchemaJsonLd: JSON.stringify(breadcrumbSchema, null, 2),
  };

  const html = renderTemplate(template, tokens);
  const blogDir = path.join(clientDir, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });
  fs.writeFileSync(path.join(blogDir, 'index.html'), html, 'utf8');
}

module.exports = function addBlogPost(clientname, options = {}) {
  const clientDir = path.join(__dirname, '../clients', clientname);
  const templatesDir = path.join(__dirname, '../templates');
  const config = JSON.parse(fs.readFileSync(path.join(clientDir, 'config.json'), 'utf8'));
  const contentPath = path.join(clientDir, 'content.json');

  let content = {};
  if (fs.existsSync(contentPath)) {
    content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));
  }

  const {
    title,
    keyword,
    intro = `In diesem Artikel erfahren Sie alles Wichtige zu ${keyword} – von ${config.businessName} in ${config.city}.`,
    body = `<h2>${keyword} – was Sie wissen müssen</h2><p>Als erfahrener ${config.industry} in ${config.city} beantwortet ${config.businessName} Ihre Fragen zu ${keyword}.</p><h2>Warum ${config.businessName}?</h2><p>Seit ${config.foundingYear || 'Jahren'} vertrauen Kunden in ${config.city} und Umgebung auf unsere Expertise. Rufen Sie uns an: <a href="tel:${config.phone}">${config.phone}</a>.</p>`,
    author = config.author || config.businessName,
    date = new Date().toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' }),
    image = 'assets/images/blog-default.jpg',
  } = options;

  if (!title || !keyword) throw new Error('title und keyword sind Pflichtfelder');

  const slug = slugify(title);
  const dateIso = options.dateIso || new Date().toISOString().split('T')[0];
  const year = new Date().getFullYear();
  const teaser = intro.length > 140 ? intro.slice(0, 137) + '...' : intro;
  const readingTime = estimateReadingTime(intro + ' ' + body.replace(/<[^>]+>/g, ''));
  const canonicalUrl = `${config.siteUrl}/blog/${slug}.html`;

  const faqItems = [
    {
      q: `Was ist ${keyword}?`,
      a: `${keyword} ist ein wichtiges Thema für Patienten und Kunden in ${config.city}. ${config.businessName} informiert und berät Sie persönlich – rufen Sie uns an: ${config.phone}`,
    },
    {
      q: `Was kostet ${keyword} in ${config.city}?`,
      a: `Die Kosten für ${keyword} variieren je nach Aufwand und individuellem Bedarf. ${config.businessName} bietet transparente Preise und kostenlose Erstberatung: ${config.phone}`,
    },
    {
      q: `Wie erreiche ich ${config.businessName} für ${keyword}?`,
      a: `Telefon: ${config.phone} | E-Mail: ${config.email} | Adresse: ${config.address}`,
    },
  ];

  const articleSchema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: title,
    description: teaser,
    image: `${config.siteUrl}/${image}`,
    datePublished: dateIso,
    dateModified: dateIso,
    author: {
      '@type': 'Person',
      name: author,
    },
    publisher: {
      '@type': 'Organization',
      name: config.businessName,
      url: config.siteUrl,
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': canonicalUrl },
  };

  const breadcrumbSchema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: config.businessName, item: config.siteUrl },
      { '@type': 'ListItem', position: 2, name: 'Ratgeber', item: `${config.siteUrl}/blog/` },
      { '@type': 'ListItem', position: 3, name: title, item: canonicalUrl },
    ],
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

  const existingPosts = Array.isArray(content.blog_posts) ? content.blog_posts : [];

  const relatedPostsHtml = buildRelatedPostsHtml(existingPosts, slug, config.siteUrl);

  const blogPost = {
    slug,
    title,
    keyword,
    intro,
    teaser,
    author,
    date,
    dateIso,
    image,
    url: `/blog/${slug}.html`,
  };

  const template = fs.readFileSync(path.join(templatesDir, 'blog-post.html'), 'utf8');
  const tokens = {
    blogTitle: title,
    blogSlug: slug,
    blogKeyword: keyword,
    blogIntro: intro,
    blogBody: body,
    blogAuthor: author,
    blogDate: date,
    blogDateIso: dateIso,
    blogImage: image,
    readingTime: String(readingTime),
    canonicalUrl,
    metaDescription: teaser,
    articleSchemaJsonLd: JSON.stringify(articleSchema, null, 2),
    breadcrumbSchemaJsonLd: JSON.stringify(breadcrumbSchema, null, 2),
    faqSchemaJsonLd: JSON.stringify(faqSchema, null, 2),
    blog_faq_1_q: faqItems[0].q,
    blog_faq_1_a: faqItems[0].a,
    blog_faq_2_q: faqItems[1].q,
    blog_faq_2_a: faqItems[1].a,
    blog_faq_3_q: faqItems[2].q,
    blog_faq_3_a: faqItems[2].a,
    blog_inline_cta_text: `Haben Sie Fragen zu ${keyword}? ${config.businessName} berät Sie persönlich und kostenlos.`,
    blog_sidebar_headline: `${config.businessName} kontaktieren`,
    blog_sidebar_text: `Rufen Sie uns an oder schreiben Sie uns – wir helfen Ihnen bei ${keyword}.`,
    relatedPostsHtml,
    businessName: config.businessName,
    phone: config.phone,
    email: config.email,
    address: config.address,
    city: config.city,
    siteUrl: config.siteUrl,
    year: String(year),
  };

  const html = renderTemplate(template, tokens);
  const blogDir = path.join(clientDir, 'blog');
  fs.mkdirSync(blogDir, { recursive: true });
  fs.writeFileSync(path.join(blogDir, `${slug}.html`), html, 'utf8');

  const updatedPosts = [blogPost, ...existingPosts.filter(p => p.slug !== slug)];
  content.blog_posts = updatedPosts;
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), 'utf8');

  rebuildBlogIndex(clientDir, config, updatedPosts);

  const sitemapPath = path.join(clientDir, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const todayIso = new Date().toISOString().split('T')[0];
    const blogIndexEntry =
      `  <url>\n    <loc>${config.siteUrl}/blog/</loc>\n    <lastmod>${todayIso}</lastmod>\n    <changefreq>weekly</changefreq>\n    <priority>0.8</priority>\n  </url>\n`;
    const postEntry =
      `  <url>\n    <loc>${config.siteUrl}/blog/${slug}.html</loc>\n    <lastmod>${dateIso}</lastmod>\n    <changefreq>monthly</changefreq>\n    <priority>0.7</priority>\n  </url>\n`;
    if (!sitemap.includes(`/blog/</loc>`)) {
      sitemap = sitemap.replace('</urlset>', blogIndexEntry + '</urlset>');
    }
    if (!sitemap.includes(`/blog/${slug}.html</loc>`)) {
      sitemap = sitemap.replace('</urlset>', postEntry + '</urlset>');
    }
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  }

  const llmsPath = path.join(clientDir, 'llms.txt');
  if (fs.existsSync(llmsPath)) {
    let llms = fs.readFileSync(llmsPath, 'utf8');
    const blogSection =
      `\n## Blog & Ratgeber: ${title}\n` +
      `- ${teaser}\n` +
      `  URL: ${config.siteUrl}/blog/${slug}.html\n` +
      `  Datum: ${date}\n` +
      `  Keyword: ${keyword}\n` +
      `  Autor: ${author}\n`;
    if (!llms.includes(`/blog/${slug}.html`)) {
      llms += blogSection;
      fs.writeFileSync(llmsPath, llms, 'utf8');
    }
  }

  const llmsFullPath = path.join(clientDir, 'llms-full.txt');
  if (fs.existsSync(llmsFullPath)) {
    let llmsFull = fs.readFileSync(llmsFullPath, 'utf8');
    const bodyPlain = body.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const blogFullSection =
      `\nBlog-Artikel: ${title}\n` +
      `Veröffentlicht: ${date} | Autor: ${author}\n` +
      `Keyword: ${keyword}\n\n` +
      `${intro}\n\n` +
      `${bodyPlain}\n\n` +
      `FAQ:\n` +
      faqItems.map(f => `Q: ${f.q}\nA: ${f.a}`).join('\n\n') +
      '\n';
    if (!llmsFull.includes(`Blog-Artikel: ${title}`)) {
      llmsFull += blogFullSection;
      fs.writeFileSync(llmsFullPath, llmsFull, 'utf8');
    }
  }

  return {
    slug,
    filename: `blog/${slug}.html`,
    clientDir,
    url: `/blog/${slug}.html`,
    blogIndexUrl: '/blog/',
  };
};

module.exports.rebuildBlogIndex = rebuildBlogIndex;
