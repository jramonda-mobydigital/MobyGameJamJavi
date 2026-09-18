/* La ballena es el personaje principal: siempre se mueve con las flechas
   del teclado, sin necesidad de seleccionarla primero. Camina libre por
   el stage (con limite en los bordes) y, al tocar la medialuna, el cafe
   o el logo con la boca, se los come (la animacion vive en feed.js).
   Comidos, reaparecen en otro punto del stage despues de un rato. */
(function () {
  "use strict";

  var stage = document.querySelector(".stage");
  var whale = document.querySelector(".whale");
  var foods = Array.prototype.slice.call(
    document.querySelectorAll(".croissant, .sticker--coffee, .sticker--logo")
  );
  if (!stage || !whale || !foods.length) return;

  var SPEED = 720;         /* px/s de la ballena */
  var MOUTH_X = 0.680;     /* punto de la boca, en fraccion de la caja de la ballena */
  var MOUTH_Y = 0.430;
  var BITE_RADIUS = 0.34;  /* fraccion del ancho de la ballena: alcance del mordisco */
  var SPAWN_MARGIN = 24;   /* px de aire contra los bordes del stage al reaparecer */
  var LOGO_JUMPSCARE_AT = 3; /* cuantos logos hacen falta para el susto de la VPN */

  var jumpscare = document.getElementById("jumpscare");
  var frozen = false;

  var keys = Object.create(null);
  var touchTarget = null; /* donde apunta el dedo mientras toca la pantalla */
  var whaleOffset = { x: 0, y: 0 };
  var foodOffsets = new Map();
  foods.forEach(function (el) { foodOffsets.set(el, { x: 0, y: 0 }); });

  /* Contador de comidas por tipo, mostrado en el HUD */
  function foodType(el) {
    if (el.classList.contains("croissant")) return "croissant";
    if (el.classList.contains("sticker--coffee")) return "coffee";
    if (el.classList.contains("sticker--logo")) return "logo";
    return null;
  }

  var counts = { croissant: 0, coffee: 0, logo: 0 };

  function bumpCount(el) {
    var type = foodType(el);
    if (!type) return;
    counts[type]++;
    var out = document.querySelector('.hud__count[data-count="' + type + '"]');
    if (out) out.textContent = counts[type];

    if (type === "logo" && counts.logo >= LOGO_JUMPSCARE_AT) triggerJumpscare();
  }

  /* Tres logos y aparece la pantalla de la VPN: se congela el juego hasta
     que se aprieta Enter, que reinicia todo con un reload. */
  function triggerJumpscare() {
    if (frozen) return;
    frozen = true;
    keys = Object.create(null);
    if (jumpscare) jumpscare.hidden = false;
  }

  var frame = 0;
  var last = 0;

  function isArrow(key) {
    return key === "ArrowUp" || key === "ArrowDown" || key === "ArrowLeft" || key === "ArrowRight";
  }

  function onKeyDown(event) {
    if (frozen) {
      if (event.key === "Enter") location.reload();
      return;
    }
    if (!isArrow(event.key)) return;
    keys[event.key] = true;
    event.preventDefault();
  }

  /* En el celu no hay Enter: un toque en la pantalla de susto reinicia igual */
  if (jumpscare) {
    jumpscare.addEventListener("pointerdown", function () {
      if (frozen) location.reload();
    });
  }

  function onKeyUp(event) {
    if (!isArrow(event.key)) return;
    keys[event.key] = false;
  }

  window.addEventListener("keydown", onKeyDown);
  window.addEventListener("keyup", onKeyUp);
  window.addEventListener("blur", function () {
    keys = Object.create(null);
    touchTarget = null;
  });

  /* Desde el celu: mientras el dedo toca la pantalla, la ballena camina
     hacia ese punto (mismo esquema continuo que las flechas). El mouse no
     se toca: solo pointerType "touch" mueve. */
  function onPointerDown(event) {
    if (event.pointerType !== "touch" || frozen) return;
    touchTarget = { x: event.clientX, y: event.clientY };
  }

  function onPointerMove(event) {
    if (event.pointerType !== "touch" || !touchTarget) return;
    touchTarget = { x: event.clientX, y: event.clientY };
  }

  function onPointerEnd(event) {
    if (event.pointerType !== "touch") return;
    touchTarget = null;
  }

  stage.addEventListener("pointerdown", onPointerDown);
  window.addEventListener("pointermove", onPointerMove);
  window.addEventListener("pointerup", onPointerEnd);
  window.addEventListener("pointercancel", onPointerEnd);

  function applyWhale() {
    whale.style.setProperty("--move-x", whaleOffset.x.toFixed(1) + "px");
    whale.style.setProperty("--move-y", whaleOffset.y.toFixed(1) + "px");
  }

  function applyFood(el) {
    var o = foodOffsets.get(el);
    el.style.setProperty("--move-x", o.x.toFixed(1) + "px");
    el.style.setProperty("--move-y", o.y.toFixed(1) + "px");
  }

  /* Mueve a la ballena por (dx, dy) sin dejarla salir del stage */
  function moveWhale(dx, dy) {
    var stageRect = stage.getBoundingClientRect();
    var whaleRect = whale.getBoundingClientRect();
    var halfW = whaleRect.width / 2;
    var halfH = whaleRect.height / 2;
    var stageCenterX = stageRect.left + stageRect.width / 2;
    var stageCenterY = stageRect.top + stageRect.height / 2;

    var centerX = stageCenterX + whaleOffset.x + dx;
    var centerY = stageCenterY + whaleOffset.y + dy;

    var minX = stageRect.left + halfW;
    var maxX = stageRect.right - halfW;
    var minY = stageRect.top + halfH;
    var maxY = stageRect.bottom - halfH;

    if (minX <= maxX) centerX = Math.min(Math.max(centerX, minX), maxX);
    if (minY <= maxY) centerY = Math.min(Math.max(centerY, minY), maxY);

    whaleOffset.x = centerX - stageCenterX;
    whaleOffset.y = centerY - stageCenterY;
    applyWhale();
  }

  function mouthPoint() {
    var r = whale.getBoundingClientRect();
    return { x: r.left + r.width * MOUTH_X, y: r.top + r.height * MOUTH_Y, size: r.width };
  }

  function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Hasta donde llega la boca de la ballena, moviendose por todo el stage.
     El centro de la ballena esta limitado a un rango (mismo clamp que
     moveWhale); la boca esta corrida de ese centro (MOUTH_X/MOUTH_Y) y el
     mordisco todavia suma un margen (BITE_RADIUS). Cualquier punto fuera
     de este rectangulo es, directamente, imposible de comer. */
  function reach() {
    var stageRect = stage.getBoundingClientRect();
    var whaleRect = whale.getBoundingClientRect();
    var w = whaleRect.width;
    var h = whaleRect.height;
    var bite = w * BITE_RADIUS;

    return {
      minX: stageRect.left + w * MOUTH_X - bite,
      maxX: stageRect.right - w * (1 - MOUTH_X) + bite,
      minY: stageRect.top + h * MOUTH_Y - bite,
      maxY: stageRect.bottom - h * (1 - MOUTH_Y) + bite
    };
  }

  /* Elige un lugar nuevo para que el item recien comido reaparezca: dentro
     del stage, lejos de la boca (para no reubicarlo justo donde ya lo
     comieron) y siempre alcanzable por la ballena. */
  function respawn(el) {
    var stageRect = stage.getBoundingClientRect();
    var rect = el.getBoundingClientRect();
    var offset = foodOffsets.get(el);
    var baseX = rect.left + rect.width / 2 - offset.x;
    var baseY = rect.top + rect.height / 2 - offset.y;

    var r = reach();
    var minX = Math.max(stageRect.left + rect.width / 2 + SPAWN_MARGIN, r.minX);
    var maxX = Math.min(stageRect.right - rect.width / 2 - SPAWN_MARGIN, r.maxX);
    var minY = Math.max(stageRect.top + rect.height / 2 + SPAWN_MARGIN, r.minY);
    var maxY = Math.min(stageRect.bottom - rect.height / 2 - SPAWN_MARGIN, r.maxY);

    /* Si el alcance es mas chico que el margen (pantalla muy angosta), que
       no rompa: usar el rango del stage entero como respaldo. */
    if (minX > maxX) {
      minX = stageRect.left + rect.width / 2 + SPAWN_MARGIN;
      maxX = stageRect.right - rect.width / 2 - SPAWN_MARGIN;
    }
    if (minY > maxY) {
      minY = stageRect.top + rect.height / 2 + SPAWN_MARGIN;
      maxY = stageRect.bottom - rect.height / 2 - SPAWN_MARGIN;
    }

    var m = mouthPoint();
    var target = { x: baseX, y: baseY };
    var tries = 0;
    do {
      target.x = minX + Math.random() * Math.max(maxX - minX, 0);
      target.y = minY + Math.random() * Math.max(maxY - minY, 0);
      tries++;
    } while (tries < 8 && Math.hypot(target.x - m.x, target.y - m.y) < rect.width * 1.5);

    offset.x = target.x - baseX;
    offset.y = target.y - baseY;
    applyFood(el);
  }

  function checkCollisions() {
    var m = mouthPoint();
    foods.forEach(function (el) {
      if (el.classList.contains("is-eaten") || el.classList.contains("is-hidden")) return;
      var c = center(el);
      if (Math.hypot(c.x - m.x, c.y - m.y) <= m.size * BITE_RADIUS) {
        bumpCount(el);
        window.mobyFeed.eat(el, function () { respawn(el); });
      }
    });
  }

  function step(ts) {
    frame = requestAnimationFrame(step);
    if (frozen) return;

    var dt = last ? (ts - last) / 1000 : 0;
    last = ts;

    var dx = (keys.ArrowRight ? 1 : 0) - (keys.ArrowLeft ? 1 : 0);
    var dy = (keys.ArrowDown ? 1 : 0) - (keys.ArrowUp ? 1 : 0);

    if (dx || dy) {
      var len = Math.hypot(dx, dy) || 1;
      moveWhale((dx / len) * SPEED * dt, (dy / len) * SPEED * dt);
    } else if (touchTarget) {
      var c = center(whale);
      var tx = touchTarget.x - c.x;
      var ty = touchTarget.y - c.y;
      var dist = Math.hypot(tx, ty);
      if (dist > 4) {
        var reach = Math.min(SPEED * dt, dist);
        moveWhale((tx / dist) * reach, (ty / dist) * reach);
      }
    }

    checkCollisions();
  }

  window.addEventListener("resize", function () { moveWhale(0, 0); });

  /* El loop corre siempre: hace falta para detectar colisiones aunque la
     ballena este quieta (p. ej. un item que reaparece debajo suyo). */
  frame = requestAnimationFrame(step);
})();
