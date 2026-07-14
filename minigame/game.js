
const canvas = wx.createCanvas();
const ctx = canvas.getContext('2d');
const systemInfo = wx.getSystemInfoSync();
const menuButton = wx.getMenuButtonBoundingClientRect ? wx.getMenuButtonBoundingClientRect() : null;
const dpr = systemInfo.pixelRatio || 1;
canvas.width = systemInfo.windowWidth * dpr;
canvas.height = systemInfo.windowHeight * dpr;
ctx.scale(dpr, dpr);

const W = systemInfo.windowWidth;
const H = systemInfo.windowHeight;
const GAME_VERSION = '2.2.0';
const safeTop = systemInfo.safeArea ? systemInfo.safeArea.top : (systemInfo.statusBarHeight || 0);
const safeBottom = systemInfo.safeArea ? Math.max(0, H - systemInfo.safeArea.bottom) : 0;
const capsuleBottom = menuButton ? menuButton.bottom : safeTop + 44;

const ASSETS = {
  bg: 'assets/minigame/ui/home_bg_mobile.jpg',
  logo: 'assets/minigame/ui/title_logo.png',
  board: 'assets/minigame/ui/board_traditional_preview.jpg',
  continueIcon: 'assets/minigame/ui/icon_continue.png',
  newIcon: 'assets/minigame/ui/icon_new_game.png',
  quickIcon: 'assets/minigame/ui/icon_quick_start.png',
  tasksIcon: 'assets/minigame/ui/icon_tasks.png',
  settingsIcon: 'assets/minigame/ui/icon_settings.png',
  taskCard: 'assets/minigame/ui/modal_task_card.png',
  kingCard: 'assets/minigame/ui/modal_king_card.png',
  planeR: 'assets/minigame/images/plane_R.png',
  planeY: 'assets/minigame/images/plane_Y.png',
  planeB: 'assets/minigame/images/plane_B.png',
  planeG: 'assets/minigame/images/plane_G.png'
};

const images = {};
let scene = 'home';
let loaded = false;
let lastRoll = '-';
let buttons = [];
let logText = '掷出 6 才能起飞';
let modal = null;
let modalQueue = [];
let settingsPage = 0;
let progressPage = 0;
let recordsPage = 0;
let recordsTab = 'players';
let rolling = false;
let rollingDiceValue = null;
let pieceAnimation = null;
let pendingMoveTrack = [];
let deferModals = false;
const SETTINGS_PAGE_SIZE = H < 700 ? 3 : 4;
const bootTime = Date.now();
const requestFrame = typeof canvas.requestAnimationFrame === 'function'
  ? callback => canvas.requestAnimationFrame(callback)
  : (typeof requestAnimationFrame === 'function' ? requestAnimationFrame : null);
const OUTER_PATH_LENGTH = 52;
const START_INDEX = { R: 22, Y: 48, B: 9, G: 35 };
const ENTRY_INDEX = { R: 6, Y: 19, B: 32, G: 45 };
const FLY_JUMP_RULES = {
  R: { from: 40, to: 52 },
  Y: { from: 14, to: 26 },
  B: { from: 27, to: 39 },
  G: { from: 1, to: 13 }
};
const baseSlots = {
  Y: [{ x: 13.35, y: 12.76 }, { x: 20.71, y: 12.80 }, { x: 13.32, y: 20.51 }, { x: 20.70, y: 20.52 }],
  B: [{ x: 78.84, y: 12.75 }, { x: 86.24, y: 12.76 }, { x: 78.87, y: 20.52 }, { x: 86.27, y: 20.52 }],
  R: [{ x: 78.78, y: 80.36 }, { x: 86.21, y: 80.36 }, { x: 78.80, y: 88.13 }, { x: 86.20, y: 88.02 }],
  G: [{ x: 13.32, y: 80.48 }, { x: 20.65, y: 80.46 }, { x: 13.31, y: 88.31 }, { x: 20.61, y: 88.31 }]
};
const outerPath = [
  [34.85, 34.10],
  [32.56, 25.29],
  [32.60, 20.20],
  [34.69, 14.68],
  [40.07, 12.94],
  [44.93, 12.94],
  [50.01, 13.06],
  [54.98, 12.99],
  [59.92, 13.00],
  [65.19, 14.65],
  [67.35, 20.27],
  [67.36, 25.31],
  [66.85, 35.25],
  [69.30, 35.30],
  [75.14, 35.85],
  [79.62, 35.85],
  [84.97, 35.42],
  [86.46, 40.78],
  [86.53, 45.86],
  [86.19, 50.83],
  [86.53, 55.96],
  [86.48, 60.88],
  [84.89, 66.29],
  [79.63, 68.39],
  [74.79, 68.41],
  [69.45, 68.41],
  [65.30, 70.86],
  [67.38, 76.35],
  [67.31, 81.42],
  [65.18, 86.86],
  [59.89, 88.66],
  [54.95, 88.62],
  [50.02, 88.69],
  [44.85, 88.58],
  [39.95, 88.65],
  [34.67, 86.84],
  [32.51, 81.39],
  [32.50, 76.30],
  [34.90, 68.85],
  [30.55, 66.23],
  [25.13, 68.37],
  [20.35, 68.37],
  [14.93, 66.26],
  [13.34, 60.89],
  [13.29, 55.95],
  [13.32, 50.99],
  [13.32, 45.84],
  [13.34, 40.80],
  [14.10, 35.30],
  [20.36, 33.21],
  [25.11, 33.20],
  [30.60, 35.47]
].map(([x, y]) => ({ x, y }));
const straightPath = {
  R: [[49.92, 20.21], [49.90, 25.32], [49.92, 30.45], [49.91, 35.50], [49.90, 40.58], [49.94, 46.34]].map(([x, y]) => ({ x, y })),
  Y: [[79.60, 50.91], [74.69, 50.92], [69.72, 50.89], [64.91, 50.89], [59.97, 50.92], [54.32, 50.87]].map(([x, y]) => ({ x, y })),
  B: [[49.88, 81.46], [49.87, 76.37], [49.91, 71.31], [49.94, 66.30], [49.94, 61.18], [49.93, 55.43]].map(([x, y]) => ({ x, y })),
  G: [[20.32, 50.92], [25.20, 50.93], [30.15, 50.90], [34.92, 50.91], [39.85, 50.87], [45.40, 50.85]].map(([x, y]) => ({ x, y }))
};
let idCounter = 0;
let setupPlayers = loadSetupPlayers();
let state = normalizeState(loadState()) || newGameState();
function makeId() {
  idCounter += 1;
  return `${Date.now().toString(36)}-${idCounter.toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}
function defaultSetupPlayers() {
  return [
    { name: '玩家1', color: 'R' },
    { name: '玩家2', color: 'Y' }
  ];
}
function imgForColor(color) { return { R: 'planeR', Y: 'planeY', B: 'planeB', G: 'planeG' }[color] || 'planeR'; }
function loadSetupPlayers() {
  const saved = wx.getStorageSync('ludo_minigame_setup_v1');
  if (!Array.isArray(saved) || saved.length < 2) return defaultSetupPlayers();
  return saved.slice(0, 16).map((player, index) => ({
    name: String(player.name || `玩家${index + 1}`),
    color: ['R', 'Y', 'B', 'G'].includes(player.color) ? player.color : ['R', 'Y', 'B', 'G'][index % 4]
  }));
}
function saveSetupPlayers() { wx.setStorageSync('ludo_minigame_setup_v1', setupPlayers); }
function newGameState() {
  const used = { R: 0, Y: 0, B: 0, G: 0 };
  return {
    currentPlayer: 0,
    lastRoll: null,
    players: setupPlayers.map((player) => ({
      id: makeId(),
      name: player.name,
      color: player.color,
      slot: used[player.color]++,
      status: 'base',
      outerIndex: null,
      outerSteps: 0,
      straightIndex: 0,
      finishPlace: null,
      img: imgForColor(player.color)
    })),
    logs: [{ text: '游戏开始，掷出 6 才能起飞', type: 'good', at: Date.now() }],
    round: 1,
    acted: {},
    triggered: {},
    finishOrder: [],
    gameOver: false
  };
}
function saveState() { wx.setStorageSync('ludo_minigame_state_v3', state); }
function loadState() { return wx.getStorageSync('ludo_minigame_state_v3') || null; }
function hasSavedState() { return !!wx.getStorageSync('ludo_minigame_state_v3'); }
function normalizeState(saved) {
  if (!saved || !Array.isArray(saved.players) || !saved.players.length) return null;
  const nameIds = {};
  saved.players.forEach((piece) => {
    piece.id = piece.id || makeId();
    if (!nameIds[piece.name]) nameIds[piece.name] = [];
    nameIds[piece.name].push(piece.id);
  });
  const usedByName = {};
  saved.finishOrder = (saved.finishOrder || []).map((entry) => {
    if (saved.players.some((piece) => piece.id === entry)) return entry;
    const ids = nameIds[entry] || [];
    const offset = usedByName[entry] || 0;
    usedByName[entry] = offset + 1;
    return ids[offset] || entry;
  });
  saved.currentPlayer = Number.isInteger(saved.currentPlayer) ? saved.currentPlayer : 0;
  saved.currentPlayer = Math.max(0, Math.min(saved.currentPlayer, saved.players.length - 1));
  saved.triggered = saved.triggered || {};
  saved.round = Number.isInteger(saved.round) && saved.round > 0 ? saved.round : 1;
  saved.acted = saved.acted && typeof saved.acted === 'object' ? saved.acted : {};
  saved.logs = Array.isArray(saved.logs) ? saved.logs.map((entry) => (
    typeof entry === 'string'
      ? { text: entry, type: '', at: Date.now() }
      : { text: String(entry.text || ''), type: entry.type || '', at: entry.at || Date.now() }
  )).slice(-180) : [];
  const used = { R: 0, Y: 0, B: 0, G: 0 };
  saved.players.forEach((piece) => {
    piece.slot = Number.isInteger(piece.slot) ? piece.slot : (Number.isInteger(piece.colorSlot) ? piece.colorSlot : used[piece.color]);
    used[piece.color] = Math.max(used[piece.color], piece.slot + 1);
    piece.outerSteps = Number.isFinite(piece.outerSteps) ? piece.outerSteps : 0;
    piece.straightIndex = Number.isFinite(piece.straightIndex) ? piece.straightIndex : 0;
    piece.finishPlace = piece.finishPlace || ((saved.finishOrder || []).indexOf(piece.id) + 1 || null);
    piece.img = imgForColor(piece.color);
  });
  const activeIds = new Set(saved.players.filter((piece) => piece.status !== 'finished').map((piece) => piece.id));
  saved.acted = Object.fromEntries(Object.entries(saved.acted).filter(([id, acted]) => activeIds.has(id) && !!acted));
  saved.gameOver = !!saved.gameOver || activeIds.size === 0;
  return saved;
}

const DEFAULT_TASKS = {
  takeoff: '🛫 起飞！大声说“起飞啦”，并做一个飞机起飞动作。',
  baseRoll: {
    2: '基地掷出2点：做2个深蹲。',
    3: '基地掷出3点：学3声动物叫。',
    4: '基地掷出4点：原地转4圈。',
    5: '基地掷出5点：和右边玩家击掌5下。'
  },
  outer: Array.from({ length: 12 }, (_, i) => `外圈任务 ${i + 1}：请完成一个大冒险。`),
  straight: Array.from({ length: 6 }, (_, i) => `直道任务 ${i + 1}：离胜利更近一步。`),
  king: ['A','2','3','4','5','6','7','8','9','10','J','Q','K'].map(r => `国王卡 ${r}：指定一名玩家完成任务。`),
  final: '最后一名接受终极惩罚。'
};
let tasks = loadTasks();
function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function loadTasks() { return wx.getStorageSync('ludo_minigame_tasks_v1') || clone(DEFAULT_TASKS); }
function saveTasks() { wx.setStorageSync('ludo_minigame_tasks_v1', tasks); }
function taskTotal() {
  return 1
    + Object.keys(tasks.baseRoll || {}).length
    + (tasks.outer || []).length
    + (tasks.straight || []).length
    + (tasks.king || []).length
    + 1;
}
function logEntryText(entry) { return typeof entry === 'string' ? entry : String(entry?.text || ''); }
function addLog(text, type = '') {
  logText = text;
  state.logs = state.logs || [];
  state.logs.push({ text, type, at: Date.now() });
  if (state.logs.length > 180) state.logs = state.logs.slice(-180);
}
function showTask(title, body, actor = '', type = 'task') {
  const next = { title, body, actor, type };
  if (modal || deferModals) modalQueue.push(next);
  else modal = next;
}
function clearModals() { modal = null; modalQueue = []; }
function closeCurrentModal() {
  modal = modalQueue.shift() || null;
}
function flushDeferredModal() {
  if (!modal) modal = modalQueue.shift() || null;
}
function triggerBaseRollTask(piece, value) {
  const key = `base-${piece.id}-${value}`;
  if (state.triggered[key]) return;
  state.triggered[key] = true;
  showTask(`基地任务 ${value}点`, tasks.baseRoll[value] || `掷出 ${value} 点任务`, piece.name);
}
function triggerOuterTask(piece) {
  const key = `outer-${piece.outerIndex}`;
  if (state.triggered[key]) return;
  state.triggered[key] = true;
  const index = piece.outerIndex % tasks.outer.length;
  showTask(`外圈任务`, tasks.outer[index], piece.name);
}
function triggerStraightTask(piece) {
  if (piece.straightIndex < 1 || piece.straightIndex > 6) return;
  const key = `straight-${piece.straightIndex}`;
  if (state.triggered[key]) return;
  state.triggered[key] = true;
  showTask(`直道任务 ${piece.straightIndex}`, tasks.straight[piece.straightIndex - 1], piece.name);
}
function drawWrappedText(text, x, y, maxWidth, lineHeight, maxLines = 4) {
  const chars = Array.from(String(text || ''));
  let line = '';
  let lines = [];
  chars.forEach(ch => {
    const test = line + ch;
    if (ctx.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = ch;
    } else line = test;
  });
  if (line) lines.push(line);
  lines.slice(0, maxLines).forEach((ln, i) => ctx.fillText(ln, x, y + i * lineHeight));
}



function loadImage(key, src) {
  return new Promise((resolve) => {
    const image = wx.createImage();
    image.onload = () => { images[key] = image; resolve(); };
    image.onerror = (err) => { console.warn('image load failed', key, src, err); resolve(); };
    image.src = src;
  });
}

function init() {
  Promise.all(Object.entries(ASSETS).map(([key, src]) => loadImage(key, src))).then(() => {
    loaded = true;
    render();
    startHomeAnimationLoop();
  });
}

function startHomeAnimationLoop() {
  if (!requestFrame) return;
  let previous = 0;
  const tick = (now) => {
    if (scene === 'home' && loaded && !pieceAnimation && now - previous >= 42) {
      previous = now;
      render();
    }
    requestFrame(tick);
  };
  requestFrame(tick);
}

function clear() { ctx.clearRect(0, 0, W, H); }

function drawImageCover(image, x, y, w, h) {
  if (!image) return;
  const scale = Math.max(w / image.width, h / image.height);
  const sw = w / scale;
  const sh = h / scale;
  ctx.drawImage(image, (image.width - sw) / 2, (image.height - sh) / 2, sw, sh, x, y, w, h);
}

function drawImageContain(image, x, y, w, h) {
  if (!image) return;
  const scale = Math.min(w / image.width, h / image.height);
  const dw = image.width * scale;
  const dh = image.height * scale;
  ctx.drawImage(image, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function roundRect(x, y, w, h, r) {
  const radius = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function fillRoundRect(x, y, w, h, r, color, shadow = false) {
  ctx.save();
  if (shadow) {
    ctx.shadowColor = 'rgba(76, 45, 14, .18)';
    ctx.shadowBlur = 16;
    ctx.shadowOffsetY = 8;
  }
  roundRect(x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

function fillRoundGradient(x, y, w, h, r, colors, shadow = false) {
  const gradient = ctx.createLinearGradient(x, y, x + w, y + h);
  colors.forEach(([stop, color]) => gradient.addColorStop(stop, color));
  fillRoundRect(x, y, w, h, r, gradient, shadow);
}

function strokeRoundRect(x, y, w, h, r, color, width = 1) {
  ctx.save();
  roundRect(x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}


function drawWarmBackground() {
  const gradient = ctx.createLinearGradient(0, 0, 0, H);
  gradient.addColorStop(0, '#fff7df');
  gradient.addColorStop(1, '#ffe9bd');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, W, H);
}

function fillHomeOverlay() {
  const topGlow = ctx.createRadialGradient(W / 2, H * .2, 10, W / 2, H * .2, Math.min(W, H) * .65);
  topGlow.addColorStop(0, 'rgba(255,255,255,.68)');
  topGlow.addColorStop(.42, 'rgba(255,242,176,.24)');
  topGlow.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = topGlow;
  ctx.fillRect(0, 0, W, H);
  const bottomShade = ctx.createLinearGradient(0, H * .64, 0, H);
  bottomShade.addColorStop(0, 'rgba(255,255,255,0)');
  bottomShade.addColorStop(1, 'rgba(95,48,8,.22)');
  ctx.fillStyle = bottomShade;
  ctx.fillRect(0, H * .64, W, H * .36);
}

function drawHomePill(x, y, w, label, value) {
  fillRoundGradient(x, y, w, 34, 17, [[0, 'rgba(255,255,255,.92)'], [1, 'rgba(255,245,205,.78)']], true);
  strokeRoundRect(x, y, w, 34, 17, 'rgba(255,255,255,.9)', 1);
  ctx.fillStyle = '#8a4a09';
  ctx.font = '900 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(String(value), x + w / 2, y + 15);
  ctx.fillStyle = '#5f4b35';
  ctx.font = '800 9px sans-serif';
  ctx.fillText(label, x + w / 2, y + 27);
  ctx.textAlign = 'left';
}

function drawHomeHud() {
  const y = Math.max(8, safeTop + 4);
  const pillW = Math.min(58, Math.max(46, W * .145));
  const gap = 5;
  drawHomePill(8, y, pillW, '任务', taskTotal());
  drawHomePill(8 + pillW + gap, y, pillW, '玩家', setupPlayers.length);
  drawHomePill(8 + (pillW + gap) * 2, y, pillW, '存档', hasSavedState() ? '有' : '无');
  const versionText = `v${GAME_VERSION}`;
  const vw = Math.min(92, Math.max(62, W * .2));
  fillRoundGradient(W - vw - 8, y, vw, 28, 14, [[0, 'rgba(255,255,255,.9)'], [1, 'rgba(226,242,255,.72)']], false);
  ctx.fillStyle = '#5f4b35';
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(versionText, W - vw / 2 - 8, y + 18);
  ctx.textAlign = 'left';
}

function drawHome() {
  buttons = [];
  if (images.bg) drawImageCover(images.bg, 0, 0, W, H);
  else drawWarmBackground();
  fillHomeOverlay();
  drawHomeHud();
  const heroTop = Math.max(capsuleBottom - 2, Math.round(H * 0.045));
  const logoSize = Math.min(W * 0.78, H * 0.30, 330);
  const pulse = 1 + Math.sin((Date.now() - bootTime) / 650) * 0.028;
  const floatY = Math.sin((Date.now() - bootTime) / 900) * 6;
  const glow = 14 + Math.sin((Date.now() - bootTime) / 520) * 6;
  const haloSize = Math.min(W * 0.84, 350);
  const halo = ctx.createRadialGradient(W / 2, heroTop + logoSize * .48, 10, W / 2, heroTop + logoSize * .48, haloSize * .48);
  halo.addColorStop(0, 'rgba(255,255,255,.92)');
  halo.addColorStop(.55, 'rgba(255,248,198,.48)');
  halo.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = halo;
  ctx.fillRect((W - haloSize) / 2, heroTop - 12, haloSize, haloSize);
  ctx.save();
  ctx.shadowColor = 'rgba(255,255,255,.85)';
  ctx.shadowBlur = glow;
  const animatedSize = logoSize * pulse;
  drawImageContain(images.logo, (W - animatedSize) / 2, heroTop + floatY, animatedSize, animatedSize);
  ctx.restore();

  const bw = Math.min(334, W - 44);
  const bx = (W - bw) / 2;
  const bh = H < 700 ? 62 : 70;
  const gap = H < 700 ? 9 : 12;
  const toolY = H - safeBottom - (H < 700 ? 96 : 112);
  const buttonBlockH = bh * 3 + gap * 2;
  const preferredY = Math.max(heroTop + logoSize + 16, Math.round(H * 0.405));
  const startY = Math.min(preferredY, toolY - buttonBlockH - 24);
  fillRoundGradient(bx - 10, startY - 10, bw + 20, buttonBlockH + 20, 28, [[0, 'rgba(255,255,255,.46)'], [1, 'rgba(255,243,189,.28)']], true);
  strokeRoundRect(bx - 10, startY - 10, bw + 20, buttonBlockH + 20, 28, 'rgba(255,255,255,.72)', 1);
  drawMenuButton(bx, startY, bw, bh, '继续上局', '读取本地进度', 'continueIcon', 'continue', false);
  drawMenuButton(bx, startY + bh + gap, bw, bh, '新游戏', '选择玩家后开始', 'newIcon', 'new', true);
  drawMenuButton(bx, startY + (bh + gap) * 2, bw, bh, '快速开始', '默认配置开局', 'quickIcon', 'quick', false);

  drawToolBar(toolY);
}

function drawMenuButton(x, y, w, h, title, sub, icon, action, primary) {
  const palette = action === 'new'
    ? [[0, 'rgba(255,244,142,.98)'], [1, 'rgba(255,193,53,.96)']]
    : action === 'quick'
      ? [[0, 'rgba(225,255,205,.97)'], [1, 'rgba(91,210,104,.94)']]
      : [[0, 'rgba(255,255,255,.97)'], [1, 'rgba(225,242,255,.92)']];
  fillRoundGradient(x, y, w, h, 23, palette, true);
  strokeRoundRect(x, y, w, h, 23, 'rgba(255,255,255,.92)', 2);
  if (images[icon]) {
    ctx.save();
    ctx.shadowColor = 'rgba(70,42,14,.32)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4;
    drawImageContain(images[icon], x + 15, y + 7, h - 14, h - 14);
    ctx.restore();
  }
  const textX = x + h + 4 + (w - h - 4) / 2;
  ctx.textAlign = 'center';
  ctx.fillStyle = action === 'quick' ? '#174d24' : action === 'new' ? '#754510' : '#30251c';
  ctx.font = '900 23px sans-serif';
  ctx.fillText(title, textX, y + h * .45);
  ctx.fillStyle = action === 'quick' ? '#387442' : '#76593b';
  ctx.font = '800 12px sans-serif';
  ctx.fillText(sub, textX, y + h * .73);
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function drawTool(x, y, title, icon, action) {
  const w = 112;
  const h = 70;
  const glow = ctx.createRadialGradient(x + 35, y + 31, 4, x + 35, y + 31, 64);
  glow.addColorStop(0, 'rgba(255,255,255,.98)');
  glow.addColorStop(.62, 'rgba(255,248,207,.88)');
  glow.addColorStop(1, 'rgba(255,255,255,.70)');
  fillRoundRect(x, y, w, h, 22, glow, true);
  strokeRoundRect(x, y, w, h, 22, 'rgba(255,255,255,.88)', 1.5);
  if (images[icon]) drawImageContain(images[icon], x + 13, y + 10, 42, 42);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#30251c';
  ctx.font = '900 18px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(title, x + 58, y + 32);
  ctx.fillStyle = '#766047';
  ctx.shadowBlur = 0;
  ctx.font = '900 11px sans-serif';
  ctx.fillText(action === 'tasks' ? '编辑任务' : '玩家设置', x + 58, y + 50);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function drawToolBar(y) {
  const gap = 14;
  const w = 112;
  const total = w * 2 + gap;
  const x = (W - total) / 2;
  fillRoundGradient(x - 12, y - 8, total + 24, 86, 26, [[0, 'rgba(255,255,255,.48)'], [1, 'rgba(255,241,175,.38)']], true);
  strokeRoundRect(x - 12, y - 8, total + 24, 86, 26, 'rgba(255,255,255,.72)', 1);
  drawTool(x, y, '任务', 'tasksIcon', 'tasks');
  drawTool(x + w + gap, y, '设置', 'settingsIcon', 'settings');
}

function drawGame() {
  buttons = [];
  drawWarmBackground();

  const topPad = Math.max(capsuleBottom + 12, safeTop + 58);
  const panelH = 226;
  const bottomPad = Math.max(16, safeBottom + 10);
  const boardY = topPad + 38;
  const maxBoardH = H - boardY - panelH - bottomPad - 26;
  const boardSize = Math.min(W - 52, maxBoardH, 330);
  const boardX = (W - boardSize) / 2;

  const player = currentPiece();
  const colorMap = { R: '#ef4b3e', Y: '#f4c82f', B: '#28aee7', G: '#43c95e' };
  const playerColor = state.gameOver ? '#d49b24' : (colorMap[player?.color] || '#f4c82f');
  fillRoundGradient(24, topPad, W - 48, 34, 17, [[0, 'rgba(255,255,255,.96)'], [1, 'rgba(255,245,210,.92)']], true);
  ctx.fillStyle = playerColor;
  ctx.beginPath();
  ctx.arc(43, topPad + 17, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#30251c';
  ctx.font = '900 14px sans-serif';
  ctx.fillText(state.gameOver ? '本局已结束' : `${player?.name || '玩家'} 的回合`, 58, topPad + 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#806344';
  ctx.font = '800 11px sans-serif';
  ctx.fillText(`第 ${state.round || 1} 轮`, W - 40, topPad + 21);
  ctx.textAlign = 'left';

  const frameX = boardX - 10;
  const frameY = boardY - 10;
  fillRoundGradient(frameX, frameY, boardSize + 20, boardSize + 20, 25,
    [[0, '#fffdf5'], [.58, '#fff0be'], [1, '#e8a740']], true);
  strokeRoundRect(frameX, frameY, boardSize + 20, boardSize + 20, 25, 'rgba(255,255,255,.95)', 4);
  strokeRoundRect(boardX - 3, boardY - 3, boardSize + 6, boardSize + 6, 20, 'rgba(82,52,25,.22)', 2);
  drawImageContain(images.board, boardX, boardY, boardSize, boardSize);
  state.players.forEach((piece) => drawPiece(piece, boardX, boardY, boardSize));

  const panelY = boardY + boardSize + 22;
  fillRoundGradient(24, panelY, W - 48, panelH, 28,
    [[0, 'rgba(255,255,255,.98)'], [.55, 'rgba(255,248,226,.97)'], [1, 'rgba(255,230,170,.94)']], true);
  strokeRoundRect(24, panelY, W - 48, panelH, 28, 'rgba(255,255,255,.94)', 2);

  ctx.fillStyle = '#30251c';
  ctx.font = '900 20px sans-serif';
  ctx.fillText('掷骰行动', 46, panelY + 39);
  ctx.fillStyle = '#76593b';
  ctx.font = '800 14px sans-serif';
  ctx.fillText(`上次点数：${lastRoll}`, 46, panelY + 66);
  ctx.fillStyle = '#9a7a58';
  ctx.font = '800 12px sans-serif';
  ctx.fillText(logText, 46, panelY + 89);
  fillRoundGradient(W - 126, panelY + 16, 82, 82, 22,
    [[0, 'rgba(255,255,255,.96)'], [1, 'rgba(255,217,100,.88)']], false);
  strokeRoundRect(W - 126, panelY + 16, 82, 82, 22, 'rgba(255,255,255,.95)', 2);
  drawDice(W - 116, panelY + 26, 62, rolling ? rollingDiceValue : lastRoll);

  const contentW = W - 92;
  const gap = 14;
  const leftW = Math.floor(contentW * 0.46);
  const rightW = contentW - leftW - gap;
  const rollLabel = rolling ? '骰子滚动中' : pieceAnimation ? '飞机移动中' : state.gameOver ? '查看排名' : '掷骰子';
  drawPanelButton(46, panelY + 112, leftW, 54, rollLabel, state.gameOver ? 'records' : 'roll', true);
  drawPanelButton(46 + leftW + gap, panelY + 112, rightW, 54, '任务中心', 'tasks', false);
  const smallGap = 8;
  const smallW = Math.floor((contentW - smallGap * 3) / 4);
  drawPanelButton(46, panelY + 176, smallW, 40, '设置', 'settings', false);
  drawPanelButton(46 + smallW + smallGap, panelY + 176, smallW, 40, '进度', 'records', false);
  drawPanelButton(46 + (smallW + smallGap) * 2, panelY + 176, smallW, 40, '重开', 'restart', false);
  drawPanelButton(46 + (smallW + smallGap) * 3, panelY + 176, smallW, 40, '大厅', 'home', false);
  drawMiniProgress(panelY + panelH + 12);
}


function drawMiniProgress(y) {
  if (y > H - 78 - safeBottom) return;
  fillRoundGradient(24, y, W - 48, 64, 18,
    [[0, 'rgba(255,255,255,.90)'], [1, 'rgba(255,239,195,.82)']], false);
  strokeRoundRect(24, y, W - 48, 64, 18, 'rgba(255,255,255,.86)', 1.5);
  ctx.fillStyle = '#5f4a35';
  ctx.font = '800 12px sans-serif';
  state.players.slice(0, 4).forEach((piece, i) => {
    const rank = state.finishOrder && state.finishOrder.includes(piece.id) ? `第${state.finishOrder.indexOf(piece.id)+1}名` : '';
    const progress = piece.status === 'base' ? '基地' : piece.status === 'outer' ? `外圈第${piece.outerIndex + 1}格` : piece.status === 'straight' ? `直${piece.straightIndex}/6` : '终点';
    const colorMap = { R: '#ef4b3e', Y: '#e6b916', B: '#259fd5', G: '#35af50' };
    ctx.fillStyle = colorMap[piece.color] || '#806344';
    ctx.beginPath();
    ctx.arc(39, y + 18 + i * 15, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#5f4a35';
    ctx.fillText(`${piece.name}：${progress}${rank ? ' · ' + rank : ''}`, 49, y + 22 + i * 15);
  });
  const latest = (state.logs || []).slice(-1)[0];
  if (latest) ctx.fillText(`记录：${logEntryText(latest)}`, 42, y + 22 + Math.min(state.players.length,4) * 15 + 8);
}

function drawModal() {
  if (!modal) return;
  ctx.fillStyle = 'rgba(30,18,8,.58)';
  ctx.fillRect(0, 0, W, H);
  const isKing = modal.type === 'king' || String(modal.title || '').includes('国王卡');
  const cardImage = isKing ? images.kingCard : images.taskCard;
  const cardSize = Math.min(W - 18, H - Math.max(capsuleBottom + 24, 84) - 18, 390);
  const cx = Math.round((W - cardSize) / 2);
  const cy = Math.round(Math.max(capsuleBottom + 16, (H - cardSize) / 2 - 8));
  ctx.save();
  ctx.shadowColor = isKing ? 'rgba(255,189,37,.62)' : 'rgba(255,255,255,.52)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 9;
  if (cardImage) drawImageContain(cardImage, cx, cy, cardSize, cardSize);
  else fillRoundRect(cx, cy, cardSize, cardSize, 28, '#fff7df', false);
  ctx.restore();

  ctx.shadowBlur = 0;
  ctx.textBaseline = 'alphabetic';
  ctx.fillStyle = isKing ? '#4a2406' : '#241b14';
  ctx.font = '900 23px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(modal.title, W / 2, Math.round(cy + cardSize * 0.30));
  ctx.textAlign = 'left';
  ctx.fillStyle = isKing ? '#4a2406' : '#3a2a1d';
  ctx.font = '800 16px sans-serif';
  drawWrappedText(modal.body, Math.round(cx + cardSize * 0.23), Math.round(cy + cardSize * 0.44), Math.round(cardSize * 0.54), 25, 5);
  drawPanelButton(Math.round(cx + cardSize * 0.31), Math.round(cy + cardSize * 0.78), Math.round(cardSize * 0.38), 42, '完成，继续', 'closeModal', true);
}

function drawDice(x, y, size, value) {
  fillRoundRect(x, y, size, size, 15, '#fff', true);
  ctx.strokeStyle = 'rgba(48,37,28,.16)';
  ctx.lineWidth = 2;
  roundRect(x, y, size, size, 15);
  ctx.stroke();
  if (!Number(value)) {
    ctx.fillStyle = '#30251c';
    ctx.font = '900 22px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('?', x + size / 2, y + size / 2 + 8);
    ctx.textAlign = 'left';
    return;
  }
  const spots = {
    1: [[.5,.5]], 2: [[.3,.3],[.7,.7]], 3: [[.3,.3],[.5,.5],[.7,.7]],
    4: [[.3,.3],[.7,.3],[.3,.7],[.7,.7]],
    5: [[.3,.3],[.7,.3],[.5,.5],[.3,.7],[.7,.7]],
    6: [[.3,.25],[.7,.25],[.3,.5],[.7,.5],[.3,.75],[.7,.75]]
  }[value];
  ctx.fillStyle = '#2f241b';
  spots.forEach(([px, py]) => {
    ctx.beginPath();
    ctx.arc(x + size * px, y + size * py, 4.4, 0, Math.PI * 2);
    ctx.fill();
  });
}

function pieceCoord(piece) {
  if (piece.status === 'base') return baseSlots[piece.color][piece.slot] || baseSlots[piece.color][0];
  if (piece.status === 'outer') return outerPath[piece.outerIndex] || baseSlots[piece.color][0];
  if (piece.status === 'straight') return piece.straightIndex <= 0 ? outerPath[ENTRY_INDEX[piece.color]] : straightPath[piece.color][Math.min(5, piece.straightIndex - 1)];
  return { x: 50, y: 50 };
}

function animationPosition(pieceId) {
  if (!pieceAnimation || pieceAnimation.pieceId !== pieceId) return null;
  const elapsed = Date.now() - pieceAnimation.startedAt;
  let consumed = 0;
  for (const segment of pieceAnimation.segments) {
    const end = consumed + segment.duration;
    if (elapsed <= end) {
      const t = Math.max(0, Math.min(1, (elapsed - consumed) / segment.duration));
      const ease = 1 - Math.pow(1 - t, 3);
      const hop = Math.sin(Math.PI * ease) * segment.arc;
      return {
        x: segment.from.x + (segment.to.x - segment.from.x) * ease,
        y: segment.from.y + (segment.to.y - segment.from.y) * ease - hop
      };
    }
    consumed = end;
  }
  return pieceAnimation.segments.length
    ? pieceAnimation.segments[pieceAnimation.segments.length - 1].to
    : null;
}

function startPieceAnimation(piece, track, onDone) {
  if (!piece || track.length < 2) {
    if (onDone) onDone();
    return;
  }
  const segments = [];
  for (let index = 1; index < track.length; index++) {
    const previous = track[index - 1];
    const current = track[index];
    segments.push({
      from: previous.pos,
      to: current.pos,
      duration: current.kind === 'fly' ? 900 : 230,
      arc: current.kind === 'fly' ? 7 : 1.3
    });
  }
  pieceAnimation = { pieceId: piece.id, segments, startedAt: Date.now() };
  const duration = segments.reduce((sum, segment) => sum + segment.duration, 0);
  const tick = () => {
    render();
    if (pieceAnimation && Date.now() - pieceAnimation.startedAt < duration) {
      scheduleFrame(tick);
      return;
    }
    pieceAnimation = null;
    if (onDone) onDone();
  };
  scheduleFrame(tick);
}

function scheduleFrame(callback) {
  if (requestFrame) requestFrame(callback);
  else setTimeout(() => callback(Date.now()), 16);
}

function beginMoveTrack(piece) {
  pendingMoveTrack = [{ pos: { ...pieceCoord(piece) }, kind: 'step' }];
}

function appendMovePoint(pos, kind = 'step') {
  if (!pos) return;
  pendingMoveTrack.push({ pos: { x: pos.x, y: pos.y }, kind });
}

function drawPiece(piece, boardX, boardY, boardSize) {
  const pos = animationPosition(piece.id) || pieceCoord(piece);
  const px = boardX + boardSize * pos.x / 100;
  const py = boardY + boardSize * pos.y / 100;
  if (images[piece.img]) drawImageContain(images[piece.img], px - 17, py - 17, 34, 34);
  fillRoundRect(px + 10, py - 12, 44, 22, 9, 'rgba(0,0,0,.62)');
  ctx.fillStyle = '#fff';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(piece.name, px + 15, py + 3);
}

function findNextPlayable(start) {
  const total = state.players.length;
  for (let offset = 0; offset < total; offset++) {
    const index = (start + offset) % total;
    const piece = state.players[index];
    if (piece.status !== 'finished' && !state.acted[piece.id]) return index;
  }
  for (let offset = 0; offset < total; offset++) {
    const index = (start + offset) % total;
    if (state.players[index].status !== 'finished') return index;
  }
  return -1;
}

function currentPiece() {
  if (!state || !state.players.length) return null;
  const piece = state.players[state.currentPlayer];
  if (piece && piece.status !== 'finished' && !state.acted[piece.id]) return piece;
  const next = findNextPlayable(state.currentPlayer || 0);
  if (next >= 0) {
    state.currentPlayer = next;
    return state.players[next];
  }
  return state.players.find((player) => player.status !== 'finished') || state.players[0];
}

function isRoundComplete() {
  const active = state.players.filter((piece) => piece.status !== 'finished');
  return active.length > 0 && active.every((piece) => state.acted[piece.id]);
}

function roundEnd() {
  state.round = (state.round || 1) + 1;
  state.acted = {};
  addLog(`第 ${state.round} 轮开始`, 'good');
}

function endTurn(piece) {
  state.acted[piece.id] = true;
  if (state.gameOver) return;
  if (isRoundComplete()) roundEnd();
  const next = findNextPlayable((state.players.indexOf(piece) + 1) % state.players.length);
  if (next >= 0) state.currentPlayer = next;
}


function drawPanelButton(x, y, w, h, text, action, primary) {
  if (primary) {
    fillRoundGradient(x, y, w, h, h / 2, [[0, '#ffde55'], [.55, '#ffad31'], [1, '#ef7428']], true);
    strokeRoundRect(x, y, w, h, h / 2, 'rgba(255,255,255,.88)', 2);
  } else {
    fillRoundGradient(x, y, w, h, h / 2, [[0, '#fffdf7'], [1, '#ffe8b7']], false);
    strokeRoundRect(x, y, w, h, h / 2, 'rgba(169,112,48,.20)', 1.5);
  }
  ctx.fillStyle = primary ? '#542d0e' : '#493522';
  ctx.font = `900 ${h >= 50 ? 18 : 15}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + (h >= 50 ? 7 : 5));
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function render() {
  if (!loaded) {
    clear();
    ctx.fillStyle = '#fff7df';
    ctx.fillRect(0, 0, W, H);
    ctx.fillStyle = '#30251c';
    ctx.font = '900 18px sans-serif';
    ctx.fillText('加载中...', 24, 48);
    return;
  }
  clear();
  if (scene === 'home') drawHome();
  else if (scene === 'game') drawGame();
  else if (scene === 'settings') drawSettings();
  else if (scene === 'tasks') drawTasks();
  else if (scene === 'records') drawRecords();
  drawModal();
}

function hitTest(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const btn = buttons[i];
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
  }
  return null;
}



function drawTopTitle(title, sub) {
  drawWarmBackground();
  fillRoundRect(24, Math.max(safeTop + 14, 34), W - 48, 74, 24, 'rgba(255,255,255,.82)', true);
  ctx.fillStyle = '#30251c';
  ctx.font = '900 24px sans-serif';
  ctx.fillText(title, 46, Math.max(safeTop + 14, 34) + 32);
  ctx.fillStyle = '#76593b';
  ctx.font = '800 13px sans-serif';
  ctx.fillText(sub, 46, Math.max(safeTop + 14, 34) + 56);
}

function drawSettings() {
  buttons = [];
  drawTopTitle('玩家设置', '2–16 人 · 每种颜色最多 4 架飞机');
  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.min(520, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,255,255,.94)', true);
  const counts = countColors(setupPlayers);
  ctx.fillStyle = '#30251c';
  ctx.font = '900 19px sans-serif';
  ctx.fillText(`玩家 ${setupPlayers.length}/16`, 46, startY + 34);
  ctx.fillStyle = '#806344';
  ctx.font = '800 11px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`红${counts.R}/4  黄${counts.Y}/4  蓝${counts.B}/4  绿${counts.G}/4`, W - 46, startY + 33);
  ctx.textAlign = 'left';

  const maxPage = Math.max(0, Math.ceil(setupPlayers.length / SETTINGS_PAGE_SIZE) - 1);
  settingsPage = Math.min(settingsPage, maxPage);
  const pagePlayers = setupPlayers.slice(settingsPage * SETTINGS_PAGE_SIZE, (settingsPage + 1) * SETTINGS_PAGE_SIZE);
  pagePlayers.forEach((player, offset) => {
    const index = settingsPage * SETTINGS_PAGE_SIZE + offset;
    const y = startY + 58 + offset * 64;
    fillRoundGradient(40, y, W - 80, 54, 16, [[0, '#fffdf8'], [1, '#fff0c9']], false);
    drawColorDot(57, y + 27, player.color);
    ctx.fillStyle = '#493522';
    ctx.font = '900 14px sans-serif';
    ctx.fillText(`${index + 1}. ${shortText(player.name, 9)}`, 91, y + 32);
    drawPanelButton(W - 184, y + 9, 48, 36, '改名', `setupName:${index}`, false);
    drawPanelButton(W - 130, y + 9, 48, 36, '颜色', `setupColor:${index}`, false);
    drawPanelButton(W - 76, y + 9, 36, 36, '×', `setupDelete:${index}`, false);
  });

  const pagerY = startY + 62 + SETTINGS_PAGE_SIZE * 64;
  drawPanelButton(46, pagerY, 70, 36, '上一页', 'setupPrev', false);
  ctx.fillStyle = '#76593b';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${settingsPage + 1}/${maxPage + 1}`, W / 2, pagerY + 23);
  ctx.textAlign = 'left';
  drawPanelButton(W - 116, pagerY, 70, 36, '下一页', 'setupNext', false);

  const addY = pagerY + 48;
  drawPanelButton(46, addY, 104, 40, '+ 添加玩家', 'setupAdd', false);
  drawPanelButton(160, addY, 86, 40, '- 最后一位', 'setupRemove', false);
  const footerY = Math.min(startY + panelH - 58, addY + 54);
  const footerW = Math.floor((W - 116) / 3);
  drawPanelButton(46, footerY, footerW, 44, '保存开局', 'setupApply', true);
  drawPanelButton(58 + footerW, footerY, footerW, 44, '大厅', 'home', false);
  drawPanelButton(70 + footerW * 2, footerY, footerW, 44, '继续', hasSavedState() ? 'continue' : 'quick', false);
}

function drawColorDot(x, y, color) {
  const map = { R: '#ef3f35', Y: '#ffd339', B: '#22aeea', G: '#42d05d' };
  ctx.fillStyle = map[color] || '#999';
  ctx.beginPath();
  ctx.arc(x, y, 10, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#4d3c2d';
  ctx.font = '800 12px sans-serif';
  ctx.fillText(color, x + 16, y + 4);
}

function shortText(text, maxChars) {
  const chars = Array.from(String(text || ''));
  return chars.length <= maxChars ? chars.join('') : `${chars.slice(0, Math.max(1, maxChars - 1)).join('')}…`;
}

function countColors(players) {
  const counts = { R: 0, Y: 0, B: 0, G: 0 };
  players.forEach((player) => { if (counts[player.color] !== undefined) counts[player.color] += 1; });
  return counts;
}

function firstAvailableColor(players, preferredIndex = 0) {
  const colors = ['R', 'Y', 'B', 'G'];
  const counts = countColors(players);
  for (let offset = 0; offset < colors.length; offset++) {
    const color = colors[(preferredIndex + offset) % colors.length];
    if (counts[color] < 4) return color;
  }
  return null;
}

function statusText(piece) {
  if (piece.status === 'base') return '基地 · 掷出 6 起飞';
  if (piece.status === 'outer') return `外圈第 ${piece.outerIndex + 1} 格`;
  if (piece.status === 'straight') return `直道第 ${piece.straightIndex}/6 格`;
  return '已到达终点';
}

function progressText(piece) {
  if (piece.status === 'base') return '基地';
  if (piece.status === 'outer') return `外 ${piece.outerIndex + 1}`;
  if (piece.status === 'straight') return `直 ${piece.straightIndex}/6`;
  return '终点';
}

function playerProgressPercent(piece) {
  if (piece.status === 'finished') return 100;
  if (piece.status === 'base') return 4;
  if (piece.status === 'outer') return Math.max(8, Math.min(82, Math.round((piece.outerSteps % OUTER_PATH_LENGTH) / OUTER_PATH_LENGTH * 76) + 8));
  if (piece.status === 'straight') return Math.max(84, Math.min(98, 84 + Math.round((piece.straightIndex / 6) * 14)));
  return 0;
}

function drawRecords() {
  buttons = [];
  drawTopTitle('进度记录', `第 ${state.round || 1} 轮 · ${state.players.length} 位玩家`);
  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.max(320, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,255,255,.94)', true);
  const tabGap = 10;
  const tabW = Math.floor((W - 102) / 2);
  drawPanelButton(46, startY + 20, tabW, 42, '玩家进度', 'recordsPlayers', recordsTab === 'players');
  drawPanelButton(56 + tabW, startY + 20, tabW, 42, '游戏记录', 'recordsLogs', recordsTab === 'logs');

  if (recordsTab === 'players') drawPlayerRecords(startY, panelH);
  else drawGameRecords(startY, panelH);

  const footerY = startY + panelH - 52;
  drawPanelButton(46, footerY, 96, 38, '返回游戏', 'game', true);
  drawPanelButton(W - 142, footerY, 96, 38, '大厅', 'home', false);
}

function drawPlayerRecords(startY, panelH) {
  const pageSize = progressPageSize(panelH);
  const maxPage = Math.max(0, Math.ceil(state.players.length / pageSize) - 1);
  progressPage = Math.min(progressPage, maxPage);
  const players = state.players.slice(progressPage * pageSize, (progressPage + 1) * pageSize);
  players.forEach((piece, offset) => {
    const rowGap = pageSize >= 4 ? 72 : 78;
    const y = startY + 74 + offset * rowGap;
    const isCurrent = currentPiece()?.id === piece.id && !state.gameOver;
    fillRoundGradient(42, y, W - 84, 66, 17,
      isCurrent ? [[0, '#fff8bd'], [1, '#ffe4a6']] : [[0, '#fffdf8'], [1, '#fff1d2']], false);
    drawColorDot(59, y + 22, piece.color);
    ctx.fillStyle = '#3e2d20';
    ctx.font = '900 14px sans-serif';
    const rank = piece.finishPlace ? ` · 第${piece.finishPlace}名` : '';
    ctx.fillText(`${shortText(piece.name, 10)}${rank}`, 92, y + 23);
    ctx.fillStyle = '#806344';
    ctx.font = '800 11px sans-serif';
    ctx.fillText(statusText(piece), 92, y + 42);
    const barX = 92;
    const barY = y + 50;
    const barW = W - 202;
    fillRoundRect(barX, barY, barW, 7, 4, 'rgba(118,89,59,.16)');
    const color = { R: '#ef4b3e', Y: '#e5b717', B: '#259fd5', G: '#35af50' }[piece.color];
    fillRoundRect(barX, barY, barW * playerProgressPercent(piece) / 100, 7, 4, color);
    ctx.fillStyle = '#5c432d';
    ctx.font = '900 11px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(progressText(piece), W - 54, y + 37);
    ctx.textAlign = 'left';
  });
  drawRecordPager(startY + panelH - 98, progressPage, maxPage, 'progressPrev', 'progressNext');
}

function drawGameRecords(startY, panelH) {
  const logs = (state.logs || []).slice().reverse();
  const pageSize = gameRecordsPageSize(panelH);
  const maxPage = Math.max(0, Math.ceil(logs.length / pageSize) - 1);
  recordsPage = Math.min(recordsPage, maxPage);
  const pageLogs = logs.slice(recordsPage * pageSize, (recordsPage + 1) * pageSize);
  pageLogs.forEach((entry, offset) => {
    const y = startY + 84 + offset * 50;
    const type = entry.type || '';
    const color = type === 'good' ? '#248d45' : type === 'bad' ? '#b53a2b' : type === 'hot' ? '#c46b15' : '#76593b';
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(53, y + 7, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#493522';
    ctx.font = '800 12px sans-serif';
    drawWrappedText(logEntryText(entry), 66, y + 12, W - 116, 17, 2);
  });
  if (!pageLogs.length) {
    ctx.fillStyle = '#806344';
    ctx.font = '800 14px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('还没有游戏记录', W / 2, startY + 130);
    ctx.textAlign = 'left';
  }
  drawRecordPager(startY + panelH - 98, recordsPage, maxPage, 'recordsPrev', 'recordsNext');
}

function progressPageSize(panelH) {
  return Math.max(2, Math.min(4, Math.floor((panelH - 174) / 72)));
}

function gameRecordsPageSize(panelH) {
  return Math.max(3, Math.min(6, Math.floor((panelH - 180) / 50)));
}

function drawRecordPager(y, page, maxPage, prevAction, nextAction) {
  drawPanelButton(46, y, 76, 34, '上一页', prevAction, false);
  ctx.fillStyle = '#76593b';
  ctx.font = '900 12px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${page + 1}/${maxPage + 1}`, W / 2, y + 22);
  ctx.textAlign = 'left';
  drawPanelButton(W - 122, y, 76, 34, '下一页', nextAction, false);
}

function drawTasks() {
  buttons = [];
  drawTopTitle('任务中心', '逐条编辑 · JSON 导入导出 · 纯文本模板');
  const startY = Math.max(safeTop + 124, 138);
  fillRoundRect(24, startY, W - 48, 500, 26, 'rgba(255,255,255,.94)', true);
  ctx.fillStyle = '#30251c';
  ctx.font = '900 18px sans-serif';
  ctx.fillText('当前任务库', 46, startY + 38);
  ctx.fillStyle = '#76593b';
  ctx.font = '800 14px sans-serif';
  const lines = [
    `起飞任务：1 条`,
    `基地任务：${Object.keys(tasks.baseRoll).length} 条`,
    `外圈任务：${tasks.outer.length} 条`,
    `直道任务：${tasks.straight.length} 条`,
    `国王卡：${tasks.king.length} 条`,
    `终极惩罚：1 条`
  ];
  lines.forEach((line, i) => ctx.fillText(line, 54, startY + 78 + i * 30));
  ctx.fillStyle = '#9a7a58';
  ctx.font = '800 13px sans-serif';
  drawWrappedText('可逐条编辑，也可复制模板后整段修改，再用纯文本导入。', 54, startY + 260, W - 108, 22, 2);
  const bw = Math.floor((W - 108) / 3);
  drawPanelButton(46, startY + 306, bw, 38, '起飞', 'editTakeoff', false);
  drawPanelButton(58 + bw, startY + 306, bw, 38, '基地', 'editBase', false);
  drawPanelButton(70 + bw * 2, startY + 306, bw, 38, '外圈', 'editOuter', false);
  drawPanelButton(46, startY + 352, bw, 38, '直道', 'editStraight', false);
  drawPanelButton(58 + bw, startY + 352, bw, 38, '国王卡', 'editKing', false);
  drawPanelButton(70 + bw * 2, startY + 352, bw, 38, '终极', 'editFinal', false);
  drawPanelButton(46, startY + 398, bw, 38, '导出JSON', 'exportTasks', false);
  drawPanelButton(58 + bw, startY + 398, bw, 38, '导入JSON', 'importTasks', false);
  drawPanelButton(70 + bw * 2, startY + 398, bw, 38, '纯文本', 'importPlain', false);
  drawPanelButton(46, startY + 444, bw, 38, '复制模板', 'exportPlain', false);
  drawPanelButton(58 + bw, startY + 444, bw, 38, '默认', 'resetTasks', false);
  drawPanelButton(70 + bw * 2, startY + 444, bw, 38, '游戏', 'quick', true);
}



function sectionText(source, title) {
  const pattern = new RegExp(`【${title}】([\\s\\S]*?)(?=\\n?【|$)`);
  const match = source.match(pattern);
  return match ? match[1].trim() : '';
}
function splitLines(text) {
  return String(text || '').split(/\n+/).map(line => line.trim()).filter(Boolean);
}
function parsePlainTasks(source) {
  const next = clone(DEFAULT_TASKS);
  const takeoff = sectionText(source, '起飞');
  if (takeoff) next.takeoff = takeoff;
  [2, 3, 4, 5].forEach(point => {
    const value = sectionText(source, `基地${point}`);
    if (value) next.baseRoll[point] = value;
  });
  const outer = splitLines(sectionText(source, '外圈'));
  if (outer.length) next.outer = Array.from({ length: 12 }, (_, i) => outer[i] || next.outer[i]);
  const straight = splitLines(sectionText(source, '直道'));
  if (straight.length) next.straight = Array.from({ length: 6 }, (_, i) => straight[i] || next.straight[i]);
  const king = splitLines(sectionText(source, '国王卡'));
  if (king.length) next.king = Array.from({ length: 13 }, (_, i) => king[i] || next.king[i]);
  const final = sectionText(source, '终极惩罚');
  if (final) next.final = final;
  return next;
}

function copyText(title, text, successMessage) {
  try {
    wx.setClipboardData({
      data: text,
      success() { showTask(title, successMessage); render(); },
      fail(err) {
        console.log(`${title}内容：`, text);
        showTask(`${title}失败`, `当前环境不允许写入剪贴板。已把内容输出到开发者工具 Console。错误：${err.errMsg || '未知错误'}`);
        render();
      }
    });
  } catch (err) {
    console.log(`${title}内容：`, text);
    showTask(`${title}失败`, `当前环境不支持剪贴板。已把内容输出到开发者工具 Console。`);
    render();
  }
}
function importJsonByPaste() {
  promptText('导入JSON', '请粘贴完整任务JSON', value => {
    try {
      const data = JSON.parse(value);
      if (!data.takeoff || !data.outer || !data.straight || !data.king || !data.final) throw new Error('字段不完整');
      tasks = data;
      saveTasks();
      showTask('导入成功', '已导入 JSON 任务。');
      render();
    } catch (err) {
      showTask('导入失败', err.message || '不是有效任务 JSON');
      render();
    }
  });
}
function importPlainByPaste() {
  promptText('导入纯文本', '请粘贴【起飞】格式任务文本', value => {
    try {
      tasks = parsePlainTasks(value);
      saveTasks();
      showTask('导入成功', '已导入纯文本任务。');
      render();
    } catch (err) {
      showTask('导入失败', err.message || '纯文本格式无法解析');
      render();
    }
  });
}
function exportPlainTemplate() {
  const text = `【起飞】\n${tasks.takeoff}\n\n【基地2】\n${tasks.baseRoll[2]}\n【基地3】\n${tasks.baseRoll[3]}\n【基地4】\n${tasks.baseRoll[4]}\n【基地5】\n${tasks.baseRoll[5]}\n\n【外圈】\n${tasks.outer.join('\n')}\n\n【直道】\n${tasks.straight.join('\n')}\n\n【国王卡】\n${tasks.king.join('\n')}\n\n【终极惩罚】\n${tasks.final}`;
  copyText('复制模板', text, '纯文本任务模板已复制到剪贴板。');
}
function exportTasksToClipboard() {
  copyText('导出JSON', JSON.stringify(tasks, null, 2), '任务 JSON 已复制到剪贴板。');
}

function editTaskText(title, current, onConfirm) {
  wx.showModal({
    title,
    editable: true,
    placeholderText: '输入任务内容',
    content: current,
    success(res) {
      if (res.confirm && typeof res.content === 'string') {
        onConfirm(res.content.trim() || current);
        saveTasks();
        showTask('保存成功', '任务内容已保存。');
        render();
      }
    }
  });
}
function promptText(title, placeholder, onConfirm) {
  wx.showModal({
    title,
    editable: true,
    placeholderText: placeholder,
    success(res) {
      if (res.confirm) onConfirm(String(res.content || '').trim());
    },
    fail(err) {
      showTask('操作失败', err.errMsg || '当前环境不支持输入弹窗');
      render();
    }
  });
}
function promptIndex(title, placeholder, min, max, onPick) {
  promptText(title, placeholder, value => {
    const index = Number(value);
    if (!Number.isInteger(index) || index < min || index > max) {
      showTask('输入错误', `请输入 ${min}-${max} 之间的数字。`);
      render();
      return;
    }
    onPick(index - min);
  });
}
function editBaseRollTask() {
  promptIndex('编辑基地任务', '输入点数：2-5', 2, 5, offset => {
    const point = offset + 2;
    editTaskText(`编辑基地${point}点`, tasks.baseRoll[point], value => { tasks.baseRoll[point] = value; });
  });
}
function editOuterTask() {
  promptIndex('编辑外圈任务', '输入序号：1-12', 1, 12, index => {
    editTaskText(`编辑外圈任务${index + 1}`, tasks.outer[index], value => { tasks.outer[index] = value; });
  });
}
function editStraightTask() {
  promptIndex('编辑直道任务', '输入序号：1-6', 1, 6, index => {
    editTaskText(`编辑直道任务${index + 1}`, tasks.straight[index], value => { tasks.straight[index] = value; });
  });
}
function editKingTask() {
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  promptText('编辑国王卡', '输入 A,2-10,J,Q,K', value => {
    const normalized = value.toUpperCase();
    const index = ranks.indexOf(normalized);
    if (index < 0) {
      showTask('输入错误', '请输入 A、2-10、J、Q 或 K。');
      render();
      return;
    }
    editTaskText(`编辑国王卡${ranks[index]}`, tasks.king[index], text => { tasks.king[index] = text; });
  });
}
function editFinalTask() {
  editTaskText('编辑终极惩罚', tasks.final, value => { tasks.final = value; });
}
function cycleSetupColor(index) {
  const colors = ['R', 'Y', 'B', 'G'];
  const player = setupPlayers[index];
  if (!player) return;
  const counts = countColors(setupPlayers);
  for (let offset = 1; offset <= colors.length; offset++) {
    const next = colors[(colors.indexOf(player.color) + offset) % colors.length];
    if (next === player.color || counts[next] < 4) {
      player.color = next;
      saveSetupPlayers();
      return;
    }
  }
  showTask('颜色已满', '红、黄、蓝、绿每种颜色最多 4 位玩家。');
}

function editSetupName(index) {
  const player = setupPlayers[index];
  if (!player) return;
  wx.showModal({
    title: `编辑玩家 ${index + 1}`,
    editable: true,
    placeholderText: '输入玩家名',
    content: player.name,
    success(res) {
      if (!res.confirm) return;
      const name = String(res.content || '').trim();
      if (!name) {
        showTask('名字不能为空', '请填写玩家名后再保存。');
      } else {
        player.name = name;
        saveSetupPlayers();
      }
      render();
    }
  });
}

function validateSetupPlayers() {
  if (setupPlayers.length < 2 || setupPlayers.length > 16) return '玩家人数必须是 2–16 人。';
  if (setupPlayers.some((player) => !String(player.name || '').trim())) return '请填写所有玩家名。';
  const counts = countColors(setupPlayers);
  if (Object.values(counts).some((count) => count > 4)) return '每种颜色最多 4 位玩家。';
  return '';
}

function applySetupAndStart() {
  const error = validateSetupPlayers();
  if (error) {
    showTask('无法开始', error);
    return;
  }
  setupPlayers = setupPlayers.map((player) => ({ name: String(player.name).trim(), color: player.color }));
  saveSetupPlayers();
  startFreshGame('设置已保存，新局开始');
}


function ensureCurrentPlayable() {
  if (state.players.every((piece) => piece.status === 'finished')) return null;
  return currentPiece();
}
function drawKingCard(piece, reason) {
  const kingList = Array.isArray(tasks.king) && tasks.king.length ? tasks.king : DEFAULT_TASKS.king;
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  const index = Math.floor(Math.random() * kingList.length);
  showTask(`国王卡 ${ranks[index] || index + 1}`, `${reason}\n${kingList[index]}`, piece.name, 'king');
}
function finishPiece(piece) {
  piece.status = 'finished';
  if (!state.finishOrder.includes(piece.id)) state.finishOrder.push(piece.id);
  piece.finishPlace = state.finishOrder.indexOf(piece.id) + 1;
  addLog(`${piece.name} 到达终点，第 ${piece.finishPlace} 名`, 'good');
  showTask('到达终点', `${piece.name} 第 ${piece.finishPlace} 名到达终点！`);
  if (state.finishOrder.length === state.players.length) {
    state.gameOver = true;
    const ranking = state.finishOrder.map((id, i) => {
      const ranked = state.players.find((player) => player.id === id);
      return `${i + 1}. ${ranked ? ranked.name : '玩家'}`;
    }).join('\n');
    showTask('游戏结束', `${ranking}\n\n${tasks.final}`);
  }
}


function applyFlyJump(piece) {
  const rule = FLY_JUMP_RULES[piece.color];
  if (!rule || piece.outerIndex !== rule.from - 1) return;
  piece.outerIndex = rule.to - 1;
  piece.outerSteps = (piece.outerIndex - START_INDEX[piece.color] + OUTER_PATH_LENGTH) % OUTER_PATH_LENGTH;
  appendMovePoint(outerPath[piece.outerIndex], 'fly');
  addLog(`${piece.name} 触发飞行航线：从 ${rule.from} 飞到 ${rule.to}`);
}

function moveOuter(piece, steps) {
  for (let step = 1; step <= steps; step++) {
    piece.outerIndex = (piece.outerIndex + 1) % OUTER_PATH_LENGTH;
    piece.outerSteps += 1;
    appendMovePoint(outerPath[piece.outerIndex]);
    if (piece.outerIndex === ENTRY_INDEX[piece.color]) {
      const remain = steps - step;
      piece.status = 'straight';
      piece.outerIndex = null;
      piece.straightIndex = 0;
      addLog(`${piece.name} 到达直道入口，进入直道`);
      if (remain > 0) moveStraight(piece, remain);
      return;
    }
  }
  addLog(`${piece.name} 前进 ${steps} 步，落在外圈第 ${piece.outerIndex + 1} 格`);
  applyFlyJump(piece);
  triggerOuterTask(piece);
}

function moveStraight(piece, steps) {
  const need = 6 - piece.straightIndex;
  if (steps === need) {
    for (let index = piece.straightIndex + 1; index <= 6; index++) {
      appendMovePoint(index === 6 ? { x: 50, y: 50 } : straightPath[piece.color][index - 1]);
    }
    if (need > 0) triggerStraightTask(piece);
    finishPiece(piece);
    return;
  }
  if (steps > need) {
    const bounce = steps - need;
    for (let index = piece.straightIndex + 1; index <= 6; index++) {
      appendMovePoint(index === 6 ? { x: 50, y: 50 } : straightPath[piece.color][index - 1]);
    }
    for (let index = 5; index >= Math.max(0, 6 - bounce); index--) {
      appendMovePoint(index === 0 ? outerPath[ENTRY_INDEX[piece.color]] : straightPath[piece.color][index - 1]);
    }
    piece.straightIndex = Math.max(0, 6 - bounce);
    addLog(`${piece.name} 超出终点，后退`);
    triggerStraightTask(piece);
    return;
  }
  const target = piece.straightIndex + steps;
  for (let index = piece.straightIndex + 1; index <= target; index++) {
    appendMovePoint(straightPath[piece.color][index - 1]);
  }
  piece.straightIndex = target;
  addLog(`${piece.name} 直道前进`);
  triggerStraightTask(piece);
}

function finishAnimatedMove(piece) {
  const track = pendingMoveTrack.slice();
  saveState();
  const complete = () => {
    deferModals = false;
    pendingMoveTrack = [];
    flushDeferredModal();
    saveState();
    render();
  };
  if (track.length > 1) startPieceAnimation(piece, track, complete);
  else complete();
}

function resolveDiceRoll(value) {
  lastRoll = value;
  state.lastRoll = value;
  const piece = ensureCurrentPlayable();
  if (!piece) {
    saveState();
    render();
    return;
  }
  beginMoveTrack(piece);
  deferModals = true;
  if (value === 1) drawKingCard(piece, '掷出 1 点触发');
  if (piece.status === 'base') {
    if (value === 6) {
      piece.status = 'outer';
      piece.outerIndex = START_INDEX[piece.color];
      piece.outerSteps = 0;
      appendMovePoint(outerPath[piece.outerIndex], 'fly');
      addLog(`${piece.name} 起飞，再掷一次`);
      showTask('起飞任务', tasks.takeoff);
    } else {
      addLog(`${piece.name} 未起飞，轮到下一位`);
      if (value >= 2 && value <= 5) triggerBaseRollTask(piece, value);
      endTurn(piece);
    }
  } else if (piece.status === 'outer') {
    moveOuter(piece, value);
    if (value !== 6 || piece.status === 'finished') endTurn(piece);
  } else if (piece.status === 'straight') {
    moveStraight(piece, value);
    if (value !== 6 || piece.status === 'finished') endTurn(piece);
  } else {
    endTurn(piece);
  }
  finishAnimatedMove(piece);
}

function rollDice() {
  if (rolling || pieceAnimation || modal) return;
  if (state.gameOver) { showTask('游戏结束', '本局已结束，请重开或返回大厅。'); return; }
  rolling = true;
  rollingDiceValue = Math.floor(Math.random() * 6) + 1;
  const audio = wx.createInnerAudioContext();
  audio.src = 'assets/audio/dice_roll.mp3';
  audio.onEnded(() => audio.destroy());
  audio.onError(() => audio.destroy());
  audio.play();
  const startedAt = Date.now();
  const tick = () => {
    rollingDiceValue = Math.floor(Math.random() * 6) + 1;
    render();
    if (Date.now() - startedAt < 700) {
      setTimeout(tick, 70);
      return;
    }
    const value = Math.floor(Math.random() * 6) + 1;
    rolling = false;
    rollingDiceValue = null;
    resolveDiceRoll(value);
  };
  tick();
}

function startFreshGame(message) {
  state = newGameState();
  lastRoll = '-';
  logText = message || '掷出 6 才能起飞';
  clearModals();
  saveState();
  scene = 'game';
}
function continueSavedGame() {
  const saved = normalizeState(loadState());
  if (!saved) {
    showTask('没有可继续的存档', '请先选择“新游戏”设置玩家，或使用“快速开始”创建一局。');
    return;
  }
  state = saved;
  lastRoll = state.lastRoll || '-';
  logText = logEntryText((state.logs || []).slice(-1)[0]) || '已读取本地存档';
  clearModals();
  scene = 'game';
}
function handleAction(action) {
  if (action === 'new') scene = 'settings';
  if (action === 'quick') startFreshGame('快速开始：掷出 6 才能起飞');
  if (action === 'continue') continueSavedGame();
  if (action === 'home') scene = 'home';
  if (action === 'settings') scene = 'settings';
  if (action === 'tasks') scene = 'tasks';
  if (action === 'records') scene = 'records';
  if (action === 'game') scene = 'game';
  if (action === 'restart') startFreshGame('游戏已重开：掷出 6 才能起飞');
  if (action === 'setupAdd') {
    if (setupPlayers.length >= 16) showTask('人数已满', '最多支持 16 位玩家。');
    else {
      const color = firstAvailableColor(setupPlayers, setupPlayers.length % 4);
      if (!color) showTask('颜色已满', '红、黄、蓝、绿每种颜色最多 4 位玩家。');
      else {
        setupPlayers.push({ name: `玩家${setupPlayers.length + 1}`, color });
        settingsPage = Math.floor((setupPlayers.length - 1) / SETTINGS_PAGE_SIZE);
        saveSetupPlayers();
      }
    }
  }
  if (action === 'setupRemove') {
    if (setupPlayers.length <= 2) showTask('至少两人', '游戏至少需要 2 位玩家。');
    else { setupPlayers.pop(); saveSetupPlayers(); }
  }
  if (action.startsWith('setupDelete:')) {
    const index = Number(action.split(':')[1]);
    if (setupPlayers.length <= 2) showTask('至少两人', '游戏至少需要 2 位玩家。');
    else { setupPlayers.splice(index, 1); saveSetupPlayers(); }
  }
  if (action.startsWith('setupName:')) editSetupName(Number(action.split(':')[1]));
  if (action.startsWith('setupColor:')) cycleSetupColor(Number(action.split(':')[1]));
  if (action === 'setupPrev') settingsPage = Math.max(0, settingsPage - 1);
  if (action === 'setupNext') settingsPage = Math.min(Math.max(0, Math.ceil(setupPlayers.length / SETTINGS_PAGE_SIZE) - 1), settingsPage + 1);
  if (action === 'setupApply') applySetupAndStart();
  if (action === 'recordsPlayers') { recordsTab = 'players'; progressPage = 0; }
  if (action === 'recordsLogs') { recordsTab = 'logs'; recordsPage = 0; }
  if (action === 'progressPrev') progressPage = Math.max(0, progressPage - 1);
  if (action === 'progressNext') {
    const panelH = Math.max(320, H - Math.max(safeTop + 124, 138) - safeBottom - 18);
    progressPage = Math.min(Math.max(0, Math.ceil(state.players.length / progressPageSize(panelH)) - 1), progressPage + 1);
  }
  if (action === 'recordsPrev') recordsPage = Math.max(0, recordsPage - 1);
  if (action === 'recordsNext') {
    const panelH = Math.max(320, H - Math.max(safeTop + 124, 138) - safeBottom - 18);
    recordsPage = Math.min(Math.max(0, Math.ceil((state.logs || []).length / gameRecordsPageSize(panelH)) - 1), recordsPage + 1);
  }
  if (action === 'closeModal') closeCurrentModal();
  if (action === 'roll' && !modal && !rolling && !pieceAnimation) rollDice();
  if (action === 'tasksDemo') showTask('示例任务', tasks.outer[0]);
  if (action === 'editTakeoff') editTaskText('编辑起飞任务', tasks.takeoff, value => { tasks.takeoff = value; });
  if (action === 'editBase') editBaseRollTask();
  if (action === 'editOuter') editOuterTask();
  if (action === 'editStraight') editStraightTask();
  if (action === 'editKing') editKingTask();
  if (action === 'editFinal') editFinalTask();
  if (action === 'exportTasks') exportTasksToClipboard();
  if (action === 'importTasks') importJsonByPaste();
  if (action === 'importPlain') importPlainByPaste();
  if (action === 'exportPlain') exportPlainTemplate();
  if (action === 'resetTasks') { tasks = clone(DEFAULT_TASKS); saveTasks(); showTask('已恢复默认', '任务库已恢复为默认内容。'); }
  render();
}

wx.onTouchStart((event) => {
  const touch = event.touches[0];
  const btn = hitTest(touch.clientX, touch.clientY);
  if (btn) handleAction(btn.action);
  else if (modal) return;
});

init();
render();
