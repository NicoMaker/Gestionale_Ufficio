/**
 * Icons — set minimale di icone SVG inline (stroke, stile "line icons"),
 * usate da sidebar, dashboard e altri componenti. Nessuna dipendenza
 * esterna: ogni icona e' una stringa SVG pronta da inserire nel DOM.
 */
const Icons = (() => {
  const stroke = (paths, viewBox = "0 0 24 24") => `
    <svg viewBox="${viewBox}" width="18" height="18" fill="none" stroke="currentColor"
         stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
      ${paths}
    </svg>`;

  const SET = {
    dashboard: stroke(
      '<rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/>',
    ),
    users: stroke(
      '<path d="M16 21v-1.5a3.5 3.5 0 0 0-3.5-3.5h-5A3.5 3.5 0 0 0 4 19.5V21"/><circle cx="9" cy="8" r="3.2"/><path d="M20 21v-1.5a3.3 3.3 0 0 0-2.4-3.2"/><path d="M14.5 4.3a3.2 3.2 0 0 1 0 6.1"/>',
    ),
    box: stroke(
      '<path d="M3.5 7.5 12 3l8.5 4.5V16L12 21l-8.5-4.5Z"/><path d="M3.5 7.5 12 12l8.5-4.5"/><path d="M12 12v9"/>',
    ),
    "trending-up": stroke(
      '<path d="M3 17 9.5 10.5 14 15l7-8"/><path d="M16 7h5v5"/>',
    ),
    "shopping-cart": stroke(
      '<circle cx="9.5" cy="20" r="1.4"/><circle cx="17.5" cy="20" r="1.4"/><path d="M2.5 3h2.4l2.3 12.3a2 2 0 0 0 2 1.7h8.3a2 2 0 0 0 2-1.6L21 8H6"/>',
    ),
    euro: stroke(
      '<path d="M17.5 6.5A6.8 6.8 0 0 0 12.3 4c-3.8 0-6.9 3.6-6.9 8s3.1 8 6.9 8a6.8 6.8 0 0 0 5.2-2.5"/><path d="M4 10.5h9M4 13.5h8"/>',
    ),
    briefcase: stroke(
      '<rect x="3" y="7.5" width="18" height="12" rx="2"/><path d="M8.5 7.5V6a2.5 2.5 0 0 1 2.5-2.5h2A2.5 2.5 0 0 1 15.5 6v1.5"/><path d="M3 13h18"/>',
    ),
    "phone-call": stroke(
      '<path d="M5 4.5h3.5L10 8.7 8 10.2a10.4 10.4 0 0 0 5.8 5.8l1.5-2 4.2 1.5V19a1.7 1.7 0 0 1-1.8 1.7A15.7 15.7 0 0 1 3.3 6.3 1.7 1.7 0 0 1 5 4.5Z"/>',
    ),
    layout: stroke(
      '<rect x="3" y="3.5" width="18" height="17" rx="2"/><path d="M3 9.5h18"/><path d="M9.5 9.5V20.5"/>',
    ),
    settings: stroke(
      '<circle cx="12" cy="12" r="3"/><path d="M19.4 13.5a1.7 1.7 0 0 0 .35 1.9l.06.06a2.1 2.1 0 1 1-3 3l-.07-.07a1.7 1.7 0 0 0-1.9-.34 1.7 1.7 0 0 0-1.04 1.56V20a2.1 2.1 0 0 1-4.2 0v-.1a1.7 1.7 0 0 0-1.1-1.55 1.7 1.7 0 0 0-1.9.34l-.06.07a2.1 2.1 0 1 1-3-3l.07-.06a1.7 1.7 0 0 0 .34-1.9 1.7 1.7 0 0 0-1.56-1.04H3.5a2.1 2.1 0 0 1 0-4.2h.1a1.7 1.7 0 0 0 1.55-1.1 1.7 1.7 0 0 0-.34-1.9l-.07-.06a2.1 2.1 0 1 1 3-3l.06.07a1.7 1.7 0 0 0 1.9.34h.09a1.7 1.7 0 0 0 1.04-1.56V3.5a2.1 2.1 0 0 1 4.2 0v.1a1.7 1.7 0 0 0 1.04 1.56h.09a1.7 1.7 0 0 0 1.9-.34l.06-.07a2.1 2.1 0 1 1 3 3l-.07.06a1.7 1.7 0 0 0-.34 1.9v.09a1.7 1.7 0 0 0 1.56 1.04h.2a2.1 2.1 0 0 1 0 4.2h-.1a1.7 1.7 0 0 0-1.56 1.05Z"/>',
    ),
    search: stroke('<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>'),
    plus: stroke('<path d="M12 5v14M5 12h14"/>'),
    pencil: stroke(
      '<path d="M4 20h4L18.5 9.5a2.1 2.1 0 0 0-3-3L5 17v3Z"/><path d="M14 6.5 17.5 10"/>',
    ),
    trash: stroke(
      '<path d="M4.5 7h15"/><path d="M9 7V5a1.5 1.5 0 0 1 1.5-1.5h3A1.5 1.5 0 0 1 15 5v2"/><path d="M6.5 7 7.3 19a2 2 0 0 0 2 1.9h5.4a2 2 0 0 0 2-1.9L17.5 7"/><path d="M10 11v6M14 11v6"/>',
    ),
    "chevron-left": stroke('<path d="m14.5 5-7 7 7 7"/>'),
    "chevron-right": stroke('<path d="m9.5 5 7 7-7 7"/>'),
    x: stroke('<path d="M5 5 19 19M19 5 5 19"/>'),
    menu: stroke('<path d="M4 6.5h16M4 12h16M4 17.5h16"/>'),
    inbox: stroke(
      '<path d="M4 12.5h4.3l1.4 2.5h4.6l1.4-2.5H20"/><path d="M5.7 5 4 12.5v5A1.5 1.5 0 0 0 5.5 19h13a1.5 1.5 0 0 0 1.5-1.5v-5L18.3 5a1.7 1.7 0 0 0-1.6-1.1H7.3A1.7 1.7 0 0 0 5.7 5Z"/>',
    ),
  };

  function html(name) {
    return SET[name] || SET.box;
  }

  return { html };
})();
