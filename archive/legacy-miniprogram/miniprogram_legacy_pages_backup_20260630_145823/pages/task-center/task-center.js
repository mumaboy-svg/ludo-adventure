const { getTasks, saveTasks } = require('../../utils/storage');
const { defaultTasks } = require('../../utils/tasks');

function clone(obj) { return JSON.parse(JSON.stringify(obj)); }
function baseRollList(tasks) {
  return [2,3,4,5].map(point => ({ point, text: tasks.baseRoll[point] || '' }));
}

Page({
  data: { tasks: clone(defaultTasks), baseRollList: [] },
  onLoad() {
    const tasks = getTasks(clone(defaultTasks));
    this.setData({ tasks, baseRollList: baseRollList(tasks) });
  },
  onSimpleInput(e) {
    const tasks = this.data.tasks;
    tasks[e.currentTarget.dataset.field] = e.detail.value;
    this.setData({ tasks });
  },
  onBaseRollInput(e) {
    const point = e.currentTarget.dataset.point;
    const tasks = this.data.tasks;
    tasks.baseRoll[point] = e.detail.value;
    this.setData({ tasks, baseRollList: baseRollList(tasks) });
  },
  onArrayInput(e) {
    const { type, index } = e.currentTarget.dataset;
    const tasks = this.data.tasks;
    tasks[type][index] = e.detail.value;
    this.setData({ tasks });
  },
  saveTasks() {
    saveTasks(this.data.tasks);
    wx.showToast({ title: '已保存' });
  },
  resetTasks() {
    const tasks = clone(defaultTasks);
    saveTasks(tasks);
    this.setData({ tasks, baseRollList: baseRollList(tasks) });
  },
  goSetup() { wx.navigateTo({ url: '/pages/setup/setup' }); }
});
