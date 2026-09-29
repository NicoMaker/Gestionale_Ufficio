/**
 * Theme — tema chiaro/scuro. Rispetta la preferenza di sistema finché
 * l'utente non sceglie manualmente; la scelta viene ricordata.
 * (L'attributo data-theme è impostato subito in <head> per evitare il flash.)
 */
const Theme = (() => {
  const KEY = "gestionale-theme";
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = () => {
    try {
      return localStorage.getItem(KEY);
    } catch (_) {
      return null;
    }
  };

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    const btn = document.getElementById("theme-toggle");
    if (btn) {
      btn.innerHTML = Icons.html(theme === "dark" ? "sun" : "moon");
      btn.setAttribute(
        "aria-label",
        theme === "dark" ? "Passa al tema chiaro" : "Passa al tema scuro",
      );
    }
  }

  function init() {
    apply(
      document.documentElement.dataset.theme ||
        (media.matches ? "dark" : "light"),
    );
    document.getElementById("theme-toggle")?.addEventListener("click", () => {
      const next =
        document.documentElement.dataset.theme === "dark" ? "light" : "dark";
      try {
        localStorage.setItem(KEY, next);
      } catch (_) {
        /* storage non disponibile */
      }
      apply(next);
    });
    media.addEventListener("change", (e) => {
      if (!stored()) apply(e.matches ? "dark" : "light");
    });
  }

  return { init };
})();

(function () {
  try {
    var t = localStorage.getItem("gestionale-theme");
    if (!t)
      t = matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
    document.documentElement.dataset.theme = t;
  } catch (e) {}
})();
