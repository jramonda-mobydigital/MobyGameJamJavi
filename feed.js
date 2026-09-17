/* Agarrar el croissant y darselo a la ballena.
   El croissant se arrastra con el puntero; si se lo suelta cerca de la boca
   la ballena se lo come, y si no vuelve solo a su posicion del diseno. */
(function () {
  "use strict";

  var stage = document.querySelector(".stage");
  var whale = document.querySelector(".whale");
  var croissant = document.querySelector(".croissant");
  if (!stage || !whale || !croissant) return;

  /* Centro de la boca (sobre la frontera celeste/crema), en fracciones
     de la caja de 432 x 408 de la ballena */
  var MOUTH_X = 0.680;
  var MOUTH_Y = 0.430;
  /* Radio de la zona de mordisco, proporcional al ancho de la ballena.
     Da margen de sobra sin que valga soltarlo en cualquier lado. */
  var BITE_RADIUS = 0.34;

  var held = null;   /* { id, grabX, grabY } mientras se arrastra */
  var busy = false;  /* true mientras dura la animacion de comer */

  /* mouth.js es opcional: si no esta, el croissant se sigue pudiendo dar */
  function mouth(action) {
    var api = window.mobyMouth;
    if (!api) return;
    if (action === "gulp") api.gulp();
    else api.open(action);
  }

  function mouthPoint() {
    var r = whale.getBoundingClientRect();
    return { x: r.left + r.width * MOUTH_X, y: r.top + r.height * MOUTH_Y, size: r.width };
  }

  /* Destino del croissant: el fondo de la cavidad, no la linea del labio */
  function throat() {
    var r = whale.getBoundingClientRect();
    var f = window.mobyMouth
      ? window.mobyMouth.centerFraction()
      : { x: MOUTH_X, y: MOUTH_Y };
    return { x: r.left + r.width * f.x, y: r.top + r.height * f.y };
  }

  function center(el) {
    var r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  /* Mueve el croissant colocando su centro en un punto de la pantalla */
  function moveTo(x, y) {
    var s = stage.getBoundingClientRect();
    croissant.style.setProperty("--cr-dx", x - (s.left + s.width / 2) + "px");
    croissant.style.setProperty("--cr-dy", y - (s.top + s.height / 2) + "px");
  }

  function clearPosition() {
    croissant.style.removeProperty("--cr-dx");
    croissant.style.removeProperty("--cr-dy");
  }

  function nearMouth(point) {
    var m = mouthPoint();
    return Math.hypot(point.x - m.x, point.y - m.y) <= m.size * BITE_RADIUS;
  }

  function release() {
    held = null;
    window.removeEventListener("pointermove", onMove);
    window.removeEventListener("pointerup", onUp);
    window.removeEventListener("pointercancel", onCancel);
    croissant.classList.remove("is-held", "is-over-mouth");
  }

  function onDown(event) {
    if (busy || held) return;
    var c = center(croissant);
    held = { id: event.pointerId, grabX: event.clientX - c.x, grabY: event.clientY - c.y };

    croissant.classList.remove("is-returning");
    croissant.classList.add("is-held");

    /* La captura ayuda en touch, pero el arrastre no depende de ella:
       los listeners viven en window para no perder el puntero si se va
       rapido fuera del croissant. */
    try {
      croissant.setPointerCapture(event.pointerId);
    } catch (err) {
      /* sin captura igual funciona */
    }

    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onCancel);
    event.preventDefault();
  }

  function onMove(event) {
    if (!held || event.pointerId !== held.id) return;
    var x = event.clientX - held.grabX;
    var y = event.clientY - held.grabY;
    moveTo(x, y);

    var over = nearMouth({ x: x, y: y });
    if (over !== croissant.classList.contains("is-over-mouth")) {
      croissant.classList.toggle("is-over-mouth", over);
      mouth(over ? 0.4 : 0);
    }
  }

  function onUp(event) {
    if (!held || event.pointerId !== held.id) return;

    var point = { x: event.clientX - held.grabX, y: event.clientY - held.grabY };
    release();

    if (nearMouth(point)) {
      eat();
    } else {
      mouth(0);
      croissant.classList.add("is-returning");
      clearPosition();
    }
  }

  function eat() {
    busy = true;
    mouth(0.8);

    /* El croissant termina de viajar hasta el fondo de la boca abierta */
    var t = throat();
    moveTo(t.x, t.y);
    croissant.classList.add("is-eaten");

    /* Traga recien cuando el croissant ya entro */
    window.setTimeout(function () { mouth("gulp"); }, 240);

    /* Se usan temporizadores y no requestAnimationFrame: rAF se congela en
       pestanas de fondo y dejaria el croissant invisible y sin poder agarrar. */
    window.setTimeout(function () {
      /* Vuelve a su sitio todavia invisible... */
      croissant.classList.remove("is-eaten");
      croissant.classList.add("is-hidden");
      clearPosition();

      /* ...y recien ahi reaparece */
      window.setTimeout(function () {
        croissant.classList.remove("is-hidden");
        busy = false;
      }, 40);
    }, 420);
  }

  function onCancel(event) {
    if (!held || event.pointerId !== held.id) return;
    release();
    mouth(0);
    croissant.classList.add("is-returning");
    clearPosition();
  }

  croissant.addEventListener("pointerdown", onDown);
  croissant.addEventListener("dragstart", function (e) { e.preventDefault(); });

  /* Si cambia el tamano mientras esta suelto, que vuelva a su lugar relativo */
  window.addEventListener("resize", function () {
    if (!held && !busy) clearPosition();
  });
})();
