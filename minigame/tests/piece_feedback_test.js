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
assert(source.includes('let pieceLandingFeedback = null;'), '必须有独立的棋子落地瞬态状态');

const animationSource = extractFunction('animationPosition');
const startAnimationSource = extractFunction('startPieceAnimation');
const landingSource = extractFunction('startPieceLandingFeedback');
const drawPieceSource = extractFunction('drawPiece');
const finishMoveSource = extractFunction('finishAnimatedMove');
const reducedMotionSource = extractFunction('setReducedMotionEnabled');

assert(animationSource.includes('hop,') && animationSource.includes('progress: ease'), '移动插值必须向绘制层提供抬升和进度');
assert(animationSource.includes('direction:'), '移动插值必须提供轻微倾斜方向');
assert(startAnimationSource.includes("current.kind === 'fly' ? 300 : 90"), '低动态模式必须缩短棋子移动');
assert(startAnimationSource.includes('arc: reducedMotionEnabled ? 0'), '低动态模式必须移除移动弧线');
assert(startAnimationSource.indexOf('pieceAnimation = null;') < startAnimationSource.indexOf('startPieceLandingFeedback(piece.id);'), '落地反馈必须在移动状态清理后启动');
assert(startAnimationSource.indexOf('startPieceLandingFeedback(piece.id);') < startAnimationSource.lastIndexOf('if (onDone) onDone();'), '落地反馈不得延迟原移动完成回调');

assert(landingSource.includes('duration = 480'), '落地反馈必须保持短促');
assert(landingSource.includes("scene !== 'game'"), '离开游戏场景后必须停止落地重绘');
assert(landingSource.includes('render();') && landingSource.includes('scheduleFrame(tick);'), '落地反馈必须有有限时逐帧绘制');

assert(drawPieceSource.includes('piece.id === currentPieceId'), '当前可行动棋子必须有独立视觉判断');
assert(drawPieceSource.includes('ctx.arc(px, py + 2, ringRadius'), '当前棋子必须绘制玩家色圆环');
assert(drawPieceSource.includes('ctx.ellipse(px, py + hopPixels + 15'), '移动棋子必须绘制脚下阴影');
assert(drawPieceSource.includes('landingProgress') && drawPieceSource.includes('ctx.ellipse(px, py + 12'), '落地必须绘制扩散环');
assert(drawPieceSource.includes('ctx.rotate(') && drawPieceSource.includes('ctx.scale('), '移动和落地必须包含轻微实体姿态反馈');
assert(drawPieceSource.includes('!reducedMotionEnabled'), '非必要运动必须受低动态设置控制');

assert(reducedMotionSource.includes('pieceLandingFeedback = null;'), '开启低动态时必须清理落地动画');
assert(finishMoveSource.includes('flushDeferredModal();'), '任务和国王卡延迟弹出契约必须保留');
assert(finishMoveSource.includes('saveState();'), '移动完成后的存档事务必须保留');

console.log('PASS: D1.1 小游戏当前棋子高亮、移动阴影、落地反馈、低动态保护与原移动事务检查通过。');
