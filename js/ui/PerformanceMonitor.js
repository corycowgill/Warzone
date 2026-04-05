/**
 * PerformanceMonitor - FPS counter and performance stats overlay.
 */
export class PerformanceMonitor {
  constructor() {
    this.container = null;
    this.visible = false;
    this.frames = 0;
    this.lastTime = performance.now();
    this.fps = 0;
    this.fpsHistory = new Array(60).fill(60);
    this.historyIndex = 0;
    this.drawCalls = 0;
    this.triangles = 0;
    this.entities = 0;
    this.memoryMB = 0;

    this.create();
  }

  create() {
    this.container = document.createElement('div');
    this.container.id = 'perf-monitor';
    this.container.className = 'hidden';
    this.container.innerHTML = `
      <canvas id="perf-graph" width="120" height="40"></canvas>
      <div class="perf-stats">
        <div class="perf-row"><span class="perf-label">FPS:</span><span id="perf-fps" class="perf-value">60</span></div>
        <div class="perf-row"><span class="perf-label">Draw:</span><span id="perf-draws" class="perf-value">0</span></div>
        <div class="perf-row"><span class="perf-label">Tris:</span><span id="perf-tris" class="perf-value">0</span></div>
        <div class="perf-row"><span class="perf-label">Ents:</span><span id="perf-ents" class="perf-value">0</span></div>
        <div class="perf-row"><span class="perf-label">Mem:</span><span id="perf-mem" class="perf-value">0 MB</span></div>
      </div>
    `;
    document.body.appendChild(this.container);
    this.canvas = this.container.querySelector('#perf-graph');
    this.ctx = this.canvas.getContext('2d');
  }

  show() { this.visible = true; this.container.classList.remove('hidden'); }
  hide() { this.visible = false; this.container.classList.add('hidden'); }
  toggle() { this.visible ? this.hide() : this.show(); }

  update(renderer, entityCount) {
    this.frames++;
    const now = performance.now();
    const elapsed = now - this.lastTime;

    if (elapsed >= 500) {
      this.fps = Math.round((this.frames * 1000) / elapsed);
      this.frames = 0;
      this.lastTime = now;

      this.fpsHistory[this.historyIndex] = this.fps;
      this.historyIndex = (this.historyIndex + 1) % this.fpsHistory.length;

      if (this.visible) {
        const info = renderer?.info;
        if (info) {
          this.drawCalls = info.render?.calls || 0;
          this.triangles = info.render?.triangles || 0;
        }
        this.entities = entityCount || 0;

        // Memory (if available)
        if (performance.memory) {
          this.memoryMB = Math.round(performance.memory.usedJSHeapSize / (1024 * 1024));
        }

        this._render();
      }
    }
  }

  _render() {
    // Update text
    const fpsEl = this.container.querySelector('#perf-fps');
    const drawsEl = this.container.querySelector('#perf-draws');
    const trisEl = this.container.querySelector('#perf-tris');
    const entsEl = this.container.querySelector('#perf-ents');
    const memEl = this.container.querySelector('#perf-mem');

    fpsEl.textContent = this.fps;
    fpsEl.style.color = this.fps >= 55 ? '#00ff41' : this.fps >= 30 ? '#ffcc00' : '#ff3333';
    drawsEl.textContent = this.drawCalls;
    trisEl.textContent = this.triangles > 1000 ? `${(this.triangles / 1000).toFixed(1)}K` : this.triangles;
    entsEl.textContent = this.entities;
    memEl.textContent = `${this.memoryMB} MB`;

    // Draw FPS graph
    const ctx = this.ctx;
    const w = this.canvas.width;
    const h = this.canvas.height;
    ctx.clearRect(0, 0, w, h);

    // Background
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(0, 0, w, h);

    // 60fps line
    ctx.strokeStyle = 'rgba(0, 255, 65, 0.2)';
    ctx.beginPath();
    ctx.moveTo(0, h * (1 - 60 / 120));
    ctx.lineTo(w, h * (1 - 60 / 120));
    ctx.stroke();

    // FPS graph
    ctx.strokeStyle = '#00ff41';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < this.fpsHistory.length; i++) {
      const idx = (this.historyIndex + i) % this.fpsHistory.length;
      const x = (i / this.fpsHistory.length) * w;
      const y = h * (1 - Math.min(this.fpsHistory[idx], 120) / 120);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }

  dispose() {
    this.container?.remove();
  }
}
