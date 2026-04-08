/**
 * TechMaat CRM Agent
 * Relatiebeheer, follow-ups, notities en contactgeschiedenis.
 */
(function() {
  var technici = [];
  var bedrijven = [];
  var koppelingen = [];
  var notities = [];
  var isDemo = true;
  var activeTab = 'alle';
  var selectedContact = null;
  var NOTITIES_KEY = 'tm_crm_notities';

  function loadNotities() {
    try {
      var raw = localStorage.getItem(NOTITIES_KEY);
      notities = raw ? JSON.parse(raw) : [];
    } catch(e) { notities = []; }
  }

  function saveNotities() {
    localStorage.setItem(NOTITIES_KEY, JSON.stringify(notities));
  }

  function addNotitie(contactId, contactType, tekst) {
    var n = {
      id: 'n-' + Date.now(),
      contact_id: contactId,
      contact_type: contactType,
      tekst: tekst,
      datum: new Date().toISOString(),
      auteur: 'Admin'
    };
    notities.unshift(n);
    saveNotities();
    return n;
  }

  function getNotitiesVoor(contactId) {
    return notities.filter(function(n) { return n.contact_id === contactId; });
  }

  function timeAgo(dateStr) {
    var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Zojuist';
    if (diff < 3600) return Math.floor(diff / 60) + ' min geleden';
    if (diff < 86400) return Math.floor(diff / 3600) + ' uur geleden';
    if (diff < 172800) return 'Gisteren';
    return Math.floor(diff / 86400) + ' dagen geleden';
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var d = new Date(dateStr);
    return d.getDate() + '-' + (d.getMonth() + 1) + '-' + d.getFullYear();
  }

  function getFollowUps() {
    var items = [];

    // Technici without koppelingen = needs follow-up
    technici.forEach(function(t) {
      var hasKoppeling = koppelingen.some(function(k) { return k.technicus_id === t.id; });
      var daysSince = Math.floor((Date.now() - new Date(t.created_at).getTime()) / 86400000);
      if (!hasKoppeling && daysSince >= 3) {
        items.push({
          type: 'technicus',
          contact: t,
          reden: 'Nog niet gekoppeld (' + daysSince + ' dagen)',
          urgentie: daysSince >= 7 ? 'hoog' : 'normaal'
        });
      }
    });

    // Bedrijven without koppelingen
    bedrijven.forEach(function(b) {
      var hasKoppeling = koppelingen.some(function(k) { return k.bedrijf_id === b.id; });
      var daysSince = Math.floor((Date.now() - new Date(b.created_at).getTime()) / 86400000);
      if (!hasKoppeling && daysSince >= 3) {
        items.push({
          type: 'bedrijf',
          contact: b,
          reden: 'Nog niet gekoppeld (' + daysSince + ' dagen)',
          urgentie: daysSince >= 7 ? 'hoog' : 'normaal'
        });
      }
    });

    // Koppelingen in_afwachting for too long
    koppelingen.forEach(function(k) {
      if (k.status === 'in_afwachting') {
        var daysSince = Math.floor((Date.now() - new Date(k.created_at).getTime()) / 86400000);
        if (daysSince >= 2) {
          items.push({
            type: 'koppeling',
            contact: k,
            reden: 'Koppeling in afwachting (' + daysSince + ' dagen)',
            urgentie: daysSince >= 5 ? 'hoog' : 'normaal'
          });
        }
      }
    });

    items.sort(function(a, b) {
      if (a.urgentie === 'hoog' && b.urgentie !== 'hoog') return -1;
      if (a.urgentie !== 'hoog' && b.urgentie === 'hoog') return 1;
      return 0;
    });

    return items;
  }

  function getAllContacts() {
    var contacts = [];
    technici.forEach(function(t) {
      contacts.push({
        id: t.id,
        type: 'technicus',
        naam: t.naam || 'Onbekend',
        email: t.email || '',
        telefoon: t.telefoon || '',
        locatie: t.woonplaats || '',
        detail: (t.specialismen || []).join(', '),
        status: t.status || 'nieuw',
        created_at: t.created_at,
        raw: t
      });
    });
    bedrijven.forEach(function(b) {
      contacts.push({
        id: b.id,
        type: 'bedrijf',
        naam: b.bedrijfsnaam || 'Onbekend',
        email: b.email || '',
        telefoon: b.telefoon || '',
        locatie: b.locatie || '',
        detail: (b.branche || '') + (b.type_werk ? ' — ' + b.type_werk : ''),
        status: b.status || 'nieuw',
        created_at: b.created_at,
        raw: b
      });
    });
    contacts.sort(function(a, b) { return new Date(b.created_at) - new Date(a.created_at); });
    return contacts;
  }

  function renderFollowUpCard(item) {
    var urgClass = item.urgentie === 'hoog' ? 'border-red-400' : 'border-yellow-400';
    var urgBadge = item.urgentie === 'hoog'
      ? '<span class="text-[10px] font-bold bg-red-100 text-red-600 px-2 py-0.5 rounded-full">Urgent</span>'
      : '<span class="text-[10px] font-bold bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full">Follow-up</span>';

    var naam = '';
    var icon = '';
    if (item.type === 'technicus') {
      naam = item.contact.naam || 'Onbekend';
      icon = 'person';
    } else if (item.type === 'bedrijf') {
      naam = item.contact.bedrijfsnaam || 'Onbekend';
      icon = 'business';
    } else {
      naam = (item.contact.technicus_naam || '') + ' ↔ ' + (item.contact.bedrijf_naam || '');
      icon = 'swap_horiz';
    }

    return '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 ' + urgClass + '">' +
      '<div class="flex items-start justify-between mb-2">' +
      '<div class="flex items-center gap-2">' +
      '<span class="material-symbols-outlined text-tm-blue text-lg">' + icon + '</span>' +
      '<span class="text-sm font-bold text-tm-blue">' + naam + '</span>' +
      '</div>' +
      urgBadge +
      '</div>' +
      '<p class="text-xs text-tm-text-light">' + item.reden + '</p>' +
      '</div>';
  }

  function renderContactCard(contact) {
    var isTech = contact.type === 'technicus';
    var badgeColor = isTech ? 'bg-tm-orange' : 'bg-tm-blue';
    var badgeText = isTech ? 'Technicus' : 'Bedrijf';
    var nCount = getNotitiesVoor(contact.id).length;

    return '<div class="bg-white rounded-xl p-4 shadow-sm border border-tm-muted hover:border-tm-orange/50 transition-colors cursor-pointer" onclick="CRMAgent.openContact(\'' + contact.id + '\', \'' + contact.type + '\')">' +
      '<div class="flex items-start justify-between mb-2">' +
      '<div class="flex items-center gap-2">' +
      '<span class="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full ' + badgeColor + '">' + badgeText + '</span>' +
      '<span class="text-sm font-bold text-tm-blue">' + contact.naam + '</span>' +
      '</div>' +
      (nCount > 0 ? '<span class="text-[10px] font-bold bg-tm-light text-tm-blue px-2 py-0.5 rounded-full">' + nCount + ' notities</span>' : '') +
      '</div>' +
      '<p class="text-xs text-tm-text-light">' + contact.email + (contact.telefoon ? ' &middot; ' + contact.telefoon : '') + '</p>' +
      '<div class="flex items-center justify-between mt-2">' +
      '<span class="text-[11px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + contact.detail + '</span>' +
      '<span class="text-[10px] text-tm-text-light">' + timeAgo(contact.created_at) + '</span>' +
      '</div>' +
      '</div>';
  }

  function openContact(contactId, contactType) {
    var contact = null;
    if (contactType === 'technicus') {
      contact = technici.find(function(t) { return t.id === contactId; });
    } else {
      contact = bedrijven.find(function(b) { return b.id === contactId; });
    }
    if (!contact) return;

    selectedContact = { data: contact, type: contactType };

    var existing = document.getElementById('crm-detail-modal');
    if (existing) existing.remove();

    var naam = contactType === 'technicus' ? (contact.naam || '') : (contact.bedrijfsnaam || '');
    var contactNotities = getNotitiesVoor(contactId);

    // Contact koppelingen
    var contactKoppel = koppelingen.filter(function(k) {
      return contactType === 'technicus' ? k.technicus_id === contactId : k.bedrijf_id === contactId;
    });

    var modal = document.createElement('div');
    modal.id = 'crm-detail-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto py-8';

    var detailHtml = '<div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden max-h-[85vh] flex flex-col">' +
      '<div class="bg-tm-blue px-6 py-4 flex items-center justify-between flex-shrink-0">' +
      '<h3 class="font-headline font-bold text-white text-lg">' + naam + '</h3>' +
      '<button onclick="document.getElementById(\'crm-detail-modal\').remove()" class="text-white/70 hover:text-white"><span class="material-symbols-outlined">close</span></button>' +
      '</div>' +
      '<div class="px-6 py-5 overflow-y-auto">';

    // Contact info
    detailHtml += '<div class="grid grid-cols-2 gap-3 mb-5">';
    if (contactType === 'technicus') {
      detailHtml += '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Email</p><p class="text-sm">' + (contact.email || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Telefoon</p><p class="text-sm">' + (contact.telefoon || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Woonplaats</p><p class="text-sm">' + (contact.woonplaats || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Beschikbaarheid</p><p class="text-sm">' + (contact.beschikbaarheid || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Uurtarief</p><p class="text-sm">&euro;' + (contact.uurtarief || '0') + '/uur</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Aangemeld</p><p class="text-sm">' + formatDate(contact.created_at) + '</p></div>';
    } else {
      detailHtml += '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Email</p><p class="text-sm">' + (contact.email || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Telefoon</p><p class="text-sm">' + (contact.telefoon || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Contactpersoon</p><p class="text-sm">' + (contact.contactpersoon || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Locatie</p><p class="text-sm">' + (contact.locatie || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Branche</p><p class="text-sm">' + (contact.branche || '-') + '</p></div>' +
        '<div><p class="text-[10px] font-bold text-tm-text-light uppercase tracking-wider">Aangemeld</p><p class="text-sm">' + formatDate(contact.created_at) + '</p></div>';
    }
    detailHtml += '</div>';

    // Koppelingen
    if (contactKoppel.length > 0) {
      detailHtml += '<div class="mb-5">' +
        '<h4 class="text-xs font-bold text-tm-blue uppercase tracking-wider mb-2">Koppelingen (' + contactKoppel.length + ')</h4>';
      contactKoppel.forEach(function(k) {
        var statusColors = {
          'in_afwachting': 'bg-yellow-100 text-yellow-700',
          'geaccepteerd': 'bg-green-100 text-green-700',
          'afgewezen': 'bg-red-100 text-red-600',
          'voltooid': 'bg-tm-light text-tm-blue'
        };
        var partner = contactType === 'technicus' ? (k.bedrijf_naam || '') : (k.technicus_naam || '');
        detailHtml += '<div class="flex items-center justify-between py-2 border-b border-tm-muted/50">' +
          '<div><p class="text-sm font-medium">' + partner + '</p><p class="text-[11px] text-tm-text-light">Score: ' + (k.score || 0) + '%</p></div>' +
          '<span class="text-[10px] font-bold px-2 py-0.5 rounded-full ' + (statusColors[k.status] || '') + '">' + (k.status || '') + '</span>' +
          '</div>';
      });
      detailHtml += '</div>';
    }

    // Notities
    detailHtml += '<div class="mb-4">' +
      '<h4 class="text-xs font-bold text-tm-blue uppercase tracking-wider mb-2">Notities</h4>' +
      '<div class="flex gap-2 mb-3">' +
      '<input type="text" id="crm-notitie-input" class="flex-1 border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange" placeholder="Nieuwe notitie..."/>' +
      '<button onclick="CRMAgent.addNotitieFromModal(\'' + contactId + '\', \'' + contactType + '\')" class="bg-tm-orange text-white px-3 py-2 rounded-lg text-sm font-bold hover:bg-tm-orange-dark transition-colors">Toevoegen</button>' +
      '</div>' +
      '<div id="crm-notities-list">';

    if (contactNotities.length === 0) {
      detailHtml += '<p class="text-xs text-tm-text-light">Nog geen notities.</p>';
    } else {
      contactNotities.forEach(function(n) {
        detailHtml += '<div class="bg-tm-light rounded-lg px-3 py-2 mb-2">' +
          '<p class="text-sm">' + n.tekst + '</p>' +
          '<p class="text-[10px] text-tm-text-light mt-1">' + n.auteur + ' — ' + timeAgo(n.datum) + '</p>' +
          '</div>';
      });
    }

    detailHtml += '</div></div>';

    detailHtml += '</div></div>';

    modal.innerHTML = detailHtml;
    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });
    document.body.appendChild(modal);
  }

  function addNotitieFromModal(contactId, contactType) {
    var input = document.getElementById('crm-notitie-input');
    if (!input || !input.value.trim()) return;

    addNotitie(contactId, contactType, input.value.trim());
    input.value = '';

    // Re-render notities list
    var list = document.getElementById('crm-notities-list');
    if (list) {
      var nots = getNotitiesVoor(contactId);
      var html = '';
      nots.forEach(function(n) {
        html += '<div class="bg-tm-light rounded-lg px-3 py-2 mb-2">' +
          '<p class="text-sm">' + n.tekst + '</p>' +
          '<p class="text-[10px] text-tm-text-light mt-1">' + n.auteur + ' — ' + timeAgo(n.datum) + '</p>' +
          '</div>';
      });
      list.innerHTML = html;
    }
  }

  function renderCRM(containerId, filter) {
    var container = document.getElementById(containerId);
    if (!container) return;

    filter = filter || 'alle';
    activeTab = filter;
    var contacts = getAllContacts();
    if (filter === 'technici') contacts = contacts.filter(function(c) { return c.type === 'technicus'; });
    if (filter === 'bedrijven') contacts = contacts.filter(function(c) { return c.type === 'bedrijf'; });

    var followUps = getFollowUps();
    var html = '';

    // Demo badge
    if (isDemo) {
      html += '<div class="flex justify-end mb-3">' +
        '<span class="text-[10px] font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Demo data</span>' +
        '</div>';
    }

    // Stats
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-orange">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Contacten</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + (technici.length + bedrijven.length) + '</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-blue">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Technici</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + technici.length + '</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Bedrijven</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + bedrijven.length + '</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-red-400">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Follow-ups</p>' +
      '<p class="text-2xl font-headline font-bold text-red-500">' + followUps.length + '</p></div>' +
      '</div>';

    // Follow-ups section
    if (followUps.length > 0) {
      html += '<div class="mb-6">' +
        '<h3 class="font-headline font-bold text-tm-blue text-sm uppercase tracking-wider mb-3">Follow-ups nodig (' + followUps.length + ')</h3>' +
        '<div class="grid grid-cols-1 md:grid-cols-2 gap-3">';
      followUps.slice(0, 6).forEach(function(item) {
        html += renderFollowUpCard(item);
      });
      html += '</div></div>';
    }

    // Filter tabs
    var tabClass = 'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors';
    var activeClass = 'bg-tm-orange text-white';
    var inactiveClass = 'bg-tm-light text-tm-text-light hover:bg-tm-muted';

    html += '<div class="flex gap-2 mb-4">' +
      '<button onclick="CRMAgent.renderCRM(\'' + containerId + '\', \'alle\')" class="' + tabClass + ' ' + (filter === 'alle' ? activeClass : inactiveClass) + '">Alle (' + getAllContacts().length + ')</button>' +
      '<button onclick="CRMAgent.renderCRM(\'' + containerId + '\', \'technici\')" class="' + tabClass + ' ' + (filter === 'technici' ? activeClass : inactiveClass) + '">Technici (' + technici.length + ')</button>' +
      '<button onclick="CRMAgent.renderCRM(\'' + containerId + '\', \'bedrijven\')" class="' + tabClass + ' ' + (filter === 'bedrijven' ? activeClass : inactiveClass) + '">Bedrijven (' + bedrijven.length + ')</button>' +
      '</div>';

    // Contact list
    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">';
    contacts.forEach(function(c) {
      html += renderContactCard(c);
    });
    html += '</div>';

    if (contacts.length === 0) {
      html += '<div class="bg-white rounded-xl p-8 shadow-sm text-center text-tm-text-light">' +
        '<span class="material-symbols-outlined text-tm-muted text-4xl mb-3 block">contacts</span>' +
        '<p>Geen contacten gevonden.</p></div>';
    }

    container.innerHTML = html;
  }

  function init() {
    loadNotities();

    if (window.TechMaatDB) {
      var promises = [
        TechMaatDB.getTechnici(),
        TechMaatDB.getBedrijven()
      ];
      if (TechMaatDB.getKoppelingen) promises.push(TechMaatDB.getKoppelingen());
      else promises.push(Promise.resolve([]));

      Promise.all(promises).then(function(results) {
        technici = Array.isArray(results[0]) ? results[0] : [];
        bedrijven = Array.isArray(results[1]) ? results[1] : [];
        koppelingen = Array.isArray(results[2]) ? results[2] : [];

        if (technici.length > 0 || bedrijven.length > 0) {
          isDemo = false;
        }
      }).catch(function() {});
    }
  }

  window.CRMAgent = {
    init: init,
    renderCRM: renderCRM,
    openContact: openContact,
    addNotitieFromModal: addNotitieFromModal
  };
})();
