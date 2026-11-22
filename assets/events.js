/**
 * ABASS — Events page
 *
 * ONE Admin-managed event list (Supabase `events` table) feeds BOTH
 *   • the "Currently Scheduled" cards, and
 *   • the "Select Event" dropdown of the Contribute form,
 * so an event added in the Admin Panel appears in both places automatically
 * (correction 02). The static "OTHER EVENT" card (correction 01) is always
 * appended after the Admin events.
 *
 * Every card has labelled Location and Date rows and a Google Maps link
 * (correction 04). Events with long descriptions (e.g. Padi Pooja, Vilakku
 * Pooja — correction 10) get a "View details" button that opens an expanded
 * view with descriptions, headings, bullet lists and an embedded Google Map.
 *
 * All admin-supplied text is inserted with textContent (never innerHTML).
 */
(function () {
  'use strict';

  var grid = document.querySelector('.event-cards-grid');
  var formSelect = document.querySelector('select[name="event"]');
  if (!grid && !formSelect) return;

  var OTHER_ID = 'other-event';
  var REFRESH_MS = 60000;

  /* ---------------------------------------------------------------
     Built-in expanded descriptions (correction 10). Used when the
     event has no details saved in the Admin Panel. Wording is exactly
     as supplied. Mini-format: "## Heading", "- bullet", blank line
     between paragraphs.
     --------------------------------------------------------------- */
  var DETAILS_DEFAULTS = {
    vilakku: [
      'Vilakku Pooja is a sacred Pooja performed for many God and Godess.',
      '',
      'This sacred Ayyappan vilakku Pooja is performed as day long Pooja in the following manner:',
      '- Maha Ganapathy Homam',
      '- Ayyappan Laksharchanai',
      '- Keli kottu',
      '- Maha Annadhaanam',
      '- Utchavar Procession',
      '- Maha Deeparaadhanai',
      '- Annadhaanam',
      '- Special Thayambaka',
      '- Udukku pattu, Ayyappan Jananam and Mangalam',
      '',
      '## Special aspect',
      'The very special aspect in this Pooja is the procession of the decorated Ayyappan ratham, holding a vilakku Thala thattu by malikappuram alongside the procession on the decorated illuminated streets.'
    ].join('\n'),
    padi: [
      'Padi Pooja is a sacred ritual dedicated to Lord Ayyappa that centers around the worship of the Pathinettam Padi (the 18 divine steps) for lord Ayyappa.',
      '',
      '## Significance of the 18 steps',
      '- Steps 1–5 (Panchendriyas): Represent the five human senses (sight, hearing, smell, taste, and touch).',
      '- Steps 6–13 (Ashtaragas): Represent the eight lower desires and vices (kama, krodha, lobha, moha, madha, matsarya, asuya, and dhumb).',
      '- Steps 14–16 (Thrigunas): Represent the three fundamental qualities of nature (Sattva, Rajas, and Tamas).',
      '- Steps 17–18 (Vidya and Avidya): Represent transcendent knowledge and the shedding of ignorance, bringing the devotee into the direct presence of Lord Ayyappa.'
    ].join('\n')
  };

  /* ---------------------------------------------------------------
     Helpers
     --------------------------------------------------------------- */
  var events = [];
  var signature = '';
  var loaded = false;
  var openEventId = null;
  var lastFocus = null;

  function lang() { return window.currentLang || 'en'; }

  // UI label in the current language (dictionary lookup, English fallback)
  function ui(text) {
    var l = lang();
    return (l !== 'en' && window.getTranslation && window.getTranslation(text, l)) || text;
  }

  function h(tag, className, text) {
    var node = document.createElement(tag);
    if (className) node.className = className;
    if (text != null) node.textContent = text;
    return node;
  }

  function svg(pathMarkup, extraClass) {
    var span = document.createElement('span');
    span.className = 'event-ico' + (extraClass ? ' ' + extraClass : '');
    span.setAttribute('aria-hidden', 'true');
    span.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">' + pathMarkup + '</svg>';
    return span;
  }
  var PIN = '<path d="M12 2C8 2 5 5 5 9c0 5 7 13 7 13s7-8 7-13c0-4-3-7-7-7z"/><circle cx="12" cy="9" r="2.5"/>';
  var CAL = '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M16 3v4M8 3v4M3 11h18"/>';
  var EXT = '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>';

  function safeUrl(value) {
    if (!value) return '';
    try {
      var u = new URL(String(value).trim());
      return (u.protocol === 'https:' || u.protocol === 'http:') ? u.href : '';
    } catch (e) { return ''; }
  }

  // Google Maps link — the admin's own link if given, otherwise a search for
  // the location text the admin entered.
  function mapUrl(e) {
    return safeUrl(e.map_url) ||
      ('https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(e.location_en || ''));
  }
  function mapEmbedUrl(e) {
    return 'https://www.google.com/maps?q=' + encodeURIComponent(e.location_en || '') + '&output=embed';
  }

  var LOCALES = { en: 'en-IN', ta: 'ta-IN', ml: 'ml-IN', te: 'te-IN', kn: 'kn-IN' };

  function parseIso(value) {
    var p = String(value || '').split('-');
    if (p.length !== 3) return null;
    var d = new Date(Number(p[0]), Number(p[1]) - 1, Number(p[2]));
    return isNaN(d.getTime()) ? null : d;
  }

  // "12 డిసెంబర్ 2026" — day, month name, year in every language
  function fmtOne(d, l) {
    var parts = new Intl.DateTimeFormat(LOCALES[l] || 'en-IN', { day: 'numeric', month: 'short', year: 'numeric' }).formatToParts(d);
    var get = function (type) { return (parts.filter(function (p) { return p.type === type; })[0] || {}).value || ''; };
    return get('day') + ' ' + get('month') + ' ' + get('year');
  }

  function formatFixedDate(e, l) {
    var a = parseIso(e.start_date);
    if (!a) return '';
    var b = parseIso(e.end_date);
    try {
      if (b && b.getTime() !== a.getTime()) return fmtOne(a, l) + ' – ' + fmtOne(b, l);
      return fmtOne(a, l);
    } catch (err) { return ''; }
  }

  // Date text for an event in a language: the admin's text for that language,
  // else a translation of the English text, else a locale-formatted date.
  function dateText(e, l) {
    var en = e.date_display_en || '';
    if (l === 'en') {
      return en || (e.is_recurring ? (e.recurrence_rule || '') : (formatFixedDate(e, 'en') || e.start_date || ''));
    }
    var own = e['date_display_' + l];
    if (own) return own;
    var rule = e.is_recurring ? (e.recurrence_rule || en) : en;
    var translated = rule && window.getTranslation ? window.getTranslation(rule, l) : null;
    if (translated) return translated;
    if (!e.is_recurring) {
      var formatted = formatFixedDate(e, l);
      if (formatted) return formatted;
    }
    return rule || '';
  }

  function detailsKey(e) {
    var slug = String(e.slug || '').toLowerCase();
    var title = String(e.title_en || '').toLowerCase();
    if (slug === 'vilakku' || /vilakku\s+pooja/.test(title)) return 'vilakku';
    if (slug === 'padi' || /padi\s+pooja/.test(title)) return 'padi';
    return '';
  }

  // Source text of the expanded description (null if none) + whether it is
  // already in the visitor's language (admin-entered) or needs line-by-line
  // dictionary translation (built-in / English text).
  function detailsSource(e, l) {
    var own = l !== 'en' ? e['details_' + l] : '';
    if (own && String(own).trim()) return { text: String(own), translate: false };
    var en = (e.details_en && String(e.details_en).trim()) ? String(e.details_en) : (DETAILS_DEFAULTS[detailsKey(e)] || '');
    return en ? { text: en, translate: l !== 'en' } : null;
  }

  function hasExpandableContent(e) {
    if (detailsSource(e, 'en')) return true;
    return ['en', 'ta', 'ml', 'te', 'kn'].some(function (l) {
      return !!specFor(e, l).description;
    });
  }

  function trLine(text, l) {
    return (l !== 'en' && window.getTranslation && window.getTranslation(text, l)) || text;
  }

  // "## Heading" / "- bullet" / paragraphs  ->  DOM
  function renderDetails(source, l) {
    var wrap = h('div', 'event-details-text');
    var list = null;
    String(source.text).replace(/\r/g, '').split('\n').forEach(function (raw) {
      var line = raw.trim();
      var out = function (s) { return source.translate ? trLine(s, l) : s; };
      if (!line) { list = null; return; }
      if (/^##\s+/.test(line)) {
        list = null;
        wrap.appendChild(h('h4', 'event-details-heading', out(line.replace(/^##\s+/, ''))));
      } else if (/^[-•]\s+/.test(line)) {
        if (!list) { list = h('ul', 'event-details-list'); wrap.appendChild(list); }
        list.appendChild(h('li', '', out(line.replace(/^[-•]\s+/, ''))));
      } else {
        list = null;
        wrap.appendChild(h('p', 'event-details-para', out(line)));
      }
    });
    return wrap;
  }

  /* ---------------------------------------------------------------
     Card header (same three layouts the Admin Panel offers)
     --------------------------------------------------------------- */
  function headerFragment(e, l) {
    var header = window.getABASSEventHeader(e);
    var title = window.getABASSEventHeaderTitle(header, l);
    var sub = header.subtitle;
    if (sub && l !== 'en' && l !== 'ta') sub = (window.getTranslation && window.getTranslation(sub, l)) || sub;
    var frag = document.createDocumentFragment();
    var structure = header.displayStructure;
    if (structure === 'subtitle-above-title' && sub) {
      frag.appendChild(h('span', 'day event-header-subtitle', sub));
      frag.appendChild(h('span', 'month event-header-title', title));
    } else if (structure === 'subtitle-below-title' && sub) {
      frag.appendChild(h('span', 'day event-header-title', title));
      frag.appendChild(h('span', 'month event-header-subtitle', sub));
    } else {
      frag.appendChild(h('span', 'day event-header-title', title));
      var spacer = h('span', 'month'); spacer.setAttribute('aria-hidden', 'true');
      frag.appendChild(spacer);
    }
    return frag;
  }

  function simpleHeader(title) {
    var frag = document.createDocumentFragment();
    frag.appendChild(h('span', 'day event-header-title', title));
    var spacer = h('span', 'month'); spacer.setAttribute('aria-hidden', 'true');
    frag.appendChild(spacer);
    return frag;
  }

  /* ---------------------------------------------------------------
     Labelled Location / Date rows
     --------------------------------------------------------------- */
  function infoRows(spec, l) {
    var info = h('div', 'event-info');

    var locRow = h('div', 'event-info-row event-info-location');
    locRow.appendChild(h('span', 'event-info-label', ui('Location')));
    var locVal = h('div', 'event-info-value');
    locVal.appendChild(svg(PIN));
    locVal.appendChild(h('span', 'event-loc-text', spec.location || ui('To be announced')));
    locRow.appendChild(locVal);
    if (spec.mapHref) {
      var a = h('a', 'event-map-link');
      a.href = spec.mapHref; a.target = '_blank'; a.rel = 'noopener noreferrer';
      a.appendChild(svg(EXT));
      a.appendChild(h('span', '', ui('Open in Google Maps')));
      a.setAttribute('aria-label', ui('Open in Google Maps') + ': ' + (spec.location || ''));
      locRow.appendChild(a);
    }
    info.appendChild(locRow);

    var dateRow = h('div', 'event-info-row event-info-date');
    dateRow.appendChild(h('span', 'event-info-label', ui('Date')));
    var dateVal = h('div', 'event-info-value');
    dateVal.appendChild(svg(CAL));
    dateVal.appendChild(h('span', 'event-date-text', spec.date || ui('To be announced')));
    dateRow.appendChild(dateVal);
    info.appendChild(dateRow);
    return info;
  }

  function specFor(e, l) {
    var showDescription = e.slug !== 'padi' && e.slug !== 'vilakku' && e.description_visible !== false;
    return {
      location: window.abassField(e, 'location', l),
      mapHref: e.location_en || safeUrl(e.map_url) ? mapUrl(e) : '',
      date: dateText(e, l),
      description: showDescription ? window.abassField(e, 'description', l) : ''
    };
  }

  /* ---------------------------------------------------------------
     Cards
     --------------------------------------------------------------- */
  function buildCard(e, l) {
    var spec = specFor(e, l);
    var card = h('div', 'event-card');
    card.setAttribute('data-event-id', e.id || '');
    if (e.end_date || e.start_date) card.setAttribute('data-until', e.end_date || e.start_date);

    var head = h('div', 'event-date-badge');
    head.appendChild(headerFragment(e, l));
    card.appendChild(head);

    var body = h('div', 'event-body');
    body.appendChild(infoRows(spec, l));

    if (hasExpandableContent(e)) {
      var btn = h('button', 'event-details-btn');
      btn.type = 'button';
      btn.setAttribute('data-event-id', e.id || '');
      btn.appendChild(h('span', '', ui('View details')));
      btn.appendChild(h('span', 'event-details-arrow', '›'));
      btn.addEventListener('click', function () { openModal(e.id, btn); });
      body.appendChild(btn);
    }
    card.appendChild(body);
    return card;
  }

  // Correction 01 — fixed card, always after the Admin-managed events
  function buildOtherCard(l) {
    var card = h('div', 'event-card event-card-other');
    card.setAttribute('data-event-id', OTHER_ID);
    var head = h('div', 'event-date-badge');
    head.appendChild(simpleHeader(ui('OTHER EVENT')));
    card.appendChild(head);
    var body = h('div', 'event-body');
    body.appendChild(infoRows({ location: '', mapHref: '', date: '' }, l));
    var btn = h('button', 'event-details-btn');
    btn.type = 'button';
    btn.appendChild(h('span', '', ui('View details')));
    btn.appendChild(h('span', 'event-details-arrow', '›'));
    btn.addEventListener('click', function () { openModal(OTHER_ID, btn); });
    body.appendChild(btn);
    card.appendChild(body);
    return card;
  }

  function renderCards() {
    if (!grid) return;
    var l = lang();
    grid.innerHTML = '';
    events.forEach(function (e) { grid.appendChild(buildCard(e, l)); });
    grid.appendChild(buildOtherCard(l));
  }

  /* ---------------------------------------------------------------
     Contribute form dropdown — same list, same titles as the cards
     --------------------------------------------------------------- */
  function optionLabels(e) {
    var header = window.getABASSEventHeader(e);
    var out = {};
    ['en', 'ta', 'ml', 'te', 'kn'].forEach(function (l) { out[l] = window.getABASSEventHeaderLabel(header, l); });
    return out;
  }

  function addOption(select, value, labels, current) {
    var opt = document.createElement('option');
    opt.value = value;
    ['en', 'ta', 'ml', 'te', 'kn'].forEach(function (l) {
      opt.setAttribute('data-title-' + l, labels[l]);
    });
    opt.textContent = labels[current] || labels.en;
    select.appendChild(opt);
  }

  function renderSelect() {
    if (!formSelect) return;
    var l = lang();
    var keep = formSelect.value;
    formSelect.innerHTML = '';

    var placeholder = document.createElement('option');
    placeholder.value = '';
    placeholder.disabled = true;
    placeholder.selected = true;
    placeholder.textContent = ui('Select Event');
    formSelect.appendChild(placeholder);

    events.forEach(function (e) {
      if (!e.id) return;
      addOption(formSelect, e.id, optionLabels(e), l);
    });

    var otherLabels = {};
    ['en', 'ta', 'ml', 'te', 'kn'].forEach(function (x) {
      otherLabels[x] = (x === 'en' ? 'OTHER EVENT' : (window.getTranslation && window.getTranslation('OTHER EVENT', x)) || 'OTHER EVENT');
    });
    addOption(formSelect, OTHER_ID, otherLabels, l);

    if (keep) formSelect.value = keep;
    if (formSelect.value !== keep) placeholder.selected = true;
    formSelect.disabled = false;
  }

  /* ---------------------------------------------------------------
     Expanded details modal
     --------------------------------------------------------------- */
  var modal = null;

  function ensureModal() {
    if (modal) return modal;
    modal = h('div', 'event-modal');
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'eventModalTitle');
    modal.innerHTML =
      '<div class="event-modal-backdrop" data-close="1"></div>' +
      '<div class="event-modal-panel" tabindex="-1">' +
        '<div class="event-modal-head">' +
          '<div class="event-modal-title" id="eventModalTitle"></div>' +
          '<button type="button" class="event-modal-close" data-close="1" aria-label="Close">×</button>' +
        '</div>' +
        '<div class="event-modal-body"></div>' +
      '</div>';
    document.body.appendChild(modal);
    modal.addEventListener('click', function (ev) {
      if (ev.target && ev.target.getAttribute && ev.target.getAttribute('data-close')) closeModal();
    });
    document.addEventListener('keydown', function (ev) {
      if (modal.hidden) return;
      if (ev.key === 'Escape') { closeModal(); return; }
      if (ev.key === 'Tab') {   // keep keyboard focus inside the dialog
        var focusables = modal.querySelectorAll('a[href], button:not([disabled])');
        if (!focusables.length) return;
        var first = focusables[0], last = focusables[focusables.length - 1];
        if (ev.shiftKey && document.activeElement === first) { ev.preventDefault(); last.focus(); }
        else if (!ev.shiftKey && document.activeElement === last) { ev.preventDefault(); first.focus(); }
      }
    });
    return modal;
  }

  function fillModal() {
    var l = lang();
    if (openEventId === OTHER_ID) {
      modal.querySelector('#eventModalTitle').textContent = ui('OTHER EVENT');
      modal.querySelector('.event-modal-close').setAttribute('aria-label', ui('Close'));
      var otherBody = modal.querySelector('.event-modal-body');
      otherBody.innerHTML = '';
      otherBody.appendChild(infoRows({ location: '', mapHref: '', date: '' }, l));
      otherBody.appendChild(h('p', 'event-desc', ui('For any other event or seva not listed above. Please contact the Trust for details.')));
      return;
    }

    var e = events.filter(function (x) { return x.id === openEventId; })[0];
    if (!e) { closeModal(); return; }
    var spec = specFor(e, l);
    var header = window.getABASSEventHeader(e);
    var titleLabel = window.getABASSEventHeaderLabel(header, l);

    modal.querySelector('#eventModalTitle').textContent = titleLabel;
    modal.querySelector('.event-modal-close').setAttribute('aria-label', ui('Close'));

    var body = modal.querySelector('.event-modal-body');
    body.innerHTML = '';
    body.appendChild(infoRows(spec, l));
    if (spec.description) body.appendChild(h('p', 'event-desc', spec.description));

    var src = detailsSource(e, l);
    if (src) body.appendChild(renderDetails(src, l));

    if (e.location_en) {
      var mapWrap = h('div', 'event-modal-map');
      var frame = document.createElement('iframe');
      frame.src = mapEmbedUrl(e);
      frame.loading = 'lazy';
      frame.referrerPolicy = 'no-referrer-when-downgrade';
      frame.title = ui('Map of the event location') + ': ' + (e.location_en || '');
      frame.setAttribute('allowfullscreen', '');
      mapWrap.appendChild(frame);
      body.appendChild(mapWrap);
    }
  }

  function openModal(id, trigger) {
    ensureModal();
    openEventId = id;
    lastFocus = trigger || document.activeElement;
    fillModal();
    if (!openEventId) return;
    modal.hidden = false;
    document.body.classList.add('event-modal-open');
    var panel = modal.querySelector('.event-modal-panel');
    panel.scrollTop = 0;
    modal.querySelector('.event-modal-close').focus();
  }

  function closeModal() {
    if (!modal) return;
    modal.hidden = true;
    openEventId = null;
    modal.querySelector('.event-modal-body').innerHTML = '';   // also unloads the map
    document.body.classList.remove('event-modal-open');
    if (lastFocus && lastFocus.focus) { try { lastFocus.focus(); } catch (err) {} }
  }

  /* ---------------------------------------------------------------
     Load + keep in sync
     --------------------------------------------------------------- */
  function renderAll() {
    renderCards();
    renderSelect();
    if (modal && !modal.hidden) fillModal();
  }

  async function load() {
    if (!window.ABASS_API || !window.ABASS_API.getEvents) {
      if (!loaded) { loaded = true; renderAll(); }
      return;
    }
    var res;
    try { res = await window.ABASS_API.getEvents({ upcomingOnly: true }); }
    catch (err) { console.error('Unable to load upcoming events:', err); res = { failed: true, data: [] }; }

    // A failed refresh must never wipe what is already on screen
    if (res && res.failed && loaded) return;

    var list = res && Array.isArray(res.data) ? res.data : [];
    var sig = JSON.stringify(list);
    if (loaded && sig === signature) return;
    signature = sig;
    events = list;
    loaded = true;
    renderAll();
  }

  document.addEventListener('abass:langchange', function () { if (loaded) renderAll(); });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  window.addEventListener('focus', load);
  setInterval(load, REFRESH_MS);

  load();
})();
