module.exports.config = {
    name: "chuyentien",
    version: "1.0.0",
    hasPermssion: 0,
    credits: "",
    description: "Chuyển tiền cho người khác.",
    commandCategory: "Kiếm Tiền",
    usages: "chuyentien [số tiền] @tag",
    cooldowns: 0
  };
    module.exports.run = async function({ Currencies, api, event, args, Users }) {
    const { threadID, senderID, mentions, messageID } = event;  
    const mention = Object.keys(mentions)[0];
    if (!mention) return api.sendMessage('❌ Vui lòng tag người muốn chuyển tiền!', threadID, messageID);
    const moneyy = parseInt(args[0]);
    if (isNaN(moneyy) || moneyy <= 0) return api.sendMessage('❌ Vui lòng nhập số tiền hợp lệ muốn chuyển!', threadID, messageID);
    const balance = (await Currencies.getData(senderID).money;
    if (moneyy > balance) return api.sendMessage('❌ Số tiền bạn muốn chuyển lớn hơn số dư hiện có !', threadID, messageID);
    const name = await Users.getNameUser(mention);
    const senderName = await Users.getNameUser(senderID);  
    await Currencies.decreaseMoney(senderID, moneyy);
    await Currencies.increaseMoney(mention, moneyy);  
    return api.sendMessage({
    body: `💸 ${senderName} đã chuyển cho ${name} ${moneyy}$!`,
    mentions: [{
    tag: name,
    id: mention
    }]
    }, threadID, messageID);
  };