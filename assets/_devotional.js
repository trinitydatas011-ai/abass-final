
/* ==========================================================================
   ABASS — DEVOTIONAL UPGRADE SCRIPTS
   1. Hero darshan caption (mobile-first hero value image)
   2. Seva Sankalpam sponsor dropdown
   ========================================================================== */

/* ============ HERO DARSHAN CAPTION ============ */
(function(){
  var slideshow = document.querySelector('.hero-slideshow');
  if(!slideshow) return;

  var cap = slideshow.querySelector('.hero-darshan-cap');
  if(!cap) return;
  var capTitle = cap.querySelector('.cap-title');
  if(!capTitle) return;

  function syncCaption(){
    var active = slideshow.querySelector('.hero-slide.active');
    if(!active) return;
    var en = active.getAttribute('data-title-en') || '';
    var ta = active.getAttribute('data-title-ta') || en;
    var ml = active.getAttribute('data-title-ml') || window.getMalayalamTranslation(en) || en;
    capTitle.setAttribute('data-en', en);
    capTitle.setAttribute('data-ta', ta);
    capTitle.setAttribute('data-ml', ml);
    capTitle.innerHTML = window.currentLang === 'ml' ? ml : (document.body.classList.contains('lang-ta') ? ta : en);
  }

  // re-sync whenever the active slide changes
  var observer = new MutationObserver(function(){ syncCaption(); });
  slideshow.querySelectorAll('.hero-slide').forEach(function(s){
    observer.observe(s, { attributes:true, attributeFilter:['class'] });
  });

  document.querySelectorAll('.lang-btn').forEach(function(b){
    b.addEventListener('click', function(){ setTimeout(syncCaption, 0); });
  });

  syncCaption();
})();


/* ============ SEVA SANKALPAM — UPCOMING EVENTS ONLY ============
   The event list is loaded from the shared Supabase events table.
   - No donation amounts are shown or collected here; submitting the form
     just shows an on-page thank-you confirmation — nothing is sent
     automatically. A Trustee follows up directly with the devotee to
     confirm the sankalpam and share the official bank / UPI information.
   - `until` (YYYY-MM-DD, inclusive) hides an event automatically once its
     last day has passed. Recurring events have no `until`.
   ================================================================== */
(function(){
  var form = document.querySelector('[data-seva-form]');
  if(!form) return;

  var UPCOMING = [];

  var select     = form.querySelector('[data-seva-select]');
  var detailBox  = form.querySelector('[data-seva-detail]');
  if(!select || !detailBox) return;

  function language(){ return window.currentLang || 'en'; }
  function pick(item, key){
    var lang=language();
    var en=item[key+'En'];
    if(lang==='en') return en;
    var cap=lang.charAt(0).toUpperCase()+lang.slice(1);
    return item[key+cap] || window.getTranslation(en, lang) || en;
  }
  function displayLocation(item){
    var location = pick(item, 'location');
    if(!location) return '';
    var parts = location.split(',').map(function(part){ return part.trim(); });
    return parts.length > 2 ? parts.slice(-2).join(', ') : location;
  }
  function current(){
    for(var i = 0; i < UPCOMING.length; i++){ if(UPCOMING[i].id === select.value) return UPCOMING[i]; }
    return UPCOMING[0];
  }

  /* ---- dropdown: upcoming events only, bilingual ---- */
  function buildOptions(){
    select.innerHTML = '';
    UPCOMING.forEach(function(s){
      var opt = document.createElement('option');
      opt.value = s.id;
      opt.setAttribute('data-en', s.en);
      opt.setAttribute('data-ta', s.ta);
      var ml = s.ml || window.getMalayalamTranslation(s.en) || s.en;
      opt.setAttribute('data-ml', ml);
      opt.setAttribute('data-te', s.te); opt.setAttribute('data-kn', s.kn);
      opt.textContent = ({ en: s.en, ta: s.ta, ml: ml, te: s.te, kn: s.kn })[language()] || s.en;
      select.appendChild(opt);
    });
  }

  /* ---- detail card: event name, date, location, description ---- */
  function renderDetail(){
    var s = current();
    if(!s){ detailBox.innerHTML = ''; return; }

    detailBox.innerHTML =
      '<div class="seva-detail-top">' +
        '<span class="seva-detail-name"></span>' +
        '<div class="seva-detail-meta">' +
          '<span class="seva-detail-amt"></span>' +
          '<span class="seva-detail-location">' +
            '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M12 22s7-7.2 7-13a7 7 0 1 0-14 0c0 5.8 7 13 7 13z"/><circle cx="12" cy="9" r="2.3"/></svg>' +
            '<span class="seva-detail-location-text"></span>' +
          '</span>' +
        '</div>' +
      '</div>' +
      '<p class="seva-detail-desc"></p>';

    var lang=language();
    detailBox.querySelector('.seva-detail-name').textContent = ({ en: s.en, ta: s.ta, ml: (s.ml || window.getMalayalamTranslation(s.en) || s.en), te: s.te, kn: s.kn })[lang] || s.en;
    detailBox.querySelector('.seva-detail-amt').textContent  = pick(s, 'when');
    var location = displayLocation(s);
    var locationRow = detailBox.querySelector('.seva-detail-location');
    if(location){
      detailBox.querySelector('.seva-detail-location-text').textContent = location;
    }else{
      locationRow.hidden = true;
    }
    detailBox.querySelector('.seva-detail-desc').textContent = pick(s, 'desc');
  }

  /* ---- fetch live events from Supabase ---- */
  if(window.ABASS_API && window.ABASS_API.getEvents){
    window.ABASS_API.getEvents({ upcomingOnly: true }).then(function(res){
      if(res && res.data){
        UPCOMING = res.data.map(function(e){
          return {
            id: e.slug || e.id,
            en: e.title_en,
            ta: e.title_ta || e.title_en,
            ml: e.title_ml || window.getMalayalamTranslation(e.title_en) || e.title_en,
            te: e.title_te || window.getTranslation(e.title_en, 'te') || e.title_en,
            kn: e.title_kn || window.getTranslation(e.title_en, 'kn') || e.title_en,
            whenEn: e.date_display_en || (e.is_recurring ? (e.recurrence_rule || 'Monthly') : [e.start_date, e.end_date].filter(Boolean).join(' to ')),
            whenTa: e.date_display_ta || e.date_display_en || '',
            whenMl: e.date_display_ml || window.getMalayalamTranslation(e.date_display_en) || e.date_display_en || '',
            locationEn: e.location_en || '',
            locationTa: e.location_ta || e.location_en || '',
            locationMl: e.location_ml || window.getMalayalamTranslation(e.location_en) || e.location_en || '',
            descEn: e.description_en || '',
            descTa: e.description_ta || e.description_en || '',
            locationTe: e.location_te || '', locationKn: e.location_kn || '',
            descTe: e.description_te || '', descKn: e.description_kn || '',
            whenTe: e.date_display_te || '', whenKn: e.date_display_kn || '',
            descMl: e.description_ml || window.getMalayalamTranslation(e.description_en) || e.description_en || '',
            until: e.end_date || e.start_date || null
          };
        });
        buildOptions();
        renderDetail();
      }
    }).catch(function(err){
      console.warn('Seva Sankalpam Supabase sync error:', err);
    });
  }

  /* ---- show an on-page confirmation instead of sending via WhatsApp ---- */
  var thanksBox = form.querySelector('[data-seva-thanks]');

  form.addEventListener('submit', function(e){
    e.preventDefault();
    var s = current();
    if(!s) return;

    if(thanksBox){
      thanksBox.hidden = false;
      thanksBox.scrollIntoView({ behavior:'smooth', block:'nearest' });
    }
    form.reset();
    renderDetail();
  });

  /* hide the confirmation again once the devotee starts a new entry */
  form.addEventListener('input', function(){
    if(thanksBox && !thanksBox.hidden) thanksBox.hidden = true;
  });

  select.addEventListener('change', renderDetail);

  /* rebuild in the newly chosen language */
  document.querySelectorAll('.lang-btn').forEach(function(b){
    b.addEventListener('click', function(){
      var keep = select.value;
      setTimeout(function(){
        buildOptions();
        if(keep) select.value = keep;
        renderDetail();
      }, 0);
    });
  });

  buildOptions();
  renderDetail();
  /* the saved language may already be Tamil on page load */
  if(language() !== 'en'){ buildOptions(); renderDetail(); }
})();
