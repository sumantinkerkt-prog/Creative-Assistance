/* ==========================================================================
   Store — a tiny record keeper built on top of Storage.
   --------------------------------------------------------------------------
   Gives every feature the same simple list-of-things behaviour:
     var tasks = CA.Store.collection('tasks');
     tasks.create({ title: 'Draft cover' });
     tasks.all(); tasks.update(id, {...}); tasks.remove(id);
   Adding a new feature means naming a new collection. Nothing else to wire up.
   ========================================================================== */
(function (window) {
  'use strict';

  var CA = (window.CA = window.CA || {});
  var Storage = CA.Storage;
  var cache = Object.create(null);

  function uid() {
    try {
      if (window.crypto && typeof window.crypto.randomUUID === 'function') {
        return window.crypto.randomUUID();
      }
      if (window.crypto && window.crypto.getRandomValues) {
        var buf = new Uint8Array(8);
        window.crypto.getRandomValues(buf);
        var hex = '';
        for (var i = 0; i < buf.length; i++) hex += buf[i].toString(16).padStart(2, '0');
        return Date.now().toString(36) + '-' + hex;
      }
    } catch (e) {}
    return Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  }

  function now() { return new Date().toISOString(); }

  function Collection(name) {
    this.name = name;
    this._subs = [];
  }

  Collection.prototype._load = function () {
    if (!(this.name in cache)) {
      var rows = Storage.get(this.name, []);
      cache[this.name] = Array.isArray(rows) ? rows : [];
    }
    return cache[this.name];
  };

  Collection.prototype._save = function () {
    var ok = Storage.set(this.name, cache[this.name]);
    this._notify();
    return ok;
  };

  Collection.prototype._notify = function () {
    var rows = this.all();
    for (var i = 0; i < this._subs.length; i++) {
      try { this._subs[i](rows); } catch (e) {}
    }
  };

  /** Everything in this collection (a safe copy you can't accidentally corrupt). */
  Collection.prototype.all = function () {
    return this._load().slice();
  };

  Collection.prototype.count = function () {
    return this._load().length;
  };

  Collection.prototype.find = function (id) {
    var rows = this._load();
    for (var i = 0; i < rows.length; i++) if (rows[i] && rows[i].id === id) return rows[i];
    return null;
  };

  Collection.prototype.where = function (predicate) {
    return this._load().filter(predicate);
  };

  Collection.prototype.create = function (attrs) {
    var record = Object.assign({}, attrs || {});
    if (!record.id) record.id = uid();
    record.createdAt = record.createdAt || now();
    record.updatedAt = record.createdAt;
    this._load().push(record);
    this._save();
    return record;
  };

  Collection.prototype.update = function (id, changes) {
    var record = this.find(id);
    if (!record) return null;
    Object.assign(record, changes || {});
    record.id = id;
    record.updatedAt = now();
    this._save();
    return record;
  };

  Collection.prototype.remove = function (id) {
    var rows = this._load();
    for (var i = 0; i < rows.length; i++) {
      if (rows[i] && rows[i].id === id) {
        rows.splice(i, 1);
        this._save();
        return true;
      }
    }
    return false;
  };

  /** Delete every record matching a test. Returns how many went. */
  Collection.prototype.removeWhere = function (predicate) {
    var rows = this._load();
    var before = rows.length;
    cache[this.name] = rows.filter(function (r) { return !predicate(r); });
    if (cache[this.name].length !== before) this._save();
    return before - cache[this.name].length;
  };

  /** Replace the whole list (used for reordering). */
  Collection.prototype.replaceAll = function (rows) {
    cache[this.name] = Array.isArray(rows) ? rows.slice() : [];
    this._save();
  };

  Collection.prototype.clear = function () {
    cache[this.name] = [];
    this._save();
  };

  /** Run a function whenever this collection changes. */
  Collection.prototype.subscribe = function (fn) {
    if (typeof fn !== 'function') return function () {};
    this._subs.push(fn);
    var self = this;
    return function () {
      var i = self._subs.indexOf(fn);
      if (i > -1) self._subs.splice(i, 1);
    };
  };

  var collections = Object.create(null);

  CA.Store = {
    collection: function (name) {
      if (!collections[name]) collections[name] = new Collection(name);
      return collections[name];
    },

    /** A single saved value, for settings and one-off tool state. */
    value: function (name, fallback) {
      return {
        get: function () { return Storage.get(name, fallback); },
        set: function (v) { return Storage.set(name, v); },
        clear: function () { Storage.remove(name); }
      };
    },

    /** Forget cached data after a restore, so pages re-read from storage. */
    resetCache: function () {
      for (var k in cache) delete cache[k];
    },

    uid: uid
  };
})(window);
