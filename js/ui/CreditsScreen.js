/**
 * CreditsScreen - Scrolling credits screen accessible from the main menu.
 * Shows game title, asset attributions, and open source library credits.
 */
export class CreditsScreen {
  constructor() {
    this.overlay = null;
    this.scrollContainer = null;
    this.animationId = null;
    this.scrollSpeed = 0.8; // pixels per frame
    this.paused = false;
    this._onKeyDown = null;
    this._built = false;
  }

  _build() {
    if (this._built) return;
    this._built = true;

    // Main overlay
    this.overlay = document.createElement('div');
    this.overlay.id = 'credits-screen';
    this.overlay.className = 'hidden';
    Object.assign(this.overlay.style, {
      position: 'fixed',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'radial-gradient(ellipse at center, #0a0f1e 0%, #000000 100%)',
      zIndex: '10020',
      fontFamily: "'Segoe UI', Arial, sans-serif",
      color: '#ccc',
      overflow: 'hidden'
    });

    // Scroll container
    this.scrollContainer = document.createElement('div');
    Object.assign(this.scrollContainer.style, {
      position: 'absolute',
      left: '50%',
      transform: 'translateX(-50%)',
      width: '600px',
      maxWidth: '90vw',
      textAlign: 'center',
      paddingTop: '100vh' // Start offscreen below
    });

    this.scrollContainer.innerHTML = this._getCreditsHTML();
    this.overlay.appendChild(this.scrollContainer);

    // Scanline overlay effect
    const scanlines = document.createElement('div');
    Object.assign(scanlines.style, {
      position: 'absolute',
      top: '0',
      left: '0',
      right: '0',
      bottom: '0',
      background: 'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.05) 2px, rgba(0,0,0,0.05) 4px)',
      pointerEvents: 'none',
      zIndex: '1'
    });
    this.overlay.appendChild(scanlines);

    // Close button
    const closeBtn = document.createElement('button');
    closeBtn.textContent = 'Close [ESC]';
    Object.assign(closeBtn.style, {
      position: 'fixed',
      top: '20px',
      right: '20px',
      padding: '8px 20px',
      background: 'rgba(30, 30, 50, 0.8)',
      color: '#aaa',
      border: '1px solid #555',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '13px',
      fontFamily: 'inherit',
      zIndex: '2',
      transition: 'all 0.2s'
    });
    closeBtn.addEventListener('mouseenter', () => {
      closeBtn.style.color = '#fff';
      closeBtn.style.borderColor = '#888';
    });
    closeBtn.addEventListener('mouseleave', () => {
      closeBtn.style.color = '#aaa';
      closeBtn.style.borderColor = '#555';
    });
    closeBtn.addEventListener('click', () => this.close());
    this.overlay.appendChild(closeBtn);

    // Pause hint
    const hint = document.createElement('div');
    hint.textContent = 'Click to pause/resume scrolling';
    Object.assign(hint.style, {
      position: 'fixed',
      bottom: '15px',
      left: '50%',
      transform: 'translateX(-50%)',
      color: '#444',
      fontSize: '11px',
      zIndex: '2'
    });
    this.overlay.appendChild(hint);

    // Click to pause/resume
    this.overlay.addEventListener('click', (e) => {
      if (e.target === closeBtn) return;
      this.paused = !this.paused;
    });

    document.body.appendChild(this.overlay);
  }

  _getCreditsHTML() {
    return `
      <div style="margin-bottom:80px;">
        <h1 style="font-size:52px;letter-spacing:12px;color:#ffcc00;margin:0;text-shadow:0 0 30px rgba(255,204,0,0.4);">WARZONE</h1>
        <p style="font-size:16px;color:#6a8a9a;letter-spacing:4px;margin-top:8px;">STRATEGIC COMMAND &amp; CONTROL</p>
      </div>

      <div style="margin-bottom:60px;">
        <h2 style="color:#00ff41;font-size:14px;letter-spacing:6px;margin-bottom:20px;">- - - - - - - - - -</h2>
      </div>

      ${this._section('3D MODEL ASSETS')}

      ${this._heading('Kenney.nl')}
      ${this._subtext('Creative Commons CC0 1.0 Universal (Public Domain)')}
      ${this._subtext('https://kenney.nl/assets')}
      <div style="height:20px;"></div>
      ${this._credit('Nature Kit v2.1', 'Environment trees and vegetation')}
      ${this._credit('Space Kit v2.0', 'Turrets, spacecraft, rockets')}
      ${this._credit('Tower Defense Kit v2.1', 'Superweapon, tower structures, drones')}
      ${this._credit('Castle Kit v2.0', 'Bunker, walls, gates')}
      ${this._credit('City Kit Commercial v2.1', 'Tech Lab, city buildings')}
      ${this._credit('Car Kit v3.0', 'Military vehicles (Humvee, trucks, APC)')}
      ${this._credit('Blaster Kit v2.1', 'Weapon models, grenades')}
      ${this._credit('Mini Arena v1.1', 'Commander character model')}
      ${this._subtext('Additional credit: Tony Schaer')}
      ${this._credit('Survival Kit', 'Building structures, fences, barrels, tents')}
      ${this._credit('Pirate Kit', 'Naval vessels, cannons')}

      <div style="height:50px;"></div>

      ${this._heading('Kay Lousberg')}
      ${this._subtext('KayKit Medieval - CC0 Public Domain')}
      ${this._credit('Medieval Building Pack', 'Supply Exchange (market building)')}

      <div style="height:50px;"></div>

      ${this._heading('Three.js Example Models')}
      ${this._subtext('MIT License')}
      ${this._credit('Soldier.glb', 'Infantry unit (animated character)')}
      ${this._credit('Xbot.glb', 'Engineer unit (animated robot)')}

      <div style="height:50px;"></div>

      ${this._heading('Khronos Group')}
      ${this._subtext('glTF Sample Assets - CC-BY 4.0')}
      ${this._credit('DamagedHelmet', 'Original by theblueturtle_ (Sketchfab)')}

      <div style="height:60px;"></div>

      ${this._section('AUDIO')}
      ${this._credit('Sound Effects', 'Procedurally generated via Web Audio API')}

      <div style="height:60px;"></div>

      ${this._section('OPEN SOURCE LIBRARIES')}

      ${this._heading('Three.js v0.172.0')}
      ${this._subtext('MIT License - https://threejs.org')}
      ${this._credit('3D Rendering Engine', 'WebGL-based scene graph and rendering')}
      ${this._credit('GLTFLoader', 'GLTF/GLB 3D model loading')}

      <div style="height:60px;"></div>

      ${this._section('TECHNOLOGIES')}
      ${this._credit('JavaScript ES Modules', 'Zero-build native browser modules')}
      ${this._credit('HTML5 Canvas', 'Minimap and 2D rendering')}
      ${this._credit('Web Audio API', 'Procedural sound synthesis')}
      ${this._credit('CSS3', 'UI styling and animations')}

      <div style="height:80px;"></div>

      <div style="margin-bottom:60px;">
        <h2 style="color:#00ff41;font-size:14px;letter-spacing:6px;margin-bottom:20px;">- - - - - - - - - -</h2>
      </div>

      <div style="margin-bottom:100vh;">
        <p style="color:#666;font-size:12px;letter-spacing:2px;">MADE WITH PASSION FOR RTS GAMES</p>
        <p style="color:#444;font-size:11px;margin-top:20px;">Special thanks to the open source community</p>
        <p style="color:#444;font-size:11px;">and all the asset creators who share their work.</p>
      </div>
    `;
  }

  _section(title) {
    return `<h2 style="font-size:18px;letter-spacing:8px;color:#ffcc00;margin:0 0 30px 0;text-shadow:0 0 20px rgba(255,204,0,0.3);">${title}</h2>`;
  }

  _heading(text) {
    return `<h3 style="font-size:16px;color:#8ab4f8;margin:0 0 6px 0;letter-spacing:2px;">${text}</h3>`;
  }

  _subtext(text) {
    return `<p style="font-size:11px;color:#556;margin:2px 0 8px 0;">${text}</p>`;
  }

  _credit(title, description) {
    return `
      <div style="margin:12px 0;">
        <span style="color:#ccc;font-size:14px;">${title}</span>
        <br>
        <span style="color:#667;font-size:12px;">${description}</span>
      </div>
    `;
  }

  open() {
    this._build();
    this.overlay.classList.remove('hidden');
    this.paused = false;

    // Reset scroll position
    this.scrollContainer.style.top = '0';
    this._scrollY = 0;

    // Start scrolling animation
    this._animate();

    // ESC to close
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close();
      }
    };
    document.addEventListener('keydown', this._onKeyDown);
  }

  close() {
    if (this.overlay) {
      this.overlay.classList.add('hidden');
    }
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
    if (this._onKeyDown) {
      document.removeEventListener('keydown', this._onKeyDown);
      this._onKeyDown = null;
    }
  }

  _animate() {
    this.animationId = requestAnimationFrame(() => this._animate());

    if (this.paused) return;

    this._scrollY -= this.scrollSpeed;
    this.scrollContainer.style.transform = `translateX(-50%) translateY(${this._scrollY}px)`;

    // Check if credits have fully scrolled past
    const contentHeight = this.scrollContainer.scrollHeight;
    if (Math.abs(this._scrollY) > contentHeight) {
      // Reset to start
      this._scrollY = 0;
    }
  }

  dispose() {
    this.close();
    if (this.overlay && this.overlay.parentElement) {
      this.overlay.parentElement.removeChild(this.overlay);
    }
    this.overlay = null;
    this.scrollContainer = null;
    this._built = false;
  }
}
