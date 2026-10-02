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

    const now = new Date();
    const h = now.getHours();
    const greet = h < 13 ? "Buongiorno" : h < 18 ? "Buon pomeriggio" : "Buonasera";
    const today = now.toLocaleDateString("it-IT", {
      weekday: "long",
      day: "numeric",
      month: "long",
    });

    content.innerHTML = `
      <section class="hero">
        <span class="hero-date">${today}</span>
        <h2>${greet} 👋</h2>
        <p>Tutto il tuo ufficio in un unico posto: anagrafiche, magazzino, vendite, contabilità e molto altro.</p>
        <div class="hero-actions">
          <a href="#clienti">Clienti</a><a href="#prodotti">Prodotti</a><a href="#ordini_vendita">Ordini</a><a href="#fornitori">Fornitori</a>
        </div>
      </section>
      <div class="stats-grid" id="stats-grid"></div>
      <a class="trash-panel" href="#cestino" id="trash-panel" aria-label="Apri il cestino">
        <div class="trash-panel-icon">${Icons.html("trash")}</div>
        <div class="trash-panel-body">
          <h3>Cestino</h3>
          <p class="muted" id="trash-panel-text">Caricamento…</p>
          <div class="trash-panel-chips" id="trash-panel-chips"></div>
        </div>
        <span class="btn btn-primary trash-panel-cta">Apri il cestino${Icons.html("chevron-right")}</span>
      </a>
      <div class="groups-grid" id="groups-grid"></div>
    `;

    renderGroups(groups, tables, navigate);
    loadStats(tables);
    loadTrashPanel(navigate);
  }

  function renderGroups(groups, tables, navigate) {
    const grid = document.getElementById("groups-grid");
    grid.innerHTML = groups
      .map((group) => {
        const groupTables = tables.filter((t) => t.group === group.id);
        if (groupTables.length === 0) return "";
        return `
        <div class="group-card" style="--h:${(groups.indexOf(group) * 47 + 235) % 360}">
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

  // Pannello "Cestino": riepilogo e collegamento diretto alla pagina cestino
  async function loadTrashPanel(navigate) {
    const panel = document.getElementById("trash-panel");
    panel.addEventListener("click", (e) => {
      e.preventDefault();
      navigate("cestino");
    });
    const text = document.getElementById("trash-panel-text");
    const chips = document.getElementById("trash-panel-chips");
    try {
      const s = await API.trashSummary();
      if (s.total === 0) {
        text.textContent = `Il cestino è vuoto. I record eliminati restano qui ${s.retention_days} giorni e si possono ripristinare.`;
        return;
      }
      const next = s.next_expiry
        ? new Date(s.next_expiry).toLocaleDateString("it-IT", {
            day: "2-digit",
            month: "2-digit",
            year: "numeric",
          })
        : "—";
      text.textContent = `${s.total} element${s.total === 1 ? "o" : "i"} in attesa — eliminazione definitiva automatica dopo ${s.retention_days} giorni (prossima: ${next}).`;
      chips.innerHTML = [
        `<span class="badge">${s.restorable} ripristinabili</span>`,
        s.not_restorable
          ? `<span class="badge danger">${s.not_restorable} non ripristinabili</span>`
          : "",
        s.expiring_soon
          ? `<span class="badge warn">${s.expiring_soon} in scadenza (≤ 3 giorni)</span>`
          : "",
        ...s.by_table.map(
          (t) =>
            `<span class="badge neutral">${t.table_label}: ${t.count}</span>`,
        ),
      ].join("");
    } catch (_) {
      text.textContent = "Impossibile leggere lo stato del cestino.";
    }
  }

  function countUp(el, to) {
    const t0 = performance.now();
    const step = (t) => {
      const p = Math.min((t - t0) / 900, 1);
      el.textContent = Math.round(to * (1 - Math.pow(1 - p, 3))).toLocaleString("it-IT");
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
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
          if (card) countUp(card, result.total);
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
