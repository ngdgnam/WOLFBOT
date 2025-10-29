const {DeathType, Party} = require('../enum');
const Format = require('../format');
const {Death} = require('../type');
const Ability = require('./Ability');

module.exports = class Pair extends Ability {
  static question(player) {
    return (
    '• Bạn muốn chọn ai làm cặp đôi trong danh sách 💀: \n' +
    player.world.game.listPlayer({died: false}) +
    '\n• Hướng dẫn: <người thứ nhất><dấu cách><người thứ hai>, VD: 3 1'
    );
  }
    static check(player, value) {
    const pairs = value
    .split(' ')
    .slice(0, 2)
    .map(val => player.format(val, Format.validIndex, Format.alive);
    if (pairs.length != 2) {
    throw new Error('• Vui lòng chọn đủ 2 người!');
    }
    Format.diff(player, pairs);
    const player1 = player.world.items[pairs[0]];
    const player2 = player.world.items[pairs[1]];
    player.sendMessage(
    `• Bạn đã chọn ${player1.name} và ${player2.name} làm cặp đôi!`
    );
    return pairs;
  }
    static async nightend(player, pairs, listDeaths) {
    if (pairs == null) return;
    const players = pairs.map(index => player.world.items[index]);
    const lastStandWinCondition =
    players[0].party == Party.NEUTRAL || players[0].party != players[1].party;
    let queryParty;
    if (!lastStandWinCondition)
    for (queryParty in Party)
    if (Party[queryParty] == players[0].party) break;
    for (let i = 0; i < 2; i++) {
    const me = players[i];
    const waifu = players[(i + 1) % 2];
    const mePreviousDieFunction = me.die;
    me.waifu = waifu;
    me.die = async death => {
    await mePreviousDieFunction.bind(me)(death);
    if (!waifu.died) await waifu.die(new Death(me, waifu, DeathType.SIMP);
    };
    if (lastStandWinCondition) {
    me.party = Party.NEUTRAL;
    me.isWin = () => {
    if (
    player.world.items.filter(player => !player.died).length == 2 &&
    !player.world.items[players[0].index].died &&
    !player.world.items[players[1].index].died
    ) {
    return true;
    }
    };
    }
    me.sendMessage(
    `• Bạn và ${waifu.name} là 1 cặp đôi (cupid)!\n• Lưu ý: Các bạn sẽ thắng ${
    lastStandWinCondition
    ? 'khi là cặp đôi cuối cùng sống sót!'
    : `cùng với phe ${queryParty}`
    }`
    );
    }
  }
};