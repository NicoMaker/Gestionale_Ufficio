/**
 * Sidebar — costruisce il menu di navigazione raggruppato per modulo,
 * a partire dai GROUPS e dalle TABLES ricevute da /api/_meta.
 */
const Sidebar = (() => {
  let navEl = null;
  let onNavigate = null;

  function init({ groups, tables }, navigateCallback) {
    navEl = document.getElementById("sidebar-nav");
    onNavigate = navigateCallback;
    render(groups, tables);
    wireToggle();
    refreshTrashCount();
  }

  // Aggiorna il contatore del cestino accanto alla voce di menu
  async function refreshTrashCount() {
    const badge = navEl && navEl.querySelector("#trash-count");
    if (!badge) return;
    try {
      const { total } = await API.trashCount();
      badge.textContent = total;
      badge.style.display = total > 0 ? "" : "none";
    } catch (_) {
      badge.style.display = "none";
    }
  }

  function render(groups, tables) {
    navEl.innerHTML = "";

    // Filtro rapido delle voci di menu
    const filter = document.createElement("div");
    filter.className = "nav-filter";
    filter.innerHTML =
      '<input type="search" placeholder="Filtra sezioni…" aria-label="Filtra sezioni" />';
    filter.querySelector("input").addEventListener("input", (e) => {
      const q = e.target.value.trim().toLowerCase();
      navEl.querySelectorAll(".nav-item[data-group]").forEach((el) => {
        el.classList.toggle(
          "is-hidden",
          q !== "" && !el.textContent.toLowerCase().includes(q),
        );
      });
    });
    navEl.appendChild(filter);

    // Voce Dashboard sempre in cima
    const dashItem = document.createElement("button");
    dashItem.className = "nav-item";
    dashItem.dataset.route = "dashboard";
    dashItem.innerHTML = `<span class="nav-icon">${Icons.html("dashboard")}</span><span>Dashboard</span>`;
    dashItem.addEventListener("click", () => onNavigate("dashboard"));
    navEl.appendChild(dashItem);

    groups.forEach((group) => {
      const groupTables = tables.filter((t) => t.group === group.id);
      if (groupTables.length === 0) return;

      const title = document.createElement("div");
      title.className = "nav-group-title";
      title.innerHTML = `<span class="nav-group-icon">${Icons.html(group.icon)}</span><span>${group.label}</span>`;
      title.addEventListener("click", () => {
        const collapsed = title.classList.toggle("collapsed");
        navEl
          .querySelectorAll(`.nav-item[data-group="${group.id}"]`)
          .forEach((el) => el.classList.toggle("is-hidden", collapsed));
      });
      navEl.appendChild(title);

      groupTables.forEach((table) => {
        const item = document.createElement("button");
        item.className = "nav-item";
        item.dataset.route = table.name;
        item.dataset.group = group.id;
        item.innerHTML = `<span class="nav-dot"></span><span>${table.label}</span>`;
        item.addEventListener("click", () => onNavigate(table.name));
        navEl.appendChild(item);
      });
    });

    renderTrashItem();
  }

  function renderTrashItem() {
    const title = document.createElement("div");
    title.className = "nav-group-title";
    title.innerHTML = `<span class="nav-group-icon">${Icons.html("trash")}</span><span>Cestino</span>`;
    navEl.appendChild(title);

    const item = document.createElement("button");
    item.className = "nav-item";
    item.dataset.route = "cestino";
    item.innerHTML = `<span class="nav-icon">${Icons.html("restore")}</span><span>Elementi eliminati</span><span id="trash-count" class="nav-badge" style="display:none">0</span>`;
    item.addEventListener("click", () => onNavigate("cestino"));
    navEl.appendChild(item);
  }

  function setActive(routeName) {
    navEl.querySelectorAll(".nav-item").forEach((el) => {
      el.classList.toggle("active", el.dataset.route === routeName);
    });
  }

  function wireToggle() {
    const sidebar = document.getElementById("sidebar");
    const toggle = document.getElementById("menu-toggle");
    toggle.addEventListener("click", () => sidebar.classList.toggle("open"));
    navEl.addEventListener("click", () => sidebar.classList.remove("open"));
  }

  return { init, setActive, refreshTrashCount };
})();
