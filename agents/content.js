/**
 * TechMaat Content Agent
 * Generates social media and recruitment content templates.
 */
(function() {
  var technici = [];
  var bedrijven = [];
  var klussen = [];
  var isDemo = true;
  var generatedPosts = [];
  var POSTS_KEY = 'tm_content_posts';

  var TEMPLATES = {
    linkedin_technicus: {
      platform: 'LinkedIn',
      type: 'Technicus spotlight',
      icon: 'person',
      generate: function(t) {
        var specs = (t.specialismen || []).join(', ') || 'diverse specialismen';
        var certs = (t.certificeringen || []).join(', ');
        return {
          titel: 'Nieuw talent: ' + (t.naam || 'Technicus'),
          tekst: '\uD83D\uDD27 Nieuw bij TechMaat: ' + (t.naam || 'een ervaren technicus') + '!\n\n' +
            'Specialismen: ' + specs + '\n' +
            (certs ? 'Certificeringen: ' + certs + '\n' : '') +
            'Beschikbaarheid: ' + (t.beschikbaarheid || 'Op afspraak') + '\n' +
            'Regio: ' + (t.woonplaats || 'Nederland') + '\n\n' +
            'Op zoek naar technisch talent? Via TechMaat vindt u direct de juiste specialist.\n\n' +
            '#TechMaat #ZZP #Techniek #' + (t.specialismen && t.specialismen[0] ? t.specialismen[0].replace(/[^a-zA-Z]/g, '') : 'Industrie'),
          platform: 'LinkedIn'
        };
      }
    },
    linkedin_klus: {
      platform: 'LinkedIn',
      type: 'Klus beschikbaar',
      icon: 'work',
      generate: function(k) {
        return {
          titel: 'Klus: ' + (k.titel || 'Nieuwe opdracht'),
          tekst: '\uD83D\uDCBC Nieuwe klus op TechMaat!\n\n' +
            '\uD83D\uDD27 ' + (k.titel || 'Technische opdracht') + '\n' +
            '\uD83D\uDCCD ' + (k.locatie || 'Nederland') + '\n' +
            '\u23F0 Urgentie: ' + (k.urgentie || 'Normaal') + '\n' +
            '\uD83D\uDCC5 Duur: ' + (k.duur || 'Nader te bepalen') + '\n' +
            (k.specialisme ? '\uD83C\uDFAF Specialisme: ' + k.specialisme + '\n' : '') +
            '\n' + (k.omschrijving || '') + '\n\n' +
            'Interesse? Meld je aan via techmaat.nl\n\n' +
            '#TechMaat #Vacature #Techniek #ZZP',
          platform: 'LinkedIn'
        };
      }
    },
    linkedin_bedrijf: {
      platform: 'LinkedIn',
      type: 'Bedrijf welkom',
      icon: 'business',
      generate: function(b) {
        return {
          titel: 'Welkom: ' + (b.bedrijfsnaam || 'Nieuw bedrijf'),
          tekst: '\uD83C\uDFE2 Welkom bij TechMaat: ' + (b.bedrijfsnaam || 'een nieuw bedrijf') + '!\n\n' +
            'Branche: ' + (b.branche || 'Industrie') + '\n' +
            'Locatie: ' + (b.locatie || 'Nederland') + '\n' +
            'Type werk: ' + (b.type_werk || 'Divers') + '\n\n' +
            'Steeds meer bedrijven ontdekken TechMaat voor het vinden van technisch talent. ' +
            'Direct de juiste specialist, zonder gedoe.\n\n' +
            '#TechMaat #Industrie #Techniek #' + (b.branche ? b.branche.replace(/[^a-zA-Z]/g, '') : 'Productie'),
          platform: 'LinkedIn'
        };
      }
    },
    social_stat: {
      platform: 'Social Media',
      type: 'Platform statistiek',
      icon: 'insights',
      generate: function() {
        return {
          titel: 'TechMaat groeit!',
          tekst: '\uD83D\uDE80 TechMaat groeit!\n\n' +
            '\u2705 ' + technici.length + ' technici aangesloten\n' +
            '\u2705 ' + bedrijven.length + ' bedrijven actief\n' +
            '\u2705 ' + klussen.length + ' klussen geplaatst\n\n' +
            'Het platform voor technisch ZZP talent in Nederland. ' +
            'Hydrauliek, elektrotechniek, PLC, mechanica en meer.\n\n' +
            'Aanmelden? \u27A1\uFE0F techmaat.nl\n\n' +
            '#TechMaat #Groei #Techniek #ZZP #Freelance',
          platform: 'Social Media'
        };
      }
    },
    werving: {
      platform: 'Algemeen',
      type: 'Wervingstekst',
      icon: 'campaign',
      generate: function() {
        var topSpecs = {};
        technici.forEach(function(t) { (t.specialismen || []).forEach(function(s) { topSpecs[s] = (topSpecs[s] || 0) + 1; }); });
        var sorted = Object.keys(topSpecs).sort(function(a, b) { return topSpecs[b] - topSpecs[a]; }).slice(0, 3);

        return {
          titel: 'Werving technisch talent',
          tekst: 'Ben jij een ZZP technicus?\n\n' +
            'TechMaat zoekt specialisten in:\n' +
            sorted.map(function(s) { return '\u2022 ' + s; }).join('\n') + '\n\n' +
            'Wat bieden wij?\n' +
            '\u2705 Gratis aanmelden\n' +
            '\u2705 Direct gekoppeld aan opdrachten\n' +
            '\u2705 Eerlijk uurtarief, geen verborgen kosten\n' +
            '\u2705 Flexibel: jij bepaalt je beschikbaarheid\n\n' +
            'Meld je vandaag nog aan op techmaat.nl',
          platform: 'Algemeen'
        };
      }
    }
  };

  function loadPosts() {
    try {
      var raw = localStorage.getItem(POSTS_KEY);
      generatedPosts = raw ? JSON.parse(raw) : [];
    } catch(e) { generatedPosts = []; }
  }

  function savePosts() {
    localStorage.setItem(POSTS_KEY, JSON.stringify(generatedPosts));
  }

  function renderContent(containerId) {
    var container = document.getElementById(containerId);
    if (!container) return;

    var html = '';

    // Demo badge
    if (isDemo) {
      html += '<div class="flex justify-end mb-3">' +
        '<span class="text-[10px] font-bold uppercase tracking-widest text-yellow-700 bg-yellow-100 px-2 py-1 rounded-full">Demo data</span>' +
        '</div>';
    }

    // Stats
    html += '<div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-blue">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Templates</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + Object.keys(TEMPLATES).length + '</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-tm-orange">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Gegenereerd</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + generatedPosts.length + '</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-green-400">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Technici content</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + technici.length + '</p>' +
      '<p class="text-[10px] text-tm-text-light">beschikbaar</p></div>' +
      '<div class="bg-white rounded-xl p-4 shadow-sm border-l-4 border-purple-400">' +
      '<p class="text-[10px] text-tm-text-light uppercase tracking-widest font-bold">Klussen content</p>' +
      '<p class="text-2xl font-headline font-bold text-tm-blue">' + klussen.length + '</p>' +
      '<p class="text-[10px] text-tm-text-light">beschikbaar</p></div>' +
      '</div>';

    // Generator section
    html += '<div class="mb-6">' +
      '<h3 class="font-headline font-bold text-tm-blue text-sm uppercase tracking-wider mb-3">Content genereren</h3>' +
      '<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">';

    // Technicus spotlight — pick latest
    if (technici.length > 0) {
      html += renderGeneratorCard('linkedin_technicus', TEMPLATES.linkedin_technicus, containerId);
    }

    // Klus beschikbaar
    if (klussen.length > 0) {
      html += renderGeneratorCard('linkedin_klus', TEMPLATES.linkedin_klus, containerId);
    }

    // Bedrijf welkom
    if (bedrijven.length > 0) {
      html += renderGeneratorCard('linkedin_bedrijf', TEMPLATES.linkedin_bedrijf, containerId);
    }

    // Platform stats
    html += renderGeneratorCard('social_stat', TEMPLATES.social_stat, containerId);

    // Werving
    html += renderGeneratorCard('werving', TEMPLATES.werving, containerId);

    html += '</div></div>';

    // Generated posts history
    if (generatedPosts.length > 0) {
      html += '<div class="mb-6">' +
        '<h3 class="font-headline font-bold text-tm-blue text-sm uppercase tracking-wider mb-3">Gegenereerde content (' + generatedPosts.length + ')</h3>' +
        '<div class="space-y-3">';

      generatedPosts.slice(0, 10).forEach(function(post, idx) {
        html += '<div class="bg-white rounded-xl p-4 shadow-sm border border-tm-muted">' +
          '<div class="flex items-start justify-between mb-2">' +
          '<div>' +
          '<span class="text-[10px] font-bold bg-tm-light text-tm-blue px-2 py-0.5 rounded-full">' + (post.platform || '') + '</span>' +
          '<span class="text-sm font-bold text-tm-blue ml-2">' + (post.titel || '') + '</span>' +
          '</div>' +
          '<div class="flex gap-2">' +
          '<button onclick="ContentAgent.copyPost(' + idx + ')" class="text-[11px] text-tm-orange hover:text-tm-orange-dark font-bold flex items-center gap-1"><span class="material-symbols-outlined text-sm">content_copy</span>Kopieer</button>' +
          '</div>' +
          '</div>' +
          '<pre class="text-xs text-tm-text-light whitespace-pre-wrap font-body leading-relaxed bg-tm-light rounded-lg p-3">' + escapeHtml(post.tekst || '') + '</pre>' +
          '<p class="text-[10px] text-tm-text-light mt-2">' + timeAgo(post.datum) + '</p>' +
          '</div>';
      });

      html += '</div></div>';
    }

    container.innerHTML = html;
  }

  function renderGeneratorCard(key, template, containerId) {
    return '<div class="bg-white rounded-xl p-4 shadow-sm border border-tm-muted hover:border-tm-orange/50 transition-colors cursor-pointer" onclick="ContentAgent.generate(\'' + key + '\', \'' + containerId + '\')">' +
      '<div class="flex items-center gap-3 mb-2">' +
      '<div class="w-9 h-9 bg-tm-blue/10 rounded-full flex items-center justify-center"><span class="material-symbols-outlined text-tm-blue text-lg">' + template.icon + '</span></div>' +
      '<div>' +
      '<p class="text-sm font-bold text-tm-blue">' + template.type + '</p>' +
      '<p class="text-[10px] text-tm-text-light">' + template.platform + '</p>' +
      '</div>' +
      '</div>' +
      '<p class="text-xs text-tm-orange font-bold">Klik om te genereren &rarr;</p>' +
      '</div>';
  }

  function generate(templateKey, containerId) {
    var template = TEMPLATES[templateKey];
    if (!template) return;

    var post;
    if (templateKey === 'linkedin_technicus' && technici.length > 0) {
      // Pick random technicus
      var t = technici[Math.floor(Math.random() * technici.length)];
      post = template.generate(t);
    } else if (templateKey === 'linkedin_klus' && klussen.length > 0) {
      var k = klussen[Math.floor(Math.random() * klussen.length)];
      post = template.generate(k);
    } else if (templateKey === 'linkedin_bedrijf' && bedrijven.length > 0) {
      var b = bedrijven[Math.floor(Math.random() * bedrijven.length)];
      post = template.generate(b);
    } else {
      post = template.generate();
    }

    if (post) {
      post.datum = new Date().toISOString();
      post.id = 'post-' + Date.now();
      generatedPosts.unshift(post);
      savePosts();
      renderContent(containerId);

      // Show toast
      showToast('Content gegenereerd: ' + post.titel);
    }
  }

  function copyPost(index) {
    var post = generatedPosts[index];
    if (!post) return;

    if (navigator.clipboard) {
      navigator.clipboard.writeText(post.tekst).then(function() {
        showToast('Gekopieerd naar klembord!');
      });
    } else {
      // Fallback
      var ta = document.createElement('textarea');
      ta.value = post.tekst;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      showToast('Gekopieerd naar klembord!');
    }
  }

  function showToast(msg) {
    var toast = document.createElement('div');
    toast.className = 'fixed bottom-6 right-6 z-[101] bg-green-600 text-white px-5 py-3 rounded-xl shadow-lg flex items-center gap-3 animate-slide-up';
    toast.innerHTML = '<span class="material-symbols-outlined">check_circle</span><p class="text-sm font-medium">' + msg + '</p>';
    document.body.appendChild(toast);
    setTimeout(function() {
      toast.style.transition = 'opacity 0.3s';
      toast.style.opacity = '0';
      setTimeout(function() { toast.remove(); }, 300);
    }, 2500);
  }

  function escapeHtml(text) {
    var div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  function timeAgo(dateStr) {
    var diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Zojuist';
    if (diff < 3600) return Math.floor(diff / 60) + ' min geleden';
    if (diff < 86400) return Math.floor(diff / 3600) + ' uur geleden';
    if (diff < 172800) return 'Gisteren';
    return Math.floor(diff / 86400) + ' dagen geleden';
  }

  function init() {
    loadPosts();

    if (window.TechMaatDB) {
      var promises = [
        TechMaatDB.getTechnici(),
        TechMaatDB.getBedrijven(),
        TechMaatDB.getKlussen()
      ];

      Promise.all(promises).then(function(results) {
        technici = Array.isArray(results[0]) ? results[0] : [];
        bedrijven = Array.isArray(results[1]) ? results[1] : [];
        klussen = Array.isArray(results[2]) ? results[2] : [];

        if (technici.length > 0 || bedrijven.length > 0) {
          isDemo = false;
        }
      }).catch(function() {});
    }
  }

  window.ContentAgent = {
    init: init,
    renderContent: renderContent,
    generate: generate,
    copyPost: copyPost
  };
})();
