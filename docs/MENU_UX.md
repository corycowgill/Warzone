# Command briefing menu

Battle preparation now has two steps: choose a command, then configure the battlefield.
Country cards show a flag, strategic identity, playstyle, passive bonus, and active
ability. Skirmish players may choose an AI opponent or leave it random. Hot seat
requires both players to choose a nation before advancing.

The persistent deployment summary follows nation, map, biome, difficulty, and victory
choices. Back navigation preserves choices within the briefing. Reopening preparation
resets the default selections and their descriptions together. Optional map seeds
accept integers from 1 through 2147483647, with native validation before launch.

Native buttons support keyboard selection; visible focus rings identify the active
control. Escape returns from battlefield setup to country selection, then to the
main menu. Layouts include a compact desktop briefing and a stacked mobile layout.
Map illustrations are schematic terrain profiles, not generated map previews.

Validation: browser checks at 1280x720 and 390x844 covered country/opponent selection,
setup summaries, back navigation, Enter selection, Escape, two-player gating, and
a successful skirmish launch with no browser errors. Four launch regression tests
and interface smoke checks pass. The existing constants test still expects positive
starting munitions, while the game intentionally starts at zero; this change does
not alter that existing failure.
