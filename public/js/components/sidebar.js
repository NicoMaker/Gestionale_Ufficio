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
  }

  function render(groups, tables) {
    navEl.innerHTML = "";

    // Voce Dashboard sempre in cima
    const dashItem = document.createElement("button");
    dashItem.className = "nav-item";
    dashItem.dataset.route = "dashboard";
    dashItem.innerHTML = '<span class="nav-dot"></span><span>Dashboard</span>';
    dashItem.addEventListener("click", () => onNavigate("dashboard"));
    navEl.appendChild(dashItem);

    groups.forEach((group) => {
      const groupTables = tables.filter((t) => t.group === group.id);
      if (groupTables.length === 0) return;

      const title = document.createElement("div");
      title.className = "nav-group-title";
      title.textContent = group.label;
      navEl.appendChild(title);

      groupTables.forEach((table) => {
        const item = document.createElement("button");
        item.className = "nav-item";
        item.dataset.route = table.name;
        item.innerHTML = `<span class="nav-dot"></span><span>${table.label}</span>`;
        item.addEventListener("click", () => onNavigate(table.name));
        navEl.appendChild(item);
      });
    });
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

  return { init, setActive };
})();
