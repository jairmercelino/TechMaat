/**
 * TechMaat Matching Agent
 * Koppelt technici aan bedrijven/klussen op basis van specialisme, beschikbaarheid en certificeringen.
 */
(function() {
  var technici = [];
  var bedrijven = [];
  var isDemo = true;
  var selectedBedrijfIndex = -1;

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
        '<button class="text-[11px] bg-tm-muted text-tm-text-light px-3 py-1.5 rounded-lg font-medium cursor-not-allowed opacity-50" disabled>Koppel</button>' +
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
        TechMaatDB.getBedrijven()
      ]).then(function(results) {
        var dbTechnici = Array.isArray(results[0]) ? results[0] : [];
        var dbBedrijven = Array.isArray(results[1]) ? results[1] : [];

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
    selectBedrijf: selectBedrijf
  };
})();
