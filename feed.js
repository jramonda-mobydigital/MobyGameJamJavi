/* Anima que un item sea comido por la ballena: se achica y se desvanece
   en el lugar donde lo toco, con un gesto de boca. Lo dispara
   movement.js cuando detecta que la ballena choco contra un item (la
   medialuna, el cafe o el logo). */
(function () {
  "use strict";

  function mouthCue(action) {
    var api = window.mobyMouth;
    if (!api) return;
    if (action === "gulp") api.gulp();
    else api.open(action);
  }

  window.mobyFeed = {
    /* onHidden se llama mientras el item ya esta invisible (is-hidden):
       es el momento de reubicarlo sin que se note el salto. */
    eat: function (el, onHidden) {
      if (el.classList.contains("is-eaten") || el.classList.contains("is-hidden")) return;

      mouthCue(0.8);
      el.classList.add("is-eaten");

      window.setTimeout(function () { mouthCue("gulp"); }, 240);

      window.setTimeout(function () {
        el.classList.remove("is-eaten");
        el.classList.add("is-hidden");
        if (onHidden) onHidden();

        window.setTimeout(function () {
          el.classList.remove("is-hidden");
        }, 60);
      }, 420);
    }
  };
})();
