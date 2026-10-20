const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const pay = require('../../database/payments');
const { fmt, coin } = require('../../services/gzwUi');
const gzw = require('../../config/gzw');

const approvers = (process.env.PAYMENT_APPROVER_IDS || '').split(',').map((s) => s.trim()).filter(Boolean);
const allowed = (i) => (approvers.length ? approvers.includes(i.user.id) : i.memberPermissions.has(PermissionFlagsBits.ManageGuild));
const eph = (content) => ({ content, ephemeral: true });

module.exports = {
  group: 'GZW CORE (Quản trị)',
  cooldown: 2,
  data: new SlashCommandBuilder()
    .setName('payment-admin')
    .setDescription('Đối soát & xác nhận đơn mua coin')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild)
    .setDMPermission(false)
    .addSubcommand((s) => s.setName('pending').setDescription('Danh sách đơn đang chờ / cần đối soát'))
    .addSubcommand((s) => s.setName('info').setDescription('Xem chi tiết & lịch sử một đơn')
      .addStringOption((o) => o.setName('ma-don').setDescription('Mã đơn (GZWxxxx)').setRequired(true)))
    .addSubcommand((s) => s.setName('confirm').setDescription('Xác nhận đã nhận tiền (sau khi đối chiếu sao kê) và cộng coin')
      .addStringOption((o) => o.setName('ma-don').setDescription('Mã đơn').setRequired(true))
      .addIntegerOption((o) => o.setName('so-tien-nhan').setDescription('Số tiền THỰC NHẬN theo sao kê (VND)').setRequired(true).setMinValue(1))
      .addStringOption((o) => o.setName('ma-giao-dich').setDescription('Mã giao dịch/FT trên sao kê ngân hàng').setRequired(true).setMinLength(4).setMaxLength(64)))
    .addSubcommand((s) => s.setName('reject').setDescription('Từ chối / đóng đơn (không cộng coin)')
      .addStringOption((o) => o.setName('ma-don').setDescription('Mã đơn').setRequired(true))
      .addStringOption((o) => o.setName('ly-do').setDescription('Lý do').setRequired(true).setMaxLength(100))),

  async execute(interaction, client) {
    if (!allowed(interaction)) return interaction.reply(eph('❌ Bạn không có quyền xác nhận thanh toán.'));
    const gid = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'pending') {
      const rows = pay.listOpenOrders(gid);
      if (!rows.length) return interaction.reply(eph('Không có đơn nào đang chờ.'));
      const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle('🧾 Đơn đang mở')
        .setDescription(rows.map((o) => `**${o.code}** · <@${o.userId}> · ${fmt(o.amountVnd)}đ · ${o.status}`).join('\n'));
      return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
    }

    const code = interaction.options.getString('ma-don');

    if (sub === 'info') {
      const o = pay.getByCode(code);
      if (!o || o.guildId !== gid) return interaction.reply(eph('❌ Không tìm thấy đơn.'));
      const ev = pay.listEvents(o.id).map((e) => `<t:${Math.floor(e.createdAt / 1000)}:f> **${e.type}**${e.actorId ? ` · <@${e.actorId}>` : ''}${e.note ? ` — ${e.note}` : ''}`);
      const embed = new EmbedBuilder().setColor(gzw.brandColor).setTitle(`Đơn ${o.code} — ${o.status}`)
        .setDescription(`Người mua: <@${o.userId}>\nCần: **${fmt(o.amountVnd)}đ** → ${coin(o.coins)}\nThực nhận: ${o.receivedVnd ?? '—'}\nMã GD ngân hàng: ${o.bankRef ?? '—'}\n\n${ev.join('\n')}`);
      return interaction.reply({ embeds: [embed], ephemeral: true, allowedMentions: { parse: [] } });
    }

    if (sub === 'reject') {
      const res = pay.rejectOrder(gid, code, interaction.user.id, interaction.options.getString('ly-do'));
      return interaction.reply(eph(res.ok ? `✅ Đã đóng đơn **${res.order.code}**.` : res.reason === 'done' ? '❌ Đơn đã được xử lý, không thể đóng.' : '❌ Không tìm thấy đơn.'));
    }

    // confirm
    const received = interaction.options.getInteger('so-tien-nhan');
    const bankRef = interaction.options.getString('ma-giao-dich');
    const res = pay.confirmOrder(gid, code, interaction.user.id, received, bankRef);

    if (res.ok) {
      const user = await client.users.fetch(res.order.userId).catch(() => null);
      user?.send(`✅ Đơn **${res.order.code}** đã được xác nhận. Bạn nhận **${coin(res.order.coins)}**. Số dư: **${coin(res.balance)}**.`).catch(() => {});
      return interaction.reply(eph(`✅ Đã cộng **${coin(res.order.coins)}** cho <@${res.order.userId}> (đơn ${res.order.code}). Số dư mới: ${coin(res.balance)}.`));
    }
    const msg = {
      notfound: '❌ Không tìm thấy đơn.',
      self: '❌ Bạn không thể tự xác nhận đơn của chính mình.',
      done: '❌ Đơn này đã được xử lý trước đó — coin không bị cộng lần 2.',
      dupref: `❌ Mã giao dịch này đã dùng cho đơn **${res.other}**.`,
      mismatch: `⚠️ Sai số tiền: đơn cần **${fmt(res.order?.amountVnd ?? 0)}đ**, bạn nhập **${fmt(received)}đ**. Đơn chuyển sang **REVIEW**, chưa cộng coin.`
    }[res.reason] || '❌ Không xử lý được.';
    return interaction.reply(eph(msg));
  }
};
