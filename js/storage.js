/* Speicher-Schicht
   - localStorage: Programm, laufendes Training (Zwischenspeicher), Verlauf, Einstellungen
   - IndexedDB:   eigene Fotos (zu gross für localStorage)
   Alles bleibt lokal auf dem Gerät. */
'use strict';

const Storage = (() => {
  const KEYS = {
    program: 'mt.program',
    session: 'mt.session',
    history: 'mt.history',
    settings: 'mt.settings',
  };

  function load(key, fallback) {
    try {
      const raw = localStorage.getItem(key);
      return raw === null ? fallback : JSON.parse(raw);
    } catch (err) {
      console.warn('Storage.load', key, err);
      return fallback;
    }
  }

  function save(key, value) {
    try {
      if (value === null || value === undefined) {
        localStorage.removeItem(key);
      } else {
        localStorage.setItem(key, JSON.stringify(value));
      }
      return true;
    } catch (err) {
      console.warn('Storage.save', key, err);
      return false;
    }
  }

  function remove(key) {
    try { localStorage.removeItem(key); } catch (err) { /* ignorieren */ }
  }

  // ---------- IndexedDB für Bilder ----------
  const DB_NAME = 'mein-training';
  const STORE = 'images';
  let dbPromise = null;

  function openDb() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise((resolve, reject) => {
      if (!('indexedDB' in window)) { reject(new Error('IndexedDB nicht verfügbar')); return; }
      const req = indexedDB.open(DB_NAME, 1);
      req.onupgradeneeded = () => { req.result.createObjectStore(STORE); };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    return dbPromise;
  }

  function tx(mode, fn) {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const store = t.objectStore(STORE);
      const req = fn(store);
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }));
  }

  const putImage = (key, dataUrl) => tx('readwrite', (s) => s.put(dataUrl, key));
  const getImage = (key) => tx('readonly', (s) => s.get(key));
  const deleteImage = (key) => tx('readwrite', (s) => s.delete(key));
  const clearImages = () => tx('readwrite', (s) => s.clear());

  function allImages() {
    return openDb().then((db) => new Promise((resolve, reject) => {
      const out = {};
      const t = db.transaction(STORE, 'readonly');
      const req = t.objectStore(STORE).openCursor();
      req.onsuccess = () => {
        const cur = req.result;
        if (cur) { out[cur.key] = cur.value; cur.continue(); } else { resolve(out); }
      };
      req.onerror = () => reject(req.error);
    })).catch(() => ({}));
  }

  async function estimate() {
    try {
      if (navigator.storage && navigator.storage.estimate) {
        const e = await navigator.storage.estimate();
        return { usage: e.usage || 0, quota: e.quota || 0 };
      }
    } catch (err) { /* ignorieren */ }
    return null;
  }

  return { KEYS, load, save, remove, putImage, getImage, deleteImage, clearImages, allImages, estimate };
})();
