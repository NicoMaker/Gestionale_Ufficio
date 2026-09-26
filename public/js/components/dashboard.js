/**
 * Dashboard — schermata iniziale con conteggio record delle tabelle
 * principali e accesso rapido a tutti i moduli, raggruppati.
 */
const Dashboard = (() => {
  const content = document.getElementById("view-content");
  const searchInput = document.getElementById("search-input");
  const btnNew = document.getElementById("btn-new");

  // Tabelle "chiave" mostrate come contatore in evidenza
  const HIGHLIGHT_TABLES = [
    "clienti",
    "fornitori",
    "prodotti",
    "ordini_vendita",
  ];

  const STAT_ICONS = {
    clienti: "users",
    fornitori: "shopping-cart",
    prodotti: "box",
    ordini_vendita: "trending-up",
  };

  async function render({ groups, tables }, navigate) {
    searchInput.style.display = "none";
    btnNew.style.display = "none";

    content.innerHTML = `
      <div class="stats-grid" id="stats-grid"></div>
      <div class="groups-grid" id="groups-grid"></div>
    `;

    renderGroups(groups, tables, navigate);
    loadStats(tables);
  }

  function renderGroups(groups, tables, navigate) {
    const grid = document.getElementById("groups-grid");
    grid.innerHTML = groups
      .map((group) => {
        const groupTables = tables.filter((t) => t.group === group.id);
        if (groupTables.length === 0) return "";
        return `
        <div class="group-card">
          <h3><span class="group-card-icon">${Icons.html(group.icon)}</span>${group.label}</h3>
          <ul>
            ${groupTables.map((t) => `<li><a href="#" data-route="${t.name}">${t.label}</a></li>`).join("")}
          </ul>
        </div>`;
      })
      .join("");

    grid.querySelectorAll("a[data-route]").forEach((a) => {
      a.addEventListener("click", (e) => {
        e.preventDefault();
        navigate(a.dataset.route);
      });
    });
  }

  async function loadStats(tables) {
    const statsGrid = document.getElementById("stats-grid");
    const wanted = tables.filter((t) => HIGHLIGHT_TABLES.includes(t.name));

    statsGrid.innerHTML =
      wanted
        .map(
          (t) => `
      <div class="stat-card" data-stat="${t.name}">
        <div class="stat-icon">${Icons.html(STAT_ICONS[t.name])}</div>
        <div class="stat-body">
          <div class="stat-value">…</div>
          <div class="stat-label">${t.label}</div>
        </div>
      </div>`,
        )
        .join("") +
      `
      <div class="stat-card">
        <div class="stat-icon">${Icons.html("layout")}</div>
        <div class="stat-body">
          <div class="stat-value">${tables.length}</div>
          <div class="stat-label">Tabelle nel sistema</div>
        </div>
      </div>`;

    await Promise.all(
      wanted.map(async (t) => {
        try {
          const result = await API.list(t.name, { page: 1, limit: 1 });
          const card = statsGrid.querySelector(
            `[data-stat="${t.name}"] .stat-value`,
          );
          if (card) card.textContent = result.total;
        } catch (_) {
          const card = statsGrid.querySelector(
            `[data-stat="${t.name}"] .stat-value`,
          );
          if (card) card.textContent = "—";
        }
      }),
    );
  }

  return { render };
})();
