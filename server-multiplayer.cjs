/**
 * Warzone Multiplayer Server
 *
 * WebSocket game server supporting deterministic lockstep networking for 1v1 RTS.
 * Also serves static files on port 8000.
 *
 * Protocol:
 *   Client -> Server messages: { type, ...payload }
 *   Server -> Client messages: { type, ...payload }
 *
 * Room lifecycle: WAITING -> COUNTDOWN -> PLAYING -> FINISHED
 * Lockstep: server collects commands from both players per turn,
 *   then broadcasts both command sets when both are received.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let WebSocket, WebSocketServer;
try {
  const ws = require('ws');
  WebSocket = ws.WebSocket || ws;
  WebSocketServer = ws.WebSocketServer || ws.Server;
} catch (e) {
  console.error('Missing "ws" package. Run: npm install ws');
  process.exit(1);
}

// ---------------------------------------------------------------------------
// Configuration
// ---------------------------------------------------------------------------
const PORT = process.env.PORT || 8000;
const TURN_INTERVAL_MS = 100;         // 10 turns per second
const TURN_TIMEOUT_MS = 2000;         // wait 2s max for a player's commands
const COUNTDOWN_SECONDS = 5;
const RECONNECT_WINDOW_MS = 60000;    // 60s to reconnect
const MAX_ROOMS = 100;
const MAX_SPECTATORS = 8;
const ROOM_CODE_LENGTH = 6;
const PING_INTERVAL_MS = 5000;
const MAX_COMMAND_SIZE = 8192;        // max bytes per command message

// ---------------------------------------------------------------------------
// MIME types for static file serving
// ---------------------------------------------------------------------------
const MIME_TYPES = {
  '.html': 'text/html',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.glb': 'model/gltf-binary',
  '.gltf': 'model/gltf+json',
  '.bin': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

// ---------------------------------------------------------------------------
// Room state
// ---------------------------------------------------------------------------
const ROOM_STATES = {
  WAITING: 'WAITING',
  COUNTDOWN: 'COUNTDOWN',
  PLAYING: 'PLAYING',
  PAUSED: 'PAUSED',
  FINISHED: 'FINISHED',
};

// ---------------------------------------------------------------------------
// Utility
// ---------------------------------------------------------------------------
function generateRoomCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no I,O,0,1 to avoid confusion
  let code = '';
  const bytes = crypto.randomBytes(ROOM_CODE_LENGTH);
  for (let i = 0; i < ROOM_CODE_LENGTH; i++) {
    code += chars[bytes[i] % chars.length];
  }
  return code;
}

function generatePlayerId() {
  return crypto.randomBytes(16).toString('hex');
}

function now() {
  return Date.now();
}

// ---------------------------------------------------------------------------
// Rooms store
// ---------------------------------------------------------------------------
const rooms = new Map(); // code -> Room

class Room {
  constructor(code, options = {}) {
    this.code = code;
    this.name = options.name || `Game ${code}`;
    this.state = ROOM_STATES.WAITING;
    this.createdAt = now();
    this.options = {
      mapTemplate: options.mapTemplate || 'continental',
      gameMode: options.gameMode || 'annihilation',
      mapSeed: options.mapSeed || Math.floor(Math.random() * 999999),
    };

    // Players: slots 0 and 1
    this.players = [null, null]; // { id, ws, nation, name, connected, disconnectedAt }
    this.spectators = [];        // { id, ws, name }

    // Lockstep state
    this.currentTurn = 0;
    this.turnCommands = new Map(); // turnNumber -> { 0: commands, 1: commands }
    this.turnTimer = null;
    this.turnTimeout = null;
    this.countdownTimer = null;
    this.pausedAt = null;
    this.pauseReason = null;
  }

  get playerCount() {
    return this.players.filter(p => p !== null).length;
  }

  get isFull() {
    return this.playerCount >= 2;
  }

  getSlot(playerId) {
    return this.players.findIndex(p => p && p.id === playerId);
  }

  addPlayer(ws, name, nation, requestedSlot) {
    let slot = -1;
    if (requestedSlot !== undefined && this.players[requestedSlot] === null) {
      slot = requestedSlot;
    } else {
      slot = this.players.indexOf(null);
    }
    if (slot === -1) return null;

    const player = {
      id: generatePlayerId(),
      ws,
      name: name || `Player ${slot + 1}`,
      nation: nation || null,
      connected: true,
      disconnectedAt: null,
    };
    this.players[slot] = player;
    return { slot, player };
  }

  removePlayer(slot) {
    this.players[slot] = null;
  }

  addSpectator(ws, name) {
    if (this.spectators.length >= MAX_SPECTATORS) return null;
    const spec = {
      id: generatePlayerId(),
      ws,
      name: name || `Spectator ${this.spectators.length + 1}`,
    };
    this.spectators.push(spec);
    return spec;
  }

  removeSpectator(id) {
    this.spectators = this.spectators.filter(s => s.id !== id);
  }

  // Broadcast to all players and spectators
  broadcast(msg, excludeWs = null) {
    const data = JSON.stringify(msg);
    for (const player of this.players) {
      if (player && player.ws && player.ws !== excludeWs && player.connected) {
        safeSend(player.ws, data);
      }
    }
    for (const spec of this.spectators) {
      if (spec.ws && spec.ws !== excludeWs) {
        safeSend(spec.ws, data);
      }
    }
  }

  // Send to a specific slot
  sendToSlot(slot, msg) {
    const player = this.players[slot];
    if (player && player.ws && player.connected) {
      safeSend(player.ws, JSON.stringify(msg));
    }
  }

  toJSON() {
    return {
      code: this.code,
      name: this.name,
      state: this.state,
      playerCount: this.playerCount,
      players: this.players.map(p => p ? { name: p.name, nation: p.nation, connected: p.connected } : null),
      spectatorCount: this.spectators.length,
      options: this.options,
      createdAt: this.createdAt,
    };
  }

  destroy() {
    if (this.turnTimer) clearInterval(this.turnTimer);
    if (this.turnTimeout) clearTimeout(this.turnTimeout);
    if (this.countdownTimer) clearTimeout(this.countdownTimer);
    this.turnTimer = null;
    this.turnTimeout = null;
    this.countdownTimer = null;
  }
}

// ---------------------------------------------------------------------------
// Safe WebSocket send
// ---------------------------------------------------------------------------
function safeSend(ws, data) {
  try {
    if (ws.readyState === WebSocket.OPEN) {
      ws.send(data);
    }
  } catch (e) {
    // Ignore send errors on closing sockets
  }
}

// ---------------------------------------------------------------------------
// Command validation (anti-cheat: structural only)
// ---------------------------------------------------------------------------
const VALID_COMMAND_TYPES = new Set([
  'MOVE', 'ATTACK', 'ATTACK_MOVE', 'STOP', 'HOLD',
  'BUILD', 'PRODUCE', 'CANCEL_PRODUCE',
  'ABILITY', 'RESEARCH', 'CANCEL_RESEARCH',
  'SET_RALLY', 'PATROL', 'GARRISON', 'UNLOAD',
  'RETREAT', 'STANCE', 'FORMATION',
  'WAYPOINT', 'DELETE',
]);

function validateCommands(commands) {
  if (!Array.isArray(commands)) return false;
  if (commands.length > 50) return false; // sanity cap

  for (const cmd of commands) {
    if (typeof cmd !== 'object' || cmd === null) return false;
    if (!cmd.type || !VALID_COMMAND_TYPES.has(cmd.type)) return false;
    // entityIds must be array of numbers/strings if present
    if (cmd.entityIds !== undefined) {
      if (!Array.isArray(cmd.entityIds)) return false;
    }
  }
  return true;
}

// ---------------------------------------------------------------------------
// Lockstep turn management
// ---------------------------------------------------------------------------
function startLockstep(room) {
  room.currentTurn = 0;
  room.turnCommands.clear();

  room.turnTimer = setInterval(() => {
    advanceTurn(room);
  }, TURN_INTERVAL_MS);
}

function advanceTurn(room) {
  if (room.state !== ROOM_STATES.PLAYING) return;

  const turnNum = room.currentTurn;

  // Check if we already have both commands for this turn
  const turnData = room.turnCommands.get(turnNum);
  if (turnData && turnData[0] !== undefined && turnData[1] !== undefined) {
    broadcastTurn(room, turnNum, turnData);
    room.turnCommands.delete(turnNum);
    room.currentTurn++;
    return;
  }

  // Set a timeout - if we don't have both commands, send what we have with empties
  if (!room.turnTimeout) {
    room.turnTimeout = setTimeout(() => {
      room.turnTimeout = null;
      const td = room.turnCommands.get(turnNum) || {};
      if (td[0] === undefined) td[0] = [];
      if (td[1] === undefined) td[1] = [];
      broadcastTurn(room, turnNum, td);
      room.turnCommands.delete(turnNum);
      room.currentTurn++;
    }, TURN_TIMEOUT_MS);
  }
}

function receiveCommands(room, slot, turnNum, commands) {
  // Only accept commands for the current turn or next turn
  if (turnNum < room.currentTurn || turnNum > room.currentTurn + 1) {
    return; // stale or too far ahead
  }

  if (!room.turnCommands.has(turnNum)) {
    room.turnCommands.set(turnNum, {});
  }
  const turnData = room.turnCommands.get(turnNum);
  turnData[slot] = commands;

  // If both players submitted for the current turn, broadcast immediately
  if (turnNum === room.currentTurn && turnData[0] !== undefined && turnData[1] !== undefined) {
    if (room.turnTimeout) {
      clearTimeout(room.turnTimeout);
      room.turnTimeout = null;
    }
    broadcastTurn(room, turnNum, turnData);
    room.turnCommands.delete(turnNum);
    room.currentTurn++;
  }
}

function broadcastTurn(room, turnNum, turnData) {
  const msg = {
    type: 'turn',
    turn: turnNum,
    commands: {
      0: turnData[0] || [],
      1: turnData[1] || [],
    },
  };
  room.broadcast(msg);
}

// ---------------------------------------------------------------------------
// Room lifecycle
// ---------------------------------------------------------------------------
function startCountdown(room) {
  room.state = ROOM_STATES.COUNTDOWN;
  let remaining = COUNTDOWN_SECONDS;

  room.broadcast({
    type: 'countdown',
    seconds: remaining,
  });

  const tick = () => {
    remaining--;
    if (remaining <= 0) {
      startGame(room);
    } else {
      room.broadcast({ type: 'countdown', seconds: remaining });
      room.countdownTimer = setTimeout(tick, 1000);
    }
  };
  room.countdownTimer = setTimeout(tick, 1000);
}

function startGame(room) {
  room.state = ROOM_STATES.PLAYING;
  room.broadcast({
    type: 'game_start',
    options: room.options,
    players: room.players.map(p => p ? { name: p.name, nation: p.nation } : null),
  });
  startLockstep(room);
}

function pauseGame(room, reason) {
  if (room.state !== ROOM_STATES.PLAYING) return;
  room.state = ROOM_STATES.PAUSED;
  room.pausedAt = now();
  room.pauseReason = reason;
  if (room.turnTimer) clearInterval(room.turnTimer);
  room.turnTimer = null;
  if (room.turnTimeout) clearTimeout(room.turnTimeout);
  room.turnTimeout = null;
  room.broadcast({ type: 'game_paused', reason });
}

function resumeGame(room) {
  if (room.state !== ROOM_STATES.PAUSED) return;
  room.state = ROOM_STATES.PLAYING;
  room.pausedAt = null;
  room.pauseReason = null;
  room.broadcast({ type: 'game_resumed' });
  startLockstep(room);
}

function endGame(room, winnerSlot, reason) {
  room.state = ROOM_STATES.FINISHED;
  room.destroy();
  room.broadcast({
    type: 'game_over',
    winner: winnerSlot,
    reason,
  });

  // Clean up room after a delay
  setTimeout(() => {
    rooms.delete(room.code);
  }, 30000);
}

function handleDisconnect(room, slot) {
  const player = room.players[slot];
  if (!player) return;

  player.connected = false;
  player.disconnectedAt = now();
  player.ws = null;

  if (room.state === ROOM_STATES.PLAYING || room.state === ROOM_STATES.PAUSED) {
    pauseGame(room, `${player.name} disconnected. Waiting for reconnect...`);

    // Auto-forfeit after reconnect window
    setTimeout(() => {
      if (room.players[slot] && !room.players[slot].connected) {
        const otherSlot = slot === 0 ? 1 : 0;
        endGame(room, otherSlot, `${player.name} disconnected (timeout)`);
      }
    }, RECONNECT_WINDOW_MS);
  } else if (room.state === ROOM_STATES.WAITING || room.state === ROOM_STATES.COUNTDOWN) {
    if (room.countdownTimer) {
      clearTimeout(room.countdownTimer);
      room.countdownTimer = null;
    }
    room.state = ROOM_STATES.WAITING;
    room.removePlayer(slot);
    room.broadcast({
      type: 'player_left',
      slot,
      name: player.name,
    });

    // Remove empty rooms
    if (room.playerCount === 0) {
      room.destroy();
      rooms.delete(room.code);
    }
  }
}

function handleReconnect(room, slot, ws) {
  const player = room.players[slot];
  if (!player) return false;

  player.ws = ws;
  player.connected = true;
  player.disconnectedAt = null;

  // Send reconnect state
  safeSend(ws, JSON.stringify({
    type: 'reconnected',
    slot,
    room: room.toJSON(),
    currentTurn: room.currentTurn,
  }));

  room.broadcast({
    type: 'player_reconnected',
    slot,
    name: player.name,
  }, ws);

  // Resume if both players are connected
  if (room.state === ROOM_STATES.PAUSED &&
      room.players[0]?.connected && room.players[1]?.connected) {
    resumeGame(room);
  }

  return true;
}

// ---------------------------------------------------------------------------
// WebSocket message handler
// ---------------------------------------------------------------------------
function handleMessage(ws, raw) {
  let msg;
  try {
    if (raw.length > MAX_COMMAND_SIZE) {
      safeSend(ws, JSON.stringify({ type: 'error', message: 'Message too large' }));
      return;
    }
    msg = JSON.parse(raw);
  } catch (e) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Invalid JSON' }));
    return;
  }

  if (!msg || !msg.type) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Missing message type' }));
    return;
  }

  switch (msg.type) {
    case 'list_rooms':
      handleListRooms(ws);
      break;

    case 'create_room':
      handleCreateRoom(ws, msg);
      break;

    case 'join_room':
      handleJoinRoom(ws, msg);
      break;

    case 'spectate_room':
      handleSpectateRoom(ws, msg);
      break;

    case 'set_nation':
      handleSetNation(ws, msg);
      break;

    case 'ready':
      handleReady(ws, msg);
      break;

    case 'commands':
      handleCommands(ws, msg);
      break;

    case 'chat':
      handleChat(ws, msg);
      break;

    case 'reconnect':
      handleReconnectRequest(ws, msg);
      break;

    case 'leave':
      handleLeave(ws);
      break;

    case 'surrender':
      handleSurrender(ws);
      break;

    case 'webrtc_offer':
    case 'webrtc_answer':
    case 'webrtc_ice':
      handleWebRTCRelay(ws, msg);
      break;

    case 'ping':
      safeSend(ws, JSON.stringify({ type: 'pong', time: msg.time, serverTime: now() }));
      break;

    default:
      safeSend(ws, JSON.stringify({ type: 'error', message: `Unknown message type: ${msg.type}` }));
  }
}

// ---------------------------------------------------------------------------
// Message handlers
// ---------------------------------------------------------------------------
function handleListRooms(ws) {
  const list = [];
  for (const room of rooms.values()) {
    if (room.state === ROOM_STATES.WAITING || room.state === ROOM_STATES.COUNTDOWN) {
      list.push(room.toJSON());
    }
  }
  safeSend(ws, JSON.stringify({ type: 'room_list', rooms: list }));
}

function handleCreateRoom(ws, msg) {
  if (rooms.size >= MAX_ROOMS) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Server full, try again later' }));
    return;
  }

  let code;
  do {
    code = generateRoomCode();
  } while (rooms.has(code));

  const room = new Room(code, {
    name: msg.name,
    mapTemplate: msg.mapTemplate,
    gameMode: msg.gameMode,
    mapSeed: msg.mapSeed,
  });

  const result = room.addPlayer(ws, msg.playerName, msg.nation);
  if (!result) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Failed to create room' }));
    return;
  }

  rooms.set(code, room);

  // Tag the ws so we can find the player on disconnect
  ws._roomCode = code;
  ws._playerId = result.player.id;
  ws._slot = result.slot;

  safeSend(ws, JSON.stringify({
    type: 'room_created',
    room: room.toJSON(),
    slot: result.slot,
    playerId: result.player.id,
  }));
}

function handleJoinRoom(ws, msg) {
  const code = (msg.code || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  if (room.state !== ROOM_STATES.WAITING) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Game already in progress' }));
    return;
  }

  if (room.isFull) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Room is full' }));
    return;
  }

  const result = room.addPlayer(ws, msg.playerName, msg.nation);
  if (!result) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Could not join room' }));
    return;
  }

  ws._roomCode = code;
  ws._playerId = result.player.id;
  ws._slot = result.slot;

  safeSend(ws, JSON.stringify({
    type: 'room_joined',
    room: room.toJSON(),
    slot: result.slot,
    playerId: result.player.id,
  }));

  // Notify other player
  room.broadcast({
    type: 'player_joined',
    slot: result.slot,
    name: result.player.name,
    nation: result.player.nation,
  }, ws);
}

function handleSpectateRoom(ws, msg) {
  const code = (msg.code || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  const spec = room.addSpectator(ws, msg.playerName);
  if (!spec) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'No spectator slots available' }));
    return;
  }

  ws._roomCode = code;
  ws._playerId = spec.id;
  ws._slot = -1; // spectator

  safeSend(ws, JSON.stringify({
    type: 'spectating',
    room: room.toJSON(),
    currentTurn: room.currentTurn,
  }));

  room.broadcast({
    type: 'spectator_joined',
    name: spec.name,
  }, ws);
}

function handleSetNation(ws, msg) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;
  const slot = ws._slot;
  if (slot < 0 || !room.players[slot]) return;
  if (room.state !== ROOM_STATES.WAITING) return;

  room.players[slot].nation = msg.nation;
  room.broadcast({
    type: 'nation_changed',
    slot,
    nation: msg.nation,
  });
}

function handleReady(ws, msg) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;
  if (room.state !== ROOM_STATES.WAITING) return;

  // Both players must be present with nations selected
  if (!room.isFull) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Waiting for opponent' }));
    return;
  }

  if (!room.players[0].nation || !room.players[1].nation) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Both players must select a nation' }));
    return;
  }

  startCountdown(room);
}

function handleCommands(ws, msg) {
  const room = rooms.get(ws._roomCode);
  if (!room || room.state !== ROOM_STATES.PLAYING) return;

  const slot = ws._slot;
  if (slot < 0 || slot > 1) return;

  const turnNum = msg.turn;
  if (typeof turnNum !== 'number') return;

  const commands = msg.commands || [];
  if (!validateCommands(commands)) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Invalid commands' }));
    return;
  }

  receiveCommands(room, slot, turnNum, commands);
}

function handleChat(ws, msg) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;

  const text = (msg.text || '').slice(0, 500); // limit chat length
  if (!text) return;

  const slot = ws._slot;
  const player = slot >= 0 ? room.players[slot] : null;
  const name = player ? player.name : 'Spectator';

  room.broadcast({
    type: 'chat',
    slot,
    name,
    text,
    time: now(),
  });
}

function handleReconnectRequest(ws, msg) {
  const code = (msg.code || '').toUpperCase().trim();
  const room = rooms.get(code);

  if (!room) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Room not found' }));
    return;
  }

  const playerId = msg.playerId;
  const slot = room.getSlot(playerId);

  if (slot < 0) {
    safeSend(ws, JSON.stringify({ type: 'error', message: 'Player not found in room' }));
    return;
  }

  ws._roomCode = code;
  ws._playerId = playerId;
  ws._slot = slot;

  handleReconnect(room, slot, ws);
}

function handleLeave(ws) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;

  const slot = ws._slot;
  if (slot >= 0 && slot <= 1) {
    if (room.state === ROOM_STATES.PLAYING || room.state === ROOM_STATES.PAUSED) {
      // Surrender on leave during game
      const otherSlot = slot === 0 ? 1 : 0;
      endGame(room, otherSlot, `${room.players[slot]?.name || 'Player'} left the game`);
    } else {
      handleDisconnect(room, slot);
    }
  } else {
    // Spectator leave
    room.removeSpectator(ws._playerId);
    room.broadcast({
      type: 'spectator_left',
      name: 'Spectator',
    });
  }

  ws._roomCode = null;
  ws._playerId = null;
  ws._slot = null;
}

function handleSurrender(ws) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;
  if (room.state !== ROOM_STATES.PLAYING && room.state !== ROOM_STATES.PAUSED) return;

  const slot = ws._slot;
  if (slot < 0 || slot > 1) return;

  const otherSlot = slot === 0 ? 1 : 0;
  endGame(room, otherSlot, `${room.players[slot]?.name || 'Player'} surrendered`);
}

/**
 * Relay WebRTC signaling messages (offer, answer, ICE candidates) to the other
 * player in the same room. No data is stored server-side.
 */
function handleWebRTCRelay(ws, msg) {
  const room = rooms.get(ws._roomCode);
  if (!room) return;

  const slot = ws._slot;
  if (slot < 0 || slot > 1) return;

  const otherSlot = slot === 0 ? 1 : 0;
  room.sendToSlot(otherSlot, {
    type: msg.type,
    payload: msg.payload,
  });
}

// ---------------------------------------------------------------------------
// HTTP static file server
// ---------------------------------------------------------------------------
const httpServer = http.createServer((req, res) => {
  // API endpoint for room list (for lobby browser)
  if (req.url === '/api/rooms') {
    const list = [];
    for (const room of rooms.values()) {
      if (room.state === ROOM_STATES.WAITING || room.state === ROOM_STATES.COUNTDOWN) {
        list.push(room.toJSON());
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ rooms: list }));
    return;
  }

  // API endpoint for server status
  if (req.url === '/api/status') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      rooms: rooms.size,
      players: [...rooms.values()].reduce((n, r) => n + r.playerCount, 0),
      uptime: process.uptime(),
    }));
    return;
  }

  // Static file serving
  let filePath = path.join(__dirname, req.url === '/' ? 'index.html' : req.url);

  // Prevent directory traversal
  const resolved = path.resolve(filePath);
  if (!resolved.startsWith(path.resolve(__dirname))) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  const ext = path.extname(filePath);
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    res.writeHead(200, {
      'Content-Type': contentType,
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
    });
    res.end(data);
  });
});

// ---------------------------------------------------------------------------
// WebSocket server (same port via HTTP upgrade)
// ---------------------------------------------------------------------------
const wss = new WebSocketServer({ server: httpServer });

wss.on('connection', (ws) => {
  ws._roomCode = null;
  ws._playerId = null;
  ws._slot = null;
  ws._alive = true;

  ws.on('message', (raw) => {
    handleMessage(ws, raw.toString());
  });

  ws.on('close', () => {
    if (ws._roomCode) {
      const room = rooms.get(ws._roomCode);
      if (room) {
        const slot = ws._slot;
        if (slot >= 0 && slot <= 1) {
          handleDisconnect(room, slot);
        } else {
          room.removeSpectator(ws._playerId);
        }
      }
    }
  });

  ws.on('pong', () => {
    ws._alive = true;
  });

  ws.on('error', () => {
    // Handled by close event
  });
});

// Heartbeat to detect stale connections
const heartbeat = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (!ws._alive) {
      ws.terminate();
      return;
    }
    ws._alive = false;
    ws.ping();
  });
}, PING_INTERVAL_MS);

wss.on('close', () => {
  clearInterval(heartbeat);
});

// ---------------------------------------------------------------------------
// Cleanup stale rooms periodically
// ---------------------------------------------------------------------------
setInterval(() => {
  const staleThreshold = now() - 3600000; // 1 hour
  for (const [code, room] of rooms) {
    if (room.state === ROOM_STATES.FINISHED && room.createdAt < staleThreshold) {
      room.destroy();
      rooms.delete(code);
    }
    // Remove empty waiting rooms older than 10 minutes
    if (room.state === ROOM_STATES.WAITING && room.playerCount === 0 &&
        room.createdAt < now() - 600000) {
      room.destroy();
      rooms.delete(code);
    }
  }
}, 60000);

// ---------------------------------------------------------------------------
// Start
// ---------------------------------------------------------------------------
httpServer.listen(PORT, () => {
  console.log(`Warzone Multiplayer Server running at http://localhost:${PORT}`);
  console.log(`WebSocket available on ws://localhost:${PORT}`);
});

// Export for testing
if (typeof module !== 'undefined') {
  module.exports = { rooms, Room, validateCommands, generateRoomCode };
}
