/* Shared storage for the library and the admin page.
   - "uploads": PDFs added by the admin (kept in this browser's IndexedDB)
   - "meta":    edits / hide flags for the built-in books listed in books.js */
(function (w) {
  "use strict";

  var dbPromise = null;
  var blobUrls = [];

  function openDB() {
    if (dbPromise) return dbPromise;
    dbPromise = new Promise(function (resolve, reject) {
      if (!w.indexedDB) { reject(new Error("This browser cannot store files.")); return; }
      var req = indexedDB.open("krishnaveni-library", 2);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains("uploads")) db.createObjectStore("uploads", { keyPath: "id" });
        if (!db.objectStoreNames.contains("meta")) db.createObjectStore("meta", { keyPath: "id" });
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
    });
    return dbPromise;
  }
  function run(store, mode, fn) {
    return openDB().then(function (db) {
      return new Promise(function (resolve, reject) {
        var t = db.transaction(store, mode);
        var req = fn(t.objectStore(store));
        t.oncomplete = function () { resolve(req ? req.result : undefined); };
        t.onerror = t.onabort = function () { reject(t.error); };
      });
    });
  }

  function slug(s) {
    return String(s).trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  }

  /* Subjects / classes / years can be edited by the admin. The saved lists replace
     window.CATEGORIES, window.GRADES and window.YEARS (defaults come from books.js). */
  var DEFAULTS = null;
  function applyLists(L) {
    w.CATEGORIES = L.subjects; w.GRADES = L.grades; w.YEARS = L.years;
    if (L.years.indexOf(w.CURRENT_YEAR) === -1) w.CURRENT_YEAR = L.years[L.years.length - 1] || "";
  }

  var Store = {
    slug: slug,

    /* ----- lists: subjects, classes, years ----- */
    loadLists: function () {
      if (!DEFAULTS) DEFAULTS = JSON.parse(JSON.stringify({ subjects: w.CATEGORIES, grades: w.GRADES, years: w.YEARS }));
      return run("meta", "readonly", function (s) { return s.get("cfg-lists"); })
        .catch(function () { return null; })
        .then(function (rec) {
          var L = rec ? { subjects: rec.subjects, grades: rec.grades, years: rec.years } : JSON.parse(JSON.stringify(DEFAULTS));
          applyLists(L);
          return L;
        });
    },
    saveLists: function (L) {
      var rec = { id: "cfg-lists", subjects: L.subjects, grades: L.grades, years: L.years };
      return run("meta", "readwrite", function (s) { return s.put(rec); }).then(function () { applyLists(L); return L; });
    },
    // rename a value everywhere it is used (uploads and built-in books)
    // kind: "category" | "grade" | "year"
    renameValue: function (kind, oldV, newV) {
      return Store.getBooks({ includeHidden: true }).then(function (list) {
        var chain = Promise.resolve();
        list.filter(function (b) { return b[kind] === oldV; }).forEach(function (b) {
          chain = chain.then(function () {
            if (b.source === "static") { var f = {}; f[kind] = newV; return Store.saveMeta(b.id, f); }
            return run("uploads", "readonly", function (s) { return s.get(b.id); }).then(function (rec) {
              rec[kind] = newV;
              return run("uploads", "readwrite", function (s) { return s.put(rec); });
            });
          });
        });
        return chain;
      });
    },

    /* ----- admin session ----- */
    isAdmin: function () { try { return sessionStorage.getItem("kv-admin") === "1"; } catch (e) { return false; } },
    setAdmin: function (on) {
      try { on ? sessionStorage.setItem("kv-admin", "1") : sessionStorage.removeItem("kv-admin"); } catch (e) {}
    },
    checkPassword: function (p) { return p === w.LIBRARY_CONFIG.adminPassword; },

    /* ----- read ----- */
    // opts.includeHidden: also return built-in books the admin has deleted (so they can be restored)
    getBooks: function (opts) {
      opts = opts || {};
      blobUrls.forEach(function (u) { URL.revokeObjectURL(u); });
      blobUrls = [];
      var safe = function (p) { return p.catch(function () { return []; }); };
      return Promise.all([
        safe(run("uploads", "readonly", function (s) { return s.getAll(); })),
        safe(run("meta", "readonly", function (s) { return s.getAll(); }))
      ]).then(function (res) {
        var metaMap = {};
        res[1].forEach(function (m) { metaMap[m.id] = m; });

        var uploaded = res[0].sort(function (a, b) { return b.added - a.added; }).map(function (r) {
          var url = URL.createObjectURL(r.blob);
          blobUrls.push(url);
          return {
            id: r.id, title: r.title, author: "School Upload", category: r.category, grade: r.grade, year: r.year || w.CURRENT_YEAR,
            file: url, downloadName: r.fileName, desc: r.desc || "", size: r.size, added: r.added,
            source: "upload", uploaded: true, hidden: false
          };
        });

        var builtin = w.BOOKS.map(function (b) {
          var m = metaMap[b.id] || {};
          return {
            id: b.id, title: m.title || b.title, author: b.author,
            category: m.category || b.category, grade: m.grade || b.grade, year: m.year || b.year || w.CURRENT_YEAR,
            file: b.file, downloadName: null,
            desc: m.desc != null ? m.desc : (b.desc || ""),
            source: "static", uploaded: false, hidden: !!m.hidden
          };
        });

        var all = uploaded.concat(builtin);
        return opts.includeHidden ? all : all.filter(function (b) { return !b.hidden; });
      });
    },

    /* ----- write: uploaded documents ----- */
    addUpload: function (f) {
      var rec = {
        id: "up-" + Date.now(), title: f.title, fileName: slug(f.title) + ".pdf",
        category: f.category, grade: f.grade, year: f.year, desc: f.desc || "",
        size: f.file.size, added: Date.now(), blob: f.file
      };
      return run("uploads", "readwrite", function (s) { return s.put(rec); }).then(function () { return rec; });
    },
    updateUpload: function (id, f) {
      return run("uploads", "readonly", function (s) { return s.get(id); }).then(function (rec) {
        if (!rec) throw new Error("Document not found.");
        rec.title = f.title; rec.fileName = slug(f.title) + ".pdf";
        rec.category = f.category; rec.grade = f.grade; rec.year = f.year; rec.desc = f.desc || "";
        if (f.file) { rec.blob = f.file; rec.size = f.file.size; }
        return run("uploads", "readwrite", function (s) { return s.put(rec); });
      });
    },
    deleteUpload: function (id) {
      return run("uploads", "readwrite", function (s) { return s.delete(id); });
    },

    /* ----- write: built-in books (edit text, hide, restore) ----- */
    saveMeta: function (id, fields) {
      return run("meta", "readonly", function (s) { return s.get(id); }).then(function (old) {
        var rec = $.extend({ id: id }, old || {}, fields);
        return run("meta", "readwrite", function (s) { return s.put(rec); });
      });
    }
  };

  w.Store = Store;
})(window);
