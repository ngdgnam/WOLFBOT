const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { notify, isConfigured } = require('../../services/notifier');
const { isEnabled } = require('../../services/webhookServer');
const gzw = require('../../config/gzw');
const safety = require('../../database/safety');

const approvers = (process.env.PAYMENT_APPROVER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);

module.exports = {
  group: 'GZW CORE (Quản trị)',
  cooldown: 10,
  data: new SlashCommandBuilder()
    .setName('webhook-admin')
    .setDescription('Kiểm tra webhook thông báo và webhook nhận chuyển khoản')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('status').setDescription('Xem trạng thái cấu hình (không hiện khoá bí mật)'))
    .addSubcommand((s) => s.setName('test').setDescription('Gửi một tin thử vào kênh thông báo qua webhook Discord')),

  async execute(interaction) {
    const allowed = approvers.length ? approvers.includes(interaction.user.id) : interaction.memberPermissions.has(PermissionFlagsBits.ManageGuild);
    if (!allowed) return interaction.reply({ content: '❌ Bạn không có quyền.', ephemeral: true });

    if (interaction.options.getSubcommand() === 'test') {
      if (!isConfigured()) return interaction.reply({ content: '❌ Chưa đặt `DISCORD_WEBHOOK_URL` hợp lệ trong `.env`.', ephemeral: true });
      const r = await notify({ color: gzw.brandColor, title: '🔔 Tin thử', description: `Webhook hoạt động. Gửi bởi <@${interaction.user.id}>.` });
      safety.audit(interaction.guild.id, interaction.user.id, 'webhook.test', null, r.ok ? 'ok' : r.reason);
      return interaction.reply({ content: r.ok ? '✅ Đã gửi tin thử, kiểm tra kênh thông báo.' : `❌ Gửi thất bại (${r.reason}). Kiểm tra lại URL webhook.`, ephemeral: true });
    }

    const mode = process.env.WEBHOOK_SEPAY_SECRET ? 'HMAC-SHA256 (khuyến nghị)' : process.env.WEBHOOK_SEPAY_APIKEY ? 'API Key' : 'chưa cấu hình';
    const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle('🔗 Trạng thái webhook')
      .addFields(
        { name: 'Thông báo qua webhook Discord', value: isConfigured() ? '✅ Đã cấu hình' : '❌ Chưa có DISCORD_WEBHOOK_URL', inline: true },
        { name: 'Nhận chuyển khoản tự động', value: isEnabled() ? `✅ Bật · xác thực: ${mode}` : '❌ Tắt (đối soát tay)', inline: true },
        { name: 'Cổng / đường dẫn', value: `${process.env.WEBHOOK_PORT || 3000} · ${process.env.WEBHOOK_PATH || '/webhook/sepay'}` }
      );
    return interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
