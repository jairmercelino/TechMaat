/**
 * TechMaat Factuur Agent
 * Generates and manages invoices with commission calculations
 */
(function() {
  var invoices = [];
  var isDemo = true;

  var DEMO_INVOICES = [
    {
      id: 'inv-001',
      factuur_nummer: 'TM-2026-001',
      bedrijf: { naam: 'FoodTech Industries BV', email: 's.jansen@foodtech.nl', locatie: 'Zaandam' },
      technicus: { naam: 'Pieter van den Berg', specialisme: 'Hydrauliek / Mechanica' },
      klus: { omschrijving: 'Storingsdienst productielijn', uren: 40, uurtarief: 68 },
      subtotaal: 2720,
      commissie_percentage: 12,
      commissie_bedrag: 326.40,
      totaal: 3046.40,
      btw: 639.74,
      totaal_incl_btw: 3686.14,
      status: 'verzonden',
      datum: '2026-04-01',
      vervaldatum: '2026-04-15'
    },
    {
      id: 'inv-002',
      factuur_nummer: 'TM-2026-002',
      bedrijf: { naam: 'MetaalWerk Groep', email: 'j.degroot@metaalwerk.nl', locatie: 'Dordrecht' },
      technicus: { naam: 'Mohammed El Amrani', specialisme: 'PLC / Besturingen' },
      klus: { omschrijving: 'Ombouw lasrobotlijn — PLC programmering', uren: 80, uurtarief: 75 },
      subtotaal: 6000,
      commissie_percentage: 15,
      commissie_bedrag: 900,
      totaal: 6900,
      btw: 1449,
      totaal_incl_btw: 8349,
      status: 'concept',
      datum: '2026-04-05',
      vervaldatum: '2026-04-19'
    },
    {
      id: 'inv-003',
      factuur_nummer: 'TM-2026-003',
      bedrijf: { naam: 'FoodTech Industries BV', email: 's.jansen@foodtech.nl', locatie: 'Zaandam' },
      technicus: { naam: 'Test Technicus', specialisme: 'Mechanica' },
      klus: { omschrijving: 'Preventief onderhoud transportbanden', uren: 24, uurtarief: 72.80 },
      subtotaal: 1747.20,
      commissie_percentage: 12,
      commissie_bedrag: 209.66,
      totaal: 1956.86,
      btw: 410.94,
      totaal_incl_btw: 2367.80,
      status: 'betaald',
      datum: '2026-03-20',
      vervaldatum: '2026-04-03'
    }
  ];

  function formatCurrency(amount) {
    return '\u20AC' + amount.toFixed(2).replace('.', ',');
  }

  function getStats() {
    var concept = invoices.filter(function(i) { return i.status === 'concept'; });
    var verzonden = invoices.filter(function(i) { return i.status === 'verzonden'; });
    var betaald = invoices.filter(function(i) { return i.status === 'betaald'; });
    var verlopen = invoices.filter(function(i) { return i.status === 'verlopen'; });

    var openstaand = verzonden.reduce(function(sum, i) { return sum + i.totaal_incl_btw; }, 0);
    var totaalBetaald = betaald.reduce(function(sum, i) { return sum + i.totaal_incl_btw; }, 0);
    var commissieInkomsten = betaald.reduce(function(sum, i) { return sum + i.commissie_bedrag; }, 0);
    var commissieTotaal = invoices.reduce(function(sum, i) { return sum + i.commissie_bedrag; }, 0);

    return {
      total: invoices.length,
      concept: concept.length,
      verzonden: verzonden.length,
      betaald: betaald.length,
      verlopen: verlopen.length,
      openstaand: openstaand,
      totaal_betaald: totaalBetaald,
      commissie_inkomsten: commissieInkomsten,
      commissie_totaal: commissieTotaal
    };
  }

  function statusBadge(status) {
    var colors = {
      concept: 'bg-gray-100 text-gray-600',
      verzonden: 'bg-orange-100 text-orange-700',
      betaald: 'bg-green-100 text-green-700',
      verlopen: 'bg-red-100 text-red-700'
    };
    var labels = {
      concept: 'Concept',
      verzonden: 'Verzonden',
      betaald: 'Betaald',
      verlopen: 'Verlopen'
    };
    return '<span class="text-[11px] font-bold px-2 py-1 rounded-full ' + (colors[status] || '') + '">' + (labels[status] || status) + '</span>';
  }

  function renderFacturen(containerId, filter) {
    var container = document.getElementById(containerId);
    if (!container) return;

    filter = filter || 'alle';
    var filtered = invoices;
    if (filter !== 'alle') filtered = invoices.filter(function(i) { return i.status === filter; });

    var stats = getStats();

    var tabClass = 'px-4 py-2 rounded-lg text-sm font-medium cursor-pointer transition-colors';
    var activeClass = 'bg-tm-orange text-white';
    var inactiveClass = 'bg-tm-light text-tm-text-light hover:bg-tm-muted';

    // Summary cards
    var html = '<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-orange-400">' +
      '<p class="text-xs text-tm-text-light uppercase tracking-widest font-bold">Openstaand</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue mt-1">' + formatCurrency(stats.openstaand) + '</p>' +
      '<p class="text-xs text-tm-text-light mt-1">' + stats.verzonden + ' facturen</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">' +
      '<p class="text-xs text-tm-text-light uppercase tracking-widest font-bold">Betaald</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue mt-1">' + formatCurrency(stats.totaal_betaald) + '</p>' +
      '<p class="text-xs text-tm-text-light mt-1">' + stats.betaald + ' facturen</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-blue">' +
      '<p class="text-xs text-tm-text-light uppercase tracking-widest font-bold">Commissie-inkomsten</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-orange mt-1">' + formatCurrency(stats.commissie_totaal) + '</p>' +
      '<p class="text-xs text-tm-text-light mt-1">Totaal alle facturen</p></div>' +
      '</div>';

    // Filter tabs + new invoice button
    html += '<div class="flex items-center justify-between mb-4 flex-wrap gap-3">' +
      '<div class="flex gap-2 flex-wrap">' +
      '<button onclick="FactuurAgent.renderFacturen(\'' + containerId + '\', \'alle\')" class="' + tabClass + ' ' + (filter === 'alle' ? activeClass : inactiveClass) + '">Alle (' + stats.total + ')</button>' +
      '<button onclick="FactuurAgent.renderFacturen(\'' + containerId + '\', \'concept\')" class="' + tabClass + ' ' + (filter === 'concept' ? activeClass : inactiveClass) + '">Concept (' + stats.concept + ')</button>' +
      '<button onclick="FactuurAgent.renderFacturen(\'' + containerId + '\', \'verzonden\')" class="' + tabClass + ' ' + (filter === 'verzonden' ? activeClass : inactiveClass) + '">Verzonden (' + stats.verzonden + ')</button>' +
      '<button onclick="FactuurAgent.renderFacturen(\'' + containerId + '\', \'betaald\')" class="' + tabClass + ' ' + (filter === 'betaald' ? activeClass : inactiveClass) + '">Betaald (' + stats.betaald + ')</button>' +
      '<button onclick="FactuurAgent.renderFacturen(\'' + containerId + '\', \'verlopen\')" class="' + tabClass + ' ' + (filter === 'verlopen' ? activeClass : inactiveClass) + '">Verlopen (' + stats.verlopen + ')</button>' +
      '</div>' +
      '<div class="flex gap-2">' +
      (isDemo ? '<span class="text-[10px] font-bold uppercase tracking-widest bg-yellow-100 text-yellow-700 px-2 py-1 rounded-full">Demo data</span>' : '') +
      '<button disabled class="bg-tm-muted text-tm-text-light/50 px-4 py-2 rounded-lg text-sm font-medium cursor-not-allowed">+ Nieuwe factuur</button>' +
      '</div></div>';

    // Invoice table
    html += '<div class="bg-white rounded-xl shadow-sm overflow-hidden">';

    // Header
    html += '<div class="hidden md:grid grid-cols-12 gap-4 px-5 py-3 bg-tm-light text-xs font-bold text-tm-text-light uppercase tracking-widest">' +
      '<div class="col-span-2">Factuur</div>' +
      '<div class="col-span-3">Bedrijf / Technicus</div>' +
      '<div class="col-span-2">Omschrijving</div>' +
      '<div class="col-span-1 text-right">Uren</div>' +
      '<div class="col-span-2 text-right">Totaal incl. BTW</div>' +
      '<div class="col-span-1">Status</div>' +
      '<div class="col-span-1"></div>' +
      '</div>';

    // Rows
    filtered.forEach(function(inv) {
      html += '<div class="grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-4 px-5 py-4 border-t border-tm-muted items-center hover:bg-tm-light/50 transition-colors">' +
        '<div class="col-span-2">' +
        '<p class="font-bold text-tm-blue text-sm">' + inv.factuur_nummer + '</p>' +
        '<p class="text-[11px] text-tm-text-light">' + inv.datum + '</p>' +
        '</div>' +
        '<div class="col-span-3">' +
        '<p class="font-medium text-sm text-tm-text">' + inv.bedrijf.naam + '</p>' +
        '<p class="text-[11px] text-tm-text-light">' + inv.technicus.naam + ' — ' + inv.technicus.specialisme + '</p>' +
        '</div>' +
        '<div class="col-span-2">' +
        '<p class="text-xs text-tm-text-light">' + inv.klus.omschrijving + '</p>' +
        '</div>' +
        '<div class="col-span-1 text-right">' +
        '<p class="text-sm font-medium">' + inv.klus.uren + 'u</p>' +
        '<p class="text-[11px] text-tm-text-light">' + formatCurrency(inv.klus.uurtarief) + '/u</p>' +
        '</div>' +
        '<div class="col-span-2 text-right">' +
        '<p class="text-sm font-bold text-tm-blue">' + formatCurrency(inv.totaal_incl_btw) + '</p>' +
        '<p class="text-[11px] text-tm-text-light">comm. ' + formatCurrency(inv.commissie_bedrag) + ' (' + inv.commissie_percentage + '%)</p>' +
        '</div>' +
        '<div class="col-span-1">' + statusBadge(inv.status) + '</div>' +
        '<div class="col-span-1 text-right">' +
        '<button disabled class="text-[11px] text-tm-text-light/40 cursor-not-allowed">PDF</button>' +
        '</div>' +
        '</div>';
    });

    if (filtered.length === 0) {
      html += '<div class="px-5 py-8 text-center text-tm-text-light">Geen facturen gevonden.</div>';
    }

    html += '</div>';

    container.innerHTML = html;
  }

  function init() {
    invoices = DEMO_INVOICES;

    // Update KPI if element exists
    var omzetEl = document.getElementById('kpi-omzet');
    if (omzetEl) {
      var stats = getStats();
      omzetEl.textContent = formatCurrency(stats.commissie_totaal);
    }
  }

  window.FactuurAgent = {
    init: init,
    getInvoices: function(filter) {
      if (!filter || filter === 'alle') return invoices;
      return invoices.filter(function(i) { return i.status === filter; });
    },
    getStats: getStats,
    renderFacturen: renderFacturen
  };
})();
