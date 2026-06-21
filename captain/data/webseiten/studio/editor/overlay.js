(function () {
  function debounce(fn, delay) {
    let timer;
    return function (...args) {
      clearTimeout(timer);
      timer = setTimeout(() => fn.apply(this, args), delay);
    };
  }

  function showSaving() {
    const el = document.getElementById('toolbar-status');
    if (el) { el.textContent = 'Speichert...'; el.style.color = '#fbbf24'; }
  }

  function showSaved() {
    const el = document.getElementById('toolbar-status');
    if (el) { el.textContent = '✓ Gespeichert'; el.style.color = '#86efac'; }
  }

  function showError() {
    const el = document.getElementById('toolbar-status');
    if (el) { el.textContent = '✗ Fehler beim Speichern'; el.style.color = '#fca5a5'; }
  }

  function setStatus(text, color) {
    const el = document.getElementById('toolbar-status');
    if (el) { el.textContent = text; el.style.color = color || '#f1f5f9'; }
  }

  async function saveContent(key, value) {
    showSaving();
    try {
      const res = await fetch('/api/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ key, value }),
      });
      if (res.ok) showSaved(); else showError();
    } catch (e) { showError(); }
  }

  async function uploadImage(key, file) {
    showSaving();
    const formData = new FormData();
    formData.append('image', file);
    formData.append('key', key);
    try {
      const res = await fetch('/api/upload-image', { method: 'POST', body: formData });
      if (res.ok) {
        const data = await res.json();
        showSaved();
        return data.path;
      } else { showError(); return null; }
    } catch (e) { showError(); return null; }
  }

  // ─── Modal Helper ──────────────────────────────────────────────────────────

  function createModal(id, title, contentHtml) {
    const existing = document.getElementById(id);
    if (existing) existing.remove();

    const backdrop = document.createElement('div');
    backdrop.id = id;
    backdrop.style.cssText = [
      'position:fixed', 'inset:0', 'z-index:2147483646',
      'background:rgba(0,0,0,0.55)', 'display:flex',
      'align-items:center', 'justify-content:center', 'padding:1rem',
    ].join(';');

    const modal = document.createElement('div');
    modal.style.cssText = [
      'background:#1e293b', 'color:#f1f5f9',
      'border-radius:14px', 'padding:1.75rem 2rem',
      'width:100%', 'max-width:560px', 'max-height:85vh',
      'overflow-y:auto', 'box-shadow:0 8px 40px rgba(0,0,0,0.45)',
      'font-family:system-ui,-apple-system,sans-serif',
    ].join(';');

    modal.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:1.25rem;">
        <h2 style="font-size:1.1rem;font-weight:700;color:#f1f5f9;margin:0;">${title}</h2>
        <button data-close-modal style="background:none;border:none;color:#94a3b8;font-size:1.4rem;cursor:pointer;line-height:1;padding:0.2rem 0.4rem;border-radius:4px;" aria-label="Schließen">×</button>
      </div>
      ${contentHtml}
    `;

    backdrop.appendChild(modal);
    document.body.appendChild(backdrop);

    backdrop.addEventListener('click', (e) => {
      if (e.target === backdrop) backdrop.remove();
    });
    modal.querySelector('[data-close-modal]').addEventListener('click', () => backdrop.remove());

    document.addEventListener('keydown', function escHandler(e) {
      if (e.key === 'Escape') { backdrop.remove(); document.removeEventListener('keydown', escHandler); }
    });

    return { backdrop, modal };
  }

  // ─── Delete Helpers ────────────────────────────────────────────────────────

  function initSectionDeleteButtons() {
    const sections = document.querySelectorAll('[data-section-type]:not([data-delete-init])');
    sections.forEach(section => {
      section.setAttribute('data-delete-init', '1');
      const sectionType = section.dataset.sectionType;

      const deleteBtn = document.createElement('button');
      deleteBtn.title = 'Sektion löschen';
      deleteBtn.setAttribute('aria-label', 'Sektion löschen');
      deleteBtn.style.cssText = [
        'position:absolute', 'top:0.6rem', 'right:0.6rem', 'z-index:9999',
        'background:#dc2626', 'color:#fff', 'border:none', 'border-radius:5px',
        'padding:0.25rem 0.55rem', 'font-size:0.75rem', 'font-weight:700',
        'cursor:pointer', 'opacity:0', 'transition:opacity .15s',
        'pointer-events:none',
      ].join(';');
      deleteBtn.textContent = '✕ Sektion löschen';

      const computed = window.getComputedStyle(section);
      if (computed.position === 'static') section.style.position = 'relative';
      section.appendChild(deleteBtn);

      section.addEventListener('mouseenter', () => {
        deleteBtn.style.opacity = '1';
        deleteBtn.style.pointerEvents = 'auto';
      });
      section.addEventListener('mouseleave', () => {
        deleteBtn.style.opacity = '0';
        deleteBtn.style.pointerEvents = 'none';
      });

      deleteBtn.addEventListener('click', async (e) => {
        e.stopPropagation();
        if (!confirm(`Sektion "${sectionType}" wirklich löschen?\nDies kann nicht rückgängig gemacht werden.`)) return;

        const targetPage = window.location.pathname === '/' ? 'index.html' : window.location.pathname.replace(/^\//, '');
        deleteBtn.textContent = '⏳';
        deleteBtn.disabled = true;

        try {
          const res = await fetch('/api/delete-section', {
            method: 'DELETE',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionType, targetPage }),
          });
          const data = await res.json();
          if (res.ok) {
            section.remove();
            setStatus('Sektion gelöscht', '#86efac');
          } else {
            alert('Fehler: ' + (data.error || 'Unbekannter Fehler'));
            deleteBtn.textContent = '✕ Sektion löschen';
            deleteBtn.disabled = false;
          }
        } catch {
          alert('Netzwerkfehler beim Löschen');
          deleteBtn.textContent = '✕ Sektion löschen';
          deleteBtn.disabled = false;
        }
      });
    });
  }

  function openDeletePageModal() {
    const currentPage = window.location.pathname === '/' ? 'index.html' : window.location.pathname.replace(/^\//, '');
    if (currentPage === 'index.html') {
      alert('Die Startseite (index.html) kann nicht gelöscht werden.');
      return;
    }

    const pageName = currentPage.replace('.html', '');

    const { modal } = createModal('studio-delete-page-modal', 'Seite löschen', `
      <div style="background:#450a0a;border:1px solid #dc2626;border-radius:8px;padding:1rem 1.25rem;margin-bottom:1.25rem;">
        <p style="font-size:0.9rem;color:#fca5a5;margin-bottom:0.4rem;font-weight:600;">Achtung – diese Aktion ist unwiderruflich!</p>
        <p style="font-size:0.85rem;color:#fca5a5;">Die Datei <strong>${currentPage}</strong> wird dauerhaft gelöscht und aus der sitemap.xml entfernt.</p>
      </div>
      <p style="font-size:0.85rem;color:#94a3b8;margin-bottom:1.25rem;">
        Zur Bestätigung geben Sie bitte den Dateinamen ein:
      </p>
      <input id="delete-confirm-input" type="text" placeholder="${pageName}" maxlength="100"
        style="width:100%;padding:0.6rem 0.8rem;background:#0f172a;border:1px solid #334155;border-radius:7px;color:#f1f5f9;font-size:0.9rem;outline:none;margin-bottom:1rem;">
      <button id="confirm-delete-btn" disabled style="
        width:100%;padding:0.75rem 1rem;
        background:#6b7280;color:#fff;border:none;border-radius:8px;
        font-size:0.95rem;font-weight:700;cursor:not-allowed;
      ">Seite löschen</button>
      <div id="delete-page-feedback" style="margin-top:0.75rem;font-size:0.85rem;text-align:center;min-height:1.2em;"></div>
    `);

    const input = modal.querySelector('#delete-confirm-input');
    const confirmBtn = modal.querySelector('#confirm-delete-btn');
    const feedback = modal.querySelector('#delete-page-feedback');

    input.addEventListener('input', () => {
      const valid = input.value.trim() === pageName;
      confirmBtn.disabled = !valid;
      confirmBtn.style.background = valid ? '#dc2626' : '#6b7280';
      confirmBtn.style.cursor = valid ? 'pointer' : 'not-allowed';
    });

    confirmBtn.addEventListener('click', async () => {
      if (confirmBtn.disabled) return;
      confirmBtn.disabled = true;
      confirmBtn.textContent = '⏳ Wird gelöscht...';

      try {
        const res = await fetch('/api/delete-page', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ targetPage: currentPage }),
        });
        const data = await res.json();
        if (res.ok) {
          feedback.style.color = '#86efac';
          feedback.textContent = '✓ Seite gelöscht. Weiterleitung zur Startseite...';
          setTimeout(() => { window.location.href = '/'; }, 1500);
        } else {
          feedback.style.color = '#fca5a5';
          feedback.textContent = '✗ ' + (data.error || 'Fehler');
          confirmBtn.disabled = false;
          confirmBtn.textContent = 'Seite löschen';
        }
      } catch {
        feedback.style.color = '#fca5a5';
        feedback.textContent = '✗ Netzwerkfehler';
        confirmBtn.disabled = false;
        confirmBtn.textContent = 'Seite löschen';
      }
    });
  }

  // ─── Section Builder Modal ─────────────────────────────────────────────────

  const SECTION_TYPES = [
    { type: 'testimonials',  icon: '⭐', name: 'Kundenbewertungen',   desc: 'Google-Stars, 3 Zitate + CTA' },
    { type: 'faq-extra',     icon: '❓', name: 'FAQ-Block',           desc: '4 weitere Fragen & Antworten' },
    { type: 'cta-band',      icon: '📞', name: 'Conversion-Banner',   desc: 'Headline + Anruf-Button' },
    { type: 'blog-teaser',   icon: '📝', name: 'Blog-Teaser',         desc: '3 Artikel-Cards mit Links' },
    { type: 'before-after',  icon: '🔄', name: 'Vorher / Nachher',    desc: 'Bildvergleich + CTA' },
    { type: 'process-steps', icon: '🔢', name: '3-Schritt-Prozess',   desc: 'Ablauf erklären, Einwände entkräften' },
  ];

  function openSectionModal() {
    const cards = SECTION_TYPES.map(s => `
      <button data-section-type="${s.type}" style="
        display:flex;align-items:flex-start;gap:0.9rem;
        background:#0f172a;border:1px solid #334155;border-radius:10px;
        padding:0.9rem 1rem;cursor:pointer;text-align:left;width:100%;
        color:#f1f5f9;transition:border-color .15s;
      ">
        <span style="font-size:1.6rem;line-height:1;">${s.icon}</span>
        <span>
          <strong style="display:block;font-size:0.95rem;margin-bottom:0.2rem;">${s.name}</strong>
          <span style="font-size:0.8rem;color:#94a3b8;">${s.desc}</span>
        </span>
      </button>
    `).join('');

    const { modal } = createModal('studio-section-modal', '+ Neue Sektion hinzufügen', `
      <p style="font-size:0.85rem;color:#94a3b8;margin-bottom:1.1rem;">
        Wählen Sie einen Baustein – er wird sofort auf der Seite eingefügt und ist direkt bearbeitbar.
      </p>
      <div style="display:flex;flex-direction:column;gap:0.6rem;" id="section-cards-list">
        ${cards}
      </div>
      <div id="section-feedback" style="margin-top:1rem;font-size:0.85rem;color:#94a3b8;text-align:center;min-height:1.2em;"></div>
    `);

    modal.querySelectorAll('[data-section-type]').forEach(btn => {
      btn.addEventListener('click', async () => {
        const sectionType = btn.dataset.sectionType;
        const feedback = document.getElementById('section-feedback');
        const targetPage = (window.location.pathname === '/' ? 'index.html' : window.location.pathname.replace('/', ''));

        btn.disabled = true;
        feedback.textContent = '⏳ Wird eingefügt...';
        feedback.style.color = '#fbbf24';

        try {
          const res = await fetch('/api/add-section', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sectionType, targetPage, position: 'before-footer' }),
          });
          const data = await res.json();

          if (res.ok && data.sectionHtml) {
            const range = document.createRange();
            range.selectNode(document.body);
            const fragment = range.createContextualFragment(data.sectionHtml);
            const footer = document.querySelector('footer');
            if (footer) {
              footer.parentNode.insertBefore(fragment, footer);
            } else {
              document.body.appendChild(fragment);
            }
            initEditableElements();
            initSectionDeleteButtons();
            feedback.textContent = '✓ Sektion eingefügt!';
            feedback.style.color = '#86efac';
            setTimeout(() => document.getElementById('studio-section-modal')?.remove(), 1200);
          } else {
            feedback.textContent = '✗ ' + (data.error || 'Fehler');
            feedback.style.color = '#fca5a5';
            btn.disabled = false;
          }
        } catch (e) {
          feedback.textContent = '✗ Netzwerkfehler';
          feedback.style.color = '#fca5a5';
          btn.disabled = false;
        }
      });
    });
  }

  // ─── Page Creator Modal ────────────────────────────────────────────────────

  // ─── Page Creator Modal (2-stufiger Wizard) ───────────────────────────────

  const PAGE_TEMPLATES = [
    { layout: 'focus', icon: '🎯', name: 'Fokus',  desc: 'Minimal & conversion-stark',  detail: 'Hero · Trust · CTA · FAQ' },
    { layout: 'split', icon: '⚡', name: 'Split',  desc: 'Standard-Aufbau',             detail: 'Hero+Bild · Leistungen · Prozess · FAQ · Kontakt' },
    { layout: 'story', icon: '📖', name: 'Story',  desc: 'Ausführlich & informativ',    detail: 'Hero · Stats · Vorteile · Text+Sidebar · FAQ' },
  ];

  function openPageModal() {
    const { backdrop, modal } = createModal('studio-page-modal', '+ Neue Seite erstellen', `
      <div id="wizard-step-1">
        <p style="font-size:.85rem;color:#94a3b8;margin-bottom:1.25rem;">Schritt 1 von 2 – Welche Art von Seite möchten Sie erstellen?</p>
        <div style="display:flex;flex-direction:column;gap:.6rem;" id="page-type-list">
          <button data-page-type="service" style="display:flex;align-items:center;gap:.9rem;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:.9rem 1.1rem;cursor:pointer;text-align:left;width:100%;color:#f1f5f9;">
            <span style="font-size:1.5rem;">🔧</span>
            <span><strong style="display:block;font-size:.95rem;margin-bottom:.1rem;">Service-Seite</strong><span style="font-size:.8rem;color:#94a3b8;">Leistungsseite für ein spezifisches Angebot</span></span>
          </button>
          <button data-page-type="local" style="display:flex;align-items:center;gap:.9rem;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:.9rem 1.1rem;cursor:pointer;text-align:left;width:100%;color:#f1f5f9;">
            <span style="font-size:1.5rem;">📍</span>
            <span><strong style="display:block;font-size:.95rem;margin-bottom:.1rem;">Geo-Seite</strong><span style="font-size:.8rem;color:#94a3b8;">Landingpage für einen Ort oder Stadtteil</span></span>
          </button>
          <button data-page-type="blog" style="display:flex;align-items:center;gap:.9rem;background:#0f172a;border:1px solid #334155;border-radius:10px;padding:.9rem 1.1rem;cursor:pointer;text-align:left;width:100%;color:#f1f5f9;">
            <span style="font-size:1.5rem;">📝</span>
            <span><strong style="display:block;font-size:.95rem;margin-bottom:.1rem;">Blog-Artikel</strong><span style="font-size:.8rem;color:#94a3b8;">Ratgeber-Artikel mit E-E-A-T-Struktur & Schema.org</span></span>
          </button>
        </div>
      </div>

      <div id="wizard-step-2" style="display:none;">
        <button id="wizard-back" style="background:none;border:none;color:#94a3b8;font-size:.85rem;cursor:pointer;padding:0;margin-bottom:1.1rem;display:flex;align-items:center;gap:.35rem;">← Zurück</button>
        <p style="font-size:.85rem;color:#94a3b8;margin-bottom:1.1rem;">Schritt 2 von 2 – Template & Keyword</p>

        <div id="layout-picker" style="display:flex;gap:.6rem;margin-bottom:1.25rem;flex-wrap:wrap;">
          ${PAGE_TEMPLATES.map((t, i) => `
            <button data-layout="${t.layout}" style="flex:1;min-width:130px;background:${i === 1 ? '#1a56db' : '#0f172a'};border:2px solid ${i === 1 ? '#1a56db' : '#334155'};border-radius:10px;padding:.85rem .75rem;cursor:pointer;text-align:center;color:#f1f5f9;transition:border-color .15s;">
              <div style="font-size:1.6rem;margin-bottom:.4rem;">${t.icon}</div>
              <strong style="display:block;font-size:.9rem;">${t.name}</strong>
              <span style="display:block;font-size:.75rem;color:#94a3b8;margin-top:.2rem;">${t.desc}</span>
              <span style="display:block;font-size:.7rem;color:#475569;margin-top:.3rem;line-height:1.4;">${t.detail}</span>
            </button>
          `).join('')}
        </div>
        <input type="hidden" id="selected-layout" value="split">

        <div style="margin-bottom:.75rem;">
          <label id="keyword-label" for="page-keyword" style="display:block;font-size:.82rem;font-weight:600;color:#94a3b8;margin-bottom:.4rem;">Keyword / Leistung</label>
          <input id="page-keyword" type="text" placeholder="z.B. Zahnimplantate" maxlength="80"
            style="width:100%;padding:.6rem .8rem;background:#0f172a;border:1px solid #334155;border-radius:7px;color:#f1f5f9;font-size:.9rem;outline:none;box-sizing:border-box;">
          <p id="keyword-hint" style="font-size:.78rem;color:#475569;margin-top:.3rem;">Das Haupt-Keyword der Seite (max. 80 Zeichen)</p>
        </div>

        <div id="blog-title-field" style="display:none;margin-bottom:.75rem;">
          <label for="page-title" style="display:block;font-size:.82rem;font-weight:600;color:#94a3b8;margin-bottom:.4rem;">Artikel-Titel (optional)</label>
          <input id="page-title" type="text" placeholder="z.B. Zahnimplantate: Was kostet das wirklich?" maxlength="100"
            style="width:100%;padding:.6rem .8rem;background:#0f172a;border:1px solid #334155;border-radius:7px;color:#f1f5f9;font-size:.9rem;outline:none;box-sizing:border-box;">
        </div>

        <button id="create-page-btn" style="width:100%;margin-top:.75rem;padding:.75rem 1rem;background:#1a56db;color:#fff;border:none;border-radius:8px;font-size:.95rem;font-weight:700;cursor:pointer;">
          Seite erstellen →
        </button>
        <div id="page-feedback" style="margin-top:.75rem;font-size:.85rem;text-align:center;min-height:1.2em;"></div>
      </div>
    `);

    let selectedType = 'service';
    const step1 = modal.querySelector('#wizard-step-1');
    const step2 = modal.querySelector('#wizard-step-2');
    const layoutPicker = modal.querySelector('#layout-picker');
    const layoutHidden = modal.querySelector('#selected-layout');
    const keywordLabel = modal.querySelector('#keyword-label');
    const keywordHint = modal.querySelector('#keyword-hint');
    const blogTitleField = modal.querySelector('#blog-title-field');
    const blogIsBlog = () => selectedType === 'blog';

    modal.querySelectorAll('[data-page-type]').forEach(btn => {
      btn.addEventListener('mouseenter', () => { btn.style.borderColor = '#1a56db'; });
      btn.addEventListener('mouseleave', () => { btn.style.borderColor = '#334155'; });
      btn.addEventListener('click', () => {
        selectedType = btn.dataset.pageType;
        step1.style.display = 'none';
        step2.style.display = 'block';

        if (selectedType === 'blog') {
          layoutPicker.style.display = 'none';
          keywordLabel.textContent = 'Blog-Keyword';
          keywordHint.textContent = 'z.B. "Zahnimplantate Kosten"';
          blogTitleField.style.display = 'block';
        } else if (selectedType === 'local') {
          layoutPicker.style.display = 'flex';
          keywordLabel.textContent = 'Ort / Stadtteil';
          keywordHint.textContent = 'z.B. "Chemnitz" oder "Freiberg"';
          blogTitleField.style.display = 'none';
        } else {
          layoutPicker.style.display = 'flex';
          keywordLabel.textContent = 'Keyword / Leistung';
          keywordHint.textContent = 'z.B. "Zahnimplantate" oder "Invisalign"';
          blogTitleField.style.display = 'none';
        }
      });
    });

    modal.querySelector('#wizard-back').addEventListener('click', () => {
      step2.style.display = 'none';
      step1.style.display = 'block';
    });

    layoutPicker.querySelectorAll('[data-layout]').forEach(btn => {
      btn.addEventListener('click', () => {
        layoutPicker.querySelectorAll('[data-layout]').forEach(b => {
          b.style.background = '#0f172a';
          b.style.borderColor = '#334155';
        });
        btn.style.background = '#1a56db';
        btn.style.borderColor = '#1a56db';
        layoutHidden.value = btn.dataset.layout;
      });
    });

    modal.querySelector('#create-page-btn').addEventListener('click', async () => {
      const keyword = modal.querySelector('#page-keyword').value.trim();
      const title = modal.querySelector('#page-title')?.value.trim() || '';
      const layout = layoutHidden.value;
      const feedback = modal.querySelector('#page-feedback');
      const createBtn = modal.querySelector('#create-page-btn');

      if (!keyword || keyword.length < 3) {
        feedback.textContent = '✗ Bitte ein Keyword eingeben (min. 3 Zeichen)';
        feedback.style.color = '#fca5a5';
        return;
      }

      createBtn.disabled = true;
      createBtn.textContent = '⏳ Wird erstellt...';
      feedback.textContent = '';

      try {
        const res = await fetch('/api/create-page', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ type: selectedType, keyword, title: title || keyword, layout }),
        });
        const data = await res.json();

        if (res.ok) {
          feedback.style.color = '#86efac';
          feedback.innerHTML = `✓ Seite erstellt! <a href="${data.url}" style="color:#60a5fa;margin-left:.4rem;" target="_blank">Öffnen →</a>${data.blogIndexUrl ? ` · <a href="${data.blogIndexUrl}" style="color:#60a5fa;" target="_blank">Blog-Übersicht</a>` : ''}`;
          createBtn.textContent = '✓ Erstellt';
        } else {
          feedback.textContent = '✗ ' + (data.error || 'Fehler');
          feedback.style.color = '#fca5a5';
          createBtn.disabled = false;
          createBtn.textContent = 'Seite erstellen →';
        }
      } catch {
        feedback.textContent = '✗ Netzwerkfehler';
        feedback.style.color = '#fca5a5';
        createBtn.disabled = false;
        createBtn.textContent = 'Seite erstellen →';
      }
    });
  }

  // ─── Toolbar ───────────────────────────────────────────────────────────────

  function initToolbar() {
    const toolbar = document.createElement('div');
    toolbar.id = 'studio-toolbar';
    toolbar.style.cssText = [
      'position:fixed', 'top:0', 'left:0', 'right:0', 'z-index:2147483647',
      'background:#1e293b', 'color:#f1f5f9', 'display:flex', 'align-items:center',
      'justify-content:space-between', 'padding:0 1rem', 'height:44px',
      'font-family:system-ui,-apple-system,sans-serif', 'font-size:0.875rem',
      'box-shadow:0 2px 8px rgba(0,0,0,0.25)', 'gap:0.5rem',
    ].join(';');

    const left = document.createElement('span');
    left.textContent = '✏ Bearbeitungsmodus';
    left.style.cssText = 'font-weight:500;white-space:nowrap;';

    const btnSectionCss = [
      'background:#334155', 'color:#f1f5f9', 'border:none', 'border-radius:5px',
      'padding:0.3rem 0.75rem', 'font-size:0.82rem', 'cursor:pointer',
      'white-space:nowrap', 'font-weight:600',
    ].join(';');

    const btnSection = document.createElement('button');
    btnSection.textContent = '+ Sektion';
    btnSection.style.cssText = btnSectionCss;
    btnSection.title = 'Neue Sektion einfügen';
    btnSection.addEventListener('click', openSectionModal);

    const btnPage = document.createElement('button');
    btnPage.textContent = '+ Neue Seite';
    btnPage.style.cssText = btnSectionCss + ';background:#1a56db;';
    btnPage.title = 'Neue Seite erstellen';
    btnPage.addEventListener('click', openPageModal);

    const currentPage = window.location.pathname;
    const isIndex = currentPage === '/' || currentPage === '/index.html';
    const btnDeletePage = document.createElement('button');
    btnDeletePage.textContent = '✕ Seite löschen';
    btnDeletePage.style.cssText = btnSectionCss + ';background:#7f1d1d;color:#fca5a5;' + (isIndex ? 'opacity:0.35;cursor:not-allowed;' : '');
    btnDeletePage.title = isIndex ? 'Startseite kann nicht gelöscht werden' : 'Diese Seite löschen';
    btnDeletePage.disabled = isIndex;
    btnDeletePage.addEventListener('click', openDeletePageModal);

    const middle = document.createElement('span');
    middle.id = 'toolbar-status';
    middle.style.cssText = 'flex:1;text-align:center;font-size:0.8rem;';
    middle.textContent = '';

    const logoutBtn = document.createElement('button');
    logoutBtn.id = 'logout-btn';
    logoutBtn.textContent = 'Abmelden';
    logoutBtn.style.cssText = btnSectionCss;
    logoutBtn.addEventListener('click', () => {
      fetch('/auth/logout').then(() => { window.location.href = '/'; });
    });

    toolbar.appendChild(left);
    toolbar.appendChild(btnSection);
    toolbar.appendChild(btnPage);
    toolbar.appendChild(btnDeletePage);
    toolbar.appendChild(middle);
    toolbar.appendChild(logoutBtn);

    document.body.insertBefore(toolbar, document.body.firstChild);

    const style = document.createElement('style');
    style.textContent = `
      body.studio-edit-mode { padding-top: 44px !important; }
      .editable-hover { outline: 2px dashed #1a56db !important; outline-offset: 2px !important; cursor: text !important; }
      .img-edit-overlay {
        position: absolute; inset: 0; background: rgba(0,0,0,0.35);
        display: flex; align-items: center; justify-content: center;
        cursor: pointer; opacity: 0; transition: opacity 0.15s; border-radius: 4px;
      }
      .img-edit-overlay.visible { opacity: 1; }
      .img-edit-icon { font-size: 2rem; pointer-events: none; user-select: none; }
      #studio-section-modal button[data-section-type]:hover { border-color: #1a56db !important; }
    `;
    document.head.appendChild(style);
  }

  // ─── Editable Elements ────────────────────────────────────────────────────

  function openPromptEditor(element, dataKey) {
    const current = element.textContent.trim();
    const newVal = prompt('Text bearbeiten:', current);
    if (newVal !== null && newVal.trim() !== current) {
      element.textContent = newVal.trim();
      saveContent(dataKey, newVal.trim());
    }
  }

  function openInlineEditor(element, dataKey) {
    if (element.contentEditable === 'true') return;

    element.contentEditable = 'true';
    element.focus();

    const range = document.createRange();
    range.selectNodeContents(element);
    const sel = window.getSelection();
    if (sel) { sel.removeAllRanges(); sel.addRange(range); }

    const debouncedSave = debounce(() => saveContent(dataKey, element.textContent.trim()), 1500);
    element.addEventListener('input', debouncedSave);

    element.addEventListener('blur', () => {
      element.contentEditable = 'false';
      saveContent(dataKey, element.textContent.trim());
    }, { once: true });

    element.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        element.blur();
      }
    }, { once: true });
  }

  function initEditableElements() {
    const elements = document.querySelectorAll('[data-editable]:not([data-studio-init])');

    elements.forEach((element) => {
      element.setAttribute('data-studio-init', '1');
      const dataKey = element.dataset.key;
      if (!dataKey) return;

      const type = element.dataset.editable;

      if (type === 'text') {
        const isSummary = element.tagName === 'SUMMARY';
        const isInsideButton = element.closest('button') !== null;

        element.addEventListener('mouseenter', () => element.classList.add('editable-hover'));
        element.addEventListener('mouseleave', () => element.classList.remove('editable-hover'));

        element.addEventListener('click', function (e) {
          if (isSummary || isInsideButton) {
            e.preventDefault();
            e.stopPropagation();
            openPromptEditor(element, dataKey);
            return;
          }

          const hasComplexChildren = Array.from(element.childNodes).some(
            n => n.nodeType === Node.ELEMENT_NODE
          );

          if (hasComplexChildren) {
            e.preventDefault();
            openPromptEditor(element, dataKey);
          } else {
            openInlineEditor(element, dataKey);
          }
        });
      }

      if (type === 'image') {
        const img = element.tagName === 'IMG' ? element : element.querySelector('img');
        if (!img) return;

        const wrapper = element.tagName === 'IMG' ? element.parentElement : element;
        const computed = window.getComputedStyle(wrapper);
        if (computed.position === 'static') wrapper.style.position = 'relative';

        const overlay = document.createElement('div');
        overlay.className = 'img-edit-overlay';
        const icon = document.createElement('span');
        icon.className = 'img-edit-icon';
        icon.textContent = '📷';
        overlay.appendChild(icon);
        wrapper.appendChild(overlay);

        wrapper.addEventListener('mouseenter', () => overlay.classList.add('visible'));
        wrapper.addEventListener('mouseleave', () => overlay.classList.remove('visible'));

        wrapper.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();

          const input = document.createElement('input');
          input.type = 'file';
          input.accept = 'image/jpeg,image/png,image/webp';
          input.style.display = 'none';
          document.body.appendChild(input);

          input.click();

          input.addEventListener('change', () => {
            const file = input.files[0];
            if (!file) { document.body.removeChild(input); return; }

            if (file.size > 5 * 1024 * 1024) {
              alert('Bild zu groß. Maximal 5MB erlaubt.');
              document.body.removeChild(input);
              return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => { img.src = ev.target.result; };
            reader.readAsDataURL(file);

            uploadImage(dataKey, file).then((path) => {
              if (path) img.src = path + '?t=' + Date.now();
            });

            document.body.removeChild(input);
          });
        });
      }
    });
  }

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      const active = document.activeElement;
      if (active && active.contentEditable === 'true') active.blur();
    }
  });

  document.addEventListener('DOMContentLoaded', () => {
    document.body.classList.add('studio-edit-mode');
    initToolbar();
    initEditableElements();
    initSectionDeleteButtons();
    setTimeout(() => {
      if (window.ScrollTrigger) window.ScrollTrigger.refresh();
      if (window.gsap) window.gsap.utils.toArray('.animate-on-scroll').forEach(el => { el.style.opacity = '1'; el.style.transform = 'none'; });
    }, 100);
  });
})();
