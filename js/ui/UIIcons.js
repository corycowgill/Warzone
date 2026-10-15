/** Original code-native tactical pictograms. Decorative; visible labels carry meaning. */
const paths = {
  supplies:
    '<path d="M3 7 12 3l9 4v11l-9 4-9-4Z M3 7l9 4 9-4 M12 11v11 M7 5l10 4v5"/>',
  munitions:
    '<path d="M7 21V8l3-5 3 5v13Z M7 16h6 M16 21V11l2-4 2 4v10Z M16 17h4"/>',
  logistics: '<path d="M3 12h15 M14 8l4 4-4 4 M6 7H3V4h18v16H3v-3h3"/>',
  army: '<path d="m12 2 8 4v6c0 5-8 10-8 10S4 17 4 12V6Z m-4 8 4 3 4-3 M8 14l4 3 4-3"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  infantry:
    '<path d="M7 9V7a5 5 0 0 1 10 0v2 M5 9h14 M8 10v4l4 3 4-3v-4 M3 22v-3l5-3 M21 22v-3l-5-3 M9 20h6"/>',
  tank: '<path d="M4 15h16l2 3-2 3H4l-2-3Z M6 15l2-5h8l3 5 M10 10V7h6l2 3 M16 8h7 M6 18h12"/><circle cx="7" cy="18" r="1"/><circle cx="12" cy="18" r="1"/><circle cx="17" cy="18" r="1"/>',
  vehicle:
    '<path d="M3 16V9h12l5 5v5H3Z M15 9v6h5 M6 9V6h6 M7 19v2 M17 19v2"/><circle cx="7" cy="17" r="2"/><circle cx="17" cy="17" r="2"/>',
  plane:
    '<path d="m12 2 2 7 8 5v2l-8-2v5l3 2v1l-5-1-5 1v-1l3-2v-5l-8 2v-2l8-5Z"/>',
  ship: '<path d="m2 15 10 5 10-5-3 6H5Z M6 16V9h12v7 M9 9V5h6v4 M12 5V2 M3 23l4-1 5 1 5-1 4 1"/>',
  building:
    '<path d="M3 21V8l9-5 9 5v13Z M8 21v-7h8v7 M3 9h18 M7 5V2 M17 5V2"/>',
  move: '<path d="M3 12h17 M13 5l7 7-7 7"/>',
  attack:
    '<circle cx="12" cy="12" r="6"/><path d="M12 1v6 M12 17v6 M1 12h6 M17 12h6 M10 12h4"/>',
  stop: '<rect x="5" y="5" width="14" height="14" rx="1"/>',
  patrol:
    '<path d="M19 8a8 8 0 0 0-14-1 M3 3v5h5 M5 16a8 8 0 0 0 14 1 M21 21v-5h-5"/>',
  wrench:
    '<path d="m14 5 4-3a6 6 0 0 0-7 8L3 18l3 3 8-8a6 6 0 0 0 8-7l-3 4-4-1Z"/>',
  star: '<path d="m12 2 3 7 7 1-5 5 1 7-6-4-6 4 1-7-5-5 7-1Z"/>',
};
export function uiIcon(name) {
  return `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${paths[name] || paths.army}</svg>`;
}
export function unitIcon(type) {
  if (["tank", "heavytank", "spg"].includes(type)) return uiIcon("tank");
  if (["apc", "aahalftrack", "scoutcar"].includes(type))
    return uiIcon("vehicle");
  if (["plane", "bomber", "drone"].includes(type)) return uiIcon("plane");
  if (["battleship", "carrier", "submarine", "patrolboat"].includes(type))
    return uiIcon("ship");
  if (["infantry", "mortar"].includes(type)) return uiIcon("infantry");
  if (type === "engineer") return uiIcon("wrench");
  if (type === "commander") return uiIcon("star");
  return uiIcon("building");
}
export function commandIcon(label, fallback = "") {
  if (fallback.startsWith("<svg")) return fallback;
  const text = label.toLowerCase();
  if (text.includes("move") || text.includes("retreat")) return uiIcon("move");
  if (
    text.includes("attack") ||
    text.includes("grenade") ||
    text.includes("siege")
  )
    return uiIcon("attack");
  if (text.includes("stop")) return uiIcon("stop");
  if (text.includes("patrol")) return uiIcon("patrol");
  if (
    text.includes("repair") ||
    text.includes("upgrade") ||
    text.includes("build")
  )
    return uiIcon("wrench");
  if (text.includes("hold") || text.includes("stance")) return uiIcon("army");
  return uiIcon("star");
}
