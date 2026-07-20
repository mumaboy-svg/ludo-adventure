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

const functionNames = [
  'normalizeDiceValue',
  'createDiceValue',
  'createDiceRollTransaction',
  'diceAnimationFrameValue',
  'diceMotionState',
  'diceSideValues'
];
const coreSource = functionNames.map(extractFunction).join('\n');
const sandbox = {
  Math,
  Date,
  Object,
  Number,
  Boolean,
  DICE_VISIBLE_ORIENTATIONS: {
    1: { front: 1, top: 2, right: 3 },
    2: { front: 2, top: 6, right: 3 },
    3: { front: 3, top: 2, right: 6 },
    4: { front: 4, top: 2, right: 1 },
    5: { front: 5, top: 1, right: 3 },
    6: { front: 6, top: 5, right: 3 }
  },
  diceRollSequence: 0,
  module: { exports: {} }
};
vm.runInNewContext(
  `${coreSource}\nmodule.exports = { normalizeDiceValue, createDiceValue, createDiceRollTransaction, diceAnimationFrameValue, diceMotionState, diceSideValues };`,
  sandbox
);

const {
  normalizeDiceValue,
  createDiceRollTransaction,
  diceAnimationFrameValue,
  diceMotionState,
  diceSideValues
} = sandbox.module.exports;

assert(source.includes("const GAME_VERSION = '2.20.7';"), '小游戏版本应为 2.20.7');
assert.strictEqual(normalizeDiceValue(2), 2);
assert.strictEqual(normalizeDiceValue(5), 5);
assert.strictEqual(normalizeDiceValue('bad'), 1);

let randomCalls = 0;
for (let index = 0; index < 30; index += 1) {
  const expected = (index % 6) + 1;
  const transaction = createDiceRollTransaction(() => {
    randomCalls += 1;
    return (expected - 0.5) / 6;
  });
  assert.strictEqual(transaction.value, expected, `第 ${index + 1} 次 transaction 点数错误`);
  assert(Object.isFrozen(transaction), 'transaction 必须冻结');
}
assert.strictEqual(randomCalls, 30, '每个 transaction 只能调用一次最终随机源');

for (let finalValue = 1; finalValue <= 6; finalValue += 1) {
  const orientation = diceSideValues(finalValue);
  const visible = [orientation.front, orientation.top, orientation.right];
  assert.strictEqual(new Set(visible).size, 3, `${finalValue} 点的三个可见面不能重复`);
  visible.forEach((face, index) => {
    visible.slice(index + 1).forEach(other => {
      assert.notStrictEqual(face + other, 7, `${finalValue} 点朝向不能同时显示相对面 ${face}/${other}`);
    });
  });
  for (let frameIndex = 0; frameIndex < 20; frameIndex += 1) {
    const frameValue = diceAnimationFrameValue(finalValue, frameIndex);
    assert(frameValue >= 1 && frameValue <= 6, '动画帧点数必须保持在 1-6');
  }
}

const launch = diceMotionState(.24, 60, false);
const flipEdge = diceMotionState(.07, 60, false);
const firstImpact = diceMotionState(.56, 60, false);
const rebound = diceMotionState(.66, 60, false);
const secondImpact = diceMotionState(.82, 60, false);
const settled = diceMotionState(1, 60, false);
const reducedLaunch = diceMotionState(.24, 60, true);
assert(launch.offsetX > 0 && launch.lift > 0, '首段抛出必须同时产生横向位移和离地高度');
assert(firstImpact.impact > 0 && firstImpact.lift <= .001, '第一次落地必须产生碰撞反馈并回到台面');
assert(rebound.offsetX > 0 && rebound.lift > 0, '第一次落地后必须有第二段小弹跳');
assert(secondImpact.impact > 0 && secondImpact.lift <= .001, '第二次落地必须产生碰撞反馈并回到台面');
assert.strictEqual(settled.offsetX, 0, '动画结束横向位移必须归零');
assert.strictEqual(settled.lift, 0, '动画结束高度必须归零');
assert.strictEqual(settled.impact, 0, '动画结束碰撞反馈必须归零');
assert(reducedLaunch.offsetX < launch.offsetX && reducedLaunch.lift < launch.lift, '低动态模式必须缩短运动幅度');
assert(Math.abs(launch.tumble) > Math.PI, '首段抛出必须产生可见翻转角度');
assert(Math.abs(Math.cos(flipEdge.tumble)) < .35, '翻转途中骰身必须经过明显的立方体朝向变化');
assert.strictEqual(settled.tumble, 0, '动画结束翻转角度必须归零');
assert(reducedLaunch.tumble < launch.tumble, '低动态模式必须缩短翻转幅度');

const rollDiceSource = extractFunction('rollDice');
assert(rollDiceSource.includes('const transaction = createDiceRollTransaction();'), 'rollDice 必须先创建唯一 transaction');
assert(!rollDiceSource.includes('Math.random'), 'rollDice 动画阶段不能再次调用 Math.random');
assert(rollDiceSource.includes('resolveDiceRoll(transaction.value);'), '玩法结算必须使用 transaction.value');
assert(rollDiceSource.includes('if (rolling || pieceAnimation || modal) return;'), '必须保留连点锁');
assert(
  rollDiceSource.indexOf('rollingDiceValue = transaction.value;') < rollDiceSource.indexOf('rolling = false;'),
  '最终点数必须在结束 rolling 状态前先绘制落定帧'
);
assert(source.includes('DICE_PIP_POSITIONS'), '必须保留统一点位映射');
assert(source.includes('drawDiceCubeFace(face.points'), '必须按可见面绘制骰子立方体');
assert(source.includes('diceMotionState(progress, size, reducedMotionEnabled)'), 'Canvas 骰子必须使用统一的轨迹状态');
assert(source.includes('motion.impact > 0'), 'Canvas 骰子必须绘制两次落地反馈');
assert(extractFunction('diceMotionState').includes('p < .56') && extractFunction('diceMotionState').includes('p < .82'), '小游戏轨迹必须与网页版使用同一组三阶段接触时机');
assert(source.includes('const flipIntensity = rolling ? (reducedMotionEnabled ? .28 : 1) : 0;'), '低动态模式必须保留更轻的骰身翻转反馈');
assert(source.includes('function rotateDiceCubePoint(point, angleX, angleY)'), 'Canvas 骰子必须以两个旋转轴计算立方体顶点');
assert(source.includes('function projectDiceCubePoint(point, angleX, angleY, perspective)'), 'Canvas 骰子必须把立方体顶点投影到屏幕');
assert(source.includes('const cubeFaces = ['), 'Canvas 骰子必须绘制六个立方体面并由可见面筛选');
assert(source.includes('.filter(face => face.visible)'), 'Canvas 骰子必须只绘制面向镜头的立方体面');
assert(source.includes('const faceValuesBySide = {'), 'Canvas 骰子必须为立方体六个面保留正反点数映射');
assert(source.includes('const angleX = rolling ? -.55 + spin : 0;'), '骰子静止时必须取消 X 轴倾斜，仅保留结果正面');
assert(source.includes('const angleY = rolling ? -.68 + spin * .68 : 0;'), '骰子静止时必须取消 Y 轴倾斜，仅保留结果正面');
assert(source.includes('const pipRadius = Math.max(2.15, size * .07);'), '骰点尺寸必须随立方体面尺寸缩放');
assert(rollDiceSource.includes('const duration = reducedMotionEnabled ? 180 : 820;'), '小游戏骰子时长必须与网页版常规/低动态时长同步');

console.log('PASS: 小游戏骰子 30 次 transaction、2/5 点、三阶段翻转/弹跳、动态阴影、连点锁、滚动立方体和静止单结果面检查通过。');
