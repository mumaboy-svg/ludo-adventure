
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
const GAME_VERSION = '2.0.2';
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
const bootTime = Date.now();
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
function loadSetupPlayers() { return wx.getStorageSync('ludo_minigame_setup_v1') || defaultSetupPlayers(); }
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
      img: imgForColor(player.color)
    })),
    logs: ['游戏开始，掷出 6 才能起飞'],
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
  saved.logs = Array.isArray(saved.logs) ? saved.logs : [];
  saved.gameOver = !!saved.gameOver;
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
function addLog(text) {
  logText = text;
  state.logs = state.logs || [];
  state.logs.push(text);
  if (state.logs.length > 6) state.logs = state.logs.slice(-6);
}
function showTask(title, body, actor = '', type = 'task') {
  const next = { title, body, actor, type };
  if (modal) modalQueue.push(next);
  else modal = next;
}
function clearModals() { modal = null; modalQueue = []; }
function closeCurrentModal() {
  modal = modalQueue.shift() || null;
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
  });
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

function drawHome() {
  buttons = [];
  if (images.bg) drawImageCover(images.bg, 0, 0, W, H);
  else drawWarmBackground();
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
  const startY = Math.min(preferredY, toolY - buttonBlockH - 18);
  drawMenuButton(bx, startY, bw, bh, '继续上局', '读取本地进度', 'continueIcon', 'continue', false);
  drawMenuButton(bx, startY + bh + gap, bw, bh, '新游戏', '选择玩家后开始', 'newIcon', 'new', true);
  drawMenuButton(bx, startY + (bh + gap) * 2, bw, bh, '快速开始', '默认配置开局', 'quickIcon', 'quick', false);

  drawToolBar(toolY);
  ctx.fillStyle = 'rgba(77,60,45,.66)';
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`v${GAME_VERSION}`, W / 2, H - safeBottom - 10);
  ctx.textAlign = 'left';
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
  const playerColor = colorMap[player.color] || '#f4c82f';
  fillRoundGradient(24, topPad, W - 48, 34, 17, [[0, 'rgba(255,255,255,.96)'], [1, 'rgba(255,245,210,.92)']], true);
  ctx.fillStyle = playerColor;
  ctx.beginPath();
  ctx.arc(43, topPad + 17, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#30251c';
  ctx.font = '900 14px sans-serif';
  ctx.fillText(`${player.name} 的回合`, 58, topPad + 22);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#806344';
  ctx.font = '800 11px sans-serif';
  ctx.fillText('飞行棋 · 大冒险', W - 40, topPad + 21);
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
  drawDice(W - 116, panelY + 26, 62, lastRoll);

  const contentW = W - 92;
  const gap = 14;
  const leftW = Math.floor(contentW * 0.46);
  const rightW = contentW - leftW - gap;
  drawPanelButton(46, panelY + 112, leftW, 54, '掷骰子', 'roll', true);
  drawPanelButton(46 + leftW + gap, panelY + 112, rightW, 54, '任务中心', 'tasks', false);
  const smallW = Math.floor((contentW - gap * 2) / 3);
  drawPanelButton(46, panelY + 176, smallW, 40, '设置', 'settings', false);
  drawPanelButton(46 + smallW + gap, panelY + 176, smallW, 40, '重开', 'restart', false);
  drawPanelButton(46 + (smallW + gap) * 2, panelY + 176, smallW, 40, '大厅', 'home', false);
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
  if (latest) ctx.fillText(`记录：${latest}`, 42, y + 22 + Math.min(state.players.length,4) * 15 + 8);
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

function drawPiece(piece, boardX, boardY, boardSize) {
  const pos = pieceCoord(piece);
  const px = boardX + boardSize * pos.x / 100;
  const py = boardY + boardSize * pos.y / 100;
  if (images[piece.img]) drawImageContain(images[piece.img], px - 17, py - 17, 34, 34);
  fillRoundRect(px + 10, py - 12, 44, 22, 9, 'rgba(0,0,0,.62)');
  ctx.fillStyle = '#fff';
  ctx.font = '900 11px sans-serif';
  ctx.fillText(piece.name, px + 15, py + 3);
}

function currentPiece() { return state.players[state.currentPlayer]; }
function nextPlayer() { state.currentPlayer = (state.currentPlayer + 1) % state.players.length; }


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
  drawTopTitle('玩家设置', '小游戏版基础设置：人数、颜色、重新开局');
  const startY = Math.max(safeTop + 124, 138);
  fillRoundRect(24, startY, W - 48, 330, 26, 'rgba(255,255,255,.94)', true);
  ctx.fillStyle = '#30251c';
  ctx.font = '900 19px sans-serif';
  ctx.fillText(`玩家数量：${setupPlayers.length}`, 46, startY + 38);
  drawPanelButton(46, startY + 58, 86, 40, '- 人数', 'setupRemove', false);
  drawPanelButton(146, startY + 58, 86, 40, '+ 人数', 'setupAdd', false);
  setupPlayers.forEach((player, index) => {
    const y = startY + 122 + index * 48;
    ctx.fillStyle = '#5f4a35';
    ctx.font = '900 16px sans-serif';
    ctx.fillText(`${index + 1}. ${player.name}`, 52, y);
    drawColorDot(154, y - 13, player.color);
    drawPanelButton(W - 146, y - 28, 100, 36, '换颜色', `setupColor:${index}`, false);
  });
  drawPanelButton(46, startY + 274, 126, 46, '保存开局', 'setupApply', true);
  drawPanelButton(190, startY + 274, 92, 46, '大厅', 'home', false);
  drawPanelButton(W - 138, startY + 274, 92, 46, '游戏', hasSavedState() ? 'continue' : 'quick', false);
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

function drawTasks() {
  buttons = [];
  drawTopTitle('任务中心', '先恢复任务查看；编辑和导入导出后续补齐');
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
  const next = colors[(colors.indexOf(player.color) + 1) % colors.length];
  player.color = next;
  saveSetupPlayers();
}


function ensureCurrentPlayable() {
  if (state.players.every(p => p.status === 'finished')) return null;
  let guard = 0;
  while (state.players[state.currentPlayer]?.status === 'finished' && guard < state.players.length) {
    nextPlayer();
    guard++;
  }
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
  addLog(`${piece.name} 到达终点，第 ${state.finishOrder.length} 名`);
  showTask('到达终点', `${piece.name} 第 ${state.finishOrder.length} 名到达终点！`);
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
  addLog(`${piece.name} 触发飞行航线：从 ${rule.from} 飞到 ${rule.to}`);
}

function moveOuter(piece, steps) {
  for (let step = 1; step <= steps; step++) {
    piece.outerIndex = (piece.outerIndex + 1) % OUTER_PATH_LENGTH;
    piece.outerSteps += 1;
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
    if (need > 0) triggerStraightTask(piece);
    finishPiece(piece);
    return;
  }
  if (steps > need) {
    const bounce = steps - need;
    piece.straightIndex = Math.max(0, 6 - bounce);
    addLog(`${piece.name} 超出终点，后退`);
    triggerStraightTask(piece);
    return;
  }
  piece.straightIndex += steps;
  addLog(`${piece.name} 直道前进`);
  triggerStraightTask(piece);
}

function rollDice() {
  if (state.gameOver) { showTask('游戏结束', '本局已结束，请重开或返回大厅。'); return; }
  const value = Math.floor(Math.random() * 6) + 1;
  lastRoll = value;
  state.lastRoll = value;
  const audio = wx.createInnerAudioContext();
  audio.src = 'assets/audio/dice_roll.mp3';
  audio.play();
  const piece = ensureCurrentPlayable();
  if (!piece) return;
  if (value === 1) drawKingCard(piece, '掷出 1 点触发');
  if (piece.status === 'base') {
    if (value === 6) {
      piece.status = 'outer';
      piece.outerIndex = START_INDEX[piece.color];
      piece.outerSteps = 0;
      addLog(`${piece.name} 起飞，再掷一次`);
      showTask('起飞任务', tasks.takeoff);
    } else {
      addLog(`${piece.name} 未起飞，轮到下一位`);
      if (value >= 2 && value <= 5) triggerBaseRollTask(piece, value);
      nextPlayer();
    }
  } else if (piece.status === 'outer') {
    moveOuter(piece, value);
    if (value !== 6 || piece.status === 'finished') nextPlayer();
  } else if (piece.status === 'straight') {
    moveStraight(piece, value);
    if (value !== 6 || piece.status === 'finished') nextPlayer();
  } else {
    nextPlayer();
  }
  saveState();
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
  logText = (state.logs || []).slice(-1)[0] || '已读取本地存档';
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
  if (action === 'restart') startFreshGame('游戏已重开：掷出 6 才能起飞');
  if (action === 'setupAdd' && setupPlayers.length < 4) { setupPlayers.push({ name: `玩家${setupPlayers.length + 1}`, color: ['R','Y','B','G'][setupPlayers.length] }); saveSetupPlayers(); }
  if (action === 'setupRemove' && setupPlayers.length > 2) { setupPlayers.pop(); saveSetupPlayers(); }
  if (action.startsWith('setupColor:')) cycleSetupColor(Number(action.split(':')[1]));
  if (action === 'setupApply') { saveSetupPlayers(); startFreshGame('设置已保存，新局开始'); }
  if (action === 'closeModal') closeCurrentModal();
  if (action === 'roll' && !modal) rollDice();
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
