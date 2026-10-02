/**
 * CommandPalette — ricerca rapida di sezioni (Ctrl/⌘ + K).
 * Frecce per scorrere, Invio per aprire, Esc per chiudere.
 */
const CommandPalette = (() => {
  let overlay,
    input,
    list,
    items = [],
    shown = [],
    idx = 0,
    onNavigate;

  function init(meta, navigate) {
    onNavigate = navigate;
    items = [
      { route: "dashboard", label: "Dashboard", hint: "Panoramica" },
      ...meta.tables.map((t) => ({
        route: t.name,
        label: t.label,
        hint: meta.groups.find((g) => g.id === t.group)?.label || "",
      })),
      { route: "cestino", label: "Cestino", hint: "Elementi eliminati" },
    ];
    overlay = document.createElement("div");
    overlay.className = "cmdk-overlay";
    overlay.hidden = true;
    overlay.innerHTML = `
      <div class="cmdk" role="dialog" aria-label="Vai a…">
        <div class="cmdk-head">${Icons.html("search")}<input placeholder="Vai a una sezione…" /><kbd>Esc</kbd></div>
        <ul class="cmdk-list"></ul>
        <div class="cmdk-foot"><span><kbd>↑</kbd><kbd>↓</kbd> naviga</span><span><kbd>↵</kbd> apri</span></div>
      </div>`;
    document.body.appendChild(overlay);
    input = overlay.querySelector("input");
    list = overlay.querySelector("ul");

    overlay.addEventListener(
      "mousedown",
      (e) => e.target === overlay && close(),
    );
    input.addEventListener("input", () => filter(input.value));
    input.addEventListener("keydown", (e) => {
      if (e.key === "ArrowDown") move(1, e);
      else if (e.key === "ArrowUp") move(-1, e);
      else if (e.key === "Enter" && shown[idx]) go(shown[idx].route);
      else if (e.key === "Escape") close();
    });
    document.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        overlay.hidden ? open() : close();
      }
    });
    document.getElementById("cmdk-trigger")?.addEventListener("click", open);
  }

  function move(d, e) {
    e.preventDefault();
    idx = (idx + d + shown.length) % shown.length;
    paint();
  }
  function filter(q) {
    q = q.trim().toLowerCase();
    shown = items
      .filter((i) => !q || (i.label + " " + i.hint).toLowerCase().includes(q))
      .slice(0, 12);
    idx = 0;
    paint();
  }
  function paint() {
    list.innerHTML = shown.length
      ? shown
          .map(
            (i, n) =>
              `<li class="${n === idx ? "on" : ""}" data-n="${n}"><span>${i.label}</span><small>${i.hint}</small></li>`,
          )
          .join("")
      : '<li class="none">Nessun risultato</li>';
    list.querySelector(".on")?.scrollIntoView({ block: "nearest" });
    list
      .querySelectorAll("li[data-n]")
      .forEach((li) =>
        li.addEventListener("click", () => go(shown[li.dataset.n].route)),
      );
  }
  function go(route) {
    close();
    onNavigate(route);
  }
  function open() {
    overlay.hidden = false;
    input.value = "";
    filter("");
    input.focus();
  }
  function close() {
    overlay.hidden = true;
  }

  return { init };
})();
