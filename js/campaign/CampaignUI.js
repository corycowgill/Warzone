/**
 * CampaignUI - Handles all campaign-related UI screens and in-mission HUD elements.
 */
export class CampaignUI {
  constructor(game, campaignManager) {
    this.game = game;
    this.campaignManager = campaignManager;
    this._objectiveTrackerEl = null;
    this._dialogueEl = null;
    this._briefingEl = null;
    this._missionCompleteEl = null;
    this._campaignSelectEl = null;

    // Listen for mission events
    this.game.eventBus.on('campaign:missionComplete', (data) => this.showMissionComplete(data));
    this.game.eventBus.on('campaign:missionFailed', (data) => this.showMissionFailed(data));
  }

  // ─── Campaign Select Screen ───────────────────────────────────

  showCampaignSelect() {
    this._hideCampaignScreens();
    this.game.uiManager?.hideAll();

    if (!this._campaignSelectEl) {
      this._createCampaignSelectEl();
    }

    this._populateMissionList();
    this._campaignSelectEl.classList.remove('hidden');
    this._campaignSelectEl.querySelector('#campaign-back-btn').focus();
  }

  _createCampaignSelectEl() {
    const el = document.createElement('section');
    this._campaignSelectEl = el;
    el.id = 'campaign-select';
    el.className = 'campaign-screen hidden';
    el.setAttribute('aria-label', 'Campaign command');
    el.innerHTML = `
      <div class="campaign-shell">
        <header class="campaign-header"><div><span class="campaign-eyebrow">STRATEGIC COMMAND / OPERATIONS</span><h1>Campaign</h1><p>Three theaters. Twelve operations. One path to victory.</p></div><button id="campaign-back-btn" class="campaign-back">← Main menu</button></header>
        <div class="campaign-toolbar"><div id="campaign-stars-total"></div><fieldset class="campaign-difficulty"><legend>Operation difficulty</legend>${['easy','normal','hard'].map(diff => `<button type="button" class="campaign-diff-btn" data-diff="${diff}" aria-pressed="false">${diff}</button>`).join('')}</fieldset></div>
        <p id="campaign-difficulty-help" class="campaign-help"></p>
        <div id="campaign-mission-list"></div>
        <footer class="campaign-footer">Earn up to three stars per operation. Complete each mission to unlock the next.</footer>
      </div>`;
    document.body.appendChild(el);
    el.querySelectorAll('.campaign-diff-btn').forEach(button => button.addEventListener('click', () => {
      this.campaignManager.currentDifficulty = button.dataset.diff;
      this._updateDifficulty();
    }));
    el.querySelector('#campaign-back-btn').addEventListener('click', () => {
      el.classList.add('hidden');
      this.game.uiManager.showMainMenu();
      document.getElementById('btn-campaign')?.focus();
    });
    el.addEventListener('keydown', event => {
      if (event.key === 'Escape') el.querySelector('#campaign-back-btn').click();
    });
  }

  _updateDifficulty() {
    const difficulty = this.campaignManager.currentDifficulty;
    this._campaignSelectEl.querySelectorAll('.campaign-diff-btn').forEach(button => {
      const selected = button.dataset.diff === difficulty;
      button.classList.toggle('selected', selected);
      button.setAttribute('aria-pressed', String(selected));
    });
    this._campaignSelectEl.querySelector('#campaign-difficulty-help').textContent = {
      easy: 'Easy — more starting resources and fewer enemy forces. Learn the battlefield at your pace.',
      normal: 'Normal — balanced resources and enemy forces. The intended command experience.',
      hard: 'Hard — fewer resources and stronger, larger enemy forces. Every order counts.'
    }[difficulty];
  }

  _populateMissionList() {
    const list = this._campaignSelectEl.querySelector('#campaign-mission-list');
    list.replaceChildren();
    const manager = this.campaignManager;
    const stars = manager.getTotalStars(), max = manager.getMaxStars();
    const acts = manager.getMissionsByAct();
    const missions = acts.flatMap(act => act.missions);
    const completed = missions.filter(mission => mission.completed).length;
    this._campaignSelectEl.querySelector('#campaign-stars-total').innerHTML = `<strong>${completed}<span> / ${missions.length}</span></strong><span>OPERATIONS COMPLETE</span><span class="campaign-star-total">★ ${stars} / ${max}</span><progress value="${stars}" max="${max}" aria-label="Campaign stars"></progress>`;
    this._updateDifficulty();
    for (const act of acts) {
      const section = document.createElement('section');
      section.className = 'campaign-act';
      const heading = document.createElement('h2');
      heading.textContent = act.name;
      section.appendChild(heading);
      const grid = document.createElement('div');
      grid.className = 'campaign-mission-grid';
      section.appendChild(grid);
      for (const mission of act.missions) {
        const card = document.createElement('button');
        card.type = 'button';
        card.className = `campaign-mission ${mission.unlocked ? 'available' : 'locked'} ${mission.completed ? 'completed' : ''}`;
        card.disabled = !mission.unlocked;
        const status = !mission.unlocked ? 'Locked' : mission.completed ? 'Completed · Replay' : 'Ready to deploy';
        card.innerHTML = `<span class="campaign-card-top"><span>OP / ${String(mission.missionNumber).padStart(2,'0')}</span><span class="campaign-status">${status}</span></span><strong>${mission.name}</strong><span class="campaign-nation">${mission.playerNation === 'britain' ? 'Great Britain' : mission.playerNation}</span><span class="campaign-card-summary">${mission.unlocked ? mission.briefing.slice(0,125) + (mission.briefing.length > 125 ? '…' : '') : 'Complete the previous operation to unlock.'}</span><span class="campaign-card-bottom"><span aria-label="${mission.stars || 0} of 3 stars">${'★'.repeat(mission.stars || 0)}${'☆'.repeat(3-(mission.stars || 0))}</span><span>${mission.bestTime ? `BEST ${Math.floor(mission.bestTime/60)}:${String(Math.floor(mission.bestTime%60)).padStart(2,'0')}` : mission.unlocked ? 'View briefing →' : 'Awaiting orders'}</span></span>`;
        card.addEventListener('click', () => this.showBriefing(mission));
        grid.appendChild(card);
      }
      list.appendChild(section);
    }
  }

  // ─── Briefing Screen ──────────────────────────────────────────

  showBriefing(mission) {
    this._hideCampaignScreens();
    if (!this._briefingEl) this._createBriefingEl();
    const nation = name => name === 'britain' ? 'Great Britain' : name;
    const content = this._briefingEl.querySelector('#briefing-content');
    const objectives = (mission.objectives || []).filter(objective => !objective.hidden);
    content.innerHTML = `<div class="campaign-eyebrow">ACT ${mission.act} / OPERATION ${String(mission.missionNumber).padStart(2,'0')}</div><h1>${mission.name}</h1><div class="campaign-briefing-meta"><span>COMMAND / ${nation(mission.playerNation)}</span><span>OPPOSITION / ${nation(mission.enemyNation)}</span><span>${this.campaignManager.currentDifficulty} difficulty</span></div><p class="campaign-briefing-copy">${mission.briefing}</p><div class="campaign-objectives">${['primary','secondary'].map(priority => {
      const entries = objectives.filter(objective => objective.priority === priority);
      return entries.length ? `<section><h2>${priority} objectives</h2><ul>${entries.map(objective => `<li><strong>${objective.name}</strong><p>${objective.description || ''}</p></li>`).join('')}</ul></section>` : '';
    }).join('')}</div><footer class="campaign-briefing-actions"><button id="briefing-back-btn" class="campaign-back">← Operations</button><button id="briefing-start-btn" class="campaign-deploy">Deploy to battle →</button></footer>`;
    content.querySelector('#briefing-start-btn').addEventListener('click', () => {
      this._briefingEl.classList.add('hidden');
      this.campaignManager.startMission(mission.id, this.campaignManager.currentDifficulty);
    });
    content.querySelector('#briefing-back-btn').addEventListener('click', () => this.showCampaignSelect());
    this._briefingEl.classList.remove('hidden');
    const heading = content.querySelector('h1');
    heading.tabIndex = -1;
    heading.focus({preventScroll: true});
    this._briefingEl.scrollTop = 0;
  }

  _createBriefingEl() {
    this._briefingEl = document.createElement('section');
    this._briefingEl.id = 'campaign-briefing';
    this._briefingEl.className = 'campaign-screen hidden';
    this._briefingEl.setAttribute('aria-label', 'Mission briefing');
    this._briefingEl.innerHTML = '<div id="briefing-content" class="campaign-briefing-panel"></div>';
    this._briefingEl.addEventListener('keydown', event => {
      if (event.key === 'Escape') this.showCampaignSelect();
    });
    document.body.appendChild(this._briefingEl);
  }

  // ─── In-Mission Objective Tracker ─────────────────────────────

  showObjectiveTracker() {
    if (this._objectiveTrackerEl) return;

    this._objectiveTrackerEl = document.createElement('div');
    this._objectiveTrackerEl.id = 'campaign-objective-tracker';
    this._objectiveTrackerEl.style.cssText = `
      position: fixed; top: 60px; right: 10px;
      background: rgba(10, 15, 30, 0.85);
      border: 1px solid rgba(0, 255, 65, 0.2);
      border-radius: 4px;
      padding: 10px 14px;
      font-family: 'Courier New', monospace;
      z-index: 500;
      max-width: 280px;
      pointer-events: none;
    `;
    document.body.appendChild(this._objectiveTrackerEl);
  }

  updateObjectiveTracker() {
    if (!this._objectiveTrackerEl) return;
    const engine = this.campaignManager.missionEngine;
    if (!engine || !engine.mission) return;

    const objectives = engine.objectives.filter(o => !o.hidden);
    let html = '<div style="color:#00ff41;font-size:11px;font-weight:bold;margin-bottom:6px;letter-spacing:1px;">OBJECTIVES</div>';

    for (const obj of objectives) {
      const isPrimary = obj.priority === 'primary';
      let statusIcon, statusColor;

      if (obj.status === 'completed') {
        statusIcon = '&#10003;';
        statusColor = '#00ff44';
      } else if (obj.status === 'failed') {
        statusIcon = '&#10007;';
        statusColor = '#ff4444';
      } else {
        statusIcon = isPrimary ? '&#9654;' : '&#9655;';
        statusColor = isPrimary ? '#ffcc00' : '#888';
      }

      // Progress bar for timed/progressive objectives
      let progressBar = '';
      if (obj.status === 'active' && obj.maxProgress > 1) {
        const pct = Math.min(100, (obj.progress / obj.maxProgress) * 100);
        progressBar = `<div style="height:2px;background:rgba(255,255,255,0.1);margin-top:2px;border-radius:1px;">
          <div style="height:100%;width:${pct}%;background:${isPrimary ? '#00ff41' : '#888'};border-radius:1px;"></div>
        </div>`;
      }

      html += `
        <div style="margin-bottom:4px;">
          <div style="color:${statusColor};font-size:10px;">
            <span>${statusIcon}</span>
            <span style="color:${obj.status === 'completed' ? '#00ff44' : obj.status === 'failed' ? '#ff4444' : '#ccc'};margin-left:3px;">${obj.name}</span>
          </div>
          ${progressBar}
        </div>
      `;
    }

    // Timer display
    if (engine.mission.timeLimit) {
      const remaining = Math.max(0, engine.mission.timeLimit - engine.elapsed);
      const mins = Math.floor(remaining / 60);
      const secs = Math.floor(remaining % 60);
      const urgentColor = remaining < 60 ? '#ff0000' : remaining < 180 ? '#ff8844' : '#ffcc00';
      html += `<div style="color:${urgentColor};font-size:11px;margin-top:8px;font-weight:bold;">TIME: ${mins}:${String(secs).padStart(2, '0')}</div>`;
    }

    this._objectiveTrackerEl.innerHTML = html;
  }

  hideObjectiveTracker() {
    if (this._objectiveTrackerEl) {
      this._objectiveTrackerEl.remove();
      this._objectiveTrackerEl = null;
    }
  }

  // ─── Dialogue Display ─────────────────────────────────────────

  showDialogue() {
    if (this._dialogueEl) return;

    this._dialogueEl = document.createElement('div');
    this._dialogueEl.id = 'campaign-dialogue';
    this._dialogueEl.className = 'hidden';
    this._dialogueEl.style.cssText = `
      position: fixed; bottom: 80px; left: 50%; transform: translateX(-50%);
      background: rgba(10, 15, 30, 0.92);
      border: 1px solid rgba(0, 255, 65, 0.3);
      border-radius: 6px;
      padding: 14px 20px;
      font-family: 'Courier New', monospace;
      z-index: 600;
      max-width: 600px; width: 80%;
      pointer-events: none;
    `;
    document.body.appendChild(this._dialogueEl);
  }

  updateDialogue() {
    const engine = this.campaignManager.missionEngine;
    if (!engine) return;

    if (!this._dialogueEl) {
      this.showDialogue();
    }

    if (engine.currentDialogue) {
      this._dialogueEl.classList.remove('hidden');
      this._dialogueEl.innerHTML = `
        <div style="color:#00ff41;font-size:11px;font-weight:bold;margin-bottom:4px;text-transform:uppercase;letter-spacing:1px;">
          ${engine.currentDialogue.speaker || 'Command'}
        </div>
        <div style="color:#ccc;font-size:13px;line-height:1.4;">
          ${engine.currentDialogue.text}
        </div>
      `;
    } else {
      this._dialogueEl.classList.add('hidden');
    }
  }

  hideDialogue() {
    if (this._dialogueEl) {
      this._dialogueEl.remove();
      this._dialogueEl = null;
    }
  }

  // ─── Mission Complete Screen ──────────────────────────────────

  showMissionComplete(data) {
    this.hideObjectiveTracker();
    this.hideDialogue();

    if (!this._missionCompleteEl) {
      this._createMissionCompleteEl();
    }

    const mission = this.campaignManager.getMission(data.missionId);
    const starsStr = '★'.repeat(data.stars) + '☆'.repeat(3 - data.stars);
    const mins = Math.floor(data.stats.elapsed / 60);
    const secs = Math.floor(data.stats.elapsed % 60);
    const nextMission = data.nextMissionId ? this.campaignManager.getMission(data.nextMissionId) : null;

    const content = this._missionCompleteEl.querySelector('#mission-complete-content');
    content.innerHTML = `
      <h2 style="color:#00ff41;font-size:32px;text-align:center;margin-bottom:5px;text-transform:uppercase;letter-spacing:3px;">
        MISSION COMPLETE
      </h2>
      <div style="text-align:center;color:#ffcc00;font-size:36px;margin:10px 0;">${starsStr}</div>
      <h3 style="color:#ccc;text-align:center;font-size:18px;margin-bottom:20px;">
        ${mission ? mission.name : 'Mission'}
      </h3>
      <div style="display:flex;justify-content:center;gap:30px;margin-bottom:20px;">
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Time</div>
          <div style="color:#ccc;font-size:16px;">${mins}:${String(secs).padStart(2, '0')}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Enemies Killed</div>
          <div style="color:#ccc;font-size:16px;">${data.stats.enemiesKilled}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Units Lost</div>
          <div style="color:#ccc;font-size:16px;">${data.stats.unitsLost}</div>
        </div>
      </div>
      <div style="display:flex;justify-content:center;gap:20px;margin-bottom:20px;">
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Primary Objectives</div>
          <div style="color:#00ff44;font-size:14px;">${data.stats.primaryCompleted}/${data.stats.primaryTotal}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Secondary Objectives</div>
          <div style="color:#ffcc00;font-size:14px;">${data.stats.secondaryCompleted}/${data.stats.secondaryTotal}</div>
        </div>
      </div>
      <div style="text-align:center;margin-top:25px;display:flex;gap:10px;justify-content:center;">
        ${nextMission ? `
          <button id="mc-next-btn" style="padding:12px 30px;background:rgba(0,255,65,0.15);border:2px solid #00ff41;border-radius:4px;color:#00ff41;cursor:pointer;font-family:inherit;font-size:14px;font-weight:bold;letter-spacing:1px;">
            NEXT MISSION
          </button>
        ` : ''}
        <button id="mc-replay-btn" style="padding:12px 30px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#ccc;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;">
          REPLAY
        </button>
        <button id="mc-campaign-btn" style="padding:12px 30px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#aaa;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;">
          CAMPAIGN MAP
        </button>
      </div>
    `;

    // Wire buttons
    const nextBtn = content.querySelector('#mc-next-btn');
    if (nextBtn && nextMission) {
      nextBtn.addEventListener('click', () => {
        this._missionCompleteEl.classList.add('hidden');
        this.game.restart();
        this.showBriefing(nextMission);
      });
    }

    content.querySelector('#mc-replay-btn')?.addEventListener('click', () => {
      this._missionCompleteEl.classList.add('hidden');
      this.game.restart();
      if (mission) this.showBriefing(mission);
    });

    content.querySelector('#mc-campaign-btn')?.addEventListener('click', () => {
      this._missionCompleteEl.classList.add('hidden');
      this.game.restart();
      this.showCampaignSelect();
    });

    this._missionCompleteEl.classList.remove('hidden');
  }

  showMissionFailed(data) {
    this.hideObjectiveTracker();
    this.hideDialogue();

    if (!this._missionCompleteEl) {
      this._createMissionCompleteEl();
    }

    const mission = this.campaignManager.getMission(data.missionId);
    const mins = Math.floor(data.stats.elapsed / 60);
    const secs = Math.floor(data.stats.elapsed % 60);

    // Find which objectives failed or were incomplete
    const engine = this.campaignManager.missionEngine;
    const failedObjs = engine ? engine.objectives.filter(o => o.priority === 'primary' && o.status !== 'completed') : [];

    const content = this._missionCompleteEl.querySelector('#mission-complete-content');
    content.innerHTML = `
      <h2 style="color:#ff4444;font-size:32px;text-align:center;margin-bottom:5px;text-transform:uppercase;letter-spacing:3px;">
        MISSION FAILED
      </h2>
      <h3 style="color:#888;text-align:center;font-size:18px;margin-bottom:20px;">
        ${mission ? mission.name : 'Mission'}
      </h3>
      <div style="display:flex;justify-content:center;gap:30px;margin-bottom:20px;">
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Time Survived</div>
          <div style="color:#ccc;font-size:16px;">${mins}:${String(secs).padStart(2, '0')}</div>
        </div>
        <div style="text-align:center;">
          <div style="color:#888;font-size:11px;">Enemies Killed</div>
          <div style="color:#ccc;font-size:16px;">${data.stats.enemiesKilled}</div>
        </div>
      </div>
      ${failedObjs.length > 0 ? `
        <div style="margin-bottom:15px;">
          <div style="color:#ff6644;font-size:12px;text-align:center;margin-bottom:5px;">Incomplete Objectives:</div>
          ${failedObjs.map(o => `
            <div style="color:#ff8866;font-size:11px;text-align:center;">&#10007; ${o.name}</div>
          `).join('')}
        </div>
      ` : ''}
      <div style="text-align:center;margin-top:25px;display:flex;gap:10px;justify-content:center;">
        <button id="mc-retry-btn" style="padding:12px 30px;background:rgba(255,68,68,0.15);border:2px solid #ff4444;border-radius:4px;color:#ff4444;cursor:pointer;font-family:inherit;font-size:14px;font-weight:bold;letter-spacing:1px;">
          RETRY
        </button>
        <button id="mc-campaign-btn2" style="padding:12px 30px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#aaa;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;">
          CAMPAIGN MAP
        </button>
      </div>
    `;

    content.querySelector('#mc-retry-btn')?.addEventListener('click', () => {
      this._missionCompleteEl.classList.add('hidden');
      this.game.restart();
      if (mission) this.showBriefing(mission);
    });

    content.querySelector('#mc-campaign-btn2')?.addEventListener('click', () => {
      this._missionCompleteEl.classList.add('hidden');
      this.game.restart();
      this.showCampaignSelect();
    });

    this._missionCompleteEl.classList.remove('hidden');
  }

  _createMissionCompleteEl() {
    this._missionCompleteEl = document.createElement('div');
    this._missionCompleteEl.id = 'campaign-mission-complete';
    this._missionCompleteEl.className = 'hidden';
    this._missionCompleteEl.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 15, 30, 0.95);
      display: flex; align-items: center; justify-content: center;
      z-index: 2000; font-family: 'Courier New', monospace;
    `;
    this._missionCompleteEl.innerHTML = `
      <div id="mission-complete-content" style="max-width:600px;width:90%;padding:30px;"></div>
    `;
    document.body.appendChild(this._missionCompleteEl);
  }

  // ─── Helpers ──────────────────────────────────────────────────

  _hideCampaignScreens() {
    if (this._campaignSelectEl) this._campaignSelectEl.classList.add('hidden');
    if (this._briefingEl) this._briefingEl.classList.add('hidden');
    if (this._missionCompleteEl) this._missionCompleteEl.classList.add('hidden');
  }

  /**
   * Update called each frame during campaign play.
   */
  update() {
    this.updateObjectiveTracker();
    this.updateDialogue();
  }

  /**
   * Clean up all campaign UI elements.
   */
  destroy() {
    this.hideObjectiveTracker();
    this.hideDialogue();
    this._hideCampaignScreens();
    if (this._campaignSelectEl) {
      this._campaignSelectEl.remove();
      this._campaignSelectEl = null;
    }
    if (this._briefingEl) {
      this._briefingEl.remove();
      this._briefingEl = null;
    }
    if (this._missionCompleteEl) {
      this._missionCompleteEl.remove();
      this._missionCompleteEl = null;
    }
  }
}
