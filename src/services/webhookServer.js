const http = require('http');
const crypto = require('crypto');
const pay = require('../database/payments');
const gzw = require('../config/gzw');
const { notify } = require('./notifier');
const { fmt, coin } = require('./gzwUi');

const MAX_BODY = 64 * 1024;
const TOLERANCE_SEC = 300;
const PROVIDER = 'sepay';

const secretHmac = () => (process.env.WEBHOOK_SEPAY_SECRET || '').trim();
const apiKey = () => (process.env.WEBHOOK_SEPAY_APIKEY || '').trim();
const isEnabled = () => !!(secretHmac() || apiKey());

/** So sánh thời gian không đổi (chống dò chữ ký bằng đo thời gian). */
function safeEqual(a, b) {
  const x = crypto.createHash('sha256').update(String(a)).digest();
  const y = crypto.createHash('sha256').update(String(b)).digest();
  return crypto.timingSafeEqual(x, y);
}

/**
 * Xác thực request từ SePay. Ưu tiên HMAC-SHA256 (X-SePay-Signature = sha256=<hex>, ký chuỗi `${timestamp}.${rawBody}`).
 * Nếu chỉ cấu hình API Key thì dùng header `Authorization: Apikey <key>`.
 * KHÔNG cấu hình khoá nào -> từ chối mọi request (không bao giờ chạy "mở").
 */
function authenticate(req, raw) {
  if (secretHmac()) {
    const sig = String(req.headers['x-sepay-signature'] || '');
    const ts = String(req.headers['x-sepay-timestamp'] || '');
    if (!/^\d{9,12}$/.test(ts) || Math.abs(Date.now() / 1000 - Number(ts)) > TOLERANCE_SEC) return false;
    const expected = 'sha256=' + crypto.createHmac('sha256', secretHmac()).update(`${ts}.`).update(raw).digest('hex');
    return safeEqual(sig, expected);
  }
  if (apiKey()) {
    const h = String(req.headers.authorization || '');
    return h.startsWith('Apikey ') && safeEqual(h.slice(7), apiKey());
  }
  return false;
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = []; let size = 0;
    req.on('data', (c) => { size += c.length; if (size > MAX_BODY) { if (size - c.length <= MAX_BODY) reject(new Error('too_large')); } else chunks.push(c); });
    req.on('end', () => resolve(Buffer.concat(chunks)));
    req.on('error', reject);
  });
}

const send = (res, status, body) => { res.writeHead(status, { 'Content-Type': 'application/json' }); res.end(JSON.stringify(body)); };

/** Xử lý một giao dịch đã xác thực, rồi thông báo (DM người mua + kênh admin qua webhook Discord). */
async function handleTransaction(client, p) {
  if (p.transferType !== 'in') return { outcome: 'IGNORED' };
  if (String(p.accountNumber) !== String(gzw.payment.accountNo)) return { outcome: 'IGNORED', note: 'khác số tài khoản' };
  if (!Number.isInteger(p.transferAmount) || p.transferAmount <= 0 || p.id == null) return { outcome: 'IGNORED', note: 'dữ liệu không hợp lệ' };

  const r = pay.processBankTransaction(PROVIDER, {
    txId: p.id, amountVnd: p.transferAmount, content: p.content, code: p.code
  });
  if (r.duplicate) return r;

  const amount = `${fmt(p.transferAmount)}đ`;
  if (r.outcome === 'FULFILLED') {
    const user = await client.users.fetch(r.order.userId).catch(() => null);
    user?.send(`✅ Đã nhận **${amount}** cho đơn **${r.order.code}**. Bạn nhận **${coin(r.order.coins)}**. Số dư: **${coin(r.balance)}**.`).catch(() => {});
    await notify({ color: 0x57f287, title: '💰 Thanh toán tự động', description: `Đơn **${r.order.code}** · <@${r.order.userId}> · ${amount} → ${coin(r.order.coins)}` });
  } else if (r.outcome === 'REVIEW') {
    await notify({ color: 0xfee75c, title: '⚠️ Cần admin xử lý tay', description: `Nhận **${amount}** cho đơn **${r.order?.code}** nhưng không tự cộng coin (${r.reason === 'mismatch' ? 'sai số tiền' : 'đơn không còn ở trạng thái chờ'}). Dùng \`/payment-admin info\`.` });
  } else if (r.outcome === 'UNMATCHED') {
    await notify({ color: 0xed4245, title: '❓ Tiền vào không khớp đơn nào', description: `Nhận **${amount}**, nội dung: \`${String(p.content || '').slice(0, 100).replace(/`/g, "'")}\`. Cần đối chiếu thủ công.` });
  }
  return r;
}

function startWebhookServer(client) {
  if (!isEnabled()) {
    console.log('ℹ️  Webhook ngân hàng TẮT (chưa đặt WEBHOOK_SEPAY_SECRET hoặc WEBHOOK_SEPAY_APIKEY). Vẫn dùng /payment-admin confirm thủ công.');
    return null;
  }
  const port = Number(process.env.WEBHOOK_PORT) || 3000;
  const route = process.env.WEBHOOK_PATH || '/webhook/sepay';

  const server = http.createServer(async (req, res) => {
    try {
      if (req.method === 'GET' && req.url === '/health') return send(res, 200, { ok: true });
      if (req.method !== 'POST' || req.url.split('?')[0] !== route) return send(res, 404, { success: false });
      const raw = await readBody(req);
      if (!authenticate(req, raw)) return send(res, 401, { success: false });

      let payload;
      try { payload = JSON.parse(raw.toString('utf8')); } catch { return send(res, 400, { success: false }); }
      // SePay yêu cầu trả đúng {"success": true} trong 30 giây -> xử lý xong rồi mới trả (xử lý rất nhanh, đã idempotent)
      await handleTransaction(client, payload);
      return send(res, 200, { success: true });
    } catch (err) {
      if (err.message === 'too_large') {
        // Trả 413 rồi đóng kết nối (không đọc nốt phần thân thừa)
        res.writeHead(413, { 'Content-Type': 'application/json', Connection: 'close' });
        return res.end(JSON.stringify({ success: false }), () => req.socket.destroy());
      }
      console.error('⚠️  Webhook lỗi:', err);
      return send(res, 500, { success: false }); // SePay sẽ gửi lại; (provider, txId) đảm bảo không cộng trùng
    }
  });
  server.requestTimeout = 15000;
  server.listen(port, () => console.log(`✅ Webhook ngân hàng đang nghe tại cổng ${port}${route} (${secretHmac() ? 'HMAC-SHA256' : 'API Key'})`));
  return server;
}

module.exports = { startWebhookServer, authenticate, handleTransaction, isEnabled };
