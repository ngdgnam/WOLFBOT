// Tìm TELEGRAM_CHAT_ID: nhắn một tin cho bot (hoặc thêm bot vào nhóm rồi nhắn một tin), sau đó chạy: npm run telegram:chat-id
require('dotenv').config();
const token = (process.env.TELEGRAM_BOT_TOKEN || '').trim();
if (!token) { console.error('❌ Chưa đặt TELEGRAM_BOT_TOKEN trong .env'); process.exit(1); }
(async () => {
  const res = await fetch(`https://api.telegram.org/bot${token}/getUpdates`).catch(() => null);
  const json = res && (await res.json().catch(() => null));
  if (!json?.ok) { console.error('❌ Token sai hoặc không kết nối được Telegram.'); process.exit(1); }
  const seen = new Map();
  for (const u of json.result) {
    const c = (u.message || u.channel_post || u.my_chat_member)?.chat;
    if (c) seen.set(c.id, c);
  }
  if (!seen.size) return console.log('ℹ️  Chưa thấy cuộc trò chuyện nào. Hãy nhắn "hi" cho bot (hoặc nhắn trong nhóm có bot) rồi chạy lại.');
  for (const c of seen.values()) console.log(`TELEGRAM_CHAT_ID=${c.id}   # ${c.type}: ${c.title || c.username || c.first_name || ''}`);
})();
