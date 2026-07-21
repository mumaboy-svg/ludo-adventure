const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const sourcePath = path.resolve(__dirname, '..', 'game.js');
const source = fs.readFileSync(sourcePath, 'utf8');

function extractFunction(name) {
  const start = source.indexOf(`function ${name}(`);
  assert(start >= 0, `缺少函数 ${name}`);
  const braceStart = source.indexOf('{', start);
  let depth = 0;
  for (let index = braceStart; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1;
    if (source[index] === '}') {
      depth -= 1;
      if (depth === 0) return source.slice(start, index + 1);
    }
  }
  throw new Error(`函数 ${name} 未闭合`);
}

assert(source.includes("const GAME_VERSION = '2.23.1';"), '小游戏版本应为 2.23.1');
assert(source.includes("const RESCUE_BADGE_STORAGE_KEY = 'ludo_rescue_badge_v1';"), '救援徽章必须使用独立存储键');
assert(!source.includes("ludo_minigame_state_v3', { rescue"), '救援徽章不得写入对局存档');

const storage = {};
const sandbox = {
  Date,
  wx: {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; }
  }
};
const storageFunctions = [
  'hasRescueBadge',
  'awardRescueBadge'
].map(extractFunction).join('\n');
vm.runInNewContext(
  `const RESCUE_BADGE_STORAGE_KEY = 'ludo_rescue_badge_v1';\n${storageFunctions}\nthis.api = { hasRescueBadge, awardRescueBadge };`,
  sandbox
);

const { api } = sandbox;
assert.strictEqual(api.hasRescueBadge(), false, '新玩家默认不应拥有救援徽章');
assert.strictEqual(api.awardRescueBadge(), true, '首次完整对局结算必须授予徽章');
assert.strictEqual(storage.ludo_rescue_badge_v1.completed, true, '徽章完成状态必须独立持久化');
assert.strictEqual(api.awardRescueBadge(), false, '后续完整对局不得重复授予或阻塞');
assert.strictEqual(api.hasRescueBadge(), true, '徽章状态必须跨对局保持');

const finishPieceSource = extractFunction('finishPiece');
assert(finishPieceSource.includes('state.gameOver = true;'), '全员到终点必须保留原有游戏结束状态');
assert(finishPieceSource.includes('const receivedRescueBadge = awardRescueBadge();'), '终局必须在独立键中决定是否首次授予徽章');
assert(finishPieceSource.indexOf("showTask(finalTask?.title || '游戏结束'") < finishPieceSource.indexOf("showTask('糖果公主获救！'"), '救援结算必须在原有终局任务之后入队');
assert(finishPieceSource.includes('糖果云国救援徽章'), '结算必须明确告知徽章奖励');

const clearAllDataSource = extractFunction('confirmClearAllData');
assert(clearAllDataSource.includes('RESCUE_BADGE_STORAGE_KEY'), '清空全部数据必须同时清除救援徽章');

console.log('PASS: 救援徽章独立存储、首次终局结算、重复结算不阻塞、终局队列顺序和清空数据契约检查通过。');
