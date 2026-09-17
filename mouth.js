/* Boca de la ballena.
   Abre desde la linea que separa el celeste del crema: esa frontera es la
   mandibula real del dibujo, y la sonrisa es solo una marca encima de ella
   (queda tapada apenas la boca se abre). La cavidad cuelga de esa linea y
   se cierra exactamente sobre sus dos extremos, asi el trazo del dibujo
   sigue siendo continuo cuando la boca esta cerrada.

   JAW es el borde inferior de esa frontera, extraido pixel a pixel del PNG
   y expresado en el sistema de la caja de la ballena (432 x 408). */
(function () {
  "use strict";

  var JAW = [
    [256.1,163.4],[259.2,165.4],[262.4,167.0],[265.6,168.5],[268.7,169.8],
    [271.9,170.9],[275.1,171.9],[278.2,172.7],[281.4,173.4],[284.6,174.0],
    [287.7,174.5],[290.9,174.8],[294.0,175.2],[297.2,175.4],[300.4,175.5],
    [303.5,175.5],[306.7,175.5],[309.9,175.4],[313.0,175.2],[316.2,174.8],
    [319.4,174.2],[322.5,173.4],[325.7,172.3],[328.9,171.0],[332.0,169.5],
    [335.2,167.8],[338.3,165.2]
  ];

  var DEPTH = 42;     /* caida maxima de la mandibula, en unidades de la caja */
  var PEAK = 0.46;    /* donde cae mas la mandibula (0 = comisura izq) */
  var WOBBLE = 0.09;  /* irregularidad del borde: evita la curva perfecta */
  var STRETCH = 0.085;/* cuanto se alarga el cuerpo con la boca abierta */
  var SMOOTH = 0.22;  /* suavizado exponencial por cuadro */

  var body = document.querySelector(".whale__body");
  var cavity = document.querySelector(".whale__cavity");
  var clip = document.querySelector("#moby-mouth-clip path");
  var tongue = document.querySelector(".whale__tongue");
  if (!body || !cavity || !clip || !tongue) return;

  var X0 = JAW[0][0];
  var X1 = JAW[JAW.length - 1][0];
  var SPAN = X1 - X0;
  var reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  var current = 0;
  var target = 0;
  var frame = 0;

  /* La mandibula no baja nada en las comisuras, asi la cavidad cierra
     exactamente sobre los extremos del trazo original. El pico corrido y
     la ondulacion le sacan la perfeccion geometrica: sin eso el borde
     inferior delata que la boca es un agregado y no parte del dibujo. */
  var SKEW = Math.log(PEAK) / Math.log(0.5);

  function bulge(t) {
    if (t <= 0 || t >= 1) return 0;
    var b = Math.pow(Math.sin(Math.PI * Math.pow(t, SKEW)), 0.75);
    return b * (1 + WOBBLE * Math.sin(t * 9.1 + 1.3) * b);
  }

  function jawY(point, k) {
    return point[1] + k * DEPTH * bulge((point[0] - X0) / SPAN);
  }

  function pathFor(k) {
    var d = "M" + JAW[0][0] + " " + JAW[0][1];
    var i;
    for (i = 1; i < JAW.length; i++) {
      d += "L" + JAW[i][0] + " " + JAW[i][1];
    }
    for (i = JAW.length - 1; i >= 0; i--) {
      d += "L" + JAW[i][0] + " " + jawY(JAW[i], k).toFixed(2);
    }
    return d + "Z";
  }

  function render(value) {
    var k = Math.max(value, 0); /* la boca no se abre "hacia adentro" */
    var d = pathFor(k);
    cavity.setAttribute("d", d);
    clip.setAttribute("d", d);

    /* Lengua: apoyada contra el fondo de la cavidad, recortada por ella */
    var base = JAW[Math.round(JAW.length * PEAK)];
    tongue.setAttribute("cx", (X0 + SPAN * PEAK).toFixed(2));
    tongue.setAttribute("cy", (base[1] + k * DEPTH * 0.8).toFixed(2));
    tongue.setAttribute("rx", (SPAN * 0.25).toFixed(2));
    tongue.setAttribute("ry", Math.max(k * DEPTH * 0.3, 0.01).toFixed(2));

    /* El cuerpo acompana: se estira a lo alto y se afina, con el origen
       arriba, como si solo cayera la mandibula. `value` puede ser negativo
       en el trago final, y ahi el cuerpo se comprime un poco. */
    if (reduced.matches) {
      body.style.transform = "";
    } else {
      body.style.transform =
        "scale(" + (1 - STRETCH * 0.75 * value).toFixed(4) +
        "," + (1 + STRETCH * value).toFixed(4) + ")";
    }
  }

  function tick() {
    frame = 0;
    current += (target - current) * SMOOTH;
    if (Math.abs(target - current) < 0.002) current = target;
    render(current);
    if (current !== target) frame = requestAnimationFrame(tick);
  }

  function open(value) {
    target = value;
    if (reduced.matches) {
      current = target;
      render(current);
      return;
    }
    if (!frame) frame = requestAnimationFrame(tick);
  }

  render(0);

  window.mobyMouth = {
    open: open,
    /* Cierre con un traguito: pasa por debajo de cero y vuelve */
    gulp: function () {
      open(-0.12);
      window.setTimeout(function () { open(0); }, 220);
    },
    /* Centro de la cavidad, para que el croissant entre ahi y no al labio */
    centerFraction: function () {
      var base = JAW[Math.round(JAW.length * PEAK)];
      return { x: (X0 + SPAN * PEAK) / 432, y: (base[1] + DEPTH * 0.5) / 408 };
    }
  };
})();
