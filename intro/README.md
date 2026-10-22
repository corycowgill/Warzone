# Hallucinated Games studio intro

Shared intro copied from `corycowgill/Wick`, `intro/hallucinated-intro.js`:
https://github.com/corycowgill/Wick/blob/HEAD/intro/hallucinated-intro.js

Warzone plays it once on each page load before initializing the game, with sound off (no autoplay audio or extra audio context). Click, tap, any key or the visible Skip intro button dismisses it. The original reduced-motion treatment and bounded font loading are retained. Returning to the main menu does not replay it.

Local adaptations add an accessible dialog label, a keyboard-focusable skip button, consume the skip input, and identify the overlay for cleanup if playback fails. The logo, animation, colors, duration and tagline retain the shared source design. `js/main.js` continues to the game when the intro is unavailable.
