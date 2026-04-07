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

  // Get all klussen
  getKlussen: function() {
    return fetch(SUPABASE_URL + '/rest/v1/klussen?order=created_at.desc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Insert a klus
  insertKlus: function(data) {
    return fetch(SUPABASE_URL + '/rest/v1/klussen', {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Update a klus by id
  updateKlus: function(id, data) {
    return fetch(SUPABASE_URL + '/rest/v1/klussen?id=eq.' + id, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Update a technicus by id
  updateTechnicus: function(id, data) {
    return fetch(SUPABASE_URL + '/rest/v1/technici?id=eq.' + id, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Update a bedrijf by id
  updateBedrijf: function(id, data) {
    return fetch(SUPABASE_URL + '/rest/v1/bedrijven?id=eq.' + id, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(data)
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
  },

  // ─── Documenten & Verificatie ────────────────────────────

  // Upload a file to Supabase Storage
  uploadDocument: function(technicusId, docType, file) {
    var ext = file.name.split('.').pop().toLowerCase();
    var path = technicusId + '/' + docType + '_' + Date.now() + '.' + ext;
    return fetch(SUPABASE_URL + '/storage/v1/object/verificatie-docs/' + path, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': 'Bearer ' + SUPABASE_KEY,
        'Content-Type': file.type,
        'x-upsert': 'true'
      },
      body: file
    }).then(function(r) {
      if (!r.ok) throw new Error('Upload mislukt: ' + r.statusText);
      return path;
    });
  },

  // Get a signed URL for viewing a stored file
  getSignedUrl: function(path, expiresIn) {
    expiresIn = expiresIn || 3600;
    return fetch(SUPABASE_URL + '/storage/v1/object/sign/verificatie-docs/' + path, {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify({ expiresIn: expiresIn })
    }).then(function(r) { return r.json(); })
    .then(function(data) {
      if (data.signedURL) return SUPABASE_URL + '/storage/v1' + data.signedURL;
      return null;
    });
  },

  // Insert a document record
  insertDocument: function(data) {
    return fetch(SUPABASE_URL + '/rest/v1/documenten', {
      method: 'POST',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // Get all documenten
  getAllDocumenten: function() {
    return fetch(SUPABASE_URL + '/rest/v1/documenten?order=created_at.desc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Get documenten by status
  getDocumentenByStatus: function(status) {
    return fetch(SUPABASE_URL + '/rest/v1/documenten?status=eq.' + status + '&order=created_at.asc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Get documenten for a specific technicus
  getDocumentenByTechnicus: function(technicusId) {
    return fetch(SUPABASE_URL + '/rest/v1/documenten?technicus_id=eq.' + technicusId + '&order=created_at.desc', {
      headers: this._headers()
    }).then(function(r) { return r.json(); });
  },

  // Update a document (status, notitie, vervaldatum, etc.)
  updateDocument: function(id, data) {
    return fetch(SUPABASE_URL + '/rest/v1/documenten?id=eq.' + id, {
      method: 'PATCH',
      headers: this._headers(),
      body: JSON.stringify(data)
    }).then(function(r) { return r.json(); });
  },

  // ─── Auth ──────────────────────────────────────────────

  _AUTH_SALT: 'techmaat_salt_2026',
  _SESSION_KEY: 'tm_auth',
  _SESSION_TTL: 8 * 60 * 60 * 1000, // 8 hours

  /**
   * Hash a password with SHA-256 + salt using the Web Crypto API.
   * Returns a hex string.
   */
  _hashPassword: function(password) {
    var encoder = new TextEncoder();
    var data = encoder.encode(password + this._AUTH_SALT);
    return crypto.subtle.digest('SHA-256', data).then(function(buf) {
      return Array.from(new Uint8Array(buf))
        .map(function(b) { return b.toString(16).padStart(2, '0'); })
        .join('');
    });
  },

  /**
   * Login with email + password.
   * Hashes the password client-side, calls the verify_login RPC in Supabase.
   * Returns the user object { id, email, naam, role } or null.
   */
  login: function(email, password) {
    var self = this;
    return this._hashPassword(password).then(function(hash) {
      return fetch(SUPABASE_URL + '/rest/v1/rpc/verify_login', {
        method: 'POST',
        headers: self._headers(),
        body: JSON.stringify({ p_email: email, p_hash: hash })
      }).then(function(r) { return r.json(); });
    }).then(function(user) {
      if (user && user.email) {
        var session = {
          id: user.id,
          email: user.email,
          naam: user.naam,
          role: user.role,
          time: Date.now()
        };
        sessionStorage.setItem(self._SESSION_KEY, JSON.stringify(session));
        return session;
      }
      return null;
    });
  },

  /**
   * Get current session from sessionStorage.
   * Returns the user object or null if expired / not present.
   */
  getSession: function() {
    var raw = sessionStorage.getItem(this._SESSION_KEY);
    if (!raw) return null;
    try {
      var session = JSON.parse(raw);
      if (Date.now() - session.time > this._SESSION_TTL) {
        this.logout();
        return null;
      }
      return session;
    } catch (e) {
      this.logout();
      return null;
    }
  },

  /**
   * Clear the session (logout).
   */
  logout: function() {
    sessionStorage.removeItem(this._SESSION_KEY);
  }
};
