// ============ HIDE EVENTS THAT HAVE ALREADY HAPPENED ============
// Any element with data-until="YYYY-MM-DD" (last day of the event, inclusive)
// is removed once that day has passed, so only upcoming events are offered.
(function(){
  var d = new Date();
  var m = d.getMonth() + 1, day = d.getDate();
  var today = d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  document.querySelectorAll('[data-until]').forEach(function(el){
    if(el.getAttribute('data-until') < today){ el.parentNode.removeChild(el); }
  });
})();

// ============ LANGUAGE SWITCHER ============
// Languages: English (en), Tamil (ta), Malayalam (ml), Telugu (te), Kannada (kn).
//
// How a piece of text is translated (first match wins):
//   1. an explicit attribute on the element      data-ta / data-te / data-kn ...
//   2. the dictionary for that language          assets/*-translations.js
//      (keyed by the English text itself)
//   3. the English text
// Dictionaries are registered on window.ABASS_I18N[lang]; Malayalam also keeps
// its original dictionary in window.ABASS_ML_TRANSLATIONS.
var currentLang = 'en';
var LANG_STORAGE_KEY = 'abass_lang';
var SUPPORTED_LANGS = ['en', 'ta', 'ml', 'te', 'kn'];
window.ABASS_I18N = window.ABASS_I18N || {};

(function(){
  var buttons = document.querySelectorAll('.lang-btn');
  var mlLegacy = window.ABASS_ML_TRANSLATIONS || {};

  var lowerIndex = {};
  function norm(text){ return String(text || '').replace(/\s+/g, ' ').trim(); }

  window.getMalayalamTranslation = function(text){
    var key = norm(text);
    var extra = window.ABASS_I18N.ml || {};
    if(extra[key]) return extra[key];
    if(mlLegacy[key]) return mlLegacy[key];
    var match = key.match(/^Go to (hero )?slide (\d+)$/);
    if(match) return (match[1] ? 'ഹീറോ ' : '') + 'സ്ലൈഡ് ' + match[2] + '-ലേക്ക് പോകുക';
    var labels = {
      'Image preview': 'ചിത്രത്തിന്റെ പ്രിവ്യൂ',
      'Close': 'അടയ്ക്കുക',
      'Previous': 'മുമ്പത്തേത്',
      'Next': 'അടുത്തത്'
    };
    if(labels[key]) return labels[key];
    return null;
  };

  // Dictionary lookup for any language. Returns null when there is none.
  window.getTranslation = function(text, lang){
    lang = lang || window.currentLang || 'en';
    if(lang === 'en') return null;
    var key = norm(text);
    if(!key) return null;
    if(lang === 'ml') return window.getMalayalamTranslation(key);
    var dict = window.ABASS_I18N[lang];
    if(!dict) return null;
    if(dict[key]) return dict[key];
    // tolerate differences in letter case (e.g. "Yearly Padi Pooja" vs "YEARLY PADI POOJA")
    if(!lowerIndex[lang]){
      lowerIndex[lang] = {};
      Object.keys(dict).forEach(function(k){ lowerIndex[lang][k.toLowerCase()] = dict[k]; });
    }
    return lowerIndex[lang][key.toLowerCase()] || null;
  };

  // Pick the right language from a data record that stores <base>_en/_ta/_ml/_te/_kn.
  // Falls back to the dictionary (keyed by the English text), then to English.
  window.abassField = function(item, base, lang){
    lang = lang || window.currentLang || 'en';
    item = item || {};
    var en = item[base + '_en'] || '';
    if(lang === 'en') return en;
    return item[base + '_' + lang] || window.getTranslation(en, lang) || en;
  };

  window.getABASSEventHeader = function(event){
    var titleEn = event.title_en || '';
    var headerSubtitle = event.header_subtitle || '';
    var displayStructure = event.display_structure || 'title-only';
    if(typeof event.display_structure === 'undefined' && event.is_recurring && !headerSubtitle){
      titleEn = titleEn.replace(/^Monthly\s+/i, 'EVERY MONTH ').toUpperCase();
      var schedule = (event.recurrence_rule || event.date_display_en || '').match(/^Every\s+(\d+(?:st|nd|rd|th)?)\s+(Saturday|Sunday|Monday|Tuesday|Wednesday|Thursday|Friday)\b/i);
      if(schedule){
        headerSubtitle = schedule[1].toUpperCase() + ' ' + schedule[2].slice(0, 3).toUpperCase();
        displayStructure = 'subtitle-above-title';
      }
    }
    return {
      titleEn: titleEn,
      titleTa: event.title_ta || titleEn,
      titleMl: event.title_ml || window.getMalayalamTranslation(titleEn) || titleEn,
      titleTe: event.title_te || window.getTranslation(titleEn, 'te') || titleEn,
      titleKn: event.title_kn || window.getTranslation(titleEn, 'kn') || titleEn,
      subtitle: headerSubtitle,
      displayStructure: displayStructure
    };
  };

  window.getABASSEventHeaderTitle = function(header, language){
    switch(language){
      case 'ta': return header.titleTa;
      case 'ml': return header.titleMl;
      case 'te': return header.titleTe;
      case 'kn': return header.titleKn;
      default:   return header.titleEn.toUpperCase();
    }
  };

  window.getABASSEventHeaderLabel = function(header, language){
    var title = window.getABASSEventHeaderTitle(header, language);
    var subtitle = header.subtitle;
    if(subtitle && language !== 'en' && language !== 'ta'){
      subtitle = window.getTranslation(header.subtitle, language) || header.subtitle;
    }
    if(!subtitle || header.displayStructure === 'title-only') return title;
    return header.displayStructure === 'subtitle-above-title'
      ? subtitle + ' – ' + title
      : title + ' – ' + subtitle;
  };

  // Translated attribute value for [data-en-ph] / aria-label / alt style attributes.
  function translated(el, lang, enAttr, langAttrOf){
    var en = el.getAttribute(enAttr);
    if(lang === 'en') return en;
    var own = el.getAttribute(langAttrOf(lang));
    if(own !== null) return own;
    return window.getTranslation(en, lang) || en;
  }

  window.applyLang = function(lang, skipSave){
    if(SUPPORTED_LANGS.indexOf(lang) === -1){ lang = 'en'; }
    currentLang = lang;
    window.currentLang = lang;

    document.querySelectorAll('[data-en]').forEach(function(el){
      var val = translated(el, lang, 'data-en', function(l){ return 'data-' + l; });
      if(val !== null){ el.innerHTML = val; }
    });
    document.querySelectorAll('[data-en-ph]').forEach(function(el){
      var val = translated(el, lang, 'data-en-ph', function(l){ return 'data-' + l + '-ph'; });
      if(val !== null){ el.setAttribute('placeholder', val); }
    });
    document.querySelectorAll('[aria-label]').forEach(function(el){
      if(!el.hasAttribute('data-en-aria-label')){
        el.setAttribute('data-en-aria-label', el.getAttribute('aria-label'));
      }
      var val = translated(el, lang, 'data-en-aria-label', function(l){ return 'data-' + l + '-aria-label'; });
      if(val){ el.setAttribute('aria-label', val); }
    });
    document.querySelectorAll('[alt]').forEach(function(el){
      if(!el.hasAttribute('data-en-alt')){
        el.setAttribute('data-en-alt', el.getAttribute('alt'));
      }
      var val = translated(el, lang, 'data-en-alt', function(l){ return 'data-' + l + '-alt'; });
      if(val){ el.setAttribute('alt', val); }
    });
    buttons.forEach(function(b){
      b.classList.toggle('active', b.getAttribute('data-lang') === lang);
      if(b.getAttribute('data-lang') === lang){ b.setAttribute('aria-current', 'true'); }
      else { b.removeAttribute('aria-current'); }
    });
    SUPPORTED_LANGS.forEach(function(l){
      if(l !== 'en'){ document.body.classList.toggle('lang-' + l, lang === l); }
    });
    document.documentElement.setAttribute('lang', lang);

    // Keep the choice in this tab so it carries over to other pages.
    if(!skipSave){
      try { window.sessionStorage.setItem(LANG_STORAGE_KEY, lang); } catch(e){}
    }

    // Let dynamic widgets (events, updates, members...) re-render in the new language
    try {
      document.dispatchEvent(new CustomEvent('abass:langchange', { detail: { lang: lang } }));
    } catch(e){}

    // Update lightbox if open
    if(window.updateLightboxCaption) {
      window.updateLightboxCaption();
    }
  };

  buttons.forEach(function(b){
    b.addEventListener('click', function(){
      window.applyLang(b.getAttribute('data-lang'));
      var switcher=b.closest('.lang-switch');
      if(switcher){ switcher.classList.remove('is-open'); var trigger=switcher.querySelector('.lang-trigger'); if(trigger) trigger.setAttribute('aria-expanded','false'); }
    });
  });

  document.querySelectorAll('.lang-switch').forEach(function(switcher){
    var trigger=switcher.querySelector('.lang-trigger');
    if(!trigger) return;
    trigger.addEventListener('click',function(e){
      e.stopPropagation();
      var open=switcher.classList.toggle('is-open');
      trigger.setAttribute('aria-expanded',open ? 'true' : 'false');
    });
    document.addEventListener('click',function(e){
      if(!switcher.contains(e.target)){ switcher.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); }
    });
    document.addEventListener('keydown',function(e){
      if(e.key === 'Escape'){ switcher.classList.remove('is-open'); trigger.setAttribute('aria-expanded','false'); }
    });
  });

  // Restore this tab's language choice; new tabs start in English.
  var savedLang = 'en';
  try {
    var stored = window.sessionStorage.getItem(LANG_STORAGE_KEY);
    if(SUPPORTED_LANGS.indexOf(stored) !== -1){ savedLang = stored; }
  } catch(e){}
  window.applyLang(savedLang, true);
})();

// ============ OBJECTS OF TRUST ACCORDION ============
document.querySelectorAll('.obj-head').forEach(function(head){
  head.addEventListener('click', function(){
    var card = head.closest('.obj-card');
    var wasOpen = card.classList.contains('open');
    document.querySelectorAll('.obj-card').forEach(function(c){ c.classList.remove('open'); });
    if(!wasOpen){ card.classList.add('open'); }
  });
});

// ============ EVENT CALENDAR TABS ============
// ============ EVENT CALENDAR TABS ============
(function(){
  var calTabs = document.querySelectorAll('.cal-tab');
  var calPanels = document.querySelectorAll('.cal-tab-panel');
  if(!calTabs.length) return;

  calTabs.forEach(function(tab, i){
    tab.addEventListener('click', function(){
      calTabs.forEach(function(t){ t.classList.remove('active'); });
      tab.classList.add('active');
      
      if(calPanels.length){
        calPanels.forEach(function(p){ p.classList.remove('active'); });
        if(calPanels[i]){
          calPanels[i].classList.add('active');
        }
      }
    });
  });
})();

// ============ MOBILE NAVIGATION ============
(function(){
  var toggle=document.querySelector('.nav-toggle');
  var nav=document.querySelector('.main-nav');
  if(!toggle || !nav) return;
  toggle.addEventListener('click',function(e){
    e.stopPropagation();
    var open=document.body.classList.toggle('mobile-nav-open');
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
  });
  nav.querySelectorAll('a').forEach(function(a){
    a.addEventListener('click',function(){
      document.body.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    });
  });
  document.addEventListener('click', function(e){
    if(document.body.classList.contains('mobile-nav-open') && !nav.contains(e.target) && !toggle.contains(e.target)){
      document.body.classList.remove('mobile-nav-open');
      toggle.setAttribute('aria-expanded', 'false');
    }
  });
})();

// ============ ACTIVE PAGE NAV ============
(function(){
  var path=location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.main-nav a').forEach(function(a){
    var href=a.getAttribute('href')||'';
    if(href===path) a.setAttribute('aria-current','page');
  });
})();

// ============ WHATSAPP CONTACT ============
(function(){
  var phone='919841820668';
  document.querySelectorAll('[data-whatsapp-form]').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data=new FormData(form);
      var name=(data.get('name')||'').trim();
      var message=(data.get('message')||'').trim();
      var type=(data.get('type')||'Website enquiry').trim();
      var text=window.currentLang === 'ml'
        ? 'ABASS വെബ്സൈറ്റ് അന്വേഷണം\n\nപേര്: '+name+'\nവിഭാഗം: '+type+'\nസന്ദേശം: '+message
        : 'ABASS Website Enquiry\n\nName: '+name+'\nType: '+type+'\nMessage: '+message;
      window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(text),'_blank','noopener');
    });
  });
})();

// ============ EVENT CONTRIBUTION (WHATSAPP) ============
(function(){
  var phone='919841820668';
  document.querySelectorAll('[data-contribution-form]').forEach(function(form){
    form.addEventListener('submit',function(e){
      e.preventDefault();
      var data=new FormData(form);
      var selectedEvent=form.querySelector('[name="event"] option:checked');
      // Telugu / Kannada visitors send the English event name so the trustees can read it.
      var msgLang=(window.currentLang==='ta' || window.currentLang==='ml') ? window.currentLang : 'en';
      var event=selectedEvent
        ? (selectedEvent.getAttribute('data-title-' + msgLang) || selectedEvent.textContent)
        : '';
      var name=(data.get('name')||'').trim();
      var mobile=(data.get('mobile')||'').trim();
      var place=(data.get('place')||'').trim();
      var pincode=(data.get('pincode')||'').trim();
      var text=window.currentLang === 'ml'
        ? 'ABASS സംഭാവന\n\nപരിപാടി: '+event+'\nസംഭാവന നൽകുന്ന വ്യക്തിയുടെ പേര്: '+name+'\nമൊബൈൽ: '+mobile+'\nസ്ഥലം: '+place+'\nപിൻ കോഡ്: '+pincode+'\n\n(QR കോഡ് വഴി പണമടച്ചു — ദയവായി സ്ഥിരീകരിക്കുക.)'
        : 'ABASS Contribution\n\nEvent: '+event+'\nContributor Name: '+name+'\nMobile: '+mobile+'\nPlace: '+place+'\nPin Code: '+pincode+'\n\n(Payment done via QR code — please confirm.)';
      window.open('https://wa.me/'+phone+'?text='+encodeURIComponent(text),'_blank','noopener');
    });
  });
})();

// ============ INTERACTIVE MEDIA GALLERY FILTERING ============
(function(){
  var filterBtns = document.querySelectorAll('.gallery-filter-btn');
  var mediaCards = document.querySelectorAll('.media-grid .media-card');
  if(!filterBtns.length || !mediaCards.length) return;

  filterBtns.forEach(function(btn){
    btn.addEventListener('click', function(){
      var cat = btn.getAttribute('data-filter') || 'all';
      filterBtns.forEach(function(b){ b.classList.remove('active'); });
      btn.classList.add('active');

      mediaCards.forEach(function(card){
        var cardCat = card.getAttribute('data-category') || '';
        if(cat === 'all' || cardCat.indexOf(cat) !== -1){
          card.style.display = 'flex';
          setTimeout(function(){
            card.style.opacity = '1';
            card.style.transform = 'scale(1)';
          }, 20);
        } else {
          card.style.opacity = '0';
          card.style.transform = 'scale(0.95)';
          setTimeout(function(){
            card.style.display = 'none';
          }, 250);
        }
      });
    });
  });
})();

// ============ INTERACTIVE LIGHTBOX MODAL ============
(function(){
  // Create modal container if not exists
  var modal = document.querySelector('.lightbox-modal');
  if(!modal){
    modal = document.createElement('div');
    modal.className = 'lightbox-modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-label', 'Image preview');
    modal.innerHTML = 
      '<button class="lightbox-close" type="button" aria-label="Close">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>' +
      '</button>' +
      '<button class="lightbox-btn prev" type="button" aria-label="Previous">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6"/></svg>' +
      '</button>' +
      '<button class="lightbox-btn next" type="button" aria-label="Next">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>' +
      '</button>' +
      '<div class="lightbox-content">' +
        '<figure class="lightbox-figure">' +
          '<div class="lightbox-img-wrap">' +
            '<img class="lightbox-img" src="" alt="">' +
          '</div>' +
          '<div class="lightbox-caption-bar">' +
            '<div class="lightbox-caption-info">' +
              '<span class="lightbox-title"></span>' +
              '<span class="lightbox-desc"></span>' +
            '</div>' +
            '<span class="lightbox-counter"></span>' +
          '</div>' +
        '</figure>' +
      '</div>';
    document.body.appendChild(modal);
  }

  var lightboxImg = modal.querySelector('.lightbox-img');
  var lightboxTitle = modal.querySelector('.lightbox-title');
  var lightboxDesc = modal.querySelector('.lightbox-desc');
  var lightboxCounter = modal.querySelector('.lightbox-counter');
  var closeBtn = modal.querySelector('.lightbox-close');
  var prevBtn = modal.querySelector('.lightbox-btn.prev');
  var nextBtn = modal.querySelector('.lightbox-btn.next');

  var activeGallery = [];
  var currentIndex = 0;

  function collectItems(){
    var items = document.querySelectorAll('[data-lightbox-src], .media-card, .highlight-slide, .hero-slide, .heritage-photo, .hero-visual-photo, .seva-fig');
    activeGallery = [];
    items.forEach(function(item){
      var src = item.getAttribute('data-lightbox-src') || (item.querySelector('img') ? item.querySelector('img').getAttribute('src') : '');
      if(!src) return;
      
      var titleEn = item.getAttribute('data-title-en') || 
                    (item.querySelector('.media-card-title') ? item.querySelector('.media-card-title').getAttribute('data-en') || item.querySelector('.media-card-title').textContent : '') ||
                    (item.querySelector('h4') ? item.querySelector('h4').textContent : '') ||
                    'ABASS Seva Darshan';
      var titleTa = item.getAttribute('data-title-ta') || 
                    (item.querySelector('.media-card-title') ? item.querySelector('.media-card-title').getAttribute('data-ta') || item.querySelector('.media-card-title').textContent : '') ||
                    titleEn;
      var titleMl = item.getAttribute('data-title-ml') || window.getMalayalamTranslation(titleEn) || titleEn;
      var titleTe = item.getAttribute('data-title-te') || window.getTranslation(titleEn, 'te') || titleEn;
      var titleKn = item.getAttribute('data-title-kn') || window.getTranslation(titleEn, 'kn') || titleEn;
      
      var descEn = item.getAttribute('data-desc-en') || 
                   (item.querySelector('.media-card-desc') ? item.querySelector('.media-card-desc').getAttribute('data-en') || item.querySelector('.media-card-desc').textContent : '') ||
                   (item.querySelector('p') ? item.querySelector('p').textContent : '') ||
                   '';
      var descTa = item.getAttribute('data-desc-ta') || 
                   (item.querySelector('.media-card-desc') ? item.querySelector('.media-card-desc').getAttribute('data-ta') || item.querySelector('.media-card-desc').textContent : '') ||
                   descEn;
      var descMl = item.getAttribute('data-desc-ml') || window.getMalayalamTranslation(descEn) || descEn;
      var descTe = item.getAttribute('data-desc-te') || window.getTranslation(descEn, 'te') || descEn;
      var descKn = item.getAttribute('data-desc-kn') || window.getTranslation(descEn, 'kn') || descEn;

      activeGallery.push({
        src: src,
        titleEn: titleEn,
        titleTa: titleTa,
        titleMl: titleMl,
        titleTe: titleTe,
        titleKn: titleKn,
        descEn: descEn,
        descTa: descTa,
        descMl: descMl,
        descTe: descTe,
        descKn: descKn,
        element: item
      });

      item.style.cursor = 'pointer';
      item.addEventListener('click', function(e){
        e.preventDefault();
        openLightbox(src);
      });
    });
  }

  function openLightbox(src){
    for(var i = 0; i < activeGallery.length; i++){
      if(activeGallery[i].src === src){
        currentIndex = i;
        break;
      }
    }
    renderLightbox();
    modal.classList.add('open');
    document.body.style.overflow = 'hidden';
  }

  function closeLightbox(){
    modal.classList.remove('open');
    document.body.style.overflow = '';
  }

  function renderLightbox(){
    if(!activeGallery.length || currentIndex < 0 || currentIndex >= activeGallery.length) return;
    var cur = activeGallery[currentIndex];
    lightboxImg.src = cur.src;
    var lang = window.currentLang || 'en';
    var titleOf = function(c, l){ return ({ en: c.titleEn, ta: c.titleTa, ml: c.titleMl, te: c.titleTe, kn: c.titleKn })[l] || c.titleEn; };
    var descOf = function(c, l){ return ({ en: c.descEn, ta: c.descTa, ml: c.descMl, te: c.descTe, kn: c.descKn })[l] || c.descEn; };
    lightboxImg.alt = titleOf(cur, lang);

    window.updateLightboxCaption = function(){
      var lang = window.currentLang || 'en';
      lightboxTitle.textContent = titleOf(cur, lang);
      lightboxDesc.textContent = descOf(cur, lang);
      lightboxCounter.textContent = (currentIndex + 1) + ' / ' + activeGallery.length;
    };
    window.updateLightboxCaption();
  }

  function showPrev(){
    if(currentIndex > 0){
      currentIndex--;
    } else {
      currentIndex = activeGallery.length - 1;
    }
    renderLightbox();
  }

  function showNext(){
    if(currentIndex < activeGallery.length - 1){
      currentIndex++;
    } else {
      currentIndex = 0;
    }
    renderLightbox();
  }

  closeBtn.addEventListener('click', closeLightbox);
  prevBtn.addEventListener('click', function(e){ e.stopPropagation(); showPrev(); });
  nextBtn.addEventListener('click', function(e){ e.stopPropagation(); showNext(); });

  modal.addEventListener('click', function(e){
    if(e.target === modal || e.target.classList.contains('lightbox-content')){
      closeLightbox();
    }
  });

  document.addEventListener('keydown', function(e){
    if(!modal.classList.contains('open')) return;
    if(e.key === 'Escape') closeLightbox();
    if(e.key === 'ArrowLeft') showPrev();
    if(e.key === 'ArrowRight') showNext();
  });

  // Touch Swipe for Lightbox
  var touchStartX = 0;
  var touchEndX = 0;
  modal.addEventListener('touchstart', function(e){
    touchStartX = e.changedTouches[0].screenX;
  }, {passive:true});
  modal.addEventListener('touchend', function(e){
    touchEndX = e.changedTouches[0].screenX;
    if(touchEndX < touchStartX - 40) showNext();
    if(touchEndX > touchStartX + 40) showPrev();
  }, {passive:true});

  // Initialize gallery items
  collectItems();
  window.collectLightboxItems = collectItems;
  if(window.applyLang){ window.applyLang(window.currentLang || 'en', true); }
})();

// ============ HOMEPAGE HIGHLIGHTS SLIDER ============
(function(){
  var track = document.querySelector('.highlights-track');
  var slides = document.querySelectorAll('.highlight-slide');
  var prevBtn = document.querySelector('.slider-nav-btn.prev');
  var nextBtn = document.querySelector('.slider-nav-btn.next');
  var dotsContainer = document.querySelector('.slider-dots');

  if(!track || !slides.length) return;

  var currentSlide = 0;
  var slideCount = slides.length;
  var autoPlayTimer = null;

  function getVisibleCount(){
    if(window.innerWidth <= 620) return 1;
    if(window.innerWidth <= 980) return 2;
    return 3;
  }

  function getMaxIndex(){
    var visible = getVisibleCount();
    return Math.max(0, slideCount - visible);
  }

  // Create dots
  if(dotsContainer){
    dotsContainer.innerHTML = '';
    var totalPages = Math.ceil(slideCount / getVisibleCount());
    for(var i = 0; i <= getMaxIndex(); i++){
      var dot = document.createElement('button');
      dot.className = 'slider-dot' + (i === 0 ? ' active' : '');
      var slideLabel = 'Go to slide ' + (i + 1);
      dot.setAttribute('data-en-aria-label', slideLabel);
      dot.setAttribute('aria-label', window.currentLang === 'ml' ? (window.getMalayalamTranslation(slideLabel) || slideLabel) : slideLabel);
      (function(idx){
        dot.addEventListener('click', function(){
          goToSlide(idx);
          resetAutoPlay();
        });
      })(i);
      dotsContainer.appendChild(dot);
    }
  }

  function updateDots(){
    var dots = document.querySelectorAll('.slider-dot');
    dots.forEach(function(d, idx){
      d.classList.toggle('active', idx === currentSlide);
    });
  }

  function goToSlide(index){
    var maxIdx = getMaxIndex();
    if(index < 0) index = 0;
    if(index > maxIdx) index = maxIdx;
    currentSlide = index;

    var slideWidth = slides[0].offsetWidth;
    var gap = 24;
    var offset = currentSlide * (slideWidth + gap);
    track.style.transform = 'translateX(-' + offset + 'px)';
    updateDots();
  }

  function nextSlide(){
    var maxIdx = getMaxIndex();
    if(currentSlide >= maxIdx){
      goToSlide(0);
    } else {
      goToSlide(currentSlide + 1);
    }
  }

  function prevSlide(){
    var maxIdx = getMaxIndex();
    if(currentSlide <= 0){
      goToSlide(maxIdx);
    } else {
      goToSlide(currentSlide - 1);
    }
  }

  if(prevBtn) prevBtn.addEventListener('click', function(){ prevSlide(); resetAutoPlay(); });
  if(nextBtn) nextBtn.addEventListener('click', function(){ nextSlide(); resetAutoPlay(); });

  function startAutoPlay(){
    stopAutoPlay();
    autoPlayTimer = setInterval(nextSlide, 5000);
  }

  function stopAutoPlay(){
    if(autoPlayTimer) clearInterval(autoPlayTimer);
  }

  function resetAutoPlay(){
    stopAutoPlay();
    startAutoPlay();
  }

  track.parentElement.addEventListener('mouseenter', stopAutoPlay);
  track.parentElement.addEventListener('mouseleave', startAutoPlay);

  window.addEventListener('resize', function(){
    goToSlide(currentSlide);
  });

  startAutoPlay();
})();

// ============ MOBILE QUICK SPONSOR & DONATE BAR ============
(function(){
  var select = document.getElementById('mqsSelect');
  var btn = document.getElementById('mqsDonateBtn');
  if(!select || !btn) return;

  var phone = '919841820668';
  function showNoEvents(){
    select.innerHTML = '';
    var option = document.createElement('option');
    option.value = '';
    option.disabled = true;
    option.selected = true;
    option.setAttribute('data-en', 'No events currently available');
    option.setAttribute('data-ta', 'தற்போது நிகழ்வுகள் எதுவும் இல்லை');
    option.setAttribute('data-ml', 'നിലവിൽ പരിപാടികളൊന്നും ലഭ്യമല്ല');
    option.textContent = 'No events currently available';
    select.appendChild(option);
    select.disabled = true;
    btn.disabled = true;
  }

  function showEvents(events){
    select.innerHTML = '';
    events.forEach(function(event){
      if(!event.id){
        console.warn('Skipping mobile sponsor event without a database ID:', event);
        return;
      }
      var header = window.getABASSEventHeader(event);
      var labelEn = window.getABASSEventHeaderLabel(header, 'en');
      var labelTa = window.getABASSEventHeaderLabel(header, 'ta');
      var labelMl = window.getABASSEventHeaderLabel(header, 'ml');
      var labelTe = window.getABASSEventHeaderLabel(header, 'te');
      var labelKn = window.getABASSEventHeaderLabel(header, 'kn');
      var option = document.createElement('option');
      option.value = event.id;
      option.setAttribute('data-title-en', labelEn);
      option.setAttribute('data-title-ta', labelTa);
      option.setAttribute('data-title-ml', labelMl);
      option.setAttribute('data-title-te', labelTe);
      option.setAttribute('data-title-kn', labelKn);
      option.setAttribute('data-en', labelEn);
      option.setAttribute('data-ta', labelTa);
      option.setAttribute('data-ml', labelMl);
      option.setAttribute('data-te', labelTe);
      option.setAttribute('data-kn', labelKn);
      option.textContent = ({ en: labelEn, ta: labelTa, ml: labelMl, te: labelTe, kn: labelKn })[window.currentLang || 'en'] || labelEn;
      select.appendChild(option);
    });

    if(!select.options.length){ showNoEvents(); return; }
    select.disabled = false;
    btn.disabled = false;
  }

  select.innerHTML = '';
  select.disabled = true;
  btn.disabled = true;
  if(window.ABASS_API && window.ABASS_API.getEvents){
    window.ABASS_API.getEvents({ upcomingOnly: true }).then(function(res){
      var events = res && Array.isArray(res.data) ? res.data.filter(function(event){ return event.published !== false; }) : [];
      showEvents(events);
    }).catch(function(err){
      console.warn('Mobile sponsor events sync error:', err);
      showNoEvents();
    });
  }else{
    showNoEvents();
  }

  btn.addEventListener('click', function(){
    var selectedOption = select.options[select.selectedIndex];
    if(!selectedOption || !selectedOption.value) return;
    var lang = window.currentLang || 'en';
    var eventTitle = selectedOption.getAttribute('data-title-' + ((lang === 'ta' || lang === 'ml') ? lang : 'en')) || selectedOption.textContent;
    var text = lang === 'ml'
      ? 'സ്വാമിയേ ശരണം അയ്യപ്പാ! ABASS-ൽ ' + eventTitle + ' സ്പോൺസർ ചെയ്യാൻ ആഗ്രഹിക്കുന്നു. ദയവായി വിവരങ്ങൾ പങ്കിടുക.'
      : (lang === 'ta'
        ? 'சுவாமியே சரணம் ஐயப்பா! நான் ABASS-ல் ' + eventTitle + ' ஸ்பான்சர் செய்ய விரும்புகிறேன். விவரங்களைப் பகிரவும்.'
        : 'Swamiye Saranam Ayyappa! I would like to sponsor ' + eventTitle + ' at ABASS. Please share the details.');
    window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(text), '_blank', 'noopener');
  });
})();

// ============ HERO IMAGE SLIDESHOW TRANSITION ============
(function(){
  var heroSlides = document.querySelectorAll('.hero-slideshow .hero-slide');
  var prevBtn = document.querySelector('.hero-nav-arrow.prev');
  var nextBtn = document.querySelector('.hero-nav-arrow.next');
  var dotsContainer = document.querySelector('.hero-slide-dots');
  var slideshow = document.querySelector('.hero-slideshow');

  if(!heroSlides.length || !slideshow) return;

  var currentIdx = 0;
  var slideTimer = null;

  // Build dots
  if(dotsContainer){
    dotsContainer.innerHTML = '';
    heroSlides.forEach(function(_, idx){
      var dot = document.createElement('button');
      dot.className = 'hero-dot' + (idx === 0 ? ' active' : '');
      var heroLabel = 'Go to hero slide ' + (idx + 1);
      dot.setAttribute('data-en-aria-label', heroLabel);
      dot.setAttribute('aria-label', window.currentLang === 'ml' ? (window.getMalayalamTranslation(heroLabel) || heroLabel) : heroLabel);
      dot.addEventListener('click', function(e){
        e.stopPropagation();
        goToHeroSlide(idx);
        resetHeroTimer();
      });
      dotsContainer.appendChild(dot);
    });
  }

  function updateHeroDots(){
    var dots = document.querySelectorAll('.hero-dot');
    dots.forEach(function(d, i){
      d.classList.toggle('active', i === currentIdx);
    });
  }

  function goToHeroSlide(idx){
    heroSlides[currentIdx].classList.remove('active');
    currentIdx = (idx + heroSlides.length) % heroSlides.length;
    heroSlides[currentIdx].classList.add('active');
    updateHeroDots();
  }

  function nextHeroSlide(){
    goToHeroSlide(currentIdx + 1);
  }

  function prevHeroSlide(){
    goToHeroSlide(currentIdx - 1);
  }

  if(prevBtn){
    prevBtn.addEventListener('click', function(e){
      e.stopPropagation();
      prevHeroSlide();
      resetHeroTimer();
    });
  }

  if(nextBtn){
    nextBtn.addEventListener('click', function(e){
      e.stopPropagation();
      nextHeroSlide();
      resetHeroTimer();
    });
  }

  function startHeroTimer(){
    stopHeroTimer();
    slideTimer = setInterval(nextHeroSlide, 4500);
  }

  function stopHeroTimer(){
    if(slideTimer) clearInterval(slideTimer);
  }

  function resetHeroTimer(){
    stopHeroTimer();
    startHeroTimer();
  }

  slideshow.addEventListener('mouseenter', stopHeroTimer);
  slideshow.addEventListener('mouseleave', startHeroTimer);

  startHeroTimer();
})();
