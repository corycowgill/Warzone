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

    if (!this._campaignSelectEl) {
      this._createCampaignSelectEl();
    }

    this._populateMissionList();
    this._campaignSelectEl.classList.remove('hidden');
  }

  _createCampaignSelectEl() {
    this._campaignSelectEl = document.createElement('div');
    this._campaignSelectEl.id = 'campaign-select';
    this._campaignSelectEl.className = 'hidden';
    this._campaignSelectEl.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 15, 30, 0.97);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: 'Courier New', monospace;
    `;

    this._campaignSelectEl.innerHTML = `
      <div style="max-width:800px;width:90%;max-height:90vh;overflow-y:auto;padding:30px;">
        <h2 style="color:#00ff41;font-size:28px;text-align:center;margin-bottom:5px;text-transform:uppercase;letter-spacing:3px;">Campaign</h2>
        <div id="campaign-stars-total" style="text-align:center;color:#ffcc00;font-size:14px;margin-bottom:20px;"></div>
        <div id="campaign-difficulty-select" style="text-align:center;margin-bottom:20px;">
          <span style="color:#8a9aaa;font-size:12px;margin-right:10px;">Difficulty:</span>
          <button class="campaign-diff-btn" data-diff="easy" style="padding:6px 16px;margin:0 4px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:3px;color:#88cc88;cursor:pointer;font-family:inherit;font-size:12px;">Easy</button>
          <button class="campaign-diff-btn selected" data-diff="normal" style="padding:6px 16px;margin:0 4px;background:rgba(0,255,65,0.1);border:1px solid #00ff41;border-radius:3px;color:#ffcc44;cursor:pointer;font-family:inherit;font-size:12px;box-shadow:0 0 10px rgba(0,255,65,0.2);">Normal</button>
          <button class="campaign-diff-btn" data-diff="hard" style="padding:6px 16px;margin:0 4px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.08);border-radius:3px;color:#ff6644;cursor:pointer;font-family:inherit;font-size:12px;">Hard</button>
        </div>
        <div id="campaign-mission-list"></div>
        <div style="text-align:center;margin-top:20px;">
          <button id="campaign-back-btn" style="padding:10px 30px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#aaa;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;letter-spacing:1px;">BACK</button>
        </div>
      </div>
    `;

    document.body.appendChild(this._campaignSelectEl);

    // Difficulty buttons
    this._campaignSelectEl.querySelectorAll('.campaign-diff-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._campaignSelectEl.querySelectorAll('.campaign-diff-btn').forEach(b => {
          b.classList.remove('selected');
          b.style.background = 'rgba(22,33,62,0.6)';
          b.style.borderColor = 'rgba(255,255,255,0.08)';
          b.style.boxShadow = 'none';
        });
        btn.classList.add('selected');
        btn.style.background = 'rgba(0,255,65,0.1)';
        btn.style.borderColor = '#00ff41';
        btn.style.boxShadow = '0 0 10px rgba(0,255,65,0.2)';
        this.campaignManager.currentDifficulty = btn.dataset.diff;
      });
    });

    // Back button
    this._campaignSelectEl.querySelector('#campaign-back-btn').addEventListener('click', () => {
      this._campaignSelectEl.classList.add('hidden');
      this.game.uiManager.showMainMenu();
    });
  }

  _populateMissionList() {
    const listEl = this._campaignSelectEl.querySelector('#campaign-mission-list');
    const starsEl = this._campaignSelectEl.querySelector('#campaign-stars-total');
    listEl.innerHTML = '';

    const totalStars = this.campaignManager.getTotalStars();
    const maxStars = this.campaignManager.getMaxStars();
    starsEl.textContent = `Stars: ${'★'.repeat(totalStars)}${'☆'.repeat(maxStars - totalStars)} (${totalStars}/${maxStars})`;

    const acts = this.campaignManager.getMissionsByAct();

    for (const act of acts) {
      // Act header
      const actHeader = document.createElement('div');
      actHeader.style.cssText = 'color:#00ff41;font-size:16px;font-weight:bold;margin:20px 0 10px 0;border-bottom:1px solid rgba(0,255,65,0.2);padding-bottom:5px;';
      actHeader.textContent = act.name;
      listEl.appendChild(actHeader);

      for (const mission of act.missions) {
        const card = document.createElement('div');
        const locked = !mission.unlocked;
        const completed = mission.completed;
        const stars = mission.stars || 0;

        card.style.cssText = `
          display: flex; justify-content: space-between; align-items: center;
          padding: 12px 16px; margin-bottom: 6px;
          background: ${locked ? 'rgba(30,30,40,0.5)' : completed ? 'rgba(0,255,65,0.05)' : 'rgba(22,33,62,0.6)'};
          border: 1px solid ${locked ? 'rgba(255,255,255,0.04)' : completed ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.1)'};
          border-radius: 4px;
          cursor: ${locked ? 'default' : 'pointer'};
          opacity: ${locked ? '0.4' : '1'};
          transition: all 0.2s;
        `;

        const starsStr = '★'.repeat(stars) + '☆'.repeat(3 - stars);
        const nationColors = {
          america: '#3355ff', britain: '#33aa33', france: '#6666ff',
          germany: '#666666', japan: '#ff3333', austria: '#cc6633'
        };
        const nationColor = nationColors[mission.playerNation] || '#888';

        card.innerHTML = `
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;">
              <span style="color:${nationColor};font-size:11px;font-weight:bold;text-transform:uppercase;">${mission.playerNation}</span>
              <span style="color:${locked ? '#444' : '#ccc'};font-size:14px;font-weight:bold;">Mission ${mission.missionNumber}: ${mission.name}</span>
            </div>
            <div style="color:#666;font-size:11px;margin-top:2px;max-width:500px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">
              ${locked ? 'Complete the previous mission to unlock.' : mission.briefing.substring(0, 100) + '...'}
            </div>
          </div>
          <div style="text-align:right;min-width:80px;">
            <div style="color:#ffcc00;font-size:16px;">${locked ? '🔒' : starsStr}</div>
            ${mission.bestTime ? `<div style="color:#666;font-size:10px;">${Math.floor(mission.bestTime / 60)}:${String(Math.round(mission.bestTime % 60)).padStart(2, '0')}</div>` : ''}
          </div>
        `;

        if (!locked) {
          card.addEventListener('mouseenter', () => {
            card.style.borderColor = '#00ff41';
            card.style.background = 'rgba(0,255,65,0.08)';
          });
          card.addEventListener('mouseleave', () => {
            card.style.borderColor = completed ? 'rgba(0,255,65,0.2)' : 'rgba(255,255,255,0.1)';
            card.style.background = completed ? 'rgba(0,255,65,0.05)' : 'rgba(22,33,62,0.6)';
          });
          card.addEventListener('click', () => {
            this.showBriefing(mission);
          });
        }

        listEl.appendChild(card);
      }
    }
  }

  // ─── Briefing Screen ──────────────────────────────────────────

  showBriefing(mission) {
    this._hideCampaignScreens();

    if (!this._briefingEl) {
      this._createBriefingEl();
    }

    const nationNames = {
      america: 'America', britain: 'Great Britain', france: 'France',
      germany: 'Germany', japan: 'Japan', austria: 'Austria'
    };

    const content = this._briefingEl.querySelector('#briefing-content');
    const objectives = mission.objectives || [];
    const primaryObjs = objectives.filter(o => o.priority === 'primary' && !o.hidden);
    const secondaryObjs = objectives.filter(o => o.priority === 'secondary' && !o.hidden);

    content.innerHTML = `
      <h2 style="color:#00ff41;font-size:24px;margin-bottom:5px;text-transform:uppercase;letter-spacing:2px;">
        Mission ${mission.missionNumber}: ${mission.name}
      </h2>
      <div style="color:#888;font-size:12px;margin-bottom:15px;">
        <span style="color:#ffcc00;">Act ${mission.act}</span>
        &nbsp;|&nbsp; Play as: <span style="color:#00ff44;">${nationNames[mission.playerNation]}</span>
        &nbsp;|&nbsp; Enemy: <span style="color:#ff4444;">${nationNames[mission.enemyNation]}</span>
      </div>
      <div style="color:#aaa;font-size:13px;line-height:1.6;margin-bottom:20px;white-space:pre-wrap;">${mission.briefing}</div>
      <div style="border-top:1px solid rgba(0,255,65,0.15);padding-top:15px;">
        <h3 style="color:#00ff41;font-size:14px;margin-bottom:8px;">PRIMARY OBJECTIVES</h3>
        ${primaryObjs.map(o => `
          <div style="color:#ccc;font-size:12px;margin-bottom:4px;padding-left:10px;">
            <span style="color:#ffcc00;">&#9654;</span> ${o.name} <span style="color:#666;">- ${o.description}</span>
          </div>
        `).join('')}
        ${secondaryObjs.length > 0 ? `
          <h3 style="color:#ffcc00;font-size:14px;margin:12px 0 8px 0;">SECONDARY OBJECTIVES</h3>
          ${secondaryObjs.map(o => `
            <div style="color:#999;font-size:12px;margin-bottom:4px;padding-left:10px;">
              <span style="color:#888;">&#9655;</span> ${o.name} <span style="color:#555;">- ${o.description}</span>
            </div>
          `).join('')}
        ` : ''}
      </div>
      <div style="text-align:center;margin-top:25px;display:flex;gap:10px;justify-content:center;">
        <button id="briefing-start-btn" style="padding:12px 40px;background:rgba(0,255,65,0.15);border:2px solid #00ff41;border-radius:4px;color:#00ff41;cursor:pointer;font-family:inherit;font-size:16px;font-weight:bold;letter-spacing:2px;text-transform:uppercase;">
          DEPLOY
        </button>
        <button id="briefing-back-btn" style="padding:12px 30px;background:rgba(22,33,62,0.6);border:1px solid rgba(255,255,255,0.15);border-radius:4px;color:#aaa;cursor:pointer;font-family:inherit;font-size:14px;font-weight:600;letter-spacing:1px;">
          BACK
        </button>
      </div>
    `;

    // Wire buttons
    content.querySelector('#briefing-start-btn').addEventListener('click', () => {
      this._briefingEl.classList.add('hidden');
      this.campaignManager.startMission(mission.id, this.campaignManager.currentDifficulty);
    });
    content.querySelector('#briefing-back-btn').addEventListener('click', () => {
      this._briefingEl.classList.add('hidden');
      this.showCampaignSelect();
    });

    this._briefingEl.classList.remove('hidden');
  }

  _createBriefingEl() {
    this._briefingEl = document.createElement('div');
    this._briefingEl.id = 'campaign-briefing';
    this._briefingEl.className = 'hidden';
    this._briefingEl.style.cssText = `
      position: fixed; top: 0; left: 0; right: 0; bottom: 0;
      background: rgba(10, 15, 30, 0.97);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000; font-family: 'Courier New', monospace;
    `;
    this._briefingEl.innerHTML = `
      <div id="briefing-content" style="max-width:700px;width:90%;max-height:85vh;overflow-y:auto;padding:30px;"></div>
    `;
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
