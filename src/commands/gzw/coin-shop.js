const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const pay = require('../../database/payments');
const { fmt, coin } = require('../../services/gzwUi');
const gzw = require('../../config/gzw');

const cfg = gzw.payment;
const vnd = (n) => `${fmt(n)}đ`;
const ts = (ms) => `<t:${Math.floor(ms / 1000)}:R>`;

function packageView() {
  const embed = new EmbedBuilder()
    .setColor(gzw.brandColor)
    .setTitle('🪙 Mua GZW Coin')
    .setDescription(
      cfg.packages.map((p) => `**${vnd(p.amountVnd)}** → ${coin(p.coins)}`).join('\n') +
      '\n\nChọn gói bên dưới để nhận mã QR chuyển khoản.\n' +
      '⚠️ Coin chỉ được cộng **sau khi quản trị viên đối chiếu giao dịch** — gửi ảnh biên lai hay bấm nút không làm coin tự cộng.'
    )
    .setFooter({ text: 'Coin dùng trong server (shop, quest…). Không quy đổi lại thành tiền.' });
  const row = new ActionRowBuilder().addComponents(
    cfg.packages.map((p) => new ButtonBuilder().setCustomId(`buy_${p.id}`).setLabel(vnd(p.amountVnd)).setStyle(ButtonStyle.Primary))
  );
  return { embeds: [embed], components: [row] };
}

function orderView(order) {
  const embed = new EmbedBuilder()
    .setColor(gzw.brandColor)
    .setTitle(`Đơn ${order.code}`)
    .setDescription(
      `Quét QR bằng app ngân hàng. Số tiền và nội dung đã điền sẵn — **không sửa**.\n\n` +
      `🏦 Ngân hàng: **${cfg.bankId}**\n` +
      `🔢 Số TK: **${cfg.accountNo}**\n` +
      (cfg.accountName ? `👤 Chủ TK: **${cfg.accountName}**\n` : '') +
      `💵 Số tiền: **${vnd(order.amountVnd)}**\n` +
      `📝 Nội dung CK: **${order.code}**\n` +
      `🎁 Bạn nhận: **${coin(order.coins)}**\n` +
      `⏳ Hết hạn: ${ts(order.expiresAt)}`
    )
    .setImage(pay.qrUrl(order))
    .setFooter({ text: 'Sau khi chuyển, chờ admin xác nhận. Xem trạng thái: /payment-status' });
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder().setCustomId(`cancel_${order.code}`).setLabel('Huỷ đơn').setStyle(ButtonStyle.Secondary)
  );
  return { embeds: [embed], components: [row] };
}

module.exports = {
  group: 'GZW CORE',
  cooldown: 5,
  data: new SlashCommandBuilder().setName('coin-shop').setDescription('Mua GZW Coin bằng chuyển khoản QR').setDMPermission(false),

  async execute(interaction) {
    const gid = interaction.guild.id, uid = interaction.user.id;
    await interaction.reply({ ...packageView(), ephemeral: true });
    const message = await interaction.fetchReply();

    const collector = message.createMessageComponentCollector({ filter: (i) => i.user.id === uid, time: 10 * 60000 });
    collector.on('collect', async (i) => {
      if (i.customId.startsWith('buy_')) {
        const res = pay.createOrder(gid, uid, i.customId.slice(4));
        if (!res.ok) {
          const msg = res.reason === 'pending'
            ? `❌ Bạn đang có đơn chờ thanh toán: **${res.order.code}**. Hãy thanh toán hoặc huỷ đơn đó trước.`
            : res.reason === 'limit' ? '❌ Bạn đã tạo quá nhiều đơn trong 24 giờ qua.'
            : '❌ Gói không hợp lệ.';
          return i.update({ content: msg, ...packageView() });
        }
        return i.update({ content: null, ...orderView(res.order) });
      }
      if (i.customId.startsWith('cancel_')) {
        const res = pay.cancelOwnOrder(gid, uid, i.customId.slice(7));
        const note = res.ok ? '✅ Đã huỷ đơn. **Đừng chuyển tiền cho mã đó nữa.**' : '❌ Không huỷ được đơn này (có thể đã được xử lý).';
        return i.update({ content: note, ...packageView() });
      }
    });
    collector.on('end', () => interaction.editReply({ components: [] }).catch(() => {}));
  }
};
