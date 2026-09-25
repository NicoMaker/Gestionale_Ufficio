/**
 * API — piccolo livello di accesso alle API REST del backend.
 * Tutte le funzioni ritornano Promise e lanciano un errore con messaggio
 * leggibile in caso di risposta non-ok.
 */
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

    list: (table, { page = 1, limit = 25, q = "" } = {}) => {
      const params = new URLSearchParams({ page, limit, q });
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

    remove: (table, id) => request(`/api/${table}/${id}`, { method: "DELETE" }),
  };
})();
