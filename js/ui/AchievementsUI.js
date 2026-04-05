/**
 * AchievementsUI - Full-screen achievements browser panel.
 */
export class AchievementsUI {
  constructor(achievementSystem) {
    this.system = achievementSystem;
    this.container = null;
    this.isOpen = false;
    this.activeCategory = 'all';
    this.create();
  }

  create() {
    this.container = document.createElement('div');
    this.container.id = 'achievements-panel';
    this.container.className = 'hidden';
    this.container.innerHTML = `
      <div class="ach-backdrop"></div>
      <div class="ach-panel">
        <div class="ach-header">
          <h2>ACHIEVEMENTS</h2>
          <div class="ach-progress-bar">
            <div class="ach-progress-fill" id="ach-progress-fill"></div>
          </div>
          <span class="ach-progress-text" id="ach-progress-text">0/0</span>
          <button class="ach-close-btn">&times;</button>
        </div>
        <div class="ach-body">
          <div class="ach-categories" id="ach-categories"></div>
          <div class="ach-grid" id="ach-grid"></div>
        </div>
      </div>
    `;
    document.body.appendChild(this.container);

    this.container.querySelector('.ach-close-btn').addEventListener('click', () => this.close());
    this.container.querySelector('.ach-backdrop').addEventListener('click', () => this.close());
  }

  open() {
    this.isOpen = true;
    this.container.classList.remove('hidden');
    this.render();
  }

  close() {
    this.isOpen = false;
    this.container.classList.add('hidden');
  }

  render() {
    const progress = this.system.getProgress();
    const achievements = this.system.getAll();

    // Progress bar
    const fill = this.container.querySelector('#ach-progress-fill');
    const text = this.container.querySelector('#ach-progress-text');
    fill.style.width = `${progress.percentage}%`;
    text.textContent = `${progress.unlocked}/${progress.total} (${progress.percentage}%)`;

    // Categories
    const categories = ['all', ...new Set(achievements.map(a => a.category))];
    const catEl = this.container.querySelector('#ach-categories');
    catEl.innerHTML = categories.map(cat => `
      <button class="ach-cat-btn ${this.activeCategory === cat ? 'active' : ''}" data-category="${cat}">
        ${cat === 'all' ? 'All' : cat.charAt(0).toUpperCase() + cat.slice(1)}
        <span class="ach-cat-count">${
          cat === 'all'
            ? `${progress.unlocked}/${progress.total}`
            : `${progress.byCategory[cat]?.unlocked || 0}/${progress.byCategory[cat]?.total || 0}`
        }</span>
      </button>
    `).join('');

    catEl.querySelectorAll('.ach-cat-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this.activeCategory = btn.dataset.category;
        this.render();
      });
    });

    // Achievement grid
    const filtered = this.activeCategory === 'all'
      ? achievements
      : achievements.filter(a => a.category === this.activeCategory);

    const gridEl = this.container.querySelector('#ach-grid');
    gridEl.innerHTML = filtered.map(ach => `
      <div class="ach-card ${ach.unlocked ? 'unlocked' : 'locked'}">
        <div class="ach-card-icon">${ach.unlocked ? ach.icon : '🔒'}</div>
        <div class="ach-card-info">
          <div class="ach-card-name">${ach.unlocked ? ach.name : '???'}</div>
          <div class="ach-card-desc">${ach.unlocked ? ach.description : 'Keep playing to unlock!'}</div>
          ${ach.unlockedAt ? `<div class="ach-card-date">Unlocked: ${new Date(ach.unlockedAt).toLocaleDateString()}</div>` : ''}
        </div>
      </div>
    `).join('');
  }

  dispose() {
    this.container?.remove();
  }
}
