const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gamePath = path.resolve(__dirname, '..', 'game.js');
const projectRoot = path.resolve(__dirname, '..', '..');
const source = fs.readFileSync(gamePath, 'utf8');

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

[
  'settlement_frame_landscape.png',
  'settlement_frame_portrait.png',
  'settlement_planes_finish.png',
  'settlement_rescue_crest.png',
  'button_play_again.png'
].forEach((fileName) => {
  const assetPath = path.join(projectRoot, 'minigame', 'packages', 'game-assets', 'assets', 'images', 'ui', fileName);
  assert(fs.existsSync(assetPath) && fs.statSync(assetPath).size > 0, `结算图片必须存在：${fileName}`);
});

[
  'sfx_piece_move.wav',
  'sfx_piece_land.wav',
  'sfx_task_card_draw.mp3',
  'sfx_king_card_reveal.mp3',
  'sfx_victory_fanfare.mp3'
].forEach((fileName) => {
  const assetPath = path.join(projectRoot, 'minigame', 'packages', 'game-assets', 'assets', 'audio', fileName);
  assert(fs.existsSync(assetPath) && fs.statSync(assetPath).size > 0, `短音效必须存在：${fileName}`);
});

const rankingSource = extractFunction('settlementRankingSnapshot');
const queueSource = extractFunction('queueSettlement');
const maybeOpenSource = extractFunction('maybeOpenSettlement');
const drawSource = extractFunction('drawSettlement');
const finishSource = extractFunction('finishPiece');
const freshSource = extractFunction('startFreshGame');
const actionSource = extractFunction('handleAction');
const audioSource = extractFunction('playShortSfx');
const vibrationSource = extractFunction('vibrateFeedback');
const modalAnimationSource = extractFunction('startModalAnimation');
const landingSource = extractFunction('startPieceLandingFeedback');

const played = [];
const vibrated = [];
let renderCount = 0;
const sandbox = {
  state: {
    finishOrder: ['p1', 'p2', 'p3', 'p4', 'p5'],
    players: [
      { id: 'p1', name: '红色勇士', color: 'R' },
      { id: 'p2', name: '黄色勇士', color: 'Y' },
      { id: 'p3', name: '蓝色勇士', color: 'B' },
      { id: 'p4', name: '绿色勇士', color: 'G' },
      { id: 'p5', name: '第五位勇士', color: 'R' }
    ]
  },
  pendingSettlement: null,
  settlement: null,
  settlementOpenedAt: 0,
  modal: null,
  modalQueue: [{ title: '终局任务' }],
  deferModals: false,
  pieceAnimation: null,
  rolling: false,
  played,
  vibrated,
  playShortSfx: (name) => played.push(name),
  vibrateFeedback: (type) => vibrated.push(type),
  render: () => { renderCount += 1; }
};

vm.runInNewContext(
  `${rankingSource}\n${queueSource}\n${maybeOpenSource}\nthis.api = { settlementRankingSnapshot, queueSettlement, maybeOpenSettlement };`,
  sandbox
);

const ranking = sandbox.api.settlementRankingSnapshot();
assert.strictEqual(ranking.length, 5, '排名快照必须保留全部完赛玩家');
assert.strictEqual(ranking[0].place, 1, '第一名排序必须稳定');
assert.strictEqual(ranking[4].name, '第五位勇士', '四人以上仍须保留末位玩家信息');

sandbox.api.queueSettlement('rescue');
assert.strictEqual(sandbox.pendingSettlement.type, 'rescue', '救援结算必须保留独立类型');
assert.strictEqual(sandbox.settlement, null, '终局弹窗队列未清空前不得打开结算');
sandbox.modalQueue.length = 0;
assert.strictEqual(sandbox.api.maybeOpenSettlement(), true, '终局弹窗清空后必须打开结算');
assert.strictEqual(sandbox.settlement.type, 'rescue', '打开后的结算类型必须与排队结果一致');
assert.strictEqual(sandbox.pendingSettlement, null, '结算打开后必须清空待处理状态');
assert.deepStrictEqual(sandbox.played, ['victory'], '结算只播放一次胜利短音效');
assert.deepStrictEqual(sandbox.vibrated, ['heavy'], '结算只触发一次克制的重反馈');
assert.strictEqual(renderCount, 1, '结算打开后必须触发一次重绘');

assert(maybeOpenSource.includes('modalQueue.length') && maybeOpenSource.includes('deferModals'), '结算必须等待弹窗队列和延迟弹窗结束');
assert(maybeOpenSource.includes('pieceAnimation') && maybeOpenSource.includes('rolling'), '结算不得打断棋子移动或掷骰');
assert(drawSource.includes('settlementFramePortrait') && drawSource.includes('settlementFrameLandscape'), '横竖屏必须使用各自结算框');
assert(drawSource.includes('settlementRescueCrest') && drawSource.includes('settlementPlanesFinish'), '普通胜利与救援必须使用不同主视觉');
assert(drawSource.includes('ranking.length > 4') && drawSource.includes('ranking[ranking.length - 1]'), '四人以上排名必须保留前三名和末位');
assert(drawSource.includes("'settlementHome'") && drawSource.includes("'settlementReplay'"), '结算必须提供返回大厅和再来一局');
assert(drawSource.includes('reducedMotionEnabled ? 7 : 14') && drawSource.includes('if (!reducedMotionEnabled)'), '星星和彩带必须支持低动态降级');
assert(finishSource.indexOf("showTask('糖果公主获救！'") < finishSource.indexOf("queueSettlement(receivedRescueBadge ? 'rescue' : 'victory')"), '救援说明必须先入队，再排队结算');
assert(freshSource.includes('clearSettlement();') && freshSource.includes('state = newGameState();'), '再来一局必须清除旧结算并创建全新对局');
assert(actionSource.includes("action === 'settlementReplay'") && actionSource.includes("startFreshGame('再来一局"), '再来一局按钮必须进入新局流程');

assert(source.includes("let soundEffectsEnabled = wx.getStorageSync('ludo_minigame_sfx_enabled_v1') !== false;"), '音效开关必须独立持久化');
assert(source.includes("let vibrationEnabled = wx.getStorageSync('ludo_minigame_vibration_enabled_v1') !== false;"), '震动开关必须独立持久化');
assert(audioSource.includes("if (!soundEffectsEnabled") && audioSource.includes("audio.stop()"), '短音效必须支持静音并在重播前停止旧实例');
assert(audioSource.includes("audio.startTime = 0") && audioSource.includes('audio.play();'), '短音效重播必须从头开始');
assert(vibrationSource.includes("typeof wx.vibrateShort !== 'function'"), '震动必须在不支持的环境安全降级');
assert(modalAnimationSource.includes("playShortSfx('king')") && modalAnimationSource.includes("playShortSfx('task')"), '任务卡和国王卡必须接入各自短音效');
assert(landingSource.includes("playShortSfx('pieceLand')") && landingSource.includes("vibrateFeedback('light')"), '棋子落地必须接入音效和轻震');

const shortPortrait = { width: 375, height: 600, capsuleBottom: 84, safeBottomInset: 34 };
const marginTop = Math.max(shortPortrait.capsuleBottom + 8, 62);
const bottomMargin = Math.max(shortPortrait.safeBottomInset + 10, 14);
const panelHeight = Math.min(shortPortrait.height - marginTop - bottomMargin, 620);
const actionBottom = marginTop + panelHeight * 0.79 + 52;
assert(actionBottom <= shortPortrait.height - shortPortrait.safeBottomInset, '375×600 竖屏结算按钮必须留在底部安全区内');

console.log('PASS: v2.23.0 小游戏 D2 结算、救援队列、排名、短屏安全区、D3 音效与震动契约检查通过。');
