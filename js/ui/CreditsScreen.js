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
    this.baseSpeed = 0.8;
    this.speedMultiplier = 1;
    this.paused = false;
    this._onKeyDown = null;
    this._speedBtn = null;
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

    // Speed toggle button
    this._speedBtn = document.createElement('button');
    this._speedBtn.textContent = '1x';
    Object.assign(this._speedBtn.style, {
      position: 'fixed',
      top: '20px',
      left: '20px',
      padding: '8px 20px',
      background: 'rgba(30, 30, 50, 0.8)',
      color: '#00ff41',
      border: '1px solid #00ff41',
      borderRadius: '4px',
      cursor: 'pointer',
      fontSize: '14px',
      fontFamily: "'Courier New', monospace",
      fontWeight: 'bold',
      zIndex: '2',
      transition: 'all 0.2s',
      minWidth: '60px'
    });
    this._speedBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      this._cycleSpeed();
    });
    this.overlay.appendChild(this._speedBtn);

    // Pause hint
    const hint = document.createElement('div');
    hint.textContent = 'Click to pause/resume \u00B7 Speed button to go faster';
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

      ${this._section('DEVELOPMENT TEAM')}
      ${this._subtext('Claude Opus 4.6 \u2014 AI Agent Studio')}

      <div style="height:20px;"></div>
      ${this._credit('Ability System', 'Active/passive unit and building abilities')}
      ${this._credit('Accessibility', 'Playability across diverse hardware and input')}
      ${this._credit('Animator', 'Character and building animations')}
      ${this._credit('Anti-Cheat', 'Detection and prevention of unfair play')}
      ${this._credit('Asset Pipeline', 'Import, processing, and delivery of all assets')}
      ${this._credit('Backend Services', 'Accounts, leaderboards, persistence')}
      ${this._credit('Balance Data', 'Unit stats, win rates, patch notes')}
      ${this._credit('Build & CI', 'Compilation, packaging, and delivery pipeline')}
      ${this._credit('Build & Tech Tree', 'Construction, production, tech prerequisites')}
      ${this._credit('Campaign Scripting', 'Mission triggers, objectives, scripted sequences')}
      ${this._credit('Cinematic & Narrative', 'Cutscenes, dialogue, subtitles')}
      ${this._credit('Codebase Archaeology', 'Prototype analysis and shared knowledge')}
      ${this._credit('Combat', 'Damage calculation and combat resolution')}
      ${this._credit('Concept Artist', 'Visual language and faction identity')}
      ${this._credit('Economy', 'Resource gathering and economic feedback loop')}
      ${this._credit('Environment Artist', 'Terrain, structures, props, dressing')}
      ${this._credit('Fog of War', 'Visibility system for each player')}
      ${this._credit('Game Systems Designer', 'Faction design, unit roles, balance targets')}
      ${this._credit('HUD', 'Selection, command card, resource display')}
      ${this._credit('Lobby & Matchmaking', 'Finding opponents and setting up matches')}
      ${this._credit('Localization', 'Internationalization pipeline')}
      ${this._credit('Map Editor', 'Terrain painting, object placement, triggers')}
      ${this._credit('Map & Terrain', 'Terrain system, tile types, resource nodes')}
      ${this._credit('Menus & Settings', 'Main menu, settings, profile screens')}
      ${this._credit('Minimap', 'Tactical overview, pings, and alerts')}
      ${this._credit('Multiplayer Map Designer', 'Competitive layouts and chokepoints')}
      ${this._credit('Music', 'Adaptive soundtrack and faction themes')}
      ${this._credit('Narrative Designer', 'Story, lore, voice lines, tooltips')}
      ${this._credit('Networking & Sync', 'Deterministic lockstep multiplayer')}
      ${this._credit('Pathfinding', 'A*, flow fields, formation movement')}
      ${this._credit('Performance Profiling', 'CPU, GPU, and memory optimization')}
      ${this._credit('Physics & Collision', 'Collision detection and projectile physics')}
      ${this._credit('Platform Integration', 'Storefronts, launchers, OS services')}
      ${this._credit('Production', 'Project coordination and milestone tracking')}
      ${this._credit('QA & Testing', 'Regression tests, determinism, benchmarks')}
      ${this._credit('Rendering', 'Shaders, LOD, fog visuals, post-processing')}
      ${this._credit('Replay', 'Recording, storage, and playback of replays')}
      ${this._credit('Sound Engine', 'Spatial audio, voice lines, ambient sound')}
      ${this._credit('Strategic AI', 'Build orders, army composition, scouting')}
      ${this._credit('Technical Artist', 'Polygon budgets, rigging, shader library')}
      ${this._credit('UI Artist', 'Icons, menus, loading screens')}
      ${this._credit('Unit AI', 'Threat assessment, kiting, focus fire, retreat')}
      ${this._credit('Unit Behavior', 'State machines, command queuing, formations')}
      ${this._credit('Unit & Character Artist', '3D models for units and heroes')}
      ${this._credit('VFX Artist', 'Explosions, projectiles, environmental effects')}
      ${this._credit('Voice Director', 'VO production, casting, session notes')}

      <div style="height:80px;"></div>

      <div style="margin-bottom:40px;">
        <h2 style="color:#00ff41;font-size:14px;letter-spacing:6px;margin-bottom:20px;">- - - - - - - - - -</h2>
      </div>

      <div style="margin-bottom:60px;">
        <h3 style="font-size:22px;color:#ffcc00;letter-spacing:4px;text-shadow:0 0 30px rgba(255,204,0,0.4);">Cory Cowgill</h3>
        <p style="color:#8ab4f8;font-size:14px;letter-spacing:3px;margin-top:8px;">Humble Human Director</p>
      </div>

      <div style="height:80px;"></div>

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

  _cycleSpeed() {
    if (this.speedMultiplier === 1) {
      this.speedMultiplier = 2;
    } else if (this.speedMultiplier === 2) {
      this.speedMultiplier = 4;
    } else {
      this.speedMultiplier = 1;
    }
    this.scrollSpeed = this.baseSpeed * this.speedMultiplier;
    if (this._speedBtn) {
      this._speedBtn.textContent = this.speedMultiplier + 'x';
    }
  }

  open() {
    this._build();
    this.overlay.classList.remove('hidden');
    this.paused = false;
    this.speedMultiplier = 1;
    this.scrollSpeed = this.baseSpeed;
    if (this._speedBtn) this._speedBtn.textContent = '1x';

    // Reset scroll position
    this.scrollContainer.style.top = '0';
    this._scrollY = 0;

    // Start scrolling animation
    this._animate();

    // ESC to close, 1/2/4 for speed
    this._onKeyDown = (e) => {
      if (e.key === 'Escape') {
        this.close();
      } else if (e.key === ' ') {
        e.preventDefault();
        this.paused = !this.paused;
      } else if (e.key === '1' || e.key === '2' || e.key === '4') {
        this.speedMultiplier = parseInt(e.key);
        this.scrollSpeed = this.baseSpeed * this.speedMultiplier;
        if (this._speedBtn) this._speedBtn.textContent = this.speedMultiplier + 'x';
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
