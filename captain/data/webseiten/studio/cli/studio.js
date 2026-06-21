#!/usr/bin/env node
'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '..');
const CLIENTS_DIR = path.join(ROOT, 'clients');
const EXAMPLE_DIR = path.join(CLIENTS_DIR, '_example');
const DATA_DIR = path.join(ROOT, 'data');

function log(msg) { console.log(chalk.cyan('[studio]') + ' ' + msg); }
function ok(msg)  { console.log(chalk.green('  ✓ ') + msg); }
function err(msg) { console.log(chalk.red('  ✗ ') + msg); }
function warn(msg){ console.log(chalk.yellow('  ! ') + msg); }

function writeUpdateLog(clientName, action) {
  const updatesDir = path.join(DATA_DIR, 'updates');
  if (!fs.existsSync(updatesDir)) fs.mkdirSync(updatesDir, { recursive: true });
  const date = new Date().toISOString().split('T')[0];
  const file = path.join(updatesDir, `${clientName}-${date}.md`);
  const entry = `\n## ${new Date().toISOString()}\n- ${action}\n`;
  fs.appendFileSync(file, entry);
}

const CLIENTNAME_REGEX = /^[a-z0-9][a-z0-9\-]{1,62}[a-z0-9]$/;

function validateClientname(clientname) {
  if (!CLIENTNAME_REGEX.test(clientname)) {
    err(`Ungültiger Kundenname "${clientname}". Nur Kleinbuchstaben, Zahlen und Bindestriche erlaubt (3-64 Zeichen, kein führender/abschließender Bindestrich).`);
    process.exit(1);
  }
  const resolved = path.resolve(path.join(CLIENTS_DIR, clientname));
  if (!resolved.startsWith(CLIENTS_DIR + path.sep)) {
    err('Ungültiger Kundenname (Path Traversal erkannt).');
    process.exit(1);
  }
}

function getClients() {
  if (!fs.existsSync(CLIENTS_DIR)) return [];
  return fs.readdirSync(CLIENTS_DIR)
    .filter(d => d !== '_example' && fs.statSync(path.join(CLIENTS_DIR, d)).isDirectory());
}

program
  .name('studio')
  .description('White-Label Website Template System CLI')
  .version('1.0.0');

program
  .command('create <clientname>')
  .description('Neues Kundenprojekt anlegen')
  .action((clientname) => {
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    if (fs.existsSync(clientDir)) {
      err(`Kunde "${clientname}" existiert bereits.`);
      process.exit(1);
    }
    fs.mkdirSync(clientDir, { recursive: true });
    fs.mkdirSync(path.join(clientDir, 'assets', 'uploads'), { recursive: true });

    const exampleConfig = path.join(EXAMPLE_DIR, 'config.json');
    if (fs.existsSync(exampleConfig)) {
      fs.copyFileSync(exampleConfig, path.join(clientDir, 'config.json'));
    }

    log(`Kundenprojekt "${clientname}" wurde angelegt.`);
    ok(`Ordner: clients/${clientname}/`);
    ok(`config.json kopiert von _example`);
    warn(`Nächster Schritt: Öffne clients/${clientname}/config.json und fülle alle Felder aus.`);
    warn(`Dann: studio generate ${clientname}`);
    writeUpdateLog(clientname, 'Projekt erstellt via studio create');
  });

program
  .command('generate <clientname>')
  .description('HTML, llms.txt, sitemap, robots.txt aus config.json generieren')
  .action((clientname) => {
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    if (!fs.existsSync(clientDir)) {
      err(`Kunde "${clientname}" nicht gefunden. Erst: studio create ${clientname}`);
      process.exit(1);
    }
    const configPath = path.join(clientDir, 'config.json');
    if (!fs.existsSync(configPath)) {
      err(`config.json fehlt in clients/${clientname}/`);
      process.exit(1);
    }
    log(`Generiere Dateien für "${clientname}"...`);
    try {
      require(path.join(ROOT, 'generator', 'generate.js'))(clientname);
      ok('index.html generiert');
      ok('content.json generiert');
      ok('llms.txt generiert');
      ok('llms-full.txt generiert');
      ok('robots.txt generiert');
      ok('sitemap.xml generiert');
      ok('.env.example generiert');
      ok('reputation-checklist.md generiert');
      writeUpdateLog(clientname, 'Dateien generiert via studio generate');
    } catch (e) {
      err('Fehler beim Generieren: ' + e.message);
      process.exit(1);
    }
  });

program
  .command('add-page <clientname> <pagetype> <keyword>')
  .description('Neue Landing Page hinzufügen (pagetype: local | service)')
  .action((clientname, pagetype, keyword) => {
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    if (!fs.existsSync(clientDir)) {
      err(`Kunde "${clientname}" nicht gefunden.`);
      process.exit(1);
    }
    if (!['local', 'service'].includes(pagetype)) {
      err(`Ungültiger pagetype. Erlaubt: local | service`);
      process.exit(1);
    }
    log(`Füge ${pagetype}-Seite hinzu für "${clientname}": "${keyword}"`);
    try {
      require(path.join(ROOT, 'generator', 'add-page.js'))(clientname, pagetype, keyword);
      ok(`Seite generiert für: "${keyword}"`);
      ok('sitemap.xml aktualisiert');
      ok('llms.txt aktualisiert');
      writeUpdateLog(clientname, `Neue ${pagetype}-Seite hinzugefügt: "${keyword}"`);
    } catch (e) {
      err('Fehler: ' + e.message);
      process.exit(1);
    }
  });

program
  .command('deploy <clientname>')
  .description('Kundenprojekt auf Server deployen (rsync + PM2)')
  .action((clientname) => {
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    const envFile = path.join(clientDir, '.env');
    if (!fs.existsSync(envFile)) {
      err(`.env fehlt in clients/${clientname}/. Kopiere .env.example und fülle es aus.`);
      process.exit(1);
    }
    const env = {};
    fs.readFileSync(envFile, 'utf8').split('\n').forEach(line => {
      const [k, ...v] = line.split('=');
      if (k && v.length) env[k.trim()] = v.join('=').trim();
    });
    if (!env.DEPLOY_HOST || !env.DEPLOY_PATH) {
      err('DEPLOY_HOST und DEPLOY_PATH müssen in .env gesetzt sein.');
      process.exit(1);
    }
    log(`Deploye "${clientname}" nach ${env.DEPLOY_HOST}:${env.DEPLOY_PATH}...`);
    try {
      execSync(
        `rsync -avz --exclude='.env' --exclude='node_modules' ${clientDir}/ ${env.DEPLOY_USER || 'root'}@${env.DEPLOY_HOST}:${env.DEPLOY_PATH}/`,
        { stdio: 'inherit' }
      );
      ok('Dateien übertragen');
      writeUpdateLog(clientname, `Deployed nach ${env.DEPLOY_HOST}`);
    } catch (e) {
      err('Deploy fehlgeschlagen: ' + e.message);
      process.exit(1);
    }
  });

program
  .command('update <clientname>')
  .description('Template-Updates einspielen ohne Kundendaten zu überschreiben')
  .action((clientname) => {
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    if (!fs.existsSync(clientDir)) {
      err(`Kunde "${clientname}" nicht gefunden.`);
      process.exit(1);
    }
    log(`Update für "${clientname}"...`);
    warn('Folgende Dateien werden NICHT überschrieben: config.json, content.json, assets/');
    warn('Folgende Dateien werden aktualisiert: HTML-Templates, CSS, overlay.js');
    try {
      require(path.join(ROOT, 'generator', 'generate.js'))(clientname, { preserveContent: true });
      ok('Templates aktualisiert');
      ok('HTML neu generiert (Inhalte aus content.json beibehalten)');
      writeUpdateLog(clientname, 'Template-Update eingespielt via studio update');
    } catch (e) {
      err('Update fehlgeschlagen: ' + e.message);
      process.exit(1);
    }
  });

program
  .command('blog <subcommand> <clientname>')
  .description('Blog-Artikel verwalten (subcommand: add)')
  .option('--title <title>', 'Artikel-Titel')
  .option('--keyword <keyword>', 'Haupt-Keyword des Artikels')
  .option('--author <author>', 'Autor des Artikels')
  .option('--intro <intro>', 'Einleitungstext (optional, sonst auto-generiert)')
  .option('--image <image>', 'Pfad zum Artikelbild (z.B. assets/images/blog/bild.jpg)')
  .option('--date <date>', 'Veröffentlichungsdatum (YYYY-MM-DD, default: heute)')
  .action((subcommand, clientname, options) => {
    if (subcommand !== 'add') {
      err(`Unbekannter Subcommand "${subcommand}". Erlaubt: add`);
      process.exit(1);
    }
    validateClientname(clientname);
    const clientDir = path.join(CLIENTS_DIR, clientname);
    if (!fs.existsSync(clientDir)) {
      err(`Kunde "${clientname}" nicht gefunden.`);
      process.exit(1);
    }
    if (!options.keyword) {
      err('--keyword ist Pflichtfeld. Beispiel: --keyword "Zahnimplantate Kosten"');
      process.exit(1);
    }

    const title = options.title || options.keyword;
    const dateIso = options.date || new Date().toISOString().split('T')[0];
    const dateParts = dateIso.split('-');
    const dateFormatted = dateParts.length === 3
      ? new Date(dateIso).toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' })
      : dateIso;

    log(`Erstelle Blog-Artikel für "${clientname}": "${title}"`);
    try {
      const addBlogPost = require(path.join(ROOT, 'generator', 'blog.js'));
      const result = addBlogPost(clientname, {
        title,
        keyword: options.keyword,
        author: options.author,
        image: options.image,
        intro: options.intro,
        date: dateFormatted,
        dateIso,
      });
      ok(`Blog-Artikel erstellt: ${result.filename}`);
      ok('Blog-Index aktualisiert: blog/index.html');
      ok('sitemap.xml erweitert');
      ok('llms.txt erweitert');
      ok('llms-full.txt erweitert');
      warn(`URL: ${result.url}`);
      writeUpdateLog(clientname, `Blog-Artikel hinzugefügt: "${title}" (${options.keyword})`);
    } catch (e) {
      err('Fehler: ' + e.message);
      process.exit(1);
    }
  });

program
  .command('list')
  .description('Alle Kundenprojekte mit Status anzeigen')
  .action(() => {
    const clients = getClients();
    if (clients.length === 0) {
      warn('Noch keine Kundenprojekte vorhanden. Erstelle eines mit: studio create <name>');
      return;
    }
    log(`${clients.length} Kundenprojekt(e) gefunden:\n`);
    clients.forEach(name => {
      const dir = path.join(CLIENTS_DIR, name);
      const hasIndex   = fs.existsSync(path.join(dir, 'index.html'));
      const hasConfig  = fs.existsSync(path.join(dir, 'config.json'));
      const configData = hasConfig ? JSON.parse(fs.readFileSync(path.join(dir, 'config.json'), 'utf8')) : {};
      const status = hasIndex ? chalk.green('✓ generiert') : chalk.yellow('⚠ nicht generiert');
      console.log(
        `  ${chalk.bold(name.padEnd(25))} ${status}  ${chalk.gray(configData.siteUrl || '–')}`
      );
    });
  });

program.parse(process.argv);
