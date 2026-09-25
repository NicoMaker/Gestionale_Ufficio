/**
 * App — punto di ingresso del frontend. Carica lo schema dal backend,
 * inizializza la sidebar e gestisce il routing (via hash URL) tra
 * dashboard e viste tabellari.
 */
(function App() {
  const titleEl = document.getElementById("view-title");
  const subtitleEl = document.getElementById("view-subtitle");

  let meta = null; // { groups, tables }

  async function start() {
    try {
      meta = await API.getMeta();
    } catch (err) {
      document.getElementById("view-content").innerHTML =
        `<div class="empty-state"><div class="empty-title">Impossibile contattare il server</div>${err.message}</div>`;
      return;
    }

    Sidebar.init(meta, navigate);

    window.addEventListener("hashchange", () =>
      navigate(routeFromHash(), false),
    );
    navigate(routeFromHash(), false);
  }

  function routeFromHash() {
    const hash = window.location.hash.replace("#", "").trim();
    return hash || "dashboard";
  }

  async function navigate(route, updateHash = true) {
    if (updateHash) window.location.hash = route;
    Sidebar.setActive(route);

    if (route === "dashboard") {
      titleEl.textContent = "Dashboard";
      subtitleEl.textContent = "Panoramica generale del gestionale";
      Dashboard.render(meta, navigate);
      return;
    }

    const table = meta.tables.find((t) => t.name === route);
    if (!table) {
      titleEl.textContent = "Non trovato";
      subtitleEl.textContent = "";
      document.getElementById("view-content").innerHTML =
        '<div class="empty-state"><div class="empty-title">Sezione non trovata</div></div>';
      return;
    }

    titleEl.textContent = table.label;
    const groupLabel =
      meta.groups.find((g) => g.id === table.group)?.label || "";
    subtitleEl.textContent = groupLabel;
    TableView.render(table);
  }

  start();
})();
