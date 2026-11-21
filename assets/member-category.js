(function () {
  'use strict';

  // Correction 06 asks for photos to appear only in the Photo Gallery. Committee
  // member portraits are kept by default; set this to false (or add
  // <script>window.ABASS_SHOW_MEMBER_PHOTOS=false</script> before this file)
  // to list members by name and designation only.
  var SHOW_MEMBER_PHOTOS = window.ABASS_SHOW_MEMBER_PHOTOS !== false;

  function setMessage(container, message, tamilMessage) {
    container.replaceChildren();
    container.setAttribute('aria-busy', 'false');
    var status = document.createElement('p');
    status.className = 'member-directory-message';
    status.setAttribute('data-en', message);
    if (tamilMessage) status.setAttribute('data-ta', tamilMessage);
    status.textContent = document.documentElement.lang === 'ta' && tamilMessage ? tamilMessage : message;
    container.appendChild(status);
  }

  function addMemberCard(container, member) {
    var card = document.createElement('article');
    var photoFrame = document.createElement('div');
    var image = document.createElement('img');
    var content = document.createElement('div');
    var name = document.createElement('h2');

    card.className = 'member-directory-card';
    photoFrame.className = 'member-directory-photo';
    image.src = member.photo_url;
    image.alt = member.name_en || '';
    image.loading = 'lazy';
    image.decoding = 'async';
    image.addEventListener('error', function () {
      var unavailable = document.createElement('div');
      unavailable.className = 'photo-unavailable';
      unavailable.setAttribute('data-en', 'Photo unavailable');
      unavailable.setAttribute('data-ta', 'புகைப்படம் கிடைக்கவில்லை');
      unavailable.textContent = document.documentElement.lang === 'ta' ? 'புகைப்படம் கிடைக்கவில்லை' : 'Photo unavailable';
      photoFrame.replaceChildren(unavailable);
    }, { once: true });

    content.className = 'member-directory-content';
    name.setAttribute('data-en', member.name_en || '');
    if (member.name_ta) name.setAttribute('data-ta', member.name_ta);
    name.textContent = document.documentElement.lang === 'ta' && member.name_ta ? member.name_ta : (member.name_en || '');
    content.appendChild(name);

    if (member.role_en || member.role_ta) {
      var designation = document.createElement('p');
      if (member.role_en) designation.setAttribute('data-en', member.role_en);
      if (member.role_ta) designation.setAttribute('data-ta', member.role_ta);
      designation.textContent = document.documentElement.lang === 'ta' && member.role_ta
        ? member.role_ta
        : (member.role_en || member.role_ta);
      content.appendChild(designation);
    }

    if (SHOW_MEMBER_PHOTOS) {
      photoFrame.appendChild(image);
      card.appendChild(photoFrame);
    } else {
      card.classList.add('member-directory-card-nophoto');
    }
    card.appendChild(content);
    container.appendChild(card);
  }

  async function loadCategoryMembers() {
    var container = document.getElementById('member-category-list');
    var category = document.body.getAttribute('data-member-category');
    if (!container) return;

    if (!category || !window.ABASS_API || typeof window.ABASS_API.getMembers !== 'function') {
      setMessage(container, 'Member records could not be loaded. Please try again later.');
      return;
    }

    try {
      var result = await window.ABASS_API.getMembers({ category: category });
      if (result && result.error) {
        console.error('Member category load error:', result.error);
        setMessage(container, 'Member records could not be loaded. Please try again later.');
        return;
      }

      var members = result && Array.isArray(result.data) ? result.data : [];
      members = members.filter(function (member) {
        return member.active !== false && (!SHOW_MEMBER_PHOTOS || !!member.photo_url);
      });

      if (!members.length) {
        setMessage(
          container,
          'No members have been added to this category yet.',
          'இந்த வகையில் இதுவரை உறுப்பினர்கள் சேர்க்கப்படவில்லை.'
        );
        return;
      }

      container.replaceChildren();
      members.forEach(function (member) {
        addMemberCard(container, member);
      });
      container.setAttribute('aria-busy', 'false');

      if (typeof window.applyLang === 'function') {
        window.applyLang(document.documentElement.lang || 'en', true);
      }
    } catch (error) {
      console.error('Member category load error:', error);
      setMessage(container, 'Member records could not be loaded. Please try again later.');
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', loadCategoryMembers);
  } else {
    loadCategoryMembers();
  }
})();
