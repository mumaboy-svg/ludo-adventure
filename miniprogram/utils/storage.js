const TASK_KEY = 'ludo_tasks_v2';
const STATE_KEY = 'ludo_state_v2';

function getTasks(defaultTasks) {
  return wx.getStorageSync(TASK_KEY) || defaultTasks;
}
function saveTasks(tasks) {
  wx.setStorageSync(TASK_KEY, tasks);
}
function getState() {
  return wx.getStorageSync(STATE_KEY) || null;
}
function saveState(state) {
  wx.setStorageSync(STATE_KEY, state);
}
function clearState() {
  wx.removeStorageSync(STATE_KEY);
}
function clearAll() {
  wx.clearStorageSync();
}

module.exports = { TASK_KEY, STATE_KEY, getTasks, saveTasks, getState, saveState, clearState, clearAll };
