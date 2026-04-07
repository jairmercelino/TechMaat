/**
 * TechMaat Verificatie Agent
 * Reviews uploaded documents (certificates, insurance, KvK)
 * Approves/rejects with notes and expiry tracking
 */
(function() {
  var documenten = [];
  var technici = [];
  var isDemo = true;

  var DOC_LABELS = {
    vca: 'VCA Certificaat',
    vca_basis: 'VCA Basis',
    vca_vol: 'VCA VOL',
    nen_3140: 'NEN 3140',
    f_gassen: 'F-gassen',
    verzekering: 'Verzekeringspolis',
    kvk: 'KvK Uittreksel'
  };

  var STATUS_COLORS = {
    wacht: 'bg-orange-100 text-orange-700',
    goedgekeurd: 'bg-green-100 text-green-700',
    afgekeurd: 'bg-red-100 text-red-700'
  };

  var STATUS_LABELS = {
    wacht: 'Wachtend',
    goedgekeurd: 'Goedgekeurd',
    afgekeurd: 'Afgekeurd'
  };

  var DEMO_TECHNICI = [
    { id: 'demo-1', naam: 'Pieter van den Berg', woonplaats: 'Amsterdam', specialismen: ['Hydrauliek', 'Mechanica'], certificeringen: ['VCA VOL', 'NEN 3140'] },
    { id: 'demo-2', naam: 'Klaas de Groot', woonplaats: 'Rotterdam', specialismen: ['Elektrotechniek'], certificeringen: ['VCA Basis', 'NEN 3140', 'F-gassen'] }
  ];

  var DEMO_DATA = [
    { id: 'doc-001', technicus_id: 'demo-1', type: 'vca', bestandsnaam: 'VCA_VOL_PvdBerg.pdf', storage_path: 'demo/vca.pdf', status: 'wacht', notitie: null, vervaldatum: null, created_at: '2026-04-06T10:30:00Z' },
    { id: 'doc-002', technicus_id: 'demo-1', type: 'verzekering', bestandsnaam: 'Polisblad_AVB_2026.pdf', storage_path: 'demo/verzekering.pdf', status: 'wacht', notitie: null, vervaldatum: null, created_at: '2026-04-06T10:31:00Z' },
    { id: 'doc-003', technicus_id: 'demo-1', type: 'kvk', bestandsnaam: 'KvK_Uittreksel_PvdBerg.pdf', storage_path: 'demo/kvk.pdf', status: 'goedgekeurd', notitie: 'KvK nummer geverifieerd', vervaldatum: null, beoordeeld_door: 'admin@techmaat.nl', beoordeeld_op: '2026-04-06T14:00:00Z', created_at: '2026-04-06T10:32:00Z' },
    { id: 'doc-004', technicus_id: 'demo-2', type: 'vca', bestandsnaam: 'VCA_Basis_KdGroot.pdf', storage_path: 'demo/vca2.pdf', status: 'afgekeurd', notitie: 'Certificaat is verlopen (2024). Graag nieuw exemplaar uploaden.', vervaldatum: null, beoordeeld_door: 'admin@techmaat.nl', beoordeeld_op: '2026-04-07T09:15:00Z', created_at: '2026-04-06T14:10:00Z' },
    { id: 'doc-005', technicus_id: 'demo-2', type: 'nen_3140', bestandsnaam: 'NEN3140_KdGroot.pdf', storage_path: 'demo/nen.pdf', status: 'wacht', notitie: null, vervaldatum: null, created_at: '2026-04-06T14:11:00Z' },
    { id: 'doc-006', technicus_id: 'demo-2', type: 'f_gassen', bestandsnaam: 'F-gassen_cert_KdGroot.jpg', storage_path: 'demo/fgassen.jpg', status: 'goedgekeurd', notitie: 'Geldig via Certiq register', vervaldatum: '2028-06-15', beoordeeld_door: 'admin@techmaat.nl', beoordeeld_op: '2026-04-07T10:00:00Z', created_at: '2026-04-06T14:12:00Z' }
  ];

  function getTechnicus(id) {
    for (var i = 0; i < technici.length; i++) {
      if (technici[i].id === id) return technici[i];
    }
    return null;
  }

  function init(callback) {
    if (window.TechMaatDB) {
      Promise.all([
        TechMaatDB.getAllDocumenten(),
        TechMaatDB.getTechnici()
      ]).then(function(results) {
        if (results[0] && !results[0].error && Array.isArray(results[0])) {
          documenten = results[0];
          technici = results[1] || [];
          isDemo = false;
        } else {
          documenten = DEMO_DATA;
          technici = DEMO_TECHNICI;
        }
        if (callback) callback();
      }).catch(function() {
        documenten = DEMO_DATA;
        technici = DEMO_TECHNICI;
        if (callback) callback();
      });
    } else {
      documenten = DEMO_DATA;
      technici = DEMO_TECHNICI;
      if (callback) callback();
    }
  }

  function getStats() {
    return {
      totaal: documenten.length,
      wacht: documenten.filter(function(d) { return d.status === 'wacht'; }).length,
      goedgekeurd: documenten.filter(function(d) { return d.status === 'goedgekeurd'; }).length,
      afgekeurd: documenten.filter(function(d) { return d.status === 'afgekeurd'; }).length
    };
  }

  function renderVerificatie(containerId, filter) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var stats = getStats();
    var filtered = documenten;
    if (filter && filter !== 'alle') {
      filtered = documenten.filter(function(d) { return d.status === filter; });
    }

    var html = '';

    // Demo badge
    if (isDemo) {
      html += '<div class="bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-2 mb-6 flex items-center gap-2">' +
        '<span class="material-symbols-outlined text-yellow-600 text-lg">science</span>' +
        '<span class="text-sm text-yellow-700 font-medium">Demo data — voer verificatie-setup.sql uit in Supabase voor live data</span></div>';
    }

    // KPI cards
    html += '<div class="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">';
    html += kpiCard('Totaal', stats.totaal, 'description', 'tm-blue');
    html += kpiCard('Wachtend', stats.wacht, 'pending', 'orange-500');
    html += kpiCard('Goedgekeurd', stats.goedgekeurd, 'check_circle', 'green-600');
    html += kpiCard('Afgekeurd', stats.afgekeurd, 'cancel', 'red-500');
    html += '</div>';

    // Filter tabs
    html += '<div class="flex gap-1 bg-tm-light rounded-lg p-1 mb-6 overflow-x-auto">';
    var tabs = [
      { key: 'alle', label: 'Alle (' + stats.totaal + ')' },
      { key: 'wacht', label: 'Wachtend (' + stats.wacht + ')' },
      { key: 'goedgekeurd', label: 'Goedgekeurd (' + stats.goedgekeurd + ')' },
      { key: 'afgekeurd', label: 'Afgekeurd (' + stats.afgekeurd + ')' }
    ];
    tabs.forEach(function(t) {
      var active = (filter || 'alle') === t.key;
      html += '<button onclick="VerificatieAgent.renderVerificatie(\'' + containerId + '\', \'' + t.key + '\')" class="px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap cursor-pointer ' +
        (active ? 'bg-white text-tm-blue shadow-sm' : 'text-tm-text-light hover:text-tm-text') + '">' + t.label + '</button>';
    });
    html += '</div>';

    // Document list
    if (filtered.length === 0) {
      html += '<div class="bg-white rounded-xl p-8 shadow-sm text-center">' +
        '<span class="material-symbols-outlined text-tm-muted text-5xl mb-3">folder_open</span>' +
        '<p class="text-tm-text-light">Geen documenten in deze categorie.</p></div>';
    } else {
      html += '<div class="space-y-3">';
      filtered.forEach(function(doc) {
        var tech = getTechnicus(doc.technicus_id);
        var techName = tech ? tech.naam : 'Onbekend';
        var techCity = tech ? tech.woonplaats : '';
        var sc = STATUS_COLORS[doc.status] || STATUS_COLORS.wacht;
        var sl = STATUS_LABELS[doc.status] || doc.status;
        var docLabel = DOC_LABELS[doc.type] || doc.type;
        var date = new Date(doc.created_at).toLocaleDateString('nl-NL', { day: 'numeric', month: 'short', year: 'numeric' });

        html += '<div class="bg-white rounded-xl shadow-sm border border-tm-muted overflow-hidden">';

        // Main row
        html += '<div class="p-4 md:p-5 flex flex-col md:flex-row md:items-center gap-3">';

        // Technician info
        html += '<div class="flex items-center gap-3 flex-1 min-w-0">' +
          '<div class="w-10 h-10 bg-tm-orange/10 rounded-full flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-tm-orange">person</span></div>' +
          '<div class="min-w-0"><p class="font-bold text-tm-blue truncate">' + techName + '</p><p class="text-xs text-tm-text-light">' + techCity + '</p></div></div>';

        // Doc type
        html += '<div class="flex items-center gap-2">' +
          '<span class="text-[11px] bg-tm-light text-tm-blue px-2.5 py-1 rounded-full font-medium">' + docLabel + '</span>' +
          '<span class="text-[11px] font-bold px-2 py-0.5 rounded-full ' + sc + '">' + sl + '</span></div>';

        // File info + date
        html += '<div class="text-xs text-tm-text-light flex items-center gap-3">' +
          '<span class="flex items-center gap-1 truncate max-w-[200px]"><span class="material-symbols-outlined text-xs">attach_file</span>' + doc.bestandsnaam + '</span>' +
          '<span>' + date + '</span></div>';

        // Actions
        html += '<div class="flex gap-2 flex-shrink-0">';
        html += '<button onclick="VerificatieAgent.viewDocument(\'' + doc.id + '\')" class="text-sm text-tm-orange font-bold hover:text-tm-orange-dark cursor-pointer flex items-center gap-1"><span class="material-symbols-outlined text-base">visibility</span>Bekijk</button>';
        html += '<button onclick="VerificatieAgent.toggleReview(\'' + doc.id + '\')" class="text-sm text-tm-blue font-bold hover:text-tm-navy cursor-pointer flex items-center gap-1"><span class="material-symbols-outlined text-base">rate_review</span>Review</button>';
        html += '</div>';

        html += '</div>'; // end main row

        // Review panel (hidden by default)
        html += '<div id="review-' + doc.id + '" class="hidden border-t border-tm-muted bg-tm-surface p-4 md:p-5">';
        if (doc.status !== 'wacht' && doc.beoordeeld_door) {
          html += '<div class="mb-3 text-xs text-tm-text-light">Beoordeeld door <strong>' + doc.beoordeeld_door + '</strong> op ' +
            new Date(doc.beoordeeld_op).toLocaleDateString('nl-NL') + '</div>';
        }
        if (doc.notitie) {
          html += '<div class="mb-3 bg-white rounded-lg p-3 text-sm text-tm-text-light border border-tm-muted"><strong>Notitie:</strong> ' + doc.notitie + '</div>';
        }
        html += '<div class="grid md:grid-cols-2 gap-3 mb-4">' +
          '<div><label class="block text-xs font-bold text-tm-blue mb-1 uppercase tracking-widest">Vervaldatum</label>' +
          '<input type="date" id="verval-' + doc.id + '" value="' + (doc.vervaldatum || '') + '" class="w-full bg-white border border-tm-muted rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-tm-orange"/></div>' +
          '<div><label class="block text-xs font-bold text-tm-blue mb-1 uppercase tracking-widest">Notitie</label>' +
          '<input type="text" id="notitie-' + doc.id + '" value="' + (doc.notitie || '') + '" placeholder="Optionele notitie..." class="w-full bg-white border border-tm-muted rounded-lg py-2 px-3 text-sm focus:ring-2 focus:ring-tm-orange"/></div></div>';
        html += '<div class="flex gap-2">' +
          '<button onclick="VerificatieAgent.reviewDocument(\'' + doc.id + '\', \'goedgekeurd\')" class="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-green-700 cursor-pointer flex items-center gap-1"><span class="material-symbols-outlined text-base">check</span>Goedkeuren</button>' +
          '<button onclick="VerificatieAgent.reviewDocument(\'' + doc.id + '\', \'afgekeurd\')" class="bg-red-500 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-600 cursor-pointer flex items-center gap-1"><span class="material-symbols-outlined text-base">close</span>Afkeuren</button>' +
          '</div>';
        html += '</div>'; // end review panel

        html += '</div>'; // end card
      });
      html += '</div>';
    }

    container.innerHTML = html;
  }

  function kpiCard(label, value, icon, color) {
    return '<div class="bg-white rounded-xl p-4 shadow-sm">' +
      '<div class="flex items-center justify-between mb-2"><span class="material-symbols-outlined text-' + color + '">' + icon + '</span></div>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + value + '</p>' +
      '<p class="text-xs text-tm-text-light mt-0.5">' + label + '</p></div>';
  }

  function viewDocument(docId) {
    var doc = documenten.find(function(d) { return d.id === docId; });
    if (!doc) return;

    if (isDemo) {
      alert('Demo modus — documentweergave is niet beschikbaar. Voer verificatie-setup.sql uit voor live functionaliteit.');
      return;
    }

    if (window.TechMaatDB) {
      TechMaatDB.getSignedUrl(doc.storage_path).then(function(url) {
        if (url) window.open(url, '_blank');
        else alert('Kon document niet laden.');
      });
    }
  }

  function toggleReview(docId) {
    var panel = document.getElementById('review-' + docId);
    if (panel) panel.classList.toggle('hidden');
  }

  function reviewDocument(docId, newStatus) {
    var vervaldatum = document.getElementById('verval-' + docId);
    var notitie = document.getElementById('notitie-' + docId);
    var user = (window.TechMaatDB && TechMaatDB.getSession) ? TechMaatDB.getSession() : null;

    var updateData = {
      status: newStatus,
      notitie: notitie ? notitie.value : null,
      vervaldatum: (vervaldatum && vervaldatum.value) ? vervaldatum.value : null,
      beoordeeld_door: user ? user.email : 'admin',
      beoordeeld_op: new Date().toISOString()
    };

    if (isDemo) {
      // Update local demo data
      var doc = documenten.find(function(d) { return d.id === docId; });
      if (doc) {
        doc.status = updateData.status;
        doc.notitie = updateData.notitie;
        doc.vervaldatum = updateData.vervaldatum;
        doc.beoordeeld_door = updateData.beoordeeld_door;
        doc.beoordeeld_op = updateData.beoordeeld_op;
      }
      renderVerificatie('verificatie-container', 'alle');
      return;
    }

    if (window.TechMaatDB) {
      TechMaatDB.updateDocument(docId, updateData).then(function() {
        // Check if all docs for this technicus are now goedgekeurd
        var doc = documenten.find(function(d) { return d.id === docId; });
        if (doc) {
          doc.status = newStatus;
          var techDocs = documenten.filter(function(d) { return d.technicus_id === doc.technicus_id; });
          var allApproved = techDocs.every(function(d) { return d.status === 'goedgekeurd'; });
          var anyRejected = techDocs.some(function(d) { return d.status === 'afgekeurd'; });

          var vStatus = 'in_review';
          if (allApproved) vStatus = 'geverifieerd';
          else if (anyRejected) vStatus = 'afgekeurd';

          TechMaatDB.updateTechnicus(doc.technicus_id, { verificatie_status: vStatus });
        }

        // Reload and re-render
        init(function() {
          renderVerificatie('verificatie-container', 'alle');
        });
      });
    }
  }

  window.VerificatieAgent = {
    init: init,
    getStats: getStats,
    renderVerificatie: renderVerificatie,
    viewDocument: viewDocument,
    toggleReview: toggleReview,
    reviewDocument: reviewDocument
  };
})();
