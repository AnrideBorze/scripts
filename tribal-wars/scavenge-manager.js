/* Scavenge Manager v1.3.1 — manual fill only */
(function () {
"use strict";
try {
  var params = new URLSearchParams(window.location.search);
  if (params.get("screen") !== "place" || params.get("mode") !== "scavenge") {
    var url = new URL("/game.php", window.location.origin);
    var villageId = window.game_data && game_data.village && game_data.village.id;
    if (!villageId) villageId = new URLSearchParams(window.location.search).get("village");
    if (villageId) url.searchParams.set("village", villageId);
    url.searchParams.set("screen", "place");
    url.searchParams.set("mode", "scavenge");
    window.location.assign(url.toString());
    return;
  }

  var s = window.ScavengeScreen;
  if (!s) throw Error("Сторінка збору ресурсів ще не готова. Спробуй ще раз після завантаження.");

  var old = document.getElementById("sm-box");
  if (old) old.remove();

  var units = s.village.unit_counts_home;
  var stats = s.loot_calculator.default_unit_stats;
  var opts = Object.values(s.village.options).filter(function(o) {
    return !o.isLocked() && !o.hasActiveSquad() && !o.isUnlocking();
  });
  if (!opts.length) throw Error("Немає вільних точок");

  var keys = Object.keys(stats).filter(function(k) {
    return units[k] > 0 && stats[k].can_attack;
  });

  var box = document.createElement("div");
  box.id = "sm-box";
  box.style = "position:fixed;z-index:2147483647;top:5%;left:50%;transform:translateX(-50%);width:600px;max-width:92%;max-height:85%;overflow:auto;background:#f1e5c7;color:#222;border:3px solid #654;padding:15px;font:14px Arial";
  box.innerHTML =
    "<h2>Scavenge Manager v1.3</h2>" +
    "<p>Максимум хвилин: <input id='sm-time' type='number' value='120' min='31' style='width:75px'></p>" +
    "<div id='sm-units'></div>" +
    "<p><button id='sm-calc'>Розрахувати</button> <button id='sm-close'>Закрити</button></p>" +
    "<div id='sm-result'></div>";
  document.body.appendChild(box);

  var area = box.querySelector("#sm-units");
  keys.forEach(function(k) {
    var label = document.createElement("label");
    var checkbox = document.createElement("input");
    label.style = "display:inline-block;margin:5px 12px 5px 0";
    checkbox.type = "checkbox";
    checkbox.value = k;
    checkbox.checked = k !== "knight";
    label.appendChild(checkbox);
    label.appendChild(document.createTextNode(" " + k + " (" + units[k] + ")"));
    area.appendChild(label);
  });

  box.querySelector("#sm-close").onclick = function() { box.remove(); };

  function fill(group) {
    var inputs = document.querySelectorAll(".unitsInput");
    if (!inputs.length) {
      console.error("Scavenge Manager: поля військ не знайдено");
      return;
    }
    inputs.forEach(function(el) {
      el.value = group.n[el.name] || "";
      el.dispatchEvent(new Event("input", {bubbles:true}));
      el.dispatchEvent(new Event("change", {bubbles:true}));
    });
    box.remove();
  }

  box.querySelector("#sm-calc").onclick = function() {
    try {
      var max = Number(box.querySelector("#sm-time").value) * 60;
      if (!Number.isFinite(max) || max <= 1800) throw Error("Вкажи час понад 30 хв");

      var chosen = Array.from(area.querySelectorAll("input:checked")).map(function(el) {
        return el.value;
      });
      if (!chosen.length) throw Error("Не вибрано військ");

      var pool = {};
      chosen.forEach(function(k) { pool[k] = units[k]; });
      var groups = opts.map(function(o) {
        return {o:o, n:{}, carry:0, pop:0, time:0};
      });

      var min = s.candidate_squad.min_pop_to_send;
      var factor = s.village.unit_carry_factor;
      var steps = 0;
      while (steps++ < 100000) {
        var best = null;
        groups.forEach(function(g) {
          chosen.forEach(function(k) {
            if (!pool[k]) return;
            var carry = stats[k].carry * factor;
            var time = g.o.calcDurationSeconds(g.carry + carry);
            if (time > max) return;
            var score = g.carry ? g.time : 0;
            if (!best || score < best.score) {
              best = {g:g, k:k, carry:carry, time:time, score:score};
            }
          });
        });
        if (!best) break;
        best.g.n[best.k] = (best.g.n[best.k] || 0) + 1;
        best.g.carry += best.carry;
        best.g.pop += stats[best.k].pop;
        best.g.time = best.time;
        pool[best.k]--;
      }

      var result = box.querySelector("#sm-result");
      result.innerHTML = "";
      var table = document.createElement("table");
      table.style = "border-collapse:collapse;width:100%";
      table.innerHTML = "<tr><th>Точка</th><th>Війська</th><th>Час</th><th>Дія</th></tr>";

      groups.forEach(function(g) {
        var tr = document.createElement("tr");
        var troops = Object.entries(g.n).map(function(x) {
          return x[0] + ":" + x[1];
        }).join(", ") || "—";
        [g.o.getName(), troops, Math.floor(g.time/60) + " хв"].forEach(function(value) {
          var td = document.createElement("td");
          td.textContent = value;
          td.style = "border:1px solid #987;padding:6px";
          tr.appendChild(td);
        });
        var td = document.createElement("td");
        var button = document.createElement("button");
        button.textContent = "Заповнити";
        button.disabled = g.pop < min || !g.carry;
        button.onclick = function() { fill(g); };
        td.appendChild(button);
        tr.appendChild(td);
        table.appendChild(tr);
      });
      result.appendChild(table);

      var p = document.createElement("p");
      p.textContent = "Залишок: " + JSON.stringify(pool);
      result.appendChild(p);

      if (groups.some(function(g) { return g.pop < min; })) {
        var warning = document.createElement("p");
        warning.style.color = "darkred";
        warning.textContent = "Недостатньо військ для деяких точок.";
        result.appendChild(warning);
      }
    } catch(e) {
      alert("Розрахунок: " + e.message);
      console.error(e);
    }
  };
} catch(e) {
  alert("Scavenge Manager: " + e.message);
  console.error(e);
}
})();
