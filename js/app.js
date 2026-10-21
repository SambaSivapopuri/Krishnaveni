/* Krishnaveni Digital Library - app logic (jQuery + PDF.js) */
$(function () {
  "use strict";

  var CATS = [];

  var state = { category: "all", grade: "all", year: "all", query: "" };
  var allBooks = [];          // static + uploaded

  /* ---------- helpers ---------- */
  function esc(s) {
    return $("<div>").text(s == null ? "" : s).html();
  }
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function catInfo(id) {
    return CATS.filter(function (c) { return c.id === id; })[0] || { icon: "book-open", color: "#2a5db0" };
  }
  function shade(hex, amt) {
    var n = parseInt(hex.slice(1), 16);
    var r = Math.max(0, Math.min(255, (n >> 16) + amt));
    var g = Math.max(0, Math.min(255, ((n >> 8) & 255) + amt));
    var b = Math.max(0, Math.min(255, (n & 255) + amt));
    return "#" + ((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1);
  }
  function slug(s) {
    return String(s).trim().replace(/\.pdf$/i, "").replace(/[\\/:*?"<>|]+/g, "").replace(/\s+/g, "-");
  }
  var toastTimer;
  function toast(msg) {
    var $t = $("#toast").text(msg).addClass("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $t.removeClass("show"); }, 2800);
  }

  /* ---------- load books (built-in + admin uploads) ---------- */
  function loadBooks() {
    return Store.getBooks().then(function (list) {
      allBooks = list;
      renderStats();
      renderGrade();
      renderYear();
      renderBooks();
    });
  }

  /* ---------- library UI ---------- */
  function renderStats() {
    var cats = {};
    allBooks.forEach(function (b) { cats[b.category] = 1; });
    $("#statBooks").text(allBooks.length);
    $("#statCats").text(Object.keys(cats).length);
  }
  function renderChips() {
    var html = '<button class="chip active" data-cat="all" type="button" aria-pressed="true">' + ic("grid") + ' All</button>';
    CATS.forEach(function (c) {
      html += '<button class="chip" data-cat="' + esc(c.id) + '" type="button" aria-pressed="false">' + ic(c.icon) + " " + esc(c.id) + "</button>";
    });
    $("#categoryChips").html(html);
  }
  function renderGrade() {
    var keep = state.grade;
    var html = '<option value="all">All classes</option>';
    window.GRADES.forEach(function (g) { html += '<option value="' + esc(g) + '">Class ' + esc(g) + "</option>"; });
    $("#gradeFilter").html(html).val(keep);
  }
  function renderYear() {
    var html = '<option value="all">All years</option>';
    window.YEARS.forEach(function (y) { html += '<option value="' + esc(y) + '">' + esc(y) + "</option>"; });
    $("#yearFilter").html(html).val(state.year);
  }
  function matches(b) {
    if (state.category !== "all" && b.category !== state.category) return false;
    if (state.grade !== "all" && b.grade !== state.grade) return false;
    if (state.year !== "all" && b.year !== state.year) return false;
    if (state.query) {
      var hay = (b.title + " " + b.category + " " + b.author + " " + b.desc + " class " + b.grade + " " + b.year).toLowerCase();
      return state.query.toLowerCase().split(/\s+/).every(function (w) { return hay.indexOf(w) !== -1; });
    }
    return true;
  }
  function renderBooks() {
    var list = allBooks.filter(matches);
    var html = list.map(function (b, i) {
      var ci = catInfo(b.category);
      var dl = b.downloadName || (slug(b.title) + ".pdf");
      return '<article class="book-card" style="animation-delay:' + Math.min(i * 40, 400) + 'ms">' +
        '<div class="cover" style="--c1:' + ci.color + ";--c2:" + shade(ci.color, 60) + '">' +
          (b.uploaded ? '<span class="badge new">NEW</span>' : "") +
          '<span class="badge">Class ' + esc(b.grade) + '</span><span class="badge year">' + esc(b.year) + '</span><span class="emoji">' + ic(ci.icon) + "</span></div>" +
        '<div class="book-info"><h3>' + esc(b.title) + '</h3><span class="book-cat">' + esc(b.category) + (b.author ? " · " + esc(b.author) : "") + "</span>" +
        '<p class="book-desc">' + esc(b.desc) + "</p>" +
        '<div class="book-actions">' +
          '<button class="btn btn-primary btn-read" data-id="' + esc(b.id) + '" type="button" aria-label="Read ' + esc(b.title) + '">' + ic("book-open") + ' Read</button>' +
          '<a class="btn btn-accent" href="' + esc(b.file) + '" download="' + esc(dl) + '" aria-label="Download ' + esc(b.title) + '">' + ic("download") + ' Download</a>' +
        "</div></div></article>";
    }).join("");
    $("#bookGrid").html(html);
    $("#emptyState").toggleClass("hidden", list.length > 0);
    $("#resultInfo").text(list.length + (list.length === 1 ? " book" : " books") + " found");
  }

  $("#categoryChips").on("click", ".chip", function () {
    $(".chip").removeClass("active").attr("aria-pressed", "false");
    $(this).addClass("active").attr("aria-pressed", "true");
    state.category = $(this).data("cat");
    renderBooks();
  });
  $("#yearFilter").on("change", function () { state.year = this.value; renderBooks(); });
  $("#gradeFilter").on("change", function () { state.grade = this.value; renderBooks(); });
  // hero search box and library search box stay in sync
  function setQuery(q, from) {
    state.query = $.trim(q);
    if (from !== "hero") $("#bookSearch").val(q);
    if (from !== "lib") $("#libSearch").val(q);
    $("#libClear").toggleClass("hidden", !state.query);
    renderBooks();
  }
  $("#bookSearch").on("input", function () { setQuery(this.value, "hero"); });
  $("#libSearch").on("input", function () { setQuery(this.value, "lib"); });
  $("#libClear").on("click", function () { setQuery("", ""); $("#libSearch").focus(); });
  $("#heroSearch").on("submit", function (e) {
    e.preventDefault();
    state.query = $.trim($("#bookSearch").val());
    renderBooks();
    $("html, body").animate({ scrollTop: $("#library").offset().top - 70 }, 400);
  });
  $("#bookGrid").on("click", ".btn-read", function () {
    var id = String($(this).data("id"));
    var b = allBooks.filter(function (x) { return String(x.id) === id; })[0];
    if (b) openReader(b);
  });

  /* mobile menu */
  $("#menuToggle").on("click", function () {
    var open = $("#mainNav").toggleClass("open").hasClass("open");
    $(this).attr("aria-expanded", open);
  });
  $("#mainNav").on("click", "a", function () { $("#mainNav").removeClass("open"); });

  /* ---------- PDF reader ---------- */
  var pdfjsLib = window.pdfjsLib;
  if (pdfjsLib) {
    pdfjsLib.GlobalWorkerOptions.workerSrc = "vendor/pdf.worker.min.js";
  }
  var R = { doc: null, page: 1, total: 1, zoom: 1, rendering: false, pending: null,
            texts: null, matches: [], cur: -1, query: "", token: 0, book: null };

  function openReader(book) {
    if (!pdfjsLib) { toast("PDF viewer could not load. Check your internet."); return; }
    var token = ++R.token;
    R.book = book; R.doc = null; R.page = 1; R.zoom = 1; R.texts = null; R.matches = []; R.cur = -1; R.query = "";
    var dl = book.downloadName || (slug(book.title) + ".pdf");
    $("#rTitle").text(book.title);
    $("#rDownload").attr({ href: book.file, download: dl });
    $("#rSearch").val("");
    $("#rResults").addClass("hidden");
    $("#rZoomLabel").text("100%");
    $("#pageWrap, #rError").addClass("hidden");
    $("#rLoading").removeClass("hidden");
    $("#reader").removeClass("hidden");
    $("body").css("overflow", "hidden");

    pdfjsLib.getDocument(book.file).promise.then(function (doc) {
      if (token !== R.token) return;
      R.doc = doc; R.total = doc.numPages;
      $("#rTotal").text(R.total);
      $("#rPage").attr("max", R.total);
      $("#rLoading").addClass("hidden");
      renderPage(1);
    }).catch(function (err) {
      if (token !== R.token) return;
      if (window.console) console.error("PDF load failed:", err);
      var isFile = location.protocol === "file:";
      var html = ic("alert") + " Could not open this book in the reader.<br>";
      html += isFile
        ? "<small>This page was opened as a file. Browsers block that. Double-click <b>start.bat</b> and use http://localhost:8000 instead.</small>"
        : "<small>" + esc(err && err.message ? err.message : "Unknown error") + "</small>";
      html += '<br><br><a class="btn btn-accent" target="_blank" rel="noopener" href="' + esc(book.file) + '">' + ic("external") + ' Open PDF in a new tab</a>';
      $("#rError").removeClass("hidden").html(html);
    });
  }
  function closeReader() {
    R.token++;
    if (R.doc) { R.doc.destroy(); R.doc = null; }
    $("#reader").addClass("hidden");
    $("body").css("overflow", "");
  }

  function renderPage(n) {
    if (!R.doc) return;
    n = Math.max(1, Math.min(R.total, n));
    if (R.rendering) { R.pending = n; return; }
    R.rendering = true; R.page = n;
    var token = R.token;
    $("#rPage").val(n);
    $("#rPrev").prop("disabled", n <= 1);
    $("#rNext").prop("disabled", n >= R.total);

    R.doc.getPage(n).then(function (page) {
      var stage = document.getElementById("rStage");
      var base = page.getViewport({ scale: 1 });
      var fit = Math.min((stage.clientWidth - 32) / base.width, 2.5);
      var scale = Math.max(0.2, fit * R.zoom);
      var vp = page.getViewport({ scale: scale });
      var dpr = window.devicePixelRatio || 1;
      var canvas = document.getElementById("rCanvas");
      canvas.width = Math.floor(vp.width * dpr);
      canvas.height = Math.floor(vp.height * dpr);
      canvas.style.width = Math.floor(vp.width) + "px";
      canvas.style.height = Math.floor(vp.height) + "px";
      var ctx = canvas.getContext("2d");
      var task = page.render({ canvasContext: ctx, viewport: vp, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : null });
      var textDiv = document.getElementById("rText");
      textDiv.innerHTML = "";
      textDiv.style.width = canvas.style.width;
      textDiv.style.height = canvas.style.height;
      textDiv.style.setProperty("--scale-factor", vp.scale);
      $("#pageWrap").removeClass("hidden");

      return Promise.all([task.promise, page.getTextContent()]).then(function (res) {
        if (token !== R.token) return;
        return pdfjsLib.renderTextLayer({ textContentSource: res[1], container: textDiv, viewport: vp, textDivs: [] }).promise;
      });
    }).then(function () {
      if (token === R.token) highlightPage();
    }).catch(function () {}).then(function () {
      R.rendering = false;
      if (R.pending != null) { var p = R.pending; R.pending = null; renderPage(p); }
    });
  }

  function highlightPage() {
    if (!R.query) return;
    var re = new RegExp(R.query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
    var textDiv = document.getElementById("rText");
    $(textDiv).children("span").each(function () {
      var t = this.textContent;
      if (!re.test(t)) { re.lastIndex = 0; return; }
      re.lastIndex = 0;
      this.innerHTML = esc(t).replace(new RegExp(esc(R.query).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi"), function (m) {
        return "<mark>" + m + "</mark>";
      });
    });
    var m = R.matches[R.cur];
    if (m && m.page === R.page) {
      var marks = $(textDiv).find("mark");
      var el = marks.get(Math.min(m.k, marks.length - 1));
      if (el) {
        $(el).addClass("current");
        var stage = document.getElementById("rStage");
        var top = el.getBoundingClientRect().top - stage.getBoundingClientRect().top + stage.scrollTop - stage.clientHeight / 3;
        stage.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
      }
    }
  }

  function extractTexts() {
    if (R.texts) return Promise.resolve(R.texts);
    var token = R.token, doc = R.doc, out = [], chain = Promise.resolve();
    for (var i = 1; i <= R.total; i++) {
      (function (p) {
        chain = chain.then(function () {
          if (token !== R.token) return;
          return doc.getPage(p).then(function (pg) { return pg.getTextContent(); }).then(function (tc) {
            out[p] = tc.items.map(function (it) { return it.str; }).join(" ").replace(/\s+/g, " ");
          });
        });
      })(i);
    }
    return chain.then(function () { if (token === R.token) R.texts = out; return out; });
  }

  function runSearch(q) {
    q = $.trim(q);
    R.query = q; R.matches = []; R.cur = -1;
    if (!q) { $("#rResults").addClass("hidden"); renderPage(R.page); return; }
    if (!R.doc) return;
    $("#rResults").removeClass("hidden");
    $("#rResultCount").text("Searching…");
    $("#rResultList").empty();
    var token = R.token;
    extractTexts().then(function (texts) {
      if (token !== R.token || q !== R.query) return;
      var re = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "gi");
      for (var p = 1; p <= R.total; p++) {
        var t = texts[p] || "", m, k = 0;
        re.lastIndex = 0;
        while ((m = re.exec(t))) {
          var s = Math.max(0, m.index - 35), e = Math.min(t.length, m.index + m[0].length + 45);
          R.matches.push({
            page: p, k: k++,
            snippet: (s ? "…" : "") + t.slice(s, m.index) + "\u0001" + m[0] + "\u0002" + t.slice(m.index + m[0].length, e) + (e < t.length ? "…" : "")
          });
          if (m[0].length === 0) re.lastIndex++;
        }
      }
      var n = R.matches.length;
      $("#rResultCount").text(n ? n + (n === 1 ? " result" : " results") : "No results");
      if (!n) { $("#rResultList").html('<li class="none">' + ic("alert") + ' We could not find “' + esc(q) + '”. Try another word.</li>'); renderPage(R.page); return; }
      $("#rResultList").html(R.matches.map(function (m, i) {
        return '<li data-i="' + i + '"><b>Page ' + m.page + "</b>" +
          esc(m.snippet).replace("\u0001", "<mark>").replace("\u0002", "</mark>") + "</li>";
      }).join(""));
      gotoMatch(0);
    });
  }

  function gotoMatch(i) {
    if (!R.matches.length) return;
    R.cur = (i + R.matches.length) % R.matches.length;
    var m = R.matches[R.cur];
    $("#rResultList li").removeClass("active").eq(R.cur).addClass("active").get(0).scrollIntoView({ block: "nearest" });
    if (m.page === R.page) {
      $("#rText mark").removeClass("current");
      highlightPage();
    } else {
      renderPage(m.page);
    }
  }

  /* reader controls */
  $("#rClose").on("click", closeReader);
  $("#rPrev").on("click", function () { renderPage(R.page - 1); });
  $("#rNext").on("click", function () { renderPage(R.page + 1); });
  $("#rPage").on("change", function () { renderPage(parseInt(this.value, 10) || 1); });
  $("#rZoomIn").on("click", function () { setZoom(R.zoom + 0.25); });
  $("#rZoomOut").on("click", function () { setZoom(R.zoom - 0.25); });
  function setZoom(z) {
    R.zoom = Math.max(0.5, Math.min(3, z));
    $("#rZoomLabel").text(Math.round(R.zoom * 100) + "%");
    renderPage(R.page);
  }
  $("#rSearchForm").on("submit", function (e) {
    e.preventDefault();
    if (R.query === $.trim($("#rSearch").val()) && R.matches.length) gotoMatch(R.cur + 1);
    else runSearch($("#rSearch").val());
  });
  $("#rMatchNext").on("click", function () { gotoMatch(R.cur + 1); });
  $("#rMatchPrev").on("click", function () { gotoMatch(R.cur - 1); });
  $("#rResultsClose").on("click", function () { $("#rResults").addClass("hidden"); });
  $("#rResultList").on("click", "li[data-i]", function () { gotoMatch(+$(this).data("i")); });

  var resizeTimer;
  $(window).on("resize", function () {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(function () { if (!$("#reader").hasClass("hidden")) renderPage(R.page); }, 250);
  });

  $(document).on("keydown", function (e) {
    if (e.key === "Escape") {
      if (!$("#reader").hasClass("hidden")) closeReader();
      return;
    }
    if ($("#reader").hasClass("hidden") || $(e.target).is("input, select, textarea")) return;
    if (e.key === "ArrowRight" || e.key === "PageDown") renderPage(R.page + 1);
    if (e.key === "ArrowLeft" || e.key === "PageUp") renderPage(R.page - 1);
  });

  // touch: swipe left/right to turn pages
  (function () {
    var x0 = null, y0 = null, stage = document.getElementById("rStage");
    stage.addEventListener("touchstart", function (e) { x0 = e.touches[0].clientX; y0 = e.touches[0].clientY; }, { passive: true });
    stage.addEventListener("touchend", function (e) {
      if (x0 === null) return;
      var dx = e.changedTouches[0].clientX - x0, dy = e.changedTouches[0].clientY - y0;
      x0 = null;
      if (Math.abs(dx) > 70 && Math.abs(dx) > Math.abs(dy) * 2 && stage.scrollWidth <= stage.clientWidth + 4) {
        renderPage(R.page + (dx < 0 ? 1 : -1));
      }
    }, { passive: true });
  })();

  /* ---------- init ---------- */
  $("#year").text(new Date().getFullYear());
  Store.loadLists().then(function () {
    CATS = window.CATEGORIES;
    renderChips();
    return loadBooks();
  });
});
