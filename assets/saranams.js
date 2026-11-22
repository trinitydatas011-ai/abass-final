/* 108 Ayyappa Sarana Gosham calls. Transliteration follows the widely used
   Tamil list; regional spellings can vary. */
(function () {
  'use strict';

  var calls = [
    'Swamiye',
    'Harihara Suthane',
    'Kannimoola Ganapathi Bhagawane',
    'Shakthi Vadivelan Sodharane',
    'Malikappurathu Manjammadevi Lokamathave',
    'Vaavar Swamiye',
    'Karuppanna Swamiye',
    'Periya Kadutha Swamiye',
    'Siriya Kadutha Swamiye',
    'Vanadevatha Maare',
    'Durga Bhagavathi Maare',
    'Achchan Kovil Arase',
    'Anaatha Rakshakane',
    'Annadhaana Prabhuve',
    'Achcham Thavirpavane',
    'Ambalathu Arasane',
    'Abhaya Dayakane',
    'Ahandai Azhippavane',
    'Ashtasiddhi Dayakane',
    'Andinorai Aadarikkum Deivame',
    'Azhuthayil Vaasane',
    'Aaryankaavu Ayyaave',
    'Aapath Baandhavane',
    'Ananda Jyothiye',
    'Aatma Swaroopiye',
    'Aanaimukhan Thambiye',
    'Irumudi Priyane',
    'Innalai Theerppavane',
    'Igapara Suka Daayakane',
    'Idaya Kamala Vaasane',
    'Eedillaa Inbam Alippavane',
    'Umaiyaval Baalakane',
    'Umaikku Arul Purindavane',
    'Uzhvinai Agatruvone',
    'Ukkam Alippavane',
    'Engum Niraindhone',
    'Ennillaa Roopane',
    'En Kula Deivame',
    'En Guru Naathane',
    'Erumeli Vaazhum Kiraata Saasthave',
    'Engum Nirainda Naada Brahmame',
    'Ellorkkum Arul Puribavane',
    'Etrumaanoorappan Magane',
    'Ekaanta Vaasiye',
    'Ezhaikkarul Puriyum Eesane',
    'Aindumalai Vaasane',
    'Aiyyangal Theerppavane',
    'Oppillaa Maanikkame',
    'Omkaara Parabrahmame',
    'Kaliyuga Varadane',
    'Kan Kanda Deivame',
    'Kambankudikku Udaiya Naathane',
    'Karunaa Samudrame',
    'Karpoora Jyothiye',
    'Sabarigiri Vaasane',
    'Sathru Samhaara Moorthiye',
    'Sharanaagatha Rakshakane',
    'Sharana Gosha Priyane',
    'Shabarikku Arul Purindavane',
    'Shambhu Kumaarane',
    'Sathya Swaroopane',
    'Sankatam Theerppavane',
    'Sanchalam Azhippavane',
    'Shanmukha Sodarane',
    'Dhanvanthari Moorthiye',
    'Nambinorai Kaakkum Deivame',
    'Narthana Priyane',
    'Pandhala Raajakumaarane',
    'Pambai Baalakane',
    'Parasuraama Poojithane',
    'Bhaktha Jana Rakshakane',
    'Bhaktha Vathsalaane',
    'Paramashivan Puthirane',
    'Pambaa Vaasane',
    'Parama Dhayaalane',
    'Manikanda Porule',
    'Makara Jyothiye',
    'Vaikkathu Appan Magane',
    'Kaanaka Vaasane',
    'Kulathupuzha Baalakane',
    'Guruvayurappan Magane',
    'Kaivalya Pada Daayakane',
    'Jaathi Matha Bedam Illaathavane',
    'Shivavishnu Aikya Swaroopane',
    'Sevippavarkku Aananda Moorthiye',
    'Dushtar Bhayam Neekkuvone',
    'Devaadi Devane',
    'Devargal Thuyaram Theerthavane',
    'Devendra Poojithane',
    'Naaraayanan Maindane',
    'Neyyabhisheka Priyane',
    'Pranava Swaroopane',
    'Paapa Samhaara Moorthiye',
    'Paayaasanna Priyane',
    'Vanpuli Vaahanane',
    'Varapradaayakane',
    'Bhagavathothamane',
    'Ponnambala Vaasane',
    'Mohini Suthane',
    'Mohana Roopane',
    'Villan Villaali Veerane',
    'Veera Manikandane',
    'Sadguru Naathane',
    'Sarva Roga Nivaarakane',
    'Sachchidaananda Swaroopane',
    'Sarvaabheeshta Daayakane',
    'Saasvathapadam Alippavane',
    'Pathinettam Padikkudaiya Naathane'
  ];

  var grid = document.querySelector('#saranam-list');
  if (!grid) return;

  var fragment = document.createDocumentFragment();
  calls.forEach(function (call, index) {
    var item = document.createElement('div');
    item.className = 'saranam-item';
    item.setAttribute('role', 'listitem');
    var number = document.createElement('span');
    number.className = 's-num';
    number.textContent = String(index + 1);
    var text = document.createElement('span');
    text.className = 's-text';
    text.textContent = call + ' Saranam Ayyappa';
    item.appendChild(number);
    item.appendChild(text);
    fragment.appendChild(item);
  });
  grid.appendChild(fragment);
})();
