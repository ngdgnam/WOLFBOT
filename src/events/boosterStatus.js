const boosterPerks = require('../services/boosterPerks');

/**
 * Theo dõi thay đổi trạng thái Boost của thành viên (premiumSince):
 *  - null -> có giá trị: bắt đầu boost -> gán quyền lợi (coin do boostDetect xử lý riêng, chống trùng theo messageId)
 *  - có giá trị -> null: ngừng boost -> gỡ role Booster, giữ coin và huy hiệu
 */
module.exports = {
  name: 'guildMemberUpdate',
  async execute(oldMember, newMember) {
    if (oldMember.partial || newMember.user.bot) return;
    const was = !!oldMember.premiumSince, now = !!newMember.premiumSince;
    if (was === now) return;
    try {
      if (!was && now) await boosterPerks.grantPerks(newMember.guild, newMember.id);
      else await boosterPerks.revokePerks(newMember.guild, newMember.id);
    } catch (err) {
      console.error('⚠️  Lỗi boosterStatus:', err);
    }
  }
};
