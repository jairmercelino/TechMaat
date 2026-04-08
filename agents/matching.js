/**
 * TechMaat Matching Agent
 * Koppelt technici aan bedrijven/klussen op basis van specialisme, beschikbaarheid en certificeringen.
 */
(function() {
  var technici = [];
  var bedrijven = [];
  var koppelingen = [];
  var isDemo = true;
  var selectedBedrijfIndex = -1;
  var FORMSPREE_URL = 'https://formspree.io/f/xaqlakdb';

  // Branche → verwachte specialismen mapping
  var BRANCHE_SPECIALISMEN = {
    'Voedingsindustrie': ['Mechanica', 'Hydrauliek', 'Elektrotechniek', 'PLC/Besturingen'],
    'Metaalindustrie': ['Lassen', 'Mechanica', 'PLC/Besturingen'],
    'Logistiek': ['Elektrotechniek', 'Mechanica'],
    'Bouw': ['Mechanica', 'Elektrotechniek', 'Lassen'],
    'Energie': ['Elektrotechniek', 'Instrumentatie', 'PLC/Besturingen']
  };

  /**
   * Bereken match score tussen technicus en bedrijf
   * @returns {object} { score: 0-100, reasons: string[] }
   */
  function matchScore(technicus, bedrijf) {
    var score = 0;
    var reasons = [];

    // --- Specialisme match (max 40 punten) ---
    var gewenst = BRANCHE_SPECIALISMEN[bedrijf.branche] || [];
    var techSpec = technicus.specialismen || [];
    if (gewenst.length > 0 && techSpec.length > 0) {
      var matches = [];
      techSpec.forEach(function(s) {
        if (gewenst.indexOf(s) !== -1) matches.push(s);
      });
      if (matches.length > 0) {
        var specScore = Math.round((matches.length / gewenst.length) * 40);
        score += specScore;
        reasons.push('Specialisme match: ' + matches.join(', '));
      }
    }

    // --- Type werk match (max 20 punten) ---
    var typeWerk = bedrijf.type_werk || '';
    var beschikbaarheid = technicus.beschikbaarheid || '';
    var ploeg = technicus.ploegendienst || '';

    if (typeWerk === 'Storingsdienst') {
      if (beschikbaarheid === 'Direct beschikbaar') { score += 10; reasons.push('Direct beschikbaar voor storingsdienst'); }
      if (ploeg.indexOf('5-ploegen') !== -1) { score += 10; reasons.push('5-ploegen geschikt voor storingsdienst'); }
      else if (ploeg.indexOf('3-ploegen') !== -1) { score += 5; }
    } else if (typeWerk === 'Onderhoud') {
      if (ploeg.indexOf('3-ploegen') !== -1 || ploeg.indexOf('Dagdienst') !== -1 || ploeg.toLowerCase().indexOf('dagdienst') !== -1) {
        score += 15; reasons.push('Dienstrooster geschikt voor onderhoud');
      }
      if (beschikbaarheid === 'Direct beschikbaar' || beschikbaarheid === 'Binnen 1 week') { score += 5; }
    } else if (typeWerk === 'Projectmatig') {
      score += 15;
      reasons.push('Beschikbaar voor projectmatig werk');
      if (beschikbaarheid === 'Direct beschikbaar' || beschikbaarheid === 'Binnen 1 week') { score += 5; }
    } else if (typeWerk === 'Detachering') {
      if (beschikbaarheid === 'Direct beschikbaar') { score += 20; reasons.push('Direct beschikbaar voor detachering'); }
      else if (beschikbaarheid === 'Binnen 1 week') { score += 15; reasons.push('Binnen 1 week beschikbaar voor detachering'); }
      else if (beschikbaarheid === 'Binnen 1 maand') { score += 5; }
    }

    // --- Beschikbaarheid (max 20 punten) ---
    if (beschikbaarheid === 'Direct beschikbaar') { score += 20; if (reasons.indexOf('Direct beschikbaar voor storingsdienst') === -1 && reasons.indexOf('Direct beschikbaar voor detachering') === -1) reasons.push('Direct beschikbaar'); }
    else if (beschikbaarheid === 'Binnen 1 week') { score += 15; reasons.push('Binnen 1 week beschikbaar'); }
    else if (beschikbaarheid === 'Binnen 1 maand') { score += 10; reasons.push('Binnen 1 maand beschikbaar'); }
    else if (beschikbaarheid === 'Op afspraak') { score += 5; reasons.push('Op afspraak beschikbaar'); }

    // --- Certificeringen bonus (max 20 punten) ---
    var certScore = 0;
    var certs = technicus.certificeringen || [];
    certs.forEach(function(c) {
      if (c === 'VCA VOL' && certScore < 20) { certScore += 10; reasons.push('VCA VOL certificering'); }
      else if (c === 'VCA Basis' && certScore < 20) { certScore += 5; reasons.push('VCA Basis certificering'); }
      else if (c === 'NEN 3140' && certScore < 20) { certScore += 5; reasons.push('NEN 3140 certificering'); }
      else if (c === 'F-gassen' && certScore < 20) { certScore += 5; reasons.push('F-gassen certificering'); }
    });
    if (certScore > 20) certScore = 20;
    score += certScore;

    // Cap total at 100
    if (score > 100) score = 100;

    return { score: score, reasons: reasons };
  }

  function findMatches(bedrijf) {
    var results = [];
    technici.forEach(function(t) {
      var result = matchScore(t, bedrijf);
      results.push({ technicus: t, score: result.score, reasons: result.reasons });
    });
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  function findJobsForTechnicus(technicus) {
    var results = [];
    bedrijven.forEach(function(b) {
      var result = matchScore(technicus, b);
      results.push({ bedrijf: b, score: result.score, reasons: result.reasons });
    });
    results.sort(function(a, b) { return b.score - a.score; });
    return results;
  }

  function renderScoreBar(score) {
    var color = score >= 75 ? 'bg-green-500' : (score >= 50 ? 'bg-tm-orange' : 'bg-red-400');
    var textColor = score >= 75 ? 'text-green-600' : (score >= 50 ? 'text-tm-orange' : 'text-red-500');
    return '<div class="flex items-center gap-3">' +
      '<div class="flex-1 bg-tm-light rounded-full h-2.5 overflow-hidden">' +
      '<div class="h-full rounded-full transition-all ' + color + '" style="width:' + score + '%"></div>' +
      '</div>' +
      '<span class="text-sm font-bold ' + textColor + ' min-w-[40px] text-right">' + score + '%</span>' +
      '</div>';
  }

  function renderBedrijfList(containerId) {
    if (bedrijven.length === 0) {
      return '<div class="bg-white rounded-xl p-8 shadow-sm text-center text-tm-text-light">' +
        '<span class="material-symbols-outlined text-tm-muted text-4xl mb-3 block">business</span>' +
        '<p>Nog geen bedrijven beschikbaar.</p></div>';
    }
    var html = '';
    bedrijven.forEach(function(b, i) {
      var isSelected = i === selectedBedrijfIndex;
      var borderClass = isSelected ? 'border-tm-orange border-2' : 'border-tm-muted border';
      html += '<div class="bg-white rounded-xl p-4 shadow-sm ' + borderClass + ' hover:border-tm-orange/50 transition-colors cursor-pointer mb-3" onclick="MatchingAgent.selectBedrijf(' + i + ', \'' + containerId + '\')">' +
        '<div class="flex items-center gap-3 mb-2">' +
        '<div class="w-9 h-9 bg-tm-blue/10 rounded-full flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-tm-blue text-lg">business</span></div>' +
        '<div class="min-w-0">' +
        '<h3 class="font-bold text-tm-blue text-sm truncate">' + (b.bedrijfsnaam || 'Onbekend') + '</h3>' +
        '<p class="text-[11px] text-tm-text-light">' + (b.locatie || '') + '</p>' +
        '</div>' +
        '</div>' +
        '<div class="flex gap-1.5 flex-wrap">' +
        '<span class="text-[10px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + (b.branche || '') + '</span>' +
        '<span class="text-[10px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + (b.type_werk || '') + '</span>' +
        '</div>' +
        '</div>';
    });
    return html;
  }

  function findExistingKoppeling(technicusId, bedrijfId) {
    for (var i = 0; i < koppelingen.length; i++) {
      if (koppelingen[i].technicus_id === technicusId && koppelingen[i].bedrijf_id === bedrijfId) {
        return koppelingen[i];
      }
    }
    return null;
  }

  function renderKoppelButton(technicus, bedrijf) {
    if (!technicus.id || !bedrijf.id) {
      return '<button class="text-[11px] bg-tm-muted text-tm-text-light px-3 py-1.5 rounded-lg font-medium cursor-not-allowed opacity-50" disabled>Koppel</button>';
    }

    var existing = findExistingKoppeling(technicus.id, bedrijf.id);
    if (existing) {
      var statusMap = {
        'in_afwachting': { label: 'In afwachting', cls: 'bg-yellow-100 text-yellow-700' },
        'geaccepteerd': { label: 'Gekoppeld', cls: 'bg-green-100 text-green-700' },
        'afgewezen': { label: 'Afgewezen', cls: 'bg-red-100 text-red-500' },
        'voltooid': { label: 'Voltooid', cls: 'bg-tm-light text-tm-blue' }
      };
      var s = statusMap[existing.status] || statusMap['in_afwachting'];
      return '<span class="text-[11px] ' + s.cls + ' px-3 py-1.5 rounded-lg font-medium">' + s.label + '</span>';
    }

    return '<button class="text-[11px] bg-tm-orange text-white px-3 py-1.5 rounded-lg font-medium hover:bg-tm-orange-dark transition-colors" ' +
      'onclick="event.stopPropagation(); MatchingAgent.showKoppelModal(\'' + technicus.id + '\', \'' + bedrijf.id + '\')">Koppel</button>';
  }

  function showKoppelModal(technicusId, bedrijfId) {
    var technicus = technici.find(function(t) { return t.id === technicusId; });
    var bedrijf = bedrijven.find(function(b) { return b.id === bedrijfId; });
    if (!technicus || !bedrijf) return;

    var result = matchScore(technicus, bedrijf);

    // Remove existing modal if any
    var existing = document.getElementById('koppel-modal');
    if (existing) existing.remove();

    var modal = document.createElement('div');
    modal.id = 'koppel-modal';
    modal.className = 'fixed inset-0 z-[100] flex items-center justify-center bg-black/50';
    modal.innerHTML =
      '<div class="bg-white rounded-2xl shadow-2xl max-w-md w-full mx-4 overflow-hidden">' +
        '<div class="bg-tm-blue px-6 py-4">' +
          '<h3 class="font-headline font-bold text-white text-lg">Koppeling bevestigen</h3>' +
        '</div>' +
        '<div class="px-6 py-5">' +
          '<div class="flex items-center gap-3 mb-4">' +
            '<div class="flex-1 text-center">' +
              '<div class="w-12 h-12 bg-tm-orange/10 rounded-full flex items-center justify-center mx-auto mb-1"><span class="material-symbols-outlined text-tm-orange">person</span></div>' +
              '<p class="text-sm font-bold text-tm-blue">' + (technicus.naam || 'Technicus') + '</p>' +
              '<p class="text-[11px] text-tm-text-light">' + (technicus.woonplaats || '') + '</p>' +
            '</div>' +
            '<div class="flex-shrink-0">' +
              '<span class="material-symbols-outlined text-tm-orange text-3xl">swap_horiz</span>' +
            '</div>' +
            '<div class="flex-1 text-center">' +
              '<div class="w-12 h-12 bg-tm-blue/10 rounded-full flex items-center justify-center mx-auto mb-1"><span class="material-symbols-outlined text-tm-blue">business</span></div>' +
              '<p class="text-sm font-bold text-tm-blue">' + (bedrijf.bedrijfsnaam || 'Bedrijf') + '</p>' +
              '<p class="text-[11px] text-tm-text-light">' + (bedrijf.locatie || '') + '</p>' +
            '</div>' +
          '</div>' +
          '<div class="bg-tm-light rounded-xl p-3 mb-4">' +
            '<div class="flex items-center justify-between mb-1">' +
              '<span class="text-xs font-bold text-tm-blue">Match score</span>' +
              '<span class="text-sm font-bold ' + (result.score >= 75 ? 'text-green-600' : result.score >= 50 ? 'text-tm-orange' : 'text-red-500') + '">' + result.score + '%</span>' +
            '</div>' +
            renderScoreBar(result.score) +
          '</div>' +
          '<div class="mb-4">' +
            '<label class="text-xs font-bold text-tm-blue block mb-1">Notitie (optioneel)</label>' +
            '<textarea id="koppel-notitie" rows="2" class="w-full border border-tm-muted rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-tm-orange" placeholder="Eventuele opmerkingen..."></textarea>' +
          '</div>' +
          '<p class="text-[11px] text-tm-text-light mb-4">Beide partijen ontvangen een e-mail notificatie over deze koppeling.</p>' +
        '</div>' +
        '<div class="flex gap-3 px-6 pb-5">' +
          '<button onclick="document.getElementById(\'koppel-modal\').remove()" class="flex-1 text-sm font-medium text-tm-text-light bg-tm-light hover:bg-tm-muted rounded-lg py-2.5 transition-colors">Annuleren</button>' +
          '<button id="koppel-confirm-btn" onclick="MatchingAgent.confirmKoppeling(\'' + technicusId + '\', \'' + bedrijfId + '\')" class="flex-1 text-sm font-bold text-white bg-tm-orange hover:bg-tm-orange-dark rounded-lg py-2.5 transition-colors">Koppel nu</button>' +
        '</div>' +
      '</div>';

    modal.addEventListener('click', function(e) {
      if (e.target === modal) modal.remove();
    });

    document.body.appendChild(modal);
  }

  function confirmKoppeling(technicusId, bedrijfId) {
    var technicus = technici.find(function(t) { return t.id === technicusId; });
    var bedrijf = bedrijven.find(function(b) { return b.id === bedrijfId; });
    if (!technicus || !bedrijf) return;

    var btn = document.getElementById('koppel-confirm-btn');
    if (btn) {
      btn.disabled = true;
      btn.textContent = 'Bezig...';
    }

    var result = matchScore(technicus, bedrijf);
    var notitie = (document.getElementById('koppel-notitie') || {}).value || '';

    var koppelData = {
      technicus_id: technicusId,
      bedrijf_id: bedrijfId,
      technicus_naam: technicus.naam || 'Onbekend',
      bedrijf_naam: bedrijf.bedrijfsnaam || 'Onbekend',
      score: result.score,
      redenen: result.reasons,
      status: 'in_afwachting',
      notitie: notitie || null
    };

    // Save to Supabase
    var savePromise = window.TechMaatDB
      ? TechMaatDB.insertKoppeling(koppelData)
      : Promise.resolve(koppelData);

    // Send email notification via Formspree
    var emailData = {
      _subject: 'TechMaat — Nieuwe koppeling: ' + koppelData.technicus_naam + ' ↔ ' + koppelData.bedrijf_naam,
      type: 'koppeling',
      technicus: koppelData.technicus_naam,
      technicus_email: technicus.email || '',
      bedrijf: koppelData.bedrijf_naam,
      bedrijf_email: bedrijf.email || '',
      score: result.score + '%',
      redenen: result.reasons.join(', '),
      notitie: notitie || '(geen)'
    };

    var emailPromise = fetch(FORMSPREE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON.stringify(emailData)
    }).catch(function() { /* email failure is non-blocking */ });

    Promise.all([savePromise, emailPromise]).then(function(results) {
      var saved = Array.isArray(results[0]) ? results[0][0] : results[0];
      if (saved && saved.id) {
        koppelingen.push(saved);
      } else {
        // Fallback: add locally so UI updates
        koppelData.id = 'local-' + Date.now();
        koppelingen.push(koppelData);
      }

      // Close modal and re-render
      var modal = document.getElementById('koppel-modal');
      if (modal) modal.remove();

      showSuccessToast(koppelData.technicus_naam, koppelData.bedrijf_naam);

      // Re-render matching view
      renderMatching('section-matching');
    }).catch(function() {
      if (btn) {
        btn.disabled = false;
        btn.textContent = 'Koppel nu';
      }
    });
  }

  function showSuccessToast(techNaam, bedrijfNaam) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[101] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up';
    toast.innerHTML = '<span class="material-symbols-outlined">check_circle</span>' +
      '<div><p class="font-bold text-sm">Koppeling aangemaakt</p>' +
      '<p class="text-xs opacity-90">' + techNaam + ' ↔ ' + bedrijfNaam + '</p></div>';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 3500);
  }

  function renderMatchResults(bedrijf) {
    if (!bedrijf) {
      return '<div class="bg-white rounded-xl p-8 shadow-sm text-center text-tm-text-light">' +
        '<span class="material-symbols-outlined text-tm-muted text-4xl mb-3 block">swap_horiz</span>' +
        '<p>Selecteer een bedrijf om matches te bekijken.</p></div>';
    }

    var matches = findMatches(bedrijf);

    if (matches.length === 0) {
      return '<div class="bg-white rounded-xl p-8 shadow-sm text-center text-tm-text-light">' +
        '<span class="material-symbols-outlined text-tm-muted text-4xl mb-3 block">person_off</span>' +
        '<p>Geen technici beschikbaar om te matchen.</p></div>';
    }

    var html = '<div class="mb-4">' +
      '<h3 class="font-headline font-bold text-tm-blue text-lg">Matches voor ' + (bedrijf.bedrijfsnaam || 'bedrijf') + '</h3>' +
      '<p class="text-xs text-tm-text-light mt-0.5">' + (bedrijf.branche || '') + ' &middot; ' + (bedrijf.type_werk || '') + ' &middot; ' + (bedrijf.locatie || '') + '</p>' +
      '</div>';

    matches.forEach(function(m) {
      var t = m.technicus;
      html += '<div class="bg-white rounded-xl p-4 shadow-sm border border-tm-muted mb-3">' +
        '<div class="flex items-start justify-between mb-3">' +
        '<div class="flex items-center gap-3">' +
        '<div class="w-10 h-10 bg-tm-orange/10 rounded-full flex items-center justify-center flex-shrink-0"><span class="material-symbols-outlined text-tm-orange">person</span></div>' +
        '<div>' +
        '<h4 class="font-bold text-tm-blue text-sm">' + (t.naam || 'Onbekend') + '</h4>' +
        '<p class="text-[11px] text-tm-text-light">' + (t.woonplaats || '') + ' &middot; &euro;' + (t.uurtarief || '?') + '/uur</p>' +
        '</div>' +
        '</div>' +
        renderKoppelButton(t, bedrijf) +
        '</div>' +
        renderScoreBar(m.score) +
        '<div class="flex flex-wrap gap-1.5 mt-3">' +
        (t.specialismen || []).map(function(s) {
          return '<span class="text-[10px] bg-tm-light text-tm-blue px-2 py-0.5 rounded-full font-medium">' + s + '</span>';
        }).join('') +
        '</div>' +
        '<div class="mt-3 pt-3 border-t border-tm-muted/50">' +
        '<p class="text-[11px] text-tm-text-light font-bold uppercase tracking-wider mb-1.5">Match redenen</p>' +
        '<div class="flex flex-wrap gap-1.5">' +
        m.reasons.map(function(r) {
          return '<span class="text-[10px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full">' + r + '</span>';
        }).join('') +
        '</div>' +
        '</div>' +
        '</div>';
    });

    return html;
  }

  function renderMatching(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';

    // Demo badge
    if (isDemo) {
      html += '<div class="flex justify-end mb-3">' +
        '<span class="text-[10px] font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Demo data</span>' +
        '</div>';
    }

    if (technici.length === 0 && bedrijven.length === 0) {
      html += '<div class="bg-white rounded-xl p-8 shadow-sm text-center text-tm-text-light">' +
        '<span class="material-symbols-outlined text-tm-muted text-6xl mb-4 block">swap_horiz</span>' +
        '<h3 class="font-headline font-bold text-xl text-tm-blue mb-2">Geen data beschikbaar</h3>' +
        '<p class="max-w-md mx-auto">Er zijn nog geen technici of bedrijven om te matchen. Voeg eerst data toe via het aanmeldformulier of de Inbox Agent.</p>' +
        '</div>';
      container.innerHTML = html;
      return;
    }

    // Two-column layout
    html += '<div class="grid grid-cols-1 lg:grid-cols-12 gap-6">';

    // Left column: bedrijven
    html += '<div class="lg:col-span-4">' +
      '<h3 class="font-headline font-bold text-tm-blue text-sm uppercase tracking-wider mb-3">Bedrijven</h3>' +
      renderBedrijfList(containerId) +
      '</div>';

    // Right column: match results
    html += '<div class="lg:col-span-8">' +
      '<h3 class="font-headline font-bold text-tm-blue text-sm uppercase tracking-wider mb-3">Technicus matches</h3>' +
      '<div id="matching-results">' +
      renderMatchResults(selectedBedrijfIndex >= 0 ? bedrijven[selectedBedrijfIndex] : null) +
      '</div>' +
      '</div>';

    html += '</div>';

    container.innerHTML = html;
  }

  function selectBedrijf(index, containerId) {
    selectedBedrijfIndex = index;
    renderMatching(containerId);
  }

  function init() {
    // Try loading from Supabase first
    if (window.TechMaatDB) {
      Promise.all([
        TechMaatDB.getTechnici(),
        TechMaatDB.getBedrijven(),
        TechMaatDB.getKoppelingen ? TechMaatDB.getKoppelingen() : Promise.resolve([])
      ]).then(function(results) {
        var dbTechnici = Array.isArray(results[0]) ? results[0] : [];
        var dbBedrijven = Array.isArray(results[1]) ? results[1] : [];
        koppelingen = Array.isArray(results[2]) ? results[2] : [];

        if (dbTechnici.length > 0 || dbBedrijven.length > 0) {
          technici = dbTechnici;
          bedrijven = dbBedrijven;
          isDemo = false;
        } else {
          loadDemoData();
        }
      }).catch(function() {
        loadDemoData();
      });
    } else {
      loadDemoData();
    }
  }

  function loadDemoData() {
    isDemo = true;
    if (window.InboxAgent) {
      var subs = InboxAgent.getSubmissions();
      technici = subs.filter(function(s) { return s.type === 'technicus'; });
      bedrijven = subs.filter(function(s) { return s.type === 'bedrijf'; });
    }
  }

  // Public API
  window.MatchingAgent = {
    init: init,
    matchScore: matchScore,
    findMatches: findMatches,
    findJobsForTechnicus: findJobsForTechnicus,
    renderMatching: renderMatching,
    selectBedrijf: selectBedrijf,
    showKoppelModal: showKoppelModal,
    confirmKoppeling: confirmKoppeling
  };
})();
