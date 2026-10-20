const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const pay = require('../../database/payments');
const { fmt, coin } = require('../../services/gzwUi');
const gzw = require('../../config/gzw');

const STATUS = {
  PENDING: '⏳ Chờ thanh toán', PAID: '💳 Đã nhận tiền', FULFILLED: '✅ Đã cộng coin',
  REVIEW: '🔎 Đang đối soát', EXPIRED: '⌛ Hết hạn/đã huỷ', REFUNDED: '↩️ Đã hoàn'
};

module.exports = {
  group: 'GZW CORE',
  cooldown: 5,
  data: new SlashCommandBuilder().setName('payment-status').setDescription('Xem trạng thái các đơn mua coin của bạn').setDMPermission(false),

  async execute(interaction) {
    const orders = pay.listUserOrders(interaction.guild.id, interaction.user.id, 5);
    if (!orders.length) return interaction.reply({ content: 'Bạn chưa có đơn nào. Dùng `/coin-shop` để mua coin.', ephemeral: true });
    const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle('🧾 Đơn mua coin gần đây')
      .setDescription(orders.map((o) =>
        `**${o.code}** — ${fmt(o.amountVnd)}đ → ${coin(o.coins)}\n${STATUS[o.status] || o.status} · <t:${Math.floor(o.createdAt / 1000)}:R>`
      ).join('\n\n'))
      .setFooter({ text: 'Đơn REVIEW: hãy mở ticket để được hỗ trợ.' });
    await interaction.reply({ embeds: [embed], ephemeral: true });
  }
};
