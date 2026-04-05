/**
 * LoadingScreen - Professional loading screen with progress bar, tips, and animated background.
 */
export class LoadingScreen {
  constructor() {
    this.container = null;
    this.progressBar = null;
    this.progressText = null;
    this.tipText = null;
    this.progress = 0;
    this.targetProgress = 0;
    this.animFrame = null;

    this.tips = [
      'Use control groups (Ctrl+1-9) to quickly select units in battle.',
      'Hold Shift while giving orders to queue waypoints.',
      'Engineers can capture neutral structures for bonus income.',
      'Commanders have powerful abilities - use them wisely!',
      'Building Resource Depots near resource nodes gives +4 SP/s bonus.',
      'Submarines are invisible until detected - use Patrol Boats for sonar.',
      'Tanks deal bonus damage to infantry, but planes counter tanks.',
      'The Tech Lab unlocks powerful Tier 3 units like Heavy Tanks and Bombers.',
      'Use the tactical retreat (R key) to save wounded veterans.',
      'Each nation has unique units and abilities - try them all!',
      'Mortar Teams excel at indirect fire but can\'t hit close targets.',
      'Upgrade your production buildings to increase training speed.',
      'Superweapons take time to charge but can devastate enemy forces.',
      'Forest cover reduces damage to infantry by 25%.',
      'Watch the minimap for combat pings - they show where battles are happening.',
      'APCs can carry 4 infantry - garrisoned units fire from inside.',
      'Scout Cars are fast and great for early reconnaissance.',
      'Higher ground gives damage bonuses - use terrain to your advantage.',
      'AA Half-Tracks and AA Turrets are essential against air units.',
      'The Supply Exchange lets you convert between SP and MU resources.',
      'Double-click a unit to select all units of that type on screen.',
      'Press Space to jump to the last combat alert location.',
      'Veterancy makes units stronger - protect your experienced troops!',
      'In King of the Hill mode, control the center point to score.',
      'Use Ctrl+A to select all military units at once.',
    ];

    this.create();
  }

  create() {
    this.container = document.createElement('div');
    this.container.id = 'loading-screen';
    this.container.className = 'hidden';
    this.container.innerHTML = `
      <div class="loading-bg"></div>
      <div class="loading-content">
        <h1 class="loading-title">WARZONE</h1>
        <div class="loading-bar-container">
          <div class="loading-bar-bg">
            <div class="loading-bar-fill" id="loading-bar-fill"></div>
          </div>
          <div class="loading-progress-text" id="loading-progress-text">Loading... 0%</div>
        </div>
        <div class="loading-detail" id="loading-detail">Initializing...</div>
        <div class="loading-tip" id="loading-tip"></div>
      </div>
    `;
    document.body.appendChild(this.container);

    this.progressBar = this.container.querySelector('#loading-bar-fill');
    this.progressText = this.container.querySelector('#loading-progress-text');
    this.detailText = this.container.querySelector('#loading-detail');
    this.tipText = this.container.querySelector('#loading-tip');
  }

  show(options = {}) {
    this.container.classList.remove('hidden');
    this.progress = 0;
    this.targetProgress = 0;
    this._updateDisplay();
    this._showRandomTip();
    this._startTipRotation();

    if (options.message) {
      this.detailText.textContent = options.message;
    }
  }

  hide() {
    this.targetProgress = 100;
    // Smooth fill to 100% then fade out
    setTimeout(() => {
      this.container.classList.add('loading-fade-out');
      setTimeout(() => {
        this.container.classList.add('hidden');
        this.container.classList.remove('loading-fade-out');
        this._stopTipRotation();
      }, 500);
    }, 300);
  }

  setProgress(value, detail) {
    this.targetProgress = Math.min(100, Math.max(0, value));
    if (detail) this.detailText.textContent = detail;
    this._animateProgress();
  }

  _animateProgress() {
    if (this.animFrame) return;
    const animate = () => {
      const diff = this.targetProgress - this.progress;
      if (Math.abs(diff) < 0.5) {
        this.progress = this.targetProgress;
        this._updateDisplay();
        this.animFrame = null;
        return;
      }
      this.progress += diff * 0.1;
      this._updateDisplay();
      this.animFrame = requestAnimationFrame(animate);
    };
    this.animFrame = requestAnimationFrame(animate);
  }

  _updateDisplay() {
    const pct = Math.round(this.progress);
    this.progressBar.style.width = `${pct}%`;
    this.progressText.textContent = `Loading... ${pct}%`;
  }

  _showRandomTip() {
    const tip = this.tips[Math.floor(Math.random() * this.tips.length)];
    this.tipText.textContent = `TIP: ${tip}`;
  }

  _startTipRotation() {
    this._tipInterval = setInterval(() => this._showRandomTip(), 5000);
  }

  _stopTipRotation() {
    if (this._tipInterval) {
      clearInterval(this._tipInterval);
      this._tipInterval = null;
    }
  }

  dispose() {
    this._stopTipRotation();
    if (this.animFrame) cancelAnimationFrame(this.animFrame);
    this.container?.remove();
  }
}
