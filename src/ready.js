const { ActivityType } = require('discord.js');
const { abortStaleMatches } = require('../database/games');

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    console.log(`✅ Bot đã đăng nhập thành công: ${client.user.tag}`);
    const aborted = abortStaleMatches();
    if (aborted) console.log(`ℹ️  Đã huỷ ${aborted} trận dang dở từ lần chạy trước (không thưởng).`);
    client.user.setPresence({
      activities: [{ name: `${client.commands.size} lệnh | /help`, type: ActivityType.Watching }],
      status: 'online'
    });
  }
};
