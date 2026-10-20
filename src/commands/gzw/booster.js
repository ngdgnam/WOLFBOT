const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const boosters = require('../../database/boosters');
const { coin } = require('../../services/gzwUi');
const gzw = require('../../config/gzw');

module.exports = {
  group: 'GZW CORE',
  cooldown: 5,
  data: new SlashCommandBuilder().setName('booster').setDescription('Xem lịch sử tri ân Booster của bạn').setDMPermission(false),
  async execute(interaction) {
    const rows = boosters.listUser(interaction.guild.id, interaction.user.id);
    const st = boosters.getStatus(interaction.guild.id, interaction.user.id);
    if (!rows.length && !st) return interaction.reply({ content: 'Chưa ghi nhận lượt boost nào của bạn.', ephemeral: true });
    const lines = rows.map((r) => `<t:${Math.floor(r.createdAt / 1000)}:d> — ${r.status === 'REWARDED' ? `✅ +${coin(r.coins)}` : '🔎 chờ xác minh'}`);
    const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle('💜 Lịch sử Booster').setDescription(lines.length ? lines.join('\n') : 'Chưa có lượt thưởng nào.')
      .setFooter({ text: st?.active ? 'Trạng thái: đang Boost 💜' : 'Trạng thái: đã ngừng Boost — coin và huy hiệu vẫn được giữ' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
