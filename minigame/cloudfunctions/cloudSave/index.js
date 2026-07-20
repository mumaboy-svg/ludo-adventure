const cloud = require('wx-server-sdk');

cloud.init({ env: cloud.DYNAMIC_CURRENT_ENV });

const COLLECTION_NAME = 'cloud_saves';
const CLOUD_SAVE_KEYS = ['ludo_minigame_state_v3', 'ludo_minigame_setup_v1', 'ludo_minigame_task_packs_v1'];
const COLORS = ['R', 'Y', 'B', 'G'];
const STATUSES = ['base', 'outer', 'straight', 'finished'];
const PRESETS = ['family', 'party', 'couple', 'all', 'manual', 'custom'];
const PACK_KEYS = ['safe_family', 'party_light', 'party_fun', 'couple_light', 'king'];
const MAX_PLAYERS = 16;
const MAX_LOGS = 180;
const MAX_TEXT_LENGTH = 240;
const MAX_DOCUMENT_BYTES = 48 * 1024;

function isPlainObject(value) {
  return !!value && typeof value === 'object' && !Array.isArray(value);
}
function boundedString(value, maxLength) {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed && Array.from(trimmed).length <= maxLength ? trimmed : null;
}
function integer(value, min, max) {
  return Number.isInteger(value) && value >= min && value <= max ? value : null;
}
function nullableInteger(value, min, max) {
  return value === null ? null : integer(value, min, max);
}
function boundedBooleanMap(value, allowedKeys, maxKeys = allowedKeys.length) {
  if (!isPlainObject(value) || Object.keys(value).length > maxKeys) return null;
  const result = {};
  for (const key of allowedKeys) {
    if (value[key] !== undefined && typeof value[key] !== 'boolean') return null;
    if (value[key] === true) result[key] = true;
  }
  return result;
}
function sanitizePlayer(player) {
  if (!isPlainObject(player)) return null;
  const id = boundedString(player.id, 80);
  const name = boundedString(player.name, 12);
  const color = COLORS.includes(player.color) ? player.color : null;
  const status = STATUSES.includes(player.status) ? player.status : null;
  const slot = integer(player.slot, 0, 3);
  const outerIndex = nullableInteger(player.outerIndex, 0, 51);
  const outerSteps = integer(player.outerSteps, 0, 52);
  const straightIndex = integer(player.straightIndex, 0, 6);
  const finishPlace = nullableInteger(player.finishPlace, 1, MAX_PLAYERS);
  if (!id || !name || !color || !status || slot === null || outerIndex === null && player.outerIndex !== null
    || outerSteps === null || straightIndex === null || finishPlace === null && player.finishPlace !== null) return null;
  return {
    id,
    name,
    color,
    slot,
    status,
    outerIndex,
    outerSteps,
    straightIndex,
    finishPlace,
    img: `plane${color}`
  };
}
function sanitizeLog(entry) {
  if (!isPlainObject(entry)) return null;
  const text = boundedString(entry.text, MAX_TEXT_LENGTH);
  const type = typeof entry.type === 'string' ? entry.type.slice(0, 32) : '';
  const at = integer(entry.at, 0, 9999999999999);
  return text && at !== null ? { text, type, at } : null;
}
function sanitizeState(data) {
  if (!isPlainObject(data) || !Array.isArray(data.players) || data.players.length < 2 || data.players.length > MAX_PLAYERS) return null;
  const players = data.players.map(sanitizePlayer);
  const logs = Array.isArray(data.logs) && data.logs.length <= MAX_LOGS ? data.logs.map(sanitizeLog) : null;
  const finishOrder = Array.isArray(data.finishOrder) && data.finishOrder.length <= MAX_PLAYERS
    ? data.finishOrder.map(value => boundedString(value, 80)).filter(Boolean)
    : null;
  const currentPlayer = integer(data.currentPlayer, 0, players.length - 1);
  const lastRoll = data.lastRoll === null ? null : integer(data.lastRoll, 1, 6);
  const round = integer(data.round, 1, 1000000);
  const acted = boundedBooleanMap(data.acted, players.map(player => player?.id).filter(Boolean), MAX_PLAYERS);
  const triggered = boundedBooleanMap(data.triggered, Object.keys(data.triggered || {}), 512);
  if (players.some(player => !player) || !logs || !finishOrder || currentPlayer === null || lastRoll === null && data.lastRoll !== null
    || round === null || !acted || !triggered || typeof data.gameOver !== 'boolean') return null;
  return {
    currentPlayer,
    lastRoll,
    players,
    logs,
    round,
    acted,
    triggered,
    finishOrder,
    gameOver: data.gameOver
  };
}
function sanitizeSetup(data) {
  if (!Array.isArray(data) || data.length < 2 || data.length > MAX_PLAYERS) return null;
  const players = data.map((player) => {
    if (!isPlainObject(player)) return null;
    const name = boundedString(player.name, 12);
    const color = COLORS.includes(player.color) ? player.color : null;
    return name && color && typeof player.nameReviewed === 'boolean'
      ? { name, color, nameReviewed: player.nameReviewed }
      : null;
  });
  return players.some(player => !player) ? null : players;
}
function sanitizeTaskPacks(data) {
  if (!isPlainObject(data) || typeof data.enabled !== 'boolean' || !PRESETS.includes(data.preset) || !isPlainObject(data.packs)) return null;
  const packs = {};
  for (const key of PACK_KEYS) {
    if (typeof data.packs[key] !== 'boolean') return null;
    packs[key] = data.packs[key];
  }
  return { enabled: data.enabled, preset: data.preset, packs };
}
function sanitizeData(key, data) {
  const value = key === 'ludo_minigame_state_v3'
    ? sanitizeState(data)
    : key === 'ludo_minigame_setup_v1'
      ? sanitizeSetup(data)
      : key === 'ludo_minigame_task_packs_v1'
        ? sanitizeTaskPacks(data)
        : null;
  if (!value) return null;
  try {
    return Buffer.byteLength(JSON.stringify(value), 'utf8') <= MAX_DOCUMENT_BYTES ? value : null;
  } catch (error) {
    return null;
  }
}
function validAction(action) {
  return ['read', 'write', 'delete'].includes(action) ? action : null;
}
function validKey(key) {
  return CLOUD_SAVE_KEYS.includes(key) ? key : null;
}

async function findRecord(collection, openId, key) {
  const result = await collection.where({ ownerId: openId, key }).limit(1).get();
  return result?.data?.[0] || null;
}

async function main(event) {
  const action = validAction(event?.action);
  const key = validKey(event?.key);
  if (!action || !key) return { ok: false, reason: 'invalid-request' };

  const openId = cloud.getWXContext()?.OPENID;
  if (!openId) return { ok: false, reason: 'identity-unavailable' };

  const collection = cloud.database().collection(COLLECTION_NAME);
  try {
    const existing = await findRecord(collection, openId, key);
    if (action === 'read') {
      return existing
        ? { ok: true, found: true, key, data: existing.data, updatedAt: existing.updatedAt }
        : { ok: true, found: false, key };
    }
    if (action === 'delete') {
      if (!existing) return { ok: true, deleted: false, key };
      await collection.doc(existing._id).remove();
      return { ok: true, deleted: true, key };
    }

    const data = sanitizeData(key, event?.data);
    if (!data) return { ok: false, reason: 'invalid-data' };
    const updatedAt = Date.now();
    if (existing) {
      await collection.doc(existing._id).update({ data: { data, updatedAt } });
    } else {
      await collection.add({ data: { ownerId: openId, key, data, updatedAt } });
    }
    return { ok: true, accepted: true, key, updatedAt };
  } catch (error) {
    return { ok: false, reason: 'storage-unavailable' };
  }
}

exports.main = main;
exports.__test = { sanitizeData, validAction, validKey };
