/**
 * TechMaat Supabase Client
 * Handles all database operations
 */
var SUPABASE_URL = 'https://jvyexvymbmtdovuhanjt.supabase.co';
var SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp2eWV4dnltYm10ZG92dWhhbmp0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU1MDQyNDQsImV4cCI6MjA5MTA4MDI0NH0.EBY4ln6yh5dkBdnEletGdPzj__u59-tLhwqcs6Fb3As';

var TechMaatDB = {
  _headers: function() {
    return {
      'apikey': SUPABASE_KEY,
      'Authorization': 'Bearer ' + SUPABASE_KEY,
      'Content-Type': 'application/json',
      'Prefer': 'return=representation'
    };
  },

  // Insert a technicus
  insertTechnicus: function(data) {
    return fetch(SUPABASE_URL + '/rest/v1/technici', {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Insert a bedrijf
  insertBedrijf: function(data) {
    return fetch(SUPABASE_URL + '/rest/v1/bedrijven', {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Get all technici
  getTechnici: function() {
    return fetch(SUPABASE_URL + '/rest/v1/technici?order=created_at.desc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Get all bedrijven
  getBedrijven: function() {
    return fetch(SUPABASE_URL + '/rest/v1/bedrijven?order=created_at.desc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Get counts
  getStats: function() {
    return Promise.all([
      this.getTechnici(),
      this.getBedrijven()
    ]).then(function(results) {
      return {
        technici: results[0].length || 0,
        bedrijven: results[1].length || 0,
        total: (results[0].length || 0) + (results[1].length || 0)
      };
    });
  }
};
