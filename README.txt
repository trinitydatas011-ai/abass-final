ABASS COMPLETE WEBSITE

Static multi-page website generated from the supplied ABASS landing page.

Pages:
- index.html — Home / complete landing page
- about.html — About ABASS
- objects.html — Objects of the Trust
- events.html — Events & Pooja
- devotional.html — Pooja & Devotional Library
- donations.html — Donations & Causes
- media.html — Media
- transparency.html — Board of Trustees & Trust Records
- members-office-bearers.html — Office Bearers
- members-life-member.html — Life Members
- members.html — Members
- members-apex-committee.html — Apex Committee
- members-core-committee.html — Core Committee
- contact.html — Connect + WhatsApp enquiry form

Shared assets:
- assets/styles.css
- assets/script.js

The English/Tamil switch is retained from the source page. The contact enquiry form opens WhatsApp using the configured ABASS contact number.

Member profiles are managed in the existing Admin Portal under Trustees & Committee.
Run the updated supabase-schema.sql in Supabase SQL Editor before using this
workflow. It provisions the member-photo storage bucket and clears old member
records without a category so the public pages start empty; add new profiles
through the Admin Panel.

Run locally by opening index.html or serving this folder with any static web server.

================================================================
DEVOTIONAL UPDATE — September 2026
================================================================

WHAT CHANGED

1. Mobile hero badge fixed
   The "Temple Service, Food & Education for All" badge was a fixed
   104px circle (78px on phones) holding a full sentence, with an
   inline font-size override. The text spilled outside the ring.
   It is now a self-sizing gold ribbon centred under the image.

2. Lord Ayyappa image now leads the mobile hero
   On phones the darshan panel moves above the headline text, goes
   near full-width (was a 260px thumbnail), and carries a caption
   overlay: "Divine Darshan / Lord Ayyappa - devotion carried
   forward through every generation". The caption follows the
   slideshow and switches with the EN/TA language toggle.

3. New "Seva Sankalpam" sponsor dropdown section
   Added to index.html (immediately after the hero, so it is the
   second section on mobile) and to donations.html.
   - Grouped dropdown of 11 sevas, bilingual
   - Live detail card: amount, description, what the sponsor receives
   - Quick amount chips plus an "other amount" field
   - Sankalpam fields, sends a formatted WhatsApp message
   Upcoming event records and their public-card details are managed
   through the existing Admin Portal Events tab.

4. Devotional styling across all 10 pages
   - Google Fonts (Cinzel / Work Sans / Noto Tamil) were referenced
     in the CSS but never actually loaded. Now linked on every page.
   - Scrolling "Swamiye Saranam Ayyappa" chant strip under the header
   - Kolam dot texture, gold ornamental dividers, garland-gradient
     image frames, breathing lamp icons, halo glows

NEW FILES
   assets/_devotional.css   all new styling and mobile fixes
   assets/_devotional.js    hero caption + seva sponsor dropdown
Both load after the originals, so styles.css and script.js are
untouched and the changes can be removed by deleting the two
<link>/<script> tags.

CONTACT NUMBER
   The WhatsApp number 919841820668 appears in assets/script.js and
   assets/_devotional.js (PHONE constant). Change it in both places.

TESTED
   Chromium at 360px, 390px, 768px and 1440px across all 10 pages:
   no horizontal overflow, no JavaScript errors, EN/TA switching
   verified on the new dropdown and hero caption.

================================================================
REVIEW ROUND — 19 September 2026
================================================================
1. Header name on every page now reads "Abhath Bhanthavan Ayyappa
   Seva Sangham" (was "Ayyappa Seva Sangham Trust").
2. "80 years" removed: About-page hero wording, and the 80-year
   emblem retouched out of assets/images/gallery-15.jpg (the poster).
3. Seva Sankalpam now loads upcoming events from the shared Supabase
   events table. Published event records also populate the event cards,
   contribution form and mobile quick sponsor selector.
4. All donation amounts removed (Sankalpam form, Donations page cards,
   WhatsApp messages). The Events-page "Contribute" form still has a
   typed "Amount" field for reconciliation.
5. Home page: duplicate giving-journey block removed (it lives on
   donations.html). Mobile bar options = General, Social Welfare and
   the upcoming events.
6. Objects of the Trust: all 45 deed clauses, grouped in 6 categories
   (objects.html full list; home shows summaries + links). Clauses
   (x) and (z) are identical in the deed and shown together.
7. Media: filters are now event folders (18 Padi Pooja, Thiru Vilakku
   Pooja, Annadhaanam, Maha Abhishekam, Mandala Pooja & Utsavam).
   A photo can sit in more than one folder via data-category.

================================================================
REVIEW ROUND — 21 September 2026
================================================================
1. Mobile hero: removed the `order:-1` rule that made the darshan
   image lead on phones. Content (title, tagline, description,
   buttons) now shows first, the image slideshow second — same fix
   applied to the Seva Sankalpam panel (form now leads, photo follows).
2. Hero tagline ("Ayyappa Seva • Devotion • Service") is now bold
   and slightly larger for stronger visual presence.
3. "Sankalpam details" section label renamed to "Donor details"
   (index.html + donations.html form, and the donations-page giving
   journey step "Provide Devotional Sankalpam Details" -> "Provide
   Donor Details"). The word "sankalpam" itself is kept elsewhere
   where it refers to the actual pooja ritual.
4. Seva Sankalpam form no longer opens WhatsApp on submit. It now
   shows an on-page "Thank you" confirmation and resets the form;
   nothing is sent automatically. A Trustee is expected to follow up
   with the devotee directly. The PHONE constant and wa.me call were
   removed from assets/_devotional.js accordingly. (The separate
   "Contribute Towards an Event" WhatsApp form on events.html is
   unchanged.)

================================================================
REVIEW ROUND — 15 November 2026 (ABASS_Website.docx)
================================================================
1. Registered office now reads in full, as per the document:
   "No. 25/27, Sri Jaya Krishana Lakshmi Nivas, Pachayiappan Colony
   2nd Cross Street, Zamin Pallavaram, Chennai – 600 043"
   (index, about, transparency, contact; EN + TA).
2. Heritage text: pooja on request now states "from groups of
   devotees, including non-members, in and around Chennai city,
   Tamil Nadu" (about.html; EN + TA).
Already matching the document, no change needed: vision banner,
"80 years" removed, kaavi background, Apex (19) and Present (35)
committee lists, events + dates, event contribution form fields
(name, mobile, place, PIN, amount), admin member database fields.

==========================================================================
WEBSITE CORRECTIONS — 19 NOVEMBER 2026
==========================================================================
STEP 1 (required, once): open Supabase -> SQL Editor and run
        supabase-migration-2026-11.sql
It adds: event map/details/Telugu/Kannada columns, trustee mobile_number,
the "Latest Updates" table, and a database rule that stops the Photo
Gallery exceeding 25 photos. (Already included at the end of
supabase-schema.sql for brand-new installs.) Run it BEFORE using the new
Admin Panel fields, otherwise saving an event / member will show a message
telling you to run it.

 01  OTHER EVENT card ........ assets/events.js (always the last card; also
                               the last option of the Select Event dropdown)
 02  Admin <-> website sync .. Upcoming Events cards and the Select Event
                               dropdown are built from ONE Supabase list;
                               new events show above OTHER EVENT with no
                               website edit. Refreshes every 60 s / on tab focus.
 03  Telugu + Kannada ........ buttons in every page header; dictionaries in
                               assets/telugu-translations.js and
                               assets/kannada-translations.js (English text is
                               the key; anything missing shows in English).
                               Admin events/updates have optional Telugu and
                               Kannada fields.
 04  Date, Location, Maps .... labelled Location / Date rows + "Open in Google
                               Maps" on every card; Admin: Location, Date,
                               optional Google Maps link (else auto-searches the
                               Location text).
 05  Gallery limit 25 ........ Admin counter, Add disabled at 25, re-checked at
                               save, enforced by the database. Delete frees a slot.
 06  Photos only in Gallery .. all other photos removed from every page. Kept on
                               purpose: site logos/seal, favicon, ABASS emblem on
                               About, and the payment QR code (not photos).
                               Committee member portraits are kept — set
                               window.ABASS_SHOW_MEMBER_PHOTOS = false (top of
                               assets/member-category.js) to hide them too.
 07  "CORE COMMITTEE" -> "COMMITTEE" (tab, page heading, admin label).
 08  Trustee Mobile Number ... Admin member form + table; shown (tap-to-call) on
                               the trustee profile page (trustee.html).
 09  Latest Updates .......... scrolling panel in the home-page hero; Admin ->
                               "Latest Updates" tab. Every published update is
                               kept (newest first); pause button; no auto-scroll
                               for reduced-motion users.
 10  Padi / Vilakku details .. "View details" opens an expanded view (headings,
                               bullets, embedded map). Built-in text works at once;
                               editable per event in Admin ("Expanded details").
