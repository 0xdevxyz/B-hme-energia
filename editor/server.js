require('dotenv').config({ path: require('path').join(process.env.CLIENT_DIR || '.', '.env') });

const express = require('express');
const rateLimit = require('express-rate-limit');
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const jwt = require('jsonwebtoken');
const cookieParser = require('cookie-parser');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const CLIENT_DIR = path.resolve(process.env.CLIENT_DIR || '.');
const PORT = process.env.PORT || 3000;
const IS_PROD = process.env.NODE_ENV === 'production';

if (!process.env.JWT_SECRET) {
  console.error('[studio] FEHLER: JWT_SECRET ist nicht in .env gesetzt. Server wird nicht gestartet.');
  process.exit(1);
}
const JWT_SECRET = process.env.JWT_SECRET;

const configPath = path.join(CLIENT_DIR, 'config.json');
const contentPath = path.join(CLIENT_DIR, 'content.json');

const config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
let content = JSON.parse(fs.readFileSync(contentPath, 'utf8'));

const addPage = require('../generator/add-page');
const addBlogPost = require('../generator/blog');

const { editorEmail, siteUrl: configSiteUrl, businessName } = config;
const resolvedSiteUrl = process.env.SITE_URL || configSiteUrl || `http://localhost:${PORT}`;

const tokens = new Map();

const sessionsPath = path.join(CLIENT_DIR, 'sessions.json');

function loadSessions() {
  try {
    return JSON.parse(fs.readFileSync(sessionsPath, 'utf8'));
  } catch {
    return {};
  }
}

function saveSessions(data) {
  fs.writeFileSync(sessionsPath, JSON.stringify(data, null, 2), 'utf8');
}

function revokeSession(email) {
  const sessions = loadSessions();
  sessions[email] = Math.floor(Date.now() / 1000);
  saveSessions(sessions);
}

function isSessionRevoked(decoded) {
  const sessions = loadSessions();
  const revokedAt = sessions[decoded.email];
  if (!revokedAt) return false;
  return decoded.iat <= revokedAt;
}

setInterval(() => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expires < now) tokens.delete(key);
  }
}, 15 * 60 * 1000);

const app = express();
app.set('trust proxy', 1);

app.use(cookieParser());
app.use(express.json({ limit: '64kb' }));
app.use(express.urlencoded({ extended: true, limit: '64kb' }));

app.use((req, res, next) => {
  res.setHeader('X-Frame-Options', 'SAMEORIGIN');
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');
  res.setHeader(
    'Content-Security-Policy',
    "default-src 'self'; script-src 'self' 'unsafe-inline' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://www.google.com; frame-src https://www.google.com; frame-ancestors 'self';"
  );
  if (IS_PROD) {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }
  next();
});

const BLOCKED_FILES = new Set([
  'config.json', 'content.json', '.env', '.env.example',
  'reputation-checklist.md', 'llms-full.txt', 'sessions.json',
]);

app.use((req, res, next) => {
  const base = path.basename(req.path).toLowerCase();
  if (BLOCKED_FILES.has(base)) {
    return res.status(404).send('Not found');
  }
  next();
});

const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
});

const globalLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 120,
  standardHeaders: true,
  legacyHeaders: false,
});

app.use(globalLimiter);

const pageCreateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Limit erreicht: max. 10 neue Seiten pro Stunde' },
});

const ALLOWED_SECTION_TYPES = new Set([
  'testimonials', 'faq-extra', 'cta-band', 'blog-teaser', 'before-after', 'process-steps',
]);

const ALLOWED_PAGE_TYPES = new Set(['service', 'local', 'blog']);

function renderSectionTemplate(templateHtml, config, content) {
  const services = config.services || [];
  const defaults = {
    testimonials_section_tag: 'Kundenstimmen',
    testimonials_headline: `Was Kunden über ${config.businessName} sagen`,
    testimonials_subline: `Echte Bewertungen von zufriedenen Kunden in ${config.city}.`,
    testimonials_cta: `Jetzt anrufen: ${config.phone}`,
    testimonial_1_text: `Sehr professionell und zuverlässig. Ich kann ${config.businessName} uneingeschränkt empfehlen.`,
    testimonial_1_name: 'Zufriedener Kunde',
    testimonial_2_text: `Schnelle Reaktionszeit und faire Preise. Genau das, was man sich wünscht.`,
    testimonial_2_name: 'Stammkunde',
    testimonial_3_text: `Hervorragende Arbeit! Das Team von ${config.businessName} ist wirklich kompetent.`,
    testimonial_3_name: `Patient aus ${config.city}`,
    faq_extra_section_tag: 'Häufige Fragen',
    faq_extra_headline: `Weitere Fragen zu ${config.businessName}`,
    faq_extra_1_q: `Wie lange dauert eine Behandlung bei ${config.businessName}?`,
    faq_extra_1_a: `Die Dauer variiert je nach Behandlung. Wir beraten Sie gerne persönlich: ${config.phone}`,
    faq_extra_2_q: `Ist ${config.businessName} auch am Wochenende erreichbar?`,
    faq_extra_2_a: `Bitte entnehmen Sie unsere aktuellen Öffnungszeiten der Website oder rufen Sie uns an: ${config.phone}`,
    faq_extra_3_q: `Welche Zahlungsmethoden akzeptiert ${config.businessName}?`,
    faq_extra_3_a: `Wir akzeptieren alle gängigen Zahlungsmethoden. Für Details wenden Sie sich bitte direkt an uns.`,
    faq_extra_4_q: `Brauche ich einen Termin bei ${config.businessName}?`,
    faq_extra_4_a: `Termine können Sie telefonisch unter ${config.phone} oder per E-Mail vereinbaren.`,
    cta_band_headline: `Bereit? Kontaktieren Sie ${config.businessName} jetzt`,
    cta_band_subtext: `Wir sind Ihr zuverlässiger ${config.industry} in ${config.city}. Rufen Sie uns an oder schreiben Sie uns.`,
    cta_band_phone_label: `Anrufen: ${config.phone}`,
    cta_band_secondary_label: 'Kontaktformular',
    blog_teaser_section_tag: 'Ratgeber',
    blog_teaser_headline: `Tipps & Wissen von ${config.businessName}`,
    blog_teaser_subline: `Aktuelle Ratgeber-Artikel rund um ${config.industry} in ${config.city}.`,
    blog_teaser_cta: 'Alle Artikel ansehen',
    blog_post_1_title: 'Ratgeber-Artikel demnächst verfügbar',
    blog_post_1_teaser: `${config.businessName} veröffentlicht regelmäßig Tipps und Wissenswertes.`,
    blog_post_1_date: new Date().toLocaleDateString('de-DE'),
    blog_post_1_url: '/blog/',
    blog_post_1_image: 'assets/images/blog-default.jpg',
    blog_post_2_title: 'Weitere Artikel folgen',
    blog_post_2_teaser: 'Besuchen Sie regelmäßig unsere Ratgeber-Seite.',
    blog_post_2_date: new Date().toLocaleDateString('de-DE'),
    blog_post_2_url: '/blog/',
    blog_post_2_image: 'assets/images/blog-default.jpg',
    blog_post_3_title: 'Fachbeiträge in Kürze',
    blog_post_3_teaser: `Expertenwissen von ${config.businessName} zu ${config.industry}.`,
    blog_post_3_date: new Date().toLocaleDateString('de-DE'),
    blog_post_3_url: '/blog/',
    blog_post_3_image: 'assets/images/blog-default.jpg',
    before_after_section_tag: 'Vorher / Nachher',
    before_after_headline: `Ergebnisse von ${config.businessName}`,
    before_after_subline: `Sehen Sie selbst, welche Veränderungen wir für unsere Kunden erzielen.`,
    before_after_before_text: 'Ausgangssituation vor der Behandlung.',
    before_after_after_text: 'Ergebnis nach der professionellen Behandlung.',
    before_after_cta_text: `Möchten Sie ähnliche Ergebnisse? ${config.businessName} berät Sie gerne.`,
    before_image: 'assets/images/before.jpg',
    after_image: 'assets/images/after.jpg',
    process_section_tag: 'So einfach geht\'s',
    process_headline: `In 3 Schritten zu ${config.businessName}`,
    process_subline: `Unkompliziert, transparent und zuverlässig – so arbeiten wir.`,
    process_step_1_title: 'Kontakt aufnehmen',
    process_step_1_text: `Rufen Sie uns an (${config.phone}) oder senden Sie eine Anfrage.`,
    process_step_2_title: 'Beratung & Termin',
    process_step_2_text: 'Wir besprechen Ihre Wünsche und vereinbaren einen passenden Termin.',
    process_step_3_title: 'Behandlung & Ergebnis',
    process_step_3_text: `${config.businessName} sorgt für professionelle Durchführung und Ihr Wohlbefinden.`,
    process_cta: `Jetzt Termin vereinbaren: ${config.phone}`,
    phone: config.phone,
  };

  const allTokens = Object.assign({}, defaults, content);
  let html = templateHtml;
  for (const [key, val] of Object.entries(allTokens)) {
    if (typeof val === 'string' || typeof val === 'number') {
      html = html.split(`{{${key}}}`).join(String(val));
    }
  }
  return html;
}

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function isAuthenticated(req, res, next) {
  const token = req.cookies['studio_session'];
  if (!token) return res.status(401).json({ error: 'Nicht eingeloggt' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (isSessionRevoked(decoded)) return res.status(401).json({ error: 'Session ungültig' });
    req.user = decoded;
    next();
  } catch {
    return res.status(401).json({ error: 'Session abgelaufen' });
  }
}

function checkOrigin(req, res, next) {
  const origin = req.headers.origin || '';
  const referer = req.headers.referer || '';
  const source = origin || referer;

  if (!source) {
    const host = req.headers.host || '';
    const resolvedHost = new URL(resolvedSiteUrl).host;
    if (host === resolvedHost || host.startsWith('localhost')) {
      return next();
    }
    return res.status(403).json({ error: 'Ungültige Anfragequelle' });
  }

  const allowedOrigins = [resolvedSiteUrl, 'http://localhost', 'https://localhost'];
  if (!allowedOrigins.some(o => source.startsWith(o))) {
    return res.status(403).json({ error: 'Ungültige Anfragequelle' });
  }
  next();
}

const ALLOWED_IMAGE_KEYS = new Set(['hero_image', 'about_image']);

const uploadStorage = multer.diskStorage({
  destination: path.join(CLIENT_DIR, 'assets', 'uploads'),
  filename: (req, file, cb) => {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/jpg': '.jpg',
      'image/png': '.png',
      'image/webp': '.webp',
    };
    const ext = mimeToExt[file.mimetype] || '.jpg';
    cb(null, uuidv4() + ext);
  },
});

const upload = multer({
  storage: uploadStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Ungültiger Dateityp'), false);
    }
  },
});

function verifyMagicBytes(filePath, mimetype) {
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(4);
  fs.readSync(fd, buf, 0, 4, 0);
  fs.closeSync(fd);
  const hex = buf.toString('hex').toLowerCase();
  if (mimetype === 'image/jpeg' || mimetype === 'image/jpg') {
    return hex.startsWith('ffd8ff');
  }
  if (mimetype === 'image/png') {
    return hex.startsWith('89504e47');
  }
  if (mimetype === 'image/webp') {
    const buf12 = Buffer.alloc(12);
    const fd2 = fs.openSync(filePath, 'r');
    fs.readSync(fd2, buf12, 0, 12, 0);
    fs.closeSync(fd2);
    return buf12.slice(0, 4).toString('hex') === '52494646' &&
           buf12.slice(8, 12).toString('ascii') === 'WEBP';
  }
  return false;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;');
}

function loginPageHtml() {
  return `<!DOCTYPE html>
<html lang="de">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Bearbeitungsmodus – ${escapeHtml(businessName)}</title>
  <style>
    :root { --color-primary: #1a56db; }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: system-ui, -apple-system, sans-serif; background: #f5f7fa; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .card { background: #fff; border-radius: 12px; box-shadow: 0 4px 24px rgba(0,0,0,0.08); padding: 2.5rem 2rem; width: 100%; max-width: 380px; }
    h1 { font-size: 1.25rem; font-weight: 600; color: #111; margin-bottom: 0.5rem; }
    p { font-size: 0.9rem; color: #555; margin-bottom: 1.5rem; }
    label { display: block; font-size: 0.85rem; font-weight: 500; color: #333; margin-bottom: 0.4rem; }
    input[type="email"] { width: 100%; padding: 0.6rem 0.8rem; border: 1px solid #d1d5db; border-radius: 6px; font-size: 0.95rem; margin-bottom: 1rem; outline: none; transition: border-color 0.15s; }
    input[type="email"]:focus { border-color: var(--color-primary); }
    button[type="submit"] { width: 100%; background: var(--color-primary); color: #fff; border: none; border-radius: 6px; padding: 0.65rem 1rem; font-size: 0.95rem; font-weight: 600; cursor: pointer; transition: opacity 0.15s; }
    button[type="submit"]:hover { opacity: 0.88; }
  </style>
</head>
<body>
  <div class="card">
    <h1>Bearbeitungsmodus – ${escapeHtml(businessName)}</h1>
    <p>Geben Sie Ihre E-Mail-Adresse ein, um einen Anmeldelink zu erhalten.</p>
    <form method="POST" action="/auth/request-link">
      <label for="email">E-Mail-Adresse</label>
      <input type="email" id="email" name="email" required autocomplete="email" placeholder="name@beispiel.de">
      <button type="submit">Link anfordern</button>
    </form>
  </div>
</body>
</html>`;
}

function hasValidSession(req) {
  const token = req.cookies['studio_session'];
  if (!token) return false;
  try {
    const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
    if (isSessionRevoked(decoded)) return false;
    return true;
  } catch {
    return false;
  }
}

// Server-side hydration: inject the current content.json values into every
// [data-editable][data-key] element so saved edits are visible immediately for
// ALL visitors (anonymous included), with no client-side flash. Text fields are
// leaf elements (icons/bold live outside the data-key element by template design).
function hydrateContent(html) {
  // Images: replace the src of <img ... data-key="KEY" ...>
  html = html.replace(/<img\b[^>]*\bdata-key="([a-z0-9_]+)"[^>]*>/g, (full, key) => {
    if (!(key in content) || !content[key]) return full;
    return full.replace(/\bsrc="[^"]*"/, `src="${escapeHtml(content[key])}"`);
  });
  // Text: replace the inner content of <tag ... data-editable="text" data-key="KEY" ...>…</tag>
  html = html.replace(
    /(<([a-zA-Z0-9]+)\b[^>]*?\bdata-editable="text"\s+data-key="([a-z0-9_]+)"[^>]*>)([\s\S]*?)(<\/\2>)/g,
    (full, open, tag, key, inner, close) => {
      if (!(key in content)) return full;
      return open + escapeHtml(content[key]) + close;
    }
  );
  return html;
}

function serveHtmlWithOverlay(req, res, htmlPath) {
  if (req.query.edit !== undefined && !hasValidSession(req)) {
    return res.send(loginPageHtml());
  }
  if (!fs.existsSync(htmlPath)) return res.status(404).send('Seite nicht gefunden');
  let html = fs.readFileSync(htmlPath, 'utf8');
  html = hydrateContent(html);
  if (hasValidSession(req)) {
    const overlayScript = fs.readFileSync(path.join(__dirname, 'overlay.js'), 'utf8');
    html = html.replace('/* STUDIO_OVERLAY_PLACEHOLDER */', overlayScript);
  }
  return res.send(html);
}

app.get('/', (req, res) => {
  serveHtmlWithOverlay(req, res, path.join(CLIENT_DIR, 'index.html'));
});

app.get('/:page.html', (req, res) => {
  const safeName = path.basename(req.params.page).replace(/[^a-z0-9\-_]/gi, '');
  serveHtmlWithOverlay(req, res, path.join(CLIENT_DIR, `${safeName}.html`));
});

app.post('/auth/request-link', authLimiter, async (req, res) => {
  const { email } = req.body;
  if (!email || typeof email !== 'string' || email.toLowerCase() !== editorEmail.toLowerCase()) {
    return res.status(403).json({ error: 'Nicht autorisiert' });
  }

  const token = uuidv4();
  tokens.set(token, { email, expires: Date.now() + 3600000 });

  const magicLink = `${resolvedSiteUrl}/auth/verify?token=${token}`;

  try {
    await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER,
      to: email,
      subject: `Ihr Bearbeitungslink – ${businessName}`,
      html: `
        <div style="font-family:system-ui,sans-serif;max-width:480px;margin:auto;padding:2rem;">
          <h2 style="color:#111;margin-bottom:1rem;">Ihr Bearbeitungslink</h2>
          <p style="color:#444;margin-bottom:1.5rem;">Klicken Sie auf den Button, um den Bearbeitungsmodus für <strong>${escapeHtml(businessName)}</strong> zu starten. Der Link ist 1 Stunde gültig.</p>
          <a href="${magicLink}" style="display:inline-block;background:#1a56db;color:#fff;text-decoration:none;padding:0.7rem 1.5rem;border-radius:6px;font-weight:600;">Jetzt bearbeiten</a>
          <p style="color:#888;font-size:0.8rem;margin-top:1.5rem;">Falls Sie diesen Link nicht angefordert haben, ignorieren Sie diese E-Mail.</p>
        </div>
      `,
    });
  } catch (err) {
    console.error('E-Mail-Fehler:', err.message);
    return res.status(500).json({ error: 'E-Mail konnte nicht gesendet werden' });
  }

  return res.status(200).json({ message: 'Link wurde gesendet' });
});

app.get('/auth/verify', authLimiter, (req, res) => {
  const now = Date.now();
  for (const [key, val] of tokens) {
    if (val.expires < now) tokens.delete(key);
  }

  const { token } = req.query;
  if (!token || typeof token !== 'string' || !tokens.has(token)) {
    return res.status(400).json({ error: 'Link ungültig oder abgelaufen' });
  }

  const data = tokens.get(token);
  if (data.expires < now) {
    tokens.delete(token);
    return res.status(400).json({ error: 'Link ungültig oder abgelaufen' });
  }

  tokens.delete(token);

  const sessionToken = jwt.sign({ email: data.email }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '24h',
  });

  res.cookie('studio_session', sessionToken, {
    httpOnly: true,
    secure: IS_PROD,
    sameSite: 'strict',
    maxAge: 86400000,
  });

  return res.redirect('/');
});

app.get('/auth/logout', (req, res) => {
  const token = req.cookies['studio_session'];
  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, { algorithms: ['HS256'] });
      revokeSession(decoded.email);
    } catch { }
  }
  res.clearCookie('studio_session');
  res.redirect('/');
});

app.get('/api/me', isAuthenticated, (req, res) => {
  res.json({ email: req.user.email });
});

const ALLOWED_CONTENT_KEYS = new Set([
  'hero_eyebrow', 'hero_headline', 'hero_subtext', 'hero_image', 'hero_btn_ghost', 'hero_btn_primary',
  'praxis_section_tag', 'praxis_title', 'praxis_text', 'praxis_stat_number', 'praxis_stat_label',
  'praxis_feature_1', 'praxis_feature_2', 'praxis_feature_3', 'praxis_feature_4',
  'team_section_tag', 'team_headline', 'team_subline',
  'team_1_name', 'team_1_role', 'team_1_bio', 'team_2_name', 'team_2_role', 'team_2_bio',
  'team_3_name', 'team_3_role', 'team_3_bio', 'team_4_name', 'team_4_role', 'team_4_bio',
  'behandlung_section_tag', 'behandlung_title', 'behandlung_subtitle',
  'leistung_1_name', 'leistung_1_desc', 'leistung_1_body',
  'leistung_2_name', 'leistung_2_desc', 'leistung_2_body',
  'leistung_3_name', 'leistung_3_desc', 'leistung_3_body',
  'leistung_4_name', 'leistung_4_desc', 'leistung_4_body',
  'leistung_5_name', 'leistung_5_desc', 'leistung_5_body',
  'leistung_6_name', 'leistung_6_desc', 'leistung_6_body',
  'leistung_7_name', 'leistung_7_desc', 'leistung_7_body',
  'leistung_8_name', 'leistung_8_desc', 'leistung_8_body',
  'kontakt_section_tag', 'kontakt_title', 'kontakt_subtitle',
  'contact_title', 'contact_phone', 'contact_email', 'contact_address',
  'contact_hours_title', 'contact_hours',
  'hours_time_1', 'hours_time_2', 'hours_time_3', 'hours_time_4',
  'hours_time_5', 'hours_time_6', 'hours_time_7',
  'legal_section_tag', 'legal_title',
  'legal_tab_impressum', 'legal_tab_datenschutz', 'legal_tab_cookies',
  'impressum_address', 'impressum_owner', 'impressum_responsible',
  'about_text', 'about_image',
  'faq_1_q', 'faq_1_a', 'faq_2_q', 'faq_2_a',
  'faq_3_q', 'faq_3_a', 'faq_4_q', 'faq_4_a',
  'faq_5_q', 'faq_5_a', 'faq_6_q', 'faq_6_a',
  'trust_rating', 'trust_review_count', 'trust_badge_1', 'trust_badge_2', 'trust_badge_3',
  'footer_text',
  'service_1_title', 'service_1_text', 'service_2_title', 'service_2_text',
  'service_3_title', 'service_3_text', 'service_4_title', 'service_4_text',
  'service_headline', 'service_subtext',
  'process_subtitle', 'step_1_title', 'step_1_text', 'step_2_title', 'step_2_text', 'step_3_title', 'step_3_text',
  'benefits_subtitle', 'benefit_1', 'benefit_2', 'benefit_3', 'benefit_4',
  'price_info', 'cta_headline', 'cta_subtext',
  'local_intro',
  // Testimonials section
  'testimonials_section_tag', 'testimonials_headline', 'testimonials_subline', 'testimonials_cta',
  'testimonial_1_text', 'testimonial_1_name',
  'testimonial_2_text', 'testimonial_2_name',
  'testimonial_3_text', 'testimonial_3_name',
  // FAQ Extra section
  'faq_extra_section_tag', 'faq_extra_headline',
  'faq_extra_1_q', 'faq_extra_1_a', 'faq_extra_2_q', 'faq_extra_2_a',
  'faq_extra_3_q', 'faq_extra_3_a', 'faq_extra_4_q', 'faq_extra_4_a',
  // CTA Band section
  'cta_band_headline', 'cta_band_subtext', 'cta_band_phone_label', 'cta_band_secondary_label',
  // Blog Teaser section
  'blog_teaser_section_tag', 'blog_teaser_headline', 'blog_teaser_subline', 'blog_teaser_cta',
  'blog_post_1_title', 'blog_post_1_teaser', 'blog_post_1_date',
  'blog_post_2_title', 'blog_post_2_teaser', 'blog_post_2_date',
  'blog_post_3_title', 'blog_post_3_teaser', 'blog_post_3_date',
  // Before/After section
  'before_after_section_tag', 'before_after_headline', 'before_after_subline',
  'before_after_before_text', 'before_after_after_text', 'before_after_cta_text',
  // Process Steps section
  'process_section_tag', 'process_headline', 'process_subline', 'process_cta',
  'process_step_1_title', 'process_step_1_text',
  'process_step_2_title', 'process_step_2_text',
  'process_step_3_title', 'process_step_3_text',
  // Blog post fields
  'blog_post_title', 'blog_post_intro', 'blog_post_author', 'blog_post_date_display', 'blog_post_body',
  'blog_faq_1_q', 'blog_faq_1_a', 'blog_faq_2_q', 'blog_faq_2_a', 'blog_faq_3_q', 'blog_faq_3_a',
  'blog_inline_cta_text', 'blog_sidebar_headline', 'blog_sidebar_text',
  // Page template fields (focus / split / story)
  'page_eyebrow', 'page_headline', 'page_subtext', 'page_subtext_2', 'page_intro',
  'page_hero_note', 'page_hero_image', 'page_cta_text',
  'page_trust_1', 'page_trust_1_sub', 'page_trust_2', 'page_trust_2_sub', 'page_trust_3', 'page_trust_3_sub',
  'page_services_tag', 'page_services_headline', 'page_services_sub',
  'page_service_1_title', 'page_service_1_text', 'page_service_1_detail',
  'page_service_2_title', 'page_service_2_text', 'page_service_2_detail',
  'page_service_3_title', 'page_service_3_text', 'page_service_3_detail',
  'page_prozess_headline', 'page_prozess_sub',
  'step_1_detail', 'step_2_detail', 'step_3_detail',
  'page_vorteile_headline',
  'benefit_1_text', 'benefit_2_text', 'benefit_3_text', 'benefit_4_text',
  'page_cta_band_headline', 'page_cta_band_subtext', 'page_cta_band_note',
  'page_faq_headline', 'page_faq_intro', 'page_faq_cta_text',
  'page_faq_1_q', 'page_faq_1_a', 'page_faq_2_q', 'page_faq_2_a',
  'page_faq_3_q', 'page_faq_3_a', 'page_faq_4_q', 'page_faq_4_a',
  'stat_1_number', 'stat_1_label', 'stat_2_number', 'stat_2_label', 'stat_3_number', 'stat_3_label',
  'page_body_1', 'page_body_2', 'page_body_3', 'page_body_4', 'page_body_5',
  'page_body_quote', 'page_body_h1', 'page_body_h2',
  'sidebar_headline', 'sidebar_text',
  'contact_cta_text', 'contact_hours_display',
  'logoName', 'businessName', 'address', 'phone', 'email',
]);

// Generic key validation: any safe slug key is editable, so new templates
// work without editing this whitelist. The legacy set stays as an allow-list
// for keys that don't match the slug pattern.
const CONTENT_KEY_PATTERN = /^[a-z][a-z0-9_]{1,63}$/;
function isValidContentKey(key) {
  return typeof key === 'string' && (CONTENT_KEY_PATTERN.test(key) || ALLOWED_CONTENT_KEYS.has(key));
}

app.post('/api/save', isAuthenticated, checkOrigin, (req, res) => {
  const { key, value } = req.body;
  if (!key || typeof key !== 'string' || key.trim() === '') {
    return res.status(400).json({ error: 'Ungültiger Key' });
  }
  if (!isValidContentKey(key)) {
    return res.status(400).json({ error: 'Key nicht erlaubt' });
  }
  if (typeof value !== 'string' || value.length > 5000) {
    return res.status(400).json({ error: 'Ungültiger Wert' });
  }
  content[key] = value;
  fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), 'utf8');
  return res.json({ ok: true });
});

app.post('/api/upload-image', isAuthenticated, checkOrigin, (req, res) => {
  const uploadsDir = path.join(CLIENT_DIR, 'assets', 'uploads');
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

  upload.single('image')(req, res, (err) => {
    if (err || !req.file) {
      return res.status(400).json({ error: 'Upload fehlgeschlagen' });
    }

    const filePath = req.file.path;

    if (!verifyMagicBytes(filePath, req.file.mimetype)) {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Dateiinhalt ungültig' });
    }

    const relativePath = `assets/uploads/${req.file.filename}`;
    const key = req.body.key;

    if (key && (isValidContentKey(key) || ALLOWED_IMAGE_KEYS.has(key))) {
      content[key] = relativePath;
      fs.writeFileSync(contentPath, JSON.stringify(content, null, 2), 'utf8');
    }

    return res.json({ ok: true, path: relativePath });
  });
});

app.post('/api/add-section', isAuthenticated, checkOrigin, (req, res) => {
  const { sectionType, targetPage = 'index.html', position = 'before-footer' } = req.body;

  if (!sectionType || typeof sectionType !== 'string' || !ALLOWED_SECTION_TYPES.has(sectionType)) {
    return res.status(400).json({ error: 'Ungültiger Sektionstyp' });
  }

  const safeTarget = path.basename(targetPage).replace(/[^a-z0-9\-_.]/gi, '');
  if (!safeTarget.endsWith('.html')) {
    return res.status(400).json({ error: 'Ungültige Zieldatei' });
  }

  const targetPath = path.join(CLIENT_DIR, safeTarget);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Zieldatei nicht gefunden' });
  }

  const sectionTemplatePath = path.join(__dirname, '../templates/sections', `${sectionType}.html`);
  if (!fs.existsSync(sectionTemplatePath)) {
    return res.status(500).json({ error: 'Sektions-Template nicht gefunden' });
  }

  const sectionTemplateHtml = fs.readFileSync(sectionTemplatePath, 'utf8');
  const sectionHtml = renderSectionTemplate(sectionTemplateHtml, config, content);

  let pageHtml = fs.readFileSync(targetPath, 'utf8');

  if (position === 'before-footer' && pageHtml.includes('</footer>')) {
    pageHtml = pageHtml.replace(/(<footer[\s\S]*?<\/footer>)(?![\s\S]*<footer)/, `\n${sectionHtml}\n$1`);
  } else if (pageHtml.includes('</main>')) {
    pageHtml = pageHtml.replace('</main>', `\n${sectionHtml}\n</main>`);
  } else {
    pageHtml = pageHtml.replace('</body>', `\n${sectionHtml}\n</body>`);
  }

  fs.writeFileSync(targetPath, pageHtml, 'utf8');

  return res.json({ ok: true, sectionHtml });
});

app.post('/api/create-page', isAuthenticated, checkOrigin, pageCreateLimiter, (req, res) => {
  const { type, keyword, title, layout = 'split' } = req.body;

  if (!type || !ALLOWED_PAGE_TYPES.has(type)) {
    return res.status(400).json({ error: 'Ungültiger Seitentyp' });
  }
  if (!keyword || typeof keyword !== 'string' || keyword.trim().length === 0 || keyword.length > 80) {
    return res.status(400).json({ error: 'Keyword ungültig (max. 80 Zeichen)' });
  }
  const keywordSafe = keyword.trim().replace(/[^a-zA-ZäöüÄÖÜß\s\-0-9]/g, '');
  if (keywordSafe.length < 3) {
    return res.status(400).json({ error: 'Keyword zu kurz' });
  }

  const VALID_LAYOUTS = ['focus', 'split', 'story'];
  const safeLayout = VALID_LAYOUTS.includes(layout) ? layout : 'split';

  try {
    let result;
    const clientname = path.basename(CLIENT_DIR);

    if (type === 'blog') {
      result = addBlogPost(clientname, {
        title: title || keywordSafe,
        keyword: keywordSafe,
      });
      return res.json({ ok: true, url: result.url, blogIndexUrl: result.blogIndexUrl });
    } else {
      result = addPage(clientname, type, keywordSafe, safeLayout);
      return res.json({ ok: true, url: result.url || `/${result.filename}` });
    }
  } catch (err) {
    console.error('[create-page]', err.message);
    return res.status(500).json({ error: 'Seite konnte nicht erstellt werden' });
  }
});

app.delete('/api/delete-section', isAuthenticated, checkOrigin, (req, res) => {
  const { sectionType, targetPage = 'index.html' } = req.body;

  if (!sectionType || typeof sectionType !== 'string' || !ALLOWED_SECTION_TYPES.has(sectionType)) {
    return res.status(400).json({ error: 'Ungültiger Sektionstyp' });
  }

  const safeTarget = path.basename(targetPage).replace(/[^a-z0-9\-_.]/gi, '');
  if (!safeTarget.endsWith('.html')) {
    return res.status(400).json({ error: 'Ungültige Zieldatei' });
  }

  const targetPath = path.join(CLIENT_DIR, safeTarget);
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Zieldatei nicht gefunden' });
  }

  let pageHtml = fs.readFileSync(targetPath, 'utf8');
  const sectionRegex = new RegExp(
    `\\s*<section[^>]*data-section-type="${sectionType}"[^>]*>[\\s\\S]*?<\\/section>`,
    'i'
  );

  if (!sectionRegex.test(pageHtml)) {
    return res.status(404).json({ error: 'Sektion nicht auf dieser Seite gefunden' });
  }

  pageHtml = pageHtml.replace(sectionRegex, '');
  fs.writeFileSync(targetPath, pageHtml, 'utf8');
  return res.json({ ok: true });
});

app.delete('/api/delete-page', isAuthenticated, checkOrigin, (req, res) => {
  const { targetPage } = req.body;

  if (!targetPage || typeof targetPage !== 'string') {
    return res.status(400).json({ error: 'Ungültige Seite' });
  }

  const safeName = path.basename(targetPage).replace(/[^a-z0-9\-_.]/gi, '');
  if (!safeName.endsWith('.html')) {
    return res.status(400).json({ error: 'Nur HTML-Dateien dürfen gelöscht werden' });
  }
  if (safeName === 'index.html') {
    return res.status(400).json({ error: 'index.html kann nicht gelöscht werden' });
  }

  const targetPath = path.join(CLIENT_DIR, safeName);
  const resolvedTarget = path.resolve(targetPath);
  if (!resolvedTarget.startsWith(path.resolve(CLIENT_DIR) + path.sep)) {
    return res.status(403).json({ error: 'Ungültiger Pfad' });
  }
  if (!fs.existsSync(targetPath)) {
    return res.status(404).json({ error: 'Seite nicht gefunden' });
  }

  const blogDir = path.join(CLIENT_DIR, 'blog');
  if (resolvedTarget.startsWith(path.resolve(blogDir) + path.sep) || resolvedTarget === path.resolve(path.join(blogDir, 'index.html'))) {
    return res.status(400).json({ error: 'Blog-Artikel über die Blog-Verwaltung löschen' });
  }

  fs.unlinkSync(targetPath);

  const sitemapPath = path.join(CLIENT_DIR, 'sitemap.xml');
  if (fs.existsSync(sitemapPath)) {
    let sitemap = fs.readFileSync(sitemapPath, 'utf8');
    const urlRegex = new RegExp(
      `\\s*<url>[\\s\\S]*?<loc>[^<]*\\/${escapeRegex(safeName)}<\\/loc>[\\s\\S]*?<\\/url>`,
      'g'
    );
    sitemap = sitemap.replace(urlRegex, '');
    fs.writeFileSync(sitemapPath, sitemap, 'utf8');
  }

  return res.json({ ok: true });
});

function escapeRegex(str) {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

app.use(express.static(CLIENT_DIR));

app.listen(PORT, () => console.log(`Studio Editor läuft auf Port ${PORT}`));
