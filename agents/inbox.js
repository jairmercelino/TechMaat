/**
 * TechMaat Inbox Agent
 * Fetches and displays form submissions. Uses demo data until Formspree API is configured.
 */
(function() {
  var FORMSPREE_API_KEY = null; // Set when available
  var FORMSPREE_FORM_ID = 'xaqlakdb';
  var submissions = [];
  var isDemo = true;

  var DEMO_DATA = [
    {
      type: "technicus", naam: "Pieter van den Berg", email: "pieter.vdberg@gmail.com",
      telefoon: "06 12345678", woonplaats: "Amsterdam",
      specialismen: ["Hydrauliek", "Mechanica"], certificeringen: ["VCA VOL"],
      uurtarief: "68", werkradius: "40", beschikbaarheid: "Direct beschikbaar",
      ploegendienst: "5-ploegen (volcontinue)", kilometervergoeding: "0.23",
      omschrijving: "15 jaar ervaring in de voedingsindustrie. Gespecialiseerd in hydraulische persen en transportbanden.",
      submitted_at: new Date(Date.now() - 2 * 3600000).toISOString(), _status: "nieuw"
    },
    {
      type: "technicus", naam: "Mohammed El Amrani", email: "m.elamrani@outlook.com",
      telefoon: "06 98765432", woonplaats: "Rotterdam",
      specialismen: ["Elektrotechniek", "PLC/Besturingen"], certificeringen: ["VCA Basis", "NEN 3140"],
      uurtarief: "75", werkradius: "60", beschikbaarheid: "Binnen 1 week",
      ploegendienst: "3-ploegen", kilometervergoeding: "0.25",
      omschrijving: "PLC programmeur met ervaring in Siemens S7 en TIA Portal. Beschikbaar voor projecten en storingen.",
      submitted_at: new Date(Date.now() - 8 * 3600000).toISOString(), _status: "nieuw"
    },
    {
      type: "bedrijf", bedrijfsnaam: "FoodTech Industries BV", contactpersoon: "Sandra Jansen",
      email: "s.jansen@foodtech.nl", telefoon: "020 5551234",
      locatie: "Zaandam", branche: "Voedingsindustrie", type_werk: "Storingsdienst",
      omschrijving: "Wij zoeken een ervaren storingsdienst monteur voor onze productielijn. 5-ploegen, minimaal VCA VOL. Liefst per direct.",
      submitted_at: new Date(Date.now() - 24 * 3600000).toISOString(), _status: "gezien"
    },
    {
      type: "bedrijf", bedrijfsnaam: "MetaalWerk Groep", contactpersoon: "Jan de Groot",
      email: "j.degroot@metaalwerk.nl", telefoon: "010 5559876",
      locatie: "Dordrecht", branche: "Metaalindustrie", type_werk: "Projectmatig",
      omschrijving: "3 PLC programmeurs nodig voor ombouw van onze lasrobotlijn. Project duurt 6 weken, start mei 2026.",
      submitted_at: new Date(Date.now() - 48 * 3600000).toISOString(), _status: "gezien"
    }
  ];

  function timeAgo(dateStr) {
    var now = Date.now();
    var then = new Date(dateStr).getTime();
    var diff = Math.floor((now - then) / 1000);
    if (diff < 60) return 'Zojuist';
    if (diff < 3600) return Math.floor(diff / 60) + ' min geleden';
    if (diff < 86400) return Math.floor(diff / 3600) + ' uur geleden';
    if (diff < 172800) return 'Gisteren';
    return Math.floor(diff / 86400) + ' dagen geleden';
  }

  function getStats() {
    var technici = submissions.filter(function(s) { return s.type === 'technicus'; }).length;
    var bedrijven = submissions.filter(function(s) { return s.type === 'bedrijf'; }).length;
    var nieuw = submissions.filter(function(s) { return s._status === 'nieuw'; }).length;
    return { total: submissions.length, technici: technici, bedrijven: bedrijven, nieuw: nieuw };
  }

  function renderCard(sub, index) {
    var isTech = sub.type === 'technicus';
    var name = isTech ? sub.naam : sub.bedrijfsnaam;
    var badgeColor = isTech ? 'bg-tm-orange' : 'bg-tm-blue';
    var badgeText = isTech ? 'Technicus' : 'Bedrijf';
    var statusDot = sub._status === 'nieuw'
      ? '<span class="w-2 h-2 rounded-full bg-tm-orange animate-pulse"></span><span class="text-xs text-tm-orange font-medium">Nieuw</span>'
      : '<span class="w-2 h-2 rounded-full bg-gray-300"></span><span class="text-xs text-gray-400">Gezien</span>';

    var details = '';
    if (isTech) {
      details = '<div class="flex flex-wrap gap-1.5 mt-2">' +
        (sub.specialismen || []).map(function(s) {
          return '<span class="text-[11px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + s + '</span>';
        }).join('') +
        '</div>' +
        '<div class="flex gap-4 mt-2 text-xs text-tm-text-light">' +
        '<span>&euro;' + sub.uurtarief + '/uur</span>' +
        '<span>' + sub.werkradius + ' km radius</span>' +
        '<span>' + sub.ploegendienst + '</span>' +
        '</div>';
    } else {
      details = '<div class="flex gap-2 mt-2">' +
        '<span class="text-[11px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + (sub.branche || '') + '</span>' +
        '<span class="text-[11px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + (sub.type_werk || '') + '</span>' +
        '</div>';
    }

    var expandedContent = '<div id="inbox-detail-' + index + '" class="hidden mt-4 pt-4 border-t border-tm-muted text-sm">' +
      '<div class="grid grid-cols-2 gap-3 text-tm-text-light">' +
      '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Email</span>' + sub.email + '</div>' +
      '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Telefoon</span>' + sub.telefoon + '</div>' +
      (isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Woonplaats</span>' + sub.woonplaats + '</div>' : '') +
      (isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Certificeringen</span>' + (sub.certificeringen || []).join(', ') + '</div>' : '') +
      (!isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Locatie</span>' + (sub.locatie || '') + '</div>' : '') +
      (!isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Contactpersoon</span>' + (sub.contactpersoon || '') + '</div>' : '') +
      (isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Km vergoeding</span>&euro;' + sub.kilometervergoeding + '/km</div>' : '') +
      (isTech ? '<div><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Beschikbaarheid</span>' + sub.beschikbaarheid + '</div>' : '') +
      '</div>' +
      (sub.omschrijving ? '<div class="mt-3"><span class="font-bold text-tm-text block text-xs uppercase tracking-wider mb-1">Omschrijving</span><p class="text-tm-text-light leading-relaxed">' + sub.omschrijving + '</p></div>' : '') +
      '</div>';

    return '<div class="bg-white rounded-xl p-4 shadow-sm border border-tm-muted hover:border-tm-orange/30 transition-colors cursor-pointer" onclick="InboxAgent.toggleDetail(' + index + ')">' +
      '<div class="flex items-start justify-between mb-2">' +
      '<div class="flex items-center gap-2">' +
      '<span class="text-[10px] font-bold uppercase tracking-wider text-white px-2 py-0.5 rounded-full ' + badgeColor + '">' + badgeText + '</span>' +
      '<span class="text-sm font-bold text-tm-blue">' + name + '</span>' +
      '</div>' +
      '<div class="flex items-center gap-1.5">' + statusDot + '</div>' +
      '</div>' +
      '<p class="text-xs text-tm-text-light">' + sub.email + ' &middot; ' + sub.telefoon + '</p>' +
      details +
      '<p class="text-[11px] text-tm-text-light/50 mt-2">' + timeAgo(sub.submitted_at) + '</p>' +
      expandedContent +
      '</div>';
  }

  function renderInbox(containerId, filter) {
    var container = document.getElementById(containerId);
    if (!container) return;

    filter = filter || 'alle';
    var filtered = submissions;
    if (filter === 'technici') filtered = submissions.filter(function(s) { return s.type === 'technicus'; });
    if (filter === 'bedrijven') filtered = submissions.filter(function(s) { return s.type === 'bedrijf'; });

    var stats = getStats();

    var tabClass = 'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors';
    var activeClass = 'bg-tm-orange text-white';
    var inactiveClass = 'bg-tm-light text-tm-text-light hover:bg-tm-muted';

    var html = '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
      '<div class="flex gap-2">' +
      '<button onclick="InboxAgent.renderInbox(\'' + containerId + '\', \'alle\')" class="' + tabClass + ' ' + (filter === 'alle' ? activeClass : inactiveClass) + '">Alle (' + stats.total + ')</button>' +
      '<button onclick="InboxAgent.renderInbox(\'' + containerId + '\', \'technici\')" class="' + tabClass + ' ' + (filter === 'technici' ? activeClass : inactiveClass) + '">Technici (' + stats.technici + ')</button>' +
      '<button onclick="InboxAgent.renderInbox(\'' + containerId + '\', \'bedrijven\')" class="' + tabClass + ' ' + (filter === 'bedrijven' ? activeClass : inactiveClass) + '">Bedrijven (' + stats.bedrijven + ')</button>' +
      '</div>' +
      (isDemo ? '<span class="text-[10px] font-bold uppercase tracking-widest text-tm-text-light bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Demo data</span>' : '') +
      '</div>';

    html += '<div class="grid grid-cols-1 lg:grid-cols-2 gap-3">';
    filtered.forEach(function(sub, i) {
      var realIndex = submissions.indexOf(sub);
      html += renderCard(sub, realIndex);
    });
    html += '</div>';

    if (filtered.length === 0) {
      html += '<div class="text-center py-8 text-tm-text-light"><p>Geen inzendingen gevonden.</p></div>';
    }

    container.innerHTML = html;
  }

  function toggleDetail(index) {
    var el = document.getElementById('inbox-detail-' + index);
    if (el) {
      el.classList.toggle('hidden');
      // Mark as seen
      if (submissions[index]._status === 'nieuw') {
        submissions[index]._status = 'gezien';
        // Re-render to update status dot
        var container = el.closest('[id^="inbox-"]');
      }
    }
  }

  function init() {
    // Try Formspree API first, fallback to demo
    if (FORMSPREE_API_KEY) {
      fetch('https://formspree.io/api/0/forms/' + FORMSPREE_FORM_ID + '/submissions', {
        headers: { 'Authorization': 'Bearer ' + FORMSPREE_API_KEY }
      })
      .then(function(r) { return r.json(); })
      .then(function(data) {
        if (data.submissions && data.submissions.length > 0) {
          submissions = data.submissions.map(function(s) {
            s._status = 'nieuw';
            s.submitted_at = s._date || s.submitted_at || new Date().toISOString();
            return s;
          });
          isDemo = false;
        } else {
          submissions = DEMO_DATA;
        }
        updateDashboard();
      })
      .catch(function() {
        submissions = DEMO_DATA;
        updateDashboard();
      });
    } else {
      submissions = DEMO_DATA;
      updateDashboard();
    }
  }

  function updateDashboard() {
    var stats = getStats();

    // Update KPI cards if elements exist
    var techEl = document.getElementById('kpi-technici');
    var bedrijfEl = document.getElementById('kpi-bedrijven');
    if (techEl) techEl.textContent = stats.technici;
    if (bedrijfEl) bedrijfEl.textContent = stats.bedrijven;

    // Render inbox if container exists
    var container = document.getElementById('inbox-container');
    if (container) renderInbox('inbox-container', 'alle');
  }

  // Public API
  window.InboxAgent = {
    init: init,
    getSubmissions: function() { return submissions; },
    getStats: getStats,
    renderInbox: renderInbox,
    toggleDetail: toggleDetail
  };
})();
