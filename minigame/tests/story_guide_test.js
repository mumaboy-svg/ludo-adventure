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

assert(source.includes("const GAME_VERSION = '2.20.5';"), '小游戏版本应为 2.20.5');
assert(source.includes("const STORY_GUIDE_STORAGE_KEY = 'ludo_story_guide_v1';"), '首局引导必须使用独立存储键');
assert(source.includes("const TEACHING_GUIDE_STORAGE_KEY = 'ludo_teaching_guide_v1';"), '操作教学必须使用独立存储键');
assert(!source.includes("ludo_minigame_state_v3', { completed"), '首局引导不得写入对局存档');
[
  'guide_princess_candy.webp',
  'guide_cloud_castle.webp',
  'guide_hero_red.webp',
  'guide_hero_yellow.webp',
  'guide_hero_blue.webp',
  'guide_hero_green.webp'
].forEach(fileName => {
  const assetPath = path.resolve(__dirname, '..', 'packages', 'game-assets', 'assets', 'minigame', 'ui', 'story-guide', fileName);
  assert(fs.existsSync(assetPath), `缺少首局引导临时素材：${fileName}`);
});

const storage = {};
const sandbox = {
  Date,
  wx: {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; }
  },
  storyGuide: { open: false, step: 0, pendingAction: '' },
  teachingGuide: { open: false, pending: false, step: 'roll', lastRoll: null },
  scene: 'home',
  confirmStartFreshGame(message) { sandbox.quickStartMessage = message; },
  quickStartMessage: ''
};
const functions = [
  'hasCompletedStoryGuide',
  'markStoryGuideCompleted',
  'hasCompletedTeachingGuide',
  'markTeachingGuideCompleted',
  'requestTeachingGuide',
  'startTeachingGuideForFreshGame',
  'completeTeachingGuide',
  'advanceTeachingGuide',
  'openStoryGuide',
  'startStoryGuideForAction',
  'finishStoryGuide'
].map(extractFunction).join('\n');
vm.runInNewContext(
  `const STORY_GUIDE_STORAGE_KEY = 'ludo_story_guide_v1';\nconst TEACHING_GUIDE_STORAGE_KEY = 'ludo_teaching_guide_v1';\n${functions}\nthis.api = { hasCompletedStoryGuide, markStoryGuideCompleted, hasCompletedTeachingGuide, markTeachingGuideCompleted, requestTeachingGuide, startTeachingGuideForFreshGame, completeTeachingGuide, advanceTeachingGuide, openStoryGuide, startStoryGuideForAction, finishStoryGuide };`,
  sandbox
);

const { api } = sandbox;
assert.strictEqual(api.hasCompletedStoryGuide(), false, '新玩家默认应显示引导');
assert.strictEqual(api.startStoryGuideForAction('new'), true, '新玩家点击新游戏应打开引导');
assert.strictEqual(sandbox.storyGuide.open, true, '引导必须打开');
assert.strictEqual(sandbox.storyGuide.pendingAction, 'new', '引导必须保留原始目标操作');
api.finishStoryGuide();
assert.strictEqual(sandbox.scene, 'settings', '新游戏引导完成后必须进入原有设置页');
assert.strictEqual(storage.ludo_story_guide_v1.completed, true, '完成后必须独立持久化引导状态');
assert.strictEqual(api.startStoryGuideForAction('quick'), false, '完成过引导后快速开始不得再次拦截');

sandbox.storyGuide = { open: true, step: 1, pendingAction: 'new' };
delete storage.ludo_teaching_guide_v1;
api.finishStoryGuide();
assert.strictEqual(sandbox.teachingGuide.pending, true, '完成故事后新游戏必须挂起操作教学');
api.startTeachingGuideForFreshGame();
assert.strictEqual(sandbox.teachingGuide.open, true, '新局开始时必须进入操作教学');
assert.strictEqual(sandbox.teachingGuide.step, 'roll', '操作教学必须先引导掷骰');
sandbox.teachingGuide.step = 'result';
api.advanceTeachingGuide();
assert.strictEqual(sandbox.teachingGuide.step, 'task', '骰子结果说明后必须进入任务卡说明');
api.completeTeachingGuide();
assert.strictEqual(storage.ludo_teaching_guide_v1.completed, true, '操作教学完成状态必须独立持久化');
assert.strictEqual(api.hasCompletedTeachingGuide(), true, '完成后的操作教学必须可被识别');

sandbox.storyGuide = { open: true, step: 1, pendingAction: 'quick' };
delete storage.ludo_story_guide_v1;
api.finishStoryGuide();
assert(sandbox.quickStartMessage.includes('糖果云国救援开始'), '快速开始引导完成后必须进入原有新局流程');

const handleActionSource = extractFunction('handleAction');
assert(handleActionSource.includes("if (action === 'continue') continueSavedGame();"), '继续上局必须保留原有入口');
assert(handleActionSource.indexOf("if (action === 'story')") < handleActionSource.indexOf("if (action === 'new')"), '故事入口必须在新游戏分流前处理');
assert(handleActionSource.includes("if (action === 'teachingRoll'"), '教学骰子必须通过独立 action 分流');
assert(handleActionSource.includes("if (action === 'teachingNext') advanceTeachingGuide();"), '教学说明必须可逐步推进');
assert(handleActionSource.includes("requestTeachingGuide();\n      scene = 'settings';"), '已看过故事的新游戏仍必须补操作教学');
assert(handleActionSource.includes("requestTeachingGuide();\n      confirmStartFreshGame"), '已看过故事的快速开始仍必须补操作教学');

const drawStorySource = extractFunction('drawStoryGuide');
assert(drawStorySource.includes("['guideHeroR', 'planeR']"), '红色小勇士必须保留新素材与旧素材回退');
assert(drawStorySource.includes("['guideHeroY', 'planeY']"), '黄色小勇士必须保留新素材与旧素材回退');
assert(drawStorySource.includes("['guideHeroB', 'planeB']"), '蓝色小勇士必须保留新素材与旧素材回退');
assert(drawStorySource.includes("['guideHeroG', 'planeG']"), '绿色小勇士必须保留新素材与旧素材回退');
assert(drawStorySource.includes('images.guidePrincess') && drawStorySource.includes('images.guideCloudCastle'), '第一页必须使用糖果公主与棉花糖云堡临时素材');
assert(drawStorySource.includes('糖果公主') && drawStorySource.includes('云堡'), '引导必须包含糖果公主与云堡故事设定');
assert(drawStorySource.includes('reducedMotionEnabled'), '低动态模式必须有引导动画降级');
assert(source.includes("if (scene === 'home') drawStoryGuide();"), '首页必须在正常 UI 后绘制引导覆盖层');
assert(source.includes("if (scene === 'game') drawTeachingGuide();"), '操作教学必须覆盖在真实棋盘之上');
const drawTeachingSource = extractFunction('drawTeachingGuide');
assert(drawTeachingSource.includes('第一步：掷骰子'), '操作教学必须引导第一次掷骰');
assert(drawTeachingSource.includes('第二步：看懂这次行动'), '操作教学必须解释骰子结果');
assert(drawTeachingSource.includes('第三步：认识任务卡'), '操作教学必须解释任务卡');
assert(drawTeachingSource.includes('reducedMotionEnabled'), '操作教学必须兼容低动态模式');
assert(extractFunction('finishStoryGuide').includes('requestTeachingGuide()'), '故事完成后必须为新局请求操作教学');
assert(extractFunction('startFreshGame').includes('startTeachingGuideForFreshGame()'), '新局开始时必须启动待处理教学');
assert(extractFunction('finishAnimatedMove').includes("teachingGuide.step = modal ? 'waitingTask' : 'result'"), '首次骰子结算后必须等待任务卡或显示结果说明');
assert(extractFunction('confirmClearAllData').includes('TEACHING_GUIDE_STORAGE_KEY'), '清空全部数据必须清除操作教学状态');
const resolveDiceSource = extractFunction('resolveDiceRoll');
assert(resolveDiceSource.includes("if (value === 1) drawKingCard(piece, '掷出 1 点触发');"), '首掷 1 点必须保留真实国王卡');
assert(resolveDiceSource.includes('if (value >= 2 && value <= 5) triggerBaseRollTask(piece, value);'), '首掷 2-5 点必须保留真实基地任务卡');
assert(resolveDiceSource.includes("showTask(takeoffTask?.title || '起飞任务'"), '首掷 6 点必须保留真实起飞任务卡');
assert(source.includes("drawHomeStoryPill"), '首页必须提供故事重看入口');

console.log('PASS: 糖果云国故事与操作教学、跳过/完成分流、旧存档隔离、重看入口和低动态保护检查通过。');
