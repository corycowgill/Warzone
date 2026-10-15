import { uiIcon } from "./UIIcons.js";

// Keep icons outside values: HUD updates never overwrite the artwork.
const resources = ["supplies", "munitions", "logistics", "army", "clock"];
for (const [index, item] of [
  ...document.querySelectorAll("#resource-bar > .resource-item"),
]
  .slice(0, 5)
  .entries()) {
  const icon = document.createElement("span");
  icon.className = "resource-glyph";
  icon.innerHTML = uiIcon(resources[index]);
  item.prepend(icon);
}

// Nation cards were mouse-only; make the existing selection handlers keyboard accessible.
for (const card of document.querySelectorAll(".nation-card")) {
  card.tabIndex = 0;
  card.setAttribute("role", "button");
  const sync = () =>
    card.setAttribute(
      "aria-pressed",
      String(card.classList.contains("selected")),
    );
  sync();
  new MutationObserver(sync).observe(card, {
    attributes: true,
    attributeFilter: ["class"],
  });
  card.addEventListener("keydown", (event) => {
    if (card.getAttribute("aria-disabled") === "true") return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      card.click();
    }
  });
}
