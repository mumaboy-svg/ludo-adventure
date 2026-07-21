const assert = require('assert');
const fs = require('fs');
const path = require('path');

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
assert(source.includes("let pressedButtonFeedback = { action: '', startedAt: 0 };"), '必须保留按钮按压反馈状态');

const pressStateSource = extractFunction('isButtonPressed');
const pressDrawSource = extractFunction('withButtonPressFeedback');
const pressTriggerSource = extractFunction('triggerButtonPressFeedback');
assert(pressStateSource.includes('reducedMotionEnabled'), '低动态模式必须关闭按钮按压反馈');
assert(pressDrawSource.includes('ctx.scale(.975, .955);'), '按压态必须使用轻量缩放反馈');
assert(pressDrawSource.includes('x + w / 2') && pressDrawSource.includes('y + h / 2'), '按压缩放必须以按钮中心为基准');
assert(pressTriggerSource.includes('setTimeout') && pressTriggerSource.includes('135'), '按压反馈必须在短时后复位');

['drawMenuButton', 'drawTool', 'drawPanelButton', 'drawSwitchControl', 'drawDangerButton'].forEach((name) => {
  assert(extractFunction(name).includes('withButtonPressFeedback('), `${name} 必须接入通用按压反馈`);
});

const touchSource = source.slice(source.indexOf('wx.onTouchStart('));
assert(touchSource.indexOf('triggerButtonPressFeedback(btn.action);') < touchSource.indexOf('handleAction(btn.action);'), '触摸反馈必须在动作处理前触发');
assert(touchSource.includes('const btn = hitTest(touch.clientX, touch.clientY);'), '触摸仍必须使用原始命中测试');
assert(source.includes('buttons.push({ x, y, w, h, action });'), '按钮命中区域必须保持原始矩形，不随视觉缩放改变');

['startModalAnimation', 'currentPlayerHudFeedback', 'startPieceAnimation', 'createDiceRollTransaction', 'diceMotionState'].forEach((symbol) => {
  assert(source.includes(symbol), `必须保留既有动效或骰子契约：${symbol}`);
});
assert(source.includes('rollingDiceValue = transaction.value;'), '骰子最终点数绘制契约必须保留');

console.log('PASS: C6 按钮按压反馈、低动态保护、原始触摸边界，以及既有弹窗/HUD/棋子/骰子契约检查通过。');
