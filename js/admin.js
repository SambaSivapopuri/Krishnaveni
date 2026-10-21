/* Admin page: add, edit and delete documents */
$(function () {
  "use strict";

  var CFG = window.LIBRARY_CONFIG;
  var CATS = window.CATEGORIES;
  var ICONS = [
    ["book-open", "General"], ["calculator", "Maths"], ["flask", "Science"], ["atom", "Physics"],
    ["leaf", "EVS / Nature"], ["type", "English"], ["feather", "Stories"], ["pencil", "Writing"],
    ["globe", "Social"], ["landmark", "History"], ["map", "Geography"], ["monitor", "Computer"],
    ["code", "Coding"], ["palette", "Art"], ["music", "Music"], ["trophy", "Sports"],
    ["heart", "Health"], ["lightbulb", "GK"], ["cap", "Study"], ["library", "Library"]
  ];
  var books = [];

  function esc(s) { return $("<div>").text(s == null ? "" : s).html(); }
  function ic(n) { return '<svg class="ic" aria-hidden="true"><use href="#i-' + n + '"/></svg>'; }
  function fmtSize(b) {
    if (!b) return "-";
    return b > 1048576 ? (b / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(b / 1024)) + " KB";
  }
  var toastTimer;
  function toast(msg) {
    var $t = $("#toast").text(msg).addClass("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { $t.removeClass("show"); }, 2800);
  }
  function showMsg(type, html) { $("#docMsg").attr("class", "form-msg " + type).html(html); }

  /* ---------- login ---------- */
  function showView() {
    var on = Store.isAdmin();
    $("#loginView").toggleClass("hidden", on);
    $("#dashView").toggleClass("hidden", !on);
    $("#logoutBtn").toggleClass("hidden", !on);
    if (on) refresh(); else setTimeout(function () { $("#adminPass").focus(); }, 50);
  }
  $("#loginForm").on("submit", function (e) {
    e.preventDefault();
    if (Store.checkPassword($("#adminPass").val())) {
      Store.setAdmin(true);
      $("#adminPass").val("");
      $("#loginMsg").text("");
      showView();
    } else {
      $("#loginMsg").attr("class", "form-msg error").text("Wrong password. Try again.");
    }
  });
  $("#logoutBtn").on("click", function () { Store.setAdmin(false); showView(); toast("Logged out"); });

  /* ---------- list ---------- */
  // choose a value in a drop-down; if it is no longer in the list (renamed / removed), keep it as an option
  function setSel($sel, value, label) {
    if (value == null || value === "") { $sel.val(""); return; }
    if (!$sel.find("option").filter(function () { return this.value === String(value); }).length) {
      $sel.append($("<option>").val(value).text(label || value));
    }
    $sel.val(value);
  }
  function cmpGrade(a, b) {
    var x = parseFloat(a), y = parseFloat(b), nx = isNaN(x), ny = isNaN(y);
    if (nx && ny) return String(a).localeCompare(String(b));
    if (nx) return -1;
    if (ny) return 1;
    return x - y;
  }

  /* Year -> Class -> Subject: each drop-down only offers what is linked to the one before it.
     `origin` is the document being edited, so its saved values stay selectable. */
  var origin = null;
  function optionList(items, label) {
    return items.map(function (v) { return '<option value="' + esc(v) + '">' + esc(label ? label(v) : v) + "</option>"; }).join("");
  }
  function fillClassOptions(wantGrade, wantCat) {
    var y = $("#docYear").val();
    var cur = wantGrade !== undefined ? wantGrade : $("#docGrade").val();
    var list = y ? Store.gradesFor(y) : [];
    $("#docGrade").html('<option value="" disabled selected>' + (y ? "Select class" : "Select year first") + "</option>" +
      optionList(list, function (g) { return "Class " + g; })).prop("disabled", !y);
    if (cur && (list.indexOf(cur) !== -1 || (origin && origin.grade === cur))) setSel($("#docGrade"), cur, "Class " + cur);
    fillSubjectOptions(wantCat);
  }
  function fillSubjectOptions(wantCat) {
    var g = $("#docGrade").val();
    var cur = wantCat !== undefined ? wantCat : $("#docCat").val();
    var list = g ? Store.subjectsFor(null, g).map(function (c) { return c.id; }) : [];
    $("#docCat").html('<option value="" disabled selected>' + (g ? "Select subject" : "Select class first") + "</option>" +
      optionList(list)).prop("disabled", !g);
    if (cur && (list.indexOf(cur) !== -1 || (origin && origin.category === cur))) setSel($("#docCat"), cur);
  }
  $("#docYear").on("change", function () { fillClassOptions(); });
  $("#docGrade").on("change", function () { fillSubjectOptions(); });

  function fillSelects() {
    CATS = window.CATEGORIES;
    var keep = { f: $("#docCategory").val(), g: $("#docGradeFilter").val(), y: $("#docYearFilter").val() };
    var cats = CATS.map(function (c) { return '<option value="' + esc(c.id) + '">' + esc(c.id) + "</option>"; }).join("");
    $("#docCategory").html('<option value="all">All subjects</option>' + cats);
    var grades = window.GRADES.map(function (g) { return '<option value="' + esc(g) + '">Class ' + esc(g) + "</option>"; }).join("");
    var years = window.YEARS.map(function (y) { return '<option value="' + esc(y) + '">' + esc(y) + "</option>"; }).join("");
    // the form's drop-downs start on "Select..." so nothing is picked by accident
    $("#docYear").html('<option value="" disabled>Select year</option>' + years).val(window.CURRENT_YEAR || "");
    fillClassOptions("", "");
    $("#docGradeFilter").html('<option value="all">All classes</option>' + grades);
    $("#docYearFilter").html('<option value="all">All years</option>' + years);
    $("#docCategory").val(keep.f || "all"); $("#docGradeFilter").val(keep.g || "all"); $("#docYearFilter").val(keep.y || "all");
    if (!$("#docCategory").val()) $("#docCategory").val("all");
    if (!$("#docGradeFilter").val()) $("#docGradeFilter").val("all");
    if (!$("#docYearFilter").val()) $("#docYearFilter").val("all");
  }
  function refresh() {
    return Store.getBooks({ includeHidden: true }).then(function (list) {
      books = list;
      render();
    });
  }
  function render() {
    var q = $.trim($("#docSearch").val()).toLowerCase();
    var cat = $("#docCategory").val();
    var rows = books.filter(function (b) {
      if (cat !== "all" && b.category !== cat) return false;
      if ($("#docGradeFilter").val() !== "all" && b.grade !== $("#docGradeFilter").val()) return false;
      if ($("#docYearFilter").val() !== "all" && b.year !== $("#docYearFilter").val()) return false;
      return !q || (b.title + " " + b.category + " class " + b.grade + " " + b.year).toLowerCase().indexOf(q) !== -1;
    });

    $("#tTotal").text(books.filter(function (b) { return !b.hidden; }).length);
    $("#tUp").text(books.filter(function (b) { return b.uploaded; }).length);
    $("#tBuilt").text(books.filter(function (b) { return b.source === "static" && !b.hidden; }).length);
    $("#tHidden").text(books.filter(function (b) { return b.hidden; }).length);

    $("#docRows").html(rows.map(function (b) {
      var type = b.hidden ? '<span class="pill pill-red">Removed</span>'
        : b.uploaded ? '<span class="pill pill-orange">Uploaded</span>' : '<span class="pill pill-blue">Built-in</span>';
      var actions =
        '<a class="icon-btn" target="_blank" rel="noopener" href="' + esc(b.file) + '" title="Open PDF" aria-label="Open PDF">' + ic("external") + "</a>" +
        '<button class="icon-btn act-edit" data-id="' + esc(b.id) + '" title="Edit" aria-label="Edit" type="button">' + ic("edit") + "</button>" +
        (b.hidden
          ? '<button class="icon-btn act-restore" data-id="' + esc(b.id) + '" title="Restore" aria-label="Restore" type="button">' + ic("restore") + "</button>"
          : '<button class="icon-btn icon-danger act-del" data-id="' + esc(b.id) + '" title="Delete" aria-label="Delete" type="button">' + ic("trash") + "</button>");
      return '<tr class="' + (b.hidden ? "is-hidden" : "") + '">' +
        '<td data-label="Document"><b>' + esc(b.title) + "</b>" + (b.desc ? "<small>" + esc(b.desc) + "</small>" : "") + "</td>" +
        '<td data-label="Subject">' + esc(b.category) + "</td>" +
        '<td data-label="Class">' + esc(b.grade) + "</td>" +
        '<td data-label="Year">' + esc(b.year) + "</td>" +
        '<td data-label="Type">' + type + "</td>" +
        '<td data-label="Size">' + fmtSize(b.size) + "</td>" +
        '<td class="td-actions">' + actions + "</td></tr>";
    }).join(""));
    $("#docEmpty").toggleClass("hidden", rows.length > 0);
  }
  $("#docSearch").on("input", render);
  $("#docCategory, #docGradeFilter, #docYearFilter").on("change", render);

  function find(id) { return books.filter(function (b) { return String(b.id) === String(id); })[0]; }

  /* ---------- modal ---------- */
  function openModal() { $("#docModal").removeClass("hidden"); $("body").css("overflow", "hidden"); }
  function closeModal() { $(".modal").addClass("hidden"); $("body").css("overflow", ""); }
  $(document).on("click", "[data-close]", closeModal);
  $(".modal").on("mousedown", function (e) { if (e.target === this) closeModal(); });
  $(document).on("keydown", function (e) { if (e.key === "Escape") closeModal(); });

  function openForm(book) {
    var editing = !!book;
    $("#docForm")[0].reset();
    showMsg("", "");
    $("#docId").val(editing ? book.id : "");
    $("#docModalTitle").html(ic(editing ? "edit" : "upload") + (editing ? " Edit Document" : " Add Document"));
    $("#docSubmit").text(editing ? "Save changes" : "Upload document");
    var builtin = editing && book.source === "static";
    $("#fileLabel, #docConsentWrap").toggleClass("hidden", builtin);
    $("#builtinNote").toggleClass("hidden", !builtin);
    $("#fileLabelText").text(editing ? "Replace PDF (optional)" : "PDF file");
    $("#docFile").prop("required", !editing);
    origin = editing ? book : null;
    if (editing) {
      $("#docName").val(book.title); $("#docDesc").val(book.desc);
      setSel($("#docYear"), book.year);
      fillClassOptions(book.grade, book.category);
    } else {
      // a new document: the year defaults to the current one, then class and subject must be chosen
      $("#docYear").val(window.CURRENT_YEAR || "");
      fillClassOptions("", "");
    }
    openModal();
    setTimeout(function () { $(editing ? "#docName" : "#docFile").focus(); }, 50);
  }
  $("#addBtn").on("click", function () { openForm(null); });
  $("#docRows").on("click", ".act-edit", function () {
    var b = find($(this).data("id"));
    if (b) openForm(b);
  });

  // pre-fill the file name from the chosen PDF
  $("#docFile").on("change", function () {
    var f = this.files[0];
    if (f && !$.trim($("#docName").val())) $("#docName").val(f.name.replace(/\.pdf$/i, "").replace(/[_-]+/g, " "));
  });

  $("#docForm").on("submit", function (e) {
    e.preventDefault();
    if (!Store.isAdmin()) { showMsg("error", "Admin login required."); return; }
    var id = $("#docId").val();
    var book = id ? find(id) : null;
    var file = $("#docFile")[0].files[0] || null;
    var fields = {
      title: $.trim($("#docName").val()), category: $("#docCat").val(),
      grade: $("#docGrade").val(), year: $("#docYear").val(), desc: $.trim($("#docDesc").val())
    };
    if (!fields.title) { showMsg("error", "Please enter a file name."); return; }
    if (!book && !file) { showMsg("error", "Please choose a PDF file."); return; }
    if (file && !$("#docConsent").prop("checked")) { showMsg("error", "Please tick the box to confirm you may share this document."); return; }
    if (file) {
      if (file.type !== "application/pdf" && !/\.pdf$/i.test(file.name)) { showMsg("error", "Only PDF files are allowed."); return; }
      if (file.size > CFG.maxUploadMB * 1048576) { showMsg("error", "File is too big (max " + CFG.maxUploadMB + " MB)."); return; }
    }

    var $btn = $("#docSubmit").prop("disabled", true);
    var job;
    if (!book) job = Store.addUpload($.extend({ file: file }, fields));
    else if (book.source === "static") job = Store.saveMeta(book.id, fields);
    else job = Store.updateUpload(book.id, $.extend({ file: file }, fields));

    job.then(function () {
      closeModal();
      toast(book ? "Document updated" : "Document added");
      return refresh();
    }).catch(function (err) {
      showMsg("error", "Could not save: " + esc(err && err.message ? err.message : "storage error"));
    }).then(function () { $btn.prop("disabled", false); });
  });

  /* ---------- delete / restore ---------- */
  $("#docRows").on("click", ".act-del", function () {
    var b = find($(this).data("id"));
    if (!b) return;
    var job;
    if (b.source === "static") {
      if (!window.confirm("Remove \"" + b.title + "\" from the library?\nYou can restore it later.")) return;
      job = Store.saveMeta(b.id, { hidden: true });
    } else {
      if (!window.confirm("Delete \"" + b.title + "\" permanently? This cannot be undone.")) return;
      job = Store.deleteUpload(b.id);
    }
    job.then(refresh).then(function () { toast("Document deleted"); });
  });
  $("#docRows").on("click", ".act-restore", function () {
    var b = find($(this).data("id"));
    if (b) Store.saveMeta(b.id, { hidden: false }).then(refresh).then(function () { toast("Document restored"); });
  });

  /* ---------- tabs ---------- */
  $(".tab").on("click", function () {
    var t = $(this).data("tab");
    $(".tab").removeClass("active"); $(this).addClass("active");
    $("#tabDocs").toggleClass("hidden", t !== "docs");
    $("#tabLists").toggleClass("hidden", t !== "lists");
    if (t === "lists") renderLists();
  });

  /* ---------- subjects / classes / years ---------- */
  var KIND = {
    subjects: { label: "Subject", field: "category", ul: "#listSubjects" },
    grades:   { label: "Class",   field: "grade",    ul: "#listGrades" },
    years:    { label: "Year",    field: "year",     ul: "#listYears" }
  };
  var editing = null; // { kind, index }  (index -1 = adding)

  function itemsOf(kind) {
    return kind === "subjects" ? window.CATEGORIES : kind === "grades" ? window.GRADES : window.YEARS;
  }
  function nameOf(kind, it) { return kind === "subjects" ? it.id : it; }
  function currentLists() {
    return {
      subjects: JSON.parse(JSON.stringify(window.CATEGORIES)), grades: window.GRADES.slice(), years: window.YEARS.slice(),
      gradeYears: JSON.parse(JSON.stringify(window.GRADE_YEARS || {}))
    };
  }

  function relationText(kind, it) {
    var all = window.GRADES.length, ally = window.YEARS.length, list;
    if (kind === "subjects") {
      list = it.grades;
      return !list || list.length === all ? "All classes" : (list.length ? "Classes: " + list.join(", ") : "No class linked");
    }
    if (kind === "grades") {
      list = window.GRADE_YEARS[it];
      return !list || list.length === ally ? "All years" : (list.length ? "Years: " + list.join(", ") : "No year linked");
    }
    var n = Store.gradesFor(it).length;
    return n + (n === 1 ? " class" : " classes");
  }

  function renderLists() {
    Store.getBooks({ includeHidden: true }).then(function (all) {
      Object.keys(KIND).forEach(function (kind) {
        var k = KIND[kind], items = itemsOf(kind);
        if (!items.length) { $(k.ul).html('<li class="muted">Nothing yet. Click Add.</li>'); return; }
        $(k.ul).html(items.map(function (it, i) {
          var name = nameOf(kind, it);
          var used = all.filter(function (b) { return b[k.field] === name; }).length;
          var lead = kind === "subjects"
            ? '<span class="swatch" style="background:' + esc(it.color) + '">' + ic(it.icon) + "</span>" : "";
          return "<li>" + lead + '<div class="item-name"><b>' + esc(kind === "grades" ? "Class " + name : name) + "</b><small>" +
            used + (used === 1 ? " document" : " documents") + "</small><small>" + esc(relationText(kind, it)) + "</small></div>" +
            '<button class="icon-btn item-edit" data-kind="' + kind + '" data-i="' + i + '" title="Edit" aria-label="Edit" type="button">' + ic("edit") + "</button>" +
            '<button class="icon-btn icon-danger item-del" data-kind="' + kind + '" data-i="' + i + '" data-used="' + used + '" title="Delete" aria-label="Delete" type="button">' + ic("trash") + "</button></li>";
        }).join(""));
      });
    });
  }

  function openItem(kind, index) {
    var k = KIND[kind];
    editing = { kind: kind, index: index };
    var cur = index >= 0 ? itemsOf(kind)[index] : null;
    $("#itemTitle").html(ic(index >= 0 ? "edit" : "plus") + (index >= 0 ? " Edit " : " Add ") + k.label);
    $("#itemNameLabel").text(k.label + " name");
    $("#itemName").val(cur ? nameOf(kind, cur) : "")
      .attr("placeholder", kind === "years" ? "e.g. 2027-28" : kind === "grades" ? "e.g. 7 or LKG" : "e.g. Hindi");
    var sel = cur && kind === "subjects" ? cur.icon : "";
    $("#itemIcon").val(sel);
    $("#iconPicker").html(ICONS.map(function (p) {
      return '<button type="button" class="icon-opt' + (p[0] === sel ? " selected" : "") + '" data-icon="' + p[0] +
        '" role="radio" aria-checked="' + (p[0] === sel) + '" title="' + p[1] + '">' + ic(p[0]) + "<span>" + p[1] + "</span></button>";
    }).join(""));
    $("#itemColor").val(cur && kind === "subjects" ? cur.color : "#2a6fdb");
    $("#subjectExtras").toggleClass("hidden", kind !== "subjects");
    // relation: a subject is linked to classes, a class is linked to years
    $("#mapWrap").toggleClass("hidden", kind === "years");
    if (kind !== "years") {
      var opts = kind === "subjects" ? window.GRADES : window.YEARS;
      var chosen = kind === "subjects"
        ? (cur && cur.grades ? cur.grades : opts)
        : (cur ? (window.GRADE_YEARS[cur] || opts) : (window.CURRENT_YEAR ? [window.CURRENT_YEAR] : opts));
      $("#mapLabel").text(kind === "subjects" ? "Available for classes" : "Available in years");
      $("#mapGroup").html(opts.map(function (o) {
        return '<label class="chk"><input type="checkbox" value="' + esc(o) + '"' + (chosen.indexOf(o) !== -1 ? " checked" : "") +
          "><span>" + esc(kind === "subjects" ? "Class " + o : o) + "</span></label>";
      }).join(""));
    }
    $("#itemMsg").attr("class", "form-msg").text("");
    $("#itemModal").removeClass("hidden"); $("body").css("overflow", "hidden");
    setTimeout(function () { $("#itemName").focus(); }, 50);
  }
  // choose an icon (click again to clear it - the icon is optional)
  $("#iconPicker").on("click", ".icon-opt", function () {
    var on = $(this).hasClass("selected");
    $("#iconPicker .icon-opt").removeClass("selected").attr("aria-checked", "false");
    if (on) { $("#itemIcon").val(""); return; }
    $(this).addClass("selected").attr("aria-checked", "true");
    $("#itemIcon").val($(this).data("icon"));
  });
  $("#mapAll").on("click", function () { $("#mapGroup input").prop("checked", true); });
  $("#mapNone").on("click", function () { $("#mapGroup input").prop("checked", false); });
  $("#tabLists").on("click", ".add-item", function () { openItem($(this).data("kind"), -1); });
  $("#tabLists").on("click", ".item-edit", function () { openItem($(this).data("kind"), +$(this).data("i")); });

  $("#itemForm").on("submit", function (e) {
    e.preventDefault();
    if (!Store.isAdmin() || !editing) return;
    var kind = editing.kind, idx = editing.index, k = KIND[kind];
    var name = $.trim($("#itemName").val());
    var $msg = $("#itemMsg");
    if (!name) { $msg.attr("class", "form-msg error").text("Please enter a name."); return; }
    var items = itemsOf(kind);
    var oldName = idx >= 0 ? nameOf(kind, items[idx]) : null;
    var dup = items.some(function (it, i) { return i !== idx && String(nameOf(kind, it)).toLowerCase() === name.toLowerCase(); });
    if (dup) { $msg.attr("class", "form-msg error").text("That " + k.label.toLowerCase() + " already exists."); return; }

    var mapped = $("#mapGroup input:checked").map(function () { return this.value; }).get();
    if (kind !== "years" && !mapped.length) {
      $msg.attr("class", "form-msg error").text("Pick at least one " + (kind === "subjects" ? "class" : "year") + " for this " + k.label.toLowerCase() + ".");
      return;
    }

    var L = currentLists();
    var value = kind === "subjects" ? { id: name, icon: $("#itemIcon").val() || "book-open", color: $("#itemColor").val(), grades: mapped } : name;
    if (kind === "grades") L.gradeYears[name] = mapped;
    if (idx >= 0 && oldName !== name) {
      if (kind === "grades") {
        if (oldName !== name) delete L.gradeYears[oldName];
        L.subjects.forEach(function (c) { if (c.grades) c.grades = c.grades.map(function (g) { return g === oldName ? name : g; }); });
      }
      if (kind === "years") {
        Object.keys(L.gradeYears).forEach(function (g) { L.gradeYears[g] = L.gradeYears[g].map(function (y) { return y === oldName ? name : y; }); });
      }
    }
    if (idx >= 0) L[kind][idx] = value; else L[kind].push(value);
    if (kind === "grades") L.grades.sort(cmpGrade);
    if (kind === "years") L.years.sort();

    var job = Store.saveLists(L);
    if (idx >= 0 && oldName !== name) job = job.then(function () { return Store.renameValue(k.field, oldName, name); });
    job.then(function () {
      closeModal();
      toast(k.label + (idx >= 0 ? " updated" : " added"));
      fillSelects();
      renderLists();
      return refresh();
    }).catch(function (err) {
      $msg.attr("class", "form-msg error").text("Could not save: " + (err && err.message ? err.message : "storage error"));
    });
  });

  $("#tabLists").on("click", ".item-del", function () {
    var kind = $(this).data("kind"), i = +$(this).data("i"), used = +$(this).data("used");
    var k = KIND[kind], name = nameOf(kind, itemsOf(kind)[i]);
    if (used > 0) {
      window.alert('"' + name + '" is used by ' + used + (used === 1 ? " document" : " documents") + ".\nMove or delete those documents first.");
      return;
    }
    if (!window.confirm("Delete " + k.label.toLowerCase() + ' "' + name + '"?')) return;
    var L = currentLists();
    L[kind].splice(i, 1);
    if (kind === "grades") {
      delete L.gradeYears[name];
      L.subjects.forEach(function (c) { if (c.grades) c.grades = c.grades.filter(function (g) { return g !== name; }); });
    }
    if (kind === "years") {
      Object.keys(L.gradeYears).forEach(function (g) { L.gradeYears[g] = L.gradeYears[g].filter(function (y) { return y !== name; }); });
    }
    Store.saveLists(L).then(function () { toast(k.label + " deleted"); fillSelects(); renderLists(); });
  });

  /* ---------- init ---------- */
  Store.loadLists().then(function () {
    fillSelects();
    showView();
  });
});
