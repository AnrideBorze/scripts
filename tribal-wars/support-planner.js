/* Support Planner for Tribal Wars. Manual sending only. */
(function () {
  "use strict";
  var d = document;
  var previous = d.getElementById("sp");
  if (window.spTimer) { clearInterval(window.spTimer); window.spTimer = null; }
  if (previous) previous.remove();
  try {
    if (!window.game_data || !game_data.village) throw Error("Немає даних поточного села");
    var village = game_data.village;
    function coords(value) {
      var match = String(value || "").match(/(\d{1,3})\s*\|\s*(\d{1,3})/);
      return match ? [+match[1], +match[2]] : null;
    }
    var source = coords(village.coord), target = null;
    d.querySelectorAll("#content_value tr").forEach(function (row) {
      var cells = row.querySelectorAll("td,th");
      if (cells.length > 1 && /координат|coordinates/i.test(cells[0].textContent)) {
        target = coords(cells[1].textContent);
      }
    });
    if (!source || !target) throw Error("Відкрий інформацію про цільове село");
    var units = [["snob",35],["ram",30],["catapult",30],["sword",22],["spear",18],["axe",18],["archer",18],["heavy",11],["light",10],["marcher",10],["knight",10],["spy",9]];
    var panel = d.createElement("div");
    panel.id = "sp";
    panel.style = "position:fixed;right:10px;top:50px;z-index:2147483647;background:#f1e5c7;color:#222;border:3px solid #654;padding:12px;width:440px;max-width:90vw;max-height:85vh;min-width:280px;min-height:170px;resize:both;overflow:auto;box-sizing:border-box;font:13px Arial";
    panel.innerHTML = "<div id='spdrag' style='display:flex;align-items:center;justify-content:space-between;cursor:move;user-select:none;touch-action:none;background:#d7c49c;padding:5px;margin:-5px -5px 8px -5px'><b>Support Planner v1.8 ↕</b><button id='spx' style='cursor:pointer'>✕</button></div><p>Ціль: " + target.join("|") + " | Звідки: " + source.join("|") + "</p><p>Прибуття: <input id='spt' type='datetime-local' step='1'></p><div id='spu'></div><p><button id='spc'>Розрахувати</button></p><div id='spr'></div><small>Швидкості орієнтовні. Відправлення лише вручну.</small>";
    d.body.appendChild(panel);
    function q(selector) { return panel.querySelector(selector); }
    function pad(number) { return String(number).padStart(2, "0"); }
    function stopTimer() { if (window.spTimer) { clearInterval(window.spTimer); window.spTimer = null; } }
    q("#spx").onclick = function () { stopTimer(); panel.remove(); };
    var dragBar = q("#spdrag");
    dragBar.addEventListener("pointerdown", function (event) {
      if (event.button !== 0 || event.target.closest("button")) return;
      event.preventDefault();
      var rect = panel.getBoundingClientRect();
      var offsetX = event.clientX - rect.left, offsetY = event.clientY - rect.top;
      panel.style.left = rect.left + "px";
      panel.style.top = rect.top + "px";
      panel.style.right = "auto";
      function move(e) {
        panel.style.left = Math.max(0, Math.min(window.innerWidth - 40, e.clientX - offsetX)) + "px";
        panel.style.top = Math.max(0, Math.min(window.innerHeight - 40, e.clientY - offsetY)) + "px";
      }
      function end() {
        window.removeEventListener("pointermove", move);
        window.removeEventListener("pointerup", end);
        window.removeEventListener("pointercancel", end);
      }
      window.addEventListener("pointermove", move);
      window.addEventListener("pointerup", end);
      window.addEventListener("pointercancel", end);
    });

    var now = new Date(Date.now() + 3600000);
    q("#spt").value = now.getFullYear() + "-" + pad(now.getMonth()+1) + "-" + pad(now.getDate()) + "T" + pad(now.getHours()) + ":" + pad(now.getMinutes()) + ":" + pad(now.getSeconds());
    q("#spu").style = "display:flex;flex-wrap:nowrap;align-items:center;gap:1px;overflow-x:auto;";
    units.forEach(function (unit) {
      var label = d.createElement("label");
      label.style = "display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;border:1px solid #ba9;padding:1px;margin:1px";
      label.title = unit[0];
      label.innerHTML = "<input style='margin:0 1px 0 0;width:12px;height:12px;flex:none' type='checkbox' value='" + unit[0] + "' " + (["spear","sword","heavy"].includes(unit[0]) ? "checked" : "") + "><img width='17' height='17' src='/graphic/unit/unit_" + unit[0] + ".png'>";
      q("#spu").appendChild(label);
    });
    q("#spc").onclick = function () {
      stopTimer();
      var arrival = new Date(q("#spt").value).getTime();
      var distance = Math.hypot(source[0]-target[0],source[1]-target[1]);
      var selected = Array.from(q("#spu").querySelectorAll("input:checked")).map(function (el) { return el.value; });
      var output = q("#spr");
      if (!Number.isFinite(arrival) || !selected.length) { output.textContent = "Вкажи час і війська"; return; }
      output.innerHTML = "";
      var clocks = [];
      units.filter(function (unit) { return selected.includes(unit[0]); }).forEach(function (unit) {
        var sendTime = arrival - Math.round(distance * unit[1] * 60000);
        var row = d.createElement("div");
        row.style = "padding:5px;border-bottom:1px solid #ba9";
        var link = "/game.php?village=" + encodeURIComponent(village.id) + "&screen=place&target=" + encodeURIComponent(target.join("|"));
        row.innerHTML = "<img width='22' style='vertical-align:middle' src='/graphic/unit/unit_" + unit[0] + ".png'> " + new Date(sendTime).toLocaleString("uk-UA") + " <a href='" + link + "'>Площа ↗</a>";
        var clock = d.createElement("b");
        clock.style = "margin-left:8px;color:green";
        row.appendChild(clock);
        output.appendChild(row);
        clocks.push([clock, sendTime]);
      });
      function tick() {
        if (!panel.isConnected) { stopTimer(); return; }
        for (var i=0;i<clocks.length;i++) {
          var seconds = Math.ceil((clocks[i][1]-Date.now())/1000);
          var absolute = Math.abs(seconds);
          var hours = Math.floor(absolute/3600);
          var minutes = Math.floor(absolute%3600/60);
          var remainder = absolute%60;
          clocks[i][0].textContent = " " + (seconds<0 ? "-" : "") + hours + ":" + pad(minutes) + ":" + pad(remainder);
          clocks[i][0].style.color = seconds<=0 ? "red" : seconds<=60 ? "darkorange" : "green";
        }
      }
      tick();
      window.spTimer = setInterval(tick,1000);
    };
  } catch (error) {
    alert("Support Planner: " + error.message);
    console.error(error);
  }
})();
