const { COLORS } = require('../../utils/boardCoords');

const COLOR_KEYS = ['R','Y','B','G'];
const colorOptions = COLOR_KEYS.map(k => ({ key: k, label: `${COLORS[k].emoji} ${COLORS[k].name}` }));
function normalize(players) {
  return players.map(p => {
    const colorIndex = Math.max(0, COLOR_KEYS.indexOf(p.color));
    return { ...p, colorIndex, colorLabel: colorOptions[colorIndex].label };
  });
}

Page({
  data: {
    colorOptions,
    players: normalize([{ name: '玩家1', color: 'R' }, { name: '玩家2', color: 'Y' }])
  },
  onNameInput(e) {
    const index = e.currentTarget.dataset.index;
    const players = this.data.players;
    players[index].name = e.detail.value;
    this.setData({ players });
  },
  onColorChange(e) {
    const index = e.currentTarget.dataset.index;
    const colorIndex = Number(e.detail.value);
    const players = this.data.players;
    players[index].color = COLOR_KEYS[colorIndex];
    this.setData({ players: normalize(players) });
  },
  addPlayer() {
    if (this.data.players.length >= 16) return wx.showToast({ title: '最多16人', icon: 'none' });
    const players = this.data.players.concat({ name: `玩家${this.data.players.length + 1}`, color: COLOR_KEYS[this.data.players.length % 4] });
    this.setData({ players: normalize(players) });
  },
  removePlayer(e) {
    if (this.data.players.length <= 2) return wx.showToast({ title: '至少2人', icon: 'none' });
    const index = e.currentTarget.dataset.index;
    const players = this.data.players.slice();
    players.splice(index, 1);
    this.setData({ players: normalize(players) });
  },
  goTasks() { wx.navigateTo({ url: '/pages/task-center/task-center' }); },
  startGame() {
    const raw = this.data.players.map(({ name, color }) => ({ name: (name || '').trim(), color }));
    if (raw.some(p => !p.name)) return wx.showToast({ title: '请填写玩家名', icon: 'none' });
    wx.setStorageSync('ludo_setup_players_v2', raw);
    wx.navigateTo({ url: '/pages/game/game?mode=new' });
  }
});
