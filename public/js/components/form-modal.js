/**
 * FormModal — genera un form (creazione/modifica) a partire dai campi
 * definiti nello schema di una tabella, incluse le select dinamiche
 * per i campi di tipo "fk".
 */
const FormModal = (() => {
  const root = document.getElementById("modal-root");

  async function open({ table, record, onSaved }) {
    const isEdit = Boolean(record && record.id);
    root.innerHTML = renderShell(table, isEdit);

    const overlay = root.querySelector(".modal-overlay");
    const form = root.querySelector("form");
    const closeBtn = root.querySelector('[data-action="close"]');
    const cancelBtn = root.querySelector('[data-action="cancel"]');

    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) close();
    });
    closeBtn.addEventListener("click", close);
    cancelBtn.addEventListener("click", close);
    document.addEventListener("keydown", escListener);

    // Popola le select dei campi FK con le opzioni reali
    await Promise.all(
      table.fields
        .filter((f) => f.type === "fk")
        .map((f) => populateFkOptions(form, f, record)),
    );

    if (record) fillForm(form, table, record);

    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      await handleSubmit({ form, table, isEdit, record, onSaved });
    });

    form.querySelector("input, select, textarea")?.focus();
  }

  function close() {
    root.innerHTML = "";
    document.removeEventListener("keydown", escListener);
  }

  function escListener(e) {
    if (e.key === "Escape") close();
  }

  function renderShell(table, isEdit) {
    return `
      <div class="modal-overlay">
        <div class="modal-card" role="dialog" aria-modal="true" aria-label="${isEdit ? "Modifica" : "Nuovo"} ${table.label}">
          <div class="modal-header">
            <h2>${isEdit ? "Modifica" : "Nuovo"} — ${table.label}</h2>
            <button type="button" class="btn btn-ghost" data-action="close" aria-label="Chiudi">✕</button>
          </div>
          <form novalidate>
            <div class="modal-body">
              ${table.fields.map(renderField).join("")}
            </div>
            <div class="modal-footer">
              <button type="button" class="btn" data-action="cancel">Annulla</button>
              <button type="submit" class="btn btn-primary">Salva</button>
            </div>
          </form>
        </div>
      </div>
    `;
  }

  function renderField(field) {
    const req = field.required ? '<span class="required-mark"> *</span>' : "";
    const reqAttr = field.required ? "required" : "";

    if (field.type === "textarea") {
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}${req}</label>
          <textarea id="f_${field.name}" name="${field.name}" ${reqAttr}></textarea>
        </div>`;
    }

    if (field.type === "boolean") {
      return `
        <div class="field field-checkbox">
          <input type="checkbox" id="f_${field.name}" name="${field.name}" />
          <label for="f_${field.name}">${field.label}</label>
        </div>`;
    }

    if (field.type === "select") {
      const opts = field.options
        .map((o) => `<option value="${o}">${o}</option>`)
        .join("");
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}${req}</label>
          <select id="f_${field.name}" name="${field.name}" ${reqAttr}>
            <option value="">— seleziona —</option>
            ${opts}
          </select>
        </div>`;
    }

    if (field.type === "fk") {
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}${req}</label>
          <select id="f_${field.name}" name="${field.name}" ${reqAttr}>
            <option value="">— seleziona —</option>
          </select>
        </div>`;
    }

    if (field.type === "date") {
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}${req}</label>
          <input type="date" id="f_${field.name}" name="${field.name}" ${reqAttr} />
        </div>`;
    }

    if (field.type === "datetime") {
      // gestito automaticamente lato server/valore corrente: sola lettura nel form
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}</label>
          <input type="text" id="f_${field.name}" name="${field.name}" placeholder="Impostato automaticamente" />
        </div>`;
    }

    if (field.type === "number") {
      return `
        <div class="field">
          <label for="f_${field.name}">${field.label}${req}</label>
          <input type="number" step="any" id="f_${field.name}" name="${field.name}" ${reqAttr} />
        </div>`;
    }

    // text (default)
    return `
      <div class="field">
        <label for="f_${field.name}">${field.label}${req}</label>
        <input type="text" id="f_${field.name}" name="${field.name}" ${reqAttr} />
      </div>`;
  }

  async function populateFkOptions(form, field, record) {
    const select = form.querySelector(`[name="${field.name}"]`);
    try {
      const options = await API.options(field.fk);
      options.forEach((opt) => {
        const el = document.createElement("option");
        el.value = opt.id;
        el.textContent = opt.label ?? `#${opt.id}`;
        select.appendChild(el);
      });
      if (record && record[field.name] != null) {
        select.value = record[field.name];
      }
    } catch (err) {
      Toast.error(`Impossibile caricare le opzioni per "${field.label}"`);
    }
  }

  function fillForm(form, table, record) {
    table.fields.forEach((field) => {
      const el = form.querySelector(`[name="${field.name}"]`);
      if (!el) return;
      const value = record[field.name];
      if (field.type === "boolean") {
        el.checked = Boolean(value);
      } else if (value != null) {
        el.value = value;
      }
    });
  }

  function collectData(form, table) {
    const data = {};
    table.fields.forEach((field) => {
      const el = form.querySelector(`[name="${field.name}"]`);
      if (!el) return;
      if (field.type === "boolean") {
        data[field.name] = el.checked ? 1 : 0;
      } else {
        data[field.name] = el.value;
      }
    });
    return data;
  }

  async function handleSubmit({ form, table, isEdit, record, onSaved }) {
    const submitBtn = form.querySelector('button[type="submit"]');
    submitBtn.disabled = true;
    submitBtn.textContent = "Salvataggio…";

    try {
      const data = collectData(form, table);
      if (isEdit) {
        await API.update(table.name, record.id, data);
        Toast.success("Record aggiornato");
      } else {
        await API.create(table.name, data);
        Toast.success("Record creato");
      }
      close();
      onSaved && onSaved();
    } catch (err) {
      Toast.error(err.message || "Errore durante il salvataggio");
      submitBtn.disabled = false;
      submitBtn.textContent = "Salva";
    }
  }

  return { open, close };
})();
