/**
 * ABASS — Supabase Client & Unified Data Service
 * Single source of truth for Events, Gallery, and Trustees.
 * Public member records are loaded from Supabase; no member profiles are embedded.
 */

(function () {
  'use strict';

  // 1. CONFIGURATION
  // Can be configured via window.SUPABASE_CONFIG, localStorage, or direct injection
  var storedUrl = '';
  var storedKey = '';
  try {
    storedUrl = window.localStorage.getItem('abass_supabase_url') || '';
    storedKey = window.localStorage.getItem('abass_supabase_anon_key') || '';
  } catch (e) {}

  var config = window.SUPABASE_CONFIG || {};
  var SUPABASE_URL = config.url || storedUrl || '';
  var SUPABASE_ANON_KEY = config.anonKey || storedKey || '';

  var client = null;
  if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY && SUPABASE_URL.indexOf('http') === 0) {
    try {
      client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    } catch (err) {
      console.warn('ABASS Supabase init error:', err);
    }
  }

  // 2. HELPER UTILITIES
  function todayStr() {
    var d = new Date();
    var m = d.getMonth() + 1;
    var day = d.getDate();
    return d.getFullYear() + '-' + (m < 10 ? '0' : '') + m + '-' + (day < 10 ? '0' : '') + day;
  }

  // Correction 05 — the Photo Gallery holds at most 25 photos.
  var GALLERY_LIMIT = 25;

  var FALLBACK_GALLERY = [
    { id:'g1', category:'padi-pooja', image_url:'assets/images/gallery-1.jpg', badge_en:'18 Padi Pooja', badge_ta:'18 படி பூஜை', title_en:'Grand 18 Padi Altar & Deepam Row', title_ta:'புனித 18 படிகள் பீடம் & தீப வரிசை', description_en:'Sacred 18 Padi Pooja altar adorned with glowing brass deepams, flowers and revered Guruswamys in prayer.', description_ta:'ஒளிரும் பித்தளை தீபங்கள், மலர்கள் மற்றும் பிரார்த்தனையில் இருக்கும் குருசுவாமிகளால் அலங்கரிக்கப்பட்ட புனித 18 படி பூஜை பீடம்.' },
    { id:'g2', category:'padi-pooja', image_url:'assets/images/gallery-2.jpg', badge_en:'18 Padi Pooja', badge_ta:'18 படி பூஜை', title_en:'Sri Dharma Sastha Sanctum Sanctorum', title_ta:'ஸ்ரீ தர்ம சாஸ்தா கருவறை & 18 படிகள்', description_en:'Majestic view of Sri Ayyappa Swami sanctum with 18 golden sacred steps and ornate floral decoration.', description_ta:'18 பொற்படிகள் மற்றும் அலங்கரிக்கப்பட்ட மலர் அலங்காரத்துடன் கூடிய ஸ்ரீ ஐயப்ப சுவாமி கருவறையின் கம்பீரமான காட்சி.' },
    { id:'g3', category:'vilakku-pooja', image_url:'assets/images/gallery-3.jpg', badge_en:'Thiru Vilakku Pooja', badge_ta:'திருவிளக்கு பூஜை', title_en:'Traditional Thiru Vilakku Pooja', title_ta:'மங்களகரமான திருவிளக்கு பூஜை', description_en:'Women devotees participating in sacred Vilakku Pooja with lighted lamps, chanting Lalitha Sahasranamam.', description_ta:'லலிதா சஹஸ்ரநாமம் பாராயணம் செய்து நெய் தீபங்கள் ஏற்றி விளக்கு பூஜையில் பங்கேற்கும் பெண் பக்தர்கள்.' },
    { id:'g4', category:'utsavam', image_url:'assets/images/gallery-4.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Devotees in Sannidhanam Prayer', title_ta:'சன்னிதானத்தில் பக்தி பரவசம்', description_en:'Ayyappa devotees gathered inside the mandapam with deep devotion during special Pooja chants.', description_ta:'சிறப்பு பூஜை மந்திரங்களின் போது ஆழ்ந்த பக்தியுடன் மண்டபத்தில் கூடியுள்ள ஐயப்ப பக்தர்கள்.' },
    { id:'g5', category:'utsavam', image_url:'assets/images/gallery-5.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Grand Utsavam Moorthi Alankaram', title_ta:'உற்சவ மூர்த்தி மகா அலங்காரம்', description_en:'Divine darshan of Lord Ayyappa decorated with fragrant jasmine, marigold and sacred jewels.', description_ta:'மல்லிகை, செவ்வந்தி மற்றும் ஆபரணங்களால் அலங்கரிக்கப்பட்ட ஐயப்ப சுவாமியின் அற்புத தரிசனம்.' },
    { id:'g6', category:'padi-pooja', image_url:'assets/images/gallery-6.jpg', badge_en:'18 Padi Pooja', badge_ta:'18 படி பூஜை', title_en:'Sacred 18 Steps Floral Radiance', title_ta:'18 படிகள் மலர் அலங்கார ஒளி', description_en:'Detailed view of the 18 steps adorned with rose petals, marigolds and lighted coconut lamps.', description_ta:'ரோஜா இதழ்கள், சாமந்தி மற்றும் ஏற்றிய தேங்காய் நெய் தீபங்களால் அலங்கரிக்கப்பட்ட 18 படிகள்.' },
    { id:'g7', category:'utsavam', image_url:'assets/images/gallery-7.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Bhajan & Namasankeerthanam', title_ta:'பஜனை & நாமசங்கீர்த்தனம்', description_en:'Soulful devotional singing by Guruswamys and devotees with traditional cymbals and percussion.', description_ta:'பாரம்பரிய தாள வாத்தியங்களுடன் குருசுவாமிகள் மற்றும் பக்தர்களின் பக்தி பரவச நாமசங்கீர்த்தனம்.' },
    { id:'g8', category:'utsavam', image_url:'assets/images/gallery-8.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Utsavam Procession & Darshan', title_ta:'உற்சவ ஊர்வலம் & தரிசனம்', description_en:'Majestic procession darshan of Lord Ayyappa with silver kavacham and royal umbrella.', description_ta:'வெள்ளி கவசம் மற்றும் ராஜ குடையுடன் ஐயப்ப சுவாமியின் ஊர்வல தரிசனம்.' },
    { id:'g9', category:'padi-pooja', image_url:'assets/images/gallery-9.jpg', badge_en:'18 Padi Pooja', badge_ta:'18 படி பூஜை', title_en:'Pushpanjali & Deeparadhana', title_ta:'புஷ்பாஞ்சலி & தீபாராதனை', description_en:'Sacred floral offerings and camphor Aarti offered to Lord Ayyappa during Mahapooja.', description_ta:'மகாபூஜையின் போது ஐயப்ப சுவாமிக்கு அர்ப்பணிக்கப்படும் மலர் புஷ்பாஞ்சலி மற்றும் கற்பூர ஆரத்தி.' },
    { id:'g10', category:'annadhaanam', image_url:'assets/images/gallery-10.jpg', badge_en:'Annadhaanam', badge_ta:'அன்னதானம்', title_en:'Annadhaanam & Seva Gathering', title_ta:'அன்னதானம் & சேவை ஒன்றுகூடல்', description_en:'Trust members and volunteers coordinating food distribution and seva arrangements.', description_ta:'உணவு வழங்கல் மற்றும் சேவை ஏற்பாடுகளை ஒருங்கிணைக்கும் அறக்கட்டளை உறுப்பினர்கள் மற்றும் தொண்டர்கள்.' },
    { id:'g11', category:'abhishekam', image_url:'assets/images/gallery-11.jpg', badge_en:'Maha Abhishekam', badge_ta:'மகா அபிஷேகம்', title_en:'Maha Abhishekam Darshan', title_ta:'மகா அபிஷேக தரிசனம்', description_en:'Holy abhishekam with milk, sandal paste, honey, vibhuti and sacred theertham.', description_ta:'பால், சந்தனம், தேன், விபூதி மற்றும் புனித தீர்த்தத்துடன் கூடிய புனித அபிஷேகம்.' },
    { id:'g12', category:'utsavam', image_url:'assets/images/gallery-12.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Thulasi & Vana Mala Alankaram', title_ta:'துளசி & வனமாலை அலங்காரம்', description_en:'Intricate close-up darshan of Lord Ayyappa draped in sacred Thulasi, Lotus and Bilva garlands.', description_ta:'புனித துளசி, தாமரை மற்றும் வில்வ மாலைகளால் அலங்கரிக்கப்பட்ட சுவாமியின் திவ்ய தரிசனம்.' },
    { id:'g13', category:'utsavam', image_url:'assets/images/gallery-13.jpg', badge_en:'Mandala Pooja & Utsavam', badge_ta:'மண்டல பூஜை & உற்சவம்', title_en:'Community Devotional Singing', title_ta:'கூட்டு பக்தி பாடல் வழிபாடு', description_en:'Congregation of Swamis and families participating in Harivarasanam and Mangala Aarti.', description_ta:'ஹரிவராசனம் மற்றும் மங்கள ஆரத்தியில் பங்கேற்கும் சுவாமிகள் மற்றும் குடும்பத்தினர்.' },
    { id:'g14', category:'padi-pooja', image_url:'assets/images/gallery-14.jpg', badge_en:'18 Padi Pooja', badge_ta:'18 படி பூஜை', title_en:'Seva Planning & Community Meet', title_ta:'சேவை திட்டமிடல் & பொதுக்குழு', description_en:'Trustees and community volunteers coordinating pilgrimage assistance and welfare drives.', description_ta:'யாத்திரை உதவி மற்றும் நலத்திட்டங்களை ஒருங்கிணைக்கும் அறக்கட்டளை உறுப்பினர்கள் மற்றும் தொண்டர்கள்.' },
    { id:'g15', category:'padi-pooja vilakku-pooja', image_url:'assets/images/gallery-15.jpg', badge_en:'Padi & Vilakku Pooja', badge_ta:'படி & விளக்கு பூஜை', title_en:'Annual Padi & Vilakku Pooja Notice', title_ta:'ஆண்டு படி பூஜை & விளக்கு பூஜை அறிவிப்பு', description_en:'Official ABASS Trust invitation poster detailing the programme schedule, Guruswamy honors and Annadhaanam.', description_ta:'நிகழ்ச்சி நிரல், குருசுவாமி கௌரவிப்பு மற்றும் அன்னதானம் குறித்த அதிகாரப்பூர்வ ABASS அழைப்பிதழ்.' },
    { id:'g16', category:'annadhaanam', image_url:'assets/images/gallery-16.jpg', badge_en:'Annadhaanam', badge_ta:'அன்னதானம்', title_en:'Grand Congregation & Prasadam', title_ta:'மகா சங்கமம் & பிரசாதம் வழங்குதல்', description_en:'Hundreds of devotees receiving sacred prasadam and Annadhaanam after completion of Mahapooja.', description_ta:'மகாபூஜை நிறைவடைந்த பின் புனித பிரசாதம் மற்றும் அன்னதானம் பெறும் நூற்றுக்கணக்கான பக்தர்கள்.' }
  ];

  // 4. PUBLIC API METHODS
  window.ABASS_API = {
    isConfigured: function () {
      return !!(client && SUPABASE_URL && SUPABASE_ANON_KEY);
    },

    getClient: function () {
      return client;
    },

    GALLERY_LIMIT: GALLERY_LIMIT,

    getConfig: function () {
      return { url: SUPABASE_URL, anonKey: SUPABASE_ANON_KEY };
    },

    setConfig: function (url, anonKey) {
      SUPABASE_URL = (url || '').trim();
      SUPABASE_ANON_KEY = (anonKey || '').trim();
      try {
        window.localStorage.setItem('abass_supabase_url', SUPABASE_URL);
        window.localStorage.setItem('abass_supabase_anon_key', SUPABASE_ANON_KEY);
      } catch (e) {}
      if (window.supabase && SUPABASE_URL && SUPABASE_ANON_KEY) {
        try {
          client = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        } catch (e) {
          console.error(e);
        }
      } else {
        client = null;
      }
      return client;
    },

    // --- EVENTS ---
    getEvents: async function (opts) {
      opts = opts || {};
      var upcomingOnly = opts.upcomingOnly !== false;
      var today = todayStr();
      var failed = false;

      if (client) {
        try {
          var query = client
            .from('events')
            .select('*')
            .eq('published', true)
            .order('display_order', { ascending: true });

          var res = await query;
          if (res.error) {
            failed = true;
            console.warn('ABASS: Supabase fetch events error:', res.error);
          } else if (res.data) {
            var data = res.data;
            if (upcomingOnly) {
              data = data.filter(function (e) {
                if (e.is_recurring) return true;
                var compDate = e.end_date || e.start_date;
                return !compDate || compDate >= today;
              });
            }
            return { data: data, fromFallback: false };
          }
        } catch (err) {
          failed = true;
          console.warn('ABASS: Supabase fetch events error:', err);
        }
      }

      // `failed` lets callers keep what they already show instead of wiping it
      return { data: [], fromFallback: false, failed: failed || !client };
    },

    // --- GALLERY ---
    getGallery: async function (opts) {
      opts = opts || {};
      var category = opts.category || 'all';

      if (client) {
        try {
          var query = client
            .from('gallery_items')
            .select('*')
            .eq('published', true)
            .order('display_order', { ascending: true });

          var res = await query;
          if (!res.error && res.data && res.data.length > 0) {
            var data = res.data;
            if (category !== 'all') {
              data = data.filter(function (item) {
                return item.category && item.category.indexOf(category) !== -1;
              });
            }
            return { data: data.slice(0, GALLERY_LIMIT), fromFallback: false };
          }
        } catch (err) {
          console.warn('ABASS: Supabase fetch gallery error, using fallback:', err);
        }
      }

      // Fallback
      var items = FALLBACK_GALLERY;
      if (category !== 'all') {
        items = items.filter(function (item) {
          return item.category && item.category.indexOf(category) !== -1;
        });
      }
      return { data: items.slice(0, GALLERY_LIMIT), fromFallback: true };
    },

    // --- LATEST UPDATES (correction 09) ---
    // Returns EVERY published update, newest first. Nothing is ever dropped
    // automatically, so the complete history is always available.
    getUpdates: async function () {
      if (!client) return { data: [], error: null };
      try {
        var res = await client
          .from('updates')
          .select('*')
          .eq('published', true)
          .order('published_at', { ascending: false })
          .order('created_at', { ascending: false });
        if (res.error) {
          console.warn('ABASS: Supabase fetch updates error:', res.error);
          return { data: [], error: res.error };
        }
        return { data: res.data || [], error: null };
      } catch (err) {
        console.warn('ABASS: Supabase fetch updates error:', err);
        return { data: [], error: err };
      }
    },

    // --- MEMBERS (TRUSTEES) ---
    getMembers: async function (opts) {
      opts = opts || {};
      var group = opts.group || 'all';
      var category = opts.category || null;

      if (!client) return { data: [], fromFallback: false, error: null };

      try {
        var query = client
          .from('members')
          .select('*')
          .eq('active', true)
          .order('display_order', { ascending: true })
          .order('name_en', { ascending: true });

        if (category) {
          query = query.eq('category', category);
        } else if (group !== 'all') {
          query = query.eq('group_type', group);
        }

        var res = await query;
        if (res.error) {
          console.error('ABASS: Supabase fetch members error:', res.error);
          return { data: [], fromFallback: false, error: res.error };
        }

        var mapped = (res.data || []).map(function (m) {
          return {
            id: m.id,
            name: m.name_en,
            name_en: m.name_en,
            name_ta: m.name_ta,
            role: m.role_en,
            role_en: m.role_en,
            role_ta: m.role_ta,
            category: m.category,
            group: m.group_type,
            group_type: m.group_type,
            initials: m.initials,
            featured: !!m.featured,
            family_members: m.family_members,
            gothram: m.gothram,
            nakshatram_star: m.nakshatram_star,
            rasi: m.rasi,
            mobile_number: m.mobile_number,
            photo_url: m.photo_url,
            photo_path: m.photo_path
          };
        });
        return { data: mapped, fromFallback: false, error: null };
      } catch (err) {
        console.error('ABASS: Supabase fetch members error:', err);
        return { data: [], fromFallback: false, error: err };
      }
    },

    // --- SINGLE MEMBER BY ID ---
    getMemberById: async function (id) {
      if (!id) return { data: null, error: 'No ID provided' };
      if (!client) return { data: null, fromFallback: false, error: null };

      try {
        var res = await client
          .from('members')
          .select('*')
          .eq('id', id)
          .eq('active', true)
          .maybeSingle();

        if (res.error) {
          console.error('ABASS: Supabase member profile fetch error:', res.error);
          return { data: null, fromFallback: false, error: res.error };
        }

        var m = res.data;
        return {
          data: m ? {
            id: m.id,
            name: m.name_en,
            name_en: m.name_en,
            name_ta: m.name_ta,
            role: m.role_en,
            role_en: m.role_en,
            role_ta: m.role_ta,
            category: m.category,
            group: m.group_type,
            group_type: m.group_type,
            initials: m.initials,
            featured: !!m.featured,
            family_members: m.family_members,
            gothram: m.gothram,
            nakshatram_star: m.nakshatram_star,
            rasi: m.rasi,
            mobile_number: m.mobile_number,
            photo_url: m.photo_url,
            photo_path: m.photo_path
          } : null,
          fromFallback: false,
          error: null
        };
      } catch (err) {
        console.error('ABASS: Supabase member profile fetch error:', err);
        return { data: null, fromFallback: false, error: err };
      }
    }
  };
})();
