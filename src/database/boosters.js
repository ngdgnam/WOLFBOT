const db = require('./db');
const eco = require('./economy');
const gzw = require('../config/gzw');

const cfg = gzw.booster;

/** Coin thưởng = Giá trị tham chiếu × Hệ số (làm tròn xuống, có trần). */
function computeCoins(valueVnd) {
  if (!Number.isInteger(valueVnd) || valueVnd <= 0) return 0;
  return Math.min(Math.floor((valueVnd * cfg.rewardPer1000Vnd) / 1000), cfg.maxRewardPerBoost);
}

/**
 * Ghi nhận một lượt boost (messageId = ID tin nhắn hệ thống của Discord).
 * - Trùng messageId -> bỏ qua. Không có giá trị tham chiếu -> REVIEW (chưa cộng coin).
 */
const recordBoost = db.transaction((guildId, userId, messageId) => {
  if (db.prepare('SELECT 1 FROM boost_events WHERE messageId = ?').get(messageId)) return { ok: false, duplicate: true };

  const value = cfg.referenceValueVnd;
  const coins = value ? computeCoins(value) : 0;
  const status = coins > 0 ? 'REWARDED' : 'REVIEW';
  const info = db.prepare(
    'INSERT INTO boost_events (guildId, userId, messageId, status, refValueVnd, coins, createdAt) VALUES (?, ?, ?, ?, ?, ?, ?)'
  ).run(guildId, userId, messageId, status, value || null, coins, Date.now());

  let balance = null;
  if (status === 'REWARDED') {
    balance = eco.addCoins(guildId, userId, coins, 'booster', `Boost ${messageId}`, `boost:${messageId}`).balance;
  }
  return { ok: true, id: info.lastInsertRowid, status, coins, balance };
});

/** Admin xác minh giá trị tham chiếu cho lượt boost đang REVIEW rồi mới cộng coin. */
const approveBoost = db.transaction((guildId, eventId, adminId, valueVnd) => {
  const ev = db.prepare('SELECT * FROM boost_events WHERE id = ? AND guildId = ?').get(eventId, guildId);
  if (!ev) return { ok: false, reason: 'notfound' };
  if (ev.status !== 'REVIEW') return { ok: false, reason: 'done', ev };
  if (ev.userId === adminId) return { ok: false, reason: 'self' };
  const coins = computeCoins(valueVnd);
  if (coins <= 0) return { ok: false, reason: 'value' };

  db.prepare("UPDATE boost_events SET status = 'REWARDED', refValueVnd = ?, coins = ?, approvedBy = ? WHERE id = ?")
    .run(valueVnd, coins, adminId, ev.id);
  const res = eco.addCoins(guildId, ev.userId, coins, 'booster', `Boost ${ev.messageId}`, `boost:${ev.messageId}`);
  return { ok: true, ev, coins, balance: res.balance };
});

const listPending = (guildId, limit = 15) =>
  db.prepare("SELECT * FROM boost_events WHERE guildId = ? AND status = 'REVIEW' ORDER BY id LIMIT ?").all(guildId, limit);
const listUser = (guildId, userId, limit = 10) =>
  db.prepare('SELECT * FROM boost_events WHERE guildId = ? AND userId = ? ORDER BY id DESC LIMIT ?').all(guildId, userId, limit);

/** Theo dõi trạng thái Boost hiện tại (để gán/gỡ quyền lợi gắn với Boost). */
function markBoosting(guildId, userId) {
  db.prepare(
    `INSERT INTO booster_status (guildId, userId, active, since) VALUES (?, ?, 1, ?)
     ON CONFLICT (guildId, userId) DO UPDATE SET active = 1, endedAt = NULL,
       since = CASE WHEN active = 1 THEN since ELSE excluded.since END`
  ).run(guildId, userId, Date.now());
}
function markEnded(guildId, userId) {
  db.prepare('UPDATE booster_status SET active = 0, endedAt = ? WHERE guildId = ? AND userId = ? AND active = 1')
    .run(Date.now(), guildId, userId);
}
const getStatus = (guildId, userId) =>
  db.prepare('SELECT * FROM booster_status WHERE guildId = ? AND userId = ?').get(guildId, userId);

module.exports = { computeCoins, recordBoost, approveBoost, listPending, listUser, markBoosting, markEnded, getStatus };
