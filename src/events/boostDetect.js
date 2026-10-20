const { EmbedBuilder, MessageType } = require('discord.js');
const boosters = require('../database/boosters');
const db = require('../database/db');
const { coin } = require('../services/gzwUi');
const gzw = require('../config/gzw');
const boosterPerks = require('../services/boosterPerks');

const BOOST_TYPES = new Set([
  MessageType.GuildBoost,
  MessageType.GuildBoostTier1,
  MessageType.GuildBoostTier2,
  MessageType.GuildBoostTier3
]);

module.exports = {
  name: 'messageCreate',
  async execute(message) {
    // Chỉ tin nhắn hệ thống "đã boost server" do Discord tạo ra (không ai giả được bằng chat thường)
    if (!message.guild || !BOOST_TYPES.has(message.type)) return;

    const res = boosters.recordBoost(message.guild.id, message.author.id, message.id);
    if (!res.ok) return;

    await boosterPerks.grantPerks(message.guild, message.author.id).catch((e) => console.error('⚠️  grantPerks:', e));

    const embed = new EmbedBuilder()
      .setColor(gzw.brandColor)
      .setTitle('💜 Cảm ơn Booster!')
      .setDescription(
        res.status === 'REWARDED'
          ? `Cảm ơn <@${message.author.id}> đã nâng cấp server. Bạn nhận **${coin(res.coins)}** tri ân!`
          : `Cảm ơn <@${message.author.id}> đã nâng cấp server! Phần coin tri ân sẽ được cộng sau khi quản trị viên xác minh.`
      );
    await message.channel.send({ embeds: [embed], allowedMentions: { users: [message.author.id] } }).catch(() => {});

    if (res.status === 'REVIEW') {
      const row = db.prepare('SELECT logChannelId FROM guild_settings WHERE guildId = ?').get(message.guild.id);
      const ch = row?.logChannelId && message.guild.channels.cache.get(row.logChannelId);
      ch?.send(`🔎 Lượt boost #${res.id} của <@${message.author.id}> cần xác minh. Dùng \`/booster-admin approve\`.`).catch(() => {});
    }
  }
};
