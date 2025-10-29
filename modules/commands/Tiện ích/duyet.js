const fs = require("fs");
const path = require("path");

module.exports.config = {
  name: "duyet", //duyetbox
  version: "1.0.2",
  hasPermssion: 2,
  credits: "DungUwU mod by DongDev",
  description: "duyệt box dùng bot xD",
  commandCategory: "Admin",
  cooldowns: 5,
  prefix: true
};

const dataPath = path.resolve(__dirname, "../../utils/data/approvedThreads.json");
const dataPendingPath = path.resolve(__dirname, "../../utils/data/pendingThreads.json");

module.exports.handleReply = async function  ({ event, api, handleReply }) {
  if (handleReply.author !== event.senderID) return;
  const { body, threadID, messageID } = event;
  let approvedThreads = JSON.parse(fs.readFileSync(dataPath);
  let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath);
    if (handleReply.type === "pending") {
    if (body.trim().toLowerCase() === "all") {
    approvedThreads = approvedThreads.concat(pendingThreads);
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2);
    fs.writeFileSync(dataPendingPath, JSON.stringify([], null, 2);
    pendingThreads.forEach(id => {
    api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", id);
    });
    return api.sendMessage(`✅ Phê duyệt thành công toàn bộ ${pendingThreads.length} nhóm`, threadID, messageID);
    }
    const numbers = body.split(" ").map(num => parseInt(num.trim()).filter(num => !isNaN(num);
    let successCount = 0;
    for (let num of numbers) {
    const index = num - 1;
    if (index >= 0 && index < pendingThreads.length) {
    const idBox = pendingThreads[index];
    approvedThreads.push(idBox);
    api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", idBox);
    pendingThreads.splice(index, 1);
    successCount++;
    }
    }
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2);
    fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2);
    return successCount > 0 
    ? api.sendMessage(`✅ Phê duyệt thành công ${successCount} nhóm`, threadID, messageID) 
    : api.sendMessage("❎ Không có nhóm nào được phê duyệt, vui lòng kiểm tra lại số thứ tự", threadID, messageID);
  } } else if (handleReply.type === "remove") {
    const idsToRemove = body.split(" ").map(num => parseInt(num) - 1).filter(index => approvedThreads[index]);
    if (idsToRemove.length) {
    for (const index of idsToRemove) {
    const idBox = approvedThreads[index];
    approvedThreads.splice(index, 1);
    await api.removeUserFromGroup(api.getCurrentUserID(), idBox); // Bot rời nhóm
    }
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2);
    return api.sendMessage(`✅ Đã xóa các box:\n${idsToRemove.map(index => approvedThreads[index]).join(", ")}`, threadID, messageID);
    }
    return api.sendMessage("❎ Không có nhóm nào để xóa", threadID, messageID);
  }
};

module.exports.run = async ({ event, api, args, Threads }) => {
  const { threadID, messageID } = event;
  let approvedThreads = JSON.parse(fs.readFileSync(dataPath);
  let pendingThreads = JSON.parse(fs.readFileSync(dataPendingPath);
  let idBox = args[0] ? args[0] : threadID;
    if (args[0] === "list" || args[0] === "l") {
    let msg = "[ Nhóm Đã Duyệt ]\n";
    for (let [index, id] of approvedThreads.entries() {
    const name = (await Threads.getData(id).threadInfo.name || "Tên không tồn tại";
    msg += `\n${index + 1}. ${name}\n🧬 ID: ${id}`;
    }
    return api.sendMessage(`${msg}\n\n📌 Reply theo stt để xóa nhóm`, threadID, (error, info) => {
    if (!error) {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: event.senderID,
    type: "remove"});
    }
    }, messageID);
  }
    if (args[0] === "pending" || args[0] === "p") {
    let msg = `[ BOX CHƯA DUYỆT ]\n`;
    for (let [index, id] of pendingThreads.entries() {
    let threadInfo = (await Threads.getData(id).threadInfo;
    msg += `\n${index + 1}. ${threadInfo.threadName}\n🧬 ID: ${id}`;
    }
    return api.sendMessage(`${msg}\n\n📌 Reply theo stt để duyệt nhóm`, threadID, (error, info) => {
    if (!error) {
    global.client.handleReply.push({
    name: this.config.name,
    messageID: info.messageID,
    author: event.senderID,
    type: "pending"});
    }
    }, messageID);
  }
    if (args[0] === "help" || args[0] === "h") {
    const prefix = (await Threads.getData(String(threadID)).data.PREFIX || global.config.PREFIX;
    return api.sendMessage(`[ Duyệt Box ]\n\n` +
    `${prefix}${this.config.name} l/list => xem danh sách box đã duyệt\n` +
    `${prefix}${this.config.name} p/pending => xem danh sách box chưa duyệt\n` +
    `${prefix}${this.config.name} d/del => kèm theo ID để xóa khỏi danh sách\n` +
    `${prefix}${this.config.name} => kèm theo ID để duyệt box đó`, threadID, messageID);
  }
    if (args[0] === "del" || args[0] === "d") {
    idBox = args[1] || threadID;
    if (!approvedThreads.includes(idBox) {
    return api.sendMessage("❎ Nhóm không được duyệt từ trước", threadID, messageID);
    }
    approvedThreads = approvedThreads.filter(id => id !== idBox);
    fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2);
    await api.removeUserFromGroup(api.getCurrentUserID(), idBox); // Bot rời nhóm
    return api.sendMessage(`✅ Nhóm ${idBox} đã bị gỡ khỏi danh sách`, threadID, messageID);
  }
    if (isNaN(parseInt(idBox)) {
    return api.sendMessage("❎ ID không hợp lệ", threadID, messageID);
  }
    if (approvedThreads.includes(idBox) {
    return api.sendMessage(`❎ Nhóm ${idBox} đã được phê duyệt trước`, threadID, messageID);
  }
    approvedThreads.push(idBox);
  pendingThreads = pendingThreads.filter(id => id !== idBox);
  fs.writeFileSync(dataPath, JSON.stringify(approvedThreads, null, 2);
  fs.writeFileSync(dataPendingPath, JSON.stringify(pendingThreads, null, 2);
  api.sendMessage("✅ Nhóm của bạn đã được phê duyệt!\n📝 Chúc các bạn dùng bot vui vẻ", idBox);
  return api.sendMessage(`✅ Phê duyệt thành công nhóm ${idBox}`, threadID, messageID);
};