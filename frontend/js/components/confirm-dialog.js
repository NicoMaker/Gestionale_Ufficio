/**
 * ConfirmDialog — sostituisce window.confirm con un <dialog> nativo,
 * accessibile (focus trap, Esc) e coerente con il tema dell'app.
 * Uso: const ok = await ConfirmDialog.ask({ title, message });
 */
const ConfirmDialog = (() => {
  function ask({
    title = "Conferma",
    message = "",
    confirmLabel = "Elimina",
    danger = true,
  } = {}) {
    return new Promise((resolve) => {
      const dlg = document.createElement("dialog");
      dlg.className = "confirm-dialog";
      dlg.innerHTML = `
        <h3></h3>
        <p></p>
        <div class="confirm-actions">
          <button type="button" class="btn" value="cancel" autofocus>Annulla</button>
          <button type="button" class="btn ${danger ? "btn-danger-solid" : "btn-primary"}" value="ok"></button>
        </div>`;
      dlg.querySelector("h3").textContent = title;
      dlg.querySelector("p").textContent = message;
      dlg.querySelector('[value="ok"]').textContent = confirmLabel;

      dlg
        .querySelectorAll("button")
        .forEach((b) => b.addEventListener("click", () => dlg.close(b.value)));
      dlg.addEventListener("click", (e) => {
        if (e.target === dlg) dlg.close("cancel"); // click sul backdrop
      });
      dlg.addEventListener("close", () => {
        resolve(dlg.returnValue === "ok");
        dlg.remove();
      });

      document.body.appendChild(dlg);
      dlg.showModal();
    });
  }

  return { ask };
})();
