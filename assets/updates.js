/**
 * ABASS — Latest Updates (correction 09)
 *
 * A vertically scrolling announcements panel, modelled on the TTD
 * "Latest Updates" box. It lists EVERY update published from the Admin
 * Panel — from the first one ever published up to the latest — newest first.
 * Nothing is dropped when new updates are added; the visitor scrolls (or
 * lets it scroll by itself) to read older announcements.
 *
 *  • auto-scrolls slowly; pauses on hover / focus / touch, and has a
 *    visible Pause / Play button (WCAG 2.2.2); no auto-scroll at all for
 *    visitors who prefer reduced motion
 *  • checks for new updates every minute, no page reload needed
 *  • text is inserted with textContent only
 */
(function () {
  'use strict';

  var root = document.getElementById('latest-updates');
  if (!root) return;

  var scroller = root.querySelector('[data-lu-scroll]');
  var list = root.querySelector('[data-lu-list]');
  var countEl = root.querySelector('[data-lu-count]');
  if (!scroller || !list) return;

  var NEW_DAYS = 7;
  var SPEED = 22;          // pixels per second
  var HOLD_MS = 2600;      // pause at the top / bottom
  var REFRESH_MS = 60000;
  var LOCALES = { en: 'en-IN', ta: 'ta-IN', ml: 'ml-IN', te: 'te-IN', kn: 'kn-IN' };

  var items = [];
  var signature = '';
  var loaded = false;

  function lang() { return window.currentLang || 'en'; }
  function ui(text) {
    var l = lang();
    return (l !== 'en' && window.getTranslation && window.getTranslation(text, l)) || text;
  }

  function safeUrl(value) {
    if (!value) return '';
    try {
      var u = new URL(String(value).trim(), window.location.href);
      return (u.protocol === 'https:' || u.protocol === 'http:' || u.protocol === 'mailto:' || u.protocol === 'tel:') ? u.href : '';
    } catch (e) { return ''; }
  }

  function formatDate(iso) {
    var d = new Date(iso);
    if (isNaN(d.getTime())) return '';
    try {
      var parts = new Intl.DateTimeFormat(LOCALES[lang()] || 'en-IN', {
        day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata'
      }).formatToParts(d);
      var get = function (type) { return (parts.filter(function (p) { return p.type === type; })[0] || {}).value || ''; };
      return get('day') + ' ' + get('month') + ' ' + get('year');
    } catch (e) { return d.toDateString(); }
  }

  function isNew(iso) {
    var d = new Date(iso);
    return !isNaN(d.getTime()) && (Date.now() - d.getTime()) < NEW_DAYS * 86400000 && d.getTime() <= Date.now() + 86400000;
  }

  function render() {
    var keepScroll = scroller.scrollTop;
    list.innerHTML = '';

    if (!items.length) {
      var empty = document.createElement('li');
      empty.className = 'lu-empty';
      empty.textContent = ui('No updates have been published yet.');
      list.appendChild(empty);
      if (countEl) countEl.textContent = '';
      autoscroll.refresh();
      return;
    }

    items.forEach(function (item) {
      var li = document.createElement('li');
      li.className = 'lu-item';

      if (isNew(item.published_at)) {
        var badge = document.createElement('span');
        badge.className = 'lu-badge';
        badge.textContent = ui('NEW');
        li.appendChild(badge);
      }

      var body = document.createElement('div');
      body.className = 'lu-body';

      var time = document.createElement('time');
      time.className = 'lu-date';
      time.setAttribute('datetime', item.published_at || '');
      time.textContent = formatDate(item.published_at);
      body.appendChild(time);

      var p = document.createElement('p');
      p.className = 'lu-text';
      p.appendChild(document.createTextNode(window.abassField(item, 'text', lang()) + ' '));
      var href = safeUrl(item.link_url);
      if (href) {
        var a = document.createElement('a');
        a.className = 'lu-link';
        a.href = href;
        if (/^https?:/i.test(href) && href.indexOf(window.location.origin) !== 0) {
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
        }
        var label = item.link_label_en || 'Click here';
        a.textContent = (lang() === 'en' ? label : ((window.getTranslation && window.getTranslation(label, lang())) || label));
        p.appendChild(a);
      }
      body.appendChild(p);
      li.appendChild(body);
      list.appendChild(li);
    });

    if (countEl) {
      var n = items.length;
      countEl.textContent = n + ' ' + (n === 1 ? ui('update') : ui('updates'));
    }
    scroller.scrollTop = keepScroll;
    autoscroll.refresh();
  }

  /* ---------------- auto-scroll ---------------- */
  var autoscroll = (function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var toggle = root.querySelector('[data-lu-toggle]');
    var userPaused = false;     // Pause button
    var hoverPaused = false;    // pointer / focus / touch
    var touchTimer = null;
    var pos = 0, last = 0, holdUntil = 0, running = false;

    function overflowing() { return scroller.scrollHeight - scroller.clientHeight > 4; }

    function setToggle() {
      if (!toggle) return;
      toggle.hidden = reduce || !overflowing();
      toggle.setAttribute('aria-pressed', userPaused ? 'true' : 'false');
      toggle.textContent = userPaused ? '▶' : '⏸';
      var label = userPaused ? ui('Play auto-scroll') : ui('Pause auto-scroll');
      toggle.setAttribute('aria-label', label);
      toggle.title = label;
    }

    function frame(ts) {
      if (!running) return;
      var dt = last ? Math.min(ts - last, 100) : 0;
      last = ts;
      if (!userPaused && !hoverPaused && !document.hidden && overflowing() && ts >= holdUntil) {
        var max = scroller.scrollHeight - scroller.clientHeight;
        pos += SPEED * dt / 1000;
        if (pos >= max) {
          pos = max;
          scroller.scrollTop = max;
          holdUntil = ts + HOLD_MS;
          // after the hold, return to the newest update
          setTimeout(function () { pos = 0; scroller.scrollTop = 0; holdUntil = performance.now() + HOLD_MS; }, HOLD_MS);
        } else {
          scroller.scrollTop = pos;
        }
      }
      window.requestAnimationFrame(frame);
    }

    function start() {
      if (running || reduce) return;
      running = true; last = 0;
      window.requestAnimationFrame(frame);
    }

    function hold() { hoverPaused = true; }
    function release() { hoverPaused = false; pos = scroller.scrollTop; holdUntil = performance.now() + 800; }

    scroller.addEventListener('mouseenter', hold);
    scroller.addEventListener('mouseleave', release);
    scroller.addEventListener('focusin', hold);
    scroller.addEventListener('focusout', release);
    scroller.addEventListener('touchstart', function () { hold(); if (touchTimer) clearTimeout(touchTimer); }, { passive: true });
    scroller.addEventListener('touchend', function () { touchTimer = setTimeout(release, 3500); }, { passive: true });
    scroller.addEventListener('wheel', function () { pos = scroller.scrollTop; }, { passive: true });

    if (toggle) {
      toggle.addEventListener('click', function () {
        userPaused = !userPaused;
        pos = scroller.scrollTop;
        setToggle();
      });
    }

    return {
      refresh: function () { pos = scroller.scrollTop; setToggle(); start(); }
    };
  })();

  /* ---------------- load + keep in sync ---------------- */
  async function load() {
    if (!window.ABASS_API || !window.ABASS_API.getUpdates) return;
    var res;
    try { res = await window.ABASS_API.getUpdates(); } catch (e) { res = { data: [], error: e }; }
    if (res && res.error && loaded) return;     // keep what is already shown
    var data = res && Array.isArray(res.data) ? res.data : [];
    var sig = JSON.stringify(data.map(function (x) { return [x.id, x.updated_at]; }));
    if (loaded && sig === signature) return;
    signature = sig;
    items = data;
    loaded = true;
    render();
  }

  document.addEventListener('abass:langchange', function () { if (loaded) render(); else { autoscroll.refresh(); } });
  document.addEventListener('visibilitychange', function () { if (!document.hidden) load(); });
  setInterval(load, REFRESH_MS);
  window.addEventListener('resize', function () { autoscroll.refresh(); });

  load();
})();
