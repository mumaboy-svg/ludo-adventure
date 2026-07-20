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

const triggerSource = extractFunction('triggerBaseRollTask');
assert(!triggerSource.includes('state.triggered'), '基地任务不得按棋子和点数永久去重');

const shown = [];
const sandbox = {
  state: { triggered: { 'base-piece-1-2': true } },
  tasks: { baseRoll: { 2: '任务二', 3: '任务三', 4: '任务四', 5: '任务五' } },
  modeTaskList() { return []; },
  pickTask() { return null; },
  taskModeLabel() { return '手动任务'; },
  showTask(title, body, actor, type) { shown.push({ title, body, actor, type }); }
};
vm.runInNewContext(`${triggerSource}\nthis.triggerBaseRollTask = triggerBaseRollTask;`, sandbox);

const piece = { id: 'piece-1', name: '红色飞机' };
sandbox.triggerBaseRollTask(piece, 2);
sandbox.triggerBaseRollTask(piece, 2);
assert.strictEqual(shown.length, 2, '同一棋子重复掷出相同基地任务点数必须每次触发');
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(shown.map((entry) => entry.title))),
  ['基地任务 2点', '基地任务 2点'],
  '重复点数必须两次进入任务显示'
);
assert.strictEqual(sandbox.state.triggered['base-piece-1-2'], true, '旧存档遗留 triggered 键可以保留但不得抑制任务');

shown.length = 0;
[2, 3, 4, 5].forEach((value) => sandbox.triggerBaseRollTask(piece, value));
assert.deepStrictEqual(
  JSON.parse(JSON.stringify(shown.map((entry) => entry.body))),
  ['任务二', '任务三', '任务四', '任务五'],
  '基地 2-5 点必须分别进入对应任务'
);

const resolveSource = extractFunction('resolveDiceRoll');
assert(resolveSource.includes('if (value >= 2 && value <= 5) triggerBaseRollTask(piece, value);'), '只有基地 2-5 点应进入基地任务分支');
assert(resolveSource.includes('if (value === 6)'), '6 点必须保留独立起飞分支');

const modalFunctions = ['modalVisualType', 'showTask', 'flushDeferredModal']
  .map(extractFunction)
  .join('\n');
const modalSandbox = {
  modal: null,
  modalQueue: [],
  deferModals: true,
  modalOpenedAt: 0,
  startModalAnimation() { modalSandbox.opened += 1; },
  opened: 0
};
vm.runInNewContext(
  `${modalFunctions}\nthis.api = { showTask, flushDeferredModal };`,
  modalSandbox
);
modalSandbox.api.showTask('基地任务 2点', '任务二', '红色飞机', 'task');
assert.strictEqual(modalSandbox.modal, null, '延迟弹窗期间不得抢占当前弹窗');
assert.strictEqual(modalSandbox.modalQueue.length, 1, '延迟弹窗期间基地任务必须入队');
modalSandbox.deferModals = false;
modalSandbox.api.flushDeferredModal();
assert.strictEqual(modalSandbox.modal?.title, '基地任务 2点', '延迟弹窗刷新后基地任务必须显示');
assert.strictEqual(modalSandbox.opened, 1, '入队任务显示时必须启动弹窗动画');

console.log('PASS: 基地任务重复触发、2-5 点映射、旧存档键兼容与延迟弹窗队列检查通过。');
