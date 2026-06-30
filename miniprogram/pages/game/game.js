const { getState, saveState, clearState } = require('../../utils/storage');
const { defaultTasks } = require('../../utils/tasks');
const { COLORS, START_INDEX, OUTER_PATH_LENGTH, baseSlots, outerPath, straightPath, stepsToEntry } = require('../../utils/boardCoords');

function shortName(name) { return Array.from(name || '?').slice(0, 4).join(''); }
function makeId() { return Math.random().toString(36).slice(2,9) + Date.now().toString(36).slice(-4); }

Page({
  data: { state: null, pieces: [], currentName: '-', statusText: '准备开始', lastRoll: null, modalOpen: false, modalTitle: '', modalBody: '', log: [] },
  onLoad(query) {
    if (query.mode === 'continue') this.loadSaved();
    else this.newGame();
  },
  newGame() {
    const setupPlayers = wx.getStorageSync('ludo_setup_players_v2') || [{ name: '玩家1', color: 'R' }, { name: '玩家2', color: 'Y' }];
    const used = { R:0, Y:0, B:0, G:0 };
    const state = {
      players: setupPlayers.map(p => ({ id: makeId(), name: p.name, color: p.color, colorSlot: used[p.color]++, status: 'base', outerIndex: null, outerSteps: 0, straightIndex: 0, finishPlace: null })),
      currentIndex: 0,
      lastRoll: null,
      round: 1,
      acted: {},
      finishOrder: [],
      triggered: {},
      log: ['游戏开始！掷出 6 才能起飞。'],
      gameOver: false
    };
    saveState(state);
    this.setData({ state }, () => this.render());
  },
  loadSaved() {
    const state = getState();
    if (!state) return this.newGame();
    if (!Array.isArray(state.log)) state.log = [];
    this.setData({ state }, () => this.render());
  },
  currentPlayer() {
    const state = this.data.state;
    if (!state) return null;
    const p = state.players[state.currentIndex];
    if (p && p.status !== 'finished') return p;
    const idx = state.players.findIndex(x => x.status !== 'finished');
    if (idx >= 0) {
      state.currentIndex = idx;
      return state.players[idx];
    }
    return null;
  },
  render() {
    const state = this.data.state;
    if (!state) return;
    const pieces = state.players.map(p => {
      const pos = this.pieceCoord(p);
      return { id: p.id, x: pos.x, y: pos.y, img: `/assets/images/plane_${p.color}.webp`, shortName: shortName(p.name) };
    });
    const p = this.currentPlayer();
    this.setData({ pieces, currentName: p ? `${COLORS[p.color].emoji}${p.name}` : '游戏结束', statusText: this.statusText(p), lastRoll: state.lastRoll, log: (state.log || []).slice(-8) });
  },
  pieceCoord(p) {
    if (p.status === 'base') return baseSlots[p.color][p.colorSlot] || baseSlots[p.color][0];
    if (p.status === 'outer') return outerPath[p.outerIndex];
    if (p.status === 'straight') return p.straightIndex <= 0 ? outerPath[START_INDEX[p.color]] : straightPath[p.color][Math.min(5, p.straightIndex - 1)];
    return { x: 50, y: 50 };
  },
  statusText(p) {
    if (!p) return '无当前玩家';
    if (p.status === 'base') return '在基地：需要 6 起飞';
    if (p.status === 'outer') return `外圈：已走 ${p.outerSteps}/${stepsToEntry(p.color)} 步`;
    if (p.status === 'straight') return `直道：第 ${p.straightIndex}/6 格`;
    return '已到达终点';
  },
  label(p) { return `${COLORS[p.color].emoji}${p.name}`; },
  addLog(text) {
    const state = this.data.state;
    state.log = state.log || [];
    state.log.push(text);
    if (state.log.length > 80) state.log = state.log.slice(-80);
  },
  rollDice() {
    const state = this.data.state;
    if (!state || state.gameOver || this.data.modalOpen) return;
    const value = Math.floor(Math.random() * 6) + 1;
    const audio = wx.createInnerAudioContext();
    audio.src = '/assets/audio/dice_roll.mp3';
    audio.play();
    const p = this.currentPlayer();
    if (!p) return;
    state.lastRoll = value;
    this.addLog(`${this.label(p)} 掷出 ${value}`);

    if (p.status === 'base') {
      if (value === 6) {
        this.takeOff(p);
      } else {
        if (value >= 2 && value <= 5) this.showModal(`基地任务 ${value}点`, defaultTasks.baseRoll[value] || `掷出${value}点任务`);
        this.endTurn();
      }
    } else if (p.status === 'outer') {
      this.moveOuter(p, value);
      if (value !== 6 || p.status === 'finished') this.endTurn();
    } else if (p.status === 'straight') {
      this.moveStraight(p, value);
      if (value !== 6 || p.status === 'finished') this.endTurn();
    }

    saveState(state);
    this.setData({ state }, () => this.render());
  },
  takeOff(p) {
    p.status = 'outer';
    p.outerIndex = START_INDEX[p.color];
    p.outerSteps = 0;
    p.straightIndex = 0;
    this.addLog(`${this.label(p)} 起飞，获得一次额外投掷`);
    this.showModal('起飞任务', defaultTasks.takeoff);
  },
  moveOuter(p, steps) {
    p.outerSteps += steps;
    const entrySteps = stepsToEntry(p.color);
    if (p.outerSteps >= entrySteps) {
      const remain = p.outerSteps - entrySteps;
      p.status = 'straight';
      p.outerIndex = null;
      p.straightIndex = 0;
      this.addLog(`${this.label(p)} 进入直道`);
      if (remain > 0) this.moveStraight(p, remain);
      return;
    }
    p.outerIndex = (START_INDEX[p.color] + p.outerSteps) % OUTER_PATH_LENGTH;
    this.addLog(`${this.label(p)} 落在外圈第 ${p.outerIndex + 1} 格`);
  },
  moveStraight(p, steps) {
    const need = 6 - p.straightIndex;
    if (steps === need) {
      p.status = 'finished';
      p.finishPlace = this.data.state.finishOrder.length + 1;
      this.data.state.finishOrder.push(p.id);
      this.addLog(`${this.label(p)} 到达终点！`);
      this.showModal('到达终点', `${this.label(p)} 到达中心终点！`);
      if (this.data.state.finishOrder.length === this.data.state.players.length) this.data.state.gameOver = true;
      return;
    }
    if (steps > need) {
      const bounce = steps - need;
      p.straightIndex = Math.max(0, 6 - bounce);
      this.addLog(`${this.label(p)} 点数超过终点，反弹到直道第 ${p.straightIndex} 格`);
      return;
    }
    p.straightIndex += steps;
    this.addLog(`${this.label(p)} 直道前进到第 ${p.straightIndex} 格`);
  },
  endTurn() {
    const state = this.data.state;
    if (state.gameOver) return;
    const total = state.players.length;
    for (let i = 1; i <= total; i++) {
      const idx = (state.currentIndex + i) % total;
      if (state.players[idx].status !== 'finished') {
        state.currentIndex = idx;
        return;
      }
    }
  },
  showModal(title, body) { this.setData({ modalOpen: true, modalTitle: title, modalBody: body }); },
  closeModal() { this.setData({ modalOpen: false }); },
  saveAndBack() { saveState(this.data.state); wx.navigateBack({ delta: 10 }); },
  restart() { clearState(); this.newGame(); }
});
