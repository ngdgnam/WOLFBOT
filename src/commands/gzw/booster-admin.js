const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const boosters = require('../../database/boosters');
const { fmt, coin } = require('../../services/gzwUi');
const gzw = require('../../config/gzw');

module.exports = {
  group: 'GZW CORE (Quản trị)',
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('booster-admin')
    .setDescription('Xác minh lượt boost và cộng coin tri ân')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('pending').setDescription('Lượt boost đang chờ xác minh'))
    .addSubcommand((s) => s.setName('approve').setDescription('Nhập giá trị tham chiếu đã xác minh và cộng coin')
      .addIntegerOption((o) => o.setName('id').setDescription('ID lượt boost').setRequired(true).setMinValue(1))
      .addIntegerOption((o) => o.setName('gia-tri-vnd').setDescription('Giá trị tham chiếu đã xác minh (VNĐ)').setRequired(true).setMinValue(1000))),

  async execute(interaction) {
    if (!interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild)) {
      return interaction.reply({ content: '❌ Bạn không có quyền.', ephemeral: true });
    }
    const gid = interaction.guild.id;
    if (interaction.options.getSubcommand() === 'pending') {
      const rows = boosters.listPending(gid);
      if (!rows.length) return interaction.reply({ content: 'Không có lượt boost nào chờ xác minh.', ephemeral: true });
      const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle('🔎 Boost chờ xác minh')
        .setDescription(rows.map((r) => `**#${r.id}** · <@${r.userId}> · <t:${Math.floor(r.createdAt / 1000)}:d>`).join('\n'));
      return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
    }
    const value = interaction.options.getInteger('gia-tri-vnd');
    const res = boosters.approveBoost(gid, interaction.options.getInteger('id'), interaction.user.id, value);
    const msg = res.ok
      ? `✅ Đã cộng **${coin(res.coins)}** (${fmt(value)}đ × ${gzw.booster.rewardPer1000Vnd}/1.000đ) cho <@${res.ev.userId}>. Số dư: ${coin(res.balance)}.`
      : { notfound: '❌ Không thấy lượt boost.', done: '❌ Lượt này đã được xử lý.', self: '❌ Không thể tự duyệt lượt boost của chính mình.', value: '❌ Giá trị không hợp lệ.' }[res.reason];
    await interaction.reply({ content: msg, ephemeral: true, allowedMentions: { parse: [] } });
  }
};
