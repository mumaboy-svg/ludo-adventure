const assert = require('assert');
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const gamePath = path.resolve(__dirname, '..', 'game.js');
const functionPath = path.resolve(__dirname, '..', 'cloudfunctions', 'cloudSave', 'index.js');
const source = fs.readFileSync(gamePath, 'utf8');
const cloudFunctionSource = fs.readFileSync(functionPath, 'utf8');

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

assert(source.includes("const CLOUD_SAVE_FUNCTION_NAME = 'cloudSave';"), '客户端必须使用专用 cloudSave 云函数');
assert(source.includes("'ludo_minigame_state_v3'") && source.includes("'ludo_minigame_setup_v1'") && source.includes("'ludo_minigame_task_packs_v1'"), '云存档一期必须覆盖三把既有核心键');
assert(!source.includes("queueCloudSave('ludo_minigame_tasks_v1'"), '自定义任务不得进入一期云同步');
assert(!source.includes("queueCloudSave('ludo_minigame_bgm_enabled_v1'"), '声音偏好不得进入一期云同步');
assert(!source.includes("queueCloudSave(RESCUE_BADGE_STORAGE_KEY"), '救援徽章不得进入一期云同步');
assert(!source.includes('userId:'), '客户端不得传递用户标识');

const storage = {};
const cloudCalls = [];
const sandbox = {
  Promise,
  JSON,
  Object,
  Array,
  setTimeout(callback) { callback(); return 1; },
  clearTimeout() {},
  render() {},
  state: null,
  setupPlayers: null,
  taskPackSettings: null,
  DEFAULT_TASK_PACKS: { safe_family: true, party_light: true, party_fun: true, couple_light: false, king: true },
  wx: {
    getStorageSync(key) { return storage[key]; },
    setStorageSync(key, value) { storage[key] = value; },
    cloud: {
      init() {},
      callFunction(options) {
        cloudCalls.push(options);
        return { result: { ok: true, found: false } };
      }
    }
  }
};
const clientFunctions = [
  'initCloudSecurity',
  'ensureCloudSecurity',
  'hasLocalCloudSave',
  'cloneCloudSaveData',
  'cloudSaveCall',
  'queueCloudSaveRequest',
  'sanitizeCloudSaveData',
  'writeCloudSave',
  'queueCloudSave',
  'deleteCloudSave',
  'cancelQueuedCloudSaveWrites',
  'applyRestoredCloudSave',
  'restoreCloudSaves',
  'saveState',
  'saveSetupPlayers',
  'saveTaskPackSettings'
].map(extractFunction).join('\n');
vm.runInNewContext(
  `const CLOUD_ENV_ID = 'test-env';
   const CLOUD_SAVE_FUNCTION_NAME = 'cloudSave';
   const CLOUD_SAVE_KEYS = ['ludo_minigame_state_v3', 'ludo_minigame_setup_v1', 'ludo_minigame_task_packs_v1'];
   const TASK_PACK_PRESETS = {};
   let cloudSecurityReady = false;
   let cloudSaveRestoreStarted = false;
   const cloudSavePendingData = {};
   const cloudSaveWriteTimers = {};
   const cloudSaveRequestChains = {};
   function normalizeState(value) { return value; }
   function normalizeSetupPlayerNames(value) { return value; }
   ${clientFunctions}
   this.api = { saveState, saveSetupPlayers, saveTaskPackSettings, applyRestoredCloudSave, restoreCloudSaves };`,
  sandbox
);

(async () => {
  sandbox.state = { players: [{ id: 'a' }, { id: 'b' }] };
  sandbox.api.saveState();
  assert.strictEqual(storage.ludo_minigame_state_v3, sandbox.state, '对局本地写入必须先完成');
  sandbox.setupPlayers = [{ name: '跳跳', color: 'R', nameReviewed: true }, { name: '绵绵', color: 'Y', nameReviewed: true }];
  sandbox.api.saveSetupPlayers();
  sandbox.taskPackSettings = { enabled: true, preset: 'family', packs: { safe_family: true, party_light: false, party_fun: false, couple_light: false, king: true } };
  sandbox.api.saveTaskPackSettings();
  await new Promise(resolve => setImmediate(resolve));
  assert.deepStrictEqual(
    cloudCalls.map(call => call.data.key).sort(),
    ['ludo_minigame_state_v3', 'ludo_minigame_setup_v1', 'ludo_minigame_task_packs_v1'].sort(),
    '三类本地保存必须后台同步，且不扩展范围'
  );
  assert(cloudCalls.every(call => call.name === 'cloudSave' && !Object.prototype.hasOwnProperty.call(call.data, 'userId')), '云调用必须不携带客户端用户标识');

  storage.ludo_minigame_state_v3 = { players: [{ id: 'local-a' }, { id: 'local-b' }] };
  assert.strictEqual(
    sandbox.api.applyRestoredCloudSave('ludo_minigame_state_v3', { players: [{ id: 'cloud-a' }, { id: 'cloud-b' }] }),
    false,
    '云端恢复不得覆盖已有本地进度'
  );
  delete storage.ludo_minigame_setup_v1;
  assert.strictEqual(
    sandbox.api.applyRestoredCloudSave('ludo_minigame_setup_v1', [{ name: '云端跳跳', color: 'R', nameReviewed: true }, { name: '云端绵绵', color: 'Y', nameReviewed: true }]),
    true,
    '本地缺失时允许恢复云端玩家设置'
  );

  const clearAllSource = extractFunction('confirmClearAllData');
  assert(clearAllSource.includes('cancelQueuedCloudSaveWrites();'), '清空全部数据必须取消未发送的旧云写入');
  assert(clearAllSource.includes('CLOUD_SAVE_KEYS.forEach(key => deleteCloudSave(key));'), '清空全部数据必须请求删除三类云存档');
  assert(cloudFunctionSource.includes('cloud.getWXContext()?.OPENID'), '云函数必须从微信上下文取得 OPENID');
  assert(!cloudFunctionSource.includes('event?.userId'), '云函数不得信任客户端 userId');

  const cloudSandbox = {
    Buffer,
    exports: {},
    require(name) {
      if (name === 'wx-server-sdk') {
        return {
          DYNAMIC_CURRENT_ENV: 'test',
          init() {},
          getWXContext() { return { OPENID: 'openid-test' }; },
          database() { return {}; }
        };
      }
      throw new Error(`unexpected dependency: ${name}`);
    }
  };
  vm.runInNewContext(cloudFunctionSource, cloudSandbox);
  const { sanitizeData, validAction, validKey } = cloudSandbox.exports.__test;
  assert.strictEqual(validAction('read'), 'read', 'read 必须是允许操作');
  assert.strictEqual(validAction('merge'), null, '未知操作必须拒绝');
  assert.strictEqual(validKey('ludo_minigame_state_v3'), 'ludo_minigame_state_v3', '核心状态键必须允许');
  assert.strictEqual(validKey('ludo_minigame_tasks_v1'), null, '自定义任务键必须拒绝');
  assert.strictEqual(sanitizeData('ludo_minigame_setup_v1', [{ name: '甲', color: 'R', nameReviewed: true }]), null, '少于两位玩家必须拒绝');
  assert.strictEqual(sanitizeData('ludo_minigame_task_packs_v1', { enabled: true, preset: 'unknown', packs: {} }), null, '非法任务包预设必须拒绝');
  assert.strictEqual(sanitizeData('ludo_minigame_state_v3', { players: [{}, {}] }), null, '不完整对局状态必须拒绝');

  console.log('PASS: 云存档一期的本地优先、三键边界、恢复保护、清空删除与云函数校验检查通过。');
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
