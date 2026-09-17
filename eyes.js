/* Los ojos de la ballena siguen el cursor.
   Cada ojo se desplaza dentro de un radio chico alrededor de la posicion
   que tiene en el diseno de Figma, asi nunca se sale de la cara. */
(function () {
  "use strict";

  var whale = document.querySelector(".whale");
  var eyes = Array.prototype.slice.call(document.querySelectorAll(".whale__eye"));
  if (!whale || !eyes.length) return;

  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");
  if (reduced.matches) return;

  /* Radios de desplazamiento y alcance, proporcionales al tamano de la
     ballena para que se comporte igual en cualquier viewport. */
  var MAX_X = 0.011;
  var MAX_Y = 0.009;
  var REACH = 0.35;

  var bases = [];
  var pointer = null;
  var frame = 0;

  /* offsetLeft/offsetTop dan la posicion de layout, sin el transform que
     nosotros mismos aplicamos: medir el rect vivo se retroalimentaria. */
  function measure() {
    var rect = whale.getBoundingClientRect();
    bases = eyes.map(function (eye) {
      return { x: rect.left + eye.offsetLeft, y: rect.top + eye.offsetTop };
    });
    bases.width = rect.width;
  }

  function apply() {
    frame = 0;
    if (!bases.length) return;

    var maxX = bases.width * MAX_X;
    var maxY = bases.width * MAX_Y;
    var reach = bases.width * REACH;

    eyes.forEach(function (eye, i) {
      var x = 0;
      var y = 0;

      if (pointer) {
        var dx = pointer.x - bases[i].x;
        var dy = pointer.y - bases[i].y;
        var dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0.5) {
          var pull = Math.min(dist / reach, 1);
          x = (dx / dist) * maxX * pull;
          y = (dy / dist) * maxY * pull;
        }
      }

      eye.style.setProperty("--eye-x", x.toFixed(2) + "px");
      eye.style.setProperty("--eye-y", y.toFixed(2) + "px");
    });
  }

  function schedule() {
    if (!frame) frame = requestAnimationFrame(apply);
  }

  function onMove(event) {
    pointer = { x: event.clientX, y: event.clientY };
    schedule();
  }

  function recenter() {
    pointer = null;
    schedule();
  }

  window.addEventListener("pointermove", onMove, { passive: true });
  window.addEventListener("pointerdown", onMove, { passive: true });
  document.addEventListener("pointerleave", recenter);
  window.addEventListener("blur", recenter);

  window.addEventListener("resize", function () {
    measure();
    schedule();
  });

  reduced.addEventListener("change", function (e) {
    if (e.matches) recenter();
  });

  measure();
  /* La ballena es un PNG: hasta que carga, el layout puede moverse. */
  window.addEventListener("load", measure);
})();
