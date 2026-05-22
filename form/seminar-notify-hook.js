(function () {
  var API = new URL("/api/seminar-notify", window.location.origin).toString();
  var lastKey = "";
  var lastAt = 0;
  var COOLDOWN_MS = 8000;

  function collectFields(root) {
    var rows = [];
    if (!root) return rows;
    var els = root.querySelectorAll("input, select, textarea");
    for (var i = 0; i < els.length; i++) {
      var el = els[i];
      var t = (el.type || "").toLowerCase();
      if (t === "hidden" || t === "submit" || t === "button" || el.disabled)
        continue;
      var label = "";
      try {
        if (el.labels && el.labels.length) label = el.labels[0].textContent;
        else if (el.id && /^[A-Za-z0-9_-]+$/.test(el.id)) {
          var lb = root.querySelector("label[for=\"" + el.id + "\"]");
          if (lb) label = lb.textContent;
        }
        if (!label) {
          var p = el.parentElement;
          for (var d = 0; d < 6 && p; d++) {
            var prev = p.previousElementSibling;
            if (prev && prev.tagName === "LABEL") {
              label = prev.textContent;
              break;
            }
            p = p.parentElement;
          }
        }
      } catch (e) {}
      label = (label || el.name || el.placeholder || el.id || "(項目)")
        .replace(/\s+/g, " ")
        .trim();
      var val;
      if (t === "checkbox" || t === "radio") val = el.checked ? "はい" : "いいえ";
      else val = el.value != null ? String(el.value) : "";
      rows.push({ label: label, value: val });
    }
    return rows;
  }

  function sendSnapshot(root) {
    var fields = collectFields(root);
    if (!fields.length) return;
    var key = JSON.stringify(fields);
    var now = Date.now();
    if (key === lastKey && now - lastAt < COOLDOWN_MS) return;
    lastKey = key;
    lastAt = now;

    var payload = {
      pageUrl: String(window.location.href),
      pageTitle: String(document.title || ""),
      fields: fields,
    };

    fetch(API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    }).catch(function () {});
  }

  document.addEventListener(
    "click",
    function (ev) {
      var t = ev.target;
      if (!t || !t.closest) return;
      var btn = t.closest(".form-submit_button");
      if (!btn) return;
      var root = document.getElementById("form-sp");
      if (!root || !root.contains(btn)) return;
      window.setTimeout(function () {
        sendSnapshot(root);
      }, 500);
    },
    true
  );
})();
