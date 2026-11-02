const crypto = require('crypto');
const db = require('./db');
const eco = require('./economy');
const gzw = require('../config/gzw');

const cfg = gzw.payment;
const now = () => Date.now();
const DAY_MS = 86400000;

/* ============ QR ============ */
/** Mã đơn: chỉ chữ + số (ngân hàng thường bỏ ký tự đặc biệt/khoảng trắng trong nội dung CK). */
function newCode() {
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // bỏ ký tự dễ nhầm: I O 0 1
  let s = '';
  for (const b of crypto.randomBytes(8)) s += alphabet[b % alphabet.length];
  return `GZW${s}`;
}

/** URL ảnh QR VietQR (img.vietqr.io) đã nhúng sẵn số tiền + nội dung chuyển khoản. */
function qrUrl(order) {
  const base = `https://img.vietqr.io/image/${cfg.bankId}-${cfg.accountNo}-${cfg.template}.${cfg.imageExt}`;
  const q = new URLSearchParams({ amount: String(order.amountVnd), addInfo: order.code });
  if (cfg.accountName) q.set('accountName', cfg.accountName);
  return `${base}?${q.toString()}`;
}

/* ============ Sự kiện & trạng thái ============ */
const logEvent = (orderId, type, actorId = null, note = null) =>
  db.prepare('INSERT INTO payment_events (orderId, type, actorId, note, createdAt) VALUES (?, ?, ?, ?, ?)')
    .run(orderId, type, actorId, note, now());

function expireStale(guildId) {
  const t = now();
  const stale = db.prepare("SELECT id FROM payment_orders WHERE guildId = ? AND status = 'PENDING' AND expiresAt < ?").all(guildId, t);
  for (const { id } of stale) {
    db.prepare("UPDATE payment_orders SET status = 'EXPIRED', updatedAt = ? WHERE id = ? AND status = 'PENDING'").run(t, id);
    logEvent(id, 'EXPIRED');
  }
}

const getByCode = (code) => db.prepare('SELECT * FROM payment_orders WHERE code = ?').get(String(code).trim().toUpperCase());
const findPackage = (id) => cfg.packages.find((p) => p.id === id);

/* ============ Tạo đơn ============ */
const createOrder = db.transaction((guildId, userId, packageId) => {
  const pkg = findPackage(packageId);
  if (!pkg) return { ok: false, reason: 'nopackage' };
  expireStale(guildId);

  const pending = db.prepare("SELECT * FROM payment_orders WHERE guildId = ? AND userId = ? AND status = 'PENDING'").all(guildId, userId);
  if (pending.length >= cfg.maxPendingPerUser) return { ok: false, reason: 'pending', order: pending[0] };

  const today = db.prepare('SELECT COUNT(*) AS n FROM payment_orders WHERE guildId = ? AND userId = ? AND createdAt >= ?')
    .get(guildId, userId, now() - DAY_MS).n;
  if (today >= cfg.maxOrdersPerDay) return { ok: false, reason: 'limit' };

  const t = now();
  const code = newCode();
  const info = db.prepare(
    'INSERT INTO payment_orders (code, guildId, userId, packageId, amountVnd, coins, status, createdAt, expiresAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(code, guildId, userId, pkg.id, pkg.amountVnd, pkg.coins, 'PENDING', t, t + cfg.orderTtlMinutes * 60000, t);
  logEvent(info.lastInsertRowid, 'CREATED', userId);
  return { ok: true, order: db.prepare('SELECT * FROM payment_orders WHERE id = ?').get(info.lastInsertRowid) };
});

/* ============ Người dùng huỷ đơn ============ */
const cancelOwnOrder = db.transaction((guildId, userId, code) => {
  const o = getByCode(code);
  if (!o || o.guildId !== guildId || o.userId !== userId) return { ok: false, reason: 'notfound' };
  if (o.status !== 'PENDING') return { ok: false, reason: 'status', order: o };
  db.prepare("UPDATE payment_orders SET status = 'EXPIRED', updatedAt = ? WHERE id = ?").run(now(), o.id);
  logEvent(o.id, 'CANCELLED_BY_USER', userId);
  return { ok: true, order: o };
});

/* ============ Admin xác nhận ============ */
/**
 * Admin đã đối chiếu sao kê: nhập số tiền THỰC NHẬN + mã giao dịch ngân hàng.
 * - Đúng số tiền  -> PAID -> FULFILLED (cộng coin 1 lần, idempotent theo mã đơn).
 * - Sai số tiền   -> REVIEW (không cộng coin, chờ xử lý tay).
 * - Mã giao dịch ngân hàng đã dùng cho đơn khác -> từ chối.
 */
const confirmOrder = db.transaction((guildId, code, adminId, receivedVnd, bankRef) => {
  const o = getByCode(code);
  if (!o || o.guildId !== guildId) return { ok: false, reason: 'notfound' };
  if (o.userId === adminId) return { ok: false, reason: 'self' };
  if (['FULFILLED', 'REFUNDED'].includes(o.status)) return { ok: false, reason: 'done', order: o };
  if (o.status === 'PAID') return { ok: false, reason: 'done', order: o };

  const ref = String(bankRef).trim().toUpperCase();
  const dupe = db.prepare('SELECT code FROM payment_orders WHERE bankRef = ? AND id != ?').get(ref, o.id);
  if (dupe) return { ok: false, reason: 'dupref', other: dupe.code };

  const t = now();
  if (receivedVnd !== o.amountVnd) {
    db.prepare("UPDATE payment_orders SET status = 'REVIEW', receivedVnd = ?, bankRef = ?, reviewedBy = ?, updatedAt = ? WHERE id = ?")
      .run(receivedVnd, ref, adminId, t, o.id);
    logEvent(o.id, 'AMOUNT_MISMATCH', adminId, `cần ${o.amountVnd}, nhận ${receivedVnd}`);
    return { ok: false, reason: 'mismatch', order: o, receivedVnd };
  }

  db.prepare("UPDATE payment_orders SET status = 'PAID', receivedVnd = ?, bankRef = ?, reviewedBy = ?, updatedAt = ? WHERE id = ?")
    .run(receivedVnd, ref, adminId, t, o.id);
  logEvent(o.id, 'PAID', adminId, `bankRef ${ref}`);

  // refId = mã đơn -> dù lệnh bị gọi lặp, coin chỉ được cộng 1 lần
  const res = eco.addCoins(o.guildId, o.userId, o.coins, 'purchase', `Đơn ${o.code}`, o.code);
  if (!res.ok && !res.duplicate) throw new Error('Không ghi được sổ cái');
  db.prepare("UPDATE payment_orders SET status = 'FULFILLED', updatedAt = ? WHERE id = ?").run(now(), o.id);
  logEvent(o.id, 'FULFILLED', adminId, `+${o.coins} coin`);
  return { ok: true, order: { ...o, status: 'FULFILLED' }, balance: res.balance };
});

/* ============ Tự xác nhận từ webhook ngân hàng ============ */
const CODE_RE = /GZW[A-HJ-NP-Z2-9]{8}/;
/** Tìm mã đơn trong nội dung chuyển khoản (ngân hàng thường viết hoa, bỏ khoảng trắng/ký tự lạ). */
const extractCode = (...texts) => {
  for (const t of texts) {
    const m = CODE_RE.exec(String(t || '').toUpperCase().replace(/[^A-Z0-9]/g, ''));
    if (m) return m[0];
  }
  return null;
};

/**
 * Xử lý MỘT giao dịch tiền vào đã được xác thực chữ ký. Toàn bộ trong một transaction:
 * - (provider, txId) đã xử lý -> bỏ qua (SePay có thể gửi lại nhiều lần).
 * - Chỉ tự cộng coin khi đơn đang PENDING, CÒN HẠN và số tiền KHỚP TUYỆT ĐỐI.
 * - Mọi trường hợp còn lại (sai tiền, đơn hết hạn/đã đóng, không có mã đơn) -> KHÔNG cộng coin, ghi lại để admin xử lý tay.
 */
const processBankTransaction = db.transaction((provider, tx) => {
  const txId = String(tx.txId);
  if (db.prepare('SELECT 1 FROM webhook_transactions WHERE provider = ? AND txId = ?').get(provider, txId)) {
    return { duplicate: true };
  }
  const code = extractCode(tx.code, tx.content);
  const record = (outcome, note) => db.prepare(
    'INSERT INTO webhook_transactions (provider, txId, amountVnd, content, orderCode, outcome, note, receivedAt) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(provider, txId, tx.amountVnd, String(tx.content || '').slice(0, 200), code, outcome, note || null, now());

  const o = code ? getByCode(code) : null;
  if (!o) { record('UNMATCHED', code ? 'không có đơn này' : 'không thấy mã đơn trong nội dung'); return { outcome: 'UNMATCHED', code }; }

  const bankRef = `${provider}:${txId}`.toUpperCase();
  if (o.status !== 'PENDING' || o.expiresAt < now()) {
    logEvent(o.id, 'WEBHOOK_LATE', `system:${provider}`, `nhận ${tx.amountVnd}đ khi đơn ở trạng thái ${o.status}`);
    record('REVIEW', `đơn ${o.status}${o.expiresAt < now() ? ' / hết hạn' : ''}`);
    return { outcome: 'REVIEW', reason: 'status', order: o };
  }
  if (tx.amountVnd !== o.amountVnd) {
    db.prepare("UPDATE payment_orders SET status = 'REVIEW', receivedVnd = ?, bankRef = ?, reviewedBy = ?, updatedAt = ? WHERE id = ?")
      .run(tx.amountVnd, bankRef, `system:${provider}`, now(), o.id);
    logEvent(o.id, 'AMOUNT_MISMATCH', `system:${provider}`, `cần ${o.amountVnd}, nhận ${tx.amountVnd}`);
    record('REVIEW', `sai số tiền (cần ${o.amountVnd}, nhận ${tx.amountVnd})`);
    return { outcome: 'REVIEW', reason: 'mismatch', order: o, receivedVnd: tx.amountVnd };
  }

  const res = confirmOrder(o.guildId, o.code, `system:${provider}`, tx.amountVnd, bankRef);
  if (!res.ok) { record('REVIEW', `confirmOrder: ${res.reason}`); return { outcome: 'REVIEW', reason: res.reason, order: o }; }
  record('FULFILLED', o.code);
  return { outcome: 'FULFILLED', order: res.order, balance: res.balance };
});

const rejectOrder = db.transaction((guildId, code, adminId, note) => {
  const o = getByCode(code);
  if (!o || o.guildId !== guildId) return { ok: false, reason: 'notfound' };
  if (['FULFILLED', 'PAID', 'REFUNDED'].includes(o.status)) return { ok: false, reason: 'done', order: o };
  db.prepare("UPDATE payment_orders SET status = 'EXPIRED', reviewedBy = ?, updatedAt = ? WHERE id = ?").run(adminId, now(), o.id);
  logEvent(o.id, 'REJECTED', adminId, note);
  return { ok: true, order: o };
});

/* ============ Truy vấn ============ */
function listUserOrders(guildId, userId, limit = 5) {
  expireStale(guildId);
  return db.prepare('SELECT * FROM payment_orders WHERE guildId = ? AND userId = ? ORDER BY id DESC LIMIT ?').all(guildId, userId, limit);
}
function listOpenOrders(guildId, limit = 15) {
  expireStale(guildId);
  return db.prepare("SELECT * FROM payment_orders WHERE guildId = ? AND status IN ('PENDING','REVIEW') ORDER BY id DESC LIMIT ?").all(guildId, limit);
}
const listEvents = (orderId) => db.prepare('SELECT * FROM payment_events WHERE orderId = ? ORDER BY id').all(orderId);

module.exports = { extractCode, processBankTransaction, qrUrl, createOrder, cancelOwnOrder, confirmOrder, rejectOrder, getByCode, listUserOrders, listOpenOrders, listEvents, findPackage };
