/**
 * API — piccolo livello di accesso alle API REST del backend.
 * Tutte le funzioni ritornano Promise e lanciano un errore con messaggio
 * leggibile in caso di risposta non-ok.
 */
// Configurazione condivisa (valorizzata da app.js a partire da /api/_meta)
const AppConfig = { retentionDays: 15 };

const API = (() => {
  async function request(url, options = {}) {
    const res = await fetch(url, {
      headers: { "Content-Type": "application/json" },
      ...options,
    });
    let body = null;
    try {
      body = await res.json();
    } catch (_) {
      /* risposta vuota */
    }
    if (!res.ok) {
      const message = (body && body.error) || `Errore ${res.status}`;
      throw new Error(message);
    }
    return body;
  }

  return {
    getMeta: () => request("/api/_meta"),

    list: (
      table,
      { page = 1, limit = 25, q = "", sort = "", dir = "" } = {},
    ) => {
      const params = new URLSearchParams({ page, limit, q });
      if (sort) {
        params.set("sort", sort);
        params.set("dir", dir);
      }
      return request(`/api/${table}?${params.toString()}`);
    },

    options: (table) => request(`/api/${table}/options`),

    get: (table, id) => request(`/api/${table}/${id}`),

    create: (table, data) =>
      request(`/api/${table}`, {
        method: "POST",
        body: JSON.stringify(data),
      }),

    update: (table, id, data) =>
      request(`/api/${table}/${id}`, {
        method: "PUT",
        body: JSON.stringify(data),
      }),

    // Sposta il record nel cestino (bloccato con 409 se ha record collegati)
    remove: (table, id) => request(`/api/${table}/${id}`, { method: "DELETE" }),

    // Record che referenziano questo record: { total, links: [...] }
    links: (table, id) => request(`/api/${table}/${id}/links`),

    // ------------------------------ CESTINO ------------------------------
    trashList: ({ page = 1, limit = 25, q = "", table = "" } = {}) => {
      const params = new URLSearchParams({ page, limit, q, table });
      return request(`/api/cestino?${params.toString()}`);
    },
    trashCount: () => request("/api/cestino/count"),
    trashRestore: (id) =>
      request(`/api/cestino/${id}/restore`, { method: "POST" }),
    trashRestoreAll: () =>
      request("/api/cestino/restore-all", { method: "POST" }),
    trashDelete: (id) => request(`/api/cestino/${id}`, { method: "DELETE" }),
    trashEmpty: () => request("/api/cestino", { method: "DELETE" }),
  };
})();
