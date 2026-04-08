/**
 * TechMaat Analytics Agent
 * Platform statistics, trends, and KPI dashboards.
 * Loads data from Supabase (technici, bedrijven, klussen, koppelingen, facturen).
 */
(function() {
  var data = {
    technici: [],
    bedrijven: [],
    klussen: [],
    koppelingen: [],
    facturen: []
  };
  var isDemo = true;

  function formatCurrency(amount) {
    return '\u20AC' + amount.toFixed(2).replace('.', ',');
  }

  function getStats() {
    var now = new Date();
    var thirtyDaysAgo = new Date(now - 30 * 86400000);

    var recentTech = data.technici.filter(function(t) { return new Date(t.created_at) >= thirtyDaysAgo; });
    var recentBed = data.bedrijven.filter(function(b) { return new Date(b.created_at) >= thirtyDaysAgo; });
    var recentKlus = data.klussen.filter(function(k) { return new Date(k.created_at) >= thirtyDaysAgo; });

    var activeKoppel = data.koppelingen.filter(function(k) { return k.status === 'geaccepteerd' || k.status === 'in_afwachting'; });

    var betaaldeFacturen = data.facturen.filter(function(f) { return f.status === 'betaald'; });
    var totalOmzet = data.facturen.reduce(function(sum, f) { return sum + (Number(f.totaal_incl_btw) || 0); }, 0);
    var totalCommissie = data.facturen.reduce(function(sum, f) { return sum + (Number(f.commissie_bedrag) || 0); }, 0);

    // Conversion: koppelingen / (technici + bedrijven) — simplified
    var totalRegistraties = data.technici.length + data.bedrijven.length;
    var conversie = totalRegistraties > 0 ? Math.round((data.koppelingen.length / totalRegistraties) * 100) : 0;

    return {
      technici: data.technici.length,
      bedrijven: data.bedrijven.length,
      klussen: data.klussen.length,
      koppelingen: data.koppelingen.length,
      facturen: data.facturen.length,
      recentTech: recentTech.length,
      recentBed: recentBed.length,
      recentKlus: recentKlus.length,
      activeKoppel: activeKoppel.length,
      totalOmzet: totalOmzet,
      totalCommissie: totalCommissie,
      betaald: betaaldeFacturen.length,
      conversie: conversie
    };
  }

  // Group records by week for the last 8 weeks
  function getWeeklyTrend(records, dateField) {
    var weeks = [];
    var now = new Date();
    for (var i = 7; i >= 0; i--) {
      var weekStart = new Date(now - (i * 7 + 6) * 86400000);
      var weekEnd = new Date(now - i * 7 * 86400000);
      var count = records.filter(function(r) {
        var d = new Date(r[dateField || 'created_at']);
        return d >= weekStart && d < weekEnd;
      }).length;
      var label = weekStart.getDate() + '/' + (weekStart.getMonth() + 1);
      weeks.push({ label: label, count: count });
    }
    return weeks;
  }

  // Simple CSS bar chart renderer
  function renderBarChart(title, weeks, color) {
    var maxCount = Math.max.apply(null, weeks.map(function(w) { return w.count; }));
    if (maxCount === 0) maxCount = 1;

    var html = '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted">' +
      '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">' + title + '</h4>' +
      '<div class="flex items-end gap-2 h-32">';

    weeks.forEach(function(w) {
      var height = Math.max(4, Math.round((w.count / maxCount) * 100));
      html += '<div class="flex-1 flex flex-col items-center gap-1">' +
        '<span class="text-[10px] font-bold text-tm-text-light">' + (w.count || '') + '</span>' +
        '<div class="w-full rounded-t-md transition-all ' + color + '" style="height:' + height + '%"></div>' +
        '<span class="text-[9px] text-tm-text-light">' + w.label + '</span>' +
        '</div>';
    });

    html += '</div></div>';
    return html;
  }

  // Specialismen distribution
  function getSpecialismeStats() {
    var counts = {};
    data.technici.forEach(function(t) {
      (t.specialismen || []).forEach(function(s) {
        counts[s] = (counts[s] || 0) + 1;
      });
    });
    var sorted = Object.keys(counts).map(function(k) { return { naam: k, count: counts[k] }; });
    sorted.sort(function(a, b) { return b.count - a.count; });
    return sorted;
  }

  // Beschikbaarheid distribution
  function getBeschikbaarheidStats() {
    var counts = {};
    data.technici.forEach(function(t) {
      var b = t.beschikbaarheid || 'Onbekend';
      counts[b] = (counts[b] || 0) + 1;
    });
    return Object.keys(counts).map(function(k) { return { naam: k, count: counts[k] }; });
  }

  // Koppeling status distribution
  function getKoppelingStats() {
    var counts = { in_afwachting: 0, geaccepteerd: 0, afgewezen: 0, voltooid: 0 };
    data.koppelingen.forEach(function(k) {
      if (counts.hasOwnProperty(k.status)) counts[k.status]++;
    });
    return counts;
  }

  // Factuur status distribution
  function getFactuurStats() {
    var counts = { concept: 0, verzonden: 0, betaald: 0, verlopen: 0 };
    data.facturen.forEach(function(f) {
      if (counts.hasOwnProperty(f.status)) counts[f.status]++;
    });
    return counts;
  }

  function renderHorizontalBar(items, total, color) {
    if (items.length === 0) return '<p class="text-xs text-tm-text-light">Geen data beschikbaar.</p>';
    var html = '';
    items.forEach(function(item) {
      var pct = total > 0 ? Math.round((item.count / total) * 100) : 0;
      html += '<div class="flex items-center gap-3 mb-2">' +
        '<span class="text-xs text-tm-text-light w-28 truncate">' + item.naam + '</span>' +
        '<div class="flex-1 bg-tm-light rounded-full h-2.5 overflow-hidden">' +
        '<div class="h-full rounded-full ' + color + '" style="width:' + Math.max(3, pct) + '%"></div>' +
        '</div>' +
        '<span class="text-xs font-bold text-tm-text-light min-w-[40px] text-right">' + item.count + '</span>' +
        '</div>';
    });
    return html;
  }

  function renderStatusPills(counts, colorMap) {
    var html = '<div class="flex flex-wrap gap-2">';
    Object.keys(counts).forEach(function(key) {
      var c = colorMap[key] || 'bg-gray-100 text-gray-600';
      var label = key.charAt(0).toUpperCase() + key.slice(1).replace('_', ' ');
      html += '<span class="text-xs font-bold px-3 py-1.5 rounded-full ' + c + '">' + label + ': ' + counts[key] + '</span>';
    });
    html += '</div>';
    return html;
  }

  function renderAnalytics(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var stats = getStats();
    var html = '';

    // Demo badge
    if (isDemo) {
      html += '<div class="flex justify-end mb-3">' +
        '<span class="text-[10px] font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Demo data</span>' +
        '</div>';
    }

    // ─── KPI Cards (top row) ───
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">';

    var kpis = [
      { label: 'Technici', value: stats.technici, sub: '+' + stats.recentTech + ' deze maand', icon: 'person', border: 'border-tm-orange' },
      { label: 'Bedrijven', value: stats.bedrijven, sub: '+' + stats.recentBed + ' deze maand', icon: 'business', border: 'border-tm-blue' },
      { label: 'Koppelingen', value: stats.koppelingen, sub: stats.activeKoppel + ' actief', icon: 'swap_horiz', border: 'border-green-400' },
      { label: 'Conversie', value: stats.conversie + '%', sub: 'koppelingen / registraties', icon: 'trending_up', border: 'border-purple-400' }
    ];

    kpis.forEach(function(kpi) {
      html += '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 ' + kpi.border + '">' +
        '<div class="flex items-center justify-between mb-1">' +
        '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">' + kpi.label + '</p>' +
        '<span class="material-symbols-outlined text-tm-muted text-lg">' + kpi.icon + '</span>' +
        '</div>' +
        '<p class="text-2xl font-headline font-bold text-tm-blue">' + kpi.value + '</p>' +
        '<p class="text-[11px] text-tm-text-light mt-0.5">' + kpi.sub + '</p>' +
        '</div>';
    });

    html += '</div>';

    // ─── Revenue row ───
    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">' +
        '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Totale omzet</p>' +
        '<p class="text-2xl font-headline font-bold text-tm-blue mt-1">' + formatCurrency(stats.totalOmzet) + '</p>' +
        '<p class="text-[11px] text-tm-text-light">' + stats.facturen + ' facturen</p>' +
      '</div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-orange">' +
        '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Commissie-inkomsten</p>' +
        '<p class="text-2xl font-headline font-bold text-tm-orange mt-1">' + formatCurrency(stats.totalCommissie) + '</p>' +
        '<p class="text-[11px] text-tm-text-light">' + stats.betaald + ' betaald</p>' +
      '</div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-blue">' +
        '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Klussen</p>' +
        '<p class="text-2xl font-headline font-bold text-tm-blue mt-1">' + stats.klussen + '</p>' +
        '<p class="text-[11px] text-tm-text-light">+' + stats.recentKlus + ' deze maand</p>' +
      '</div>' +
    '</div>';

    // ─── Trend Charts ───
    var techTrend = getWeeklyTrend(data.technici, 'created_at');
    var bedrijfTrend = getWeeklyTrend(data.bedrijven, 'created_at');
    var klusTrend = getWeeklyTrend(data.klussen, 'created_at');

    html += '<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">';
    html += renderBarChart('Technici aanmeldingen (8 weken)', techTrend, 'bg-tm-orange');
    html += renderBarChart('Bedrijf aanmeldingen (8 weken)', bedrijfTrend, 'bg-tm-blue');
    html += renderBarChart('Nieuwe klussen (8 weken)', klusTrend, 'bg-green-500');
    html += '</div>';

    // ─── Distributions ───
    var specStats = getSpecialismeStats();
    var beschikStats = getBeschikbaarheidStats();
    var kopStats = getKoppelingStats();
    var factStats = getFactuurStats();

    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';

    // Specialismen
    html += '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted">' +
      '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">Specialismen verdeling</h4>' +
      renderHorizontalBar(specStats, data.technici.length, 'bg-tm-orange') +
      '</div>';

    // Beschikbaarheid
    html += '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted">' +
      '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">Beschikbaarheid technici</h4>' +
      renderHorizontalBar(beschikStats, data.technici.length, 'bg-tm-blue') +
      '</div>';

    html += '</div>';

    // ─── Status overviews ───
    html += '<div class="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">';

    // Koppeling status
    html += '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted">' +
      '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">Koppelingen status</h4>' +
      renderStatusPills(kopStats, {
        'in_afwachting': 'bg-yellow-100 text-yellow-700',
        'geaccepteerd': 'bg-green-100 text-green-700',
        'afgewezen': 'bg-red-100 text-red-600',
        'voltooid': 'bg-tm-light text-tm-blue'
      }) +
      '</div>';

    // Factuur status
    html += '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted">' +
      '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">Facturen status</h4>' +
      renderStatusPills(factStats, {
        'concept': 'bg-gray-100 text-gray-600',
        'verzonden': 'bg-orange-100 text-orange-700',
        'betaald': 'bg-green-100 text-green-700',
        'verlopen': 'bg-red-100 text-red-600'
      }) +
      '</div>';

    html += '</div>';

    // ─── Top matches ───
    if (data.koppelingen.length > 0) {
      var topKoppel = data.koppelingen.slice().sort(function(a, b) { return (b.score || 0) - (a.score || 0); }).slice(0, 5);

      html += '<div class="bg-white rounded-xl p-5 shadow-sm border border-tm-muted mb-6">' +
        '<h4 class="font-headline font-bold text-tm-blue text-sm mb-4">Top 5 matches (hoogste score)</h4>' +
        '<div class="space-y-2">';

      topKoppel.forEach(function(k, i) {
        var scoreColor = (k.score || 0) >= 75 ? 'text-green-600' : (k.score || 0) >= 50 ? 'text-tm-orange' : 'text-red-500';
        html += '<div class="flex items-center justify-between py-2 ' + (i < topKoppel.length - 1 ? 'border-b border-tm-muted/50' : '') + '">' +
          '<div class="flex items-center gap-3">' +
          '<span class="text-xs font-bold text-tm-text-light w-5">#' + (i + 1) + '</span>' +
          '<div>' +
          '<p class="text-sm font-medium text-tm-blue">' + (k.technicus_naam || '') + ' ↔ ' + (k.bedrijf_naam || '') + '</p>' +
          '<p class="text-[11px] text-tm-text-light">' + (k.status || '') + '</p>' +
          '</div>' +
          '</div>' +
          '<span class="text-sm font-bold ' + scoreColor + '">' + (k.score || 0) + '%</span>' +
          '</div>';
      });

      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  function init() {
    if (window.TechMaatDB) {
      var promises = [
        TechMaatDB.getTechnici(),
        TechMaatDB.getBedrijven(),
        TechMaatDB.getKlussen()
      ];

      // These tables may not exist yet, so catch individually
      if (TechMaatDB.getKoppelingen) promises.push(TechMaatDB.getKoppelingen());
      else promises.push(Promise.resolve([]));

      if (TechMaatDB.getFacturen) promises.push(TechMaatDB.getFacturen());
      else promises.push(Promise.resolve([]));

      Promise.all(promises).then(function(results) {
        data.technici = Array.isArray(results[0]) ? results[0] : [];
        data.bedrijven = Array.isArray(results[1]) ? results[1] : [];
        data.klussen = Array.isArray(results[2]) ? results[2] : [];
        data.koppelingen = Array.isArray(results[3]) ? results[3] : [];
        data.facturen = Array.isArray(results[4]) ? results[4] : [];

        if (data.technici.length > 0 || data.bedrijven.length > 0) {
          isDemo = false;
        }
      }).catch(function() {
        // All data stays empty, renders as no-data state
      });
    }
  }

  window.AnalyticsAgent = {
    init: init,
    getStats: getStats,
    renderAnalytics: renderAnalytics
  };
})();
