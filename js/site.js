/* Shared by every page: school details, cookie notice, keyboard focus handling. No tracking. */
(function () {
  "use strict";

  var S = window.SCHOOL || {};
  // site root, worked out from this script's own address (js/site.js -> ../)
  var ROOT = document.currentScript ? new URL("../", document.currentScript.src).href : "";

  /* ---------- school details ([data-school="..."], [data-year]) ---------- */
  function esc(s) { var d = document.createElement("div"); d.textContent = s; return d.innerHTML; }

  Array.prototype.forEach.call(document.querySelectorAll("[data-school]"), function (el) {
    var key = el.getAttribute("data-school");
    var val = S[key];
    if (val) {
      if (key === "email") el.innerHTML = '<a href="mailto:' + esc(val) + '">' + esc(val) + "</a>";
      else if (key === "phone") el.innerHTML = '<a href="tel:' + esc(val.replace(/\s+/g, "")) + '">' + esc(val) + "</a>";
      else el.textContent = val;
    } else if (el.hasAttribute("data-optional")) {
      el.textContent = "";
    } else if (key !== "name") {
      el.innerHTML = '<span class="todo">[to be added by the school]</span>';
    }
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-year]"), function (el) {
    el.textContent = new Date().getFullYear();
  });
  Array.prototype.forEach.call(document.querySelectorAll("[data-footer-contact]"), function (el) {
    var parts = [];
    if (S.address) parts.push(esc(S.address));
    if (S.email) parts.push('<a href="mailto:' + esc(S.email) + '">' + esc(S.email) + "</a>");
    if (S.phone) parts.push('<a href="tel:' + esc(S.phone.replace(/\s+/g, "")) + '">' + esc(S.phone) + "</a>");
    el.innerHTML = parts.join(" &middot; ");
  });

  /* ---------- cookie notice ----------
     The site sets no cookies and loads no tracking. This notice records the visitor's
     choice so that any optional feature added later (for example visitor statistics)
     stays OFF until they accept:  if (Consent.allows("optional")) { ... } */
  var KEY = "kv-cookie-consent";
  var Consent = {
    get: function () { try { return localStorage.getItem(KEY); } catch (e) { return null; } },
    set: function (v) { try { localStorage.setItem(KEY, v); } catch (e) {} },
    allows: function () { return Consent.get() === "all"; }
  };
  window.Consent = Consent;

  function showBanner() {
    if (document.getElementById("cookieBanner")) return;
    var b = document.createElement("div");
    b.className = "cookie-banner";
    b.id = "cookieBanner";
    b.setAttribute("role", "region");
    b.setAttribute("aria-label", "Cookie notice");
    b.innerHTML =
      "<p><strong>Cookies and storage.</strong> This website does not use advertising or tracking cookies. " +
      "It only uses essential browser storage to work. Optional cookies stay off unless you accept them. " +
      '<a href="' + ROOT + 'cookies/">Read the Cookie Policy</a>.</p>' +
      '<div class="cookie-actions">' +
      '<button type="button" class="btn btn-small btn-ghost" data-consent="essential">Essential only</button>' +
      '<button type="button" class="btn btn-small btn-primary" data-consent="all">Accept optional</button>' +
      "</div>";
    document.body.appendChild(b);
  }
  document.addEventListener("click", function (e) {
    var btn = e.target.closest ? e.target.closest("[data-consent]") : null;
    if (btn) {
      Consent.set(btn.getAttribute("data-consent"));
      var b = document.getElementById("cookieBanner");
      if (b) b.parentNode.removeChild(b);
      return;
    }
    if (e.target.closest && e.target.closest("[data-cookie-settings]")) showBanner();
  });
  if (!Consent.get()) showBanner();

  /* ---------- keyboard: focus moves into dialogs, stays inside, and returns on close ---------- */
  var SEL = '.modal, .reader';
  var FOCUSABLE = 'a[href], button:not([disabled]), input:not([disabled]):not([type=hidden]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';
  var opener = new WeakMap();

  function isOpen(el) { return !el.classList.contains("hidden"); }
  function focusables(el) {
    return Array.prototype.filter.call(el.querySelectorAll(FOCUSABLE), function (n) { return n.offsetParent !== null; });
  }
  var observer = new MutationObserver(function (list) {
    list.forEach(function (m) {
      var el = m.target;
      var wasHidden = /\bhidden\b/.test(m.oldValue || "");
      if (isOpen(el) && wasHidden) {
        opener.set(el, document.activeElement);
        setTimeout(function () {
          if (el.contains(document.activeElement)) return;
          var f = focusables(el)[0];
          if (f) f.focus();
        }, 0);
      } else if (!isOpen(el) && !wasHidden) {
        var back = opener.get(el);
        if (back && document.body.contains(back)) back.focus();
      }
    });
  });
  Array.prototype.forEach.call(document.querySelectorAll(SEL), function (el) {
    observer.observe(el, { attributes: true, attributeFilter: ["class"], attributeOldValue: true });
  });

  document.addEventListener("keydown", function (e) {
    if (e.key !== "Tab") return;
    var open = Array.prototype.filter.call(document.querySelectorAll(SEL), isOpen);
    if (!open.length) return;
    var box = open[open.length - 1];
    var items = focusables(box);
    if (!items.length) return;
    var first = items[0], last = items[items.length - 1];
    if (!box.contains(document.activeElement)) { e.preventDefault(); first.focus(); }
    else if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
    else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
  });
})();
