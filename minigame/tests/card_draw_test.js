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

assert(source.includes("const GAME_VERSION = '2.23.0';"), '小游戏版本应为 2.23.0');

const sandbox = { module: { exports: {} }, String };
vm.runInNewContext(
  `${extractFunction('modalVisualType')}\nmodule.exports = { modalVisualType };`,
  sandbox
);
const { modalVisualType } = sandbox.module.exports;
assert.strictEqual(modalVisualType('普通任务', 'task'), 'task', '显式任务必须归类为 task');
assert.strictEqual(modalVisualType('👑 国王卡', 'auto'), 'king', '国王卡标题必须自动归类为 king');
assert.strictEqual(modalVisualType('系统提示', 'auto'), 'notice', '普通提示必须归类为 notice');

const showTaskSource = extractFunction('showTask');
const completeSource = extractFunction('completeCurrentModal');
const closeSource = extractFunction('closeCurrentModal');
const drawModalSource = extractFunction('drawModal');
const animationLoopSource = extractFunction('startHomeAnimationLoop');

assert(showTaskSource.includes('type: modalVisualType(title, type)'), '弹窗入队前必须明确视觉类型');
assert(completeSource.includes("modal.type !== 'task' && modal.type !== 'king'"), '只有任务卡和国王卡允许完成确认');
assert(completeSource.includes('if (!modal || modalCompletingAt) return;'), '完成确认必须防止连点重复触发');
assert(completeSource.includes('reducedMotionEnabled ? 180 : 460'), '低动态模式必须缩短完成反馈');
assert(closeSource.includes('if (modalCompletingAt) return;'), '完成反馈期间不得重复关闭推进队列');

assert(drawModalSource.includes("modal.type === 'task' || modal.type === 'king'"), '任务卡和国王卡必须进入挑战抽卡路径');
assert(drawModalSource.includes('flipScaleX'), '任务卡翻出必须包含横向翻面缩放');
assert(drawModalSource.includes('ctx.rotate(aura);'), '国王卡必须包含旋转金色光芒');
assert(drawModalSource.includes("ctx.fillText('✓ 挑战完成'"), '完成确认必须绘制挑战完成章');
assert(drawModalSource.includes("isChallenge ? '完成，继续' : '知道了'"), '挑战与普通提示必须使用不同确认文案');
assert(drawModalSource.includes("action: isChallenge ? 'completeModal' : 'closeModal'"), '仅挑战确认按钮进入完成动作');
assert(drawModalSource.includes("action: 'closeModal'"), '关闭按钮必须保持普通关闭动作');
assert(drawModalSource.includes('if (!modalCompletingAt)'), '完成反馈期间必须移除可重复点击按钮');
assert(drawModalSource.includes('reducedMotionEnabled ? 1'), '抽卡翻出必须提供低动态静态路径');

const actionBlock = source.slice(source.indexOf("if (action === 'completeModal')"), source.indexOf("if (action === 'roll'"));
assert(actionBlock.includes('completeCurrentModal();'), 'completeModal 动作必须进入完成确认');
assert(actionBlock.includes("action === 'closeModal' || action === 'modalBackdrop'"), '关闭和遮罩必须共用普通关闭路径');
assert(!actionBlock.slice(actionBlock.indexOf("action === 'closeModal'")).includes('completeCurrentModal();'), '关闭和遮罩不得伪造完成确认');

assert(animationLoopSource.includes("modal.type === 'king'"), '国王卡稀有光效必须持续重绘');
assert(animationLoopSource.includes('modalCompletingAt > 0'), '完成章动画必须持续重绘');
assert(animationLoopSource.includes('now - modalOpenedAt < 560'), '任务卡翻出阶段必须持续重绘');

[
  'triggerBaseRollTask',
  'triggerOuterTask',
  'triggerStraightTask'
].forEach((name) => {
  assert(extractFunction(name).includes("'task'"), `${name} 必须显式标记任务卡`);
});

console.log('PASS: D4 任务卡翻出、国王卡稀有光效、挑战完成确认、普通关闭、连点保护和低动态路径检查通过。');
