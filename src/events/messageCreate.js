const { EmbedBuilder } = require('discord.js');
const config = require('../config/config');
const { addXp, canGainXp, xpForNextLevel } = require('../database/levels');
const eco = require('../database/economy');
const { checkAutoAchievements, flashNotice } = require('../services/gzwCore');
const gzw = require('../config/gzw');

// Theo dõi spam đơn giản trong bộ nhớ: Map<userId, number[]> (timestamps)
const messageLog = new Map();

function checkSpam(userId) {
  const now = Date.now();
  const timestamps = (messageLog.get(userId) || []).filter(t => now - t < config.automod.intervalMs);
  timestamps.push(now);
  messageLog.set(userId, timestamps);
  return timestamps.length > config.automod.maxMessagesPerInterval;
}

module.exports = {
  name: 'messageCreate',
  async execute(message, client) {
    if (message.author.bot || !message.guild) return;

    // ---- Auto-mod ----
    if (config.automod.enabled) {
      const member = message.member;
      const isModerator = member?.permissions?.has('ManageMessages');

      if (!isModerator) {
        // Lọc mention quá nhiều (mention spam / raid)
        if (message.mentions.users.size + message.mentions.roles.size > config.automod.maxMentions) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`⚠️ ${message.author}, vui lòng không mention (tag) quá nhiều người cùng lúc.`);
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }

        // Lọc spam tin nhắn liên tục
        if (checkSpam(message.author.id)) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`⚠️ ${message.author}, bạn đang gửi tin nhắn quá nhanh, vui lòng chậm lại.`);
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }

        // Lọc từ cấm (danh sách rỗng mặc định, admin tự cấu hình trong config.js)
        const lower = message.content.toLowerCase();
        if (config.automod.bannedWords.some(w => lower.includes(w))) {
          await message.delete().catch(() => {});
          const warn = await message.channel.send(`⚠️ ${message.author}, tin nhắn của bạn chứa từ ngữ không phù hợp và đã bị xoá.`);
          setTimeout(() => warn.delete().catch(() => {}), 5000);
          return;
        }
      }
    }

    // ---- Leveling / XP ----
    if (config.leveling.enabled && canGainXp(message.guild.id, message.author.id, config.leveling.cooldownSeconds)) {
      const [min, max] = config.leveling.xpPerMessage;
      const amount = Math.floor(Math.random() * (max - min + 1)) + min;
      const { leveledUp, newLevel } = addXp(message.guild.id, message.author.id, amount);

      if (leveledUp) {
        const embed = new EmbedBuilder()
          .setColor(config.colors.success)
          .setDescription(`🎉 ${message.author} đã lên **cấp ${newLevel}**!`);
        message.channel.send({ embeds: [embed] }).catch(() => {});
      }

      // ---- GZW CORE: nhiệm vụ chat + thành tích ----
      // Chỉ đếm khi được cộng XP (tối đa 1 lượt/cooldown) để chat spam không farm được nhiệm vụ.
      try {
        const completed = eco.progressQuests(message.guild.id, message.author.id, 'message', 1);
        for (const q of completed) {
          flashNotice(message.channel, `✅ ${message.author} hoàn thành nhiệm vụ **${q.name}** · +${q.reward} ${gzw.currency.emoji}`);
        }
        const earned = await checkAutoAchievements(message.guild, message.author.id, { level: newLevel });
        for (const a of earned) {
          flashNotice(message.channel, `🏅 ${message.author} đạt thành tích **${a.name}**${a.reward ? ` · +${a.reward} ${gzw.currency.emoji}` : ''}`, 15000);
        }
      } catch (err) {
        console.error('⚠️  Lỗi GZW CORE (messageCreate):', err);
      }
    }
  }
};
