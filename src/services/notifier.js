/**
 * Gửi thông báo vào kênh Discord qua Incoming Webhook (không cần bot trong kênh).
 * Cấu hình: DISCORD_WEBHOOK_URL trong .env. Không có URL thì mọi hàm chỉ bỏ qua, không lỗi.
 * URL webhook là bí mật (ai có URL đều đăng tin được) — không commit, không dán công khai.
 */
const URL_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;

const webhookUrl = () => (process.env.DISCORD_WEBHOOK_URL || '').trim();
const isConfigured = () => URL_RE.test(webhookUrl());

/** @param {{title?:string, description?:string, color?:number, fields?:{name:string,value:string,inline?:boolean}[]}} embed */
async function notify(embed, { username = 'GZW Thông báo' } = {}) {
  if (!isConfigured()) return { ok: false, reason: 'not_configured' };
  try {
    const res = await fetch(webhookUrl() + '?wait=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      // parse: [] -> nội dung từ ngân hàng/người dùng không thể gây @everyone / @role
      body: JSON.stringify({ username, embeds: [{ ...embed, timestamp: new Date().toISOString() }], allowed_mentions: { parse: [] } }),
      signal: AbortSignal.timeout(8000)
    });
    if (res.status === 429) return { ok: false, reason: 'rate_limited' };
    return res.ok ? { ok: true } : { ok: false, reason: `http_${res.status}` };
  } catch (err) {
    return { ok: false, reason: err.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

module.exports = { notify, isConfigured };
