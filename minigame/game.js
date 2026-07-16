
const commercialTaskLibrary = require('./data/commercial_tasks.js');

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
const GAME_VERSION = '2.7.8';
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
  pieceTestIcon: 'assets/minigame/ui/icon_piece_test.png',
  settingsBg: 'assets/images/ui/settings_bg_mobile.webp',
  tasksBg: 'assets/images/ui/task_center_bg_mobile.webp',
  userHud: 'assets/images/ui/user_hud.webp',
  dicePanel: 'assets/images/ui/dice_panel.webp',
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
let modalOpenedAt = 0;
let settingsPage = 0;
let progressPage = 0;
let recordsPage = 0;
let recordsTab = 'players';
let taskCategory = 'base';
let taskPage = 0;
let taskView = 'modes';
let boardDebug = false;
let rolling = false;
let rollingDiceValue = null;
let pieceAnimation = null;
let pendingMoveTrack = [];
let deferModals = false;
let backgroundMusic = null;
let backgroundMusicRequested = false;
let backgroundMusicEnabled = wx.getStorageSync('ludo_minigame_bgm_enabled_v1') !== false;
const TASK_PACK_LABELS = { safe_family: '家庭安全', party_light: '聚会轻松', party_fun: '聚会搞笑', couple_light: '情侣互动', king: '国王卡' };
const DEFAULT_TASK_PACKS = { safe_family: true, party_light: true, party_fun: true, couple_light: false, king: true };
const TASK_PACK_PRESETS = {
  family: { enabled: true, packs: { safe_family: true, party_light: false, party_fun: false, couple_light: false, king: true } },
  party: { enabled: true, packs: { safe_family: false, party_light: true, party_fun: true, couple_light: false, king: true } },
  couple: { enabled: true, packs: { safe_family: false, party_light: false, party_fun: false, couple_light: true, king: true } },
  all: { enabled: true, packs: { safe_family: true, party_light: true, party_fun: true, couple_light: false, king: true } },
  manual: { enabled: false, packs: DEFAULT_TASK_PACKS }
};
let taskPackSettings = loadTaskPackSettings();
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
function savedGameSummary() {
  const saved = normalizeState(loadState());
  if (!saved) return '暂无本地进度';
  const current = saved.players[saved.currentPlayer];
  if (saved.gameOver) return `${saved.players.length} 名玩家 · 本局已结束`;
  return `${saved.players.length} 名玩家 · 第 ${saved.round || 1} 轮 · ${shortText(current?.name || '玩家', 6)}`;
}
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
function loadTaskPackSettings() {
  const saved = wx.getStorageSync('ludo_minigame_task_packs_v1');
  return {
    enabled: !!saved?.enabled,
    preset: String(saved?.preset || (saved?.enabled ? 'custom' : 'manual')),
    packs: { ...DEFAULT_TASK_PACKS, ...(saved?.packs || {}) }
  };
}
function saveTaskPackSettings() { wx.setStorageSync('ludo_minigame_task_packs_v1', taskPackSettings); }
function commercialTaskModeActive() {
  return !!(taskPackSettings.enabled && commercialTaskLibrary?.modes && Array.isArray(commercialTaskLibrary?.tasks));
}
function libraryModeName(name = taskPackSettings.preset) { return name === 'all' ? 'all-light' : name; }
function resolveModeCatalog(name = libraryModeName()) {
  if (!commercialTaskModeActive() || !name || name === 'manual') return null;
  const catalog = commercialTaskLibrary.modes[name];
  if (!catalog) return null;
  if (!Array.isArray(catalog.inherits)) return catalog;
  const inherited = catalog.inherits.map(modeName => resolveModeCatalog(modeName)).filter(Boolean);
  return {
    ...catalog,
    takeoff: inherited.flatMap(mode => mode.takeoff || []),
    baseRoll: [2, 3, 4, 5].reduce((result, value) => {
      result[value] = inherited.flatMap(mode => mode.baseRoll?.[value] || mode.baseRoll?.[String(value)] || []);
      return result;
    }, {}),
    outer: inherited.flatMap(mode => mode.outer || []),
    straight: inherited.flatMap(mode => mode.straight || []),
    king: [...new Set(inherited.flatMap(mode => mode.king || []))],
    final: inherited.flatMap(mode => mode.final || [])
  };
}
function commercialTaskById(id) { return commercialTaskLibrary.tasks.find(task => task.id === id) || null; }
function modeTaskList(type, value) {
  const catalog = resolveModeCatalog();
  const entries = type === 'baseRoll' ? (catalog?.baseRoll?.[value] || catalog?.baseRoll?.[String(value)]) : catalog?.[type];
  if (!Array.isArray(entries)) return [];
  return entries.map(entry => typeof entry === 'string' ? commercialTaskById(entry) : entry)
    .filter(task => task?.content && task.requiresAdult !== true);
}
function enabledCommercialTasks() {
  if (!commercialTaskModeActive()) return [];
  return ['takeoff', 'outer', 'straight'].flatMap(type => modeTaskList(type))
    .concat([2, 3, 4, 5].flatMap(value => modeTaskList('baseRoll', value)));
}
function enabledCommercialKingTasks() { return modeTaskList('king'); }
function pickTask(list) { return list?.length ? list[Math.floor(Math.random() * list.length)] : null; }
function activeTaskTotal() {
  if (!commercialTaskModeActive()) return taskTotal();
  const entries = ['takeoff', 'outer', 'straight', 'king', 'final'].flatMap(type => modeTaskList(type))
    .concat([2, 3, 4, 5].flatMap(value => modeTaskList('baseRoll', value)));
  return new Set(entries.map(task => task.id || `${task.title}:${task.content}`)).size;
}
function taskModeLabel() {
  const labels = { manual: '手动任务', family: '家庭模式', party: '聚会模式', couple: '情侣模式', all: '轻松全集', custom: '自选任务包' };
  return taskPackSettings.enabled ? (labels[taskPackSettings.preset] || labels.custom) : labels.manual;
}
function setTaskPackPreset(name) {
  const preset = TASK_PACK_PRESETS[name];
  if (!preset) return;
  taskPackSettings = { enabled: preset.enabled, preset: name, packs: { ...DEFAULT_TASK_PACKS, ...preset.packs } };
  saveTaskPackSettings();
}
function showTaskPackMenu() {
  wx.showActionSheet({
    itemList: ['手动任务', '家庭模式', '聚会模式', '情侣模式', '轻松全集', '自选任务包'],
    success(res) {
      const modes = ['manual', 'family', 'party', 'couple', 'all'];
      if (res.tapIndex < modes.length) {
        setTaskPackPreset(modes[res.tapIndex]);
        const normal = enabledCommercialTasks().length;
        const king = enabledCommercialKingTasks().length;
        showTask('任务模式已切换', taskPackSettings.enabled ? `${taskModeLabel()}：普通任务 ${normal} 条，国王卡 ${king} 条。` : '游戏将使用任务中心内逐条编辑的手动任务。');
      } else showCustomTaskPackMenu();
      render();
    },
    fail(err) { if (!String(err.errMsg || '').includes('cancel')) showTask('打开失败', err.errMsg || '无法打开任务模式菜单'); }
  });
}
function showCustomTaskPackMenu() {
  const keys = Object.keys(TASK_PACK_LABELS);
  wx.showActionSheet({
    itemList: keys.map(key => `${taskPackSettings.packs[key] ? '✓' : '○'} ${TASK_PACK_LABELS[key]}`),
    success(res) {
      const key = keys[res.tapIndex];
      if (!key) return;
      taskPackSettings.enabled = true;
      taskPackSettings.preset = 'custom';
      taskPackSettings.packs[key] = !taskPackSettings.packs[key];
      saveTaskPackSettings();
      showCustomTaskPackMenu();
      render();
    },
    fail(err) { if (!String(err.errMsg || '').includes('cancel')) showTask('打开失败', err.errMsg || '无法打开自选任务包'); }
  });
}

function taskTotal() {
  return [
    tasks?.takeoff,
    tasks?.final,
    ...Object.values(tasks?.baseRoll || {}),
    ...(tasks?.outer || []),
    ...(tasks?.straight || []),
    ...(tasks?.king || [])
  ].filter(value => String(value || '').trim()).length;
}
function taskCheckReport(source = tasks) {
  const groups = [
    ['起飞任务', [source?.takeoff]],
    ['基地掷骰任务', [2, 3, 4, 5].map(point => source?.baseRoll?.[point])],
    ['外圈任务', Array.from({ length: 12 }, (_, index) => source?.outer?.[index])],
    ['直道任务', Array.from({ length: 6 }, (_, index) => source?.straight?.[index])],
    ['国王卡', Array.from({ length: 13 }, (_, index) => source?.king?.[index])],
    ['终极惩罚', [source?.final]]
  ];
  const lines = groups.map(([name, list]) => {
    const filled = list.filter(value => String(value || '').trim()).length;
    return `${name}：${filled}/${list.length}`;
  });
  const missing = groups.flatMap(([name, list]) => list
    .map((value, index) => String(value || '').trim() ? null : `${name} ${index + 1}`)
    .filter(Boolean));
  return {
    complete: missing.length === 0,
    missing,
    message: `${lines.join('\n')}\n\n${missing.length ? `缺少内容：\n${missing.join('\n')}` : '任务内容完整，可以开始游戏。'}`
  };
}
function logEntryText(entry) { return typeof entry === 'string' ? entry : String(entry?.text || ''); }
function logVisualMeta(entry) {
  const type = typeof entry === 'string' ? '' : String(entry?.type || '');
  const text = logEntryText(entry);
  if (type === 'hot' || /掷出|骰/.test(text)) return { key: 'roll', label: '掷骰', icon: '🎲', color: '#f5a623', ink: '#7d3f00', bg: '#fff5d8' };
  if (/国王卡|国王/.test(text)) return { key: 'king', label: '国王卡', icon: '👑', color: '#9b68da', ink: '#54237e', bg: '#f4ecff' };
  if (type === 'task' || /任务/.test(text)) return { key: 'task', label: '任务', icon: '🎯', color: '#3f9fe2', ink: '#164e79', bg: '#eaf7ff' };
  if (type === 'bad') return { key: 'warning', label: '提示', icon: '⚠️', color: '#e65b4b', ink: '#7c2017', bg: '#fff0ed' };
  if (/落在|前进|移动|进入直道|飞行航线|起飞|反弹|终点/.test(text)) return { key: 'move', label: '移动', icon: '✈️', color: '#32b65a', ink: '#165b27', bg: '#edfaee' };
  if (type === 'good') return { key: 'reward', label: '进展', icon: '✨', color: '#64bd48', ink: '#286326', bg: '#f1fae9' };
  return { key: 'system', label: '系统', icon: '📜', color: '#c58d30', ink: '#684827', bg: '#fff8e9' };
}
function logTimeLabel(entry, latest = false) {
  if (latest) return '最新';
  const at = typeof entry === 'string' ? 0 : Number(entry?.at || 0);
  if (!at) return '历史';
  const date = new Date(at);
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
}
function addLog(text, type = '') {
  logText = text;
  state.logs = state.logs || [];
  state.logs.push({ text, type, at: Date.now() });
  if (state.logs.length > 180) state.logs = state.logs.slice(-180);
}
function showTask(title, body, actor = '', type = 'task') {
  const next = { title, body, actor, type };
  if (modal || deferModals) modalQueue.push(next);
  else {
    modal = next;
    startModalAnimation();
  }
}
function startModalAnimation() {
  modalOpenedAt = Date.now();
  [0, 50, 100, 160, 220].forEach(delay => setTimeout(() => { if (modal) render(); }, delay));
}
function clearModals() { modal = null; modalQueue = []; modalOpenedAt = 0; }
function closeCurrentModal() {
  modal = modalQueue.shift() || null;
  if (modal) startModalAnimation();
  else modalOpenedAt = 0;
}
function flushDeferredModal() {
  if (!modal) {
    modal = modalQueue.shift() || null;
    if (modal) startModalAnimation();
  }
}
function triggerBaseRollTask(piece, value) {
  const key = `base-${piece.id}-${value}`;
  if (state.triggered[key]) return;
  state.triggered[key] = true;
  const commercial = pickTask(modeTaskList('baseRoll', value));
  showTask(commercial?.title || `基地任务 ${value}点`, commercial?.content || tasks.baseRoll[value] || `掷出 ${value} 点任务`, commercial ? `${piece.name} · ${taskModeLabel()} · 基地${value}点` : piece.name);
}
function triggerOuterTask(piece) {
  const commercial = pickTask(modeTaskList('outer'));
  if (commercial) showTask(commercial.title || TASK_PACK_LABELS[commercial.pack] || '任务卡', commercial.content, `${piece.name} · ${TASK_PACK_LABELS[commercial.pack] || commercial.pack}`);
  else {
    const index = piece.outerIndex % tasks.outer.length;
    showTask(`外圈任务`, tasks.outer[index], piece.name);
  }
}
function triggerStraightTask(piece) {
  if (piece.straightIndex < 1 || piece.straightIndex > 5) return;
  const commercial = pickTask(modeTaskList('straight'));
  if (commercial) showTask(commercial.title || TASK_PACK_LABELS[commercial.pack] || '任务卡', commercial.content, `${piece.name} · ${TASK_PACK_LABELS[commercial.pack] || commercial.pack}`);
  else showTask(`直道任务 ${piece.straightIndex}`, tasks.straight[piece.straightIndex - 1], piece.name);
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
    playBackgroundMusic();
    render();
    startHomeAnimationLoop();
  });
}

function ensureBackgroundMusic() {
  if (backgroundMusic || typeof wx.createInnerAudioContext !== 'function') return backgroundMusic;
  backgroundMusic = wx.createInnerAudioContext();
  backgroundMusic.src = 'assets/audio/background_music.mp3';
  backgroundMusic.loop = true;
  backgroundMusic.autoplay = false;
  backgroundMusic.volume = 0.22;
  backgroundMusic.obeyMuteSwitch = true;
  backgroundMusic.onError((error) => {
    backgroundMusicRequested = false;
    console.warn('background music failed', error);
  });
  return backgroundMusic;
}

function playBackgroundMusic() {
  if (!backgroundMusicEnabled) return;
  const audio = ensureBackgroundMusic();
  if (!audio) return;
  backgroundMusicRequested = true;
  audio.play();
}

function pauseBackgroundMusic() {
  if (backgroundMusic && typeof backgroundMusic.pause === 'function') backgroundMusic.pause();
}

function setBackgroundMusicEnabled(enabled) {
  backgroundMusicEnabled = !!enabled;
  wx.setStorageSync('ludo_minigame_bgm_enabled_v1', backgroundMusicEnabled);
  if (backgroundMusicEnabled) {
    playBackgroundMusic();
  } else {
    backgroundMusicRequested = false;
    pauseBackgroundMusic();
  }
}

if (typeof wx.onShow === 'function') wx.onShow(() => {
  if (backgroundMusicRequested) playBackgroundMusic();
});
if (typeof wx.onHide === 'function') wx.onHide(pauseBackgroundMusic);
if (typeof wx.onAudioInterruptionBegin === 'function') wx.onAudioInterruptionBegin(pauseBackgroundMusic);
if (typeof wx.onAudioInterruptionEnd === 'function') wx.onAudioInterruptionEnd(() => {
  if (backgroundMusicRequested) playBackgroundMusic();
});

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


function drawPageBackground(assetKey) {
  if (images[assetKey]) {
    drawImageCover(images[assetKey], 0, 0, W, H);
    const veil = ctx.createLinearGradient(0, 0, 0, H);
    veil.addColorStop(0, 'rgba(255,255,255,.08)');
    veil.addColorStop(1, 'rgba(255,244,214,.18)');
    ctx.fillStyle = veil;
    ctx.fillRect(0, 0, W, H);
  } else drawWarmBackground();
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
  const pillW = Math.min(54, Math.max(44, W * .13));
  const gap = 5;
  drawHomePill(8, y, pillW, '任务', activeTaskTotal());
  drawHomePill(8 + pillW + gap, y, pillW, '玩家', setupPlayers.length);
  const saveW = Math.min(50, Math.max(42, W * .12));
  const versionText = `v${GAME_VERSION}`;
  const vw = Math.min(66, Math.max(54, W * .16));
  const versionX = W - vw - 8;
  const saveX = versionX - saveW - gap;
  drawHomePill(saveX, y, saveW, '存档', hasSavedState() ? '有' : '无');
  fillRoundGradient(versionX, y + 3, vw, 28, 14, [[0, 'rgba(255,255,255,.88)'], [1, 'rgba(255,245,205,.7)']], false);
  strokeRoundRect(versionX, y + 3, vw, 28, 14, 'rgba(255,255,255,.78)', 1);
  ctx.fillStyle = '#5f4b35';
  ctx.font = '900 10px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(versionText, versionX + vw / 2, y + 21);
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
  drawMenuButton(bx, startY, bw, bh, '继续上局', savedGameSummary(), 'continueIcon', 'continue', false);
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
  const w = Math.min(100, (W - 52) / 3);
  const h = 68;
  fillRoundGradient(x, y, w, h, 18, [[0, 'rgba(255,255,255,.32)'], [1, 'rgba(255,245,202,.18)']], false);
  strokeRoundRect(x, y, w, h, 18, 'rgba(255,255,255,.5)', 1);
  if (images[icon]) {
    ctx.save();
    ctx.shadowColor = 'rgba(55,34,12,.24)';
    ctx.shadowBlur = 7;
    ctx.shadowOffsetY = 3;
    drawImageContain(images[icon], x + (w - 40) / 2, y + 2, 40, 40);
    ctx.restore();
  }
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#30251c';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(title, x + w / 2, y + 58);
  ctx.shadowBlur = 0;
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function drawToolBar(y) {
  const gap = 7;
  const w = Math.min(100, (W - 52) / 3);
  const total = w * 3 + gap * 2;
  const x = (W - total) / 2;
  fillRoundGradient(x - 10, y - 7, total + 20, 82, 23, [[0, 'rgba(255,255,255,.28)'], [1, 'rgba(255,241,175,.2)']], false);
  strokeRoundRect(x - 10, y - 7, total + 20, 82, 23, 'rgba(255,255,255,.48)', 1);
  drawTool(x, y, '任务', 'tasksIcon', 'tasks');
  drawTool(x + w + gap, y, '设置', 'settingsIcon', 'settings');
  drawTool(x + (w + gap) * 2, y, '棋子', 'pieceTestIcon', 'pieces');
}

function drawGame() {
  buttons = [];
  drawWarmBackground();

  const topPad = Math.max(capsuleBottom + 12, safeTop + 58);
  const compact = H < 720;
  const hudH = compact ? 50 : Math.min(68, (W - 48) / 5);
  const panelH = compact ? 194 : 206;
  const bottomPad = Math.max(16, safeBottom + 10);
  const boardY = topPad + hudH + 12;
  const maxBoardH = H - boardY - panelH - bottomPad - 22;
  const boardSize = Math.min(W - 52, maxBoardH, 330);
  const boardX = (W - boardSize) / 2;

  const player = currentPiece();
  const colorMap = { R: '#ef4b3e', Y: '#f4c82f', B: '#28aee7', G: '#43c95e' };
  const playerColor = state.gameOver ? '#d49b24' : (colorMap[player?.color] || '#f4c82f');
  const hudX = 24;
  const hudW = W - 48;
  if (images.userHud) drawImageContain(images.userHud, hudX, topPad, hudW, hudH);
  else fillRoundGradient(hudX, topPad, hudW, hudH, 20, [[0, 'rgba(255,255,255,.96)'], [1, 'rgba(255,245,210,.92)']], true);
  ctx.save();
  ctx.fillStyle = playerColor;
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 13;
  fillRoundRect(hudX + 12, topPad + 12, 6, hudH - 24, 3, playerColor, false);
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#775b38';
  ctx.font = `900 ${compact ? 9 : 10}px sans-serif`;
  ctx.fillText('当前玩家', hudX + 28, topPad + (compact ? 17 : 21));
  ctx.fillStyle = '#30251c';
  ctx.font = `900 ${compact ? 15 : 18}px sans-serif`;
  ctx.fillText(state.gameOver ? '本局已结束' : (player?.name || '玩家'), hudX + 28, topPad + (compact ? 36 : 45));
  const badgeH = compact ? 24 : 28;
  const badgeY = topPad + (hudH - badgeH) / 2;
  const badgeW = compact ? 60 : 68;
  const badgeGap = 6;
  const lastX = hudX + hudW - badgeW - 14;
  const roundX = lastX - badgeW - badgeGap;
  fillRoundGradient(roundX, badgeY, badgeW, badgeH, badgeH / 2, [[0, '#fff9b5'], [1, '#efa12a']], true);
  fillRoundGradient(lastX, badgeY, badgeW, badgeH, badgeH / 2, [[0, '#fff9b5'], [1, '#efa12a']], true);
  ctx.fillStyle = '#67380b';
  ctx.font = `900 ${compact ? 9 : 10}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(`第 ${state.round || 1} 轮`, roundX + badgeW / 2, badgeY + badgeH * .67);
  ctx.fillText(`点数 ${lastRoll}`, lastX + badgeW / 2, badgeY + badgeH * .67);
  ctx.textAlign = 'left';
  ctx.restore();

  const frameX = boardX - 12;
  const frameY = boardY - 12;
  const frameSize = boardSize + 24;
  ctx.save();
  ctx.shadowColor = 'rgba(49,27,11,.34)';
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 13;
  fillRoundGradient(frameX, frameY + 8, frameSize, frameSize + 8, 26,
    [[0, '#8a4a25'], [.62, '#603116'], [1, '#3c210f']], false);
  ctx.restore();
  fillRoundGradient(frameX, frameY, frameSize, frameSize, 26,
    [[0, '#f8d78e'], [.34, '#d28a42'], [.72, '#a4572b'], [1, '#713719']], false);
  strokeRoundRect(frameX, frameY, frameSize, frameSize, 26, '#6a3519', 2);
  strokeRoundRect(frameX + 4, frameY + 4, frameSize - 8, frameSize - 8, 22, 'rgba(255,239,181,.92)', 3);
  strokeRoundRect(boardX - 3, boardY - 3, boardSize + 6, boardSize + 6, 18, 'rgba(67,34,15,.60)', 3);
  ctx.save();
  ctx.strokeStyle = playerColor;
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.shadowColor = playerColor;
  ctx.shadowBlur = 12;
  ctx.beginPath();
  ctx.moveTo(frameX + frameSize * .22, frameY + 2);
  ctx.lineTo(frameX + frameSize * .78, frameY + 2);
  ctx.stroke();
  ctx.restore();
  drawImageContain(images.board, boardX, boardY, boardSize, boardSize);
  if (boardDebug) drawBoardDebugLabels(boardX, boardY, boardSize);
  state.players.forEach((piece) => drawPiece(piece, boardX, boardY, boardSize));

  const panelY = boardY + boardSize + 18;
  fillRoundGradient(24, panelY, W - 48, panelH, 28,
    [[0, 'rgba(255,255,255,.98)'], [.55, 'rgba(255,248,226,.97)'], [1, 'rgba(255,230,170,.94)']], true);
  strokeRoundRect(24, panelY, W - 48, panelH, 28, 'rgba(255,255,255,.94)', 2);

  const diceX = 34;
  const diceW = W - 68;
  const diceH = Math.min(compact ? 72 : 82, diceW / 4);
  const diceY = panelY + 10;
  if (images.dicePanel) drawImageContain(images.dicePanel, diceX, diceY, diceW, diceH);
  else fillRoundGradient(diceX, diceY, diceW, diceH, 24, [[0, '#e8d9ff'], [1, '#8b65d8']], true);
  const diceSize = Math.min(58, diceH - 18);
  const diceBoxX = diceX + 13;
  const diceBoxY = diceY + (diceH - diceSize) / 2;
  ctx.save();
  ctx.shadowColor = 'rgba(43,28,92,.38)';
  ctx.shadowBlur = 10;
  fillRoundGradient(diceBoxX - 5, diceBoxY - 5, diceSize + 10, diceSize + 10, 18,
    [[0, 'rgba(255,255,255,.98)'], [1, 'rgba(255,221,133,.92)']], true);
  ctx.shadowBlur = 0;
  drawDice(diceBoxX, diceBoxY, diceSize, rolling ? rollingDiceValue : lastRoll);
  const actionX = diceBoxX + diceSize + 16;
  const actionW = diceX + diceW - actionX - 12;
  ctx.fillStyle = '#4f260d';
  ctx.textAlign = 'center';
  ctx.font = `900 ${compact ? 16 : 19}px sans-serif`;
  const rollLabel = rolling ? '骰子滚动中…' : pieceAnimation ? '飞机移动中…' : state.gameOver ? '查看本局排名' : '🎲 掷骰子';
  ctx.fillText(rollLabel, actionX + actionW / 2, diceY + diceH * .47);
  ctx.fillStyle = '#76503a';
  ctx.font = `800 ${compact ? 9 : 10}px sans-serif`;
  ctx.fillText(state.gameOver ? '本局已经结束' : String(logText || '点击开始行动').slice(0, 18), actionX + actionW / 2, diceY + diceH * .70);
  ctx.textAlign = 'left';
  ctx.restore();
  buttons.push({ x: actionX, y: diceY + 6, w: actionW, h: diceH - 12, action: state.gameOver ? 'records' : 'roll' });
  buttons.push({ x: diceBoxX - 6, y: diceBoxY - 6, w: diceSize + 12, h: diceSize + 12, action: state.gameOver ? 'records' : 'roll' });

  const contentW = W - 92;
  const mainGap = 10;
  const firstRowY = diceY + diceH + 9;
  const halfW = Math.floor((contentW - mainGap) / 2);
  drawPanelButton(46, firstRowY, halfW, 42, '任务中心', 'tasks', false);
  drawPanelButton(46 + halfW + mainGap, firstRowY, halfW, 42, '玩家进度', 'records', false);
  const smallGap = 6;
  const smallW = Math.floor((contentW - smallGap * 3) / 4);
  const smallY = firstRowY + 49;
  drawPanelButton(46, smallY, smallW, 36, '设置', 'settings', false);
  drawPanelButton(46 + smallW + smallGap, smallY, smallW, 36, boardDebug ? '隐藏' : '点位', 'boardDebug', boardDebug);
  drawPanelButton(46 + (smallW + smallGap) * 2, smallY, smallW, 36, '重开', 'restart', false);
  drawPanelButton(46 + (smallW + smallGap) * 3, smallY, smallW, 36, '大厅', 'home', false);
  drawMiniProgress(panelY + panelH + 10);
}

function drawBoardDebugLabels(boardX, boardY, boardSize) {
  const markedOuter = new Set([
    ...Object.values(START_INDEX).map(index => index + 1),
    ...Object.values(ENTRY_INDEX).map(index => index + 1),
    ...Object.values(FLY_JUMP_RULES).flatMap(rule => [rule.from, rule.to])
  ]);
  const drawLabel = (pos, text, marked = false) => {
    const x = boardX + boardSize * pos.x / 100;
    const y = boardY + boardSize * pos.y / 100;
    const radius = boardSize < 300 ? 5.2 : 6;
    ctx.save();
    ctx.fillStyle = marked ? 'rgba(255,71,52,.92)' : 'rgba(38,28,20,.76)';
    ctx.beginPath();
    ctx.arc(x, y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,.92)';
    ctx.lineWidth = 1;
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `900 ${boardSize < 300 ? 6.5 : 7.5}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(String(text), x, y + .3);
    ctx.restore();
  };
  outerPath.forEach((pos, index) => drawLabel(pos, index + 1, markedOuter.has(index + 1)));
  Object.entries(straightPath).forEach(([color, path]) => {
    path.forEach((pos, index) => drawLabel(pos, `${color}${index + 1}`));
  });
  Object.entries(baseSlots).forEach(([color, slots]) => {
    slots.forEach((pos, index) => drawLabel(pos, `${color}${index + 1}`));
  });
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
  buttons.push({ x: 0, y: 0, w: W, h: H, action: 'modalBackdrop' });
  const progress = Math.min(1, Math.max(0, (Date.now() - modalOpenedAt) / 190));
  const eased = 1 - Math.pow(1 - progress, 3);
  const scale = .92 + eased * .08;
  ctx.fillStyle = `rgba(20,12,7,${.42 + eased * .27})`;
  ctx.fillRect(0, 0, W, H);
  const isKing = modal.type === 'king' || String(modal.title || '').includes('国王卡');
  const cardImage = isKing ? images.kingCard : images.taskCard;
  const cardSize = Math.min(W - 18, H - Math.max(capsuleBottom + 24, 84) - 18, 390);
  const cx = Math.round((W - cardSize) / 2);
  const cy = Math.round(Math.max(capsuleBottom + 16, (H - cardSize) / 2 - 8));
  ctx.save();
  ctx.globalAlpha = .45 + eased * .55;
  ctx.translate(W / 2, cy + cardSize / 2);
  ctx.scale(scale, scale);
  ctx.translate(-W / 2, -(cy + cardSize / 2));
  ctx.shadowColor = isKing ? 'rgba(255,189,37,.62)' : 'rgba(255,255,255,.52)';
  ctx.shadowBlur = 24;
  ctx.shadowOffsetY = 9;
  if (cardImage) drawImageContain(cardImage, cx, cy, cardSize, cardSize);
  else fillRoundRect(cx, cy, cardSize, cardSize, 28, '#fff7df', false);
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
  const confirmX = Math.round(cx + cardSize * 0.31);
  const confirmY = Math.round(cy + cardSize * 0.78);
  const confirmW = Math.round(cardSize * 0.38);
  fillRoundGradient(confirmX, confirmY, confirmW, 42, 21, [[0, '#ffe66a'], [.55, '#ffb631'], [1, '#ed7628']], true);
  strokeRoundRect(confirmX, confirmY, confirmW, 42, 21, 'rgba(255,255,255,.9)', 2);
  ctx.fillStyle = '#542d0e';
  ctx.font = '900 14px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('完成，继续', confirmX + confirmW / 2, confirmY + 27);
  ctx.textAlign = 'left';
  const closeSize = 36;
  const closeX = Math.round(cx + cardSize * .77);
  const closeY = Math.round(cy + cardSize * .14);
  fillRoundGradient(closeX, closeY, closeSize, closeSize, 18, [[0, '#fffdf4'], [1, '#f4c879']], true);
  strokeRoundRect(closeX, closeY, closeSize, closeSize, 18, 'rgba(255,255,255,.9)', 2);
  ctx.fillStyle = '#6b3e1a';
  ctx.font = '900 23px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('×', closeX + closeSize / 2, closeY + 25);
  ctx.textAlign = 'left';
  ctx.restore();
  buttons.push({ x: confirmX, y: confirmY, w: confirmW, h: 42, action: 'closeModal' });
  buttons.push({ x: closeX, y: closeY, w: closeSize, h: closeSize, action: 'closeModal' });
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
  const compact = w < 48;
  ctx.font = `900 ${h >= 50 ? 18 : compact ? 12 : 15}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + (h >= 50 ? 7 : 5));
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function drawSwitchControl(x, y, w, h, enabled, action) {
  const track = enabled
    ? [[0, '#79e18f'], [1, '#35aa58']]
    : [[0, '#cfd2d4'], [1, '#858c92']];
  fillRoundGradient(x, y, w, h, h / 2, track, true);
  strokeRoundRect(x, y, w, h, h / 2, 'rgba(255,255,255,.92)', 2);
  const knob = h - 8;
  const knobX = enabled ? x + w - knob - 4 : x + 4;
  fillRoundGradient(knobX, y + 4, knob, knob, knob / 2, [[0, '#ffffff'], [1, '#fff1d4']], true);
  ctx.fillStyle = '#fff';
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(enabled ? '开' : '关', enabled ? x + 17 : x + w - 17, y + h / 2 + 4);
  ctx.textAlign = 'left';
  buttons.push({ x, y, w, h, action });
}

function drawDangerButton(x, y, w, h, text, action) {
  fillRoundGradient(x, y, w, h, h / 2, [[0, '#ff8d7c'], [.58, '#e85140'], [1, '#c9362b']], true);
  strokeRoundRect(x, y, w, h, h / 2, 'rgba(255,255,255,.88)', 2);
  ctx.fillStyle = '#fff';
  ctx.font = `900 ${w < 90 ? 12 : 14}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillText(text, x + w / 2, y + h / 2 + 5);
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
  else if (scene === 'pieces') drawPieceTest();
  drawModal();
}

function hitTest(x, y) {
  for (let i = buttons.length - 1; i >= 0; i--) {
    const btn = buttons[i];
    if (x >= btn.x && x <= btn.x + btn.w && y >= btn.y && y <= btn.y + btn.h) return btn;
  }
  return null;
}



function drawTopTitle(title, sub, backgroundAsset = '') {
  if (backgroundAsset) drawPageBackground(backgroundAsset);
  else drawWarmBackground();
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
  drawTopTitle('游戏设置', '玩家、声音、视觉与本地数据', 'settingsBg');
  const titleY = Math.max(safeTop + 14, 34);
  drawSwitchControl(W - 126, titleY + 18, 78, 38, backgroundMusicEnabled, 'toggleMusic');

  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.min(520, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,255,255,.94)', true);

  const counts = countColors(setupPlayers);
  ctx.fillStyle = '#30251c';
  ctx.font = '900 18px sans-serif';
  ctx.fillText(`🎮 游戏设置 · 玩家 ${setupPlayers.length}/16`, 42, startY + 32);
  ctx.fillStyle = '#806344';
  ctx.font = '800 10px sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText(`红${counts.R}/4  黄${counts.Y}/4  蓝${counts.B}/4  绿${counts.G}/4`, W - 42, startY + 32);
  ctx.textAlign = 'left';

  ctx.fillStyle = 'rgba(255,244,211,.94)';
  roundRect(40, startY + 42, W - 80, 28, 12);
  ctx.fill();
  ctx.fillStyle = '#755334';
  ctx.font = '800 10px sans-serif';
  ctx.fillText(`🔊 背景音乐：${backgroundMusicEnabled ? '已开启' : '已关闭'}    ✨ 视觉：自动适配屏幕`, 52, startY + 60);

  const maxPage = Math.max(0, Math.ceil(setupPlayers.length / SETTINGS_PAGE_SIZE) - 1);
  settingsPage = Math.min(settingsPage, maxPage);
  const pagePlayers = setupPlayers.slice(settingsPage * SETTINGS_PAGE_SIZE, (settingsPage + 1) * SETTINGS_PAGE_SIZE);
  pagePlayers.forEach((player, offset) => {
    const index = settingsPage * SETTINGS_PAGE_SIZE + offset;
    const y = startY + 78 + offset * 60;
    fillRoundGradient(40, y, W - 80, 50, 16, [[0, '#fffdf8'], [1, '#fff0c9']], false);
    drawColorDot(57, y + 25, player.color);
    ctx.fillStyle = '#493522';
    ctx.font = '900 14px sans-serif';
    ctx.fillText(`${index + 1}. ${shortText(player.name, 9)}`, 91, y + 30);
    drawPanelButton(W - 184, y + 7, 48, 36, '改名', `setupName:${index}`, false);
    drawPanelButton(W - 130, y + 7, 48, 36, '颜色', `setupColor:${index}`, false);
    drawPanelButton(W - 76, y + 7, 36, 36, '×', `setupDelete:${index}`, false);
  });

  const pagerY = startY + 82 + SETTINGS_PAGE_SIZE * 60;
  drawPanelButton(46, pagerY, 70, 34, '上一页', 'setupPrev', false);
  ctx.fillStyle = '#76593b';
  ctx.font = '900 13px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`${settingsPage + 1}/${maxPage + 1}`, W / 2, pagerY + 22);
  ctx.textAlign = 'left';
  drawPanelButton(W - 116, pagerY, 70, 34, '下一页', 'setupNext', false);

  const toolsY = pagerY + 43;
  drawPanelButton(46, toolsY, 104, 38, '+ 添加玩家', 'setupAdd', false);
  drawDangerButton(160, toolsY, 92, 38, '清空数据', 'clearAllData');
  const footerY = Math.min(startY + panelH - 54, toolsY + 48);
  const footerW = Math.floor((W - 116) / 3);
  drawPanelButton(46, footerY, footerW, 42, '保存开局', 'setupApply', true);
  drawPanelButton(58 + footerW, footerY, footerW, 42, '大厅', 'home', false);
  drawPanelButton(70 + footerW * 2, footerY, footerW, 42, '继续', hasSavedState() ? 'continue' : 'quick', false);
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
  const current = currentPiece();
  const colorMap = { R: '#ef4b3e', Y: '#e5b717', B: '#259fd5', G: '#35af50' };
  const cardX = 40;
  const cardW = W - 80;
  players.forEach((piece, offset) => {
    const rowGap = pageSize >= 4 ? 74 : 80;
    const y = startY + 74 + offset * rowGap;
    const isCurrent = current?.id === piece.id && !state.gameOver && piece.status !== 'finished';
    const isDone = piece.status === 'finished';
    const color = colorMap[piece.color] || '#d49b24';
    const percent = playerProgressPercent(piece);

    ctx.save();
    if (isCurrent) {
      ctx.shadowColor = color;
      ctx.shadowBlur = 14;
    }
    fillRoundGradient(cardX, y, cardW, 68, 19,
      isCurrent
        ? [[0, '#fffdf1'], [.62, '#fff5c8'], [1, color + '36']]
        : isDone
          ? [[0, '#f1fff1'], [1, '#ddf7df']]
          : [[0, '#fffefa'], [1, '#fff0d0']], true);
    ctx.shadowBlur = 0;
    strokeRoundRect(cardX, y, cardW, 68, 19, isCurrent ? color : 'rgba(255,255,255,.92)', isCurrent ? 2.5 : 1.5);
    fillRoundRect(cardX, y, 7, 68, 4, color);

    // Color avatar and plane identity.
    const avatarX = cardX + 30;
    const avatarY = y + 34;
    const avatarGlow = ctx.createRadialGradient(avatarX - 4, avatarY - 7, 2, avatarX, avatarY, 22);
    avatarGlow.addColorStop(0, '#fff');
    avatarGlow.addColorStop(.55, color + 'bb');
    avatarGlow.addColorStop(1, color);
    ctx.fillStyle = avatarGlow;
    ctx.beginPath();
    ctx.arc(avatarX, avatarY, 19, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 2;
    ctx.stroke();
    const planeImage = images[`plane${piece.color}`];
    if (planeImage) drawImageContain(planeImage, avatarX - 14, avatarY - 14, 28, 28);

    const textX = cardX + 58;
    ctx.fillStyle = '#352518';
    ctx.font = '900 14px sans-serif';
    const rankText = piece.finishPlace ? ` · 第${piece.finishPlace}名` : '';
    ctx.fillText(`${shortText(piece.name, isCurrent ? 7 : 9)}${rankText}`, textX, y + 22);

    if (isCurrent) {
      const chipW = 54;
      const chipX = cardX + cardW - chipW - 12;
      fillRoundRect(chipX, y + 8, chipW, 20, 10, color);
      ctx.fillStyle = '#fff';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('当前回合', chipX + chipW / 2, y + 22);
      ctx.textAlign = 'left';
    } else if (isDone) {
      const chipW = 40;
      const chipX = cardX + cardW - chipW - 12;
      fillRoundRect(chipX, y + 8, chipW, 20, 10, '#43b95f');
      ctx.fillStyle = '#fff';
      ctx.font = '900 10px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('完成', chipX + chipW / 2, y + 22);
      ctx.textAlign = 'left';
    }

    ctx.fillStyle = '#76593b';
    ctx.font = '800 10px sans-serif';
    ctx.fillText(shortText(statusText(piece), 17), textX, y + 39);

    const barX = textX;
    const barY = y + 49;
    const barW = cardW - 116;
    fillRoundRect(barX, barY, barW, 9, 5, 'rgba(118,89,59,.15)');
    const fillW = Math.max(8, barW * percent / 100);
    const progressGradient = ctx.createLinearGradient(barX, barY, barX + fillW, barY);
    progressGradient.addColorStop(0, color);
    progressGradient.addColorStop(1, isDone ? '#73dd82' : '#fff07a');
    fillRoundRect(barX, barY, fillW, 9, 5, progressGradient);
    ctx.fillStyle = '#684827';
    ctx.font = '900 10px sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(`${progressText(piece)} · ${percent}%`, cardX + cardW - 12, y + 57);
    ctx.textAlign = 'left';
    ctx.restore();
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
    const y = startY + 76 + offset * 64;
    const cardX = 40;
    const cardW = W - 80;
    const cardH = 58;
    const meta = logVisualMeta(entry);
    const latest = recordsPage === 0 && offset === 0;
    fillRoundRect(cardX, y, cardW, cardH, 14, meta.bg, true);
    ctx.save();
    roundRect(cardX, y, cardW, cardH, 14);
    ctx.strokeStyle = latest ? meta.color : 'rgba(255,255,255,.95)';
    ctx.lineWidth = latest ? 2 : 1;
    ctx.stroke();
    ctx.fillStyle = meta.color;
    ctx.beginPath();
    ctx.arc(cardX + 20, y + cardH / 2, 13, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = '13px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(meta.icon, cardX + 20, y + 34);
    ctx.textAlign = 'left';
    fillRoundRect(cardX + 40, y + 7, 42, 17, 9, meta.color);
    ctx.fillStyle = '#fff';
    ctx.font = '900 9px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(meta.label, cardX + 61, y + 19);
    ctx.textAlign = 'right';
    ctx.fillStyle = latest ? meta.ink : '#987b58';
    ctx.font = '800 9px sans-serif';
    ctx.fillText(logTimeLabel(entry, latest), cardX + cardW - 10, y + 19);
    ctx.textAlign = 'left';
    ctx.fillStyle = meta.ink;
    ctx.font = '800 11px sans-serif';
    drawWrappedText(logEntryText(entry), cardX + 40, y + 39, cardW - 54, 14, 2);
    ctx.restore();
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
  return Math.max(2, Math.min(5, Math.floor((panelH - 184) / 64)));
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

function drawPieceTest() {
  buttons = [];
  drawTopTitle('棋子测试', '四种飞机 · 基地坐标 · 起飞与入口核对');
  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.max(390, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,255,255,.94)', true);
  const colors = [
    { key: 'Y', name: '黄色', image: 'planeY', place: '左上机场' },
    { key: 'B', name: '蓝色', image: 'planeB', place: '右上机场' },
    { key: 'G', name: '绿色', image: 'planeG', place: '左下机场' },
    { key: 'R', name: '红色', image: 'planeR', place: '右下机场' }
  ];
  const cardW = (W - 106) / 2;
  colors.forEach((item, index) => {
    const col = index % 2;
    const row = Math.floor(index / 2);
    const x = 40 + col * (cardW + 10);
    const y = startY + 24 + row * 148;
    fillRoundGradient(x, y, cardW, 136, 18, [[0, '#fffdf8'], [1, '#fff0c9']], false);
    if (images[item.image]) drawImageContain(images[item.image], x + (cardW - 62) / 2, y + 12, 62, 62);
    ctx.fillStyle = '#30251c';
    ctx.font = '900 15px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${item.name} · ${item.place}`, x + cardW / 2, y + 88);
    ctx.fillStyle = '#76593b';
    ctx.font = '800 11px sans-serif';
    ctx.fillText(`起飞 ${START_INDEX[item.key] + 1} · 入口 ${ENTRY_INDEX[item.key] + 1}`, x + cardW / 2, y + 110);
    ctx.fillText(`基地白点 ${baseSlots[item.key].length} 个`, x + cardW / 2, y + 126);
    ctx.textAlign = 'left';
  });
  const noteY = startY + 330;
  ctx.fillStyle = '#76593b';
  ctx.font = '800 12px sans-serif';
  drawWrappedText('棋盘使用 52 个外圈点位。飞机按颜色放入对应机场，走到自己的入口后立即转入直道。', 48, noteY, W - 96, 20, 3);
  const footerY = startY + panelH - 54;
  drawPanelButton(46, footerY, 112, 40, '返回大厅', 'home', true);
  drawPanelButton(W - 158, footerY, 112, 40, '进入游戏', hasSavedState() ? 'continue' : 'quick', false);
}

const TASK_CATEGORIES = [
  { key: 'takeoff', label: '🛫 起飞' },
  { key: 'base', label: '🎲 基地' },
  { key: 'outer', label: '🗺 外圈' },
  { key: 'straight', label: '✈ 直道' },
  { key: 'king', label: '👑 国王' },
  { key: 'final', label: '🏆 终极' }
];

function taskCategoryItems(category = taskCategory) {
  const ranks = ['A','2','3','4','5','6','7','8','9','10','J','Q','K'];
  if (category === 'takeoff') return [{ label: '首次起飞', value: tasks.takeoff, action: 'taskEdit:takeoff:0' }];
  if (category === 'base') return [2, 3, 4, 5].map(point => ({
    label: `掷出 ${point} 点`, value: tasks.baseRoll?.[point] || '', action: `taskEdit:base:${point}`
  }));
  if (category === 'outer') return Array.from({ length: 12 }, (_, index) => ({
    label: `外圈任务 ${index + 1}`, value: tasks.outer?.[index] || '', action: `taskEdit:outer:${index}`
  }));
  if (category === 'straight') return Array.from({ length: 6 }, (_, index) => ({
    label: `直道第 ${index + 1} 格`, value: tasks.straight?.[index] || '', action: `taskEdit:straight:${index}`
  }));
  if (category === 'king') return Array.from({ length: 13 }, (_, index) => ({
    label: `国王卡 ${ranks[index]}`, value: tasks.king?.[index] || '', action: `taskEdit:king:${index}`
  }));
  return [{ label: '最后一名惩罚', value: tasks.final, action: 'taskEdit:final:0' }];
}

function taskEditorPageSize(panelH) {
  return panelH < 560 ? 3 : 4;
}

function editTaskItem(category, index) {
  const items = taskCategoryItems(category);
  const item = items.find(entry => entry.action === `taskEdit:${category}:${index}`);
  if (!item) return;
  editTaskText(`编辑${item.label}`, item.value, value => {
    if (category === 'takeoff') tasks.takeoff = value;
    else if (category === 'base') tasks.baseRoll[index] = value;
    else if (category === 'outer') tasks.outer[index] = value;
    else if (category === 'straight') tasks.straight[index] = value;
    else if (category === 'king') tasks.king[index] = value;
    else if (category === 'final') tasks.final = value;
  });
}

function drawTaskModeCard(x, y, w, h, title, sub, icon, action, selected = false) {
  const palette = selected
    ? [[0, 'rgba(255,249,190,.99)'], [1, 'rgba(255,181,62,.96)']]
    : [[0, 'rgba(255,255,255,.97)'], [1, 'rgba(255,239,199,.94)']];
  ctx.save();
  ctx.shadowColor = selected ? 'rgba(255,166,29,.42)' : 'rgba(88,53,20,.16)';
  ctx.shadowBlur = selected ? 18 : 10;
  ctx.shadowOffsetY = 6;
  fillRoundGradient(x, y, w, h, 22, palette, true);
  ctx.shadowBlur = 0;
  strokeRoundRect(x, y, w, h, 22, selected ? '#fff5b2' : 'rgba(255,255,255,.92)', selected ? 3 : 2);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#64390f';
  ctx.font = `900 ${h < 100 ? 25 : 31}px sans-serif`;
  ctx.fillText(icon, x + w / 2, y + (h < 100 ? 35 : 43));
  ctx.fillStyle = '#35271c';
  ctx.font = `900 ${h < 100 ? 14 : 16}px sans-serif`;
  ctx.fillText(title, x + w / 2, y + (h < 100 ? 59 : 72));
  ctx.fillStyle = '#806344';
  ctx.font = `800 ${h < 100 ? 9 : 10}px sans-serif`;
  ctx.fillText(shortText(sub, 14), x + w / 2, y + (h < 100 ? 77 : 94));
  if (selected) {
    fillRoundGradient(x + w - 48, y + 9, 38, 20, 10, [[0, '#fffbd4'], [1, '#f3a62d']], true);
    ctx.fillStyle = '#66350a';
    ctx.font = '900 9px sans-serif';
    ctx.fillText('使用中', x + w - 29, y + 23);
  }
  ctx.textAlign = 'left';
  ctx.restore();
  buttons.push({ x, y, w, h, action });
}

function selectTaskMode(name) {
  if (name === 'manual') {
    setTaskPackPreset('manual');
    taskView = 'manual';
    taskCategory = 'base';
    taskPage = 0;
    return;
  }
  setTaskPackPreset(name);
  const normal = enabledCommercialTasks().length;
  const king = enabledCommercialKingTasks().length;
  showTask('任务模式已切换', `${taskModeLabel()}：普通任务 ${normal} 条，国王卡 ${king} 条。`);
}

function drawTaskModes() {
  drawTopTitle('任务卡册', `当前：${taskModeLabel()} · 翻开适合本局的任务卡`, 'tasksBg');
  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.max(430, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,252,242,.94)', true);
  fillRoundGradient(28, startY + 26, 8, panelH - 52, 4, [[0, '#f2bd55'], [1, '#9d5b26']], false);
  for (let ringY = startY + 52; ringY < startY + panelH - 42; ringY += 54) {
    fillRoundRect(25, ringY, 16, 7, 4, '#fff0bd', false);
    strokeRoundRect(25, ringY, 16, 7, 4, '#b9782b', 1);
  }
  ctx.fillStyle = '#3b2b1f';
  ctx.font = '900 17px sans-serif';
  ctx.fillText('📚 选择任务模式', 44, startY + 34);
  ctx.fillStyle = '#806344';
  ctx.font = '800 11px sans-serif';
  ctx.fillText('点击卡片立即启用；手动模式可逐条编辑', 44, startY + 54);
  const activeCount = taskPackSettings.enabled ? enabledCommercialTasks().length + enabledCommercialKingTasks().length : taskTotal();
  fillRoundGradient(W - 142, startY + 14, 100, 34, 17, [[0, '#9d72e8'], [1, '#7042bd']], true);
  ctx.fillStyle = '#fff';
  ctx.font = '900 11px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(`已启用 ${activeCount} 条`, W - 92, startY + 36);
  ctx.textAlign = 'left';

  const gap = 10;
  const cardW = Math.floor((W - 98) / 2);
  const rows = 3;
  const availableH = panelH - 132;
  const cardH = Math.min(112, Math.floor((availableH - gap * (rows - 1)) / rows));
  const y0 = startY + 72;
  const modes = [
    { key: 'family', title: '家庭', icon: '🏠', sub: '38 项分阶段任务' },
    { key: 'party', title: '聚会', icon: '🎉', sub: '83 项分阶段任务' },
    { key: 'couple', title: '情侣', icon: '💞', sub: '28 项分阶段任务' },
    { key: 'all', title: '轻松全集', icon: '✨', sub: '129 项分阶段任务' },
    { key: 'manual', title: '手动任务', icon: '✍️', sub: `${taskTotal()}/37 · 读取、保存、编辑` }
  ];
  modes.forEach((mode, index) => {
    const manual = mode.key === 'manual';
    const col = index % 2;
    const row = Math.floor(index / 2);
    const selected = manual ? !taskPackSettings.enabled : taskPackSettings.enabled && taskPackSettings.preset === mode.key;
    const x = manual ? 39 : 39 + col * (cardW + gap);
    const w = manual ? W - 78 : cardW;
    drawTaskModeCard(x, y0 + row * (cardH + gap), w, cardH,
      mode.title, mode.sub, mode.icon, `taskPreset:${mode.key}`, selected);
  });
  drawPanelButton(46, startY + panelH - 48, 104, 36, '返回大厅', 'home', false);
  drawPanelButton(W - 150, startY + panelH - 48, 104, 36, '开始游戏', 'quick', true);
}

function drawManualTasks() {
  drawTopTitle('自定义卡册', `${taskTotal()}/37 条已填写 · 读取、保存和逐条编辑`, 'tasksBg');
  const startY = Math.max(safeTop + 124, 138);
  const panelH = Math.max(430, H - startY - safeBottom - 18);
  fillRoundRect(24, startY, W - 48, panelH, 26, 'rgba(255,252,242,.95)', true);
  fillRoundGradient(28, startY + 22, 8, panelH - 44, 4, [[0, '#f2bd55'], [1, '#9d5b26']], false);
  for (let ringY = startY + 48; ringY < startY + panelH - 36; ringY += 54) {
    fillRoundRect(25, ringY, 16, 7, 4, '#fff0bd', false);
    strokeRoundRect(25, ringY, 16, 7, 4, '#b9782b', 1);
  }
  drawPanelButton(42, startY + 16, 106, 34, '返回模式', 'taskModes', false);
  drawPanelButton(W - 148, startY + 16, 106, 34, '任务工具', 'taskManage', true);
  const tabGap = 6;
  const tabW = Math.floor((W - 104 - tabGap * 2) / 3);
  TASK_CATEGORIES.forEach((category, index) => {
    const col = index % 3;
    const row = Math.floor(index / 3);
    drawPanelButton(46 + col * (tabW + tabGap), startY + 58 + row * 40, tabW, 34,
      category.label, `taskCategory:${category.key}`, taskCategory === category.key);
  });

  const items = taskCategoryItems();
  const pageSize = taskEditorPageSize(panelH);
  const maxPage = Math.max(0, Math.ceil(items.length / pageSize) - 1);
  taskPage = Math.min(taskPage, maxPage);
  const pageItems = items.slice(taskPage * pageSize, (taskPage + 1) * pageSize);
  const listY = startY + 148;
  pageItems.forEach((item, offset) => {
    const y = listY + offset * 76;
    const filled = !!String(item.value || '').trim();
    ctx.save();
    ctx.shadowColor = 'rgba(88,53,20,.16)';
    ctx.shadowBlur = 9;
    ctx.shadowOffsetY = 4;
    fillRoundGradient(40, y, W - 80, 66, 16,
      filled ? [[0, '#fffdf8'], [1, '#fff0c9']] : [[0, '#fff5f2'], [1, '#ffd8d0']], false);
    ctx.restore();
    strokeRoundRect(40, y, W - 80, 66, 16, filled ? '#fff' : '#ffc3b8', 2);
    fillRoundRect(43, y + 8, 5, 50, 3, filled ? '#d99836' : '#d95b49', false);
    ctx.fillStyle = filled ? '#3e2d20' : '#b64032';
    ctx.font = '900 14px sans-serif';
    ctx.fillText(item.label, 56, y + 23);
    ctx.fillStyle = '#806344';
    ctx.font = '800 11px sans-serif';
    ctx.fillText(shortText(item.value || '未填写，点击编辑', 22), 56, y + 46);
    drawPanelButton(W - 104, y + 15, 54, 36, '编辑', item.action, false);
  });

  if (maxPage > 0) drawRecordPager(startY + panelH - 104, taskPage, maxPage, 'taskPrev', 'taskNext');
  const footerY = startY + panelH - 54;
  const footerW = Math.floor((W - 104) / 2);
  drawPanelButton(46, footerY, footerW, 40, '保存任务', 'saveManualTasks', false);
  drawPanelButton(58 + footerW, footerY, footerW, 40, '保存并开始', 'saveManualStart', true);
}

function drawTasks() {
  buttons = [];
  if (taskView === 'manual') drawManualTasks();
  else drawTaskModes();
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

function showTaskTools() {
  wx.showActionSheet({
    itemList: ['恢复默认任务', '清空全部游戏数据', '保存任务并开始游戏'],
    success(res) {
      if (res.tapIndex === 0) {
        tasks = clone(DEFAULT_TASKS);
        saveTasks();
        showTask('已恢复默认', '任务库已恢复为默认内容。');
      } else if (res.tapIndex === 1) {
        confirmClearAllData();
      } else if (res.tapIndex === 2) {
        startFreshGame('任务已保存，新局开始');
      }
      render();
    },
    fail(err) {
      if (!String(err.errMsg || '').includes('cancel')) showTask('操作失败', err.errMsg || '无法打开工具菜单');
      render();
    }
  });
}

function showTaskManageMenu() {
  wx.showActionSheet({
    itemList: ['任务检查', '导入 JSON', '导出 JSON', '导入纯文本', '复制纯文本模板', '更多数据工具'],
    success(res) {
      if (res.tapIndex === 0) {
        const report = taskCheckReport();
        showTask(report.complete ? '任务检查通过' : '任务内容不完整', report.message);
      } else if (res.tapIndex === 1) importJsonByPaste();
      else if (res.tapIndex === 2) exportTasksToClipboard();
      else if (res.tapIndex === 3) importPlainByPaste();
      else if (res.tapIndex === 4) exportPlainTemplate();
      else if (res.tapIndex === 5) showTaskTools();
      render();
    },
    fail(err) {
      if (!String(err.errMsg || '').includes('cancel')) showTask('操作失败', err.errMsg || '无法打开任务管理菜单');
      render();
    }
  });
}

function confirmClearAllData() {
  wx.showModal({
    title: '清空全部数据？',
    content: '这会删除游戏存档、玩家设置和自定义任务，操作不能撤销。',
    confirmText: '确认清空',
    confirmColor: '#d94b3d',
    success(res) {
      if (!res.confirm) return;
      ['ludo_minigame_state_v3', 'ludo_minigame_setup_v1', 'ludo_minigame_tasks_v1', 'ludo_minigame_bgm_enabled_v1', 'ludo_minigame_task_packs_v1']
        .forEach(key => wx.removeStorageSync(key));
      setupPlayers = defaultSetupPlayers();
      tasks = clone(DEFAULT_TASKS);
      backgroundMusicEnabled = true;
      taskPackSettings = loadTaskPackSettings();
      playBackgroundMusic();
      state = newGameState();
      lastRoll = '-';
      logText = '掷出 6 才能起飞';
      settingsPage = 0;
      progressPage = 0;
      recordsPage = 0;
      clearModals();
      scene = 'home';
      showTask('数据已清空', '存档、玩家设置和自定义任务已恢复为初始状态。');
      render();
    },
    fail(err) {
      showTask('清空失败', err.errMsg || '当前环境无法清空数据。');
      render();
    }
  });
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
  const commercial = pickTask(modeTaskList('king'));
  if (commercial) {
    showTask(commercial.title || '国王卡', `${reason}\n${commercial.content}`, `${piece.name} · 国王卡`, 'king');
    return;
  }
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
    const finalTask = pickTask(modeTaskList('final'));
    const finalText = finalTask?.content || tasks.final;
    showTask(finalTask?.title || '游戏结束', `${ranking}\n\n终极任务：\n${finalText}`, finalTask ? `${taskModeLabel()} · 终局` : '终局');
  }
}


function applyFlyJump(piece) {
  const rule = FLY_JUMP_RULES[piece.color];
  if (!rule || piece.outerIndex !== rule.from - 1) return;
  piece.outerIndex = rule.to - 1;
  piece.outerSteps = (piece.outerIndex - START_INDEX[piece.color] + OUTER_PATH_LENGTH) % OUTER_PATH_LENGTH;
  appendMovePoint(outerPath[piece.outerIndex], 'fly');
  playFlyBoostSound();
  addLog(`${piece.name} 触发飞行航线：从 ${rule.from} 飞到 ${rule.to}`);
}

function playFlyBoostSound() {
  if (typeof wx.createInnerAudioContext !== 'function') return;
  const audio = wx.createInnerAudioContext();
  audio.src = 'assets/audio/fly_boost.mp3';
  audio.volume = 0.65;
  audio.onEnded(() => audio.destroy());
  audio.onError(() => audio.destroy());
  audio.play();
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
      appendMovePoint(straightPath[piece.color][index - 1]);
    }
    piece.straightIndex = 6;
    finishPiece(piece);
    return;
  }
  if (steps > need) {
    const bounce = steps - need;
    for (let index = piece.straightIndex + 1; index <= 6; index++) {
      appendMovePoint(straightPath[piece.color][index - 1]);
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
      const takeoffTask = pickTask(modeTaskList('takeoff'));
      showTask(takeoffTask?.title || '起飞任务', takeoffTask?.content || tasks.takeoff, takeoffTask ? `${piece.name} · ${taskModeLabel()} · 起飞` : piece.name);
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
  if (action === 'tasks') { scene = 'tasks'; taskView = 'modes'; }
  if (action === 'records') scene = 'records';
  if (action === 'pieces') scene = 'pieces';
  if (action === 'game') scene = 'game';
  if (action === 'boardDebug') boardDebug = !boardDebug;
  if (action === 'toggleMusic') setBackgroundMusicEnabled(!backgroundMusicEnabled);
  if (action === 'clearAllData') confirmClearAllData();
  if (action.startsWith('taskPreset:')) selectTaskMode(action.split(':')[1]);
  if (action === 'taskModes') taskView = 'modes';
  if (action === 'saveManualTasks') { setTaskPackPreset('manual'); saveTasks(); showTask('任务已保存', '手动任务已保存到本机。'); }
  if (action === 'saveManualStart') { setTaskPackPreset('manual'); saveTasks(); startFreshGame('手动任务已保存，新局开始'); }
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
  if (action.startsWith('taskCategory:')) {
    const category = action.split(':')[1];
    if (TASK_CATEGORIES.some(item => item.key === category)) {
      taskCategory = category;
      taskPage = 0;
    }
  }
  if (action === 'taskPrev') taskPage = Math.max(0, taskPage - 1);
  if (action === 'taskNext') {
    const startY = Math.max(safeTop + 124, 138);
    const panelH = Math.max(430, H - startY - safeBottom - 18);
    const maxPage = Math.max(0, Math.ceil(taskCategoryItems().length / taskEditorPageSize(panelH)) - 1);
    taskPage = Math.min(maxPage, taskPage + 1);
  }
  if (action.startsWith('taskEdit:')) {
    const [, category, rawIndex] = action.split(':');
    editTaskItem(category, Number(rawIndex));
  }
  if (action === 'closeModal' || action === 'modalBackdrop') closeCurrentModal();
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
  if (action === 'checkTasks') {
    const report = taskCheckReport();
    showTask(report.complete ? '任务检查通过' : '任务内容不完整', report.message);
  }
  if (action === 'taskTools') showTaskTools();
  if (action === 'taskManage') showTaskManageMenu();
  if (action === 'resetTasks') { tasks = clone(DEFAULT_TASKS); saveTasks(); showTask('已恢复默认', '任务库已恢复为默认内容。'); }
  render();
}

wx.onTouchStart((event) => {
  playBackgroundMusic();
  const touch = event.touches[0];
  const btn = hitTest(touch.clientX, touch.clientY);
  if (btn) handleAction(btn.action);
  else if (modal) return;
});

init();
render();
