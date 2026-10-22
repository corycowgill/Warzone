import { Game } from './core/Game.js';

console.log('Warzone: initializing...');
try {
  try {
    await window.HallucinatedIntro?.play({skippable:true,sound:false});
  } catch (error) {
    console.warn('Studio intro unavailable; continuing to Warzone.',error);
  } finally {
    document.getElementById('hallucinated-studio-intro')?.remove();
    document.body.removeAttribute('data-studio-intro');
  }
  const game = new Game();
  window.game = game;
  game.init();
  console.log('Warzone: initialized successfully');
} catch (err) {
  console.error('Warzone init failed:', err);
  document.body.innerHTML = `<div style="position:fixed;top:10px;left:10px;right:10px;background:red;color:white;padding:20px;z-index:99999;font-family:monospace;white-space:pre-wrap;">Init Error: ${err.message}\n${err.stack}</div>`;
}
