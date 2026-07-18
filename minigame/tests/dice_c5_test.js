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
  'diceSideValues'
];
const coreSource = functionNames.map(extractFunction).join('\n');
const sandbox = {
  Math,
  Date,
  Object,
  Number,
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
  `${coreSource}\nmodule.exports = { normalizeDiceValue, createDiceValue, createDiceRollTransaction, diceAnimationFrameValue, diceSideValues };`,
  sandbox
);

const {
  normalizeDiceValue,
  createDiceRollTransaction,
  diceAnimationFrameValue,
  diceSideValues
} = sandbox.module.exports;

assert(source.includes("const GAME_VERSION = '2.14.0';"), '小游戏版本应为 2.14.0');
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
assert(source.includes('drawDiceFacePolygon(top'), '必须绘制骰子顶部');
assert(source.includes('drawDiceFacePolygon(right'), '必须绘制骰子右侧');

console.log('PASS: C5 小游戏骰子 30 次 transaction、2/5 点、连点锁和实体三面绘制检查通过。');
