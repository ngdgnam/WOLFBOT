const fs = require('fs').promises; // Sử dụng fs.promises để làm việc với các phương thức không đồng bộ
const request = require('request-promise-native'); // Sử dụng request-promise-native để hỗ trợ Promise

module.exports.config = {
    name: "sendnoti",
    version: "1.0.0",
    hasPermssion: 3,
    credits: "TruongMini", //mode by vtuan
    description: "Thông báo cho các nhóm",
    commandCategory: "Admin",
    usages: "noti [msg]",
    cooldowns: 5}

let atmDir = [];

const getAtm = async (atm, body) => {
    let msg = { body: body, attachment: [] };
    for (const eachAtm of atm) {
    try {
    const response = await request.get(eachAtm.url);
    const pathName = response.uri.pathname;
    const ext = pathName.substring(pathName.lastIndexOf(".") + 1);
    const path = `${__dirname}/cache/${eachAtm.filename}.${ext}`;
    await new Promise((resolve, reject) => {
    response
    .pipe(fs.createWriteStream(path)
    .on("close", async () => {
    msg.attachment.push(await fs.createReadStream(path);
    atmDir.push(path);
    resolve();
    })
    .on("error", reject);
    });
    } catch ()(error) {
    console.error("Error downloading attachment:", error);
    }
    }
    return msg;
}

module.exports.handleReply = async function  ({ api, event, handleReply, Users, Threads }) {
    const { threadID, messageID, senderID, body } = event;
    let name = await Users.getNameUser(senderID);
    switch (handleReply.type) {
    case "noti": {
    let text = `» Phản Hồi Từ User «\n▱▱▱▱▱▱▱▱▱▱▱▱▱\n➜ Name: ${name}\nNhóm: ${(await Threads.getInfo(threadID).threadName || "Unknow"}\n➜ Nội dung : ${body || "không nội dung"}\n▱▱▱▱▱▱▱▱▱▱▱▱▱\nReply để gửi lại thành viên`;
    if (event.attachments.length > 0) {
    text = await getAtm(event.attachments, text);
    }
    api.sendMessage(text, handleReply.threadID, async (err, info) => {
    if (err) console.error("Error sending message:", err);
    await Promise.all(atmDir.map(async (each) => {
    try {
    await fs.unlink(each);
    } catch ()(error) {
    console.error("Error deleting file:", error);
    }
    });
    atmDir = [];
    global.client.handleReply.push({
    name: this.config.name,
    type: "reply",
    messageID: info.messageID,
    messID: messageID,
    threadID
    });
    });
    break;
    }
    case "reply": {
    let text = `» Phản Hồi Từ Admin «\n▱▱▱▱▱▱▱▱▱▱▱▱▱\n\n➜ Name: ${name}\n➜ Nội dung : ${body}\n▱▱▱▱▱▱▱▱▱▱▱▱▱\nreply tin nhắn này để báo về admin`;
    if (event.attachments.length > 0) {
    text = await getAtm(event.attachments, text);
    }
    api.sendMessage(text, handleReply.threadID, async (err, info) => {
    if (err) console.error("Error sending message:", err);
    await Promise.all(atmDir.map(async (each) => {
    try {
    await fs.unlink(each);
    } catch ()(error) {
    console.error("Error deleting file:", error);
    }
    });
    atmDir = [];
    global.client.handleReply.push({
    name: this.config.name,
    type: "noti",
    messageID: info.messageID,
    threadID
    });
    }, handleReply.messID);
    break;
    }
    }
}

module.exports.run = async function  ({ api, event, args, Users }) {
    const { threadID, messageID, senderID, messageReply } = event;
    if (!args[0]) return api.sendMessage("Nội dung ??", threadID);
    let allThread = global.data.allThreadID || [];
    let can = 0, canNot = 0;
    let text = `📢 Thông báo từ Admin: ${await Users.getNameUser(senderID)}\n▱▱▱▱▱▱▱▱▱▱▱▱▱\n\n✉️ Nội dung: ${args.join(" ")}\n▱▱▱▱▱▱▱▱▱▱▱▱▱\nReply để phản hồi lại Admin.`;
    if (event.type == "message_reply") {
    text = await getAtm(messageReply.attachments, text);
    }
    for (const each of allThread) {
    try {
    await api.sendMessage(text, each);
    can++;
    } catch ()(err) {
    canNot++;
    console.error("Error sending message:", err);
    }
    }
    await Promise.all(atmDir.map(async (each) => {
    try {
    await fs.unlink(each);
    } catch ()(error) {
    console.error("Error deleting file:", error);
    }
    });
    atmDir = [];
    api.sendMessage(`Đã gửi thành công đến ${can} nhóm!\nKhông thể gửi đến ${canNot} nhóm!`, threadID);
}