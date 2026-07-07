const { getState, saveState } = require('../../utils/storage');
const { defaultTasks } = require('../../utils/tasks');

Page({
  data: { version: '2.0', taskCount: 0, playerCount: 2, saveSummary: '暂无存档' },
  onShow() { this.refresh(); },
  refresh() {
    const state = getState();
    const taskCount = defaultTasks.outer.length + defaultTasks.straight.length + defaultTasks.king.length + 2 + Object.keys(defaultTasks.baseRoll).length;
    this.setData({
      taskCount,
      playerCount: state?.players?.length || 2,
      saveSummary: state ? `${state.players?.length || 0} 名玩家 · 第 ${state.round || 1} 轮` : '暂无存档'
    });
  },
  goSetup() { wx.navigateTo({ url: '/pages/setup/setup' }); },
  goTasks() { wx.navigateTo({ url: '/pages/task-center/task-center' }); },
  continueGame() {
    if (!getState()) return wx.showToast({ title: '没有存档', icon: 'none' });
    wx.navigateTo({ url: '/pages/game/game?mode=continue' });
  },
  quickStart() {
    wx.navigateTo({ url: '/pages/game/game?mode=quick' });
  }
});
