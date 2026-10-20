const {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, ChannelType, PermissionFlagsBits
} = require('discord.js');
const config = require('../config/config');

module.exports = {
  name: 'interactionCreate',
  async execute(interaction) {
    if (!interaction.isButton()) return;

    // --- Mở ticket ---
    if (interaction.customId === 'ticket_open') {
      const guild = interaction.guild;
      const existing = guild.channels.cache.find(c => c.name === `ticket-${interaction.user.id}`);
      if (existing) {
        return interaction.reply({ content: `❌ Bạn đã có ticket đang mở: ${existing}`, ephemeral: true });
      }

      const channel = await guild.channels.create({
        name: `ticket-${interaction.user.id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          { id: guild.roles.everyone.id, deny: [PermissionFlagsBits.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] },
          { id: interaction.client.user.id, allow: [PermissionFlagsBits.ViewChannel, PermissionFlagsBits.SendMessages] }
        ]
      });

      const embed = new EmbedBuilder()
        .setColor(config.colors.primary)
        .setTitle('🎫 Ticket hỗ trợ')
        .setDescription(`Xin chào ${interaction.user}, vui lòng mô tả vấn đề của bạn. Đội ngũ quản trị sẽ phản hồi sớm.`);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId('ticket_close').setLabel('Đóng ticket').setEmoji('🔒').setStyle(ButtonStyle.Danger)
      );

      await channel.send({ content: `${interaction.user}`, embeds: [embed], components: [row] });
      return interaction.reply({ content: `✅ Đã tạo ticket: ${channel}`, ephemeral: true });
    }

    // --- Đóng ticket ---
    if (interaction.customId === 'ticket_close') {
      await interaction.reply('🔒 Ticket sẽ đóng sau 5 giây...');
      setTimeout(() => interaction.channel.delete().catch(() => {}), 5000);
    }
  }
};
