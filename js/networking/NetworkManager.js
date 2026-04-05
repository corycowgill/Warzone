/**
 * NetworkManager - Client-side WebSocket networking for multiplayer
 *
 * Handles connection to the multiplayer server, room management,
 * command relay, chat, and reconnection logic.
 */

export class NetworkManager {
  constructor() {
    this.ws = null;
    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.slot = -1;     // 0 or 1 for players, -1 for spectator
    this.serverUrl = null;

    // Callbacks
    this._onConnect = null;
    this._onDisconnect = null;
    this._onError = null;
    this._onRoomCreated = null;
    this._onRoomJoined = null;
    this._onPlayerJoined = null;
    this._onPlayerLeft = null;
    this._onNationChanged = null;
    this._onCountdown = null;
    this._onGameStart = null;
    this._onTurnReceived = null;
    this._onChat = null;
    this._onGamePaused = null;
    this._onGameResumed = null;
    this._onGameOver = null;
    this._onPlayerReconnected = null;
    this._onRoomList = null;
    this._onReconnected = null;
    this._onError = null;

    // WebRTC signaling callbacks
    this._onWebRTCOffer = null;
    this._onWebRTCAnswer = null;
    this._onWebRTCIce = null;

    // Ping/latency
    this._pingTimer = null;
    this._pingStart = 0;
    this.latency = 0;        // one-way estimate in ms
    this.roundTrip = 0;      // full round-trip ms

    // Reconnection
    this._reconnectAttempts = 0;
    this._maxReconnectAttempts = 10;
    this._reconnectDelay = 1000;
    this._reconnecting = false;
    this._shouldReconnect = false;
  }

  // -------------------------------------------------------------------------
  // Connection
  // -------------------------------------------------------------------------

  /**
   * Connect to the multiplayer server.
   * @param {string} [url] - WebSocket URL. Defaults to current host.
   * @returns {Promise<void>}
   */
  connect(url) {
    return new Promise((resolve, reject) => {
      if (this.ws && this.ws.readyState === WebSocket.OPEN) {
        resolve();
        return;
      }

      // Derive server URL from current page if not provided
      if (!url) {
        const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
        url = `${protocol}//${window.location.host}`;
      }
      this.serverUrl = url;

      try {
        this.ws = new WebSocket(url);
      } catch (e) {
        reject(e);
        return;
      }

      this.ws.onopen = () => {
        this.connected = true;
        this._reconnectAttempts = 0;
        this._shouldReconnect = true;
        this._startPing();
        if (this._onConnect) this._onConnect();
        resolve();
      };

      this.ws.onclose = () => {
        this.connected = false;
        this._stopPing();
        if (this._onDisconnect) this._onDisconnect();

        if (this._shouldReconnect && !this._reconnecting) {
          this._attemptReconnect();
        }
      };

      this.ws.onerror = (err) => {
        if (this._onError) this._onError(err);
        // If not connected yet, reject the promise
        if (!this.connected) {
          reject(new Error('WebSocket connection failed'));
        }
      };

      this.ws.onmessage = (event) => {
        this._handleMessage(event.data);
      };
    });
  }

  /**
   * Disconnect cleanly from the server.
   */
  disconnect() {
    this._shouldReconnect = false;
    this._stopPing();

    if (this.ws) {
      this._send({ type: 'leave' });
      this.ws.close();
      this.ws = null;
    }

    this.connected = false;
    this.roomCode = null;
    this.playerId = null;
    this.slot = -1;
  }

  // -------------------------------------------------------------------------
  // Room management
  // -------------------------------------------------------------------------

  /**
   * Create a new game room.
   * @param {Object} options
   * @param {string} [options.name] - Room name
   * @param {string} [options.playerName] - Your display name
   * @param {string} [options.nation] - Your nation choice
   * @param {string} [options.mapTemplate] - Map template
   * @param {string} [options.gameMode] - Game mode
   * @param {number} [options.mapSeed] - Map seed
   * @returns {Promise<Object>} Room info with code
   */
  createRoom(options = {}) {
    return new Promise((resolve, reject) => {
      this._onRoomCreated = (data) => {
        this._onRoomCreated = null;
        resolve(data);
      };
      const errorHandler = this._onError;
      this._onError = (err) => {
        this._onError = errorHandler;
        reject(err);
      };
      this._send({
        type: 'create_room',
        name: options.name,
        playerName: options.playerName,
        nation: options.nation,
        mapTemplate: options.mapTemplate,
        gameMode: options.gameMode,
        mapSeed: options.mapSeed,
      });
    });
  }

  /**
   * Join an existing room by code.
   * @param {string} code - Room code
   * @param {Object} [options]
   * @param {string} [options.playerName] - Your display name
   * @param {string} [options.nation] - Your nation choice
   * @returns {Promise<Object>} Room info
   */
  joinRoom(code, options = {}) {
    return new Promise((resolve, reject) => {
      this._onRoomJoined = (data) => {
        this._onRoomJoined = null;
        resolve(data);
      };
      const errorHandler = this._onError;
      this._onError = (err) => {
        this._onError = errorHandler;
        reject(err);
      };
      this._send({
        type: 'join_room',
        code,
        playerName: options.playerName,
        nation: options.nation,
      });
    });
  }

  /**
   * Spectate a room.
   * @param {string} code - Room code
   * @param {string} [playerName] - Display name
   */
  spectateRoom(code, playerName) {
    this._send({
      type: 'spectate_room',
      code,
      playerName,
    });
  }

  /**
   * Request the list of joinable rooms.
   * @returns {Promise<Array>}
   */
  listRooms() {
    return new Promise((resolve) => {
      this._onRoomList = (list) => {
        this._onRoomList = null;
        resolve(list);
      };
      this._send({ type: 'list_rooms' });
    });
  }

  /**
   * Set your nation in the lobby.
   * @param {string} nation
   */
  setNation(nation) {
    this._send({ type: 'set_nation', nation });
  }

  /**
   * Signal ready to start (host only, both players must be present).
   */
  ready() {
    this._send({ type: 'ready' });
  }

  /**
   * Surrender the current game.
   */
  surrender() {
    this._send({ type: 'surrender' });
  }

  // -------------------------------------------------------------------------
  // Game commands (lockstep)
  // -------------------------------------------------------------------------

  /**
   * Send commands for a specific turn.
   * @param {number} turnNumber
   * @param {Array} commands - Array of command objects
   * @param {number|null} [hash] - State hash for desync detection
   */
  sendCommands(turnNumber, commands, hash) {
    const msg = {
      type: 'commands',
      turn: turnNumber,
      commands,
    };
    if (hash != null) {
      msg.hash = hash;
    }
    this._send(msg);
  }

  // -------------------------------------------------------------------------
  // Chat
  // -------------------------------------------------------------------------

  /**
   * Send a chat message.
   * @param {string} text
   */
  sendChat(text) {
    this._send({ type: 'chat', text });
  }

  // -------------------------------------------------------------------------
  // WebRTC signaling
  // -------------------------------------------------------------------------

  /**
   * Send a WebRTC SDP offer to the remote peer (relayed via server).
   * @param {Object} sdp - RTCSessionDescription as JSON
   */
  sendWebRTCOffer(sdp) {
    this._send({ type: 'webrtc_offer', payload: sdp });
  }

  /**
   * Send a WebRTC SDP answer to the remote peer (relayed via server).
   * @param {Object} sdp - RTCSessionDescription as JSON
   */
  sendWebRTCAnswer(sdp) {
    this._send({ type: 'webrtc_answer', payload: sdp });
  }

  /**
   * Send a WebRTC ICE candidate to the remote peer (relayed via server).
   * @param {Object} candidate - RTCIceCandidate as JSON
   */
  sendWebRTCIce(candidate) {
    this._send({ type: 'webrtc_ice', payload: candidate });
  }

  // -------------------------------------------------------------------------
  // Event registration
  // -------------------------------------------------------------------------

  onConnect(callback) { this._onConnect = callback; }
  onDisconnect(callback) { this._onDisconnect = callback; }
  onError(callback) { this._onError = callback; }
  onPlayerJoined(callback) { this._onPlayerJoined = callback; }
  onPlayerLeft(callback) { this._onPlayerLeft = callback; }
  onNationChanged(callback) { this._onNationChanged = callback; }
  onCountdown(callback) { this._onCountdown = callback; }
  onGameStart(callback) { this._onGameStart = callback; }
  onTurnReceived(callback) { this._onTurnReceived = callback; }
  onChat(callback) { this._onChat = callback; }
  onGamePaused(callback) { this._onGamePaused = callback; }
  onGameResumed(callback) { this._onGameResumed = callback; }
  onGameOver(callback) { this._onGameOver = callback; }
  onPlayerReconnected(callback) { this._onPlayerReconnected = callback; }
  onReconnected(callback) { this._onReconnected = callback; }
  onWebRTCOffer(callback) { this._onWebRTCOffer = callback; }
  onWebRTCAnswer(callback) { this._onWebRTCAnswer = callback; }
  onWebRTCIce(callback) { this._onWebRTCIce = callback; }

  // -------------------------------------------------------------------------
  // Ping / latency
  // -------------------------------------------------------------------------

  _startPing() {
    this._stopPing();
    this._pingTimer = setInterval(() => {
      this._pingStart = performance.now();
      this._send({ type: 'ping', time: Date.now() });
    }, 5000);
  }

  _stopPing() {
    if (this._pingTimer) {
      clearInterval(this._pingTimer);
      this._pingTimer = null;
    }
  }

  // -------------------------------------------------------------------------
  // Message handling
  // -------------------------------------------------------------------------

  _handleMessage(raw) {
    let msg;
    try {
      msg = JSON.parse(raw);
    } catch (e) {
      console.warn('NetworkManager: invalid message', raw);
      return;
    }

    switch (msg.type) {
      case 'room_created':
        this.roomCode = msg.room.code;
        this.playerId = msg.playerId;
        this.slot = msg.slot;
        if (this._onRoomCreated) this._onRoomCreated(msg);
        break;

      case 'room_joined':
        this.roomCode = msg.room.code;
        this.playerId = msg.playerId;
        this.slot = msg.slot;
        if (this._onRoomJoined) this._onRoomJoined(msg);
        break;

      case 'spectating':
        this.roomCode = msg.room.code;
        this.slot = -1;
        break;

      case 'room_list':
        if (this._onRoomList) this._onRoomList(msg.rooms);
        break;

      case 'player_joined':
        if (this._onPlayerJoined) this._onPlayerJoined(msg);
        break;

      case 'player_left':
        if (this._onPlayerLeft) this._onPlayerLeft(msg);
        break;

      case 'nation_changed':
        if (this._onNationChanged) this._onNationChanged(msg);
        break;

      case 'countdown':
        if (this._onCountdown) this._onCountdown(msg.seconds);
        break;

      case 'game_start':
        if (this._onGameStart) this._onGameStart(msg);
        break;

      case 'turn':
        if (this._onTurnReceived) this._onTurnReceived(msg.turn, msg.commands);
        break;

      case 'chat':
        if (this._onChat) this._onChat(msg);
        break;

      case 'game_paused':
        if (this._onGamePaused) this._onGamePaused(msg.reason);
        break;

      case 'game_resumed':
        if (this._onGameResumed) this._onGameResumed();
        break;

      case 'game_over':
        if (this._onGameOver) this._onGameOver(msg);
        break;

      case 'player_reconnected':
        if (this._onPlayerReconnected) this._onPlayerReconnected(msg);
        break;

      case 'reconnected':
        this.roomCode = msg.room.code;
        this.slot = msg.slot;
        if (this._onReconnected) this._onReconnected(msg);
        break;

      case 'pong':
        this.roundTrip = performance.now() - this._pingStart;
        this.latency = Math.round(this.roundTrip / 2);
        break;

      case 'webrtc_offer':
        if (this._onWebRTCOffer) this._onWebRTCOffer(msg.payload);
        break;

      case 'webrtc_answer':
        if (this._onWebRTCAnswer) this._onWebRTCAnswer(msg.payload);
        break;

      case 'webrtc_ice':
        if (this._onWebRTCIce) this._onWebRTCIce(msg.payload);
        break;

      case 'error':
        console.warn('Server error:', msg.message);
        if (this._onError) this._onError(new Error(msg.message));
        break;
    }
  }

  // -------------------------------------------------------------------------
  // Reconnection
  // -------------------------------------------------------------------------

  _attemptReconnect() {
    if (this._reconnecting) return;
    if (this._reconnectAttempts >= this._maxReconnectAttempts) {
      console.warn('NetworkManager: max reconnect attempts reached');
      return;
    }

    this._reconnecting = true;
    this._reconnectAttempts++;
    const delay = Math.min(
      this._reconnectDelay * Math.pow(1.5, this._reconnectAttempts - 1),
      15000
    );

    console.log(`NetworkManager: reconnecting in ${Math.round(delay)}ms (attempt ${this._reconnectAttempts})`);

    setTimeout(async () => {
      this._reconnecting = false;
      try {
        await this.connect(this.serverUrl);
        // If we were in a room, try to rejoin
        if (this.roomCode && this.playerId) {
          this._send({
            type: 'reconnect',
            code: this.roomCode,
            playerId: this.playerId,
          });
        }
      } catch (e) {
        // Will trigger another reconnect via onclose
      }
    }, delay);
  }

  // -------------------------------------------------------------------------
  // Internal send
  // -------------------------------------------------------------------------

  _send(msg) {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
      return false;
    }
    try {
      this.ws.send(JSON.stringify(msg));
      return true;
    } catch (e) {
      return false;
    }
  }

  /**
   * Show the multiplayer lobby UI.
   * Delegates to UIManager's multiplayer screen.
   * @param {Object} [game] - Game instance to access uiManager
   */
  showLobby(game) {
    // If a game reference is provided, use its UIManager
    if (game && game.uiManager) {
      game.uiManager.showMultiplayerScreen();
    }
    // Otherwise the old inline lobby was removed; callers should use UIManager directly
  }
}
