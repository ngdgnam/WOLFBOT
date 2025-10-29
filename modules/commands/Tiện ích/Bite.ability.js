const Format = require('../format');
const Ability = require('./Ability');

module.exports = class Bite extends Ability {
  static question(player) {
    return (
    '• Bạn muốn cắn ai trong danh sách 💀: \n' +
    player.world.game.listPlayer({died: false});
  }
    static check(player, value) {
    const index = player.format(
    value,
    Format.validIndex,
    Format.alive,
    Format.notSelf
    );
    player.sendMessage(
    `• Bạn đã chọn cắn chết ${player.world.items[index].name}!`
    );
    if(player.world.items[index].constructor.name == 'Diseased') {
    player.Sick = true
    player.sendMessage(
    `• Bạn đã cắn nhầm người bệnh ${player.world.items[index].name}, bạn sẽ mất khả năng cắn vào đêm sau!`
    );
    }
    return index;
  }
    // static async nightend(player, value, listDeaths) {}
};