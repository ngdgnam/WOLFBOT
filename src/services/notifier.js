/**
 * Gửi thông báo tới các kênh đã cấu hình (có thể bật một hoặc cả hai):
 *  - Telegram: TELEGRAM_BOT_TOKEN + TELEGRAM_CHAT_ID
 *  - Discord Incoming Webhook: DISCORD_WEBHOOK_URL
 * Không cấu hình kênh nào thì mọi hàm chỉ bỏ qua, không lỗi. Token/URL là bí mật — không commit, không dán công khai.
 */
const DISCORD_RE = /^https:\/\/(?:(?:ptb|canary)\.)?discord(?:app)?\.com\/api\/webhooks\/\d+\/[\w-]+$/;
const TG_TOKEN_RE = /^\d{6,}:[\w-]{30,}$/;
const TG_CHAT_RE = /^(-?\d{5,}|@[A-Za-z][\w]{4,})$/;

const discordUrl = () => (process.env.DISCORD_WEBHOOK_URL || '').trim();
const tgToken = () => (process.env.TELEGRAM_BOT_TOKEN || '').trim();
const tgChat = () => (process.env.TELEGRAM_CHAT_ID || '').trim();

const isDiscordConfigured = () => DISCORD_RE.test(discordUrl());
const isTelegramConfigured = () => TG_TOKEN_RE.test(tgToken()) && TG_CHAT_RE.test(tgChat());
const isConfigured = () => isDiscordConfigured() || isTelegramConfigured();

const escHtml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Đổi embed (Markdown kiểu Discord) sang HTML cho Telegram. Mention Discord <@id> -> "ID:id" vì Telegram không hiểu. */
function toTelegramHtml(embed) {
  const fmt = (t) => escHtml(String(t).replace(/<@[!&]?(\d+)>/g, 'ID:$1'))
    .replace(/\*\*(.+?)\*\*/g, '<b>$1</b>')
    .replace(/`([^`]+)`/g, '<code>$1</code>');
  const parts = [];
  if (embed.title) parts.push(`<b>${escHtml(String(embed.title).replace(/<@[!&]?(\d+)>/g, 'ID:$1'))}</b>`);
  if (embed.description) parts.push(fmt(embed.description));
  for (const f of embed.fields || []) parts.push(`<b>${escHtml(f.name)}</b>: ${fmt(f.value)}`);
  return parts.join('\n').slice(0, 4000);
}

async function sendDiscord(embed, username) {
  try {
    const res = await fetch(discordUrl() + '?wait=false', {
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

async function sendTelegram(embed) {
  try {
    const res = await fetch(`https://api.telegram.org/bot${tgToken()}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: tgChat(), text: toTelegramHtml(embed), parse_mode: 'HTML', disable_web_page_preview: true }),
      signal: AbortSignal.timeout(8000)
    });
    if (res.status === 429) return { ok: false, reason: 'rate_limited' };
    return res.ok ? { ok: true } : { ok: false, reason: `http_${res.status}` }; // 400 chat_id sai, 401 token sai, 403 bot chưa được phép nhắn
  } catch (err) {
    return { ok: false, reason: err.name === 'TimeoutError' ? 'timeout' : 'network' };
  }
}

/**
 * @param {{title?:string, description?:string, color?:number, fields?:{name:string,value:string,inline?:boolean}[]}} embed
 * @returns {Promise<{ok:boolean, reason?:string, channels:Record<string,{ok:boolean,reason?:string}>}>} ok = ít nhất một kênh gửi được
 */
async function notify(embed, { username = 'GZW Thông báo' } = {}) {
  const channels = {};
  const jobs = [];
  if (isTelegramConfigured()) jobs.push(sendTelegram(embed).then((r) => { channels.telegram = r; }));
  if (isDiscordConfigured()) jobs.push(sendDiscord(embed, username).then((r) => { channels.discord = r; }));
  if (!jobs.length) return { ok: false, reason: 'not_configured', channels };
  await Promise.all(jobs);
  const okAny = Object.values(channels).some((c) => c.ok);
  return { ok: okAny, reason: okAny ? undefined : Object.values(channels).map((c) => c.reason).join(','), channels };
}

module.exports = { notify, isConfigured, isDiscordConfigured, isTelegramConfigured, toTelegramHtml };
