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

  var TECHMAAT_INFO = {
    naam: 'TechMaat',
    adres: 'Nederland',
    email: 'admin@techmaat.nl',
    kvk: 'In aanvraag',
    btw_id: 'In aanvraag',
    iban: 'NL00 BANK 0000 0000 00'
  };

  function formatCurrency(amount) {
    return '\u20AC' + amount.toFixed(2).replace('.', ',');
  }

  function formatDate(dateStr) {
    if (!dateStr) return '-';
    var parts = dateStr.split('-');
    if (parts.length === 3) return parts[2] + '-' + parts[1] + '-' + parts[0];
    return dateStr;
  }

  function generateNextNumber() {
    var year = new Date().getFullYear();
    var num = invoices.length + 1;
    return 'TM-' + year + '-' + String(num).padStart(3, '0');
  }

  function calculateInvoice(uren, uurtarief, commissiePercentage) {
    var subtotaal = uren * uurtarief;
    var commissie = subtotaal * (commissiePercentage / 100);
    var totaal = subtotaal + commissie;
    var btw = totaal * 0.21;
    return {
      subtotaal: Math.round(subtotaal * 100) / 100,
      commissie_bedrag: Math.round(commissie * 100) / 100,
      totaal: Math.round(totaal * 100) / 100,
      btw: Math.round(btw * 100) / 100,
      totaal_incl_btw: Math.round((totaal + btw) * 100) / 100
    };
  }

  function generatePDF(invoice) {
    if (!window.jspdf || !window.jspdf.jsPDF) {
      alert('PDF bibliotheek wordt nog geladen. Probeer het opnieuw.');
      return;
    }

    var doc = new window.jspdf.jsPDF();
    var pageWidth = doc.internal.pageSize.getWidth();
    var margin = 20;
    var y = 20;

    // --- Header: TechMaat branding ---
    doc.setFillColor(0, 48, 130); // tm-blue
    doc.rect(0, 0, pageWidth, 40, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(24);
    doc.text('TechMaat', margin, 18);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Technisch Talent, Direct Inzetbaar', margin, 26);

    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FACTUUR', pageWidth - margin, 18, { align: 'right' });

    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text(invoice.factuur_nummer, pageWidth - margin, 26, { align: 'right' });

    y = 55;

    // --- Company info columns ---
    doc.setTextColor(0, 48, 130);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('VAN', margin, y);
    doc.text('AAN', 110, y);
    y += 6;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    // Van (TechMaat)
    doc.text(TECHMAAT_INFO.naam, margin, y);
    doc.text(TECHMAAT_INFO.adres, margin, y + 5);
    doc.text(TECHMAAT_INFO.email, margin, y + 10);
    doc.text('KvK: ' + TECHMAAT_INFO.kvk, margin, y + 15);
    doc.text('BTW: ' + TECHMAAT_INFO.btw_id, margin, y + 20);

    // Aan (Bedrijf)
    doc.text(invoice.bedrijf.naam, 110, y);
    doc.text(invoice.bedrijf.locatie || '', 110, y + 5);
    doc.text(invoice.bedrijf.email || '', 110, y + 10);

    y += 32;

    // --- Invoice meta ---
    doc.setFillColor(240, 244, 255); // tm-light
    doc.rect(margin, y, pageWidth - margin * 2, 20, 'F');
    y += 6;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 48, 130);

    var col1 = margin + 5;
    var col2 = margin + 50;
    var col3 = margin + 100;
    var col4 = margin + 145;

    doc.text('Factuurdatum', col1, y);
    doc.text('Vervaldatum', col2, y);
    doc.text('Technicus', col3, y);
    doc.text('Status', col4, y);
    y += 5;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.setFontSize(10);
    doc.text(formatDate(invoice.datum), col1, y);
    doc.text(formatDate(invoice.vervaldatum), col2, y);
    doc.text(invoice.technicus.naam || '', col3, y);
    doc.text(invoice.status.charAt(0).toUpperCase() + invoice.status.slice(1), col4, y);

    y += 18;

    // --- Line items table ---
    // Header
    doc.setFillColor(0, 48, 130);
    doc.rect(margin, y, pageWidth - margin * 2, 9, 'F');
    y += 6;

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text('Omschrijving', margin + 5, y);
    doc.text('Uren', 110, y);
    doc.text('Tarief', 130, y);
    doc.text('Bedrag', pageWidth - margin - 5, y, { align: 'right' });

    y += 8;

    // Row
    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    var omschr = invoice.klus.omschrijving || '';
    if (omschr.length > 50) omschr = omschr.substring(0, 47) + '...';
    doc.text(omschr, margin + 5, y);
    doc.text(String(invoice.klus.uren), 110, y);
    doc.text(formatCurrency(invoice.klus.uurtarief), 130, y);
    doc.text(formatCurrency(invoice.subtotaal), pageWidth - margin - 5, y, { align: 'right' });

    y += 5;
    doc.setDrawColor(224, 232, 245);
    doc.line(margin, y, pageWidth - margin, y);

    // Specialisme
    y += 6;
    doc.setFontSize(9);
    doc.setTextColor(120, 120, 120);
    doc.text('Specialisme: ' + (invoice.technicus.specialisme || '-'), margin + 5, y);

    y += 14;

    // --- Totals ---
    var totalsX = 120;
    var valX = pageWidth - margin - 5;

    doc.setTextColor(60, 60, 60);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(10);

    doc.text('Subtotaal', totalsX, y);
    doc.text(formatCurrency(invoice.subtotaal), valX, y, { align: 'right' });
    y += 7;

    doc.text('TechMaat commissie (' + invoice.commissie_percentage + '%)', totalsX, y);
    doc.text(formatCurrency(invoice.commissie_bedrag), valX, y, { align: 'right' });
    y += 7;

    doc.setDrawColor(200, 200, 200);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 6;

    doc.text('Totaal excl. BTW', totalsX, y);
    doc.text(formatCurrency(invoice.totaal), valX, y, { align: 'right' });
    y += 7;

    doc.text('BTW (21%)', totalsX, y);
    doc.text(formatCurrency(invoice.btw), valX, y, { align: 'right' });
    y += 7;

    doc.setDrawColor(0, 48, 130);
    doc.setLineWidth(0.5);
    doc.line(totalsX, y, pageWidth - margin, y);
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(0, 48, 130);
    doc.text('Totaal incl. BTW', totalsX, y);
    doc.text(formatCurrency(invoice.totaal_incl_btw), valX, y, { align: 'right' });

    y += 20;

    // --- Payment info ---
    doc.setFillColor(240, 244, 255);
    doc.rect(margin, y, pageWidth - margin * 2, 22, 'F');
    y += 7;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 48, 130);
    doc.text('Betaalgegevens', margin + 5, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(60, 60, 60);
    doc.text('IBAN: ' + TECHMAAT_INFO.iban + '   |   t.n.v. TechMaat   |   o.v.v. ' + invoice.factuur_nummer, margin + 5, y);

    // --- Footer ---
    var footerY = doc.internal.pageSize.getHeight() - 15;
    doc.setFillColor(0, 48, 130);
    doc.rect(0, footerY - 5, pageWidth, 20, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text('TechMaat — Technisch Talent, Direct Inzetbaar | techmaat.nl | admin@techmaat.nl', pageWidth / 2, footerY + 2, { align: 'center' });

    // Save
    doc.save(invoice.factuur_nummer + '.pdf');
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
      '<button onclick="FactuurAgent.showNewInvoiceModal(\'' + containerId + '\')" class="bg-tm-orange text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-tm-orange-dark transition-colors flex items-center gap-1"><span class="material-symbols-outlined text-sm">add</span>Nieuwe factuur</button>' +
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
        '<button onclick="FactuurAgent.downloadPDF(\'' + inv.id + '\')" class="text-[11px] text-tm-orange hover:text-tm-orange-dark font-bold flex items-center gap-1 transition-colors"><span class="material-symbols-outlined text-sm">picture_as_pdf</span>PDF</button>' +
        '</div>' +
        '</div>';
    });

    if (filtered.length === 0) {
      html += '<div class="px-5 py-8 text-center text-tm-text-light">Geen facturen gevonden.</div>';
    }

    html += '</div>';

    container.innerHTML = html;
  }

  function downloadPDF(invoiceId) {
    var inv = invoices.find(function(i) { return i.id === invoiceId; });
    if (inv) generatePDF(inv);
  }

  function showNewInvoiceModal(containerId) {
    var existing = document.getElementById('factuur-modal');
    if (existing) existing.remove();

    // Load technici and bedrijven for dropdowns
    var techList = [];
    var bedrijfList = [];

    var buildModal = function() {
      var techOptions = '<option value="">Selecteer technicus...</option>';
      techList.forEach(function(t) {
        techOptions += '<option value="' + (t.id || '') + '" data-naam="' + (t.naam || '') + '" data-spec="' + ((t.specialismen || []).join(', ')) + '" data-tarief="' + (t.uurtarief || '') + '">' + (t.naam || 'Onbekend') + ' — ' + ((t.specialismen || []).join(', ')) + '</option>';
      });

      var bedrijfOptions = '<option value="">Selecteer bedrijf...</option>';
      bedrijfList.forEach(function(b) {
        bedrijfOptions += '<option value="' + (b.id || '') + '" data-naam="' + (b.bedrijfsnaam || '') + '" data-email="' + (b.email || '') + '" data-locatie="' + (b.locatie || '') + '">' + (b.bedrijfsnaam || 'Onbekend') + ' — ' + (b.locatie || '') + '</option>';
      });

      var today = new Date().toISOString().split('T')[0];
      var verval = new Date(Date.now() + 14 * 86400000).toISOString().split('T')[0];

      var modal = document.createElement('div');
      modal.id = 'factuur-modal';
      modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50 overflow-y-auto py-8';
      modal.innerHTML =
        '<div class="bg-white rounded-2xl shadow-2xl max-w-lg w-full mx-4 overflow-hidden">' +
          '<div class="bg-tm-blue px-6 py-4">' +
            '<h3 class="font-headline font-bold text-white text-lg">Nieuwe factuur aanmaken</h3>' +
          '</div>' +
          '<div class="px-6 py-5 space-y-4 max-h-[70vh] overflow-y-auto">' +
            '<div>' +
              '<label class="text-xs font-bold text-tm-blue block mb-1">Bedrijf *</label>' +
              '<select id="nf-bedrijf" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange">' + bedrijfOptions + '</select>' +
            '</div>' +
            '<div>' +
              '<label class="text-xs font-bold text-tm-blue block mb-1">Technicus *</label>' +
              '<select id="nf-technicus" onchange="FactuurAgent.onTechnicusSelect()" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange">' + techOptions + '</select>' +
            '</div>' +
            '<div>' +
              '<label class="text-xs font-bold text-tm-blue block mb-1">Omschrijving klus *</label>' +
              '<input type="text" id="nf-omschrijving" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange" placeholder="Bijv. Storingsdienst productielijn"/>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-3">' +
              '<div>' +
                '<label class="text-xs font-bold text-tm-blue block mb-1">Uren *</label>' +
                '<input type="number" id="nf-uren" min="1" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange" placeholder="40"/>' +
              '</div>' +
              '<div>' +
                '<label class="text-xs font-bold text-tm-blue block mb-1">Uurtarief (&euro;) *</label>' +
                '<input type="number" id="nf-tarief" step="0.01" min="0" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange" placeholder="68.00"/>' +
              '</div>' +
            '</div>' +
            '<div class="grid grid-cols-2 gap-3">' +
              '<div>' +
                '<label class="text-xs font-bold text-tm-blue block mb-1">Commissie (%)</label>' +
                '<input type="number" id="nf-commissie" value="12" min="0" max="100" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange"/>' +
              '</div>' +
              '<div>' +
                '<label class="text-xs font-bold text-tm-blue block mb-1">Vervaldatum</label>' +
                '<input type="date" id="nf-verval" value="' + verval + '" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange"/>' +
              '</div>' +
            '</div>' +
            '<div class="bg-tm-light rounded-xl p-3" id="nf-preview">' +
              '<p class="text-xs text-tm-text-light">Vul de velden in om een preview te zien.</p>' +
            '</div>' +
          '</div>' +
          '<div class="flex gap-3 px-6 pb-5">' +
            '<button onclick="document.getElementById(\'factuur-modal\').remove()" class="flex-1 text-sm font-medium text-tm-text-light bg-tm-light hover:bg-tm-muted rounded-lg py-2.5 transition-colors">Annuleren</button>' +
            '<button id="nf-create-btn" onclick="FactuurAgent.createInvoice(\'' + containerId + '\')" class="flex-1 text-sm font-bold text-white bg-tm-orange hover:bg-tm-orange-dark rounded-lg py-2.5 transition-colors">Aanmaken & PDF</button>' +
          '</div>' +
        '</div>';

      modal.addEventListener('click', function(e) {
        if (e.target === modal) modal.remove();
      });

      document.body.appendChild(modal);

      // Live preview on input change
      ['nf-uren', 'nf-tarief', 'nf-commissie'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el) el.addEventListener('input', updatePreview);
      });
    };

    if (window.TechMaatDB) {
      Promise.all([
        TechMaatDB.getTechnici(),
        TechMaatDB.getBedrijven()
      ]).then(function(results) {
        techList = Array.isArray(results[0]) ? results[0] : [];
        bedrijfList = Array.isArray(results[1]) ? results[1] : [];
        buildModal();
      }).catch(function() { buildModal(); });
    } else {
      buildModal();
    }
  }

  function onTechnicusSelect() {
    var sel = document.getElementById('nf-technicus');
    if (!sel || !sel.selectedOptions[0]) return;
    var opt = sel.selectedOptions[0];
    var tarief = opt.getAttribute('data-tarief');
    if (tarief) {
      var el = document.getElementById('nf-tarief');
      if (el && !el.value) el.value = tarief;
    }
    updatePreview();
  }

  function updatePreview() {
    var uren = parseFloat((document.getElementById('nf-uren') || {}).value) || 0;
    var tarief = parseFloat((document.getElementById('nf-tarief') || {}).value) || 0;
    var comm = parseFloat((document.getElementById('nf-commissie') || {}).value) || 12;
    var preview = document.getElementById('nf-preview');
    if (!preview) return;

    if (uren <= 0 || tarief <= 0) {
      preview.innerHTML = '<p class="text-xs text-tm-text-light">Vul uren en tarief in om een preview te zien.</p>';
      return;
    }

    var calc = calculateInvoice(uren, tarief, comm);
    preview.innerHTML =
      '<div class="grid grid-cols-2 gap-2 text-xs">' +
        '<span class="text-tm-text-light">Subtotaal:</span><span class="text-right font-medium">' + formatCurrency(calc.subtotaal) + '</span>' +
        '<span class="text-tm-text-light">Commissie (' + comm + '%):</span><span class="text-right font-medium">' + formatCurrency(calc.commissie_bedrag) + '</span>' +
        '<span class="text-tm-text-light">BTW (21%):</span><span class="text-right font-medium">' + formatCurrency(calc.btw) + '</span>' +
        '<span class="text-tm-blue font-bold">Totaal incl. BTW:</span><span class="text-right font-bold text-tm-blue">' + formatCurrency(calc.totaal_incl_btw) + '</span>' +
      '</div>';
  }

  function createInvoice(containerId) {
    var bedrijfSel = document.getElementById('nf-bedrijf');
    var techSel = document.getElementById('nf-technicus');
    var omschrijving = (document.getElementById('nf-omschrijving') || {}).value || '';
    var uren = parseFloat((document.getElementById('nf-uren') || {}).value) || 0;
    var tarief = parseFloat((document.getElementById('nf-tarief') || {}).value) || 0;
    var comm = parseFloat((document.getElementById('nf-commissie') || {}).value) || 12;
    var verval = (document.getElementById('nf-verval') || {}).value || '';

    if (!bedrijfSel.value || !techSel.value || !omschrijving || uren <= 0 || tarief <= 0) {
      alert('Vul alle verplichte velden in.');
      return;
    }

    var bedrijfOpt = bedrijfSel.selectedOptions[0];
    var techOpt = techSel.selectedOptions[0];

    var calc = calculateInvoice(uren, tarief, comm);
    var today = new Date().toISOString().split('T')[0];

    var newInvoice = {
      id: 'inv-' + Date.now(),
      factuur_nummer: generateNextNumber(),
      bedrijf: {
        naam: bedrijfOpt.getAttribute('data-naam') || 'Onbekend',
        email: bedrijfOpt.getAttribute('data-email') || '',
        locatie: bedrijfOpt.getAttribute('data-locatie') || ''
      },
      technicus: {
        naam: techOpt.getAttribute('data-naam') || 'Onbekend',
        specialisme: techOpt.getAttribute('data-spec') || ''
      },
      klus: {
        omschrijving: omschrijving,
        uren: uren,
        uurtarief: tarief
      },
      subtotaal: calc.subtotaal,
      commissie_percentage: comm,
      commissie_bedrag: calc.commissie_bedrag,
      totaal: calc.totaal,
      btw: calc.btw,
      totaal_incl_btw: calc.totaal_incl_btw,
      status: 'concept',
      datum: today,
      vervaldatum: verval || today
    };

    // Save to Supabase if available
    var savePromise = (window.TechMaatDB && TechMaatDB.insertFactuur)
      ? TechMaatDB.insertFactuur(mapInvoiceToDb(newInvoice))
      : Promise.resolve(null);

    savePromise.then(function(result) {
      if (Array.isArray(result) && result[0] && result[0].id) {
        newInvoice.id = result[0].id;
      }
      invoices.unshift(newInvoice);

      // Close modal
      var modal = document.getElementById('factuur-modal');
      if (modal) modal.remove();

      // Generate PDF
      generatePDF(newInvoice);

      // Re-render
      renderFacturen(containerId);
    }).catch(function() {
      invoices.unshift(newInvoice);
      var modal = document.getElementById('factuur-modal');
      if (modal) modal.remove();
      generatePDF(newInvoice);
      renderFacturen(containerId);
    });
  }

  function mapDbToInvoice(row) {
    return {
      id: row.id,
      factuur_nummer: row.factuur_nummer,
      bedrijf: { naam: row.bedrijf_naam || '', email: row.bedrijf_email || '', locatie: row.bedrijf_locatie || '' },
      technicus: { naam: row.technicus_naam || '', specialisme: row.technicus_specialisme || '' },
      klus: { omschrijving: row.klus_omschrijving || '', uren: Number(row.uren) || 0, uurtarief: Number(row.uurtarief) || 0 },
      subtotaal: Number(row.subtotaal) || 0,
      commissie_percentage: Number(row.commissie_percentage) || 0,
      commissie_bedrag: Number(row.commissie_bedrag) || 0,
      totaal: Number(row.totaal) || 0,
      btw: Number(row.btw) || 0,
      totaal_incl_btw: Number(row.totaal_incl_btw) || 0,
      status: row.status || 'concept',
      datum: row.datum || '',
      vervaldatum: row.vervaldatum || ''
    };
  }

  function mapInvoiceToDb(inv) {
    return {
      factuur_nummer: inv.factuur_nummer,
      bedrijf_naam: inv.bedrijf.naam,
      bedrijf_email: inv.bedrijf.email,
      bedrijf_locatie: inv.bedrijf.locatie,
      technicus_naam: inv.technicus.naam,
      technicus_specialisme: inv.technicus.specialisme,
      klus_omschrijving: inv.klus.omschrijving,
      uren: inv.klus.uren,
      uurtarief: inv.klus.uurtarief,
      subtotaal: inv.subtotaal,
      commissie_percentage: inv.commissie_percentage,
      commissie_bedrag: inv.commissie_bedrag,
      totaal: inv.totaal,
      btw: inv.btw,
      totaal_incl_btw: inv.totaal_incl_btw,
      status: inv.status,
      datum: inv.datum,
      vervaldatum: inv.vervaldatum
    };
  }

  function init() {
    // Try Supabase first, fallback to demo
    if (window.TechMaatDB && TechMaatDB.getFacturen) {
      TechMaatDB.getFacturen().then(function(rows) {
        if (Array.isArray(rows) && rows.length > 0) {
          invoices = rows.map(mapDbToInvoice);
          isDemo = false;
        } else {
          invoices = DEMO_INVOICES;
        }
        updateKPI();
      }).catch(function() {
        invoices = DEMO_INVOICES;
        updateKPI();
      });
    } else {
      invoices = DEMO_INVOICES;
      updateKPI();
    }
  }

  function updateKPI() {
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
    renderFacturen: renderFacturen,
    downloadPDF: downloadPDF,
    generatePDF: generatePDF,
    showNewInvoiceModal: showNewInvoiceModal,
    createInvoice: createInvoice,
    onTechnicusSelect: onTechnicusSelect
  };
})();
